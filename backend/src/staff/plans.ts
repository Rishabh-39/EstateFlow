import { Controller, Get, Put, Post, Patch, Body, Injectable, Param, UseGuards, ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuthGuard, StaffGuard, CurrentUser } from '../auth/auth';

const KEYS=['reception','waiters','chefs','decor','roomService','laundry','valet','assistant'] as const;
type State='Draft'|'Pending GM'|'Changes requested'|'Approved'|'Sent to client';
const blank=Object.fromEntries(KEYS.map(k=>[k,0]));
function countsOf(v:any):Record<string,number>{
 if(!v || typeof v!=='object' || Array.isArray(v) || Object.keys(v).some(k=>!KEYS.includes(k as any)))throw new BadRequestException('Invalid staff role counts');
 const data:Record<string,number>={};
 for(const key of KEYS){const n=v[key]??0;if(!Number.isSafeInteger(n)||n<0||n>140)throw new BadRequestException(`Invalid ${key} count`);data[key]=n;}
 if(Object.values(data).reduce((a,b)=>a+b,0)>140)throw new BadRequestException('Plan exceeds resort workforce; check staffing counts');
 return data;
}
function permitted(role:string,from:State,to:State):boolean {
 return role==='GM'&&from==='Pending GM'&&['Approved','Changes requested'].includes(to)
 || role==='STAFF'&&(['Draft','Changes requested'].includes(from)&&to==='Pending GM' || from==='Approved'&&to==='Sent to client');
}
@Injectable()
export class StaffPlansService {
 constructor(private readonly db:DatabaseService) {}
 async list(){return (await this.db.query(`SELECT enquiry_id AS "enquiryId",counts,notes,status,gm_note AS "gmNote",updated_at AS "updatedAt" FROM staff_plans ORDER BY updated_at DESC LIMIT 200`)).rows;}
 async get(id:string){
  const e=await this.db.query('SELECT id FROM enquiries WHERE id=$1',[id]);if(!e.rows[0])throw new NotFoundException('Enquiry not found');
  const q=await this.db.query(`SELECT enquiry_id AS "enquiryId",counts,notes,status,gm_note AS "gmNote",updated_at AS "updatedAt" FROM staff_plans WHERE enquiry_id=$1`,[id]);
  return q.rows[0]||{enquiryId:id,counts:{...blank},notes:'',status:'Draft',gmNote:'',updatedAt:new Date().toISOString(),draftOnly:true};
 }
 async save(user:any,id:string,b:any){
  if(user.role!=='STAFF')throw new ForbiddenException('Staff drafts must be edited by a staff member');
  const counts=countsOf(b.counts),notes=String(b.notes??'');if(notes.length>2000)throw new BadRequestException('Notes too long');
  return this.db.transaction(async client=>{
   const e=await client.query('SELECT id FROM enquiries WHERE id=$1 FOR UPDATE',[id]);if(!e.rows[0])throw new NotFoundException('Enquiry not found');
   // Once a GM has committed event resources, revising the staffing plan would
   // misrepresent the confirmed allocation. A new change workflow is required.
   const reserved=await client.query(`SELECT 1 FROM event_requests WHERE enquiry_id=$1 AND status='RESERVED' LIMIT 1`,[id]);
   if(reserved.rows[0])throw new ConflictException('This event has committed resources; staffing revisions require a separately reviewed change request');
   const old=await client.query('SELECT status FROM staff_plans WHERE enquiry_id=$1 FOR UPDATE',[id]);
   if(old.rows[0] && !['Draft','Changes requested','Approved'].includes(old.rows[0].status))throw new ConflictException('Plan is awaiting approval or already marked as sent');
   const q=await client.query(`INSERT INTO staff_plans(enquiry_id,counts,notes,status,submitted_by) VALUES ($1,$2,$3,'Draft',$4)
    ON CONFLICT(enquiry_id) DO UPDATE SET counts=$2,notes=$3,status='Draft',gm_note='',updated_at=now()
    RETURNING enquiry_id AS "enquiryId",counts,notes,status,gm_note AS "gmNote",updated_at AS "updatedAt"`,[id,JSON.stringify(counts),notes,user.sub]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'STAFF_PLAN_SAVED',$2)`,[user.sub,id]);return q.rows[0];
  });
 }
 async transition(user:any,id:string,b:any){
  const next=String(b.status||'') as State;
  if(!['Pending GM','Approved','Changes requested','Sent to client'].includes(next))throw new BadRequestException('Invalid transition');
  if(next==='Sent to client' && b.externalDeliveryConfirmed!==true)throw new BadRequestException('Explicit staff attestation required. This API does not send messages');
  const gmNote=String(b.gmNote??'');if(gmNote.length>2000)throw new BadRequestException('GM note too long');
  return this.db.transaction(async client=>{
   const old=await client.query('SELECT status FROM staff_plans WHERE enquiry_id=$1 FOR UPDATE',[id]);
   if(!old.rows[0])throw new ConflictException('Save a staff plan before submitting for review');
   if(!permitted(user.role,old.rows[0].status,next))throw new ForbiddenException('Only the authorized actor can make this transition');
   if(next==='Approved'){
    const e=(await client.query('SELECT extracted,manual_extracted FROM enquiries WHERE id=$1',[id])).rows[0];
    const requested=e?.manual_extracted?.eventStaff??e?.extracted?.eventStaff;
    if(requested!==null && requested!==undefined){
     const c=(await client.query('SELECT counts FROM staff_plans WHERE enquiry_id=$1',[id])).rows[0]?.counts||{};
     const total=Object.values(c).reduce((a:number,n:any)=>a+Number(n||0),0);
     if(total!==Number(requested))throw new ConflictException(`Role-count total ${total} differs from reviewed event staff ${requested}; resync before GM approval`);
    }
   }
   const q=await client.query(`UPDATE staff_plans SET status=$2,gm_note=CASE WHEN $2 IN ('Approved','Changes requested') THEN $3 ELSE gm_note END,
    reviewed_by=CASE WHEN $2 IN ('Approved','Changes requested') THEN $4::uuid ELSE reviewed_by END,updated_at=now()
    WHERE enquiry_id=$1 RETURNING enquiry_id AS "enquiryId",counts,notes,status,gm_note AS "gmNote",updated_at AS "updatedAt"`,[id,next,gmNote,user.sub]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'STAFF_PLAN_TRANSITION',$2,$3)`,[user.sub,id,JSON.stringify({from:old.rows[0].status,to:next})]);return q.rows[0];
  });
 }
 /** GM sees the full original enquiry, escalation reason and reviewed requirements.
  * Returned context is role-scoped; it is never exposed through public routes. */
 async gmEscalations(user:any){
  if(user.role!=='GM')throw new ForbiddenException('GM only');
  return (await this.db.query(`SELECT e.id,e.public_ref,e.contact_name,e.contact_email,e.category,e.source,
   e.message,e.created_at,e.agent_flags,e.extracted,e.manual_extracted,e.form_payload,e.status,
   u.display_name AS escalated_to,
   (SELECT d.body FROM reply_drafts d WHERE d.enquiry_id=e.id ORDER BY d.created_at DESC LIMIT 1) AS draft_body,
   (SELECT json_build_object('channel',f.channel,'summary',f.summary,'contactedAt',f.contacted_at,'staffName',su.display_name)
      FROM enquiry_client_followups f JOIN users su ON su.id=f.staff_id
      WHERE f.enquiry_id=e.id ORDER BY f.contacted_at DESC,f.id DESC LIMIT 1) AS latest_client_followup
   FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_user_id
   WHERE e.routing_lane='GM_ESCALATION' ORDER BY e.created_at ASC LIMIT 200`)).rows;
 }
 async recentGmDecisions(user:any){
  if(user.role!=='GM')throw new ForbiddenException('GM only');
  return (await this.db.query(`SELECT r.id,r.enquiry_id,r.decision,r.note,r.decided_at,r.staff_acknowledged_at,
   e.public_ref,e.contact_name,u.display_name AS returned_to_staff
   FROM gm_escalation_decisions r JOIN enquiries e ON e.id=r.enquiry_id
   LEFT JOIN users u ON u.id=r.returned_to_staff_id
   ORDER BY r.decided_at DESC,r.id DESC LIMIT 25`)).rows;
 }
 /** This is NOT an event booking approval. It records complaint resolution and a staff inbox notice. */
 async resolveEscalation(user:any,id:string,b:any){
  if(user.role!=='GM')throw new ForbiddenException('GM review required');
  const decision=String(b?.decision||'');
  const note=String(b?.note||'').trim();
  if(!['RESOLUTION_APPROVED','ACTION_REQUIRED'].includes(decision))throw new BadRequestException('Choose approve resolution or return for staff action');
  if(note.length<10||note.length>2000)throw new BadRequestException('Write 10–2000 characters explaining the GM decision and next steps');
  return this.db.transaction(async client=>{
   const e=(await client.query('SELECT id,routing_lane,status,agent_flags,assigned_user_id,message FROM enquiries WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!e)throw new NotFoundException('Enquiry not found');
   if(e.routing_lane!=='GM_ESCALATION')throw new ConflictException('Escalation already reviewed or no longer pending');
   const desired=e.agent_flags?.previousStaffId;
   const staff=(desired&&/^[0-9a-f-]{36}$/i.test(String(desired))
     ? (await client.query(`SELECT id FROM users WHERE id=$1 AND role='STAFF'`,[desired])).rows[0] : null)
     ||(await client.query(`SELECT id FROM users WHERE role='STAFF' ORDER BY email LIMIT 1`)).rows[0];
   if(!staff)throw new ConflictException('No reservations staff account is available for notification');
   const q=(await client.query(`INSERT INTO gm_escalation_decisions(enquiry_id,decision,note,decided_by,returned_to_staff_id)
    VALUES($1,$2,$3,$4,$5) RETURNING id,decision,note,decided_at`,[id,decision,note,user.sub,staff.id])).rows[0];
   const flags={...(e.agent_flags||{}),complaintEscalated:false,operationsEscalated:false,complaintReviewedByGm:true,gmReviewDecision:decision,gmReviewedMessageDigest:createHash('sha256').update(String(e.message||'')).digest('hex')};
   const changed=(await client.query(`UPDATE enquiries SET routing_lane='ASSIGNED',
    status=CASE WHEN status IN ('APPROVED','CLIENT_CONFIRMED') THEN status ELSE 'IN_REVIEW' END,
    assigned_user_id=$2,agent_flags=$3::jsonb WHERE id=$1 RETURNING id,status,routing_lane`,[id,staff.id,JSON.stringify(flags)])).rows[0];
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,$2,$3,$4)`,
    [user.sub,decision==='RESOLUTION_APPROVED'?'GM_COMPLAINT_RESOLUTION_APPROVED':'GM_STAFF_ACTION_REQUESTED',id,
     JSON.stringify({decisionId:q.id,note,staffUserId:staff.id,inAppNotification:true,eventReservation:false})]);
   return {...changed,review:q,staffNotifiedInApp:true,returnedToStaffId:staff.id,bookingApproved:false};
  });
 }
 async acknowledgeGmDecision(user:any,enquiryId:string,decisionId:string){
  if(user.role!=='STAFF')throw new ForbiddenException('Only assigned reservations staff may acknowledge GM decisions');
  return this.db.transaction(async client=>{
   const q=(await client.query(`SELECT r.id,r.returned_to_staff_id,r.staff_acknowledged_at
    FROM gm_escalation_decisions r WHERE r.id=$1 AND r.enquiry_id=$2 FOR UPDATE`,[decisionId,enquiryId])).rows[0];
   if(!q)throw new NotFoundException('GM decision not found');
   if(q.returned_to_staff_id!==user.sub)throw new ForbiddenException('This GM decision belongs to a different staff member');
   if(!q.staff_acknowledged_at){
    await client.query(`UPDATE gm_escalation_decisions SET staff_acknowledged_at=now(),staff_acknowledged_by=$2 WHERE id=$1`,[decisionId,user.sub]);
    await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'GM_DECISION_ACKNOWLEDGED',$2,$3)`,[user.sub,enquiryId,JSON.stringify({decisionId})]);
   }
   return {enquiryId,decisionId,acknowledged:true};
  });
 }

}
@UseGuards(AuthGuard,StaffGuard)
@Controller('staff')
export class StaffPlansController {
 constructor(private readonly plans:StaffPlansService) {}
 @Get('allocations') list(){return this.plans.list();}
 @Get('allocations/:id') get(@Param('id') id:string){return this.plans.get(id);}
 @Put('allocations/:id') save(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.plans.save(u,id,b||{});}
 @Post('allocations/:id/transition') transition(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.plans.transition(u,id,b||{});}
 @Get('gm-escalations') gmEscalations(@CurrentUser() u:any){return this.plans.gmEscalations(u);}
 @Get('gm-escalations/recent') recentGmDecisions(@CurrentUser() u:any){return this.plans.recentGmDecisions(u);}
 @Post('enquiries/:id/gm-review') gmReview(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.plans.resolveEscalation(u,id,b||{});}
 @Post('enquiries/:id/gm-review/:decisionId/acknowledge') acknowledge(@CurrentUser() u:any,@Param('id') id:string,@Param('decisionId') decisionId:string){return this.plans.acknowledgeGmDecision(u,id,decisionId);}
 @Patch('enquiries/:id/gm-return') gmReturn(@CurrentUser() u:any,@Param('id') id:string,@Body() b:any){return this.plans.resolveEscalation(u,id,b||{});}
}
