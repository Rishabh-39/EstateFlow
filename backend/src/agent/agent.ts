import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { DatabaseService } from '../database/database.service';
import { IntentModel, predict, extractRequirements, safeDraft, Intent } from './classifier';
import { EventsService } from '../events/events';
import { RoomsService } from '../rooms/rooms';
import { determineRouting, mergeCorrection, ExtractionPatch } from './policy';
import { stayDates } from '../shared/validation';
import { staffDraftWording } from './generative';
import { semanticExtract, semanticExtractWithDraft, ollamaEnabled, type SemanticResult } from './ollama';
import { formGroundedDraft, redundantQuestion } from './grounded-draft';
import { conversationFacts, withConversationFacts } from '../enquiries/concierge-memory';

/** Read-only, explicitly validated agent tool gateway. Never exposes arbitrary SQL or write endpoints. */
@Injectable()
export class AgentToolRegistry {
 constructor(private readonly rooms:RoomsService,private readonly events:EventsService){}
 readonly allowedTools=['room_availability','event_requirements'] as const;
 async invoke(name:string,args:unknown,context?:{role:'STAFF'|'GM'}){
  if(!args||typeof args!=='object'||Array.isArray(args))throw new BadRequestException('Tool arguments must be a JSON object');
  const a=args as Record<string,unknown>;
  if(name==='room_availability'){
   if(Object.keys(a).some(k=>!['checkIn','checkOut','roomTypeId'].includes(k)))throw new BadRequestException('Unexpected tool argument');
   if(typeof a.checkIn!=='string'||typeof a.checkOut!=='string')throw new BadRequestException('Dates required');
   stayDates(a.checkIn,a.checkOut);
   if(a.roomTypeId!==undefined && (typeof a.roomTypeId!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.roomTypeId)))throw new BadRequestException('Invalid roomTypeId');
   return this.rooms.availability(a.checkIn,a.checkOut,a.roomTypeId as string|undefined,true);
  }
  if(name==='event_requirements'){
   if(!context || !['STAFF','GM'].includes(context.role))throw new BadRequestException('Staff authorization context required');
   if(Object.keys(a).some(k=>k!=='eventId')||typeof a.eventId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.eventId))throw new BadRequestException('Invalid eventId');
   return this.events.requirements(a.eventId);
  }
  throw new BadRequestException('Agent tool not allowed');
 }
}
@Injectable()
export class AgentService {
 private readonly model:IntentModel;
 constructor(private readonly db:DatabaseService,public readonly tools:AgentToolRegistry){
  const modelFile=path.resolve(process.cwd(),process.env.AGENT_MODEL_PATH||'model/resort-intent-model.json');
  if(!fs.existsSync(modelFile))throw new Error('Missing trained local model. Run npm run agent:train');
  this.model=JSON.parse(fs.readFileSync(modelFile,'utf8')) as IntentModel;
 }
 async process(enquiryId:string){
  const initial=await this.db.query('SELECT id,message,contact_name,form_payload FROM enquiries WHERE id=$1',[enquiryId]);
  const msg=initial.rows[0];if(!msg)throw new NotFoundException('Enquiry not found');
  const prediction=predict(this.model,msg.message);
  // A structured client-provided event type is higher-quality evidence than a
  // classifier guessing 'COMPLAINT' from a normal wedding form's wording.
  // Explicit complaint language always retains the GM escalation route.
  const declared=msg.form_payload?.type;
  const complaintEvidence=/\b(complaint|refund|unhappy|unsatisfied|dirty|broken|bad service|poor service|disappointed)\b/i.test(msg.message);
  const classifiedLabel:Intent=!complaintEvidence&&declared==='Wedding'?'WEDDING':!complaintEvidence&&declared==='Corporate offsite'?'CORPORATE_OFFSITE':prediction.label;

  // Structured web forms already supply exact evidence: avoid a slow model call for
  // fields and a reply that staff can ground directly in the form. For natural-language
  // enquiries, extract and draft in ONE Qwen request, not two sequential requests.
  const preferred=formGroundedDraft(msg.contact_name,msg.form_payload);
  const analyzed=preferred ? null : ollamaEnabled()
    ? await semanticExtractWithDraft(msg.message,msg.contact_name,classifiedLabel) : null;
  const semantic:SemanticResult=preferred
    ? {extraction:extractRequirements(msg.message),meta:{source:'regex-fallback' as const,approximateFields:[],evidence:{},requiresConfirmation:[],diningRequested:false}}
    : analyzed?.semantic??await semanticExtract(msg.message);
  const extracted=semantic.extraction;
  // Preserve later manual corrections while the model is working.
  const generatedDraft=preferred??analyzed?.draft??(ollamaEnabled()?null:await staffDraftWording(msg.message,`predicted category: ${classifiedLabel}; extracted: ${JSON.stringify(extracted)}`));

  let roomObservation:unknown=null;
  // This observation is optional and informational. It does not reserve inventory or quote a price.
  if(prediction.label==='ROOM_BOOKING' && extracted.exactCheckIn && extracted.exactCheckOut){
   try{
    const code=/\bvilla\b/i.test(msg.message)?'VILLA':/\broom\b/i.test(msg.message)?'ESTATE':null;
    const type=code?await this.db.query('SELECT id FROM room_types WHERE code=$1',[code]):null;
    roomObservation=await this.tools.invoke('room_availability',{checkIn:extracted.exactCheckIn,checkOut:extracted.exactCheckOut,roomTypeId:type?.rows[0]?.id});
   }catch{roomObservation={status:'TOOL_UNAVAILABLE',note:'Staff must check availability manually'};}
  }
  return this.db.transaction(async client=>{
   // Lock before consulting manual overrides; never overwrite a staff correction made while the model ran.
   const current=(await client.query('SELECT manual_category,manual_extracted,contact_name,agent_flags,routing_lane,assigned_user_id,message,conversation_id FROM enquiries WHERE id=$1 FOR UPDATE',[enquiryId])).rows[0];
   if(!current)throw new NotFoundException('Enquiry not found');
   const manual=current.manual_category as Intent|'OTHER_EVENT'|null;
   const category=manual||classifiedLabel;
   const autoRoute=category==='OTHER_EVENT' ? {lane:'ASSIGNED' as const,ownerRole:'STAFF' as const,requiresReview:true} : determineRouting(category,complaintEvidence,declared ? false : prediction.needsReview,manual as Intent|null);
   const escalated=(current.agent_flags?.complaintEscalated===true || current.agent_flags?.operationsEscalated===true) && current.routing_lane==='GM_ESCALATION';
   // Do not reopen a GM-reviewed complaint merely because a queued model run
   // processes the same transcript again. A NEW guest message changes the digest
   // and can route to GM afresh; an explicit staff escalation still takes priority.
   const reviewedSameMessage=current.agent_flags?.complaintReviewedByGm===true &&
     current.agent_flags?.gmReviewedMessageDigest===createHash('sha256').update(String(current.message||'')).digest('hex');
   const route=escalated || (!reviewedSameMessage && category==='OTHER_EVENT' && complaintEvidence)
     ? {lane:'GM_ESCALATION' as const,ownerRole:'GM' as const,requiresReview:true}
     : reviewedSameMessage ? {lane:'ASSIGNED' as const,ownerRole:'STAFF' as const,requiresReview:true} : autoRoute;
   // Background model results can arrive after another guest message. Rebuild
   // dialogue facts under the enquiry lock so stale inference never erases a
   // previously supplied date or guest count in the staff inbox.
   const dialogue=current.conversation_id?(await client.query(`SELECT body FROM enquiry_messages WHERE enquiry_id=$1 AND role='GUEST' ORDER BY created_at,id`,[enquiryId])).rows.map(r=>String(r.body)):null;
   const cumulative=dialogue?withConversationFacts(extracted,conversationFacts(dialogue)):extracted;
   const effective=mergeCorrection(cumulative,(current.manual_extracted||{}) as ExtractionPatch);
   const owner=reviewedSameMessage && current.assigned_user_id && route.ownerRole==='STAFF' ? current.assigned_user_id : (await client.query('SELECT id FROM users WHERE role=$1 ORDER BY email LIMIT 1',[route.ownerRole])).rows[0]?.id||null;
   const flags={...(current.agent_flags||{}),manualCategoryOverride:Boolean(manual),manualExtractionOverride:Boolean(current.manual_extracted),modelUncertain:prediction.needsReview,requiresClarification:effective.missingFields.length>0 || semantic.meta.requiresConfirmation.length>0,semanticSource:semantic.meta.source,semanticFallback:semantic.meta.error||null,approximateFields:semantic.meta.approximateFields,semanticRequiresConfirmation:semantic.meta.requiresConfirmation,complaintEscalated:current.agent_flags?.complaintEscalated===true || (!current.agent_flags?.operationsEscalated && route.lane==='GM_ESCALATION'),toolUnavailable:roomObservation!==null&&typeof roomObservation==='object'&&(roomObservation as any).status==='TOOL_UNAVAILABLE'};
   await client.query(`UPDATE enquiries SET category=$2,routing_lane=$3,assigned_user_id=$4,extracted=$5,agent_confidence=$6,agent_model_version=$7,agent_processed_at=now(),agent_flags=$8 WHERE id=$1`,
    [enquiryId,category,route.lane,owner,JSON.stringify({...effective,semantic:semantic.meta,toolObservation:roomObservation}),prediction.confidence,this.model.version,JSON.stringify(flags)]);
   // Preserve drafts that staff have already edited. Never touch sent drafts.
   const edited=(await client.query(`SELECT id FROM reply_drafts WHERE enquiry_id=$1 AND status='DRAFT' AND edited_by IS NOT NULL ORDER BY created_at DESC LIMIT 1`,[enquiryId])).rows[0];
   let draftId:string;
   if(edited){draftId=edited.id;}
   else{
    await client.query(`DELETE FROM reply_drafts WHERE enquiry_id=$1 AND status='DRAFT' AND edited_by IS NULL`,[enquiryId]);
    const useGenerated=generatedDraft && category!=='COMPLAINT' && !manual && !current.manual_extracted && !redundantQuestion(generatedDraft,msg.form_payload);
    const draft=useGenerated ? generatedDraft : safeDraft(current.contact_name,category==='OTHER_EVENT'?'UNKNOWN':category,effective,msg.message);
    draftId=(await client.query(`INSERT INTO reply_drafts(enquiry_id,body) VALUES($1,$2) RETURNING id`,[enquiryId,draft])).rows[0].id;
   }
   return {enquiryId,category,lane:route.lane,confidence:prediction.confidence,requiresReview:route.requiresReview,extracted:effective,roomObservation,draftId,draftPreserved:Boolean(edited),modelVersion:this.model.version,agentFlags:flags,policy:'DRAFT_ONLY_NO_AUTO_SEND'};
  });
 }
}
