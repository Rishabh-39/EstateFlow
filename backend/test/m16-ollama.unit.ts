import assert from 'node:assert/strict';
import { validateSemantic, semanticExtract, EXTRACTION_SCHEMA, WORDING_SCHEMA, validateWordingOutput, supportedCount } from '../src/agent/ollama';
import { guestAdvisory } from '../src/agent/generative';

const source='We are planning a wedding next December for around two hundred guests. We need roughly three dozen rooms and dinner for everyone.';
const response={
 event_type:'WEDDING',date_text:'next December',guest_count:200,rooms_required:36,nights:null,
 dining_guests:null,parking_spaces:null,event_staff:null,requested_venue:null,dining_requested:true,
 approximate_fields:['guest_count','rooms_required'],evidence:{date_text:'next December',guest_count:'around two hundred guests',
 rooms_required:'roughly three dozen rooms',nights:null,dining_guests:null,parking_spaces:null,event_staff:null,requested_venue:null},
};
const semantic=validateSemantic(source,response);
assert.ok(semantic,'Valid extraction should pass');
assert.equal(semantic.extraction.guestCount,200);
assert.equal(semantic.extraction.roomsRequired,36);
assert.equal(semantic.extraction.dateText,'next December');
assert.equal(semantic.extraction.exactCheckIn,null);
assert.equal(semantic.extraction.exactCheckOut,null);
assert.equal(semantic.extraction.diningGuests,null,'No fabricated dining cover count');
assert.ok(semantic.meta.approximateFields.includes('guestCount'));
assert.ok(semantic.meta.requiresConfirmation.some(s=>s.includes('Dining')));
assert.ok(semantic.extraction.missingFields.includes('exact_dates'));
const invented=validateSemantic(source,{...response,rooms_required:55,evidence:{...response.evidence,rooms_required:'55 rooms'}});
assert.equal(invented?.extraction.roomsRequired,36,'Reject invented 55 and recover the documented 36 rooms');
const missing=validateSemantic(source,{...response,evidence:null});
assert.equal(missing,null);

// Regression: a real qwen3:4b response omitted an explicitly stated word-based guest count.
const omittedGuest={...response,guest_count:null,approximate_fields:['rooms_required'],evidence:{...response.evidence,guest_count:null}};
const recovered=validateSemantic(source,omittedGuest);
assert.equal(recovered?.extraction.guestCount,200,'Recover explicitly stated "two hundred guests"');
assert.ok(recovered?.meta.approximateFields.includes('guestCount'));
assert.equal(recovered?.meta.evidence.guestCount,'around two hundred guests');
assert.ok(!recovered?.extraction.missingFields.includes('guests'));
const contradicted=validateSemantic(source,{...response,guest_count:250});
assert.equal(contradicted?.extraction.guestCount,200,'Model values conflicting with verbatim evidence must be corrected');
assert.equal(supportedCount('About thirty-five rooms','roomsRequired')?.value,35);
assert.equal(supportedCount('about 200 wedding guest','guestCount')?.value,200,'Explicit wedding-guest qualifier still provides numeric evidence');
assert.equal(supportedCount('about 200 wedding guest','guestCount')?.approximate,true);
const adjectiveGuest=validateSemantic('about 200 wedding guest',omittedGuest);
assert.equal(adjectiveGuest?.extraction.guestCount,200,'Recover guest count from customer wording despite an omitted model field');
assert.equal(supportedCount('One hundred and twenty-five guests','guestCount')?.value,125);
assert.equal(supportedCount('between 20 and 30 guests','guestCount'),null,'Ranges are not exact counts');
assert.equal(supportedCount('20 or 30 rooms','roomsRequired'),null,'Alternatives are not exact counts');
assert.equal(supportedCount('dinner for everyone','guestCount'),null,'Never invent dining cover counts');


// A real Qwen3 4B local smoke returned a reasoning transcript rather than a guest reply.
const leakedReasoning='We are given a customer enquiry. The rules state that we should write a brief answer. The customer is asking about the lawn.';
assert.equal(validateWordingOutput(leakedReasoning,'advisory'),null,'Never show raw reasoning text');
assert.equal(validateWordingOutput(JSON.stringify({reply:leakedReasoning}),'advisory'),null,'Reject reasoning even inside valid JSON');
assert.equal(validateWordingOutput(JSON.stringify({reply:'Yes, our lawn holds 200 guests and is available on that date.'}),'advisory'),null,'Reject invented capacity');
assert.equal(validateWordingOutput(JSON.stringify({reply:'Thank you for considering the estate. Could you share the exact date in December and any catering requirements? Our team can then check lawn feasibility before confirming availability.'}),'advisory')?.includes('exact date'),true);
assert.equal(validateWordingOutput(JSON.stringify({reply:'Dear Guest, Thank you for writing. Please confirm your exact dates so we can review the venue and catering requirements. No reservation has been made. Regards, EstateFlow Reservations'}),'staff-draft')?.includes('No reservation'),true);
assert.equal(WORDING_SCHEMA.properties.reply.type,'string');

// Stubs prove the same Ollama request format the user's Mac verified: think false, stream false, schema.
const fetchOriginal=globalThis.fetch;
const oldProvider=process.env.AI_PROVIDER;
const oldUrl=process.env.OLLAMA_URL;
process.env.AI_PROVIDER='ollama';
process.env.OLLAMA_URL='http://127.0.0.1:11434';
let calls=0;
globalThis.fetch=async (_req:any,init:any)=>{
 const b=JSON.parse(init.body);calls++;
 assert.equal(b.model,'qwen3:4b');assert.equal(b.think,false);assert.equal(b.stream,false);
 assert.equal(b.messages[0].role,'system');assert.equal(b.messages[1].role,'user');
 if(b.format?.properties?.evidence){assert.equal(b.format.type,'object');assert.ok(b.format.properties.evidence);assert.equal(EXTRACTION_SCHEMA.type,'object');
  return {ok:true,json:async()=>({message:{content:JSON.stringify(omittedGuest)}})} as any;}
 assert.equal(b.format?.properties?.reply?.type,'string');
 return {ok:true,json:async()=>({message:{content:JSON.stringify({reply:'Please share exact dates, and our team can check feasibility. No reservation has been made.'})}})} as any;
};
async function run(){
 try{
  const extract=await semanticExtract(source);
  assert.equal(extract.meta.source,'ollama');assert.equal(extract.extraction.roomsRequired,36);assert.equal(extract.extraction.guestCount,200);
  const advise=await guestAdvisory('Can we arrange dinner for 200 guests?');
  assert.equal(advise.mode,'ollama');assert.match(advise.text,/exact dates/);
  assert.equal(calls,2);
  globalThis.fetch=async ()=>{throw new Error('Ollama offline');};
  const fallback=await semanticExtract(source);
  assert.equal(fallback.meta.source,'regex-fallback');
  assert.equal(fallback.meta.error,'unavailable');
  assert.equal(fallback.extraction.roomsRequired,null);
  const guided=await guestAdvisory('Vegetarian catering options');
  assert.equal(guided.mode,'local-guided');
  process.env.OLLAMA_URL='http://example.com:11434';
  const invalid=await semanticExtract(source);
  assert.equal(invalid.meta.source,'regex-fallback','Remote Ollama URLs must fail closed');
  console.log('PASS: structured schema, no-thinking, uncertainty, evidence checks, fallback and local-only access (37 assertions)');
 } finally {
  globalThis.fetch=fetchOriginal;
  if(oldProvider===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=oldProvider;
  if(oldUrl===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=oldUrl;
 }
}
run().catch(err=>{console.error(err);process.exitCode=1;});
