import { Injectable, Controller, Post, Get, Put, Body, Param, Query, UseGuards, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AuthGuard, StaffGuard, CurrentUser } from '../auth/auth';
import { stayDates, ensureDate, positiveInt, nonnegativeInt } from '../shared/validation';
import { cleanExpired } from '../shared/inventory';

const RESOURCE_MAP=[{code:'DINING',key:'dining_guests',label:'Dining guests'},{code:'PARKING',key:'parking_spaces',label:'Parking spaces'},{code:'EVENT_STAFF',key:'event_staff',label:'Event staff'}] as const;
const VENUES:Record<string,string>={LAWN:'Wedding lawn',CONFERENCE_HALL:'Conference / meeting hall',PLANTATION_PAVILION:'Plantation pavilion'};
const iso=(date:string,shift:number)=>new Date(Date.parse(date+'T00:00:00Z')+shift*86400000).toISOString().slice(0,10);
@Injectable()
export class EventsService {
 constructor(private readonly db:DatabaseService){}
 validate(b:any){
  const checkIn=ensureDate(b.checkIn),checkOut=ensureDate(b.checkOut),eventDate=ensureDate(b.eventDate);
  stayDates(checkIn,checkOut);
  if(eventDate<checkIn||eventDate>=checkOut)throw new BadRequestException('eventDate must be within stay');
  const title=String(b.title||'').trim();if(!title||title.length>160)throw new BadRequestException('title is required (max 160)');
  const venueCode=String(b.venueCode||'LAWN');if(!Object.prototype.hasOwnProperty.call(VENUES,venueCode))throw new BadRequestException('Unrecognized venue; staff must select a supported venue identity');
  return {title,eventDate,checkIn,checkOut,guests:positiveInt(b.guests,'guests',10000),roomsRequired:nonnegativeInt(b.roomsRequired,'roomsRequired',76),diningGuests:nonnegativeInt(b.diningGuests,'diningGuests',10000),parkingSpaces:nonnegativeInt(b.parkingSpaces,'parkingSpaces',10000),eventStaff:positiveInt(b.eventStaff,'eventStaff',1000),venueCode};
 }
 async create(user:any,b:any){if(b?.enquiryId)throw new BadRequestException('Use /staff/enquiries/:id/event-proposal to link an enquiry');const d=this.validate(b);const q=await this.db.query(`INSERT INTO event_requests(title,event_date,check_in,check_out,guests,rooms_required,dining_guests,parking_spaces,event_staff,venue_code,created_by,enquiry_id)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[d.title,d.eventDate,d.checkIn,d.checkOut,d.guests,d.roomsRequired,d.diningGuests,d.parkingSpaces,d.eventStaff,d.venueCode,user.sub,null]);return q.rows[0];}
 async list(q:{status?:string;limit?:string;offset?:string}){
  const status=q.status ? String(q.status) : null;
  if(status!==null && !['PROPOSED','RESERVED'].includes(status))throw new BadRequestException('status must be PROPOSED or RESERVED');
  const limit=q.limit===undefined?25:Number(q.limit);
  const offset=q.offset===undefined?0:Number(q.offset);
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>10000)
   throw new BadRequestException('limit must be 1-100 and offset 0-10000');
  const base=`FROM event_requests e LEFT JOIN enquiries q ON q.id=e.enquiry_id WHERE ($1::text IS NULL OR e.status=$1)`;
  const count=await this.db.query(`SELECT count(*)::int AS total ${base}`,[status]);
  const items=await this.db.query(`SELECT e.id,e.title,e.event_date::text AS event_date,e.check_in::text AS check_in,
    e.check_out::text AS check_out,e.guests,e.rooms_required,e.dining_guests,e.parking_spaces,
    e.event_staff,e.venue_code,e.status,e.created_at,e.enquiry_id,q.public_ref AS enquiry_ref
    ${base} ORDER BY e.created_at DESC,e.id DESC LIMIT $2 OFFSET $3`,[status,limit,offset]);
  return {items:items.rows,total:count.rows[0].total,limit,offset};
 }
 /** Creates a staff-reviewed event from a classified enquiry, never from guesses by the AI. */
 async createFromEnquiry(user:any,enquiryId:string,b:any){
  const d=this.validate(b);
  return this.db.transaction(async client=>{
   const q=await client.query(`SELECT id,category,agent_flags FROM enquiries WHERE id=$1 FOR UPDATE`,[enquiryId]);
   const source=q.rows[0];if(!source)throw new NotFoundException('Enquiry not found');
   if(!['WEDDING','CORPORATE_OFFSITE','OTHER_EVENT'].includes(source.category)||source.agent_flags?.complaintEscalated===true)
    throw new ConflictException('Resolve the enquiry category and GM complaint escalation before making an event proposal');
   const already=await client.query('SELECT id FROM event_requests WHERE enquiry_id=$1',[enquiryId]);
   if(already.rows[0])throw new ConflictException('This enquiry already has an event proposal');
   let created: {id:string;enquiry_id:string;status:string};
   try{
    const r=await client.query(`INSERT INTO event_requests(title,event_date,check_in,check_out,guests,rooms_required,
     dining_guests,parking_spaces,event_staff,venue_code,created_by,enquiry_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
     [d.title,d.eventDate,d.checkIn,d.checkOut,d.guests,d.roomsRequired,d.diningGuests,d.parkingSpaces,d.eventStaff,d.venueCode,user.sub,enquiryId]);
    created=r.rows[0];
   }catch(error:any){if(error?.code==='23505')throw new ConflictException('Event proposal already exists for enquiry');throw error;}
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'EVENT_PROPOSAL_FROM_ENQUIRY',$2,$3)`,
    [user.sub,created.id,JSON.stringify({enquiryId})]);
   return {event:created,requiresApproval:true,reserved:false};
  });
 }
 async one(id:string){const q=await this.db.query(`SELECT id,title,event_date::text AS event_date,check_in::text AS check_in,check_out::text AS check_out,guests,rooms_required,dining_guests,parking_spaces,event_staff,venue_code,status FROM event_requests WHERE id=$1`,[id]);if(!q.rows[0])throw new NotFoundException('Event not found');return q.rows[0];}
 async update(id:string,b:any){const d=this.validate(b);return this.db.transaction(async client=>{const q=await client.query(`UPDATE event_requests SET title=$2,event_date=$3,check_in=$4,check_out=$5,guests=$6,rooms_required=$7,dining_guests=$8,parking_spaces=$9,event_staff=$10,venue_code=$11 WHERE id=$1 AND status='PROPOSED' AND NOT EXISTS (SELECT 1 FROM event_approval_reviews ar WHERE ar.event_id=$1 AND ar.status IN ('PENDING_GM','GM_APPROVED','CLIENT_CONFIRMED')) RETURNING *`,[id,d.title,d.eventDate,d.checkIn,d.checkOut,d.guests,d.roomsRequired,d.diningGuests,d.parkingSpaces,d.eventStaff,d.venueCode]);if(!q.rows[0])throw new ConflictException('Cannot modify nonexistent or reserved event');return q.rows[0];},true);}
 async requirements(id:string){const e=await this.one(id);return {eventId:id,nodes:[{id:'EVENT',kind:'EVENT',quantity:1}, {id:'ROOMS',kind:'PHYSICAL_ROOM',quantity:e.rooms_required,dates:[e.check_in,e.check_out]}, {id:e.venue_code,kind:'EXCLUSIVE',quantity:1,date:e.event_date}, {id:'DINING',kind:'CAPACITY',quantity:e.dining_guests,date:e.event_date}, {id:'PARKING',kind:'CAPACITY',quantity:e.parking_spaces,date:e.event_date}, {id:'EVENT_STAFF',kind:'SHIFT_CAPACITY',quantity:e.event_staff,date:e.event_date}],edges:['ROOMS',e.venue_code,'DINING','PARKING','EVENT_STAFF'].map(target=>({from:'EVENT',to:target,type:'REQUIRES'}))};}
 async evaluateSpec(e:any,client:PoolClient){
  const days=stayDates(e.check_in,e.check_out),blockers:any[]=[],details:any[]=[];
  const rooms=await client.query<{id:string;unit_code:string}>(`
    SELECT u.id,u.unit_code FROM room_units u WHERE u.active=true
    AND NOT EXISTS (SELECT 1 FROM room_nights n WHERE n.room_unit_id=u.id AND n.stay_date=ANY($1::date[]))
    ORDER BY u.unit_code`,[days]);
  const roomNeed=Number(e.rooms_required);const roomAvailable=rooms.rows.length;
  details.push({resource:'ROOMS',required:roomNeed,available:roomAvailable,dates:days,status:roomAvailable>=roomNeed?'PASS':'BLOCKED'});
  if(roomAvailable<roomNeed)blockers.push({resource:'ROOMS',deficit:roomNeed-roomAvailable,reason:'Insufficient continuous-stay physical rooms'});
  // Venue capacity and exclusivity are different concepts. Never book the same
  // physical lawn twice on one calendar date, even if a slot was misconfigured >1.
  const claimed=await client.query('SELECT event_id FROM exclusive_venue_claims WHERE venue_code=$1 AND event_date=$2 AND event_id IS DISTINCT FROM $3::uuid',
   [e.venue_code,e.event_date,e.id??null]);
  if(claimed.rowCount){
   blockers.push({resource:e.venue_code,reason:`${VENUES[e.venue_code]||'Venue'} is already reserved for this date`,deficit:1});
   details.push({resource:'VENUE_EXCLUSIVITY',required:1,available:0,status:'BLOCKED'});
  }
  const selectedRooms=rooms.rows.slice(0,roomNeed);
  const slots:any[]=[];
  for(const item of [{code:e.venue_code,key:'venueRequired',label:VENUES[e.venue_code]||'Event venue'},...RESOURCE_MAP]){
    const quantity=item.key==='venueRequired'?1:Number(e[item.key]??0);
    if(quantity<=0)continue;
    const q=await client.query<{id:string;capacity:number;blocked:boolean;reserved:string}>(`SELECT s.id,s.capacity,s.blocked,COALESCE(SUM(a.quantity),0)::text AS reserved FROM resource_slots s JOIN resource_types t ON t.id=s.resource_id LEFT JOIN resource_allocations a ON a.slot_id=s.id WHERE t.code=$1 AND s.slot_date=$2 AND s.slot_name='DAY' GROUP BY s.id`,[item.code,e.event_date]);
    if(!q.rows[0]){details.push({resource:item.code,required:quantity,available:null,status:'NEEDS_REVIEW'});blockers.push({resource:item.code,reason:'Resource slot capacity not configured',needsReview:true});continue;}
    const slot=q.rows[0];const available=slot.blocked?0:Math.max(0,slot.capacity-Number(slot.reserved));
    const status=quantity<=available?'PASS':'BLOCKED';
    details.push({resource:item.code,required:quantity,available,status,slotId:slot.id,date:e.event_date});
    if(status==='BLOCKED')blockers.push({resource:item.code,deficit:quantity-available,reason:`${item.label} capacity insufficient`});
    slots.push({slotId:slot.id,quantity,resource:item.code});
  }
  const status=blockers.some(x=>x.needsReview)?'NEEDS_REVIEW':blockers.length?'NOT_FEASIBLE':'FEASIBLE';
  return {status,eventId:e.id||null,details,blockers,selectedRoomUnitIds:status==='FEASIBLE'?selectedRooms.map(x=>x.id):[],allocationSlots:status==='FEASIBLE'?slots:[],checkedAt:new Date().toISOString()};
 }
 async evaluate(id:string){return this.db.transaction(async client=>{await cleanExpired(client);const q=await client.query(`SELECT *,event_date::text,check_in::text,check_out::text FROM event_requests WHERE id=$1`,[id]);if(!q.rows[0])throw new NotFoundException();const e=q.rows[0];const result=await this.evaluateSpec(e,client);await client.query(`INSERT INTO feasibility_runs(event_id,result) VALUES($1,$2)`,[id,JSON.stringify(result)]);return result;},true);}
 async alternatives(id:string){const e=await this.one(id);const feasible: Array<{eventDate:string;checkIn:string;checkOut:string;status:string}>=[];return this.db.transaction(async client=>{await cleanExpired(client);for(let offset=1;offset<=14 && feasible.length<3;offset++){
   for(const shift of [offset,-offset]){
    const spec={...e, event_date:iso(e.event_date,shift),check_in:iso(e.check_in,shift),check_out:iso(e.check_out,shift)};
    const result=await this.evaluateSpec(spec,client);
    if(result.status==='FEASIBLE')feasible.push({eventDate:spec.event_date,checkIn:spec.check_in,checkOut:spec.check_out,status:result.status});
    if(feasible.length>=3)break;
   }
  }return {eventId:id,candidates:feasible,searchWindowDays:14,verifiedAt:new Date().toISOString()};},true);}
 /** Staff explicitly selects an alternative; evaluation is a proposal, NOT an allocation. */
 async applyAlternative(user:any,id:string,b:any){
  const date=ensureDate(String(b.eventDate||''));
  return this.db.transaction(async client=>{
   await cleanExpired(client);
   const q=await client.query(`SELECT *,event_date::text,check_in::text,check_out::text FROM event_requests WHERE id=$1 FOR UPDATE`,[id]);
   const event=q.rows[0];if(!event)throw new NotFoundException('Event not found');
   if(event.status!=='PROPOSED')throw new ConflictException('Already reserved events cannot be rescheduled');
   const shift=Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(event.event_date+'T00:00:00Z'))/86400000);
   if(shift===0||Math.abs(shift)>14)throw new BadRequestException('Choose a different date within 14 days of the requested event');
   const proposed={...event,event_date:date,check_in:iso(event.check_in,shift),check_out:iso(event.check_out,shift)};
   const result=await this.evaluateSpec(proposed,client);
   if(result.status!=='FEASIBLE')throw new ConflictException({code:'ALTERNATIVE_NOT_FEASIBLE',result});
   await client.query(`UPDATE event_requests SET event_date=$2,check_in=$3,check_out=$4 WHERE id=$1`,[id,proposed.event_date,proposed.check_in,proposed.check_out]);
   await client.query(`INSERT INTO feasibility_runs(event_id,result) VALUES($1,$2)`,[id,JSON.stringify(result)]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'EVENT_ALTERNATIVE_SELECTED',$2,$3)`,[user.sub,id,JSON.stringify({originalDate:event.event_date,selectedDate:date})]);
   return {eventId:id,status:'PROPOSED',newDates:{eventDate:date,checkIn:proposed.check_in,checkOut:proposed.check_out},feasibility:result,requiresApproval:true};
  },true);
 }
 /** Fetches only committed allocations: safe for the staff workbench after approval. */
 async bundle(id:string){
  const event=await this.one(id);
  const q=await this.db.query(`SELECT id,created_at,approved_by FROM reservation_bundles WHERE event_id=$1`,[id]);
  if(!q.rows[0])return {eventId:id,status:event.status,bundle:null};
  const bundle=q.rows[0];
  const rooms=await this.db.query(`SELECT u.unit_code,min(n.stay_date)::text AS first_night,max(n.stay_date)::text AS last_night,count(*)::int AS nights FROM room_nights n JOIN room_units u ON u.id=n.room_unit_id WHERE n.bundle_id=$1 GROUP BY u.unit_code ORDER BY u.unit_code`,[bundle.id]);
  const resources=await this.db.query(`SELECT t.code,s.slot_date::text AS date,s.slot_name,a.quantity FROM resource_allocations a JOIN resource_slots s ON s.id=a.slot_id JOIN resource_types t ON t.id=s.resource_id WHERE a.bundle_id=$1 ORDER BY t.code`,[bundle.id]);
  return {eventId:id,status:'RESERVED',bundleId:bundle.id,approvedBy:bundle.approved_by,createdAt:bundle.created_at,roomUnits:rooms.rows,resources:resources.rows};
 }
 async reserveInsideApproval(client:PoolClient,user:any,id:string){
  await cleanExpired(client);
  const q=await client.query(`SELECT *,event_date::text,check_in::text,check_out::text FROM event_requests WHERE id=$1 FOR UPDATE`,[id]);const e=q.rows[0];if(!e)throw new NotFoundException();
  const old=await client.query(`SELECT id FROM reservation_bundles WHERE event_id=$1`,[id]);if(old.rows[0])return {status:'RESERVED',bundleId:old.rows[0].id,replayed:true};
  // Lock the capacity rows as defense-in-depth. This is in addition to the
  // transaction-scoped global inventory advisory lock in DatabaseService.
  // A competing writer respecting row locks cannot revise capacity mid-approval.
  await client.query(`SELECT s.id FROM resource_slots s JOIN resource_types t ON t.id=s.resource_id
    WHERE s.slot_date=$1 AND s.slot_name='DAY' AND t.code=ANY($2::text[])
    ORDER BY s.id FOR UPDATE OF s`,[e.event_date,[e.venue_code,...RESOURCE_MAP.map(r=>r.code)]]);
  // Only a pending GM request can initiate atomic resource reservation.
  const approval=(await client.query('SELECT status FROM event_approval_reviews WHERE event_id=$1 FOR UPDATE',[id])).rows[0];
  if(!approval||approval.status!=='PENDING_GM')throw new ForbiddenException('GM review is required before reservation');
  const result=await this.evaluateSpec(e,client);
  if(result.status!=='FEASIBLE')throw new ConflictException({code:'EVENT_NOT_FEASIBLE',result});
  // The database PRIMARY KEY guarantees at most one physical lawn reservation/day.
  // On conflict, the ENTIRE reservation transaction rolls back.
  const claim=await client.query(`INSERT INTO exclusive_venue_claims(venue_code,event_date,event_id)
   VALUES($1,$2,$3) ON CONFLICT(venue_code,event_date) DO NOTHING RETURNING event_id`,
   [e.venue_code,e.event_date,id]);
  if(!claim.rowCount)throw new ConflictException('Venue already reserved on this date');
  const bundle=(await client.query(`INSERT INTO reservation_bundles(event_id,approved_by) VALUES($1,$2) RETURNING id`,[id,user.sub])).rows[0];
  for(const r of result.allocationSlots)await client.query(`INSERT INTO resource_allocations(bundle_id,slot_id,quantity) VALUES($1,$2,$3)`,[bundle.id,r.slotId,r.quantity]);
  for(const room of result.selectedRoomUnitIds)for(const day of stayDates(e.check_in,e.check_out))await client.query(`INSERT INTO room_nights(room_unit_id,stay_date,origin,bundle_id) VALUES($1,$2,'EVENT',$3)`,[room,day,bundle.id]);
  await client.query(`UPDATE event_requests SET status='RESERVED' WHERE id=$1`,[id]);
  await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'EVENT_RESERVED',$2,$3)`,[user.sub,id,JSON.stringify({bundleId:bundle.id,resources:result.details})]);
  return {status:'RESERVED',eventId:id,bundleId:bundle.id,roomCount:result.selectedRoomUnitIds.length,details:result.details};
 }
 async reserve(user:any,id:string){throw new ForbiddenException('Use staff review and GM approval; direct reservation is disabled');}
}
@UseGuards(AuthGuard,StaffGuard)
@Controller('staff/events')
export class EventsController {
 constructor(private readonly service:EventsService){}
 @Post() create(@CurrentUser() u:any,@Body() b:any){return this.service.create(u,b||{});}
 @Get() list(@Query() q:any){return this.service.list(q||{});}
 @Get(':id') one(@Param('id') id:string){return this.service.one(id);}
 @Get(':id/requirements') req(@Param('id') id:string){return this.service.requirements(id);}
 @Put(':id/requirements') update(@Param('id') id:string,@Body() b:any){return this.service.update(id,b||{});}
 @Post(':id/evaluations') evaluate(@Param('id') id:string){return this.service.evaluate(id);}
 @Get(':id/alternatives') alternatives(@Param('id') id:string){return this.service.alternatives(id);}
 @Post(':id/alternatives/select') applyAlternative(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.service.applyAlternative(u,id,b||{});}
 @Get(':id/bundle') bundle(@Param('id') id:string){return this.service.bundle(id);}
 @Post(':id/reserve') reserve(@CurrentUser() user:any,@Param('id') id:string){return this.service.reserve(user,id);}
}
