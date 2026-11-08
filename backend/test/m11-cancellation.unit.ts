import assert from 'node:assert/strict';
import {beforeCheckIn,cancellationReason,cancellationView} from '../src/shared/booking-cancellation';
import {holdView} from '../src/shared/frontdesk-contract';
let count=0;
const yes=(v:boolean,why:string)=>{assert.ok(v,why);count++;};
yes(cancellationReason(undefined,'GUEST')==='GUEST_REQUEST','guest default reason');
yes(cancellationReason(undefined,'STAFF')==='OTHER','staff default reason');
for(const c of ['GUEST_REQUEST','DUPLICATE','STAFF_CORRECTION','OTHER'])yes(cancellationReason(c,'STAFF')===c,`accepted ${c}`);
for(const c of ['',null as any,3,'wrong','guest_request','BOGUS']){
 if(c===null){yes(cancellationReason(null,'GUEST')==='GUEST_REQUEST','null defaults');continue;}
 assert.throws(()=>cancellationReason(c,'GUEST'));count++;
}
yes(beforeCheckIn('2027-08-11','2027-08-10'),'day before checkin can cancel');
yes(!beforeCheckIn('2027-08-11','2027-08-11'),'checkin day cannot cancel');
yes(!beforeCheckIn('2027-08-11','2027-08-12'),'past checkin cannot cancel');
assert.throws(()=>beforeCheckIn('not-date','2027-08-12'));count++;
const c=cancellationView('uuid','EF-SAMPLE',false,2);
yes(c.status==='CANCELLED'&&c.refundStatus==='NOT_PROCESSED'&&c.simulatedPayment,'no false payment refund claims');
const h=holdView({id:'hold',room_type_id:'type',guests:2,total_paise:8000,
 check_in:'2027-08-11',check_out:'2027-08-13',expires_at:'2027-08-10T00:00:00.000Z',effective_status:'CANCELLED',remaining_seconds:0});
yes(h.status==='CANCELLED'&&h.remainingSeconds===0,'checkout explicitly recognizes cancellation');
console.log(`PASS: M11 booking cancellation pure rules (${count} assertions)`);
