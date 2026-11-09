import assert from 'node:assert/strict';
import { extractRequirements } from '../src/agent/classifier';
import { localGuestGuidance, guestAdvisory } from '../src/agent/generative';

process.env.AI_PROVIDER='local-guided';
const question='25/11/2026 and number of guests = 20000';
const facts=extractRequirements(question);
assert.equal(facts.dateText,'25/11/2026');
assert.equal(facts.guestCount,20000);
assert.equal(facts.exactCheckIn,null,'Single event day must not silently create overnight stay');
assert.equal(facts.exactCheckOut,null);
const reply=localGuestGuidance(question);
assert.match(reply,/25\/11\/2026/);
assert.match(reply,/20,000 guests/);
assert.doesNotMatch(reply,/which exact dates and year/i);
assert.match(reply,/feasibility are not verified/);
assert.equal(extractRequirements('200 guests on 25/11/2026').guestCount,200);
assert.equal(extractRequirements('guests: 1,200').guestCount,1200);
assert.equal(extractRequirements('01/02/2027').guestCount,null);
assert.equal(extractRequirements('31/02/2027').dateText,null,'Invalid calendar day must not be treated as valid');
assert.equal(extractRequirements('25/11/2026 to 27/11/2026').exactCheckIn,'2026-11-25');
assert.equal(extractRequirements('25/11/2026 to 27/11/2026').exactCheckOut,'2026-11-27');
(async()=>{
 const result=await guestAdvisory(question,'Earlier guest message: Weekend dates next spring');
 assert.equal(result.mode,'local-guided');
 assert.match(result.text,/20,000 guests/);
 assert.doesNotMatch(result.text,/Which exact dates and year/i);
 console.log('M30 concierge extraction and fallback tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
