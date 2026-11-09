/** EstateFlow local supervised intent model + deterministic, auditable field extraction.
 * No hosted LLM, external API keys, or autonomous write access.
 * Train on reviewed/labelled examples only; model confidence is NOT calibrated.
 */
export type Intent = 'ROOM_BOOKING'|'WEDDING'|'CORPORATE_OFFSITE'|'COMPLAINT'|'UNKNOWN';
export type TrainingExample={text:string;label:Intent};
export type IntentModel={version:string; labels:Intent[]; docCounts:Record<string,number>; tokenCounts:Record<string,Record<string,number>>;totals:Record<string,number>;vocab:string[];sampleCount:number;trainedAt:string};
const LABELS:Intent[]=['ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','COMPLAINT','UNKNOWN'];
export function tokenize(text:string):string[]{
 const words=(text.toLowerCase().normalize('NFKC').match(/[a-z0-9₹]+/g)||[]).filter(s=>s.length>1);
 return [...words,...words.slice(1).map((w,i)=>`${words[i]}_${w}`)];
}
export function train(examples:TrainingExample[]):IntentModel {
 const docCounts:Record<string,number>={},tokenCounts:Record<string,Record<string,number>>={},totals:Record<string,number>={};
 const vocab=new Set<string>();
 for(const label of LABELS){docCounts[label]=0;tokenCounts[label]={};totals[label]=0;}
 for(const ex of examples){
  if(!LABELS.includes(ex.label)||typeof ex.text!=='string'||!ex.text.trim())throw new Error('Invalid labelled training example');
  docCounts[ex.label]++;
  for(const word of tokenize(ex.text)){
   vocab.add(word);tokenCounts[ex.label][word]=(tokenCounts[ex.label][word]||0)+1;totals[ex.label]++;
  }
 }
 if(LABELS.some(l=>docCounts[l]===0))throw new Error('At least one training example required for every category');
 return {version:'local-nb-v3',labels:LABELS,docCounts,tokenCounts,totals,vocab:[...vocab].sort(),sampleCount:examples.length,trainedAt:new Date().toISOString()};
}
// Safety escalation is a separate deterministic policy, not a model classification prediction.
const complaintTokens=/\b(complain(?:t|ing)?|refund|unsafe|harass(?:ment|ed)?|dirty|terrible|horrible|misconduct|injured|fraud|overcharged|scam|broken|bad service|unacceptable|rude(?:ly|ness)?|hostile|disappointed|stolen|theft|unsanitary)\b/i;
export function predict(model:IntentModel,text:string,thresholds={confidence:0.75,margin:0.25}){
 if(complaintTokens.test(text))return {label:'COMPLAINT' as Intent,confidence:1,margin:1,needsReview:false,reason:'Mandatory complaint escalation',knownTokenRatio:1};
 const words=tokenize(text); const known=new Set(model.vocab); const matched=words.filter(w=>known.has(w));
 const knownTokenRatio=words.length?matched.length/words.length:0;
 const size=Math.max(model.vocab.length,1);
 const scores=model.labels.map(label=>{
  let score=Math.log((model.docCounts[label]+1)/(model.sampleCount+model.labels.length));
  for(const token of matched)score+=Math.log(((model.tokenCounts[label]||{})[token]||0)+1)-Math.log(model.totals[label]+size);
  return {label,score};
 }).sort((a,b)=>b.score-a.score);
 const max=scores[0].score, exp=scores.map(s=>Math.exp(s.score-max));
 const sum=exp.reduce((a,b)=>a+b,0),confidence=exp[0]/sum,margin=(exp[0]-exp[1])/sum;
 // Low coverage should never generate a confident operational interpretation.
 const needsReview=matched.length<2 || (words.length>=6 && knownTokenRatio<0.18) || confidence<thresholds.confidence || margin<thresholds.margin || scores[0].label==='UNKNOWN';
 return {label:needsReview?'UNKNOWN' as Intent:scores[0].label as Intent,
  confidence:Number(confidence.toFixed(4)),margin:Number(margin.toFixed(4)),knownTokenRatio:Number(knownTokenRatio.toFixed(4)),needsReview,
  reason:needsReview?'Uncertain or unsupported enquiry — human review required':'Locally trained intent classifier'};
}
export type Extraction={dateText:string|null;exactCheckIn:string|null;exactCheckOut:string|null;guestCount:number|null;roomsRequired:number|null;nights:number|null;budgetInr:number|null;diningGuests:number|null;parkingSpaces:number|null;eventStaff:number|null;requestedVenue:'LAWN'|'CONFERENCE_HALL'|null;missingFields:string[]};
const MONTHS:Record<string,number>={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function validIso(s:string):boolean{
 if(!/^20\d\d-\d\d-\d\d$/.test(s))return false;
 const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;
}
function makeIso(day:number,month:number,year:number):string|null{
 const s=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 return validIso(s)?s:null;
}
const matchNumber=(text:string,pattern:RegExp):number|null=>{const m=pattern.exec(text);return m?Number(m[1]):null;};
/** Accept both '20000 guests' and 'number of guests = 20000'. Commas are separators, not decimals. */
function extractGuestCount(text:string):number|null {
 const quantity='(\\d{1,3}(?:,\\d{3}){1,2}|\\d{1,6})';
 // Deliberately anchor labels: an event date or phone number is not a guest count.
 const after=new RegExp('\\b(?:number\\s+of\\s+|total\\s+|expected\\s+)?(?:guests?|attendees?|people|persons?|pax|delegates?)\\s*(?:=|:|is\\s+|are\\s+)?\\s*'+quantity+'\\b','i').exec(text);
 const before=new RegExp('\\b'+quantity+'\\s*(?:guests?|attendees?|people|persons?|pax|delegates?)\\b','i').exec(text);
 const raw=after?.[1]??before?.[1];
 if(!raw)return null;
 const number=Number(raw.replace(/,/g,''));
 return Number.isSafeInteger(number)&&number>0?number:null;
}
function exactDates(text:string):{dateText:string|null;checkIn:string|null;checkOut:string|null}{
 const isos=[...text.matchAll(/\b20\d{2}-(?:0[1-9]|1[0-2])-(?:[0-2]\d|3[01])\b/g)].map(x=>x[0]);
 if(isos.length===2 && isos.every(validIso) && isos[0]<isos[1])return {dateText:isos.join(' to '),checkIn:isos[0],checkOut:isos[1]};
 // India-facing enquiry form: unambiguous day/month/year, e.g. 25/11/2026.
 // A single event date is NOT automatically an overnight stay or check-out date.
 const numeric=[...text.matchAll(/\b([0-3]?\d)\/([01]?\d)\/(20\d{2})\b/g)]
  .map(m=>({raw:m[0],iso:makeIso(Number(m[1]),Number(m[2]),Number(m[3]))})).filter(x=>x.iso);
 if(numeric.length===2 && numeric[0].iso!<numeric[1].iso!)
  return {dateText:numeric.map(x=>x.raw).join(' to '),checkIn:numeric[0].iso,checkOut:numeric[1].iso};
 if(numeric.length===1)return {dateText:numeric[0].raw,checkIn:null,checkOut:null};
 // Explicit-year date range, e.g. "14-16 Nov 2027" or "14 to 16 November 2027".
 const r=/\b(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/i;
 const m=r.exec(text);
 if(m){const month=MONTHS[m[3].slice(0,3).toLowerCase()];const a=makeIso(Number(m[1]),month,Number(m[4])),b=makeIso(Number(m[2]),month,Number(m[4]));
  if(a&&b&&a<b)return {dateText:m[0],checkIn:a,checkOut:b};
 }
 // Without year, precise date or valid order, leave the structured dates unresolved.
 const phrase=text.match(/\b(?:\d{1,2}\s*(?:-|–|—|to)\s*\d{1,2}\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(?:20\d{2})?\b/i);
 return {dateText:isos.length?isos.join(' to '):m?.[0]||phrase?.[0]||null,checkIn:null,checkOut:null};
}
function budget(text:string):number|null{
 const m=/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|k)?\b/i.exec(text);
 if(!m)return null;
 const n=Number(m[1].replace(/,/g,'')),scale=/^cr|^crore/i.test(m[2]||'')?10000000:/^la/i.test(m[2]||'')?100000:/^k$/i.test(m[2]||'')?1000:1;
 const result=n*scale;return Number.isFinite(result)&&result<=1000000000?Math.round(result):null;
}
export function extractRequirements(text:string):Extraction {
 const dates=exactDates(text);
 let guestCount=extractGuestCount(text)
  ??matchNumber(text,/\bteam\s+of\s+(\d{1,5})\b/i);
 if(guestCount===null){
  const adults=matchNumber(text,/\b(\d{1,3})\s*adults?\b/i);
  const kids=matchNumber(text,/\b(\d{1,3})\s*(?:children|child|kids?)\b/i)??(/\ba\s+child\b/i.test(text)?1:0);
  if(adults!==null)guestCount=adults+kids;
 }
 const roomsRequired=matchNumber(text,/\b(\d{1,3})\s*(?:rooms?|villas?)\b/i);
 const nights=matchNumber(text,/\b(\d{1,2})\s*nights?\b/i);
 const diningGuests=matchNumber(text,/\b(?:dining|catering|lunch|dinner)(?:\s+arrangements?)?\s+(?:for\s+)?(\d{1,5})\b/i);
 const parkingSpaces=matchNumber(text,/\b(\d{1,5})\s*(?:parking spaces?|car spaces?|vehicles?|cars?)\b/i)
  ??matchNumber(text,/\bparking\s+for\s+(\d{1,5})\b/i);
 const eventStaff=matchNumber(text,/\b(\d{1,3})\s*(?:event\s+)?staff\b/i);
 const requestedVenue=/\b(?:conference hall|meeting hall|meeting room)\b/i.test(text)?'CONFERENCE_HALL'
  :/\blawn\b/i.test(text)?'LAWN':null;
 const missingFields:string[]=[];
 if(!dates.checkIn||!dates.checkOut)missingFields.push('exact_dates');
 if(guestCount===null)missingFields.push('guests');
 return {dateText:dates.dateText,exactCheckIn:dates.checkIn,exactCheckOut:dates.checkOut,guestCount,roomsRequired,nights,budgetInr:budget(text),diningGuests,parkingSpaces,eventStaff,requestedVenue,missingFields};
}
export function safeDraft(name:string,category:Intent,extract:Extraction,rawMessage=''):string {
 const contact=String(name||'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,70)||'there';
 const parts:string[]=[];
 if(category==='COMPLAINT'){
  parts.push('Thank you for bringing this concern to our attention. We are sorry your experience has not met expectations.');
  parts.push('We have flagged this for review by the General Manager. Please share your booking reference and the date of the issue if you have not already done so. No refund or other action has been initiated automatically.');
 } else if(category==='WEDDING'||category==='CORPORATE_OFFSITE'){
  const event=category==='WEDDING'?'wedding celebration':'corporate offsite';
  parts.push(`Thank you for considering our Chikkamagaluru resort for your ${event}.`);
  const known=[extract.guestCount!==null?`${extract.guestCount} guests`:null,extract.roomsRequired!==null?`${extract.roomsRequired} rooms`:null,extract.parkingSpaces!==null?`${extract.parkingSpaces} parking spaces`:null,extract.diningGuests!==null?`dining for ${extract.diningGuests}`:null].filter(Boolean);
  if(known.length)parts.push(`We have recorded your initial request for ${known.join(', ')}.`);
  const asks=[!extract.exactCheckIn||!extract.exactCheckOut?'exact event and stay dates':null,extract.guestCount===null?'guest count':null,extract.roomsRequired===null?'rooms required':null,extract.diningGuests===null?'dining requirements':null,extract.parkingSpaces===null?'parking requirements':null,extract.eventStaff===null?'event staffing requirements':null].filter(Boolean);
  if(asks.length)parts.push(`Could you confirm ${asks.slice(0,4).join(', ')}?`);
  parts.push('We will check rooms, venue, dining, parking and staffing together before proposing a feasible option. No reservation has been made yet.');
 } else if(category==='ROOM_BOOKING'){
  parts.push('Thank you for your interest in staying at our Chikkamagaluru estate.');
  if(extract.guestCount!==null)parts.push(`We have recorded ${extract.guestCount} guest(s).`);
  parts.push('Please share your exact check-in/check-out dates and preferred room or villa if not already included. Our booking team will verify live rates and room availability. No reservation has been made yet.');
 } else {
  const dietary=/\b(vegetarian|vegan|jain|cater|menu|food)\b/i.test(rawMessage);
  const venue=/\b(lawn|venue|capacity)\b/i.test(rawMessage);
  parts.push('Thank you for contacting our Chikkamagaluru estate.');
  parts.push(dietary?'We have recorded your dietary/catering enquiry. Could you share the event date, guest count and dietary preferences so our team can confirm options?':venue?'We have recorded your question about the event venue. Could you confirm the date and guest count so we can verify the complete venue and service capacity?':'Could you please share your preferred dates, guest count and the main service you need?');
  parts.push('A team member will review your enquiry; no booking or resource reservation has been made yet.');
 }
 return `Hello ${contact},\n\n${parts.join('\n\n')}\n\nWarm regards,\nEstateFlow Reservations`;
}
