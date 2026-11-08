/** Read-only cancellation audit. Use on your own database; does not expose guest contact details. */
import 'dotenv/config';
import {Pool} from 'pg';
const pool=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),
 database:process.env.DB_NAME||'estateflow',user:process.env.DB_USER||'rishabh',password:process.env.DB_PASSWORD||undefined});
(async()=>{
 try{
  const q=await pool.query(`SELECT b.reference,b.status,b.cancellation_reason_code,
    b.cancelled_at,u.role AS cancelled_by_role,
    (SELECT count(*)::int FROM audit_logs a WHERE a.entity_id=b.id AND a.action='BOOKING_CANCELLED') AS audit_events,
    (SELECT count(*)::int FROM room_nights n WHERE n.hold_id=b.hold_id) AS remaining_room_nights
   FROM bookings b LEFT JOIN users u ON u.id=b.cancelled_by
   WHERE b.status='CANCELLED' ORDER BY b.cancelled_at DESC LIMIT 25`);
  console.table(q.rows);
  if(q.rows.some(r=>r.audit_events!==1||r.remaining_room_nights!==0)){
    console.error('Cancellation audit discrepancy: investigate the rows above.');process.exitCode=1;
  } else console.log(`PASS: ${q.rows.length} recent cancelled bookings have audit records and no reserved room nights`);
 }finally{await pool.end();}
})().catch(e=>{console.error('Cancellation audit failed',e);process.exitCode=1;});
