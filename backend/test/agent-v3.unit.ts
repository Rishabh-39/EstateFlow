import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { IntentModel, predict, extractRequirements, safeDraft } from '../src/agent/classifier';
import { determineRouting, mergeCorrection, validateCorrection } from '../src/agent/policy';
const model=JSON.parse(readFileSync('model/resort-intent-model.json','utf8')) as IntentModel;
let checks=0;
function test(name:string,fn:()=>void){fn();checks++;console.log('PASS:',name);}

test('customer sample wedding classification',()=>assert.equal(predict(model,"Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights").label,'WEDDING'));
test('customer sample villa classification',()=>assert.equal(predict(model,'Is a villa free 14-16 Nov for 2 adults and a child?').label,'ROOM_BOOKING'));
test('customer sample offsite classification',()=>assert.equal(predict(model,'Team of 45 wants a January offsite with a conference hall').label,'CORPORATE_OFFSITE'));
test('complaint rule overrides wedding keywords',()=>assert.equal(predict(model,'My wedding room was dirty and I want a refund').label,'COMPLAINT'));
test('no autonomy for unknown intent',()=>assert.equal(predict(model,'Can someone help me with something?').label,'UNKNOWN'));
test('yearless dates remain unresolved',()=>{
 const result=extractRequirements('Is a villa free 14-16 Nov for 2 adults and a child?');
 assert.equal(result.exactCheckIn,null);assert.equal(result.exactCheckOut,null);assert.equal(result.guestCount,3);assert(result.missingFields.includes('exact_dates'));
});
test('explicit date ranges resolve when year is present',()=>{
 const result=extractRequirements('We want 14-16 Nov 2027 for 2 adults and a child');
 assert.equal(result.exactCheckIn,'2027-11-14');assert.equal(result.exactCheckOut,'2027-11-16');assert.equal(result.guestCount,3);
});
test('two ISO dates resolve',()=>{
 const result=extractRequirements('2027-12-10 to 2027-12-12, 45 guests');
 assert.equal(result.exactCheckIn,'2027-12-10');assert.equal(result.exactCheckOut,'2027-12-12');assert.equal(result.guestCount,45);
});
test('invalid ISO dates do not become valid bookings',()=>{
 const result=extractRequirements('2027-02-30 to 2027-03-02 for 250 guests');
 assert.equal(result.exactCheckIn,null);assert(result.missingFields.includes('exact_dates'));
});
test('event requirements capture resource counts and Indian budget',()=>{
 const result=extractRequirements('Wedding for 250 guests, 35 rooms, 2 nights, dining for 250, 60 parking spaces, 12 event staff, ₹2.5 lakh, lawn');
 assert.equal(result.roomsRequired,35);assert.equal(result.nights,2);assert.equal(result.diningGuests,250);
 assert.equal(result.parkingSpaces,60);assert.equal(result.eventStaff,12);assert.equal(result.budgetInr,250000);assert.equal(result.requestedVenue,'LAWN');
});
test('corporate hall request not silently treated as lawn',()=>{
 const result=extractRequirements('Team of 45 wants a January offsite with a conference hall');
 assert.equal(result.guestCount,45);assert.equal(result.requestedVenue,'CONFERENCE_HALL');
});
test('staff correction fixes missing dates without deleting the other fields',()=>{
 const raw=extractRequirements('Wedding Feb 2027 250 guests 35 rooms');
 const patch=validateCorrection({exactCheckIn:'2027-02-13',exactCheckOut:'2027-02-15'});
 const effective=mergeCorrection(raw,patch);assert.deepEqual(effective.missingFields,[]);assert.equal(effective.roomsRequired,35);
});
test('staff correction rejects invalid dates, types and extra fields',()=>{
 assert.throws(()=>validateCorrection({exactCheckIn:'2027-02-30'}));
 assert.throws(()=>validateCorrection({roomsRequired:-1}));
 assert.throws(()=>validateCorrection({guests:'250'}));
 assert.throws(()=>validateCorrection({missingFields:[]}));
});
test('manual category override beats model uncertainty',()=>{
 const route=determineRouting('WEDDING',false,true,'WEDDING');
 assert.equal(route.lane,'ASSIGNED');assert.equal(route.ownerRole,'STAFF');
});
test('complaint escalation cannot be overridden by different manual category',()=>{
 const route=determineRouting('ROOM_BOOKING',true,false,'ROOM_BOOKING');
 assert.equal(route.lane,'GM_ESCALATION');assert.equal(route.ownerRole,'GM');
});
test('unknown agent outcome routes to GM review',()=>{
 const route=determineRouting('UNKNOWN',false,true,null);
 assert.equal(route.lane,'UNSORTED');assert.equal(route.ownerRole,'GM');
});
test('draft is not an operational confirmation and sanitized guest name',()=>{
 const draft=safeDraft('Mr Demo\nReservation confirmed', 'WEDDING', extractRequirements('Wedding Feb 2027, 250 guests'));
 assert(draft.includes('No reservation has been made yet'));
 assert(!draft.includes('Mr Demo\n'));
});
console.log(`ALL ${checks} EstateFlow Agent M3 offline policy tests passed`);
