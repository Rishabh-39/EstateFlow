/** Destructive integration tests — RUN ONLY AGAINST database estateflow_test.
 * Expected to be started by run-e2e.mjs after migrate/seed, with NODE_ENV=test.
 */
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFileSync } from 'node:fs';
const expectedVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const {Pool}=pg;
const api=process.env.API_BASE_URL||'http://127.0.0.1:4100';
if(process.env.NODE_ENV!=='test'||process.env.DB_NAME!=='estateflow_test')throw new Error('Refusing e2e without NODE_ENV=test and DB_NAME=estateflow_test');
const pool=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USER||'rishabh',password:process.env.DB_PASSWORD||undefined});
let checks=0;
function check(condition,message){assert.ok(condition,message);checks++;console.log('  PASS',message)}
async function request(route,{method='GET',token,body,key}={}){
 const r=await fetch(api+route,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>null);
 return {status:r.status,data,headers:r.headers};
}
async function login(email,password){const r=await request('/auth/login',{method:'POST',body:{email,password}});assert.equal(r.status,201,`Login ${email} failed: ${JSON.stringify(r.data)}`);return r.data.accessToken}
function eventData(date,checkIn,checkOut,title,rooms=35,parking=60){return {title,eventDate:date,checkIn,checkOut,guests:250,roomsRequired:rooms,diningGuests:250,parkingSpaces:parking,eventStaff:12,venueCode:'LAWN'};}
try{
 console.log(`EstateFlow v${expectedVersion} integration test`,api);
 const h=await request('/health');check(h.status===200&&h.data?.environment==='test','test-server readiness verified');
 // M9: Browser root is service discovery, not the guest UI, and the contract is live.
 const apiRoot=await request('/');
 check(apiRoot.status===200&&apiRoot.data?.version===expectedVersion&&apiRoot.data?.routes?.openapi==='/openapi.json','API root explains missing frontend and advertises API contract');
 // Browser origin checks: 127.0.0.1 is a different Origin from localhost.
 for (const origin of ['http://localhost:5173','http://127.0.0.1:5173']) {
  const preflight = await fetch(api + '/auth/login', { method: 'OPTIONS', headers: {
   Origin: origin, 'Access-Control-Request-Method':'POST', 'Access-Control-Request-Headers':'content-type'
  }});
  check(preflight.status>=200 && preflight.status<300 && preflight.headers.get('access-control-allow-origin')===origin,
    `local CORS preflight allows ${origin}`);
 }

 const contract=await request('/openapi.json');
 check(contract.status===200&&contract.data?.info?.version===expectedVersion&&contract.data?.paths?.['/staff/events/{id}/reserve']?.post?.security?.length===1,'API discovery exposes staff-protected event approval');
 const requestId=apiRoot.headers.get('x-request-id');
 check(/^[0-9a-f-]{36}$/i.test(requestId||'')&&requestId!==contract.headers.get('x-request-id'),'Server assigns a distinct trace ID to each API call');
 const readiness=await request('/health/ready');
 check(readiness.status===200&&readiness.data?.database==='reachable','readiness checks PostgreSQL dependency');
 const staff=await login('staff@estateflow.local','DemoStaff!2026');
 const guest=await login('guest@estateflow.local','DemoGuest!2026');
 const gm=await login('gm@estateflow.local','DemoManager!2026');
 // M3 agent human-in-the-loop checks. Edits and routing must survive reprocessing.
 const enq=await request('/enquiries',{method:'POST',body:{contactName:'Sample Wedding Contact',message:'Venue for my sister wedding in Feb 2027, about 250 guests, 2 nights'}});
 assert.equal(enq.status,201,JSON.stringify(enq.data));
 const enquiryId=enq.data.id;
 const processedInitial=await request(`/staff/enquiries/${enquiryId}/ai-process`,{method:'POST',token:staff});
 check(processedInitial.status===201&&processedInitial.data.category==='WEDDING','local model recognizes wedding enquiry after deferred processing');
 const corrected=await request(`/staff/enquiries/${enquiryId}/extraction`,{method:'PATCH',token:staff,body:{exactCheckIn:'2027-02-13',exactCheckOut:'2027-02-15',roomsRequired:35}});
 check(corrected.status===200&&corrected.data.extracted.exactCheckIn==='2027-02-13','staff can correct extracted requirements');
 const route=await request(`/staff/enquiries/${enquiryId}/routing`,{method:'PATCH',token:staff,body:{category:'CORPORATE_OFFSITE'}});
 check(route.status===200&&route.data.manual_category==='CORPORATE_OFFSITE','staff can correct routing category and persist manual override');
 const drafts=await request(`/staff/enquiries/${enquiryId}/drafts`,{token:staff});
 assert.equal(drafts.status,200);assert(drafts.data.length>0);
 const draftId=drafts.data[0].id;
 const edited=await request(`/staff/drafts/${draftId}`,{method:'PATCH',token:staff,body:{body:'Human-edited reply: please confirm exact event requirements before we promise any reservation.'}});
 check(edited.status===200,'staff can edit the AI draft');
 const reprocess=await request(`/staff/enquiries/${enquiryId}/ai-process`,{method:'POST',token:staff});
 check(reprocess.status===201&&reprocess.data.category==='CORPORATE_OFFSITE'&&reprocess.data.extracted.roomsRequired===35&&reprocess.data.extracted.exactCheckIn==='2027-02-13','reprocessing preserves human classification and field corrections');
 check(reprocess.data.draftId===draftId&&reprocess.data.draftPreserved===true,'AI does not overwrite a human-edited draft');
 // Full-stack integration: structured event web form is stored, classified and reviewed server-side.
 const webForm={type:'Wedding',startDate:'2027-05-15',endDate:'2027-05-17',guests:180,rooms:22,venue:'Wedding lawn',dining:'All meals',parking:40,notes:'Need quiet accommodation',name:'Demo Event Planner',email:'demo-events@example.test',phone:'0000000000'};
 const webLead=await request('/enquiries',{method:'POST',body:{contactName:webForm.name,contactEmail:webForm.email,message:'Wedding enquiry: 180 guests and 22 rooms for 15 May 2027.',form:webForm}});
 check(webLead.status===201&&webLead.data.public_ref?.startsWith('ENQ-'),'structured Lovable web form creates real enquiry reference');
 const leadDetail=await request(`/staff/enquiries/${webLead.data.id}`,{token:staff});
 check(leadDetail.status===200&&leadDetail.data.form_payload?.rooms===22&&leadDetail.data.form_payload?.parking===40,'staff detail includes persisted structured wedding requirements');
 const leadFix=await request(`/staff/enquiries/${webLead.data.id}/extraction`,{method:'PATCH',token:staff,body:{roomsRequired:20,eventStaff:10}});
 const fixedLead=await request(`/staff/enquiries/${webLead.data.id}`,{token:staff});
 check(leadFix.status===200&&fixedLead.data.manual_extracted?.roomsRequired===20,'human corrections remain explicit alongside original web form');
 const complaint=await request('/staff/enquiries/mock-inbound',{method:'POST',token:staff,body:{source:'WHATSAPP_SIM',contactName:'Sample Complaint',message:'The room was dirty and the front desk was rude, please escalate.'}});
 const complaintProcessed=await request(`/staff/enquiries/${complaint.data.id}/ai-process`,{method:'POST',token:staff});
 check(complaint.status===201&&complaintProcessed.data.lane==='GM_ESCALATION','complaints escalate to GM after deferred processing');
 const complaintRoute=await request(`/staff/enquiries/${complaint.data.id}/routing`,{method:'PATCH',token:staff,body:{category:'ROOM_BOOKING'}});
 check(complaintRoute.status===200&&complaintRoute.data.routing_lane==='GM_ESCALATION','manual re-route cannot silently suppress an escalated complaint');
 const complaintProposal=await request(`/staff/enquiries/${complaint.data.id}/event-proposal`,{method:'POST',token:staff,
  body:eventData('2027-05-10','2027-05-10','2027-05-12','Complaint should never silently become an event',2,10)});
 check(complaintProposal.status===409,'GM-escalated complaint cannot silently become a wedding proposal');
 // M4: Staff data APIs and explicit enquiry -> event handoff for the Lovable workbench.
 // M5: staff calendar is read-only, bounded, and rejects public/guest access.
 const cal=await request('/staff/resources/calendar?start=2027-02-13&end=2027-02-15',{token:staff});
 check(cal.status===200 && cal.data.days.length===3 && cal.data.days.every(x=>Array.isArray(x.resources)),'staff calendar shows daily resource readiness');
 const privateCal=await request('/staff/resources/calendar?start=2027-02-13&end=2027-02-15',{token:guest});
 check(privateCal.status===403,'guest cannot inspect staff resource calendar');
 const invalidCal=await request('/staff/resources/calendar?start=2027-02-01&end=2027-04-01',{token:staff});
 check(invalidCal.status===400,'staff resource calendar rejects ranges over 31 days');
 const overview=await request('/staff/overview?date=2027-02-14',{token:staff});
 check(overview.status===200&&overview.data.date==='2027-02-14'&&typeof overview.data.counts.proposed_events==='number','staff overview exposes aggregate operational counts');
 const overviewDenied=await request('/staff/overview?date=2027-02-14',{token:guest});
 check(overviewDenied.status===403,'guest cannot access staff operational overview');
 const eventList=await request('/staff/events?status=PROPOSED&limit=2&offset=0',{token:staff});
 check(eventList.status===200&&Array.isArray(eventList.data.items)&&eventList.data.items.length<=2&&Number.isInteger(eventList.data.total),'staff event list is paginated');
 const badList=await request('/staff/events?status=INVALID',{token:staff});
 check(badList.status===400,'staff event filters reject invalid statuses');
 const seededEnquiries=await request('/staff/enquiries?category=WEDDING',{token:staff});
 const originalWedding=seededEnquiries.data.find(x=>x.public_ref==='ENQ-4410');
 assert.ok(originalWedding,'Seeded wedding enquiry ENQ-4410 required for M4 handoff');
 const proposed=await request(`/staff/enquiries/${originalWedding.id}/event-proposal`,{method:'POST',token:staff,
  body:eventData('2027-04-20','2027-04-20','2027-04-22','Staff-reviewed April wedding',2,10)});
 check(proposed.status===201&&proposed.data.requiresApproval===true&&proposed.data.reserved===false&&proposed.data.event.enquiry_id===originalWedding.id,'staff explicitly creates a linked proposal without reserving resources');
 const duplicateProposal=await request(`/staff/enquiries/${originalWedding.id}/event-proposal`,{method:'POST',token:staff,
  body:eventData('2027-04-20','2027-04-20','2027-04-22','Duplicate should fail',2,10)});
 check(duplicateProposal.status===409,'one enquiry cannot create two event proposals');
 const proposals=await request('/staff/events?status=PROPOSED&limit=100',{token:staff});
 check(proposals.status===200&&proposals.data.items.some(x=>x.enquiry_ref==='ENQ-4410'&&x.id===proposed.data.event.id),'event list shows linked enquiry reference');
 const linkedBundle=await request(`/staff/events/${proposed.data.event.id}/bundle`,{token:staff});
 check(linkedBundle.status===200&&linkedBundle.data.bundle===null,'creating a staff proposal does not reserve resources');
 const denied=await request('/staff/events',{method:'POST',token:guest,body:eventData('2027-09-15','2027-09-15','2027-09-17','Must Fail')});
 check(denied.status===403,'guest cannot create staff event');
 const rt=await request('/room-types');assert.equal(rt.status,200);const estate=rt.data.find(x=>x.code==='ESTATE');assert.ok(estate);
 const roomDetail=await request(`/room-types/${estate.id}`);
 check(roomDetail.status===200&&roomDetail.data.id===estate.id&&roomDetail.data.code==='ESTATE'&&
   Number.isInteger(roomDetail.data.total_units),'public room detail returns the selected accommodation');
 check(Number.isInteger(roomDetail.data.starting_rate_paise)&&roomDetail.data.starting_rate_paise>0,
  'Lovable accommodation starting rate comes from PostgreSQL daily rate');
 const promoList=await request('/staff/promo-codes',{token:staff});
 check(promoList.status===200&&Array.isArray(promoList.data)&&promoList.data.every(p=>typeof p.active==='boolean'),
  'staff promo manager reads real active promo records');
 const guestPromo=await request('/staff/promo-codes',{token:guest});
 check(guestPromo.status===403,'guest cannot access private promo management');
 const invalidRoomDetail=await request('/room-types/not-a-uuid');
 check(invalidRoomDetail.status===400,'room detail rejects malformed identifiers');
 const missingRoomDetail=await request('/room-types/00000000-0000-0000-0000-000000000000');
 check(missingRoomDetail.status===404,'room detail returns 404 for missing accommodation');
 // The shared physical estate inventory is 64 rooms, but website allotment is only one.
 for(const day of ['2027-08-11','2027-08-12']){
  const r=await request(`/staff/inventory/${estate.id}/days/${day}`,{method:'PUT',token:staff,body:{websiteAllotment:1,blackedOut:false}});assert.equal(r.status,200,JSON.stringify(r.data));
 }
 const search=await request('/availability?checkIn=2027-08-11&checkOut=2027-08-13&roomTypeId='+estate.id);
 if (search.status!==200 || search.data?.[0]?.availableUnits!==1) {
  // Targeted diagnostics make a stale/incorrect seed distinguishable from an API bug.
  const nights=await pool.query(`SELECT i.stay_date::text AS date,i.website_allotment,i.blacked_out,
    (SELECT count(*)::int FROM room_nights n JOIN room_units u ON u.id=n.room_unit_id
      WHERE u.room_type_id=i.room_type_id AND n.stay_date=i.stay_date) AS physical_used,
    (SELECT count(*)::int FROM room_nights n JOIN room_units u ON u.id=n.room_unit_id
      WHERE u.room_type_id=i.room_type_id AND n.stay_date=i.stay_date AND n.origin='DIRECT') AS direct_used
    FROM inventory_days i WHERE i.room_type_id=$1 AND i.stay_date IN ('2027-08-11','2027-08-12') ORDER BY i.stay_date`,[estate.id]);
  const units=await pool.query(`SELECT count(*)::int AS physical_units FROM room_units WHERE room_type_id=$1 AND active=true`,[estate.id]);
  console.error('E2E availability diagnostic:',JSON.stringify({status:search.status,body:search.data,roomTypeId:estate.id,activeRoomUnits:units.rows[0]?.physical_units,nights:nights.rows},null,2));
 }
 check(search.status===200&&search.data?.[0]?.availableUnits===1,'website availability capped to allotment despite unused physical rooms');
 const holdBody={roomTypeId:estate.id,checkIn:'2027-08-11',checkOut:'2027-08-13',guests:2};
 const [h1,h2]=await Promise.all([
  request('/booking-holds',{method:'POST',token:guest,body:holdBody,key:'e2e-hold-one-2027'}),
  request('/booking-holds',{method:'POST',token:guest,body:holdBody,key:'e2e-hold-two-2027'})
 ]);
 check([h1,h2].filter(x=>x.status===201).length===1&&[h1,h2].filter(x=>x.status===409).length===1,'concurrent requests cannot oversell last website unit');
 const successfulHold=[h1,h2].find(x=>x.status===201);
 const successfulKey=successfulHold===h1?'e2e-hold-one-2027':'e2e-hold-two-2027';
 const identicalRetry=await request('/booking-holds',{method:'POST',token:guest,body:holdBody,key:successfulKey});
 if(identicalRetry.status!==201 || identicalRetry.data?.replayed!==true || identicalRetry.data?.id!==successfulHold.data.id) {
  console.error('Idempotent hold replay diagnostic:',JSON.stringify({firstStatus:successfulHold.status,
   firstHoldId:successfulHold.data?.id,firstCheckIn:successfulHold.data?.check_in,
   retryStatus:identicalRetry.status,retryBody:identicalRetry.data},null,2));
 }
 check(identicalRetry.status===201&&identicalRetry.data?.replayed===true&&identicalRetry.data?.id===successfulHold.data.id
  &&identicalRetry.data?.check_in===holdBody.checkIn&&identicalRetry.data?.check_out===holdBody.checkOut,
  'identical hold key replays the active hold with correct date-only fields');
 const changedRetry=await request('/booking-holds',{method:'POST',token:guest,
  body:{...holdBody,checkOut:'2027-08-14'},key:successfulKey});
 check(changedRetry.status===409,'reused hold key with changed dates is rejected');
 // M5: checkout can resume safely without exposing another user's hold.
 const statusBefore=await request(`/booking-holds/${successfulHold.data.id}`,{token:guest});
 check(statusBefore.status===200 && statusBefore.data?.status==='ACTIVE' && statusBefore.data?.checkIn==='2027-08-11' && statusBefore.data.remainingSeconds>0,
   'hold status supports checkout countdown with exact dates');
 const intruder=await login('gm@estateflow.local','DemoManager!2026');
 const ownerOnly=await request(`/booking-holds/${successfulHold.data.id}`,{token:intruder});
 check(ownerOnly.status===404,'other user cannot read booking hold even with staff role');
 const noAuth=await request(`/booking-holds/${successfulHold.data.id}`);
 check(noAuth.status===401,'unauthenticated hold access rejected');
 const hold=[h1,h2].find(x=>x.status===201).data;
 const payment=await request('/payments/mock/confirm',{method:'POST',token:guest,body:{holdId:hold.id,outcome:'SUCCESS'},key:'e2e-payment-once-2027'});
 check(payment.status===201&&payment.data?.status==='CONFIRMED','mock payment confirms hold');
 const bookingRef=await request(`/bookings/reference/${payment.data.reference}`,{token:guest});
 check(bookingRef.status===200&&bookingRef.data.id===payment.data.bookingId&&bookingRef.data.check_in==='2027-08-11',
  'Lovable booking confirmation can load real booking reference and stay dates');
 const wrongGuestRef=await request(`/bookings/reference/${payment.data.reference}`,{token:intruder});
 check(wrongGuestRef.status===404,'another account cannot look up a booking by reference');
 const statusAfter=await request(`/booking-holds/${successfulHold.data.id}`,{token:guest});
 check(statusAfter.status===200 && statusAfter.data?.status==='CONFIRMED' && statusAfter.data.remainingSeconds===0,
   'hold status changes to confirmed after successful mock payment');
 const replay=await request('/payments/mock/confirm',{method:'POST',token:guest,body:{holdId:hold.id,outcome:'SUCCESS'},key:'e2e-payment-once-2027'});
 check(replay.status===201&&replay.data?.replayed===true,'idempotent payment retry returns same booking');
 const wrongKey=await request('/payments/mock/confirm',{method:'POST',token:guest,body:{holdId:'00000000-0000-0000-0000-000000000000',outcome:'SUCCESS'},key:'e2e-payment-once-2027'});
 check(wrongKey.status===409,'idempotency key cannot be reused for another booking');
 const after=await request('/availability?checkIn=2027-08-11&checkOut=2027-08-13&roomTypeId='+estate.id);
 check(after.status===200&&after.data[0]?.availableUnits===0,'confirmed stay no longer offered on website');
 // M11: cancellation is an explicit authenticated action, never an AI tool action.
 const bookingId=payment.data.bookingId;
 // GM can manage reservations, so validate ownership using a second guest instead.
 const another=await request('/auth/register',{method:'POST',body:{email:'e2e-other-guest@estateflow.local',password:'LongTestPassword!2026',displayName:'Second Guest'}});
 check(another.status===201,'second independent guest created for cancellation ownership test');
 const anotherToken=await login('e2e-other-guest@estateflow.local','LongTestPassword!2026');
 const deniedCancel=await request(`/bookings/${bookingId}/cancel`,{method:'POST',token:anotherToken,body:{reasonCode:'GUEST_REQUEST'}});
 check(deniedCancel.status===403,'other guest cannot cancel a booking they do not own');
 const unauthCancel=await request(`/bookings/${bookingId}/cancel`,{method:'POST',body:{reasonCode:'GUEST_REQUEST'}});
 check(unauthCancel.status===401,'unauthenticated cancellation is rejected');
 const badReasonCancel=await request(`/bookings/${bookingId}/cancel`,{method:'POST',token:guest,body:{reasonCode:'INVALID'}});
 check(badReasonCancel.status===400,'invalid cancellation reason is rejected');
 const canceled=await request(`/bookings/${bookingId}/cancel`,{method:'POST',token:guest,body:{reasonCode:'GUEST_REQUEST'}});
 check(canceled.status===201 && canceled.data?.status==='CANCELLED' && canceled.data?.roomNightsReleased===2 && canceled.data?.refundStatus==='NOT_PROCESSED',
   'booking cancellation releases both nights but never claims a real refund');
 const canceledBooking=await request(`/bookings/${bookingId}`,{token:guest});
 check(canceledBooking.status===200 && canceledBooking.data?.status==='CANCELLED','booking details reflect cancelled state');
 const canceledHold=await request(`/booking-holds/${hold.id}`,{token:guest});
 check(canceledHold.status===200 && canceledHold.data?.status==='CANCELLED','cancelled hold no longer appears confirmed');
 const releasedAvailability=await request('/availability?checkIn=2027-08-11&checkOut=2027-08-13&roomTypeId='+estate.id);
 check(releasedAvailability.status===200 && releasedAvailability.data[0]?.availableUnits===1,'cancelled room becomes available within website allotment');
 const replayCancel=await request(`/bookings/${bookingId}/cancel`,{method:'POST',token:guest,body:{reasonCode:'OTHER'}});
 check(replayCancel.status===201 && replayCancel.data?.replayed===true && replayCancel.data?.roomNightsReleased===0,
   'repeated cancellation never releases inventory again');
 const paymentAfterCancel=await request('/payments/mock/confirm',{method:'POST',token:guest,body:{holdId:hold.id,outcome:'SUCCESS'},key:'e2e-payment-once-2027'});
 check(paymentAfterCancel.status===201&&paymentAfterCancel.data?.status==='CANCELLED','payment retry cannot resurrect a cancelled booking');
 const cancelAudit=await pool.query(`SELECT count(*)::int AS n FROM audit_logs WHERE action='BOOKING_CANCELLED' AND entity_id=$1`,[bookingId]);
 check(cancelAudit.rows[0].n===1,'cancellation has exactly one audit trail record');

 // The seeded Valentine wedding has a 12-space parking shortage on 14 February.
 const posted=await request('/staff/events',{method:'POST',token:staff,body:eventData('2027-02-14','2027-02-13','2027-02-15','E2E Wedding Parking Shortage')});assert.equal(posted.status,201,JSON.stringify(posted.data));
 const eventId=posted.data.id;
 const evaluation=await request(`/staff/events/${eventId}/evaluations`,{method:'POST',token:staff});
 check(evaluation.status===201&&evaluation.data.status==='NOT_FEASIBLE'&&evaluation.data.blockers.some(x=>x.resource==='PARKING'&&x.deficit===12),'parking bottleneck quantified as 12 spaces');
 const blocked=await request(`/staff/events/${eventId}/reserve`,{method:'POST',token:staff});
 check(blocked.status===403,'legacy direct reservation is denied without GM review');
 const blockedRequest=await request(`/staff/event-approvals/${eventId}/request`,{method:'POST',token:staff});
 check(blockedRequest.status===409,'infeasible event cannot be sent for GM approval');
 const alternatives=await request(`/staff/events/${eventId}/alternatives`,{token:staff});
 check(alternatives.status===200&&alternatives.data.candidates.length>0,'engine finds verified nearby alternatives');
 const selectedDate=alternatives.data.candidates[0].eventDate;
 const selection=await request(`/staff/events/${eventId}/alternatives/select`,{method:'POST',token:staff,body:{eventDate:selectedDate}});
 check(selection.status===201&&selection.data.status==='PROPOSED'&&selection.data.requiresApproval===true,'alternative selection is proposed but not reserved');
 const preBundle=await request(`/staff/events/${eventId}/bundle`,{token:staff});
 check(preBundle.status===200&&preBundle.data.bundle===null,'selecting alternative has no allocation side effects');
 const submitted=await request(`/staff/event-approvals/${eventId}/request`,{method:'POST',token:staff});
 check(submitted.status===201&&submitted.data.status==='PENDING_GM','staff requests GM authorization without reservation');
 const pendingBundle=await request(`/staff/events/${eventId}/bundle`,{token:staff});
 check(pendingBundle.data.bundle===null,'no inventory committed while waiting for GM');
 const approval=await request(`/gm/event-approvals/${eventId}/decision`,{method:'POST',token:gm,body:{approve:true}});
 check(approval.status===201&&approval.data.status==='GM_APPROVED'&&approval.data.reserved===true,'GM approval atomically revalidates and commits resources');
 const bundle=await request(`/staff/events/${eventId}/bundle`,{token:staff});
 check(bundle.status===200&&bundle.data.roomUnits.length===35&&bundle.data.resources.length===4&&bundle.data.roomUnits.every(x=>x.nights===2),'committed bundle contains 35 rooms x 2 nights and 4 service allocations');
 const resourceList=await request(`/staff/resources?date=${selectedDate}`,{token:staff});
 const parkingSlot=resourceList.data.find(x=>x.code==='PARKING');
 assert.ok(parkingSlot,'Parking slot missing from seeded resources');
 const invalidCapacity=await request(`/staff/resources/${parkingSlot.slot_id}/capacity`,{method:'PATCH',token:staff,body:{capacity:50,blocked:false}});
 check(invalidCapacity.status===409,'staff cannot shrink resource capacity below committed event allocations');
 const approvalAgain=await request(`/gm/event-approvals/${eventId}/decision`,{method:'POST',token:gm,body:{approve:true}});
 check(approvalAgain.status===409,'GM cannot approve the same event twice');
 const noDuplicate=await pool.query('SELECT count(*)::int AS n FROM reservation_bundles WHERE event_id=$1',[eventId]);
 check(noDuplicate.rows[0].n===1,'one event creates one committed bundle');
 // Two separate weddings for exactly the same lawn/day must not both commit.
 const e1=await request('/staff/events',{method:'POST',token:staff,body:eventData('2027-09-12','2027-09-12','2027-09-14','Concurrent Wedding A',2,10)});
 const e2=await request('/staff/events',{method:'POST',token:staff,body:eventData('2027-09-12','2027-09-12','2027-09-14','Concurrent Wedding B',2,10)});
 assert.equal(e1.status,201);assert.equal(e2.status,201);
 const reqA=await request(`/staff/event-approvals/${e1.data.id}/request`,{method:'POST',token:staff});
 const reqB=await request(`/staff/event-approvals/${e2.data.id}/request`,{method:'POST',token:staff});
 check(reqA.status===201&&reqB.status===201,'both feasible proposals may await review without inventory claims');
 const [a,b]=await Promise.all([
  request(`/gm/event-approvals/${e1.data.id}/decision`,{method:'POST',token:gm,body:{approve:true}}),
  request(`/gm/event-approvals/${e2.data.id}/decision`,{method:'POST',token:gm,body:{approve:true}})
 ]);
 check([a,b].filter(x=>x.status===201).length===1&&[a,b].filter(x=>x.status===409).length===1,'concurrent GM approvals cannot claim the same venue and date');
 const singleLawn=await pool.query(`SELECT count(*)::int AS n FROM exclusive_venue_claims WHERE venue_code='LAWN' AND event_date='2027-09-12'`);
 check(singleLawn.rows[0].n===1,'unique database venue-date claim prevents even a mistaken capacity increase');
 const auth=await request(`/staff/events/${e1.data.id}/reserve`,{method:'POST',token:guest});
 check(auth.status===403,'guest cannot approve event resources');
 const over=await pool.query(`SELECT count(*)::int AS n FROM (SELECT s.id FROM resource_slots s JOIN resource_allocations a ON a.slot_id=s.id GROUP BY s.id,s.capacity HAVING SUM(a.quantity)>s.capacity) x`);
 check(over.rows[0].n===0,'database invariant: no resource slot is over capacity');
 const dups=await pool.query(`SELECT count(*)::int AS n FROM (SELECT room_unit_id,stay_date,count(*) FROM room_nights GROUP BY 1,2 HAVING count(*)>1) x`);
 check(dups.rows[0].n===0,'database invariant: no physical room double booking');
 // M6 security: responses use safe headers and authenticated data is not cached.
 check(h.headers.get('x-content-type-options')==='nosniff' && h.headers.get('x-frame-options')==='DENY',
  'API emits anti-sniffing and frame protection headers');
 const privateResponse=await request('/auth/me',{token:staff});
 check(privateResponse.status===200 && privateResponse.headers.get('cache-control')==='no-store',
  'authenticated API responses are never publicly cached');
 // A signed token must not grant a stale STAFF/GM role after account changes in DB.
 await pool.query("UPDATE users SET role='STAFF' WHERE email='guest@estateflow.local'");
 const staleRole=await request('/staff/overview?date=2027-02-14',{token:guest});
 check(staleRole.status===401,'old guest token is revoked when database role changes');
 const promotedToken=await login('guest@estateflow.local','DemoGuest!2026');
 const promoted=await request('/staff/overview?date=2027-02-14',{token:promotedToken});
 check(promoted.status===200,'new token reflects current authorized database role');
 await pool.query("UPDATE users SET role='GUEST' WHERE email='guest@estateflow.local'");
 const restoredRole=await request('/staff/overview?date=2027-02-14',{token:promotedToken});
 check(restoredRole.status===401,'previous STAFF token rejected after role demotion');
 // Invalid password attempts must be throttled without leaking credential details.
 let throttled=null;
 for(let i=0;i<16;i++) {
  const r=await request('/auth/login',{method:'POST',body:{email:'staff@estateflow.local',password:'wrong-password'}});
  if(r.status===429){throttled=r;break;}
  assert.equal(r.status,401,'Invalid login must fail authentication before rate limit');
 }
 check(throttled?.status===429 && Number(throttled.headers.get('retry-after'))>=1,
  'repeated authentication failures produce 429 and Retry-After');
 console.log(`\nALL ${checks} MILESTONE-11 CHECKS PASSED`);
}catch(e){console.error('E2E FAILURE:',e);process.exitCode=1;}finally{await pool.end();}
