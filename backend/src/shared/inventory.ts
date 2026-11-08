import { ConflictException, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { stayDates } from './validation';
import { directAvailableUnits } from './capacity';
export async function cleanExpired(client:PoolClient):Promise<number> {
  const expired=await client.query<{id:string}>(`UPDATE booking_holds SET status='EXPIRED'
     WHERE status='HELD' AND expires_at<=now() RETURNING id`);
  if(expired.rows.length) await client.query(`DELETE FROM room_nights WHERE hold_id = ANY($1::uuid[])`,[expired.rows.map(x=>x.id)]);
  return expired.rows.length;
}
export async function availableRooms(client:PoolClient,roomTypeId:string,checkIn:string,checkOut:string,mode:'DIRECT'|'EVENT'='DIRECT') {
  const days=stayDates(checkIn,checkOut);
  const inv=await client.query<{stay_date:string; website_allotment:number; blacked_out:boolean; direct_used:string}>(`
    SELECT i.stay_date::text, i.website_allotment, i.blacked_out,
     (SELECT count(*) FROM room_nights n JOIN room_units u ON n.room_unit_id=u.id
      WHERE u.room_type_id=i.room_type_id AND n.stay_date=i.stay_date AND n.origin='DIRECT')::text AS direct_used
    FROM inventory_days i
    WHERE i.room_type_id=$1 AND i.stay_date = ANY($2::date[]) ORDER BY i.stay_date`,[roomTypeId,days]);
  if(inv.rows.length!==days.length) throw new NotFoundException('Missing seeded inventory days for requested dates');
  if(mode==='DIRECT' && directAvailableUnits(Number.MAX_SAFE_INTEGER,inv.rows)===0)return [];
  const q=await client.query<{id:string;unit_code:string}>(`
    SELECT u.id,u.unit_code FROM room_units u
    WHERE u.room_type_id=$1 AND u.active=true
      AND NOT EXISTS (SELECT 1 FROM room_nights n WHERE n.room_unit_id=u.id AND n.stay_date=ANY($2::date[]))
    ORDER BY u.unit_code`,[roomTypeId,days]);
  // Physical availability and website allotment are DIFFERENT constraints.
  // A 12-unit allotment with 11 booked website rooms must advertise at most 1,
  // even if 40 physical rooms are otherwise empty. The same cap applies on
  // every night of the requested stay.
  if(mode==='DIRECT') {
    return q.rows.slice(0,directAvailableUnits(q.rows.length,inv.rows));
  }
  return q.rows;
}
export async function checkDirectAllotment(client:PoolClient,roomTypeId:string,date:string,newAllotment:number){
 const q=await client.query<{used:string}>(`SELECT count(*)::text AS used FROM room_nights n JOIN room_units u ON n.room_unit_id=u.id WHERE u.room_type_id=$1 AND n.stay_date=$2 AND n.origin='DIRECT'`,[roomTypeId,date]);
 if(Number(q.rows[0].used)>newAllotment)throw new ConflictException('Cannot lower allotment below already reserved website stock');
}
