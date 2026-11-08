import { readFileSync } from 'node:fs';
import { predict,IntentModel } from '../src/agent/classifier';
const model=JSON.parse(readFileSync(process.env.AGENT_MODEL_PATH||'model/resort-intent-model.json','utf8')) as IntentModel;
const cases=[
 ['Venue for my sister wedding in Feb 2027 about 250 guests 2 nights','WEDDING'],
 ['Could we reserve a plantation villa for my spouse and our child from 14 November?','ROOM_BOOKING'],
 ['Could you host 42 colleagues for a strategy retreat and team meeting in January?','CORPORATE_OFFSITE'],
 ['I want a refund for the dirty rooms and bad service','COMPLAINT'],
 ['Please reserve a suite for four nights','ROOM_BOOKING'],
 ['We are planning a ceremony and reception with 250 guests','WEDDING'],
 ['Need a meeting venue for our team retreat and projector','CORPORATE_OFFSITE'],
 ['Hello, could someone help?','UNKNOWN'],
] as const;
let right=0;
for(const [msg,want] of cases){const r=predict(model,msg);right+=Number(r.label===want);console.log(`${r.label===want?'PASS':'FAIL'} expected=${want} got=${r.label} conf=${r.confidence} ${msg}`);}
console.log(`Independent-phrase sanity checks: ${right}/${cases.length}. These are small curated checks, NOT a statistically valid production accuracy estimate.`);
if(right!==cases.length)process.exitCode=1;
