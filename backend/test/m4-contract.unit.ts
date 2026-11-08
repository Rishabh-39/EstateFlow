/** Dependency-light tests for date-only booking-hold idempotency. */
import assert from 'node:assert/strict';
import { toDateOnly, assertMatchingHoldRequest, normalizeHoldDateFields } from '../src/shared/hold-idempotency';

const valid={roomTypeId:'type-123',checkIn:'2027-08-11',checkOut:'2027-08-13',guests:2};
// pg DATE may arrive as local midnight; in Asia/Kolkata its UTC date is the day before.
const pgLocalMidnight = new Date(2027,7,11);
assert.equal(toDateOnly(pgLocalMidnight),null,'JS Date must not be used for date-only comparisons');
assert.equal(toDateOnly(valid.checkIn),'2027-08-11');
const rawPgRow={id:'hold-123',room_type_id:'type-123',check_in:pgLocalMidnight,
 check_out:new Date(2027,7,13),check_in_date:'2027-08-11',check_out_date:'2027-08-13',guests:2};
const existing=normalizeHoldDateFields(rawPgRow);
assert.equal(existing.check_in,'2027-08-11');
assert.equal(existing.check_out,'2027-08-13');
assert.equal('check_in_date' in existing,false);
assert.equal(assertMatchingHoldRequest(existing,valid),true,'same request must replay');
assert.equal(assertMatchingHoldRequest(existing,{...valid,checkOut:'2027-08-14'}),false);
assert.equal(assertMatchingHoldRequest(existing,{...valid,guests:3}),false);
assert.equal(assertMatchingHoldRequest(existing,{...valid,roomTypeId:'different'}),false);
assert.equal(assertMatchingHoldRequest(existing,{...valid,checkIn:'not-a-date'}),false);
assert.equal(assertMatchingHoldRequest(existing,{...valid,guests:'2'}),false);
assert.throws(()=>normalizeHoldDateFields({check_in:new Date(2027,7,11),check_out:new Date(2027,7,13)}),/cast to text/);
assert.throws(()=>normalizeHoldDateFields({...rawPgRow,room_type_id:undefined}),/room_type_id and guests/);
assert.throws(()=>normalizeHoldDateFields({...rawPgRow,guests:undefined}),/room_type_id and guests/);
if(process.env.TZ==='Asia/Kolkata'){
 assert.notEqual(pgLocalMidnight.toISOString().slice(0,10),'2027-08-11',
  'regression setup must demonstrate the IST day-shift');
}
console.log('PASS: Milestone 4 hold idempotency/date-only handling (12+ regression assertions)');
