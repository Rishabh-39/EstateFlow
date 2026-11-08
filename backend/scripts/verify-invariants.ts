/** Read-only PostgreSQL invariants. Run after a migration/seed or E2E test. */
import 'dotenv/config';
import { Pool } from 'pg';
const pool=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME||'estateflow',user:process.env.DB_USER||'rishabh',password:process.env.DB_PASSWORD||undefined});
const checks:[string,string][]=[
 ['No direct booking exceeds a configured nightly website allotment',`SELECT count(*)::int AS violations FROM (
   SELECT i.room_type_id,i.stay_date,i.website_allotment,count(n.room_unit_id)::int AS used
   FROM inventory_days i LEFT JOIN room_units u ON u.room_type_id=i.room_type_id
   LEFT JOIN room_nights n ON n.room_unit_id=u.id AND n.stay_date=i.stay_date AND n.origin='DIRECT'
   GROUP BY i.room_type_id,i.stay_date,i.website_allotment
   HAVING count(n.room_unit_id)>i.website_allotment
 ) x`],
 ['No pooled resource allocation exceeds configured capacity',`SELECT count(*)::int AS violations FROM (
   SELECT s.id FROM resource_slots s JOIN resource_allocations a ON s.id=a.slot_id
   GROUP BY s.id,s.capacity HAVING SUM(a.quantity)>s.capacity
 ) x`],
 ['No reserved event has an incorrect physical room quantity',`SELECT COUNT(*)::int AS violations FROM (
   SELECT e.id
   FROM event_requests e JOIN reservation_bundles b ON b.event_id=e.id
   LEFT JOIN room_nights n ON n.bundle_id=b.id
   GROUP BY e.id,e.rooms_required,e.check_in,e.check_out
   HAVING count(n.room_unit_id)<>(e.check_out-e.check_in)*e.rooms_required
      OR count(DISTINCT n.room_unit_id)<>e.rooms_required
 ) AS invalid_event_allocations`],
 ['No confirmed booking has missing room nights',`SELECT COUNT(*)::int AS violations FROM (
   SELECT b.id
   FROM bookings b
   JOIN booking_holds h ON b.hold_id=h.id
   LEFT JOIN room_nights n ON n.hold_id=h.id
   WHERE b.status='CONFIRMED'
   GROUP BY b.id,h.check_in,h.check_out
   HAVING count(n.room_unit_id)<>(h.check_out-h.check_in)
 ) AS incomplete_bookings`],
 ['No cancelled booking retains any room nights',`SELECT COUNT(*)::int AS violations FROM bookings b JOIN room_nights n ON n.hold_id=b.hold_id WHERE b.status='CANCELLED'`],
 ['No cancelled booking has a mismatched hold status',`SELECT COUNT(*)::int AS violations FROM bookings b JOIN booking_holds h ON h.id=b.hold_id WHERE b.status='CANCELLED' AND h.status<>'CANCELLED'`],
 ['No blocking resource slot contains a committed allocation',`SELECT count(*)::int AS violations FROM (
   SELECT s.id FROM resource_slots s JOIN resource_allocations a ON a.slot_id=s.id WHERE s.blocked GROUP BY s.id
 ) x`],
];
(async()=>{let failed=0;try{
 for(const [label,sql] of checks){const {rows}=await pool.query(sql);const raw=rows[0]?.violations;
  if(raw===undefined || raw===null || !Number.isInteger(Number(raw))) throw new Error(`Invariant query did not return a valid violations count: ${label}`);
  const count=Number(raw);
  console.log(`${count===0?'PASS':'FAIL'}: ${label} (${count} violations)`);if(count!==0)failed++;
 }
 if(failed)process.exitCode=1;
}finally{await pool.end();}})().catch(e=>{console.error(e);process.exitCode=1});
