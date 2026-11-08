import assert from 'node:assert/strict';
import {validateCalendarWindow, calendarView, holdView, isStrongJwtConfigured} from '../src/shared/frontdesk-contract';

let n=0;
const yes=(v:unknown,desc:string)=>{assert.ok(v,desc);n++;};
const range=validateCalendarWindow('2027-02-13','2027-02-15');
yes(range.days===3,'inclusive date range has three days');
for(const [start,end] of [['2027-02-30','2027-03-01'],['2027-02-15','2027-02-14'],['2027-01-01','2027-02-05'],['2027-01-01','2027-01-02T01:00:00Z']]) {
 assert.throws(()=>validateCalendarWindow(start,end)); n++;
}
yes(validateCalendarWindow('2027-02-01','2027-03-03').days===31,'31-day max accepted');
const rows = [
 {date:'2027-02-14',code:'LAWN',display_name:'Wedding lawn',slot_id:'slot-1',slot_name:'DAY',capacity:1,blocked:false,reserved:1},
 {date:'2027-02-14',code:'PARKING',display_name:'Parking',slot_id:'slot-2',slot_name:'DAY',capacity:48,blocked:false,reserved:35},
 {date:'2027-02-14',code:'EVENT_STAFF',display_name:'Event staff',slot_id:null,slot_name:null,capacity:null,blocked:null,reserved:0},
 {date:'2027-02-14',code:'DINING',display_name:'Dining',slot_id:'slot-3',slot_name:'DAY',capacity:300,blocked:true,reserved:0},
];
const calendar=calendarView(rows,'2027-02-14','2027-02-14');
yes(calendar.days.length===1 && calendar.days[0].resources.length===4,'calendar groups resource by day');
const by=(c:string)=>calendar.days[0].resources.find(r=>r.code===c)!;
yes(by('LAWN').status==='FULL' && by('LAWN').available===0,'fully committed lawn not free');
yes(by('PARKING').status==='AVAILABLE' && by('PARKING').available===13,'parking capacity subtracts commitments');
yes(by('EVENT_STAFF').status==='NEEDS_REVIEW' && by('EVENT_STAFF').available===null,'missing resource slot is not free');
yes(by('DINING').status==='BLOCKED' && by('DINING').available===0,'blocked resources are not free');
const active=holdView({id:'hold-1',room_type_id:'unit',guests:2,total_paise:220000,
 check_in:'2027-02-13',check_out:'2027-02-15',expires_at:'2027-01-01T00:00:00Z',
 effective_status:'ACTIVE',remaining_seconds:120});
yes(active.remainingSeconds===120 && active.checkIn==='2027-02-13','date-only hold read model stable');
assert.throws(()=>holdView({...active,check_in:new Date('2027-02-13T00:00:00+05:30'),check_out:'2027-02-15',expires_at:'2027-01-01T00:00:00Z', effective_status:'ACTIVE',remaining_seconds:12}));n++;
yes(!isStrongJwtConfigured('REPLACE_WITH_YOUR_OWN_LONG_RANDOM_SECRET'),'placeholder JWT refused');
yes(!isStrongJwtConfigured('abc'),'short JWT refused');
yes(isStrongJwtConfigured('a96f8b21e5836d2a0c170d2848eff5fd56f8e950d10ff7a1d52f11c7227bd833'),'random JWT format accepted');
console.log(`PASS: Milestone 5 calendar, hold-status and runtime validation (${n} assertions)`);
