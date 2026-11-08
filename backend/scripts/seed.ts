import 'dotenv/config';
// Demo-only data with known example passwords. Never seed a production database.
if(process.env.NODE_ENV==='production') throw new Error('Demo seed blocked in production. Provide real accounts through an approved provisioning process.');
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
const pool=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME||'estateflow',user:process.env.DB_USER||'rishabh',password:process.env.DB_PASSWORD||undefined});
const demo=[{email:'staff@estateflow.local',name:'Reservations Staff',role:'STAFF',pass:'DemoStaff!2026'}, {email:'gm@estateflow.local',name:'Demo General Manager',role:'GM',pass:'DemoManager!2026'},{email:'guest@estateflow.local',name:'Sample Guest',role:'GUEST',pass:'DemoGuest!2026'}];
(async()=>{const client=await pool.connect();try{
 await client.query('BEGIN');
 for(const u of demo){const hash=await bcrypt.hash(u.pass,12);await client.query(`INSERT INTO users(email,password_hash,display_name,role) VALUES($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,[u.email,hash,u.name,u.role]);}
 const categories=[{code:'ESTATE',name:'Estate Room',units:64,guests:3,rate:950000,allot:12,description:'Elegant estate rooms with lush garden views.'},{code:'VILLA',name:'Plantation Villa',units:12,guests:5,rate:1650000,allot:4,description:'Private villas among the coffee trees.'}];
 for(const type of categories){const rt=await client.query(`INSERT INTO room_types(code,name,max_guests,description) VALUES($1,$2,$3,$4) ON CONFLICT(code) DO UPDATE SET name=excluded.name RETURNING id`,[type.code,type.name,type.guests,type.description]);const id=rt.rows[0].id;
 for(let i=1;i<=type.units;i++){const code=`${type.code}-${String(i).padStart(3,'0')}`;await client.query(`INSERT INTO room_units(room_type_id,unit_code) VALUES($1,$2) ON CONFLICT(unit_code) DO NOTHING`,[id,code]);}
 for(let day=0;day<540;day++){const date=new Date(Date.UTC(2026,10,1+day)).toISOString().slice(0,10);
 await client.query(`INSERT INTO inventory_days(room_type_id,stay_date,website_allotment) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[id,date,type.allot]);
 await client.query(`INSERT INTO daily_rates(room_type_id,stay_date,rate_paise,gst_basis_points) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[id,date,type.rate,1800]);
 }}
 const resources=[{code:'LAWN',name:'Wedding Lawn',capacity:1},{code:'DINING',name:'Catering capacity',capacity:300},{code:'PARKING',name:'Parking spaces',capacity:80},{code:'EVENT_STAFF',name:'Event staff day shift',capacity:14}];
 for(const r of resources){const q=await client.query(`INSERT INTO resource_types(code,display_name) VALUES($1,$2) ON CONFLICT(code) DO UPDATE SET display_name=excluded.display_name RETURNING id`,[r.code,r.name]);for(let day=0;day<540;day++){const date=new Date(Date.UTC(2026,10,1+day)).toISOString().slice(0,10);const capacity=(r.code==='PARKING'&&date==='2027-02-14')?48:r.capacity;
 await client.query(`INSERT INTO resource_slots(resource_id,slot_date,slot_name,capacity) VALUES($1,$2,'DAY',$3) ON CONFLICT DO NOTHING`,[q.rows[0].id,date,capacity]);}}
 await client.query(`INSERT INTO promo_codes(code,discount_percent,valid_from,valid_to,max_uses) VALUES('WELCOME10',10,'2026-11-01','2027-12-31',100) ON CONFLICT DO NOTHING`);
 const seeded=[
  ['ENQ-4410',"Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights",'WEDDING','Sample Wedding Planner'],
  ['ENQ-4411','Is a villa free 14-16 Nov for 2 adults and a child?','ROOM_BOOKING','Sample Guest'],
  ['ENQ-4412','Team of 45 wants a January offsite with a conference hall','CORPORATE_OFFSITE','Sample Events Contact']
 ];
 for(const [ref,msg,cat,name] of seeded){await client.query(`INSERT INTO enquiries(public_ref,source,message,contact_name,category,routing_lane) VALUES($1,'EMAIL_SIM',$2,$3,$4,'ASSIGNED') ON CONFLICT(public_ref) DO NOTHING`,[ref,msg,name,cat]);}
 const staff=(await client.query(`SELECT id FROM users WHERE email='staff@estateflow.local'`)).rows[0];
 await client.query(`INSERT INTO event_requests(title,event_date,check_in,check_out,guests,rooms_required,dining_guests,parking_spaces,event_staff,venue_code,created_by)
 SELECT 'Demo Wedding — Parking Bottleneck','2027-02-14','2027-02-13','2027-02-15',250,35,250,60,12,'LAWN',$1
 WHERE NOT EXISTS (SELECT 1 FROM event_requests WHERE title='Demo Wedding — Parking Bottleneck')`,[staff.id]);

 await client.query('COMMIT');console.log('Seeded 76 real room units, 540 days of rates/inventory, resource slots and demo users');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release();await pool.end();}})().catch(e=>{console.error('Seed failed:',e.message);process.exitCode=1;});
