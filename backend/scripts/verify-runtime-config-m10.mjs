/** Read-only production environment linter. Does not print credentials or contact the DB. */
import {pathToFileURL} from 'node:url';
export function checkRuntimeEnvironment(env){
  const errors=[];
  const prod=env.NODE_ENV==='production';
  const secret=env.JWT_SECRET||'';
  if(secret.length<32||/REPLACE|PLACEHOLDER|CHANGE_ME|YOUR_OWN|EXAMPLE/i.test(secret)||/^(.)\1+$/.test(secret))errors.push('Missing, weak or placeholder JWT_SECRET');
  const origins=(env.CORS_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!origins.length)errors.push('Set explicit CORS_ORIGIN');
  if(prod){
    if(origins.some(x=>{try{const u=new URL(x);return u.protocol!=='https:'||u.origin!==x||Boolean(u.username)||Boolean(u.password);}catch{return true;}}))errors.push('Production CORS origins must be valid explicit HTTPS origins (no wildcards, paths or HTTP)');
    if(!env.DB_PASSWORD)errors.push('Production DB_PASSWORD is required');
    if((env.DB_NAME||'').toLowerCase().includes('test'))errors.push('Production cannot target a test database');
    if(!env.DB_HOST)errors.push('Production DB_HOST is required');
  }
  return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  await import('dotenv/config');
  const errors=checkRuntimeEnvironment(process.env);
  for(const e of errors)console.error('FAIL:',e);
  if(errors.length)process.exitCode=1;
  else console.log('PASS: EstateFlow environment settings meet local/production policy for NODE_ENV='+String(process.env.NODE_ENV||'development'));
  if(process.env.NODE_ENV==='production')console.log('NOTE: This linter does not establish production-grade rate limiting, HTTPS termination or DB backup configuration.');
}
