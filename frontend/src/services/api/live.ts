import { reviewMissing } from "@/lib/estate/event-review";
import roomImg from "@/assets/room-plantation.jpg";
import villaImg from "@/assets/room-villa.jpg";
import type { Room, Quote, EventRequirements, Enquiry, FeasibilityResult, Alternative } from "@/lib/estate/types";
import type { EstateApi, Booking, BookingInput, DayRate, EventEnquiryInput, Promo } from "./types";
import { suggestCounts, type StaffAllocation, type AllocationStatus, type StaffCounts } from "@/lib/estate/staffing";
import { normalizeVenue, inferVenue, type VenuePreference } from "@/lib/estate/venue-utils";
import { ApiError, getToken, setToken, http, json, params, idempotency } from "./http";

// All amounts from NestJS are integer INR paise. UI presentation is INR rupees.
type RoomRow = { id: string; code: string; name: string; description: string; max_guests: number; total_units: number; image_url?: string | null; starting_rate_paise?: number | null };
type QuoteRow = { roomTypeId:string; checkIn:string;checkOut:string;guests:number; promoCode:string|null; subtotalPaise:number;discountPaise:number;gstPaise:number;totalPaise:number; lines:{date:string;basePaise:number;discountPaise:number;gstBasisPoints:number;gstPaise:number;totalPaise:number}[] };
type BookingRow = { id:string;reference:string;room_type_id:string;room_type:string;guests:number;check_in:string;check_out:string;total_paise:number;subtotal_paise?:number;discount_paise?:number;gst_paise?:number;promo_code?:string|null;guest_name?:string|null;account_name?:string|null;status:string;created_at?:string };
type EnquiryRow = {id:string; public_ref:string;source:string; contact_name:string;contact_email?:string; category:string;routing_lane:string;agent_confidence:number|null;created_at:string;status:string;assigned_to?:string|null;message:string;extracted?:Record<string,any>|null;form_payload?:Record<string,any>|null;manual_extracted?:Record<string,any>|null;draft_body?:string|null;draft_status?:"DRAFT"|"SENT_SIMULATED"|null;gm_review?:Enquiry["gmReview"]};
type EventRow = { id:string;enquiry_id?:string|null;title:string;status:string;event_date:string;check_in:string;check_out:string;guests:number;rooms_required:number;dining_guests:number;parking_spaces:number;event_staff:number;venue_code:string };
type Evaluation = {status:"FEASIBLE"|"NOT_FEASIBLE"|"NEEDS_REVIEW";details:{resource:string;required:number;available:number|null;status:string}[];blockers:{resource:string;reason:string;deficit?:number;needsReview?:boolean}[]};
const amount = (paise: number | undefined | null) => Number(paise ?? 0) / 100;
const isoNext = (iso:string,n:number) => {const d=new Date(`${iso}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const nights = (a:string,b:string) => Math.round((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000);
export function roomView(r:RoomRow):Room {const villa=r.code==="VILLA";const image=villa?villaImg:roomImg;return {id:r.id,name:r.name,category:villa?"Villa":"Room",maxGuests:r.max_guests,units:r.total_units,beds:"Confirm with reservations",sizeSqft:0,amenities:[],baseRate:amount(r.starting_rate_paise),image,gallery:[image],summary:r.description,description:r.description,ratePlans:[{id:"standard",name:"Standard website rate",description:"Rates and taxes are calculated by the resort backend for your selected dates. Mock payment only.",modifier:1,refundable:true}]};}
export function quoteView(q:QuoteRow):Quote {return {nights:q.lines.map(l=>({date:l.date,rate:amount(l.basePaise),gstRate:l.gstBasisPoints/10000,gst:amount(l.gstPaise)})),subtotal:amount(q.subtotalPaise),discount:amount(q.discountPaise),taxable:amount(q.subtotalPaise-q.discountPaise),gst:amount(q.gstPaise),total:amount(q.totalPaise),promoApplied:q.promoCode};}
const emptyQuote=(total:number):Quote=>({nights:[],subtotal:total,discount:0,taxable:total,gst:0,total,promoApplied:null});
export function bookingView(b:BookingRow):Booking {const total=amount(b.total_paise);return {id:b.id,status:b.status,reference:b.reference,roomId:b.room_type_id,roomName:b.room_type,checkIn:b.check_in,checkOut:b.check_out,guests:b.guests,guestName:b.guest_name||b.account_name||"Guest",quote:b.subtotal_paise===undefined?emptyQuote(total):{nights:[],subtotal:amount(b.subtotal_paise),discount:amount(b.discount_paise),taxable:amount(b.subtotal_paise)-amount(b.discount_paise),gst:amount(b.gst_paise),total,promoApplied:b.promo_code||null},createdAt:b.created_at||new Date().toISOString()};}
const categories:Record<string,Enquiry["category"]>={ROOM_BOOKING:"Room",WEDDING:"Wedding",CORPORATE_OFFSITE:"Offsite",OTHER_EVENT:"Other events",COMPLAINT:"Complaint",UNKNOWN:"Unsorted"};
const inverse:Record<Enquiry["category"],string>={Room:"ROOM_BOOKING",Wedding:"WEDDING",Offsite:"CORPORATE_OFFSITE","Other events":"OTHER_EVENT",Complaint:"COMPLAINT",Unsorted:"UNKNOWN"};
const eventFields=(e:EnquiryRow):EventRequirements|null=>{
 const x=e.extracted||{},f=e.form_payload||{},m=e.manual_extracted||{};
 const corrected=(name:string,fallback:unknown)=>Object.prototype.hasOwnProperty.call(m,name)?m[name]:fallback;
 // Celebration web forms remain visible for staff classification, even if the local
 // model could not confidently assign a wedding/offsite category. No auto approval.
 const celebrationEvidence=f.type==='Celebration'||f.type==='Other events'||/\b(birthday|anniversary|celebration|private party|reunion)\b/i.test(e.message);
 if(e.category==='COMPLAINT'||(!['WEDDING','CORPORATE_OFFSITE','OTHER_EVENT'].includes(e.category)&&!celebrationEvidence))return null;
 // Explicit human corrections win over structured web form data, which wins over uncertain AI extraction.
 const checkIn=corrected("exactCheckIn",f.startDate??x.exactCheckIn??null);
 const checkOut=corrected("exactCheckOut",f.endDate??x.exactCheckOut??null);
 const rooms=corrected("roomsRequired",f.rooms??x.roomsRequired??null);
 const guest=corrected("guestCount",f.guests??x.guestCount??null);
 const rawVenue=corrected('venuePreference',corrected('requestedVenue',f.venue??x.requestedVenue??null));
 const venuePreference:VenuePreference=rawVenue ? normalizeVenue(rawVenue) : inferVenue(e.message);
 const dining=corrected("diningGuests",(f.dining==='Not required'?0:f.dining?guest:null)??x.diningGuests??null);
 const parking=corrected("parkingSpaces",f.parking??x.parkingSpaces??null);
 const staff=corrected("eventStaff",x.eventStaff??null);
 const calculatedNights=checkIn&&checkOut ? nights(checkIn,checkOut) : null;
 const rawReviewedNights=corrected('nights',x.nights??null);
 const validNights=rooms===0 && rawReviewedNights===0 ? 0 : calculatedNights!==null&&calculatedNights>0 ? calculatedNights : (checkIn&&checkOut ? null : rawReviewedNights);
 const defaultEventType:NonNullable<EventRequirements['eventType']>=f.type==='Wedding'||f.type==='Corporate offsite'?f.type:f.type==='Celebration'||f.type==='Other events'?'Celebration':e.category==='WEDDING'?'Wedding':e.category==='CORPORATE_OFFSITE'?'Corporate offsite':e.category==='OTHER_EVENT'?'Celebration':celebrationEvidence?'Celebration':'Unspecified';
 const correctedEventType=corrected('eventType',defaultEventType);
 const eventType:NonNullable<EventRequirements['eventType']> = correctedEventType==='Wedding'||correctedEventType==='Corporate offsite'||correctedEventType==='Celebration'?correctedEventType:'Unspecified';
 const requirement:EventRequirements={startDate:checkIn,nights:validNights,guests:guest,rooms,needsLawn:venuePreference==='LAWN',venuePreference,eventType,diningCovers:dining,parking,eventStaff:staff};
 // Informational recommendation only: staff reviews role counts and approves before any booking.
 if(requirement.eventStaff===null && requirement.guests!==null) requirement.eventStaff=Object.values(suggestCounts(requirement)).reduce((a,b)=>a+b,0);
 return requirement;
};
export function enquiryView(e:EnquiryRow):Enquiry {return {id:e.id,from:e.contact_name,email:e.contact_email||"",phone:typeof e.form_payload?.phone==='string'?e.form_payload.phone:undefined,channel:e.source==='WEB'?"Web form":e.source==='WHATSAPP_SIM'?"WhatsApp":"Email",receivedAt:e.created_at,subject:e.public_ref,message:e.message,category:categories[e.category]||"Unsorted",confidence:Number(e.agent_confidence??0),priority:e.routing_lane==='GM_ESCALATION'?"High":"Normal",status:e.routing_lane==='GM_ESCALATION'?"Escalated":e.status==='APPROVED'?"Approved":e.status==='CLIENT_CONFIRMED'?"Client confirmed":e.status==='APPROVAL_PENDING'?"Pending GM":e.status==='OPEN'?"New":"In review",assignee:e.assigned_to||"Unassigned",requirements:eventFields(e),aiReviewNotes:Array.isArray(e.extracted?.semantic?.requiresConfirmation)?e.extracted.semantic.requiresConfirmation.filter((n:unknown):n is string=>typeof n==='string'):[],draftReply:e.draft_body||"",draftStatus:e.draft_status||"DRAFT",gmReview:e.gm_review??null};}
export function feasibilityView(v:Evaluation):FeasibilityResult {const keys:Record<string,"rooms"|"lawn"|"dining"|"parking"|"staff">={ROOMS:"rooms",LAWN:"lawn",VENUE_EXCLUSIVITY:"lawn",CONFERENCE_HALL:"lawn",PLANTATION_PAVILION:"lawn",DINING:"dining",PARKING:"parking",EVENT_STAFF:"staff"};return {verdict:v.status,resources:v.details.map(d=>({key:keys[d.resource],label:d.resource.replaceAll('_',' '),unit:d.resource==='ROOMS'?"rooms":d.resource==='PARKING'?"spaces":d.resource==='EVENT_STAFF'?"staff":d.resource==='LAWN'?"venue":"covers",required:d.required,available:d.available??0,ok:d.status==='PASS'})),bottlenecks:v.blockers.map(b=>`${b.reason}${b.deficit?` (short by ${b.deficit})`:''}`),missing:v.blockers.filter(b=>b.needsReview).map(b=>b.resource)};}
export const isSignedIn=()=>Boolean(getToken());
export async function currentUser(){return http<{sub:string;role:"GUEST"|"STAFF"|"GM";email:string}>("/auth/me",{auth:true});}
export async function registerGuest(input:{name:string;email:string;password:string}) {return http("/auth/register",{...json({displayName:input.name,email:input.email,password:input.password})});}
export async function loginAccount(email:string,password:string){const r=await http<{accessToken:string;user:{displayName:string;email:string;role:"GUEST"|"STAFF"|"GM"}}>("/auth/login",json({email,password}));setToken(r.accessToken);return r.user;}
export const logout=()=>setToken(null);
export async function liveQuote(roomTypeId:string,checkIn:string,checkOut:string,guests:number,promoCode:string|null=null){const r=await http<QuoteRow>("/quotes",json({roomTypeId,checkIn,checkOut,guests,promoCode}));return quoteView(r);}
export async function createHold(input:BookingInput){return http<{id:string;expires_at:string;total_paise:number}>("/booking-holds",{...json({roomTypeId:input.roomId,checkIn:input.checkIn,checkOut:input.checkOut,guests:input.guests,promoCode:input.promo}),headers:{'Idempotency-Key':idempotency()},auth:true});}
export async function holdStatus(id:string){return http<{id:string;status:string;remainingSeconds:number;totalPaise:number}>(`/booking-holds/${encodeURIComponent(id)}`,{auth:true});}
export async function confirmMockPayment(holdId:string,outcome:"success"|"declined"|"network",guest:BookingInput["guest"],paymentKey=idempotency()){if(outcome==='network')throw new ApiError(0,'Simulated network failure; your existing hold remains active.');return http<{bookingId:string;reference:string;status:string;simulation:boolean}>("/payments/mock/confirm",{...json({holdId,outcome:outcome==='declined'?"FAILURE":"SUCCESS",guestDetails:guest}),auth:true,headers:{'Idempotency-Key':paymentKey}});}
export async function cancelBooking(id:string,reasonCode="GUEST_REQUEST"){return http(`/bookings/${encodeURIComponent(id)}/cancel`,{...json({reasonCode}),auth:true});}
export type EligiblePromotion={code:string;discountPercent:number;roomTypeId:string|null};
export async function eligiblePromotions(roomTypeId:string,checkIn:string,checkOut:string){return http<EligiblePromotion[]>(`/promotions/eligible${params({roomTypeId,checkIn,checkOut})}`);}
export type BookingKind = 'all'|'room'|'villa'|'event';
export type BookingPreviewRow={reference:string;guest_name:string;booking_type:'Estate Room'|'Villa'|'Event';room_type:string;room_code:string;unit_code:string;check_in:string;check_out:string;guests:number;total_paise:number|null;status:string;created_at:string};
export type BookingPreview={date:string;mode:'stay'|'created';kind:BookingKind;rows:BookingPreviewRow[];total:number;rooms:number;villas:number;events:number};
export async function bookingPreview(date:string,mode:'stay'|'created'='stay',kind:BookingKind='all'){return http<BookingPreview>(`/staff/bookings/preview${params({date,mode,kind})}`,{auth:true});}
export async function bookingExport(date:string,mode:'stay'|'created'='created',kind:BookingKind='all'){return http<string>(`/staff/bookings/export${params({date,mode,kind})}`,{auth:true});}
export type ClientFollowup={id:string;channel:'email'|'phone'|'whatsapp';summary:string;contactedAt:string;staffName?:string};
export async function listClientFollowups(enquiryId:string){return http<ClientFollowup[]>(`/staff/enquiries/${encodeURIComponent(enquiryId)}/client-followups`,{auth:true});}
export async function recordClientFollowup(enquiryId:string,channel:ClientFollowup['channel'],summary:string){return http<ClientFollowup>(`/staff/enquiries/${encodeURIComponent(enquiryId)}/client-followups`,{...json({channel,summary,contacted:true}),auth:true});}
export async function escalateUnresolvedFeasibility(enquiryId:string,reason:string){return http<{id:string;status:string;routing_lane:string}>(`/staff/enquiries/${encodeURIComponent(enquiryId)}/escalate-unresolved`,{...json({reason}),auth:true});}
export async function listEnquiriesPaged(page:number,category:string|null=null,search='',focusId?:string,bookingStatus:'all'|'confirmed'='all',eventOnly=false){
 const raw=await http<{items:EnquiryRow[];total:number;page:number;pages:number;pageSize:number;confirmedCount:number}>(`/staff/enquiries/paged${params({page,category:category||undefined,search,focusId,bookingStatus:bookingStatus==='confirmed'?'confirmed':undefined,eventOnly:eventOnly?'true':undefined})}`,{auth:true});
 return {...raw,items:raw.items.map(enquiryView)};
}
export async function listEventProposals(){
 const items:EventRow[]=[];let total=0;
 for(let offset=0;offset<=10000;offset+=100){
  const page=await http<{items:EventRow[];total:number}>(`/staff/events${params({limit:100,offset})}`,{auth:true});
  total=page.total;items.push(...page.items);
  if(!page.items.length||items.length>=total)break;
 }
 return {items,total};
}
const asEventPayload=(enquiryId:string,r:EventRequirements,name:string)=>{
 const checks = reviewMissing(r);
 if(checks.length)throw new ApiError(400,`Complete review before feasibility: ${checks.join(', ')}`);
 if(!r.venuePreference||r.venuePreference==='UNCONFIRMED')throw new ApiError(400,'Choose and review a venue. Unconfigured venues will show NEEDS_REVIEW until capacity is verified.');
 return {title:`Enquiry ${enquiryId} — ${name}`,eventDate:r.startDate,checkIn:r.startDate,checkOut:isoNext(r.startDate,Math.max(1,r.nights!)),guests:r.guests,roomsRequired:r.rooms,diningGuests:r.diningCovers,parkingSpaces:r.parking,eventStaff:r.eventStaff,venueCode:r.venuePreference};
};
async function findOrCreateEvent(enquiryId:string,r:EventRequirements){const list=await listEventProposals();const found=list.items.find(e=>e.enquiry_id===enquiryId);if(found){if(found.status==='RESERVED')throw new ApiError(409,'Resources are already reserved for this enquiry.');const payload=asEventPayload(enquiryId,r,enquiryId);await http(`/staff/events/${found.id}/requirements`,{...json(payload,'PUT'),auth:true});return found.id;}
 const proposal=await http<{event:{id:string}}>(`/staff/enquiries/${enquiryId}/event-proposal`,{...json(asEventPayload(enquiryId,r,enquiryId)),auth:true});return proposal.event.id;}
export async function evaluateEnquiry(enquiryId:string,r:EventRequirements):Promise<{result:FeasibilityResult;alternatives:Alternative[]}> {
 const eventId=await findOrCreateEvent(enquiryId,r);
 const val=await http<Evaluation>(`/staff/events/${eventId}/evaluations`,{...json({}),auth:true});
 const alt=val.status==='NOT_FEASIBLE'?await http<{candidates:{eventDate:string;checkIn:string;checkOut:string}[]}>(`/staff/events/${eventId}/alternatives`,{auth:true}):{candidates:[]};
 const alternatives=alt.candidates.map(a=>({id:a.eventDate,startDate:a.checkIn,endDate:a.checkOut,changes:'Staff-verified alternative date; selection does not reserve anything',result:{verdict:'FEASIBLE' as const,resources:[],bottlenecks:[],missing:[]}}));
 return {result:feasibilityView(val),alternatives};
}
export async function selectEnquiryAlternative(enquiryId:string,day:string){const list=await listEventProposals();const event=list.items.find(e=>e.enquiry_id===enquiryId);if(!event)throw new ApiError(404,'Evaluate a proposal before selecting an alternative.');return http(`/staff/events/${event.id}/alternatives/select`,{...json({eventDate:day}),auth:true});}
export type EventReview = {event_id?:string;status?:'PENDING_GM'|'GM_APPROVED'|'GM_REJECTED'|'CLIENT_CONFIRMED';event_status?:string;title?:string;public_ref?:string;contact_email?:string;contact_name?:string;client_channel?:string;bundleId?:string;gm_note?:string};
export async function getEventReview(eventId:string){return http<EventReview>(`/staff/event-approvals/${eventId}`,{auth:true});}
export async function requestGmEventApproval(eventId:string){return http<{eventId:string;status:'PENDING_GM'}>(`/staff/event-approvals/${eventId}/request`,{...json({}),auth:true});}
export async function escalateEnquiryComplaint(enquiryId:string,reason:string){return http(`/staff/enquiries/${enquiryId}/escalate-complaint`,{...json({reason}),auth:true});}
export async function recordClientConfirmation(eventId:string,channel:'email'|'whatsapp'|'manual'){
 return http(`/staff/event-approvals/${eventId}/confirm-client`,{...json({channel,confirmedSent:true}),auth:true});
}
export type PendingEventApproval={event_id:string;title:string;public_ref:string;contact_name:string;event_date:string;guests:number;rooms_required:number;event_staff:number;status:string};
export async function listGmEventApprovals(){return http<PendingEventApproval[]>('/gm/event-approvals',{auth:true});}
export async function gmEventDecision(eventId:string,approve:boolean,note:string){return http(`/gm/event-approvals/${eventId}/decision`,{...json({approve,note}),auth:true});}
export async function reserveEnquiry(enquiryId:string){const list=await listEventProposals();const event=list.items.find(e=>e.enquiry_id===enquiryId);if(!event)throw new ApiError(400,'Evaluate this event first.');return http<{status:'RESERVED';bundleId:string}>(`/staff/events/${event.id}/reserve`,{...json({}),auth:true});}
export const liveApi:EstateApi = {
 async listRooms(){return (await http<RoomRow[]>("/room-types")).map(roomView);},
 async getRoom(id){try{return roomView(await http<RoomRow>(`/room-types/${encodeURIComponent(id)}`));}catch(e){if(e instanceof ApiError&&e.status===404)return null;throw e;}},
 async checkAvailability(roomId,checkIn,checkOut){const rows=await http<{roomTypeId:string;availableUnits:number}[]>(`/availability${params({roomTypeId:roomId,checkIn,checkOut})}`);const row=rows.find(r=>r.roomTypeId===roomId);return {roomId,available:Boolean(row&&row.availableUnits>0),soldOutNights:[]};},
 async createBooking(input,payment){if(!getToken())throw new ApiError(401,'Sign in or register to confirm a booking.');const hold=await createHold(input);const result=await confirmMockPayment(hold.id,payment,input.guest);if(result.status==='DECLINED')throw new ApiError(402,'Simulated payment declined.');return await liveApi.getBooking(result.reference) as Booking;},
 async getBooking(ref){try{return bookingView(await http<BookingRow>(`/bookings/reference/${encodeURIComponent(ref)}`,{auth:true}));}catch(e){if(e instanceof ApiError&&e.status===404)return null;throw e;}},
 async listBookings(){const q=await http<BookingRow[]>('/bookings',{auth:true});return q.map(bookingView);},
 async submitEventEnquiry(f:EventEnquiryInput){const message=`${f.type}${f.eventName?' ('+(f.eventName==='Other (specify)'?f.customEventName||'Other event':f.eventName)+')':''} enquiry. Event details: ${f.eventDescription||'Not provided'}. Dates: ${f.startDate} to ${f.endDate}. ${f.guests} guests, ${f.rooms} rooms, venue: ${f.venue}, dining: ${f.dining}, ${f.parking} parking spaces. Contact phone: ${f.phone||'not given'}. Additional requests: ${f.notes||'none'}.`;const result=await http<{public_ref:string}>('/enquiries',json({contactName:f.name,contactEmail:f.email,message,form:f}));return {reference:result.public_ref};},
 async signIn(email,password,role){const u=await loginAccount(email,password);const expected=role==='gm'?'GM':'STAFF';if(u.role!==expected){logout();throw new ApiError(403,'This account does not have the requested staff access.');}return {name:u.displayName,email:u.email,role:role??'staff'};},
 async listEnquiries(){const rows=await http<EnquiryRow[]>('/staff/enquiries',{auth:true});return rows.map(enquiryView);},
 async getEnquiry(id){try {const [row,drafts]=await Promise.all([http<EnquiryRow>(`/staff/enquiries/${id}`,{auth:true}),http<{body:string;status:"DRAFT"|"SENT_SIMULATED"}[]>(`/staff/enquiries/${id}/drafts`,{auth:true})]);return enquiryView({...row,draft_body:drafts[0]?.body||null,draft_status:drafts[0]?.status||"DRAFT"});}catch(e){if(e instanceof ApiError&&e.status===404)return null;throw e;}},
 async updateEnquiry(id,patch){if(patch.category)await http(`/staff/enquiries/${id}/routing`,{...json({category:inverse[patch.category]},'PATCH'),auth:true});if(patch.draftReply)await liveApi.saveDraftReply(id,patch.draftReply);if(patch.requirements) {const r=patch.requirements;const body={exactCheckIn:r.startDate,exactCheckOut:r.startDate&&r.nights!==null&&r.nights>0?isoNext(r.startDate,r.nights):null,nights:r.nights,guestCount:r.guests,roomsRequired:r.rooms,diningGuests:r.diningCovers,parkingSpaces:r.parking,eventStaff:r.eventStaff,requestedVenue:r.venuePreference==='LAWN'||r.needsLawn?'LAWN':r.venuePreference==='CONFERENCE_HALL'?'CONFERENCE_HALL':null,venuePreference:r.venuePreference??(r.needsLawn?'LAWN':'UNCONFIRMED'),eventType:r.eventType??'Unspecified'};await http(`/staff/enquiries/${id}/extraction`,{...json(body,'PATCH'),auth:true});}if(patch.assignee!==undefined||patch.status!==undefined)throw new ApiError(400,'This release has no staff assignment or status-transition API. Use explicit classification/review actions.');return await liveApi.getEnquiry(id) as Enquiry;},
 async saveDraftReply(id,body){const drafts=await http<{id:string;status:string}[]>(`/staff/enquiries/${id}/drafts`,{auth:true});const d=drafts.find(x=>x.status==='DRAFT');if(!d)throw new ApiError(409,'No editable draft exists. Use the AI review action first.');await http(`/staff/drafts/${d.id}`,{...json({body},'PATCH'),auth:true});return {savedAt:new Date().toISOString()};},
 async evaluateFeasibility(_r){throw new ApiError(400,'Feasibility requires a reviewed enquiry. Use evaluateEnquiry(enquiryId, requirements).');},
 async approveReservation(enquiryId,_req){try{
  const list=await listEventProposals();const event=list.items.find(e=>e.enquiry_id===enquiryId);
  if(!event)throw new ApiError(400,'Run the feasibility evaluation first.');
  await requestGmEventApproval(event.id);
  return {status:'pending',message:'Feasible resource proposal sent to the GM. No resources are reserved yet.'};
 }catch(e){if(e instanceof ApiError&&e.status===409)return {status:'conflict',message:e.message};throw e;}},
 // Inventory dates are the calendar's source of truth; an absent rate is NOT zero rupees.
 async listRates(from,days){
  const end=isoNext(from,days-1);
  const [rates,stock]=await Promise.all([
   http<{room_type_id:string;date:string;rate_paise:number;gst_basis_points:number}[]>(`/staff/rates${params({start:from,end})}`,{auth:true}),
   http<{room_type_id:string;date:string;website_allotment:number;blacked_out:boolean}[]>(`/staff/inventory${params({start:from,end})}`,{auth:true})
  ]);
  const byKey=new Map(rates.map(r=>[`${r.room_type_id}:${r.date}`,r]));
  return stock.map(i=>{
   const r=byKey.get(`${i.room_type_id}:${i.date}`);
   return {date:i.date,roomId:i.room_type_id,rate:r?amount(r.rate_paise):null,allotment:i.website_allotment,blackout:i.blacked_out,gstBasisPoints:r?.gst_basis_points};
  });
 },
 async saveRates(rates){
  for(const r of rates){
   if(!Number.isInteger(r.allotment)||r.allotment<0)throw new ApiError(400,'Allotment must be a nonnegative whole number.');
   if(r.rate===null){
    if(r.allotment>0)throw new ApiError(400,'Set a verified nightly rate before enabling website allotment.');
   }else{
    const paise=Math.round(r.rate*100);
    if(!Number.isFinite(r.rate)||r.rate<=0||!Number.isSafeInteger(paise)||Math.abs(r.rate*100-paise)>1e-6)throw new ApiError(400,'Enter a positive price with no more than two decimal places.');
    if(!Number.isInteger(r.gstBasisPoints)||Number(r.gstBasisPoints)<0||Number(r.gstBasisPoints)>10000)throw new ApiError(400,'Enter the verified GST percentage for this date.');
    await http(`/staff/rates/${r.roomId}/days/${r.date}`,{...json({ratePaise:paise,gstBasisPoints:r.gstBasisPoints},'PUT'),auth:true});
   }
   await http(`/staff/inventory/${r.roomId}/days/${r.date}`,{...json({websiteAllotment:r.allotment,blackedOut:r.blackout},'PUT'),auth:true});
  }
 },
 async listPromos(){const rows=await http<{code:string;discount_percent:number;active:boolean;room_type_id:string|null}[]>('/staff/promo-codes',{auth:true});return rows.map(p=>({code:p.code,discount:p.discount_percent,active:p.active,roomTypeId:p.room_type_id}));},
 async savePromos(promos){const existing=await liveApi.listPromos();for(const p of promos){const old=existing.find(x=>x.code===p.code);if(old){if(old.active!==p.active||old.discount!==p.discount||old.roomTypeId!==p.roomTypeId)await http(`/staff/promo-codes/${p.code}`,{...json({active:p.active,discountPercent:p.discount,roomTypeId:p.roomTypeId??null},'PATCH'),auth:true});}else{const today=new Date().toISOString().slice(0,10);await http('/staff/promo-codes',{...json({code:p.code,discountPercent:p.discount,validFrom:today,validTo:isoNext(today,365),maxUses:100,roomTypeId:p.roomTypeId??null}),auth:true});if(!p.active)await http(`/staff/promo-codes/${p.code}`,{...json({active:false},'PATCH'),auth:true});}}},
 async getAllocation(enquiryId){
  const r=await http<StaffAllocation & {draftOnly?:boolean}>(`/staff/allocations/${encodeURIComponent(enquiryId)}`,{auth:true});
  if(r.draftOnly){const e=await liveApi.getEnquiry(enquiryId);return {...r,counts:suggestCounts(e?.requirements??null)};}
  return r;
 },
 async listAllocations(){return http<StaffAllocation[]>('/staff/allocations',{auth:true});},
 async saveAllocation(enquiryId,counts,notes){return http<StaffAllocation>(`/staff/allocations/${encodeURIComponent(enquiryId)}`,{...json({counts,notes},'PUT'),auth:true});},
 async moveAllocation(enquiryId,to,by,gmNote){
  return http<StaffAllocation>(`/staff/allocations/${encodeURIComponent(enquiryId)}/transition`,{...json({status:to,gmNote,externalDeliveryConfirmed:to==='Sent to client'}),auth:true});
 },
};

/** A complaint review approves staff handling only. It does not authorize an event reservation. */
export type GmEscalation = {
 id:string;public_ref:string;contact_name:string;contact_email?:string|null;category:string;source:string;
 message:string;created_at:string;agent_flags?:{complaintReason?:string;operationsReason?:string;operationsEscalated?:boolean;complaintEscalated?:boolean;modelUncertain?:boolean;requiresClarification?:boolean;semanticRequiresConfirmation?:string[]}|null;
 manual_extracted?:Record<string,unknown>|null;extracted?:Record<string,unknown>|null;
 form_payload?:Record<string,unknown>|null;status:string;draft_body?:string|null;escalated_to?:string|null;latest_client_followup?:ClientFollowup|null;
};
export type GmRecentDecision = {id:string;enquiry_id:string;decision:'RESOLUTION_APPROVED'|'ACTION_REQUIRED';note:string;decided_at:string;staff_acknowledged_at:string|null;public_ref:string;contact_name:string;returned_to_staff:string|null};
export async function listGmEscalations(){return http<GmEscalation[]>('/staff/gm-escalations',{auth:true});}
export async function listRecentGmDecisions(){return http<GmRecentDecision[]>('/staff/gm-escalations/recent',{auth:true});}
export async function gmReviewEscalation(id:string,decision:'RESOLUTION_APPROVED'|'ACTION_REQUIRED',note:string){return http(`/staff/enquiries/${encodeURIComponent(id)}/gm-review`,{...json({decision,note}),auth:true});}
export async function acknowledgeGmDecision(enquiryId:string,decisionId:string){return http(`/staff/enquiries/${encodeURIComponent(enquiryId)}/gm-review/${encodeURIComponent(decisionId)}/acknowledge`,{...json({}),auth:true});}
/** Legacy alias: callers must supply a real GM decision and explanatory note. */
export async function gmReturnEnquiry(id:string,decision:'RESOLUTION_APPROVED'|'ACTION_REQUIRED',note:string){return gmReviewEscalation(id,decision,note);}

