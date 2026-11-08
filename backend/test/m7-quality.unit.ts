import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {evaluate,checkDataset,normalizedExample,summarize,LabelledCase} from '../src/agent/quality';
import {IntentModel,TrainingExample} from '../src/agent/classifier';
import { validateReviewedCandidate,prepareReviewedImports } from '../src/agent/reviewed-data';
let passed=0;
function test(name:string,action:()=>void){action();passed++;console.log('PASS:',name);}
const lines=<T>(path:string)=>readFileSync(path,'utf8').trim().split(/\r?\n/).map(x=>JSON.parse(x) as T);
const training=['data/agent-training.jsonl','data/agent-training-curated.jsonl','data/agent-training-specialized.jsonl'].flatMap(file=>lines<TrainingExample>(file));
const holdout=lines<LabelledCase>('data/agent-holdout-v1.jsonl');
const finalCheck=lines<LabelledCase>('data/agent-final-check-v1.jsonl');
const model=JSON.parse(readFileSync('model/resort-intent-model.json','utf8')) as IntentModel;
test('holdout includes 50 independent labelled enquiries across 5 labels',()=>{
 assert.equal(holdout.length,50);
 for(const l of model.labels)assert.equal(holdout.filter(c=>c.label===l).length,10);
});
test('final-check set contains 30 unique never-trained cases',()=>{assert.equal(finalCheck.length,30);assert.equal(checkDataset(finalCheck,training).exactLeakage,0)});
test('no exact lexical overlap between train and heldout',()=>assert.equal(checkDataset(holdout,training).exactLeakage,0));
test('duplicate heldout is rejected',()=>assert.throws(()=>checkDataset([...holdout,holdout[0]],training),/Duplicate/));
test('punctuation and case variations are caught as leakage',()=>{
 const cloned:LabelledCase={text:`  ${training[0].text.toUpperCase()} !!!  `,label:training[0].label};
 assert.equal(normalizedExample(cloned.text),normalizedExample(training[0].text));
 assert.throws(()=>checkDataset([cloned],training),/leakage/);
});
test('invalid labels are rejected before reporting',()=>assert.throws(()=>checkDataset([{text:'xxx',label:'UNSAFE' as any}],training),/Invalid/));
test('evaluation returns complete, bounded metrics',()=>{
 const {summary,outcomes}=evaluate(model,holdout);assert.equal(outcomes.length,50);
 for(const key of ['accuracy','macroF1','routedCoverage','routedPrecision','reviewRate'] as const)assert(summary[key]>=0&&summary[key]<=1);
 assert.equal(summary.metrics.length,5);
 assert.equal(summary.metrics.reduce((a,m)=>a+m.support,0),50);
});
test('complaints auto-escalate on explicit harm language',()=>{
 const cases:LabelledCase[]=[{text:'I am reporting theft from my room',label:'COMPLAINT'},{text:'This is unacceptable and I demand a refund',label:'COMPLAINT'}];
 const {summary}=evaluate(model,cases);assert.equal(summary.complaintMisses,0);
});
test('abstention is separate from a wrong confident auto-route',()=>{
 const cases:any[]=[{text:'a',label:'UNKNOWN',predicted:'UNKNOWN',abstained:true,confidence:0,margin:0,reason:''},
  {text:'b',label:'WEDDING',predicted:'ROOM_BOOKING',abstained:false,confidence:1,margin:1,reason:''}];
 const s=summarize(cases);assert.equal(s.wrongAutoRouted,1);assert.equal(s.routedCoverage,.5);assert.equal(s.routedPrecision,0);
});
test('empty evaluation set is rejected',()=>assert.throws(()=>summarize([]),/empty/));
test('human reviewed and consent flags are mandatory',()=>{
 const sample={text:'Can you tell me about long weekend villas?',label:'ROOM_BOOKING',humanReviewed:true,consentConfirmed:true};
 assert.equal(validateReviewedCandidate(sample).label,'ROOM_BOOKING');
 assert.throws(()=>validateReviewedCandidate({...sample,humanReviewed:false}),/review and consent/);
 assert.throws(()=>validateReviewedCandidate({...sample,consentConfirmed:false}),/review and consent/);
});
test('reviewed importer blocks email, phone numbers and identity document data',()=>{
 const base={text:'Wedding enquiry; send me offers please.',label:'WEDDING',humanReviewed:true,consentConfirmed:true};
 assert.throws(()=>validateReviewedCandidate({...base,text:'Call me at 9876543210 for villa booking'}),/identifier/);
 assert.throws(()=>validateReviewedCandidate({...base,text:'Please email john.smith@example.com tomorrow'}),/identifier/);
 assert.throws(()=>validateReviewedCandidate({...base,text:'passport number AB12345678 for resort room'}),/Identity document/);
});
test('reviewed importer blocks evaluation leakage and duplicate labels',()=>{
 const reviewed=(text:string)=>({text,label:'ROOM_BOOKING',humanReviewed:true,consentConfirmed:true});
 assert.throws(()=>prepareReviewedImports([reviewed(holdout[0].text)],training,holdout),/Duplicate or held-out/);
 assert.throws(()=>prepareReviewedImports([reviewed('I want a lake cabin during vacation.'),reviewed('i want a lake cabin during vacation')],training,holdout),/Duplicate or held-out/);
});
test('valid reviewed examples are processed as label-only training data',()=>{
 const rows=prepareReviewedImports([{text:'A group needs a two-night company sprint session.',label:'CORPORATE_OFFSITE',humanReviewed:true,consentConfirmed:true}],training,[...holdout,...finalCheck]);
 assert.deepEqual(rows,[{text:'A group needs a two-night company sprint session.',label:'CORPORATE_OFFSITE'}]);
});
console.log(`ALL ${passed} EstateFlow M7 evaluation-contract tests passed`);
