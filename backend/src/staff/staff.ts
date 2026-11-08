import { Injectable, Controller, Get, Put, Patch, Post, Param, Query, Body, UseGuards, BadRequestException, NotFoundException, ConflictException, Res } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { AuthGuard, StaffGuard, CurrentUser } from '../auth/auth';
import { ensureDate, nonnegativeInt } from '../shared/validation';
import { checkDirectAllotment } from '../shared/inventory';
import { validateCalendarWindow, calendarView, CalendarRow } from '../shared/frontdesk-contract';
@Injectable()
export class StaffService {
 constructor(private readonly db:DatabaseService){}
 async overview(date:string){
  ensureDate(date);
  const q=await this.db.query(`SELECT
   (SELECT count(*)::int FROM enquiries WHERE status='OPEN') AS open_enquiries,
   (SELECT count(*)::int FROM enquiries WHERE routing_lane='GM_ESCALATION') AS gm_escalations,
   (SELECT count(*)::int FROM enquiries WHERE routing_lane='UNSORTED') AS unsorted_enquiries,
   (SELECT count(*)::int FROM event_requests WHERE status='PROPOSED') AS proposed_events,
   (SELECT count(*)::int FROM event_requests WHERE status='RESERVED') AS reserved_events,
   (SELECT count(*)::int FROM bookings b JOIN booking_holds h ON b.hold_id=h.id
      WHERE b.status='CONFIRMED' AND h.check_in=$1::date) AS arrivals,
   (SELECT count(*)::int FROM bookings b JOIN booking_holds h ON b.hold_id=h.id
      WHERE b.status='CONFIRMED' AND h.check_out=$1::date) AS departures`,[date]);
  return {date,counts:q.rows[0],asOf:new Date().toISOString()};
 }
 async inventory(start:string,end:string){ensureDate(start);ensureDate(end);return (await this.db.query(`SELECT i.room_type_id,t.name,i.stay_date::text AS date,i.website_allotment,i.blacked_out, (SELECT count(*)::int FROM room_nights n JOIN room_units u ON n.room_unit_id=u.id WHERE u.room_type_id=i.room_type_id AND n.stay_date=i.stay_date AND n.origin='DIRECT') AS website_used FROM inventory_days i JOIN room_types t ON i.room_type_id=t.id WHERE i.stay_date BETWEEN $1 AND $2 ORDER BY i.stay_date,t.name LIMIT 500`,[start,end])).rows;}
 async updateInventory(user:any,roomTypeId:string,date:string,b:any){ensureDate(date);const allot=nonnegativeInt(b.websiteAllotment,'websiteAllotment',76);if(typeof b.blackedOut!=='boolean')throw new BadRequestException('blackedOut must be boolean');return this.db.transaction(async client=>{
  if(allot>0){
   const price=await client.query(`SELECT rate_paise FROM daily_rates WHERE room_type_id=$1 AND stay_date=$2`,[roomTypeId,date]);
   if(!price.rows[0] || Number(price.rows[0].rate_paise)<=0)throw new ConflictException('Configure a positive nightly rate before enabling website allotment');
  }
  await checkDirectAllotment(client,roomTypeId,date,allot);const q=await client.query(`UPDATE inventory_days SET website_allotment=$3,blacked_out=$4 WHERE room_type_id=$1 AND stay_date=$2 RETURNING room_type_id,stay_date::text AS date,website_allotment,blacked_out`,[roomTypeId,date,allot,b.blackedOut]);if(!q.rows[0])throw new NotFoundException('Inventory date missing');const total=await client.query(`SELECT count(*)::int AS n FROM room_units WHERE room_type_id=$1`,[roomTypeId]);if(allot>total.rows[0].n)throw new ConflictException('Website allotment cannot exceed physical room count');await client.query(`INSERT INTO audit_logs(actor_id,action,meta) VALUES($1,'INVENTORY_UPDATED',$2)`,[user.sub,JSON.stringify({roomTypeId,date,allot,blackedOut:b.blackedOut})]);return q.rows[0];},true);}
 async rates(start:string,end:string){ensureDate(start);ensureDate(end);return (await this.db.query(`SELECT r.room_type_id,t.name,r.stay_date::text AS date,r.rate_paise,r.gst_basis_points FROM daily_rates r JOIN room_types t ON r.room_type_id=t.id WHERE r.stay_date BETWEEN $1 AND $2 ORDER BY r.stay_date,t.name LIMIT 500`,[start,end])).rows;}
 async updateRate(user:any,roomTypeId:string,date:string,b:any){
  ensureDate(date);
  const rate=nonnegativeInt(b.ratePaise,'ratePaise',100000000);
  if(rate===0)throw new BadRequestException('A configured nightly rate must be greater than zero');
  const gst=nonnegativeInt(b.gstBasisPoints,'gstBasisPoints',10000);
  return this.db.transaction(async client=>{
   // A rate can only be created for a seeded inventory day; no fabricated dates.
   const q=await client.query(`INSERT INTO daily_rates (room_type_id,stay_date,rate_paise,gst_basis_points)
    SELECT room_type_id,stay_date,$3,$4 FROM inventory_days WHERE room_type_id=$1 AND stay_date=$2
    ON CONFLICT (room_type_id,stay_date) DO UPDATE SET rate_paise=EXCLUDED.rate_paise,gst_basis_points=EXCLUDED.gst_basis_points
    RETURNING room_type_id,stay_date::text AS date,rate_paise,gst_basis_points`,[roomTypeId,date,rate,gst]);
   if(!q.rows[0])throw new NotFoundException('Inventory date missing');
   await client.query(`INSERT INTO audit_logs(actor_id,action,meta) VALUES($1,'RATE_UPDATED',$2)`,[user.sub,JSON.stringify({roomTypeId,date,rate,gst})]);
   return q.rows[0];
  },true);
 }
 async promoList(){return (await this.db.query(`SELECT code,discount_percent,valid_from::text AS valid_from,
   valid_to::text AS valid_to,max_uses,uses,active,room_type_id FROM promo_codes ORDER BY code`)).rows;}
 async promoUpdate(user:any,code:string,b:any){
  const updates:string[]=[];const args:any[]=[code];
  if(b.active!==undefined){if(typeof b.active!=='boolean')throw new BadRequestException('active must be boolean');args.push(b.active);updates.push(`active=$${args.length}`);}
  if(b.discountPercent!==undefined){const percent=nonnegativeInt(b.discountPercent,'discountPercent',100);if(percent<1)throw new BadRequestException('Discount must be between 1 and 100');args.push(percent);updates.push(`discount_percent=$${args.length}`);}
  if(Object.prototype.hasOwnProperty.call(b,'roomTypeId')){const roomTypeId=await this.promoScope(b.roomTypeId);args.push(roomTypeId);updates.push(`room_type_id=$${args.length}`);}
  if(updates.length===0)throw new BadRequestException('No promotion changes provided');
  return this.db.transaction(async client=>{
   const q=await client.query(`UPDATE promo_codes SET ${updates.join(',')} WHERE code=$1 RETURNING code,discount_percent,active,room_type_id`,args);
   if(!q.rows[0])throw new NotFoundException('Promo code not found');
   await client.query(`INSERT INTO audit_logs(actor_id,action,meta) VALUES($1,'PROMO_UPDATED',$2)`,[user.sub,JSON.stringify({code,changes:b})]);
   return q.rows[0];
  },true);
 }
 private async promoScope(value:any):Promise<string|null>{
  if(value===null||value===''||value===undefined)return null;
  if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new BadRequestException('Invalid room type');
  const q=await this.db.query('SELECT id FROM room_types WHERE id=$1',[value]);
  if(!q.rows[0])throw new BadRequestException('Unknown room type');
  return value;
 }
 async promo(user:any,b:any){
  const code=String(b.code||'').toUpperCase().trim();
  if(!/^[A-Z0-9_-]{3,24}$/.test(code))throw new BadRequestException('Invalid promo code');
  ensureDate(b.validFrom);ensureDate(b.validTo);
  const discount=nonnegativeInt(b.discountPercent,'discountPercent',100),max=nonnegativeInt(b.maxUses,'maxUses',100000);
  if(discount<1||max<1||b.validTo<b.validFrom)throw new BadRequestException('Invalid promo parameters');
  const roomTypeId=await this.promoScope(b.roomTypeId);
  return this.db.transaction(async client=>{
    const q=await client.query(`INSERT INTO promo_codes(code,discount_percent,valid_from,valid_to,max_uses,room_type_id)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[code,discount,b.validFrom,b.validTo,max,roomTypeId]);
    await client.query(`INSERT INTO audit_logs(actor_id,action,meta) VALUES($1,'PROMO_CREATED',$2)`,[user.sub,JSON.stringify({code,discount,roomTypeId})]);
    return q.rows[0];
  },true);
 }
 async resources(date?:string){return (await this.db.query(`SELECT r.code,r.display_name,s.id AS slot_id,s.slot_date::text AS date,s.slot_name,s.capacity,s.blocked,coalesce(sum(a.quantity),0)::int AS reserved FROM resource_types r JOIN resource_slots s ON r.id=s.resource_id LEFT JOIN resource_allocations a ON a.slot_id=s.id WHERE ($1::date IS NULL OR s.slot_date=$1::date) GROUP BY r.code,r.display_name,s.id ORDER BY s.slot_date,r.code LIMIT 600`,[date||null])).rows;}
 /** Read-only, bounded 31-day resource calendar. A missing DAY slot is NOT available. */
 async resourceCalendar(start:unknown,end:unknown){
  let range;
  try {range=validateCalendarWindow(start,end);} catch(e){throw new BadRequestException((e as Error).message);}
  const q=await this.db.query<CalendarRow>(`WITH dates AS (
     SELECT d::date AS day FROM generate_series($1::date,$2::date,'1 day'::interval) AS d
   ), usage AS (
     SELECT slot_id,sum(quantity)::int AS reserved FROM resource_allocations GROUP BY slot_id
   )
   SELECT dates.day::text AS date,rt.code,rt.display_name,
     s.id AS slot_id,s.slot_name,s.capacity,s.blocked,coalesce(usage.reserved,0)::int AS reserved
   FROM dates CROSS JOIN resource_types rt
   LEFT JOIN resource_slots s ON s.resource_id=rt.id AND s.slot_date=dates.day AND s.slot_name='DAY'
   LEFT JOIN usage ON usage.slot_id=s.id
   ORDER BY dates.day,rt.code`,[range.start,range.end]);
  return calendarView(q.rows,range.start,range.end);
 }
 async resourceCapacity(user:any,id:string,b:any){const capacity=nonnegativeInt(b.capacity,'capacity',100000);if(typeof b.blocked!=='boolean')throw new BadRequestException('blocked must be boolean');const blocked=b.blocked;return this.db.transaction(async client=>{const usage=await client.query<{used:string}>(`SELECT coalesce(sum(quantity),0)::text AS used FROM resource_allocations WHERE slot_id=$1`,[id]);if(Number(usage.rows[0].used)>capacity|| (blocked && Number(usage.rows[0].used)>0))throw new ConflictException('Capacity cannot be lowered below committed allocations');const q=await client.query(`UPDATE resource_slots SET capacity=$2,blocked=$3 WHERE id=$1 RETURNING *`,[id,capacity,blocked]);if(!q.rows[0])throw new NotFoundException();await client.query(`INSERT INTO audit_logs(actor_id,action,entity_id,meta) VALUES($1,'RESOURCE_CAPACITY_UPDATED',$2,$3)`,[user.sub,id,JSON.stringify({capacity,blocked})]);return q.rows[0];},true);}
 /** Both export formats share the *same* committed PostgreSQL booking set.
  * Event requests alone are NOT bookings. Event rows require a GM-committed bundle.
  * No event prices or room-unit assignments are fabricated. */
 async bookingPreview(date:string,mode:string='stay',kind:string='all'){
  ensureDate(date);
  if(!['stay','created'].includes(mode))throw new BadRequestException('mode must be stay or created');
  if(!['all','room','villa','event'].includes(kind))throw new BadRequestException('kind must be all, room, villa or event');
  const stayFilter=mode==='stay'
   ? `b.status='CONFIRMED' AND h.check_in<=$1::date AND h.check_out>$1::date`
   : `(b.created_at AT TIME ZONE 'Asia/Kolkata')::date=$1::date`;
  const eventFilter=mode==='stay'
   ? `er.event_date=$1::date`
   : `(rb.created_at AT TIME ZONE 'Asia/Kolkata')::date=$1::date`;
  // Keep the event and room datasets structurally identical to ensure CSV parity.
  const rows=(await this.db.query(`
   SELECT * FROM (
    SELECT b.reference,coalesce(b.guest_name,u.display_name,'Guest')::text AS guest_name,
      CASE WHEN t.code='VILLA' THEN 'Villa' ELSE 'Estate Room' END::text AS booking_type,
      t.name::text AS room_type,t.code::text AS room_code,ru.unit_code::text AS unit_code,
      h.check_in::text AS check_in,h.check_out::text AS check_out,h.guests::int AS guests,
      b.total_paise::bigint AS total_paise,b.status::text AS status,
      b.created_at::timestamptz AS created_at
    FROM bookings b JOIN booking_holds h ON h.id=b.hold_id
    JOIN room_types t ON t.id=h.room_type_id JOIN room_units ru ON ru.id=h.room_unit_id
    LEFT JOIN users u ON u.id=b.user_id
    WHERE ${stayFilter} AND ($2::text='all' OR ($2='room' AND t.code<>'VILLA') OR ($2='villa' AND t.code='VILLA'))
    UNION ALL
    SELECT ('EVT-'||upper(left(er.id::text,8)))::text AS reference,
      coalesce(NULLIF(q.contact_name,''),er.title)::text AS guest_name,
      'Event'::text AS booking_type,er.title::text AS room_type, 'EVENT'::text AS room_code,
      er.venue_code::text AS unit_code,er.event_date::text AS check_in,er.check_out::text AS check_out,
      er.guests::int AS guests,NULL::bigint AS total_paise,
      coalesce(review.status,'RESERVED_LEGACY')::text AS status,
      rb.created_at::timestamptz AS created_at
    FROM reservation_bundles rb JOIN event_requests er ON er.id=rb.event_id
    LEFT JOIN event_approval_reviews review ON review.event_id=er.id
    LEFT JOIN enquiries q ON q.id=er.enquiry_id
    WHERE er.status='RESERVED' AND ${eventFilter} AND $2::text IN ('all','event')
   ) combined ORDER BY created_at DESC,reference LIMIT 1000`,[date,kind])).rows;
  return {date,mode,kind,rows,total:rows.length,
   rooms:rows.filter(r=>r.booking_type==='Estate Room').length,
   villas:rows.filter(r=>r.booking_type==='Villa').length,
   events:rows.filter(r=>r.booking_type==='Event').length};
 }
 async bookingsCsv(date:string,mode:string='created',kind:string='all'){
  const report=await this.bookingPreview(date,mode,kind);
  const keys=['reference','guest_name','booking_type','room_type','unit_code','check_in','check_out','guests','total_paise','status','created_at'] as const;
  const esc=(x:unknown)=>'"'+String(x??'').replace(/[\r\n]+/g,' ').replace(/^([=+@\-])/,"'$1").replace(/"/g,'""')+'"';
  return [keys.join(','),...report.rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n')+'\n';
 }


}
@UseGuards(AuthGuard,StaffGuard)
@Controller('staff')
export class StaffController {
 constructor(private readonly staff:StaffService){}
 @Get('overview') overview(@Query('date') date?:string){return this.staff.overview(date||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}));}
 @Get('inventory') inventory(@Query() q:any){return this.staff.inventory(q.start,q.end);}
 @Put('inventory/:roomTypeId/days/:date') inventoryPut(@CurrentUser() user:any,@Param('roomTypeId') type:string,@Param('date') date:string,@Body() b:any){return this.staff.updateInventory(user,type,date,b||{});}
 @Get('rates') rates(@Query() q:any){return this.staff.rates(q.start,q.end);}
 @Put('rates/:roomTypeId/days/:date') ratesPut(@CurrentUser() user:any,@Param('roomTypeId') type:string,@Param('date') date:string,@Body() b:any){return this.staff.updateRate(user,type,date,b||{});}
 @Get('promo-codes') promos(){return this.staff.promoList();}
 @Patch('promo-codes/:code') promoPatch(@CurrentUser() user:any,@Param('code') code:string,@Body() b:any){return this.staff.promoUpdate(user,code,b||{});}
 @Post('promo-codes') promo(@CurrentUser() user:any,@Body() b:any){return this.staff.promo(user,b||{});}
 @Get('resources') resources(@Query('date') date?:string){return this.staff.resources(date);}
 @Get('resources/calendar') resourceCalendar(@Query('start') start?:string,@Query('end') end?:string){return this.staff.resourceCalendar(start,end);}
 @Patch('resources/:id/capacity') capacity(@CurrentUser() user:any,@Param('id') id:string,@Body() b:any){return this.staff.resourceCapacity(user,id,b||{});}
 @Get('bookings/preview') preview(@Query('date') date:string,@Query('mode') mode?:string,@Query('kind') kind?:string){return this.staff.bookingPreview(date,mode||'stay',kind||'all');}
 @Get('bookings/export') async export(@Query('date') date:string,@Query('mode') mode:string|undefined,@Query('kind') kind:string|undefined,@Res() res:Response){const csv=await this.staff.bookingsCsv(date,mode||'created',kind||'all');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="estateflow-bookings-${date}.csv"`);res.send(csv);}
}
