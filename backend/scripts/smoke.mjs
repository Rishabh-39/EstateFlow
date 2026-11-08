// Integration smoke test; run only AFTER PostgreSQL is started, migrated and seeded and API is running.
import assert from 'node:assert/strict';
const base=process.env.API_BASE_URL||'http://localhost:4000';
async function req(path,{method='GET',token,body,key}={}) {
 const res=await fetch(base+path,{method,headers:{...(token?{'Authorization':`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));return {status:res.status,data};
}
function must(ok,why){if(!ok)throw new Error(why);}
console.log('Running integration smoke against',base);
const health=await req('/health');must(health.status===200,'Health failed');
const staff=(await req('/auth/login',{method:'POST',body:{email:'staff@estateflow.local',password:'DemoStaff!2026'}})).data.accessToken;
const guest=(await req('/auth/login',{method:'POST',body:{email:'guest@estateflow.local',password:'DemoGuest!2026'}})).data.accessToken;
must(staff&&guest,'Logins failed');
const categories=await req('/room-types');must(categories.status===200&&categories.data.length===2,'Room list failed');
const estate=categories.data.find(t=>t.code==='ESTATE');
const day='2027-04-11',day2='2027-04-12';
const inv=await req(`/staff/inventory/${estate.id}/days/${day}`,{method:'PUT',token:staff,body:{websiteAllotment:1,blackedOut:false}});must(inv.status===200,'Admin allotment update failed');
const payload={roomTypeId:estate.id,checkIn:day,checkOut:day2,guests:2};
const [a,b]=await Promise.all([
 req('/booking-holds',{method:'POST',token:guest,body:payload,key:'smoke-booking-a-2027'}),
 req('/booking-holds',{method:'POST',token:guest,body:payload,key:'smoke-booking-b-2027'})
]);
const success=[a,b].filter(x=>x.status===201),failure=[a,b].filter(x=>x.status===409);
must(success.length===1&&failure.length===1,`Concurrent booking invariant violated: ${a.status}, ${b.status}`);
console.log('PASS: concurrent final allotment yields one hold and one conflict');
const hold=success[0].data.id;
const payment=await req('/payments/mock/confirm',{method:'POST',token:guest,body:{holdId:hold,outcome:'SUCCESS'},key:'smoke-payment-unique-2027'});
must(payment.status===201 && payment.data.status==='CONFIRMED','Payment confirmation failed');
const repeat=await req('/payments/mock/confirm',{method:'POST',token:guest,body:{holdId:hold,outcome:'SUCCESS'},key:'smoke-payment-unique-2027'});
must(repeat.status===201 && repeat.data.replayed===true,'Payment retry not idempotent');
console.log('PASS: payment confirmation and idempotent retry');
const enq=await req('/staff/enquiries/mock-inbound',{method:'POST',token:staff,body:{source:'WHATSAPP_SIM',contactName:'Sample Contact',message:'Please book a wedding lawn for 250 guests in February 2027'}});
must(enq.status===201 && enq.data.classification.category==='WEDDING','Local agent did not classify wedding');
console.log('PASS: local trained agent classifies a wedding enquiry');
const eventsList=await req('/staff/enquiries',{token:staff});must(eventsList.status===200,'Inbox failed');
const event=await req('/staff/events',{method:'POST',token:staff,body:{title:'Smoke Test Wedding',eventDate:'2027-02-14',checkIn:'2027-02-13',checkOut:'2027-02-15',guests:250,roomsRequired:35,diningGuests:250,parkingSpaces:60,eventStaff:12,venueCode:'LAWN'}});
must(event.status===201,'Event creation failed');
const eventId=event.data.id;
const fea=await req(`/staff/events/${eventId}/evaluations`,{method:'POST',token:staff});
must(fea.status===201 && fea.data.status==='NOT_FEASIBLE' && fea.data.blockers.some(x=>x.resource==='PARKING'),'Parking bottleneck not detected');
const cannot=await req(`/staff/events/${eventId}/reserve`,{method:'POST',token:staff});must(cannot.status===409,'Infeasible event was reserved');
console.log('PASS: detects parking bottleneck and blocks infeasible approval');
const alter=await req(`/staff/events/${eventId}/alternatives`,{token:staff});must(alter.status===200&&alter.data.candidates.length>0,'No verified alternate dates');
console.log('PASS: alternative date search');
console.log('ALL PASS — integration smoke complete');
