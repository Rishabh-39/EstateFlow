/** Staff-reviewed training imports are explicit, local-only, and fail closed.
 * Do not ingest raw guest messages. Manual de-identification remains required.
 */
import { Intent,TrainingExample } from './classifier';
import { normalizedExample,INTENTS } from './quality';
export type ReviewedCandidate={text:string;label:Intent;humanReviewed:boolean;consentConfirmed:boolean};
// Block basic direct identifiers instead of silently storing them in a trainable corpus.
// This is not a complete PII detector: staff must manually anonymize each input first.
const EMAIL=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const INDIAN_PHONE=/(?:\+?91[\s.-]?)?(?:[6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{9})/;
const LONG_DIGIT_ID=/\b\d{11,16}\b/;
export function validateReviewedCandidate(value:unknown):TrainingExample {
 if(!value || typeof value!=='object'||Array.isArray(value))throw new Error('Reviewed sample must be an object');
 const x=value as Record<string,unknown>;
 if(Object.keys(x).some(k=>!['text','label','humanReviewed','consentConfirmed'].includes(k)))throw new Error('Unsupported training import fields');
 if(x.humanReviewed!==true||x.consentConfirmed!==true)throw new Error('Explicit human review and consent confirmation required');
 if(typeof x.text!=='string'||x.text.trim().length<12||x.text.length>700)throw new Error('Text must be 12–700 characters');
 if(!INTENTS.includes(x.label as Intent))throw new Error('Invalid intent label');
 if(EMAIL.test(x.text)||INDIAN_PHONE.test(x.text)||LONG_DIGIT_ID.test(x.text))throw new Error('Possible direct identifier detected — anonymize before import');
 if(/\b(?:passport|aadhaar|aadhar|pan\s+card)\s*(?:no\.?|number|:|#)?\s*[A-Z0-9]{6,}/i.test(x.text))throw new Error('Identity document data must not be imported');
 return {text:x.text.trim(),label:x.label as Intent};
}
export function prepareReviewedImports(raw:unknown[],existing:TrainingExample[],evaluation:TrainingExample[]):TrainingExample[]{
 if(!Array.isArray(raw)||raw.length===0||raw.length>500)throw new Error('Import must contain 1–500 reviewed samples');
 const blocked=new Set([...existing,...evaluation].map(e=>normalizedExample(e.text)));
 const out:TrainingExample[]=[];
 for(const v of raw){
  const ex=validateReviewedCandidate(v),key=normalizedExample(ex.text);
  if(blocked.has(key))throw new Error('Duplicate or held-out evaluation phrase — import rejected');
  blocked.add(key);out.push(ex);
 }
 return out;
}
