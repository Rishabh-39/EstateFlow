import { Controller, Injectable, Get, Post, Body, Param, UseGuards, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventsService } from './events';
import { AuthGuard, StaffGuard, CurrentUser } from '../auth/auth';
import { cleanExpired } from '../shared/inventory';

/** Human GM authorization and atomic venue/room/resource commitment.
 * Client delivery is NOT claimed by recording a draft or opening a mailto link. */
@Injectable()
export class EventApprovalService {
 constructor(private readonly db:DatabaseService,private readonly events:EventsService){}
 async detail(eventId:string){
  const q=await this.db.query(`SELECT r.*,e.enquiry_id,e.status AS event_status,e.title,e.event_date::text AS event_date,
   e.guests,e.rooms_required,e.event_staff,q.public_ref,q.contact_name,q.contact_email,q.form_payload
   FROM event_requests e LEFT JOIN event_approval_reviews r ON r.event_id=e.id
   LEFT JOIN enquiries q ON q.id=e.enquiry_id WHERE e.id=$1`,[eventId]);
  if(!q.rows[0])throw new NotFoundException('Event not found');
  return q.rows[0];
 }
 async pending(user:any){
  if(user.role!=='GM')throw new ForbiddenException('GM access only');
  return (await this.db.query(`SELECT r.event_id,r.status,r.requested_at,e.title,e.event_date::text AS event_date,
   e.guests,e.rooms_required,e.event_staff,q.public_ref,q.contact_name
   FROM event_approval_reviews r JOIN event_requests e ON e.id=r.event_id
   LEFT JOIN enquiries q ON q.id=e.enquiry_id WHERE r.status='PENDING_GM' ORDER BY r.requested_at ASC`)).rows;
 }
 async request(user:any,id:string){
  if(user.role!=='STAFF')throw new ForbiddenException('Only reservations staff may submit an event for GM review');
  return this.db.transaction(async client=>{
   await cleanExpired(client);
   const ev=(await client.query('SELECT *,event_date::text,check_in::text,check_out::text FROM event_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!ev)throw new NotFoundException('Event not found');
   if(ev.status!=='PROPOSED')throw new ConflictException('Already reserved; cannot request a second approval');
   if(ev.enquiry_id){
    const eq=(await client.query('SELECT routing_lane,agent_flags FROM enquiries WHERE id=$1 FOR UPDATE',[ev.enquiry_id])).rows[0];
    if(eq?.routing_lane==='GM_ESCALATION'||eq?.agent_flags?.complaintEscalated===true)
      throw new ConflictException('Resolve the separate GM complaint escalation before requesting event approval');
   }
   const old=(await client.query('SELECT status FROM event_approval_reviews WHERE event_id=$1 FOR UPDATE',[id])).rows[0];
   if(old && old.status!=='GM_REJECTED')throw new ConflictException('This event already has an active or completed GM review');
   const check=await this.events.evaluateSpec(ev,client);
   if(check.status!=='FEASIBLE')throw new ConflictException({reason:'Resources are not feasible; resolve blockers before GM review',result:check});
   await client.query(`INSERT INTO event_approval_reviews(event_id,status,requested_by) VALUES($1,'PENDING_GM',$2)
    ON CONFLICT(event_id) DO UPDATE SET status='PENDING_GM',requested_by=$2,gm_note='',requested_at=now(),reviewed_at=NULL,reviewed_by=NULL`,[id,user.sub]);
   if(ev.enquiry_id)await client.query(`UPDATE enquiries SET status='APPROVAL_PENDING' WHERE id=$1`,[ev.enquiry_id]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'EVENT_SENT_FOR_GM_REVIEW',$2)`,[user.sub,id]);
   return {eventId:id,status:'PENDING_GM',reserved:false};
  },true);
 }
 async decide(user:any,id:string,b:any){
  if(user.role!=='GM')throw new ForbiddenException('GM authorization required');
  if(typeof b.approve!=='boolean')throw new BadRequestException('approve must be true or false');
  const note=String(b.note||'').slice(0,2000);
  return this.db.transaction(async client=>{
   const review=(await client.query('SELECT status FROM event_approval_reviews WHERE event_id=$1 FOR UPDATE',[id])).rows[0];
   if(!review||review.status!=='PENDING_GM')throw new ConflictException('No pending approval for this event');
   const ev=(await client.query('SELECT enquiry_id,event_staff FROM event_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!ev)throw new NotFoundException();
   if(b.approve && ev.enquiry_id){
    const eq=(await client.query('SELECT routing_lane,agent_flags FROM enquiries WHERE id=$1 FOR UPDATE',[ev.enquiry_id])).rows[0];
    if(eq?.routing_lane==='GM_ESCALATION'||eq?.agent_flags?.complaintEscalated===true)
      throw new ConflictException('Complaint escalation is awaiting GM resolution; cannot commit a booking');
   }
   if(!b.approve){
    await client.query(`UPDATE event_approval_reviews SET status='GM_REJECTED',gm_note=$2,reviewed_by=$3,reviewed_at=now() WHERE event_id=$1`,[id,note,user.sub]);
    if(ev.enquiry_id)await client.query(`UPDATE enquiries SET status='IN_REVIEW' WHERE id=$1`,[ev.enquiry_id]);
    return {eventId:id,status:'GM_REJECTED',reserved:false};
   }
   if(ev.enquiry_id){
    const plan=(await client.query('SELECT status,counts FROM staff_plans WHERE enquiry_id=$1',[ev.enquiry_id])).rows[0];
    if(plan){
     const assigned=Object.values(plan.counts||{}).reduce((a:number,b:any)=>a+Number(b||0),0);
     if(plan.status!=='Approved'||assigned!==Number(ev.event_staff))
      throw new ConflictException('Staff plan must be GM-approved and equal reviewed event staff requirement before event approval');
    }
   }
   await cleanExpired(client);
   const committed=await this.events.reserveInsideApproval(client,user,id);
   await client.query(`UPDATE event_approval_reviews SET status='GM_APPROVED',gm_note=$2,reviewed_by=$3,reviewed_at=now() WHERE event_id=$1`,[id,note,user.sub]);
   if(ev.enquiry_id)await client.query(`UPDATE enquiries SET status='APPROVED' WHERE id=$1`,[ev.enquiry_id]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'EVENT_GM_APPROVED',$2,$3)`,[user.sub,id,JSON.stringify({bundleId:committed.bundleId})]);
   return {eventId:id,status:'GM_APPROVED',bundleId:committed.bundleId,reserved:true};
  },true);
 }
 async recordClient(user:any,id:string,b:any){
  if(user.role!=='STAFF')throw new ForbiddenException('Only staff may record a client confirmation');
  const channel=String(b.channel||'');
  if(!['email','whatsapp','manual'].includes(channel)||b.confirmedSent!==true)
   throw new BadRequestException('Choose channel and explicitly attest that the confirmation was actually sent');
  return this.db.transaction(async client=>{
   const customer=(await client.query(`SELECT q.contact_email,q.form_payload FROM event_requests e LEFT JOIN enquiries q ON q.id=e.enquiry_id WHERE e.id=$1`,[id])).rows[0];
   if(!customer)throw new NotFoundException('Event not found');
   if(channel==='email'&&!customer.contact_email)throw new BadRequestException('No guest email is recorded; choose a verified manual channel');
   if(channel==='whatsapp'&&!/\d{10,}/.test(String(customer.form_payload?.phone||'').replace(/\D/g,'')))
    throw new BadRequestException('No valid guest phone was provided; choose email or verified manual channel');
   const q=(await client.query('SELECT status FROM event_approval_reviews WHERE event_id=$1 FOR UPDATE',[id])).rows[0];
   if(!q||q.status!=='GM_APPROVED')throw new ConflictException('GM must approve and commit resources before a client confirmation can be recorded');
   await client.query(`UPDATE event_approval_reviews SET status='CLIENT_CONFIRMED',client_channel=$2,client_recorded_by=$3,client_recorded_at=now() WHERE event_id=$1`,[id,channel,user.sub]);
   await client.query(`UPDATE enquiries SET status='CLIENT_CONFIRMED' WHERE id=(SELECT enquiry_id FROM event_requests WHERE id=$1)`,[id]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'EVENT_CLIENT_CONFIRMATION_RECORDED',$2,$3)`,[user.sub,id,JSON.stringify({channel,delivery:'attested_by_staff_not_api_verified'})]);
   return {eventId:id,status:'CLIENT_CONFIRMED',delivery:'staff_attestation_only'};
  });
 }
}
@UseGuards(AuthGuard,StaffGuard)
@Controller('staff/event-approvals')
export class StaffEventApprovalController {
 constructor(private readonly svc:EventApprovalService){}
 @Get(':id') get(@Param('id') id:string){return this.svc.detail(id);}
 @Post(':id/request') request(@CurrentUser() u:any,@Param('id') id:string){return this.svc.request(u,id);}
 @Post(':id/confirm-client') confirm(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.recordClient(u,id,b||{});}
}
@UseGuards(AuthGuard,StaffGuard)
@Controller('gm/event-approvals')
export class GmEventApprovalController {
 constructor(private readonly svc:EventApprovalService){}
 @Get() pending(@CurrentUser() u:any){return this.svc.pending(u);}
 @Post(':id/decision') decide(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.svc.decide(u,id,b||{});}
}
