/**
 * EstateFlow API client for the Lovable React frontend (Milestone 8).
 * Copy into your React src/lib/estateflow-api.ts. This file uses the Fetch API,
 * stores no tokens, and does not replace the NestJS/PostgreSQL backend.
 */
export type Role = 'GUEST' | 'STAFF' | 'GM';
export type EventStatus = 'PROPOSED' | 'RESERVED';
export type FeasibilityStatus = 'FEASIBLE' | 'NOT_FEASIBLE' | 'NEEDS_REVIEW';
export type EventRequest = {
  title: string;
  eventDate: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomsRequired: number;
  diningGuests: number;
  parkingSpaces: number;
  eventStaff: number;
  venueCode: 'LAWN';
};
export type EventListItem = {
  id: string;
  title: string;
  event_date: string;
  check_in: string;
  check_out: string;
  guests: number;
  rooms_required: number;
  status: EventStatus;
  enquiry_id: string | null;
  enquiry_ref: string | null;
};
export type ResourceCheck = {
  resource: string;
  required: number;
  available: number | null;
  status: 'PASS' | 'BLOCKED' | 'NEEDS_REVIEW';
};
export type FeasibilityResult = {
  status: FeasibilityStatus;
  eventId: string;
  details: ResourceCheck[];
  blockers: Array<{ resource: string; deficit?: number; reason: string; needsReview?: boolean }>;
  checkedAt: string;
};
export class EstateFlowApiError extends Error {
  constructor(public readonly status: number, public readonly details: unknown) {
    super(typeof details === 'object' && details && 'message' in details
      ? String((details as {message: unknown}).message)
      : `EstateFlow API request failed (${status})`);
    this.name = 'EstateFlowApiError';
  }
}
export class EstateFlowApi {
  constructor(
    private readonly baseUrl: string,
    private readonly getAccessToken: () => string | null = () => null
  ) {}

