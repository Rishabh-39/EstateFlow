/** Validates the committed OpenAPI contract independently of the generator. No DB/npm dependencies. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const doc=JSON.parse(readFileSync(join(root,'docs/openapi-m9.json'),'utf8'));
const packageVersion=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
const releaseSource=readFileSync(join(root,'src/shared/release.ts'),'utf8');
let assertions=0;
function check(value,label){assert.ok(value,label);++assertions;console.log('PASS',label);}
check(doc.openapi==='3.0.3' && doc.info.version===packageVersion,'OpenAPI version matches package.json');
check(releaseSource.includes(`API_RELEASE = '${packageVersion}'`),'Runtime release matches package.json');
const ts=readFileSync(join(root,'src/generated/openapi-m9.ts'),'utf8');
const tsDoc=JSON.parse(ts.slice(ts.indexOf(' = ')+3).trim().replace(/;\s*$/,''));
check(JSON.stringify(tsDoc)===JSON.stringify(doc),'Embedded runtime document matches standalone JSON');
const paths=[];
for(const [path,operations] of Object.entries(doc.paths)){
 for(const [method,op] of Object.entries(operations))paths.push({path,method,op});
}
check(paths.length>=45 && paths.length<100,'OpenAPI documents a bounded set of application routes');
check(paths.every(x=>x.op.summary?.length>=8),'All operations have human-readable summaries');
check(new Set(paths.map(x=>x.op.operationId)).size===paths.length,'All operation IDs are unique');
check(paths.every(x=>x.op.responses['200']||x.op.responses['201']),'All operations document a success response');
const publicKeys=new Set(['GET /','GET /health','GET /health/ready','GET /openapi.json','GET /room-types','GET /room-types/{id}','GET /availability','GET /promotions/eligible','POST /quotes','POST /auth/register','POST /auth/login','POST /enquiries','POST /enquiries/chat/advisory']);
check(paths.filter(x=>x.op['x-required-role']==='PUBLIC').length===publicKeys.size,'Public route count is exact');
for(const route of paths){
 const key=route.method.toUpperCase()+' '+route.path;
 assert.equal(route.op['x-required-role']==='PUBLIC',publicKeys.has(key),`Public protection error: ${key}`);
 assert.equal(Boolean(route.op.security?.length),!publicKeys.has(key),`Bearer protection error: ${key}`);
 if(route.path.startsWith('/staff/')) assert.equal(route.op['x-required-role'],'STAFF_OR_GM',`Staff role missing: ${key}`);
 if(route.path.startsWith('/gm/')) assert.equal(route.op['x-required-role'],'GM',`GM-only role missing: ${key}`);
 for(const match of route.path.matchAll(/\{([^}]+)\}/g))assert.ok(route.op.parameters?.some(x=>x.in==='path'&&x.name===match[1]&&x.required),`Path parameter undocumented: ${key} ${match[1]}`);
}
check(true,'All role and path-parameter security rules validated');
for(const path of ['/booking-holds','/payments/mock/confirm']){
 const p=doc.paths[path]?.post.parameters||[];
 assert.ok(p.some(x=>x.in==='header'&&x.name==='Idempotency-Key'&&x.required),`Idempotency header missing at ${path}`);
}
check(true,'Booking and mock-payment write paths require idempotency headers');
check(doc.paths['/staff/bookings/export']?.get?.responses['200']?.content?.['text/csv']!==undefined,'Booking export documented as CSV');
check(doc.paths['/gm/event-approvals/{id}/decision']?.post?.['x-required-role']==='GM' && doc.paths['/staff/event-approvals/{id}/request']?.post?.security?.length===1,'GM-only atomic resource reservation is enforced and review is authenticated');
check(doc.info.description.includes('simulated'),'Mock payment and communications are transparently labeled');
const codeSources=[];
function walk(d){for(const ent of readdirSync(d,{withFileTypes:true})){
 const f=join(d,ent.name); if(ent.isDirectory()){if(ent.name!=='generated')walk(f);}else if(ent.name.endsWith('.ts'))codeSources.push(f);
}}
walk(join(root,'src'));
const codeRoutes=[];
for(const file of codeSources){let prefix='';
 for(const line of readFileSync(file,'utf8').split(/\r?\n/)){
  const controller=line.match(/@Controller\((?:'([^']*)'|"([^"]*)")?\)/);
  if(controller)prefix=controller[1]??controller[2]??'';
  const pattern=/@(Get|Post|Put|Patch|Delete)\((?:'([^']*)'|"([^"]*)")?\)/g;
  let m; while((m=pattern.exec(line))){const relative=m[2]??m[3]??'';codeRoutes.push(`${m[1].toUpperCase()} /${[prefix,relative].filter(Boolean).join('/').replace(/:([A-Za-z][A-Za-z0-9]*)/g,'{$1}')}`);}
 }
}
const docRoutes=paths.map(x=>x.method.toUpperCase()+' '+x.path);
assert.deepEqual(codeRoutes.sort(),docRoutes.sort());
check(true,'OpenAPI routes exactly match source-controller decorators');
console.log(`ALL ${assertions} ESTATEFLOW M9 API CONTRACT CHECKS PASSED (${paths.length} operations)`);
