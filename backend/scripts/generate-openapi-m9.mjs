/**
 * Build an OpenAPI discovery contract from the actual NestJS controller decorators.
 * No third-party packages are required. Run `npm run contract:m9` after route changes.
 * Route names are derived from code; descriptions/examples are supplemental metadata.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root=process.cwd();
const sources=[];
function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 const abs=join(dir,entry.name);
 if(entry.isDirectory())scan(abs);
 else if(entry.isFile()&&entry.name.endsWith('.ts')&&!abs.includes('/generated/'))sources.push(abs);
}}
scan(join(root,'src'));
const found=[];
for(const source of sources){
 const content=readFileSync(source,'utf8');
 let controller='';
 for(const line of content.split(/\r?\n/)){
  const c=line.match(/@Controller\((?:'([^']*)'|"([^"]*)")?\)/);
  if(c)controller=c[1]??c[2]??'';
  const pattern=/@(Get|Post|Put|Patch|Delete)\((?:'([^']*)'|"([^"]*)")?\)/g;
  let match;
  while((match=pattern.exec(line))!==null){
   const method=match[1].toLowerCase(),local=match[2]??match[3]??'';
   const path='/'+[controller,local].filter(Boolean).join('/').replace(/:([A-Za-z][A-Za-z0-9]*)/g,'{$1}');
   found.push({method,path,source:relative(root,source)});
  }
 }
}
found.sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
const methodPath=found.map(x=>`${x.method.toUpperCase()} ${x.path}`);
if(methodPath.length!==new Set(methodPath).size)throw new Error('Duplicate NestJS routes found');

const publicRoutes=new Set([
 'GET /','GET /health','GET /health/ready','GET /openapi.json',
 'GET /room-types','GET /room-types/{id}','GET /availability','GET /promotions/eligible','POST /quotes',
 'POST /auth/login','POST /auth/register','POST /enquiries','POST /enquiries/chat/advisory'
]);
const knownSummaries={
 'GET /':'API service discovery (not a frontend page)',
 'GET /health':'Liveness probe',
 'GET /health/ready':'PostgreSQL readiness probe',
 'GET /openapi.json':'OpenAPI 3.0 JSON contract',
 'POST /auth/register':'Register a guest account',
 'POST /auth/login':'Sign in and receive a bearer token',
 'GET /auth/me':'Get authenticated user',
 'GET /room-types':'List accommodation categories',
 'GET /room-types/{id}':'Get accommodation details',
 'GET /availability':'Read website allotment-backed availability for a stay',
 'GET /promotions/eligible':'List active stay- and room-eligible public promotions',
 'POST /quotes':'Calculate room quote in integer INR paise',
 'POST /booking-holds':'Reserve temporary website allotment for checkout',
 'GET /booking-holds/{id}':'Retrieve own checkout hold and expiry',
 'POST /payments/mock/confirm':'Confirm a simulated payment and booking',
 'GET /bookings':'List current guest bookings',
 'GET /bookings/reference/{reference}':'Find current guest booking by its reference',
 'GET /bookings/{id}':'Read current guest booking',
 'POST /bookings/{id}/cancel':'Cancel an eligible confirmed simulated booking and atomically release room nights; no real refund',
 'POST /enquiries':'Save or append a guest enquiry promptly; AI processing is deferred',
 'POST /enquiries/chat/advisory':'Generate optional non-binding concierge guidance after saving a chat message',
 'GET /staff/overview':'Staff operations summary',
 'GET /staff/allocations':'List persisted role-based staffing plans (not shift reservations)',
 'GET /staff/allocations/{id}':'Get staffing plan or an unsaved draft',
 'PUT /staff/allocations/{id}':'Save a proposed staffing plan with staff permission',
 'POST /staff/allocations/{id}/transition':'Submit for GM review, approve, request changes or attest manual sending',
 'PATCH /staff/enquiries/{id}/gm-return':'Legacy GM return endpoint; requires an explicit reviewed decision and GM note',
 'GET /staff/gm-escalations':'GM-only queue of escalations with complete context and reason',
 'GET /staff/gm-escalations/recent':'GM-only recent reviewed escalations and notification acknowledgement',
 'POST /staff/enquiries/{id}/gm-review':'GM approves complaint resolution or requests staff action, recording feedback and notification',
 'POST /staff/enquiries/{id}/gm-review/{decisionId}/acknowledge':'Assigned staff acknowledges received GM decision',
 'POST /staff/enquiries/{id}/escalate-complaint':'Separately escalate a guest complaint to GM without changing the event classification',
 'GET /staff/inventory':'Read website allotment by date range',
 'PUT /staff/inventory/{roomTypeId}/days/{date}':'Set daily website allotment or blackout',
 'GET /staff/rates':'Read room pricing by date',
 'PUT /staff/rates/{roomTypeId}/days/{date}':'Update daily rate',
 'POST /staff/promo-codes':'Create a promotional code',
 'GET /staff/promo-codes':'List current promotions',
 'PATCH /staff/promo-codes/{code}':'Activate or deactivate a promotion',
 'GET /staff/resources':'Read operational resource capacity',
 'GET /staff/resources/calendar':'Read resource availability calendar',
 'PATCH /staff/resources/{id}/capacity':'Update operational capacity with allocation safeguards',
 'GET /staff/bookings/export':'Export the same daily booking records as the preview in Excel-compatible CSV',
 'GET /staff/bookings/preview':'Preview daily accommodation and GM-committed event bookings, with date/type filters',
 'POST /staff/events':'Create unreserved event proposal',
 'GET /staff/events':'List and filter staff event proposals',
 'GET /staff/events/{id}':'Get event proposal',
 'GET /staff/events/{id}/requirements':'Read event resource requirement graph',
 'PUT /staff/events/{id}/requirements':'Update event requirements before reservation',
 'POST /staff/events/{id}/evaluations':'Evaluate resource feasibility without reserving',
 'GET /staff/events/{id}/alternatives':'Search verified alternative dates',
 'POST /staff/events/{id}/alternatives/select':'Propose one verified alternative without reserving',
 'GET /staff/events/{id}/bundle':'Read approved event allocations',
 'POST /staff/events/{id}/reserve':'Legacy direct reservation is denied; GM authorization required',
 'GET /staff/event-approvals/{id}':'View event GM review and guest confirmation status',
 'POST /staff/event-approvals/{id}/request':'Submit a feasible event bundle for GM authorization without booking',
 'POST /staff/event-approvals/{id}/confirm-client':'Record staff-attested manual confirmation after GM reservation',
 'GET /gm/event-approvals':'List pending GM event resource authorization requests',
 'POST /gm/event-approvals/{id}/decision':'GM approve and atomically reserve all resources, or reject',
 'GET /staff/enquiries':'List AI-assisted staff enquiries',
 'GET /staff/enquiries/paged':'Read 10 enquiries per page with booking-confirmed filter and selected-enquiry restoration',
 'POST /staff/enquiries/mock-inbound':'Simulate forwarded email or WhatsApp enquiry',
 'POST /staff/enquiries/{id}/event-proposal':'Staff-review handoff from enquiry to event proposal',
 'GET /staff/enquiries/{id}':'Read enquiry details',
 'GET /staff/enquiries/{id}/drafts':'List reply drafts',
 'GET /staff/enquiries/{id}/client-followups':'Read staff-attested, manually conducted client follow-ups',
 'POST /staff/enquiries/{id}/client-followups':'Record channel and factual client response after actual contact',
 'POST /staff/enquiries/{id}/escalate-unresolved':'Escalate unresolved infeasible proposal after logged client follow-up; never reserve',
 'POST /staff/enquiries/{id}/ai-process':'Run agent classification and draft generation',
 'PATCH /staff/enquiries/{id}/routing':'Persist a human category override',
 'PATCH /staff/enquiries/{id}/extraction':'Persist human-corrected extracted fields',
 'PATCH /staff/drafts/{id}':'Edit a draft before simulated sending',
 'POST /staff/drafts/{id}/send-simulated':'Mark staff-approved draft as simulated sent'
};
const missing=methodPath.filter(x=>!knownSummaries[x]);
if(missing.length)throw new Error(`Routes need summaries: ${missing.join(', ')}`);
const extra=Object.keys(knownSummaries).filter(x=>!methodPath.includes(x));
if(extra.length)throw new Error(`Summaries reference nonexistent routes: ${extra.join(', ')}`);

const object={type:'object',additionalProperties:true};
const string={type:'string'};
const integer={type:'integer'};
const schemas={
  Credential:{type:'object',required:['email','password'],properties:{email:{type:'string',format:'email'},password:{type:'string',format:'password'}}},
  Registration:{type:'object',required:['email','password','displayName'],properties:{email:{type:'string',format:'email'},password:{type:'string',minLength:10},displayName:string}},
  AuthResult:{type:'object',required:['accessToken','tokenType','user'],properties:{accessToken:string,tokenType:{type:'string',example:'Bearer'},expiresInSeconds:integer,user:object}},
  RoomQuote:{type:'object',required:['roomTypeId','checkIn','checkOut','guests'],properties:{roomTypeId:{type:'string',format:'uuid'},checkIn:{type:'string',format:'date'},checkOut:{type:'string',format:'date'},guests:{type:'integer',minimum:1},promoCode:string}},
  BookingHold:{type:'object',required:['roomTypeId','checkIn','checkOut','guests'],properties:{roomTypeId:{type:'string',format:'uuid'},checkIn:{type:'string',format:'date'},checkOut:{type:'string',format:'date'},guests:{type:'integer',minimum:1}}},
  MockPayment:{type:'object',required:['holdId','outcome'],properties:{holdId:{type:'string',format:'uuid'},outcome:{type:'string',enum:['SUCCESS','FAILURE']}}},
  Enquiry:{type:'object',required:['contactName','message'],properties:{contactName:string,contactEmail:{type:'string',format:'email'},message:{type:'string',minLength:8,maxLength:5000}}},
  EventProposal:{type:'object',required:['title','eventDate','checkIn','checkOut','guests','roomsRequired','diningGuests','parkingSpaces','eventStaff','venueCode'],properties:{title:string,eventDate:{type:'string',format:'date'},checkIn:{type:'string',format:'date'},checkOut:{type:'string',format:'date'},guests:integer,roomsRequired:integer,diningGuests:integer,parkingSpaces:integer,eventStaff:integer,venueCode:{type:'string',enum:['LAWN']}}},
  Error:{type:'object',properties:{statusCode:integer,message:{oneOf:[string,{type:'array',items:string}]},error:string}},
  BookingStatus:{type:'object',properties:{id:{type:'string',format:'uuid'},status:{type:'string',enum:['ACTIVE','EXPIRED','CONFIRMED']},remainingSeconds:integer,checkIn:{type:'string',format:'date'},checkOut:{type:'string',format:'date'}}},
  ResourceCalendar:{type:'object',properties:{start:{type:'string',format:'date'},end:{type:'string',format:'date'},days:{type:'array',items:object}}},
  InboundEnquiry:{type:'object',required:['source','contactName','message'],properties:{source:{type:'string',enum:['EMAIL_SIM','WHATSAPP_SIM']},contactName:string,contactEmail:{type:'string',format:'email'},message:string}},
  DailyAllotment:{type:'object',required:['websiteAllotment','blackedOut'],properties:{websiteAllotment:{type:'integer',minimum:0},blackedOut:{type:'boolean'}}},
  DailyRate:{type:'object',required:['ratePaise','gstBasisPoints'],properties:{ratePaise:{type:'integer',minimum:0},gstBasisPoints:{type:'integer',minimum:0,maximum:10000}}},
  PromoCode:{type:'object',required:['code','validFrom','validTo','discountPercent','maxUses'],properties:{code:string,validFrom:{type:'string',format:'date'},validTo:{type:'string',format:'date'},discountPercent:{type:'integer',minimum:1,maximum:100},maxUses:{type:'integer',minimum:1},roomTypeId:{type:['string','null'],format:'uuid',description:'null means applicable to both accommodation types'}}},
  ResourceCapacity:{type:'object',required:['capacity','blocked'],properties:{capacity:{type:'integer',minimum:0},blocked:{type:'boolean'}}},
  AlternativeSelection:{type:'object',required:['eventDate'],properties:{eventDate:{type:'string',format:'date'}}},
  RoutingCorrection:{type:'object',required:['category'],properties:{category:{type:'string',enum:['ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','COMPLAINT','UNKNOWN']}}},
  StaffPlan:{type:'object',required:['counts','notes'],properties:{counts:object,notes:string}},
  StaffPlanTransition:{type:'object',required:['status'],properties:{status:{type:'string',enum:['Pending GM','Approved','Changes requested','Sent to client']},gmNote:string,externalDeliveryConfirmed:{type:'boolean'}}},
  DraftEdit:{type:'object',required:['body'],properties:{body:{type:'string',minLength:8,maxLength:5000}}}
};
const requestSchemas={
 'POST /auth/login':'Credential','POST /auth/register':'Registration','POST /quotes':'RoomQuote',
 'POST /booking-holds':'BookingHold','POST /payments/mock/confirm':'MockPayment',
 'POST /enquiries':'Enquiry','POST /staff/enquiries/mock-inbound':'InboundEnquiry',
 'POST /staff/events':'EventProposal','POST /staff/enquiries/{id}/event-proposal':'EventProposal',
 'PUT /staff/inventory/{roomTypeId}/days/{date}':'DailyAllotment',
 'PUT /staff/rates/{roomTypeId}/days/{date}':'DailyRate',
 'POST /staff/promo-codes':'PromoCode','PATCH /staff/resources/{id}/capacity':'ResourceCapacity',
 'POST /staff/events/{id}/alternatives/select':'AlternativeSelection',
 'PUT /staff/allocations/{id}':'StaffPlan',
 'POST /staff/allocations/{id}/transition':'StaffPlanTransition',
 'PATCH /staff/enquiries/{id}/routing':'RoutingCorrection','PATCH /staff/drafts/{id}':'DraftEdit'
};
const idempotent=new Set(['POST /booking-holds','POST /payments/mock/confirm']);
const responseSchemas={'POST /auth/login':'AuthResult','GET /booking-holds/{id}':'BookingStatus','GET /staff/resources/calendar':'ResourceCalendar'};
const queryParams={
 'GET /availability':['checkIn','checkOut','roomTypeId'],
 'GET /promotions/eligible':['roomTypeId','checkIn','checkOut'],
 'GET /staff/overview':['date'],
 'GET /staff/inventory':['start','end'],
 'GET /staff/rates':['start','end'],
 'GET /staff/resources':['date'],
 'GET /staff/resources/calendar':['start','end'],
 'GET /staff/events':['status','limit','offset'],
 'GET /staff/enquiries':['category'],
 'GET /staff/enquiries/paged':['page','category','search','focusId'],
 'GET /staff/bookings/preview':['date','mode'],
 'GET /staff/bookings/export':['date','mode']
};
const dateQuery=new Set(['checkIn','checkOut','start','end','date']);
function tagFor(path){return path.startsWith('/auth/')?'Authentication':path.startsWith('/staff/events')?'Event Feasibility':path.startsWith('/staff/enquiries')||path.startsWith('/staff/drafts')?'Staff Enquiries':path.startsWith('/staff/')?'Staff Operations':path.startsWith('/booking')||path.startsWith('/payments')?'Booking':path.startsWith('/enquiries')?'Enquiries':path.startsWith('/room')||path.startsWith('/promotions')||path.startsWith('/availability')||path.startsWith('/quotes')?'Accommodation':'Service';}
const doc={
 openapi:'3.0.3',
 info:{title:'EstateFlow API',version:JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version,description:'NestJS API backing a resort booking, resource-feasibility and staff-reviewed local AI platform. This is an API, not the Lovable website. Payments and outbound communication are simulated. Dates are date-only YYYY-MM-DD; price amounts are integer INR paise.'},
 servers:[{url:'http://localhost:4000',description:'Default local development backend'}],
 tags:[...new Set(found.map(r=>tagFor(r.path)))].map(name=>({name})),
 paths:{},
 components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT',description:'JWT access token from POST /auth/login. Never put JWT_SECRET in the frontend.'}},schemas},
 'x-estateflow-notes':{model:'local Naive Bayes routing with optional Ollama semantic extraction and draft-only wording',payment:'MOCK',channels:'manual handoff / simulated; no server-side message delivery',approval:'STAFF feasibility → GM atomic reservation → staff-attested client confirmation; AI has no write authority'}
};
for(const route of found){
 const key=`${route.method.toUpperCase()} ${route.path}`;
 const role=publicRoutes.has(key)?'PUBLIC':route.path.startsWith('/gm/')?'GM':route.path.startsWith('/staff/')?'STAFF_OR_GM':'AUTHENTICATED';
 const method=route.method;
 const parameters=[];
 for(const p of [...route.path.matchAll(/\{([^}]+)\}/g)])parameters.push({name:p[1],in:'path',required:true,schema:{type:'string',...(p[1]==='date'?{format:'date'}:{})}});
 for(const name of queryParams[key]||[])parameters.push({name,in:'query',required:key==='GET /availability'&&['checkIn','checkOut'].includes(name),schema:dateQuery.has(name)?{type:'string',format:'date'}:name==='limit'||name==='offset'||name==='page'?{type:'integer',minimum:0}:{type:'string'}});
 if(idempotent.has(key))parameters.push({name:'Idempotency-Key',in:'header',required:true,description:'Unique per logical operation; reusing it with different details is a conflict.',schema:{type:'string'}});
 const op={tags:[tagFor(route.path)],summary:knownSummaries[key],operationId:method+route.path.replace(/\{(\w+)\}/g,(_a,b)=>'By'+b[0].toUpperCase()+b.slice(1)).replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g,(_a,b)=>b.toUpperCase()).replace(/[^a-zA-Z0-9]/g,''),
  'x-required-role':role,
  description:role==='PUBLIC'?'No bearer token needed.':role==='GM'?'Requires GM authorization verified against the database.':role==='STAFF_OR_GM'?'Requires a valid bearer token with an active STAFF or GM database role.':'Requires bearer token; access is checked against current database role and ownership.',
  responses:{[method==='post'?'201':'200']:{description:'Successful response',headers:{'X-Request-ID':{description:'Generated request trace identifier',schema:{type:'string',format:'uuid'}}},content:{'application/json':{schema:responseSchemas[key]?{'$ref':`#/components/schemas/${responseSchemas[key]}`}:object}}},'400':{description:'Input validation failed'},'401':{description:'Missing, invalid or stale authorization (when applicable)'},'403':{description:'Insufficient role or ownership (when applicable)'},'409':{description:'Inventory, idempotency or concurrency conflict (when applicable)'},'429':{description:'Request throttled (public write routes)'}}};
 if(role!=='PUBLIC')op.security=[{bearerAuth:[]}];
 if(parameters.length)op.parameters=parameters;
 if(method==='post'||method==='put'||method==='patch'){
  const body=requestSchemas[key]?{'$ref':`#/components/schemas/${requestSchemas[key]}`}:object;
  // Some POST operations are actions that accept no JSON body.
  const hasBody=!['POST /staff/events/{id}/evaluations','POST /staff/events/{id}/reserve','POST /staff/event-approvals/{id}/request','POST /staff/enquiries/{id}/ai-process','POST /staff/drafts/{id}/send-simulated'].includes(key);
  if(hasBody)op.requestBody={required:true,content:{'application/json':{schema:body}}};
 }
 if(key==='GET /staff/bookings/export')op.responses['200'].content={'text/csv':{schema:{type:'string'}}};
 doc.paths[route.path]??={};doc.paths[route.path][method]=op;
}
mkdirSync(join(root,'docs'),{recursive:true});
mkdirSync(join(root,'src','generated'),{recursive:true});
const rendered=JSON.stringify(doc,null,2)+'\n';
writeFileSync(join(root,'docs','openapi-m9.json'),rendered);
writeFileSync(join(root,'src','generated','openapi-m9.ts'),`/** Generated using npm run contract:m9; do not hand-edit. */\nexport const OPENAPI_DOCUMENT: Record<string, unknown> = ${rendered.trim()};\n`);
writeFileSync(join(root,'docs','route-index-m9.json'),JSON.stringify(found,null,2)+'\n');
console.log(`Generated EstateFlow OpenAPI contract: ${found.length} NestJS operations, ${Object.keys(doc.paths).length} paths, ${publicRoutes.size} public operations.`);
