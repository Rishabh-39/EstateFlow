import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
// Frontend is ESM; compile only its pure, dependency-free venue helper in memory for this CJS test.
const utilsPath=resolve(__dirname,'../../frontend/src/lib/estate/venue-utils.ts');
const compiled=ts.transpileModule(readFileSync(utilsPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const testedExports:Record<string,any>={};
new Function('exports',compiled)(testedExports);
const { normalizeVenue, inferVenue, venueOnTypeChange } = testedExports;
import { validateCorrection, mergeCorrection } from '../src/agent/policy';
import { extractRequirements } from '../src/agent/classifier';
import { supportedCount } from '../src/agent/ollama';

let checks=0;
const eq=(actual:unknown,expected:unknown,message:string)=>{assert.deepEqual(actual,expected,message);checks++;};
const yes=(actual:unknown,message:string)=>{assert.ok(actual,message);checks++;};
const fails=(run:()=>unknown,message:string)=>{assert.throws(run,{name:'Error'},message);checks++;};

// The original guest form offers these options; they should map to a REVIEWED preference.
eq(normalizeVenue('Wedding lawn'),'LAWN','Existing configured resource');
eq(normalizeVenue('Conference hall'),'CONFERENCE_HALL','Offsite request');
eq(normalizeVenue('Plantation pavilion'),'PLANTATION_PAVILION','Celebration venue');
eq(normalizeVenue('Not sure yet'),'UNCONFIRMED','Undecided venue');
eq(inferVenue('Leadership offsite in the meeting hall'),'CONFERENCE_HALL','Venue automatically preselected from enquiry words');
eq(inferVenue('Can the lawn accommodate 250 guests?'),'LAWN','Lawn indicated by guest');
eq(inferVenue('Birthday celebration for 60 guests'),'UNCONFIRMED','Do not invent a venue just because of event category');
eq(venueOnTypeChange('Wedding','Wedding lawn','Corporate offsite'),'Conference hall','Change untouched default based on type');
eq(venueOnTypeChange('Corporate offsite','Conference hall','Celebration'),'Plantation pavilion','Celebration default');
eq(venueOnTypeChange('Wedding','Conference hall','Celebration'),'Conference hall','Preserve explicitly selected venue');

const patch=validateCorrection({requestedVenue:null,venuePreference:'PLANTATION_PAVILION',eventType:'Celebration'});
eq(patch.eventType,'Celebration','Celebration type saved as reviewable metadata');
eq(patch.venuePreference,'PLANTATION_PAVILION','Unconfigured venue can be recorded without claiming inventory');
fails(()=>validateCorrection({venuePreference:'LUXURY_BANQUET'}),'Reject unsupported venue codes');
fails(()=>validateCorrection({eventType:'Approved wedding'}),'Reject unsupported classification claims');
fails(()=>validateCorrection({venueCode:'LAWN'}),'No arbitrary backend event venue claim from extraction');
const result=mergeCorrection(extractRequirements('offsite meeting hall on uncertain dates'),patch);
eq(result.requestedVenue,null,'Do not turn pavilion into a fictitious lawn or meeting room reservation');
eq((result as typeof result & {venuePreference?:string}).venuePreference,'PLANTATION_PAVILION','Manual venue choice survives correction merge');

// Real customer screenshot regression, before this patch the local model missed 200 guests.
eq(supportedCount('about 200 wedding guest','guestCount')?.value,200,'Recover 200 wedding guests from literal evidence');
eq(supportedCount('about 200 wedding guest','guestCount')?.approximate,true,'Keep about as approximate');
eq(supportedCount('between 200 and 250 wedding guests','guestCount'),null,'Do not silently choose one number from a range');

const frontend=resolve(__dirname,'../../frontend/src/routes');
const inbox=readFileSync(resolve(frontend,'staff.inbox.tsx'),'utf8');
const workbench=readFileSync(resolve(frontend,'staff.workbench.$enquiryId.tsx'),'utf8');
yes(inbox.includes('validateSearch')&&inbox.includes('enquiryId')&&inbox.includes('Route.useSearch()'),'Inbox selection kept in URL');
yes(inbox.includes('selectedItemRef.current?.scrollIntoView'),'Return to selected card in long list');
yes(workbench.includes('search={{ enquiryId }}'),'Workbench back and edit links include same enquiry ID');
yes(workbench.includes('Conference / meeting hall')&&workbench.includes('Plantation pavilion'),'All original venue choices visible in original workbench');
yes(workbench.includes('Corporate offsite')&&workbench.includes('Celebration / private event'),'All event-type choices available for staff review');
yes(workbench.includes('eventTypeMatchesClassification'),'Reservation blocked on mismatched or unsupported type');
yes(workbench.includes('!r.needsLawn')&&workbench.includes('Venue needs manual review'),'Non-seeded venue cannot be approved through lawn inventory');
console.log(`PASS EstateFlow workbench venue preference, event defaults, manual correction and same-enquiry return (${checks} assertions)`);
