/** Import manually reviewed, consent-confirmed anonymized labels to a Git-ignored local file.
 * Usage: npm run agent:import-reviewed -- /absolute/path/to/reviewed.jsonl
 * Never pulls automatically from the enquiry database. Does not retrain automatically.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {TrainingExample} from '../src/agent/classifier';
import {prepareReviewedImports} from '../src/agent/reviewed-data';
const input=process.argv[2];
if(!input){console.error('Usage: npm run agent:import-reviewed -- /path/to/reviewed.jsonl');process.exit(2);}
function jsonLines(file:string):unknown[]{return readFileSync(resolve(file),'utf8').split(/\r?\n/).filter(Boolean).map((line,i)=>{
 try{return JSON.parse(line);}catch{throw new Error(`Invalid JSON line ${i+1} in ${file}`);}
});}
const outFile=resolve('data/local/reviewed-training.jsonl');
if(resolve(input)===outFile)throw new Error('Input and output must differ');
const existing:TrainingExample[]=['data/agent-training.jsonl','data/agent-training-curated.jsonl','data/agent-training-specialized.jsonl'].flatMap(f=>jsonLines(f) as TrainingExample[]);
if(existsSync(outFile))existing.push(...jsonLines(outFile) as TrainingExample[]);
const holdouts:TrainingExample[]=['data/agent-holdout-v1.jsonl','data/agent-final-check-v1.jsonl'].flatMap(f=>jsonLines(f) as TrainingExample[]);
const approved=prepareReviewedImports(jsonLines(input),existing,holdouts);
mkdirSync(dirname(outFile),{recursive:true});
// The file is intentionally local-only and never copied into the distributed ZIP.
const previous=existsSync(outFile)?readFileSync(outFile,'utf8').trim():'';
const lines=approved.map(x=>JSON.stringify(x)).join('\n');
writeFileSync(outFile,(previous?previous+'\n':'')+lines+'\n',{mode:0o600});
console.log(`Imported ${approved.length} de-identified, explicitly reviewed examples to data/local/reviewed-training.jsonl`);
console.log('Model unchanged. Run npm run agent:train only after reviewing the updated dataset.');
