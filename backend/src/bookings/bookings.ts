import { Injectable, Controller, Post, Get, Body, Param, UseGuards, Headers, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthGuard, CurrentUser } from '../auth/auth';
import { RoomsService } from '../rooms/rooms';
import { cleanExpired, availableRooms } from '../shared/inventory';
import { stayDates } from '../shared/validation';
import { randomBytes } from 'node:crypto';
import { assertMatchingHoldRequest, normalizeHoldDateFields } from '../shared/hold-idempotency';
import { holdView } from '../shared/frontdesk-contract';
import { beforeCheckIn, cancellationReason, cancellationView } from '../shared/booking-cancellation';
@Injectable()
export class BookingsService {
 constructor(private readonly db:DatabaseService,private readonly rooms:RoomsService){}
 async hold(user:any,b:any,idempotencyKey?:string){
  const days=stayDates(b.checkIn,b.checkOut);
  if(idempotencyKey && (idempotencyKey.length>100||idempotencyKey.length<8))throw new BadRequestException('Idempotency-Key must be 8-100 characters');
  return this.db.transaction(async client=>{
   await cleanExpired(client);
   if(idempotencyKey){
    const old=await client.query(`SELECT *, check_in::text AS check_in_date, check_out::text AS check_out_date FROM booking_holds WHERE user_id=$1 AND request_key=$2`,[user.sub,idempotencyKey]);
    if(old.rows[0]){
     // Dates are ISO date-only strings from PostgreSQL, never JS Date objects.
     const existing=normalizeHoldDateFields(old.rows[0]);
     // Replays are valid only for an identical, still-active hold request.
     if(!assertMatchingHoldRequest(existing,b))throw new ConflictException('Idempotency key reused with different booking details');
     if(old.rows[0].status!=='HELD' || new Date(old.rows[0].expires_at).getTime()<=Date.now())
      throw new ConflictException('Idempotent hold has expired or been confirmed; start a new request');
     return {...existing,replayed:true};
    }
   }
   const quote=await this.rooms.quote(b,client);
   const free=await availableRooms(client,quote.roomTypeId,quote.checkIn,quote.checkOut);
   if(!free.length)throw new ConflictException('Selected room type has no website allotment or physical room for every night');
   const unit=free[0];
   const q=await client.query(`INSERT INTO booking_holds(user_id,request_key,room_type_id,room_unit_id,check_in,check_out,guests,subtotal_paise,gst_paise,discount_paise,total_paise,promo_code,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now()+interval '10 minutes') RETURNING *, check_in::text AS check_in_date, check_out::text AS check_out_date`,
    [user.sub,idempotencyKey||null,quote.roomTypeId,unit.id,quote.checkIn,quote.checkOut,quote.guests,quote.subtotalPaise,quote.gstPaise,quote.discountPaise,quote.totalPaise,quote.promoCode]);
   for(const day of days)await client.query(`INSERT INTO room_nights(room_unit_id,stay_date,origin,hold_id) VALUES($1,$2,'DIRECT',$3)`,[unit.id,day,q.rows[0].id]);
   return {...normalizeHoldDateFields(q.rows[0]),quote};
  },true);
 }
 /** Read-only, user-owned status for the guest checkout countdown. Never mutates a hold. */
 async getHold(user:any,id:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
   throw new BadRequestException('Invalid hold id');
  const result=await this.db.query(`SELECT h.id,h.room_type_id,h.guests,h.total_paise,
    h.check_in::text AS check_in,h.check_out::text AS check_out,h.expires_at,
    CASE WHEN h.status='CANCELLED' THEN 'CANCELLED'
         WHEN h.status='CONFIRMED' THEN 'CONFIRMED'
         WHEN h.status='HELD' AND h.expires_at>now() THEN 'ACTIVE'
         ELSE 'EXPIRED' END AS effective_status,
    CASE WHEN h.status='HELD' AND h.expires_at>now()
         THEN greatest(0,floor(extract(epoch FROM h.expires_at-now())))::int
         ELSE 0 END AS remaining_seconds
    FROM booking_holds h WHERE h.id=$1 AND h.user_id=$2`,[id,user.sub]);
  if(!result.rows[0])throw new NotFoundException('Hold not found');
  return holdView(result.rows[0]);
 }
 async pay(user:any,b:any,idempotencyKey:string){
  if(!idempotencyKey||idempotencyKey.length<8||idempotencyKey.length>100)throw new BadRequestException('Idempotency-Key header required (8-100 characters)');
  const holdId=String(b.holdId||'');
  if(!['SUCCESS','FAILURE'].includes(b.outcome))throw new BadRequestException('outcome must be SUCCESS or FAILURE');
  if(b.outcome==='FAILURE')return {status:'DECLINED',simulation:true,message:'Simulated payment declined; no booking created'};
  return this.db.transaction(async client=>{
   await cleanExpired(client);
   const previous=await client.query(`SELECT b.*,p.idempotency_key FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.idempotency_key=$1`,[idempotencyKey]);
   if(previous.rows[0]){
    const b0=previous.rows[0];if(b0.hold_id!==holdId || b0.user_id!==user.sub)throw new ConflictException('Idempotency key already used for different booking');
    return {bookingId:b0.id,reference:b0.reference,status:b0.status,replayed:true,simulation:true};
   }
   const q=await client.query(`SELECT * FROM booking_holds WHERE id=$1 FOR UPDATE`,[holdId]);const hold=q.rows[0];
   if(!hold)throw new NotFoundException('Hold not found');
   if(hold.user_id!==user.sub)throw new ForbiddenException();
   if(hold.status!=='HELD' || new Date(hold.expires_at).getTime()<=Date.now())throw new ConflictException('Hold expired or already confirmed');
   if(hold.promo_code){const promo=await client.query(`UPDATE promo_codes SET uses=uses+1 WHERE code=$1 AND uses<max_uses RETURNING code`,[hold.promo_code]);if(!promo.rows[0])throw new ConflictException('Promo code exhausted; recreate the quote and hold');}
   const details=b.guestDetails||{};
   const name=String(details.name||'').trim();
   const phone=String(details.phone||'').trim();
   const requests=String(details.requests||'').trim();
   if(details.name!==undefined && (name.length<2||name.length>100))throw new BadRequestException('Valid guest name is required');
   if(details.phone!==undefined && (phone.length<8||phone.length>24||!/^[+0-9() -]+$/.test(phone)))throw new BadRequestException('Invalid guest phone number');
   if(requests.length>1000)throw new BadRequestException('Special requests too long');
   const reference='EF-'+randomBytes(5).toString('hex').toUpperCase();
   const bk=await client.query(`INSERT INTO bookings(user_id,hold_id,reference,total_paise,status,guest_name,guest_phone,guest_requests) VALUES($1,$2,$3,$4,'CONFIRMED',$5,$6,$7) RETURNING *`,[user.sub,holdId,reference,hold.total_paise,name||null,phone||null,requests||null]);
   await client.query(`UPDATE booking_holds SET status='CONFIRMED' WHERE id=$1`,[holdId]);
   await client.query(`INSERT INTO payments(booking_id,idempotency_key,mock_reference,amount_paise,status) VALUES($1,$2,$3,$4,'SUCCEEDED')`,[bk.rows[0].id,idempotencyKey,'MOCK-'+randomBytes(5).toString('hex').toUpperCase(),hold.total_paise]);
   return {bookingId:bk.rows[0].id,reference,status:'CONFIRMED',simulation:true,totalPaise:hold.total_paise};
  },true);
 }
 /** Cancel a confirmed MOCK-paid booking and release its room-night rows as one atomic operation.
  * Resort-local (Asia/Kolkata) check-in date is the cutoff for ALL roles in this MVP.
  * No real refund is issued or represented as complete. */
 async cancel(user:any,id:string,body:any={}){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
   throw new BadRequestException('Invalid booking id');
  let reasonCode: ReturnType<typeof cancellationReason>;
  try{reasonCode=cancellationReason(body?.reasonCode,user.role);}
  catch(e:any){throw new BadRequestException(e.message);}
  return this.db.transaction(async client=>{
   const q=await client.query(`SELECT b.id,b.user_id,b.hold_id,b.reference,b.status,
     h.check_in::text AS check_in,h.check_out::text AS check_out
     FROM bookings b JOIN booking_holds h ON h.id=b.hold_id
     WHERE b.id=$1 FOR UPDATE OF b, h`,[id]);
   const booking=q.rows[0];if(!booking)throw new NotFoundException('Booking not found');
   if(booking.user_id!==user.sub && !['STAFF','GM'].includes(user.role))throw new ForbiddenException();
   if(booking.status==='CANCELLED')return cancellationView(id,booking.reference,true,0);
   if(booking.status!=='CONFIRMED')throw new ConflictException('Booking cannot be cancelled in this state');
   const date=await client.query(`SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS today`);
   if(!beforeCheckIn(booking.check_in,date.rows[0].today))
    throw new ConflictException('Booking cancellation is only allowed before check-in');
   const nights=stayDates(booking.check_in,booking.check_out);
   const released=await client.query(`DELETE FROM room_nights WHERE hold_id=$1 AND origin='DIRECT' RETURNING stay_date::text`,[booking.hold_id]);
   if(released.rowCount!==nights.length || released.rows.some(r=>!nights.includes(r.stay_date)))
    throw new ConflictException('Booking inventory inconsistent; cancellation rolled back for staff review');
   await client.query(`UPDATE bookings SET status='CANCELLED',cancelled_at=now(),cancelled_by=$2,cancellation_reason_code=$3
      WHERE id=$1`,[id,user.sub,reasonCode]);
   await client.query(`UPDATE booking_holds SET status='CANCELLED' WHERE id=$1`,[booking.hold_id]);
   await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta)
      VALUES($1,'BOOKING_CANCELLED',$2,$3::jsonb)`,[user.sub,id,JSON.stringify({reference:booking.reference,reasonCode,roomNightsReleased:nights.length,refund:'NOT_PROCESSED'})]);
   return cancellationView(id,booking.reference,false,nights.length);
  },true);
 }
 async myBookings(user:any){return (await this.db.query(`SELECT b.id,b.reference,b.total_paise,b.status,b.guest_name,b.guest_phone,
    h.guests,h.room_type_id,h.check_in::text AS check_in,h.check_out::text AS check_out,t.name AS room_type
    FROM bookings b JOIN booking_holds h ON b.hold_id=h.id JOIN room_types t ON h.room_type_id=t.id
    WHERE b.user_id=$1 ORDER BY b.created_at DESC`,[user.sub])).rows;}
 async byReference(user:any,reference:string){
  if(!/^EF-[0-9A-F]{10}$/.test(reference))throw new BadRequestException('Invalid booking reference');
  const q=await this.db.query(`SELECT b.id,b.reference,b.total_paise,b.status,b.guest_name,b.guest_phone,b.guest_requests,
   b.created_at,h.room_type_id,h.guests,h.check_in::text AS check_in,h.check_out::text AS check_out,
   h.subtotal_paise,h.discount_paise,h.gst_paise,h.promo_code,t.name AS room_type,u.display_name AS account_name
   FROM bookings b JOIN booking_holds h ON b.hold_id=h.id JOIN room_types t ON t.id=h.room_type_id
   JOIN users u ON u.id=b.user_id WHERE b.reference=$1 AND b.user_id=$2`,[reference,user.sub]);
  if(!q.rows[0])throw new NotFoundException('Booking not found for this account');return q.rows[0];
 }
 async one(user:any,id:string){const q=await this.db.query(`SELECT b.*,h.check_in::text,h.check_out::text,h.guests,t.name AS room_type FROM bookings b JOIN booking_holds h ON b.hold_id=h.id JOIN room_types t ON h.room_type_id=t.id WHERE b.id=$1`,[id]);const b=q.rows[0];if(!b)throw new NotFoundException();if(b.user_id!==user.sub && user.role==='GUEST')throw new ForbiddenException();return b;}
}
@Controller()
@UseGuards(AuthGuard)
export class BookingsController {
 constructor(private readonly service:BookingsService){}
 @Post('booking-holds') hold(@CurrentUser() u:any,@Body() b:any,@Headers('idempotency-key') key?:string){return this.service.hold(u,b||{},key);}
 @Get('booking-holds/:id') holdStatus(@CurrentUser() u:any,@Param('id') id:string){return this.service.getHold(u,id);}
 @Post('payments/mock/confirm') pay(@CurrentUser() u:any,@Body() b:any,@Headers('idempotency-key') key?:string){return this.service.pay(u,b||{},key||'');}
 @Post('bookings/:id/cancel') cancel(@CurrentUser() u:any,@Param('id') id:string,@Body() body:any){return this.service.cancel(u,id,body||{});}
 @Get('bookings') list(@CurrentUser() u:any){return this.service.myBookings(u);}
 @Get('bookings/reference/:reference') byReference(@CurrentUser() u:any,@Param('reference') reference:string){return this.service.byReference(u,reference);}
 @Get('bookings/:id') one(@CurrentUser() u:any,@Param('id') id:string){return this.service.one(u,id);}
}
