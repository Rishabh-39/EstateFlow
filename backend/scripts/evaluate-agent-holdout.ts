/** Held-out evaluation never alters the agent or uses these cases for training. */
import { readFileSync,mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractRequirements,IntentModel,TrainingExample } from '../src/agent/classifier';
import { evaluate,checkDataset,LabelledCase } from '../src/agent/quality';

const lines=<T>(f:string)=>readFileSync(resolve(f),'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as T);
const training=['data/agent-training.jsonl','data/agent-training-curated.jsonl','data/agent-training-specialized.jsonl'].flatMap(file=>lines<TrainingExample>(file));
const dataset=(process.env.AGENT_EVAL_SET==='final'||process.argv.includes('--final'))?'data/agent-final-check-v1.jsonl':'data/agent-holdout-v1.jsonl';
const holdout=lines<LabelledCase>(dataset);
const integrity=checkDataset(holdout,training);
const model=JSON.parse(readFileSync(resolve(process.env.AGENT_MODEL_PATH||'model/resort-intent-model.json'),'utf8')) as IntentModel;
const {outcomes,summary}=evaluate(model,holdout);
const extractionChecks=holdout.flatMap(c=>c.expectedExtraction ? Object.entries(c.expectedExtraction).map(([field,want])=>{
 const got=(extractRequirements(c.text) as unknown as Record<string,unknown>)[field];
 return {text:c.text,field,expected:want,actual:got,pass:got===want};
}):[]);
const passedExtraction=extractionChecks.filter(c=>c.pass).length;
console.log(`EstateFlow M7 ${dataset} synthetic evaluation: ${summary.count} never-trained cases, ${integrity.exactLeakage} exact training overlaps`);
console.log(`Accuracy: ${(summary.accuracy*100).toFixed(1)}%; macro-F1: ${(summary.macroF1*100).toFixed(1)}%; auto-route coverage: ${(summary.routedCoverage*100).toFixed(1)}%; precision among auto-routes: ${(summary.routedPrecision*100).toFixed(1)}%`);
console.log(`Wrong auto-routes: ${summary.wrongAutoRouted}; unknown enquiries misrouted: ${summary.unknownAutoRouted}; complaint misses: ${summary.complaintMisses}`);
console.log(`Entity-extraction checks: ${passedExtraction}/${extractionChecks.length}`);
for(const m of summary.metrics)console.log(`${m.label.padEnd(19)} n=${String(m.support).padStart(2)} precision=${(100*m.precision).toFixed(1)}% recall=${(100*m.recall).toFixed(1)}% f1=${(100*m.f1).toFixed(1)}%`);
const mistakes=outcomes.filter(o=>o.label!==o.predicted);
for(const m of mistakes)console.log(`REVIEW expected=${m.label} predicted=${m.predicted} confidence=${m.confidence} text=${JSON.stringify(m.text)}`);
for(const c of extractionChecks.filter(c=>!c.pass))console.log(`EXTRACTION_REVIEW ${c.field}: expected=${c.expected}, actual=${c.actual}, text=${JSON.stringify(c.text)}`);
mkdirSync('reports',{recursive:true});
const result={dataset,trainingExamples:model.sampleCount,trainingOverlap:integrity.exactLeakage,summary,extraction:{passed:passedExtraction,total:extractionChecks.length,checks:extractionChecks},
 mistakes:mistakes.map(m=>({expected:m.label,predicted:m.predicted,confidence:m.confidence,text:m.text})),disclaimer:'Synthetic authored holdout, NOT measured production accuracy. No automatic training or routing policy changes.'};
writeFileSync(`reports/${dataset.includes('final')?'agent-final-check-v1':'agent-heldout-v1'}.json`,JSON.stringify(result,null,2)+'\n');
console.log(`Saved report for ${dataset} (local-only; ignored by Git)`);
if(summary.complaintMisses>0)console.warn('WARNING: complaint misses require manual investigation before deployment.');
