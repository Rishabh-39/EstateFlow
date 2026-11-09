import { Controller, Injectable, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthGuard, StaffGuard, CurrentUser } from '../auth/auth';
import { AgentService } from '../agent/agent';
import { EventsService } from '../events/events';
import { randomBytes } from 'node:crypto';
import { alignStaffCounts } from '../shared/staff-sync';
import { Intent, extractRequirements, safeDraft } from '../agent/classifier';
import { formGroundedDraft } from '../agent/grounded-draft';
import { validateCorrection, mergeCorrection } from '../agent/policy';
import { guestAdvisory, localGuestGuidance } from '../agent/generative';

// Keep counting, selected-enquiry restoration and SQL LIMIT/OFFSET in sync.
const ENQUIRY_PAGE_SIZE = 10;
@Injectable()
export class EnquiriesService {
 constructor(private readonly db:DatabaseService,private readonly agent:AgentService){}
 private readonly processing=new Map<string,{dirty:boolean}>();
 /** Coalesce bursty chat follow-ups instead of queueing one expensive model run
  * per message. If a message arrives while Qwen is busy, process the latest
  * complete transcript once more. Receipt writes never await inference. */
 private queueAgent(id:string){
  const running=this.processing.get(id);
  if(running){running.dirty=true;return;}
  const state={dirty:false};
  this.processing.set(id,state);
  void (async()=>{
    do{
      state.dirty=false;
      try{await this.agent.process(id);}
      catch(e){console.error('EstateFlow enquiry model processing failed; staff may retry',id,(e as Error).message);}
    }while(state.dirty);
    this.processing.delete(id);
  })();
 }
 async create(b:any,source:'WEB'|'EMAIL_SIM'|'WHATSAPP_SIM'='WEB'){
  const name=String(b.contactName||'').trim(),msg=String(b.message||'').trim(),email=b.contactEmail?String(b.contactEmail).trim():null;
  const chat=b.concierge===true && source==='WEB';
  if(name.length<2||name.length>100||msg.length<(chat?1:8)||msg.length>5000|| (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new BadRequestException('Name (2-100 chars), nonempty concierge message or 8-5000 character enquiry, and valid optional email required');
  const form=b.form && typeof b.form==='object' && !Array.isArray(b.form) ? b.form : null;
  if(form && JSON.stringify(form).length>3000)throw new BadRequestException('Event form too long');
  if(source==='WEB' && !chat && form && typeof form.type==='string'){
   const phone=typeof form.phone==='string'?form.phone.trim():'';
   const digits=phone.replace(/\D/g,'');
   if(!phone || !/^\+?[0-9\s().-]+$/.test(phone) || digits.length<10 || digits.length>15)
    throw new BadRequestException('A valid phone number (10-15 digits) is required for event enquiries');
  }
  const conversationId=chat?String(b.conversationId||''):'';
  if(chat && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId))throw new BadRequestException('Valid conversation UUID required');
  // Concurrent messages for one session are serialized by the unique conversation_id.
  // The first request creates one enquiry; later messages append to that enquiry.
  const q=await this.db.transaction(async client=>{
   let record:any;
   if(chat){
    // Serialize even two simultaneous FIRST messages for the same session. A bare
    // SELECT FOR UPDATE cannot lock a row that has not yet been inserted.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',[conversationId]);
    record=(await client.query('SELECT id,public_ref,contact_name,message,status,manual_extracted FROM enquiries WHERE conversation_id=$1 FOR UPDATE',[conversationId])).rows[0];
    if(record && record.contact_name.toLowerCase()!==name.toLowerCase())throw new ConflictException('Start a new conversation when changing guest identity');
    if(record && record.message.length+msg.length+2>5000)throw new BadRequestException('Conversation reached the 5000-character limit; start a new enquiry');
   }
   if(record){
    const transcript=record.message+'\n'+msg;
    const preliminary=mergeCorrection(extractRequirements(transcript),record.manual_extracted||{});
    const changed=await client.query(`UPDATE enquiries SET message=message || chr(10) || $2::text,
     extracted=$3::jsonb,agent_processed_at=NULL,agent_flags=agent_flags || '{"preliminary":true}'::jsonb
     WHERE id=$1 RETURNING id,public_ref,source,status`,[record.id,msg,JSON.stringify(preliminary)]);
    record=changed.rows[0];
   } else {
    const publicRef='ENQ-'+randomBytes(4).toString('hex').toUpperCase();
    // Make explicit numeric/date facts visible in Staff Inbox immediately. This is a
    // PRELIMINARY deterministic snapshot; Qwen may enrich it, but neither version
    // approves bookings or treats uncertain values as staff-confirmed requirements.
    const preliminary=mergeCorrection(extractRequirements(msg),{});
    const created=await client.query(`INSERT INTO enquiries(public_ref,source,message,contact_name,contact_email,form_payload,conversation_id,extracted,agent_flags)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,public_ref,source,status`,
     [publicRef,source,msg,name,email,form?JSON.stringify(form):null,chat?conversationId:null,JSON.stringify(preliminary),JSON.stringify({preliminary:true,requiresClarification:true})]);
    record=created.rows[0];
    // The inbox can immediately display a truthful, editable starter draft while
    // background semantic extraction and personalized wording are still running.
    const startDraft=formGroundedDraft(name,form) || safeDraft(name,
      /\b(?:wedding|marriage|lawn)\b/i.test(msg)?'WEDDING':/\b(?:offsite|corporate|conference)\b/i.test(msg)?'CORPORATE_OFFSITE':
      /\b(?:complaint|refund|dirty|unhappy)\b/i.test(msg)?'COMPLAINT':
      /\b(?:room|villa|stay|nights?|rate|price|quote|booking)\b/i.test(msg)?'ROOM_BOOKING':'UNKNOWN',
      extractRequirements(msg),msg);
    await client.query('INSERT INTO reply_drafts(enquiry_id,body) VALUES($1,$2)',[record.id,startDraft]);
   }
   if(chat)await client.query(`INSERT INTO enquiry_messages(enquiry_id,role,body) VALUES($1,'GUEST',$2)`,[record.id,msg]);
   return record;
  });
  this.queueAgent(q.id);
  return {...q,agentStatus:'PROCESSING',conversationId:chat?conversationId:undefined,quickReply:chat?localGuestGuidance(msg):undefined};
 }
 /** Informational-only response. Called after the enquiry receipt has already been shown. */
 async chatAdvisory(b:any){
  const conversationId=String(b.conversationId||'');
  const text=String(b.message||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(conversationId)||!text||text.length>3000)throw new BadRequestException('Invalid concierge session or message');
  const q=await this.db.query(`SELECT id FROM enquiries e WHERE conversation_id=$1 AND EXISTS
    (SELECT 1 FROM enquiry_messages m WHERE m.enquiry_id=e.id AND m.role='GUEST' AND m.body=$2)`,[conversationId,text]);
  if(!q.rows[0])throw new NotFoundException('Saved concierge message not found');
  const history=(await this.db.query(`SELECT body FROM enquiry_messages WHERE enquiry_id=$1 AND role='GUEST' ORDER BY created_at DESC,id DESC LIMIT 8`,[q.rows[0].id])).rows.reverse();
  // Do not treat earlier guest messages as the current question. In particular,
  // local keyword fallback must not repeat stale requests for dates/guest counts.
  const priorContext=history.length>1?history.slice(0,-1).map(x=>x.body).join('\n'):'';
  const answer=await guestAdvisory(text,priorContext);
  return {conciergeReply:answer.text,conciergeMode:answer.mode};
 }
 async list(category?:string){return (await this.db.query(`SELECT e.id,e.public_ref,e.source,e.contact_name,e.category,e.routing_lane,e.agent_confidence,e.created_at,e.status,e.message,e.contact_email,e.extracted,e.manual_extracted,e.form_payload,u.display_name AS assigned_to,
    (SELECT d.body FROM reply_drafts d WHERE d.enquiry_id=e.id ORDER BY d.created_at DESC LIMIT 1) AS draft_body,
    (SELECT d.status FROM reply_drafts d WHERE d.enquiry_id=e.id ORDER BY d.created_at DESC LIMIT 1) AS draft_status,
    (SELECT json_build_object('id',g.id,'decision',g.decision,'note',g.note,'decidedAt',g.decided_at,'acknowledgedAt',g.staff_acknowledged_at)
     FROM gm_escalation_decisions g WHERE g.enquiry_id=e.id ORDER BY g.decided_at DESC,g.id DESC LIMIT 1) AS gm_review FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_user_id WHERE ($1::text IS NULL OR e.category=$1) ORDER BY e.created_at DESC LIMIT 100`,[category||null])).rows;}
 /** Bounded server-side pagination; focusId restores same enquiry after navigating back. */
 async listPaged(q:{page?:string;category?:string;search?:string;focusId?:string;bookingStatus?:string;eventOnly?:string}){
  const raw=Number(q.page||'1');
  if(!Number.isInteger(raw)||raw<1||raw>100000)throw new BadRequestException('Invalid page number');
  const categories=['WEDDING','CORPORATE_OFFSITE','OTHER_EVENT','ROOM_BOOKING','COMPLAINT','UNKNOWN'];
  const category=q.category&&categories.includes(q.category)?q.category:null;
  const search=String(q.search||'').trim().slice(0,80);
  const confirmed=q.bookingStatus==='confirmed';
  if(q.eventOnly && q.eventOnly!=='true')throw new BadRequestException('Invalid event-only filter');
  const eventOnly=q.eventOnly==='true';
  if(q.bookingStatus && q.bookingStatus!=='confirmed')throw new BadRequestException('Invalid booking status filter');
  const args=[category,search];
  const committed="e.status IN ('APPROVED','CLIENT_CONFIRMED') AND EXISTS (SELECT 1 FROM event_requests ev JOIN reservation_bundles rb ON rb.event_id=ev.id WHERE ev.enquiry_id=e.id AND ev.status='RESERVED')";
  const filter=`($1::text IS NULL OR e.category=$1) AND ($2::text='' OR
    e.contact_name ILIKE '%'||$2||'%' OR e.public_ref ILIKE '%'||$2||'%' OR e.message ILIKE '%'||$2||'%')` + (confirmed?` AND (${committed})`:'') + (eventOnly?` AND e.category IN ('WEDDING','CORPORATE_OFFSITE','OTHER_EVENT')`:'');
  const confirmedCount=Number((await this.db.query(`SELECT count(*)::int AS n FROM enquiries e WHERE ${committed}`)).rows[0].n);
  const total=Number((await this.db.query(`SELECT count(*)::int AS n FROM enquiries e WHERE ${filter}`,args)).rows[0].n);
  let page=raw;
  if(q.focusId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.focusId)){
   const rank=await this.db.query(`SELECT pos FROM (SELECT e.id,
     (row_number() OVER(ORDER BY e.created_at DESC,e.id DESC)-1)::int AS pos
     FROM enquiries e WHERE ${filter}) ranked WHERE id=$3::uuid`,[...args,q.focusId]);
   if(rank.rows[0])page=Math.floor(rank.rows[0].pos/ENQUIRY_PAGE_SIZE)+1;
  }
  const pages=Math.max(1,Math.ceil(total/ENQUIRY_PAGE_SIZE));page=Math.min(page,pages);
  const data=await this.db.query(`SELECT e.id,e.public_ref,e.source,e.contact_name,e.category,e.routing_lane,e.agent_confidence,e.created_at,e.status,e.message,e.contact_email,e.extracted,e.manual_extracted,e.form_payload,u.display_name AS assigned_to,
    (SELECT d.body FROM reply_drafts d WHERE d.enquiry_id=e.id ORDER BY d.created_at DESC LIMIT 1) AS draft_body,
    (SELECT d.status FROM reply_drafts d WHERE d.enquiry_id=e.id ORDER BY d.created_at DESC LIMIT 1) AS draft_status,
    (SELECT json_build_object('id',g.id,'decision',g.decision,'note',g.note,'decidedAt',g.decided_at,'acknowledgedAt',g.staff_acknowledged_at)
     FROM gm_escalation_decisions g WHERE g.enquiry_id=e.id ORDER BY g.decided_at DESC,g.id DESC LIMIT 1) AS gm_review
    FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_user_id
    WHERE ${filter} ORDER BY e.created_at DESC,e.id DESC LIMIT $4 OFFSET $3`,[...args,(page-1)*ENQUIRY_PAGE_SIZE,ENQUIRY_PAGE_SIZE]);
  return {items:data.rows,total,page,pageSize:ENQUIRY_PAGE_SIZE,pages,confirmedCount,bookingStatus:confirmed?'confirmed':'all'};
 }
 async one(id:string){const q=await this.db.query(`SELECT e.*,u.display_name AS assigned_to, (SELECT json_build_object('id',g.id,'decision',g.decision,'note',g.note,'decidedAt',g.decided_at,'acknowledgedAt',g.staff_acknowledged_at)
     FROM gm_escalation_decisions g WHERE g.enquiry_id=e.id ORDER BY g.decided_at DESC,g.id DESC LIMIT 1) AS gm_review FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_user_id WHERE e.id=$1`,[id]);if(!q.rows[0])throw new NotFoundException();return q.rows[0];}
 async drafts(id:string){return (await this.db.query(`SELECT * FROM reply_drafts WHERE enquiry_id=$1 ORDER BY created_at DESC`,[id])).rows;}
 /** Contact actions open a composer only. A follow-up is persisted *after* staff
  * attests actual communication; this never automatically sends a message. */
 async clientFollowups(id:string){
  return (await this.db.query(`SELECT f.id,f.channel,f.summary,f.contacted_at AS "contactedAt",u.display_name AS "staffName"
   FROM enquiry_client_followups f JOIN users u ON u.id=f.staff_id
   WHERE f.enquiry_id=$1 ORDER BY f.contacted_at DESC,f.id DESC LIMIT 30`,[id])).rows;
 }
 async recordClientFollowup(user:any,id:string,b:any){
  if(user.role!=='STAFF')throw new BadRequestException('Only reservations staff can record client conversations');
  const channel=String(b.channel||'');const summary=String(b.summary||'').trim();
  if(!['email','phone','whatsapp'].includes(channel))throw new BadRequestException('Select the actual client contact channel');
  if(summary.length<10||summary.length>2000)throw new BadRequestException('Provide a factual 10–2000 character client response');
  if(b.contacted!==true)throw new BadRequestException('Confirm that the client was actually contacted; opening a composer is not delivery');
  return this.db.transaction(async client=>{
   const e=(await client.query('SELECT id,status,contact_email,form_payload FROM enquiries WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!e)throw new NotFoundException('Enquiry not found');
   if(['APPROVED','CLIENT_CONFIRMED'].includes(e.status))throw new ConflictException('Committed reservation changes need a separate change request');
   if(channel==='email'&&!e.contact_email)throw new BadRequestException('No email on this enquiry');
   const phone=String(e.form_payload?.phone||'').replace(/\D/g,'');
   if(channel!=='email'&&phone.length<10)throw new BadRequestException('No verified contact phone on this enquiry');
   const q=(await client.query(`INSERT INTO enquiry_client_followups(enquiry_id,staff_id,channel,summary)
    VALUES($1,$2,$3,$4) RETURNING id,channel,summary,contacted_at AS "contactedAt"`,[id,user.sub,channel,summary])).rows[0];
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta)
    VALUES($1,'CLIENT_ALTERNATIVES_DISCUSSION_RECORDED',$2,$3)`,[user.sub,id,JSON.stringify({followupId:q.id,channel,externalDelivery:'attested_not_verified'})]);
   return q;
  },true);
 }
 /** Operational escalation is distinct from a customer complaint and does not approve or reserve inventory. */
 async escalateUnresolved(user:any,id:string,b:any){
  if(user.role!=='STAFF')throw new BadRequestException('Only reservations staff may escalate unresolved feasibility');
  const reason=String(b.reason||'').trim();
  if(reason.length<10||reason.length>1000)throw new BadRequestException('Explain the unresolved issue in 10–1000 characters');
  return this.db.transaction(async client=>{
   const row=(await client.query(`SELECT id,status,routing_lane,assigned_user_id,agent_flags
     FROM enquiries WHERE id=$1 FOR UPDATE`,[id])).rows[0];
   if(!row)throw new NotFoundException('Enquiry not found');
   if(['APPROVAL_PENDING','APPROVED','CLIENT_CONFIRMED'].includes(row.status))throw new ConflictException('Cannot escalate an already pending or committed reservation through pre-booking feasibility');
   if(row.routing_lane==='GM_ESCALATION')throw new ConflictException('Already pending GM review');
   const latest=(await client.query(`SELECT f.result->>'status' AS status FROM feasibility_runs f
    JOIN event_requests er ON er.id=f.event_id WHERE er.enquiry_id=$1
    ORDER BY f.created_at DESC,f.id DESC LIMIT 1`,[id])).rows[0];
   if(!['NOT_FEASIBLE','NEEDS_REVIEW'].includes(latest?.status))
    throw new ConflictException('Only unresolved, evaluated feasibility may be escalated through this workflow');
   const followup=await client.query('SELECT 1 FROM enquiry_client_followups WHERE enquiry_id=$1 LIMIT 1',[id]);
   if(!followup.rowCount)throw new ConflictException('Contact client and record their response before escalating unresolved alternatives');
   const gm=(await client.query(`SELECT id FROM users WHERE role='GM' ORDER BY email LIMIT 1`)).rows[0];
   if(!gm)throw new ConflictException('No General Manager available');
   const flags={...(row.agent_flags||{}),operationsEscalated:true,operationsReason:reason,
     previousStaffId:row.assigned_user_id??row.agent_flags?.previousStaffId??null};
   const q=(await client.query(`UPDATE enquiries SET routing_lane='GM_ESCALATION',assigned_user_id=$2,agent_flags=$3::jsonb
     WHERE id=$1 RETURNING id,status,routing_lane`,[id,gm.id,JSON.stringify(flags)])).rows[0];
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta)
     VALUES($1,'UNRESOLVED_FEASIBILITY_ESCALATED_TO_GM',$2,$3)`,[user.sub,id,JSON.stringify({reason,from:'CLIENT_ALTERNATIVES'})]);
   return q;
  },true);
 }
 /** Explicit staff routing is a durable override, not an ephemeral model output. */
 async reroute(user:any,id:string,b:any){
  const category=String(b.category||'') as Intent | 'OTHER_EVENT';
  if(!['ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','OTHER_EVENT','COMPLAINT','UNKNOWN'].includes(category))throw new BadRequestException('Invalid category');
  return this.db.transaction(async client=>{
   const previous=(await client.query('SELECT id,routing_lane,category,agent_flags,status FROM enquiries WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!previous)throw new NotFoundException('Enquiry not found');
   if(['APPROVAL_PENDING','APPROVED','CLIENT_CONFIRMED'].includes(previous.status))throw new ConflictException('An approved reservation cannot be reclassified; use the separate complaint escalation action');
   // A previously detected complaint cannot silently lose its GM escalation on rerouting.
   const complaint=category==='COMPLAINT'||previous.category==='COMPLAINT'||previous.agent_flags?.complaintEscalated===true;
   const lane=complaint?'GM_ESCALATION':category==='UNKNOWN'?'UNSORTED':'ASSIGNED';
   const role=complaint||category==='UNKNOWN'?'GM':'STAFF';
   const owner=(await client.query('SELECT id FROM users WHERE role=$1 ORDER BY email LIMIT 1',[role])).rows[0]?.id||null;
   const q=await client.query('UPDATE enquiries SET manual_category=$2,category=$2,routing_lane=$3,assigned_user_id=$4 WHERE id=$1 RETURNING id,category,routing_lane,assigned_user_id,manual_category',[id,category,lane,owner]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'ENQUIRY_REROUTED',$2,$3)`,[user.sub,id,JSON.stringify({category,lane,prior:previous.category})]);
   return q.rows[0];
  });
 }
 /** Escalation of a complaint is NOT an approval request for event resources.
  * Preserve event category and raise an independently auditable GM review flag. */
 async escalateComplaint(user:any,id:string,b:any){
  if(user.role!=='STAFF')throw new BadRequestException('Only reservations staff may escalate a complaint');
  const reason=String(b?.reason||'Guest complaint needs GM review').trim().slice(0,1000);
  if(!reason)throw new BadRequestException('Provide a reason for complaint escalation');
  return this.db.transaction(async client=>{
   const row=(await client.query('SELECT id,routing_lane,agent_flags,status,assigned_user_id FROM enquiries WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!row)throw new NotFoundException('Enquiry not found');
   if(row.routing_lane==='GM_ESCALATION')throw new ConflictException('Already escalated to GM');
   const gm=(await client.query(`SELECT id FROM users WHERE role='GM' ORDER BY email LIMIT 1`)).rows[0];
   const flags={...(row.agent_flags||{}),complaintEscalated:true,complaintReason:reason,previousStaffId:row.assigned_user_id??row.agent_flags?.previousStaffId??null};
   const changed=(await client.query(`UPDATE enquiries SET routing_lane='GM_ESCALATION',assigned_user_id=$2,agent_flags=$3::jsonb WHERE id=$1 RETURNING id,category,status,routing_lane`,[id,gm?.id||null,JSON.stringify(flags)])).rows[0];
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'COMPLAINT_ESCALATED_TO_GM',$2,$3)`,[user.sub,id,JSON.stringify({reason})]);
   return changed;
  });
 }
 /** Preserve original AI extraction separately so staff corrections survive agent reprocessing. */
 async correct(user:any,id:string,b:any){
  let patch;
  try {patch=validateCorrection(b);}catch(e){throw new BadRequestException((e as Error).message);}
  return this.db.transaction(async client=>{
   const q=await client.query('SELECT id,message,manual_extracted,extracted,status FROM enquiries WHERE id=$1 FOR UPDATE',[id]);
   const row=q.rows[0];if(!row)throw new NotFoundException('Enquiry not found');
   if(['APPROVAL_PENDING','APPROVED','CLIENT_CONFIRMED'].includes(row.status))throw new ConflictException('Approved reservation requirements cannot be changed; use a separate change-review workflow');
   if(patch.eventStaff!==undefined){
    const review=(await client.query('SELECT status FROM staff_plans WHERE enquiry_id=$1 FOR UPDATE',[id])).rows[0];
    if(review && !['Draft','Changes requested'].includes(review.status))
     throw new ConflictException('Staffing plan is under GM review or approved; request changes before editing the event staff requirement');
    if(review && Number.isSafeInteger(patch.eventStaff)){
     const old=(await client.query('SELECT counts FROM staff_plans WHERE enquiry_id=$1',[id])).rows[0];
     await client.query(`UPDATE staff_plans SET counts=$2,status='Draft',gm_note='',updated_at=now() WHERE enquiry_id=$1`,
      [id,JSON.stringify(alignStaffCounts(old.counts,Number(patch.eventStaff)))]);
    }
   }
   const overrides={...(row.manual_extracted||{}),...patch};
   // Start from the persisted semantic extraction: rebuilding from Regex would discard
   // LLM-understood phrases (e.g. 'three dozen rooms') when staff corrects one field.
   const persisted=row.extracted && typeof row.extracted==='object' ? row.extracted : extractRequirements(row.message);
   const {semantic:semanticMeta,toolObservation:unusedObservation,...base}=persisted;
   const effective=mergeCorrection({...extractRequirements(row.message),...base},overrides);
   const observation=row.extracted?.toolObservation??null;
   const updated=await client.query('UPDATE enquiries SET manual_extracted=$2,extracted=$3 WHERE id=$1 RETURNING id,extracted,manual_extracted',[id,JSON.stringify(overrides),JSON.stringify({...effective,semantic:semanticMeta??null,toolObservation:observation})]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'ENQUIRY_EXTRACTION_CORRECTED',$2,$3)`,[user.sub,id,JSON.stringify({fieldNames:Object.keys(patch)})]);
   return updated.rows[0];
  });
 }
 async updateDraft(user:any,id:string,b:any){const body=String(b.body||'').trim();if(body.length<8||body.length>5000)throw new BadRequestException('Draft must be 8-5000 characters');const q=await this.db.query(`UPDATE reply_drafts SET body=$3,edited_by=$2 WHERE id=$1 AND status='DRAFT' RETURNING *`,[id,user.sub,body]);if(!q.rows[0])throw new ConflictException('Draft not editable');return q.rows[0];}
 async send(user:any,id:string){const q=await this.db.query(`UPDATE reply_drafts SET status='SENT_SIMULATED',sent_at=now(),edited_by=$2 WHERE id=$1 AND status='DRAFT' RETURNING *`,[id,user.sub]);if(!q.rows[0])throw new ConflictException('Draft not pending');await this.db.query(`INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'REPLY_SENT_SIMULATED',$2)`,[user.sub,id]);return {status:'SENT_SIMULATED',draftId:id,simulation:true,body:q.rows[0].body};}
}
@Controller('enquiries')
export class PublicEnquiriesController {
 constructor(private readonly svc:EnquiriesService){}
 @Post() submit(@Body() b:any){return this.svc.create(b||{},'WEB');}
 @Post('chat/advisory') advisory(@Body() b:any){return this.svc.chatAdvisory(b||{});}
}
@UseGuards(AuthGuard,StaffGuard)
@Controller('staff')
export class StaffEnquiriesController {
 constructor(private readonly svc:EnquiriesService,private readonly agent:AgentService,private readonly events:EventsService){}
 @Get('enquiries') list(@Query('category') category?:string){return this.svc.list(category);}
 @Get('enquiries/paged') paged(@Query() q:any){return this.svc.listPaged(q||{});}
 @Post('enquiries/mock-inbound') mock(@Body() b:any){const source=b?.source;if(!['EMAIL_SIM','WHATSAPP_SIM'].includes(source))throw new BadRequestException('Source must be EMAIL_SIM or WHATSAPP_SIM');return this.svc.create(b,source);}
 @Post('enquiries/:id/event-proposal') proposal(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.events.createFromEnquiry(u,id,b||{});}
 @Get('enquiries/:id') one(@Param('id') id:string){return this.svc.one(id);}
 @Get('enquiries/:id/drafts') drafts(@Param('id') id:string){return this.svc.drafts(id);}
 @Get('enquiries/:id/client-followups') clientFollowups(@Param('id') id:string){return this.svc.clientFollowups(id);}
 @Post('enquiries/:id/client-followups') recordClientFollowup(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.recordClientFollowup(u,id,b||{});}
 @Post('enquiries/:id/escalate-unresolved') escalateUnresolved(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.escalateUnresolved(u,id,b||{});}

 @Post('enquiries/:id/ai-process') process(@Param('id') id:string){return this.agent.process(id);}
 @Patch('enquiries/:id/routing') route(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.reroute(u,id,b||{});}
 @Post('enquiries/:id/escalate-complaint') escalateComplaint(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.escalateComplaint(u,id,b||{});}
 @Patch('enquiries/:id/extraction') extract(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.correct(u,id,b||{});}
 @Patch('drafts/:id') draft(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.updateDraft(u,id,b||{});}
 @Post('drafts/:id/send-simulated') send(@CurrentUser() u:any,@Param('id') id:string){return this.svc.send(u,id);}
}