  private async request<T>(route: string, options: RequestInit = {}, requiresAuth = false): Promise<T> {
    const token = this.getAccessToken();
    if (requiresAuth && !token) throw new EstateFlowApiError(401, 'Sign in required');
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token && requiresAuth) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${route}`, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const result: unknown = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) throw new EstateFlowApiError(response.status, result);
    return result as T;
  }
  private encode(params: Record<string, string | number | undefined>): string {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) values.set(key, String(value));
    return values.toString();
  }
  // Guests — stay booking
  roomTypes() { return this.request<Array<{id: string; code: string; name: string; max_guests: number; image_url: string | null}>>('/room-types'); }
  roomType(id: string) {return this.request<{id:string;code:string;name:string;description:string|null;
    max_guests:number;image_url:string|null;total_units:number}>(`/room-types/${encodeURIComponent(id)}`);}
  availability(checkIn: string, checkOut: string, roomTypeId?: string) {
    return this.request<Array<{roomTypeId: string; code: string; name: string; availableUnits: number}>>(
      `/availability?${this.encode({checkIn,checkOut,roomTypeId})}`);
  }
  quote(body: {roomTypeId: string; checkIn: string; checkOut: string; guests: number; promoCode?: string}) {
    return this.request<{totalPaise: number; gstPaise: number; currency: 'INR'; lines: unknown[]}>(
      '/quotes', {method:'POST', body:JSON.stringify(body)});
  }
  login(email: string, password: string) {
    return this.request<{accessToken: string; user: {id: string;role: Role;email: string;displayName: string}}>(
      '/auth/login', {method:'POST',body:JSON.stringify({email,password})});
  }
  register(email:string, password:string, displayName:string) {
    return this.request<{id:string;email:string;role:'GUEST';display_name:string}>('/auth/register',
      {method:'POST',body:JSON.stringify({email,password,displayName})});
  }
  me() {return this.request<{sub:string;email:string;role:Role}>('/auth/me',{},true);}
  myBookings() {return this.request<Array<{id:string;reference:string;total_paise:number;status:string;
    check_in:string;check_out:string;room_type:string}>>('/bookings',{},true);}
  booking(id:string) {return this.request<Record<string,unknown>>(`/bookings/${encodeURIComponent(id)}`,{},true);}
  cancelBooking(id:string,reasonCode:'GUEST_REQUEST'|'DUPLICATE'|'STAFF_CORRECTION'|'OTHER'='GUEST_REQUEST') {
    return this.request<{bookingId:string;reference:string;status:'CANCELLED';replayed:boolean;roomNightsReleased:number;simulatedPayment:true;refundStatus:'NOT_PROCESSED'}>(
      `/bookings/${encodeURIComponent(id)}/cancel`,{method:'POST',body:JSON.stringify({reasonCode})},true);
  }
  hold(body: {roomTypeId: string; checkIn: string; checkOut: string; guests: number; promoCode?: string}, idempotencyKey: string) {
    return this.request<{id: string; expires_at: string; total_paise: number; replayed?: boolean}>(
      '/booking-holds', {method:'POST', headers:{'Idempotency-Key':idempotencyKey}, body:JSON.stringify(body)}, true);
  }
  holdStatus(id: string) {
    return this.request<{id:string;roomTypeId:string;checkIn:string;checkOut:string;guests:number;
      status:'ACTIVE'|'EXPIRED'|'CONFIRMED'|'CANCELLED';expiresAt:string;remainingSeconds:number;totalPaise:number;currency:'INR'}>(
      `/booking-holds/${encodeURIComponent(id)}`,{},true);
  }
  mockPay(holdId: string, outcome: 'SUCCESS' | 'FAILURE', idempotencyKey: string) {
    return this.request<{bookingId?: string; reference?: string; status: string; replayed?: boolean}>(
      '/payments/mock/confirm', {method:'POST', headers:{'Idempotency-Key':idempotencyKey}, body:JSON.stringify({holdId,outcome})}, true);
  }
  submitEnquiry(body: {contactName: string; contactEmail?: string; message: string}) {
    return this.request<{id: string; public_ref: string; status: string}>(
      '/enquiries', {method:'POST',body:JSON.stringify(body)});
  }
  // Staff workspace — no AI authority to reserve; this is an explicit staff action.
  overview(date?: string) {return this.request<{date: string; counts: Record<string,number>;asOf: string}>(
    `/staff/overview?${this.encode({date})}`,{},true);}
  events(status?: EventStatus, limit = 25, offset = 0) {
    return this.request<{items: EventListItem[];total: number;limit: number;offset: number}>(
      `/staff/events?${this.encode({status,limit,offset})}`,{},true);
  }
  enquiries(category?: string) {return this.request<Array<{id: string;public_ref: string;category: string;routing_lane: string}>>(
    `/staff/enquiries?${this.encode({category})}`,{},true);}
  enquiry(id:string) {return this.request<Record<string,unknown>>(
    `/staff/enquiries/${encodeURIComponent(id)}`,{},true);}
  enquiryDrafts(id:string) {return this.request<Array<{id:string;body:string;status:string;edited_by:string|null}>>(
    `/staff/enquiries/${encodeURIComponent(id)}/drafts`,{},true);}
  processEnquiry(id:string) {return this.request<Record<string,unknown>>(
    `/staff/enquiries/${encodeURIComponent(id)}/ai-process`,{method:'POST'},true);}
  routeEnquiry(id:string,category:'ROOM_BOOKING'|'WEDDING'|'CORPORATE_OFFSITE'|'COMPLAINT'|'UNKNOWN') {
    return this.request<Record<string,unknown>>(`/staff/enquiries/${encodeURIComponent(id)}/routing`,
      {method:'PATCH',body:JSON.stringify({category})},true);
  }
  correctEnquiry(id:string,patch:Record<string,unknown>) {return this.request<Record<string,unknown>>(
    `/staff/enquiries/${encodeURIComponent(id)}/extraction`,
    {method:'PATCH',body:JSON.stringify(patch)},true);}
  editDraft(draftId:string,body:string) {return this.request<Record<string,unknown>>(
    `/staff/drafts/${encodeURIComponent(draftId)}`,{method:'PATCH',body:JSON.stringify({body})},true);}
  simulateSendDraft(draftId:string) {return this.request<{status:'SENT_SIMULATED';simulation:true;draftId:string}>(
    `/staff/drafts/${encodeURIComponent(draftId)}/send-simulated`,{method:'POST'},true);}
  mockInboundEnquiry(body:{source:'EMAIL_SIM'|'WHATSAPP_SIM';contactName:string;contactEmail?:string;message:string}) {
    return this.request<Record<string,unknown>>('/staff/enquiries/mock-inbound',
      {method:'POST',body:JSON.stringify(body)},true);}
  createEventFromEnquiry(enquiryId: string, requirements: EventRequest) {
    return this.request<{event: EventListItem;reserved: false;requiresApproval: true}>(
      `/staff/enquiries/${encodeURIComponent(enquiryId)}/event-proposal`,
      {method:'POST',body:JSON.stringify(requirements)},true);
  }
  createEvent(spec:EventRequest) {return this.request<EventListItem>('/staff/events',
    {method:'POST',body:JSON.stringify(spec)},true);}
  event(eventId:string) {return this.request<EventListItem>(`/staff/events/${encodeURIComponent(eventId)}`,{},true);}
  updateEvent(eventId:string,spec:EventRequest) {return this.request<EventListItem>(
    `/staff/events/${encodeURIComponent(eventId)}/requirements`,
    {method:'PUT',body:JSON.stringify(spec)},true);}
  requirements(eventId: string) {return this.request<{eventId: string;nodes: unknown[];edges: unknown[]}>(
    `/staff/events/${encodeURIComponent(eventId)}/requirements`,{},true);}
  evaluate(eventId: string) {return this.request<FeasibilityResult>(
    `/staff/events/${encodeURIComponent(eventId)}/evaluations`,{method:'POST'},true);}
  alternatives(eventId: string) {return this.request<{candidates: Array<{eventDate: string;checkIn: string;checkOut: string;status: string}>}>(
    `/staff/events/${encodeURIComponent(eventId)}/alternatives`,{},true);}
  selectAlternative(eventId: string, eventDate: string) {return this.request<{status: 'PROPOSED';requiresApproval: true}>(
    `/staff/events/${encodeURIComponent(eventId)}/alternatives/select`,{method:'POST',body:JSON.stringify({eventDate})},true);}
  reserve(eventId: string) {return this.request<{status: 'RESERVED';bundleId: string;roomCount?: number}>(
    `/staff/events/${encodeURIComponent(eventId)}/reserve`,{method:'POST'},true);}
  bundle(eventId: string) {return this.request<{status: string;bundle: unknown;roomUnits?: unknown[];resources?: unknown[]}>(
    `/staff/events/${encodeURIComponent(eventId)}/bundle`,{},true);}
  inventory(start: string,end: string) {return this.request<unknown[]>(
    `/staff/inventory?${this.encode({start,end})}`,{},true);}
  resourceCalendar(start:string,end:string) {
    return this.request<{start:string;end:string;days:Array<{date:string;resources:Array<{
      code:string;name:string;slotId:string|null;slotName:string|null;
      capacity:number|null;reserved:number;available:number|null;blocked:boolean|null;
      status:'AVAILABLE'|'FULL'|'BLOCKED'|'NEEDS_REVIEW';
    }>}>;asOf:string;note:string}>(
      `/staff/resources/calendar?${this.encode({start,end})}`,{},true);
  }
  rates(start: string,end: string) {return this.request<unknown[]>(
    `/staff/rates?${this.encode({start,end})}`,{},true);}
  updateAllotment(roomTypeId:string,date:string,websiteAllotment:number,blackedOut:boolean) {
    return this.request<Record<string,unknown>>(
      `/staff/inventory/${encodeURIComponent(roomTypeId)}/days/${encodeURIComponent(date)}`,
      {method:'PUT',body:JSON.stringify({websiteAllotment,blackedOut})},true);
  }
  updateRate(roomTypeId:string,date:string,ratePaise:number,gstBasisPoints:number) {
    return this.request<Record<string,unknown>>(
      `/staff/rates/${encodeURIComponent(roomTypeId)}/days/${encodeURIComponent(date)}`,
      {method:'PUT',body:JSON.stringify({ratePaise,gstBasisPoints})},true);
  }
  promoCode(body:{code:string;validFrom:string;validTo:string;discountPercent:number;maxUses:number}) {
    return this.request<Record<string,unknown>>('/staff/promo-codes',
      {method:'POST',body:JSON.stringify(body)},true);
  }
  resources(date?:string) {return this.request<Array<{code:string;display_name:string;slot_id:string;
    capacity:number;blocked:boolean;reserved:number}>>(
    `/staff/resources?${this.encode({date})}`,{},true);}
  updateResourceCapacity(slotId:string,capacity:number,blocked:boolean) {
    return this.request<Record<string,unknown>>(`/staff/resources/${encodeURIComponent(slotId)}/capacity`,
      {method:'PATCH',body:JSON.stringify({capacity,blocked})},true);
  }
  bookingExportCsv(date:string) {return this.request<string>(
    `/staff/bookings/export?${this.encode({date})}`,{},true);}
}
