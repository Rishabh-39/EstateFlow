import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { train, TrainingExample } from '../src/agent/classifier';
import { checkDataset,normalizedExample } from '../src/agent/quality';
const f=resolve('data/agent-training.jsonl');
const files=[f,resolve('data/agent-training-curated.jsonl'),resolve('data/agent-training-specialized.jsonl')];
// Optional local-only approved examples. Never load raw enquiries automatically.
const localReviewed=resolve('data/local/reviewed-training.jsonl');
if(existsSync(localReviewed))files.push(localReviewed);
const records=files.flatMap(file=>readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as TrainingExample));
const exact=new Set<string>();
for(const ex of records){const key=normalizedExample(ex.text);if(exact.has(key))throw new Error('Duplicate labelled training example');exact.add(key);}
// Do not poison training with held-out test messages.
const evalFiles=['data/agent-holdout-v1.jsonl','data/agent-final-check-v1.jsonl'];
for(const file of evalFiles){const evals=readFileSync(resolve(file),'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as TrainingExample);checkDataset(evals,records);}
const model=train(records);
const output=resolve(process.env.AGENT_MODEL_PATH||'model/resort-intent-model.json');mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(model,null,2)+'\n');
console.log(`Trained ${model.version} with ${model.sampleCount} labelled examples; saved ${output}`);
