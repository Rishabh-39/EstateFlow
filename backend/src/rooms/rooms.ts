import { BadRequestException, Controller, Get, Param, Post, Query, Body, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { availableRooms, cleanExpired } from '../shared/inventory';
import { stayDates, positiveInt } from '../shared/validation';
import { PoolClient } from 'pg';
@Injectable()
export class RoomsService {
 constructor(private readonly db:DatabaseService){}
 async list(){const q=await this.db.query(`SELECT t.id,t.code,t.name,t.description,t.max_guests,t.image_url,(SELECT rate_paise FROM daily_rates dr WHERE dr.room_type_id=t.id AND dr.stay_date>=current_date ORDER BY dr.stay_date LIMIT 1) AS starting_rate_paise,count(u.id)::int AS total_units FROM room_types t LEFT JOIN room_units u ON t.id=u.room_type_id GROUP BY t.id ORDER BY t.code`);return q.rows;}
 /** Public, read-only room detail for a dedicated Lovable room page. */
 async one(id:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
   throw new BadRequestException('Invalid room type id');
  const q=await this.db.query(`SELECT t.id,t.code,t.name,t.description,t.max_guests,t.image_url,(SELECT rate_paise FROM daily_rates dr WHERE dr.room_type_id=t.id AND dr.stay_date>=current_date ORDER BY dr.stay_date LIMIT 1) AS starting_rate_paise,
    count(u.id)::int AS total_units FROM room_types t LEFT JOIN room_units u ON t.id=u.room_type_id
    WHERE t.id=$1 GROUP BY t.id`,[id]);
  if(!q.rows[0])throw new NotFoundException('Room type not found');
  return q.rows[0];
 }
 async availability(checkIn:string,checkOut:string,roomTypeId?:string,readOnly=false){
  stayDates(checkIn,checkOut);
  return this.db.transaction(async client=>{
   if(!readOnly)await cleanExpired(client);
   const q=await client.query(`SELECT id,code,name,max_guests FROM room_types WHERE ($1::uuid IS NULL OR id=$1::uuid) ORDER BY name`,[roomTypeId||null]);
   const results=[];
   for(const t of q.rows){const free=await availableRooms(client,t.id,checkIn,checkOut);results.push({roomTypeId:t.id,code:t.code,name:t.name,availableUnits:free.length,roomUnits:free.length?undefined:[],checkIn,checkOut});}
   return results;
  },!readOnly);
 }
 /** Public offers: eligibility is date- and room-specific, never reveal inactive codes. */
 async eligiblePromos(roomTypeId:string,checkIn:string,checkOut:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomTypeId))throw new BadRequestException('Invalid room type id');
  const nights=stayDates(checkIn,checkOut);
  const room=await this.db.query('SELECT id FROM room_types WHERE id=$1',[roomTypeId]);
  if(!room.rows.length)throw new NotFoundException('Room type not found');
  const q=await this.db.query(`SELECT code,discount_percent,room_type_id FROM promo_codes
    WHERE active=true AND uses<max_uses AND valid_from<=$2::date AND valid_to>=$3::date
      AND (room_type_id IS NULL OR room_type_id=$1::uuid)
    ORDER BY discount_percent DESC,code ASC LIMIT 20`,[roomTypeId,checkIn,nights[nights.length-1]]);
  return q.rows.map(p=>({code:p.code,discountPercent:p.discount_percent,roomTypeId:p.room_type_id}));
 }
 async quote(body:any,client?:PoolClient){
   const roomTypeId=String(body.roomTypeId||''); const guests=positiveInt(body.guests,'guests',20);
   const nights=stayDates(String(body.checkIn||''),String(body.checkOut||''));
   const query=(sql:string,p:unknown[])=>client?client.query(sql,p):this.db.query(sql,p);
   const room=await query(`SELECT id,max_guests FROM room_types WHERE id=$1`,[roomTypeId]);
   if(!room.rows[0])throw new NotFoundException('Room type not found');
   if(guests>room.rows[0].max_guests)throw new BadRequestException('Guest count exceeds capacity');
   const rows=await query(`SELECT stay_date::text AS date,rate_paise,gst_basis_points FROM daily_rates WHERE room_type_id=$1 AND stay_date=ANY($2::date[]) ORDER BY stay_date`,[roomTypeId,nights]);
   if(rows.rows.length!==nights.length)throw new NotFoundException('Rates are not configured for every night');
   let promo:any=null;
   if(body.promoCode){const code=String(body.promoCode).trim().toUpperCase();const p=await query(`SELECT * FROM promo_codes WHERE code=$1 AND valid_from<=$2 AND valid_to>=$3 AND uses<max_uses AND active=true AND (room_type_id IS NULL OR room_type_id=$4::uuid)`,[code,body.checkIn,nights[nights.length-1],roomTypeId]);if(!p.rows[0])throw new BadRequestException('Invalid or exhausted promo code');promo=p.rows[0];}
   const rateLines=rows.rows.map((r:any)=>{
    const discountPaise=promo?Math.round(r.rate_paise*promo.discount_percent/100):0;
    const discountedBase=r.rate_paise-discountPaise;
    const gstPaise=Math.round(discountedBase*r.gst_basis_points/10000);
    return {date:r.date,basePaise:r.rate_paise,discountPaise,gstBasisPoints:r.gst_basis_points,gstPaise,totalPaise:discountedBase+gstPaise};
   });
   const sum=(k:string)=>rateLines.reduce((s:any,r:any)=>s+r[k],0);
   return {roomTypeId,checkIn:body.checkIn,checkOut:body.checkOut,guests,promoCode:promo?.code||null,lines:rateLines,subtotalPaise:sum('basePaise'),discountPaise:sum('discountPaise'),gstPaise:sum('gstPaise'),totalPaise:sum('totalPaise'),currency:'INR'};
 }
}
@Controller()
export class RoomsController {
 constructor(private readonly service:RoomsService){}
 @Get('room-types') list(){return this.service.list();}
 @Get('room-types/:id') one(@Param('id') id:string){return this.service.one(id);}
 @Get('availability') availability(@Query() q:any){return this.service.availability(q.checkIn,q.checkOut,q.roomTypeId);}
 @Get('promotions/eligible') offers(@Query() q:any){return this.service.eligiblePromos(q.roomTypeId,q.checkIn,q.checkOut);}
 @Post('quotes') quote(@Body() b:any){return this.service.quote(b||{});}
}
