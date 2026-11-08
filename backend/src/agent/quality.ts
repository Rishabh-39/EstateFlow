/** Pure, deterministic classification report: no database and no model training. */
import { Intent, IntentModel, predict } from './classifier';

export type LabelledCase={text:string;label:Intent;expectedExtraction?:Record<string,string|number|null>};
export type EvaluationCase=LabelledCase & {predicted:Intent;abstained:boolean;confidence:number;margin:number;reason:string};
export type LabelMetric={label:Intent;support:number;tp:number;fp:number;fn:number;precision:number;recall:number;f1:number};
export const INTENTS:Intent[]=['ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','COMPLAINT','UNKNOWN'];

const divide=(a:number,b:number)=>b===0?0:a/b;
export function summarize(outcomes:EvaluationCase[]){
 if(!outcomes.length)throw new Error('Evaluation dataset must not be empty');
 const metrics:LabelMetric[]=INTENTS.map(label=>{
  const support=outcomes.filter(c=>c.label===label).length;
  const tp=outcomes.filter(c=>c.label===label&&c.predicted===label).length;
  const fp=outcomes.filter(c=>c.label!==label&&c.predicted===label).length;
  const fn=support-tp,precision=divide(tp,tp+fp),recall=divide(tp,support),f1=divide(2*precision*recall,precision+recall);
  return {label,support,tp,fp,fn,precision,recall,f1};
 });
 const auto=outcomes.filter(c=>c.predicted!=='UNKNOWN');
 const wrongAuto=auto.filter(c=>c.predicted!==c.label);
 const missingComplaint=outcomes.filter(c=>c.label==='COMPLAINT'&&c.predicted!=='COMPLAINT');
 const unknownAuto=outcomes.filter(c=>c.label==='UNKNOWN'&&c.predicted!=='UNKNOWN');
 const confusion=Object.fromEntries(INTENTS.map(actual=>[actual,Object.fromEntries(INTENTS.map(pred=>[pred,outcomes.filter(c=>c.label===actual&&c.predicted===pred).length]))]));
 return {count:outcomes.length,accuracy:divide(outcomes.filter(c=>c.label===c.predicted).length,outcomes.length),
  macroF1:metrics.reduce((acc,m)=>acc+m.f1,0)/metrics.length,
  routedCoverage:divide(auto.length,outcomes.length),
  routedPrecision:divide(auto.length-wrongAuto.length,auto.length),
  wrongAutoRouted:wrongAuto.length,
  unknownAutoRouted:unknownAuto.length,
  complaintMisses:missingComplaint.length,
  reviewRate:divide(outcomes.filter(c=>c.predicted==='UNKNOWN'||c.abstained).length,outcomes.length),
  metrics,confusion};
}
export function evaluate(model:IntentModel,cases:LabelledCase[],thresholds?:{confidence:number;margin:number}){
 const outcomes:EvaluationCase[]=cases.map(c=>{
  const r=predict(model,c.text,thresholds);
  return {...c,predicted:r.label,abstained:r.needsReview,confidence:r.confidence,margin:r.margin,reason:r.reason};
 });
 return {outcomes,summary:summarize(outcomes)};
}
/** Reject exact, punctuation/case/spacing variants; this cannot detect semantic leakage. */
export function normalizedExample(text:string){return text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
export function checkDataset(cases:LabelledCase[],training:LabelledCase[]){
 const seen=new Set<string>(),trainKeys=new Set(training.map(e=>normalizedExample(e.text)));
 for(const c of cases){
  if(!c.text||!c.text.trim()||!INTENTS.includes(c.label)||typeof c.text!=='string')throw new Error('Invalid evaluation case');
  const key=normalizedExample(c.text);
  if(seen.has(key))throw new Error('Duplicate held-out evaluation case');
  if(trainKeys.has(key))throw new Error('Training/evaluation leakage detected');
  seen.add(key);
 }
 return {evaluationSize:seen.size,trainingSize:training.length,exactLeakage:0};
}
