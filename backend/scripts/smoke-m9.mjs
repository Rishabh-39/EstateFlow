/** Read-only API smoke tests; NO booking, login or database mutations. */
import { readFileSync } from 'node:fs';
const expectedVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const base=(process.env.API_BASE_URL||'http://127.0.0.1:4000').replace(/\/$/,'');
let n=0;
async function get(path){const r=await fetch(base+path,{headers:{Accept:'application/json','X-Request-ID':'FORGED_BY_CALLER'}});const data=await r.json();if(!r.ok)throw new Error(`GET ${path}: ${r.status} ${JSON.stringify(data).slice(0,240)}`);return {data,headers:r.headers};}
function check(v,label){if(!v)throw new Error('FAILED '+label);n++;console.log('PASS',label);}
try{
 console.log('EstateFlow M9 read-only API smoke test:',base);
 const root=await get('/');
 check(root.data.service==='EstateFlow API'&&root.data.version===expectedVersion,`Root serves EstateFlow API v${expectedVersion} (received ${root.data.version ?? 'unknown'}; restart the correct backend if stale)`);
 check(root.data.routes.openapi==='/openapi.json','Root advertises live API documentation');
 const spec=await get('/openapi.json');
 check(spec.data.openapi==='3.0.3'&&spec.data.info.version===expectedVersion,`OpenAPI JSON matches v${expectedVersion} (received ${spec.data.info?.version ?? 'unknown'})`);
 check(Object.keys(spec.data.paths).length>=40,'API contract enumerates the shipped routes');
 check(spec.data.paths['/staff/events/{id}/reserve']?.post.security?.length===1,'Atomic event reservation documented as authenticated');
 check(spec.data.paths['/staff/enquiries/{id}/ai-process']?.post?.['x-required-role']==='STAFF_OR_GM','AI processing is staff-only');
 const health=await get('/health');
 check(health.data.status==='ok'&&health.data.version===expectedVersion,`Health route uses v${expectedVersion} (received ${health.data.version ?? 'unknown'})`);
 check(/^[0-9a-f-]{36}$/i.test(root.headers.get('x-request-id')||'')&&root.headers.get('x-request-id')!=='FORGED_BY_CALLER','Server generates a trace ID, not caller-supplied text');
 check(root.headers.get('x-request-id')!==spec.headers.get('x-request-id'),'Each request receives a distinct trace ID');
 const ready=await get('/health/ready');
 check(ready.data.database==='reachable','PostgreSQL readiness is healthy');
 const rooms=await get('/room-types');
 check(Array.isArray(rooms.data)&&rooms.data.length>0,'Seeded room types can be read');
 console.log(`ALL ${n} M9 API SMOKE CHECKS PASSED`);
}catch(e){console.error('M9 SMOKE FAILED:',e.message);process.exitCode=1;}
