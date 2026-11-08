/** Read-only local readiness check. Never changes databases or prints credentials. */
import 'dotenv/config';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import pg from 'pg';

const failures=[];
const check=(pass,label)=>{console.log(`${pass?'PASS':'FAIL'}: ${label}`);if(!pass)failures.push(label)};
const [major,minor]=process.versions.node.split('.').map(Number);
check(major>20 || (major===20 && minor>=19),'Node.js 20.19+ installed');
const secret=process.env.JWT_SECRET||'';
check(secret.length>=32 && !/REPLACE|YOUR_OWN|CHANGE_ME|EXAMPLE|PLACEHOLDER|^0+$|^a+$/i.test(secret),'Non-placeholder JWT_SECRET of at least 32 characters');
const model=resolve(process.cwd(),process.env.AGENT_MODEL_PATH||'model/resort-intent-model.json');
let validModel=false;
try{const m=JSON.parse(readFileSync(model,'utf8'));validModel=Array.isArray(m.labels)&&m.labels.length>=5 && Number(m.sampleCount)>=100;}catch{}
check(existsSync(model)&&validModel,'Local trained enquiry model is readable');
const dbName=process.env.DB_NAME||'estateflow';
console.log(`Database target: ${process.env.DB_USER||'rishabh'}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||'5432'}/${dbName}`);
const client=new pg.Client({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:dbName,user:process.env.DB_USER||'rishabh',password:process.env.DB_PASSWORD||undefined,connectionTimeoutMillis:3000});
try {
 await client.connect();
 const db=await client.query('SELECT current_database() AS db,current_user AS db_user');
 check(db.rows[0]?.db===dbName,'Connected to intended PostgreSQL database');
 const schema=await client.query(`SELECT to_regclass('public.users') AS users,to_regclass('public.resource_slots') AS resource_slots,to_regclass('public.booking_holds') AS holds`);
 check(Boolean(schema.rows[0]?.users&&schema.rows[0]?.resource_slots&&schema.rows[0]?.holds),'Required schema tables exist (migrations applied)');
} catch(err) {
 check(false,`PostgreSQL reachable: ${(err instanceof Error?err.message:String(err)).replace(/password[^,]*/ig,'credentials redacted')}`);
} finally {await client.end().catch(()=>{});}
if(failures.length){console.error(`Preflight failed ${failures.length} check(s). Fix the configuration before E2E.`);process.exitCode=1;}
else console.log('EstateFlow local preflight PASSED.');
