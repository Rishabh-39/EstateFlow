/** Stratified deterministic five-fold evaluation on synthetic training corpus.
 * Does NOT establish accuracy on real customer conversations.
 */
import { readFileSync } from 'node:fs';
import { train,predict,TrainingExample } from '../src/agent/classifier';
const samples=['data/agent-training.jsonl','data/agent-training-curated.jsonl','data/agent-training-specialized.jsonl'].flatMap(file=>readFileSync(file,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line) as TrainingExample));
const labelGroups=new Map<string,TrainingExample[]>();
for(const item of samples){const group=labelGroups.get(item.label)||[];group.push(item);labelGroups.set(item.label,group);}
const folds:Array<TrainingExample[]> = [[],[],[],[],[]];
for(const group of labelGroups.values())group.forEach((sample,i)=>folds[i%5].push(sample));
const labels=['ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','COMPLAINT','UNKNOWN'];
const matrix=Object.fromEntries(labels.map(l=>[l,Object.fromEntries(labels.map(x=>[x,0]))])) as Record<string,Record<string,number>>;
let correct=0;
for(let i=0;i<5;i++){
 const training=folds.filter((_,j)=>j!==i).flat();
 const model=train(training);
 for(const item of folds[i]){
  const result=predict(model,item.text,{confidence:Number(process.env.AGENT_CV_CONFIDENCE||0.75),margin:Number(process.env.AGENT_CV_MARGIN||0.25)});
  matrix[item.label][result.label]++;
  if(result.label===item.label)correct++;
 }
}
console.log(`EstateFlow AI — 5-fold synthetic-corpus evaluation (${samples.length} messages)`);
console.log(`Overall accuracy: ${(100*correct/samples.length).toFixed(1)}% (${correct}/${samples.length})`);
for(const label of labels){const tp=matrix[label][label];const row=Object.values(matrix[label]).reduce((a,b)=>a+b,0);const col=labels.reduce((a,l)=>a+matrix[l][label],0);
 console.log(`${label.padEnd(19)} recall=${(100*tp/Math.max(1,row)).toFixed(1)}% precision=${(100*tp/Math.max(1,col)).toFixed(1)}% actual=${row}`);
}
console.log('Confusion matrix (rows=actual, columns=predicted):');
console.log(' '.repeat(20)+labels.map(l=>l.slice(0,7).padEnd(8)).join(''));
for(const actual of labels)console.log(actual.padEnd(20)+labels.map(pred=>String(matrix[actual][pred]).padEnd(8)).join(''));
console.log('Warning: synthetic data can be repetitive and too easy. Real-world validation is still required.');
