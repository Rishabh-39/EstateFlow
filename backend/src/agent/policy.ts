/** Agent policy-as-code. No database/AI dependency: safe to unit-test offline. */
import { Extraction, Intent } from './classifier';
export type ExtractionPatch=Partial<Omit<Extraction,'missingFields'>> & {
 venuePreference?:'LAWN'|'CONFERENCE_HALL'|'PLANTATION_PAVILION'|'UNCONFIRMED'|null;
 eventType?:'Wedding'|'Corporate offsite'|'Celebration'|'Unspecified'|null;
};
const fields=new Set(['dateText','exactCheckIn','exactCheckOut','guestCount','roomsRequired','nights','budgetInr','diningGuests','parkingSpaces','eventStaff','requestedVenue','venuePreference','eventType']);
const dateRx=/^20\d{2}-(?:0[1-9]|1[0-2])-(?:[0-2]\d|3[01])$/;
const validDate=(d:string)=>{if(!dateRx.test(d))return false;const date=new Date(d+'T00:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===d;};
const intFields=new Set(['guestCount','roomsRequired','nights','budgetInr','diningGuests','parkingSpaces','eventStaff']);
export function validateCorrection(input:unknown):ExtractionPatch {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Correction must be an object');
 const entries=Object.entries(input);
 if(!entries.length || entries.some(([k])=>!fields.has(k)))throw new Error('Correction contains unsupported or empty fields');
 const patch:Record<string,unknown>={};
 for(const [key,value] of entries){
  if(value===null){patch[key]=null;continue;}
  if(intFields.has(key)){
   if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>1000000000)throw new Error(`${key} must be a nonnegative integer or null`);
  }else if(key==='requestedVenue'){
   if(!['LAWN','CONFERENCE_HALL'].includes(String(value)))throw new Error('requestedVenue invalid');
  }else if(key==='venuePreference'){
   if(!['LAWN','CONFERENCE_HALL','PLANTATION_PAVILION','UNCONFIRMED'].includes(String(value)))throw new Error('venuePreference invalid');
  }else if(key==='eventType'){
   if(!['Wedding','Corporate offsite','Celebration','Unspecified'].includes(String(value)))throw new Error('eventType invalid');
  }else if(key==='exactCheckIn'||key==='exactCheckOut'){
   if(typeof value!=='string'||!validDate(value))throw new Error(`${key} must be a valid ISO date or null`);
  }else if(typeof value!=='string'||value.length>200){
   throw new Error(`${key} must be text (up to 200 characters) or null`);
  }
  patch[key]=value;
 }
 if(patch.exactCheckIn&&patch.exactCheckOut&&String(patch.exactCheckIn)>=String(patch.exactCheckOut))throw new Error('Check-out must be after check-in');
 return patch as ExtractionPatch;
}
export function mergeCorrection(extracted:Extraction,patch:ExtractionPatch):Extraction{
 const result={...extracted,...patch};
 const missing=[] as string[];
 if(!result.exactCheckIn||!result.exactCheckOut||!validDate(result.exactCheckIn)||!validDate(result.exactCheckOut)||result.exactCheckIn>=result.exactCheckOut)missing.push('exact_dates');
 if(result.guestCount===null||result.guestCount<1)missing.push('guests');
 result.missingFields=missing;
 return result;
}
export function determineRouting(category:Intent,modelComplains:boolean,modelNeedsReview:boolean,manualCategory:Intent|null){
 const complaint=category==='COMPLAINT'||modelComplains;
 const review=category==='UNKNOWN'||(modelNeedsReview&&!manualCategory);
 return {lane:complaint?'GM_ESCALATION':review?'UNSORTED':'ASSIGNED',ownerRole:complaint||review?'GM':'STAFF',requiresReview:complaint||review};
}
