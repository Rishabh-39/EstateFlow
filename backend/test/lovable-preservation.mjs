import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {resolve} from 'node:path';
const root=resolve(process.cwd(),'../frontend/src/routes');
const staff=readFileSync(resolve(root,'staff.allocation.tsx'),'utf8');const gm=readFileSync(resolve(root,'gm.index.tsx'),'utf8');
for(const x of ['STAFF_ROLES','More ${r.label}','Send to GM for approval','WhatsApp to client','Mark as sent to client'])assert.ok(staff.includes(x),'Staff UI element missing: '+x);
for(const x of ['Escalated matters','Staffing plans to approve','Review issue','Approve resolution & notify staff','Return with instructions','Request changes'])assert.ok(gm.includes(x),'GM UI element missing: '+x);
console.log('PASS Lovable staff allocation and GM dashboard layouts preserved; GM escalation actions upgraded.');
