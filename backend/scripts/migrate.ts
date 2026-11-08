import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
const pool=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME||'estateflow',user:process.env.DB_USER||'rishabh',password:process.env.DB_PASSWORD||undefined});
(async()=>{
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // One serialized migrator: avoid partially applied multi-file schemas.
  await client.query('SELECT pg_advisory_xact_lock(73921402)');
  const files=readdirSync('sql').filter(name=>/^\d{3}_.+\.sql$/.test(name)).sort();
  for(const file of files){await client.query(readFileSync(join('sql',file),'utf8'));console.log(`Applied ${file}`);}
  await client.query('COMMIT');
  console.log(`Database migrations complete (${files.length} files)`);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
})().catch(e=>{console.error('Migration failed:',e);process.exitCode=1;});
