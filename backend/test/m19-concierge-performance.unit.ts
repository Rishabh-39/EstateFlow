import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { semanticExtractWithDraft, ENQUIRY_ANALYSIS_SCHEMA } from '../src/agent/ollama';
import { publicWriteRoute, RATE_POLICIES } from '../src/shared/request-security';

const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
let checks=0;
const check=(ok:unknown,message:string)=>{assert.ok(ok,message);checks++;};

check(publicWriteRoute('POST','/enquiries/chat/advisory')==='ADVISORY'&&RATE_POLICIES.ADVISORY.limit>RATE_POLICIES.ENQUIRY.limit,'Optional advisory does not consume the enquiry-write quota');
const code=read('src/enquiries/enquiries.ts');
check(code.includes('message=message || chr(10) || $2::text'),'Follow-up SQL casts the message parameter to text');
check(code.includes('INSERT INTO enquiry_messages'),'Follow-up records remain attached to the original enquiry');
check(code.includes('pg_advisory_xact_lock(hashtextextended($1::text, 0))'),'Concurrent first messages serialize on the session UUID');
check(code.includes('this.queueAgent(q.id)')&&code.includes("agentStatus:'PROCESSING'"),'Database receipt remains independent of Ollama');
check(code.includes('running.dirty=true')&&code.includes('while(state.dirty)'),'Background model work coalesces multiple follow-up messages');
check(code.includes('INSERT INTO reply_drafts(enquiry_id,body)'),'New enquiries get an immediate editable draft');
check(code.includes('preliminary:true')&&code.includes('JSON.stringify(preliminary)'),'Enquiries immediately expose explicitly stated preliminary fields for staff review');
check(code.includes('record.manual_extracted||{}')&&code.includes('extracted=$3::jsonb'),'Follow-up preview retains staff corrections before background model refines');
check(code.includes('quickReply:chat?localGuestGuidance(msg)'),'Concierge gets an immediate safe guidance snippet');
const agent=read('src/agent/agent.ts');
check(agent.includes('semanticExtractWithDraft('),'Free-text agent invokes the single-call extraction and draft path');
check(agent.includes('const preferred=formGroundedDraft'),'Structured forms use their supplied facts without redundant model inference');
const ui=read('../frontend/src/components/estate/ai-concierge.tsx');
check(ui.includes('guidanceId')&&ui.includes('m.map(item=>item.id===guidanceId'),'Pending quick guidance is replaced in place, not duplicated');
check(ui.includes('estateflow-concierge-session'),'Existing one-enquiry-per-chat token remains');
check(read('../frontend/src/routes/staff.inbox.tsx').includes('refetchInterval: 3000'),'Inbox polls sooner for completed background processing');

const originalProvider=process.env.AI_PROVIDER;
const originalModel=process.env.OLLAMA_MODEL;
const originalUrl=process.env.OLLAMA_URL;
const originalFetch=globalThis.fetch;
process.env.AI_PROVIDER='ollama';
process.env.OLLAMA_URL='http://127.0.0.1:11434';
process.env.OLLAMA_MODEL='qwen3:4b';

const enquiry='We need roughly three dozen rooms for around two hundred wedding guests next December. Dinner for everyone.';
const extracted={event_type:'WEDDING',date_text:'next December',guest_count:200,rooms_required:36,nights:null,
 dining_guests:null,parking_spaces:null,event_staff:null,requested_venue:null,dining_requested:true,
 approximate_fields:['guest_count','rooms_required'],evidence:{date_text:'next December',guest_count:'around two hundred wedding guests',rooms_required:'roughly three dozen rooms',
 nights:null,dining_guests:null,parking_spaces:null,event_staff:null,requested_venue:null}};
const safeReply='Hello Guest, thank you for your wedding enquiry for around 200 guests and roughly 36 rooms. Could you share the exact date and confirm the dining covers? Our team will check availability. No reservation has been made. Regards, EstateFlow Reservations.';
const run=async()=>{
 try{
  let calls=0;
  globalThis.fetch=async (_url:any,options:any)=>{
   calls++;
   const b=JSON.parse(options.body);
   check(b.think===false&&b.stream===false,'Combined call has no thinking and no streaming');
   check(b.format?.properties?.extraction?.properties?.evidence&&b.format?.properties?.reply,'Combined schema includes evidence and draft');
   return {ok:true,json:async()=>({message:{content:JSON.stringify({extraction:extracted,reply:safeReply})}})} as any;
  };
  const result=await semanticExtractWithDraft(enquiry,'Guest','WEDDING');
  check(calls===1,'One model request per free-text processing pass, not two');
  check(result.semantic.extraction.guestCount===200&&result.semantic.extraction.roomsRequired===36,'Noun-anchored quantities validated');
  check(result.semantic.extraction.exactCheckIn===null&&result.semantic.extraction.diningGuests===null,'Unknown dates and dining covers stay unresolved');
  check(result.semantic.meta.approximateFields.includes('guestCount'),'Approximate guest count preserved');
  check(Boolean(result.draft?.includes('No reservation has been made')),'Staff draft is safe and personalized');
  check(ENQUIRY_ANALYSIS_SCHEMA.required.length===2,'Combined output has two required top-level properties');
  globalThis.fetch=async ()=>{throw new Error('Ollama unavailable');};
  const fallback=await semanticExtractWithDraft(enquiry,'Guest','WEDDING');
  check(fallback.semantic.meta.source==='regex-fallback'&&fallback.draft===null,'Fail closed with deterministic extraction and no fake model draft');
  console.log(`PASS EstateFlow M19 fast receipts, one-call model, session append and UI behavior (${checks} assertions)`);
 } finally {
  globalThis.fetch=originalFetch;
  if(originalProvider===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=originalProvider;
  if(originalModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=originalModel;
  if(originalUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=originalUrl;
 }
};
run().catch(e=>{console.error(e);process.exitCode=1;});
