/** Safe local pg_dump backup to ignored backups/ only. Never alters a database. */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, unlinkSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { validateDemoTarget, validateBackupFilename } from './m12-operations-core.mjs';

const root=process.cwd();
const dryRun=process.argv.includes('--dry-run');
const outputArg=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length);
try{
  validateDemoTarget(process.env,'Local demo backup');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const path=validateBackupFilename(outputArg || `backups/estateflow-${stamp}.dump`, root);
  if(existsSync(path))throw new Error('Refusing to overwrite an existing backup');
  const args=['--host',process.env.DB_HOST||'localhost','--port',String(process.env.DB_PORT||5432),
              '--username',process.env.DB_USER||'rishabh','--dbname','estateflow',
              '--format=custom','--no-owner','--no-acl','--file',path];
  if(dryRun){
    console.log('DRY RUN: pg_dump will back up only the LOCAL estateflow database to an ignored file in backups/.');
    console.log('No database modification or backup file was performed.');
  } else {
    // Private archive from the first byte, not only after pg_dump exits.
    process.umask(0o077);
    mkdirSync(join(root,'backups'),{recursive:true,mode:0o700});
    const status=await new Promise((resolveStatus,reject)=>{
      const child=spawn('pg_dump',args,{stdio:['ignore','ignore','pipe'],env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD||''}});
      let error='';child.stderr.on('data',chunk=>{error+=String(chunk).slice(0,400);});
      child.on('error',reject);child.on('exit',code=>resolveStatus({code,error}));
    });
    if(status.code!==0){if(existsSync(path))unlinkSync(path);throw new Error(`pg_dump failed (exit ${status.code}). Verify PostgreSQL client tools and local access; details: ${status.error.replaceAll(process.env.DB_PASSWORD||'__NO_PASSWORD__','[REDACTED]')}`);}
    if(!existsSync(path)||statSync(path).size===0)throw new Error('pg_dump returned no backup bytes');
    chmodSync(path,0o600);
    console.log(`Local database backup created: ${path} (${statSync(path).size} bytes). Keep private; it may contain guest contact information.`);
    console.log('To inspect: pg_restore --list <backup-file>. Restore only into a new EMPTY local database.');
  }
}catch(error){console.error('Backup operation blocked/failed:',error.message);process.exitCode=1;}
