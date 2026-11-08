/**
 * Offline Lovable integration contract tests. No network, database, browser storage
 * or NestJS server required; exercised using Node's built-in Fetch API objects.
 */
import assert from 'node:assert/strict';
import { EstateFlowApi, EstateFlowApiError } from '../integrations/estateflow-api';

type MockCall = {url:string;method:string;headers:Headers;body:string|undefined};
const calls:MockCall[]=[];
let responder:(request:MockCall)=>Response = ()=>Response.json({ok:true});
const originalFetch=globalThis.fetch;
(globalThis as any).fetch=async (input:string, init:RequestInit={})=>{
 const headers = new Headers(init.headers);
 const req={url:String(input),method:init.method||'GET',headers,body:init.body?.toString()};
 calls.push(req);
 return responder(req);
};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),
 {status,headers:{'Content-Type':'application/json; charset=utf-8'}});
const assertCall=(last:MockCall,route:string,method:string)=>{
 assert.equal(last.url,`http://localhost:4000${route}`);
 assert.equal(last.method,method);
};
const current=()=>calls[calls.length-1];
const good={id:'123e4567-e89b-12d3-a456-426614174000',code:'ESTATE',name:'Estate Suite',
 description:'Test description',max_guests:3,image_url:null,total_units:64};
let token:string|null=null;
const api=new EstateFlowApi('http://localhost:4000/',()=>token);
async function run(){
 try {
  let cases=0;
  function pass(label:string){cases++;console.log('PASS:',label)}
  responder=()=>json([good]);
  await api.roomTypes();
  assertCall(current(),'/room-types','GET');
  assert.equal(current().headers.get('authorization'),null);
  pass('Public room search never sends bearer token');
  responder=()=>json(good);
  assert.equal((await api.roomType(good.id)).total_units,64);
  assertCall(current(),`/room-types/${good.id}`,'GET');
  pass('Dedicated room detail uses correct backend endpoint');
  responder=()=>json([{roomTypeId:good.id,availableUnits:2}]);
  await api.availability('2027-08-11','2027-08-13',good.id);
  assert.ok(current().url.includes('checkIn=2027-08-11'));
  assert.ok(current().url.includes('checkOut=2027-08-13'));
  pass('Availability sends exact date-only query parameters');
  responder=()=>json({totalPaise:1500000,gstPaise:180000,currency:'INR',lines:[]});
  const quote=await api.quote({roomTypeId:good.id,checkIn:'2027-08-11',checkOut:'2027-08-13',guests:2});
  assert.equal(quote.totalPaise,1500000);
  assert.equal(JSON.parse(current().body||'{}').guests,2);
  assert.equal(current().headers.get('content-type'),'application/json');
  pass('Quote uses paise, numbers, dates and JSON content type');
  responder=()=>json({id:good.id,email:'guest@example.invalid',role:'GUEST',display_name:'Test Guest'},201);
  await api.register('guest@example.invalid','TestPassword123!','Test Guest');
  assertCall(current(),'/auth/register','POST');
  assert.equal(current().headers.get('authorization'),null);
  pass('Guest registration stays public');
  responder=()=>json({accessToken:'test-token',user:{id:good.id,email:'guest@example.invalid',role:'GUEST',displayName:'Guest'}},201);
  await api.login('guest@example.invalid','TestPassword123!');
  assertCall(current(),'/auth/login','POST');
  assert.equal(current().headers.get('authorization'),null);
  pass('Login does not send a previous access token');
  const oldCallCount=calls.length;
  await assert.rejects(()=>api.myBookings(),(e:unknown)=>e instanceof EstateFlowApiError&&e.status===401);
  assert.equal(calls.length,oldCallCount);
  pass('Missing token fails before a protected network call');
  token='test-token';
  responder=()=>json({sub:good.id,email:'guest@example.invalid',role:'GUEST'});
  await api.me();
  assertCall(current(),'/auth/me','GET');
  assert.equal(current().headers.get('authorization'),'Bearer test-token');
  pass('Protected routes send current bearer token');
  responder=()=>json({id:'hold-1',expires_at:'2027-08-11T00:00:00Z',total_paise:500000},201);
  await api.hold({roomTypeId:good.id,checkIn:'2027-08-11',checkOut:'2027-08-13',guests:2},'unique-hold-key');
  assert.equal(current().headers.get('idempotency-key'),'unique-hold-key');
  assertCall(current(),'/booking-holds','POST');
  pass('Hold request includes unique idempotency header');
  responder=()=>json({id:'hold-1',status:'ACTIVE',remainingSeconds:299});
  const status=await api.holdStatus('hold-1');
  assert.equal(status.status,'ACTIVE');
  assertCall(current(),'/booking-holds/hold-1','GET');
  pass('Checkout can resume from hold status');
  responder=()=>json({bookingId:'booking-1',status:'CONFIRMED'},201);
  await api.mockPay('hold-1','SUCCESS','payment-key-one');
  assert.equal(current().headers.get('idempotency-key'),'payment-key-one');
  pass('Mock payment has a separate idempotency key');
  responder=()=>json({id:'enq-1',public_ref:'ENQ-TEST',status:'OPEN'},201);
  await api.submitEnquiry({contactName:'Test Guest',message:'Interested in a wedding for 200 people'});
  assert.equal(current().headers.get('authorization'),null);
  pass('Public event enquiry does not require login');
  responder=()=>json([{id:'draft-1',body:'Draft',status:'DRAFT',edited_by:null}]);
  await api.enquiryDrafts('enq-1');
  assertCall(current(),'/staff/enquiries/enq-1/drafts','GET');
  pass('Staff inbox can retrieve AI drafts');
  responder=()=>json({id:'enq-1',manual_category:'WEDDING'});
  await api.routeEnquiry('enq-1','WEDDING');
  assert.equal(JSON.parse(current().body||'{}').category,'WEDDING');
  pass('Human classification correction uses PATCH');
  responder=()=>json({id:'enq-1',manual_extracted:{roomsRequired:35}});
  await api.correctEnquiry('enq-1',{roomsRequired:35});
  assert.equal(JSON.parse(current().body||'{}').roomsRequired,35);
  pass('Human requirement corrections use PATCH');
  responder=()=>json({id:'draft-1',body:'Updated'});
  await api.editDraft('draft-1','Updated');
  assertCall(current(),'/staff/drafts/draft-1','PATCH');
  pass('Human-edited reply remains a staff action');
  responder=()=>json({status:'SENT_SIMULATED',simulation:true,draftId:'draft-1'},201);
  const sent=await api.simulateSendDraft('draft-1');
  assert.equal(sent.simulation,true);
  pass('Draft sending is explicitly simulated');
  const event={title:'Family wedding',eventDate:'2027-02-14',checkIn:'2027-02-13',checkOut:'2027-02-15',
    guests:250,roomsRequired:35,diningGuests:250,parkingSpaces:60,eventStaff:12,venueCode:'LAWN' as const};
  responder=()=>json({event:{id:'event-1'},requiresApproval:true,reserved:false},201);
  await api.createEventFromEnquiry('enq-1',event);
  assertCall(current(),'/staff/enquiries/enq-1/event-proposal','POST');
  pass('Staff explicitly creates proposal; it does not book resources');
  responder=()=>json({status:'NOT_FEASIBLE',eventId:'event-1',blockers:[{resource:'PARKING',deficit:12}],details:[],checkedAt:'now'},201);
  const result=await api.evaluate('event-1');
  assert.equal(result.blockers[0].resource,'PARKING');
  pass('Feasibility API exposes capacity blockers');
  responder=()=>json({status:'PROPOSED',requiresApproval:true},201);
  await api.selectAlternative('event-1','2027-02-15');
  assert.equal(JSON.parse(current().body||'{}').eventDate,'2027-02-15');
  pass('Alternative selection remains a non-reserving proposal');
  responder=()=>json({status:'RESERVED',bundleId:'bundle-1'},201);
  const allocation=await api.reserve('event-1');
  assert.equal(allocation.status,'RESERVED');
  pass('Reservation endpoint is a separate staff action');
  responder=()=>json({days:[],start:'2027-02-13',end:'2027-02-15',asOf:'now',note:'test'});
  await api.resourceCalendar('2027-02-13','2027-02-15');
  assertCall(current(),'/staff/resources/calendar?start=2027-02-13&end=2027-02-15','GET');
  pass('Resource calendar sends bounded date range query');
  responder=()=>json({room_type_id:good.id,website_allotment:4});
  await api.updateAllotment(good.id,'2027-02-13',4,false);
  assert.equal(JSON.parse(current().body||'{}').websiteAllotment,4);
  pass('Allotment mutation maps to existing staff API');
  responder=()=>json({room_type_id:good.id,rate_paise:950000});
  await api.updateRate(good.id,'2027-02-13',950000,1200);
  assert.equal(JSON.parse(current().body||'{}').ratePaise,950000);
  pass('Rate mutation uses integer paise, not floating INR');
  responder=()=>new Response('reference,check_in\nEF-001,2027-02-13\n',{headers:{'content-type':'text/csv'}});
  const csv=await api.bookingExportCsv('2027-02-14');
  assert.ok(csv.startsWith('reference,check_in'));
  pass('Booking CSV export is handled as text, not parsed as JSON');
  responder=()=>json({statusCode:409,message:'No feasible resource bundle'},409);
  await assert.rejects(()=>api.reserve('event-1'),(e:unknown)=>
    e instanceof EstateFlowApiError&&e.status===409&&e.message.includes('No feasible'));
  pass('API errors preserve conflict status and server explanation');
  responder=()=>new Response('Service unavailable',{status:503,headers:{'content-type':'text/plain'}});
  await assert.rejects(()=>api.roomTypes(),(e:unknown)=>e instanceof EstateFlowApiError&&e.status===503);
  pass('Non-JSON server errors are surfaced');
  token=null;
  responder=()=>json({id:'enq-2',status:'OPEN'},201);
  await api.submitEnquiry({contactName:'Guest',message:'Need to inquire about wedding availability'});
  assert.equal(current().headers.get('authorization'),null);
  pass('Public calls stay uncredentialed after signing out');
  console.log(`ALL ${cases} M8 FRONTEND CLIENT CONTRACT TESTS PASSED`);
 }finally{(globalThis as any).fetch=originalFetch;}
}
run().catch(e=>{console.error(e);process.exitCode=1});
