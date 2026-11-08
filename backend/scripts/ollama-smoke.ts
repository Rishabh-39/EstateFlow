/** Real LOCAL inference smoke test. No PostgreSQL, guest data, or live bookings involved. */
import 'dotenv/config';
import { semanticExtract, ollamaWording, ollamaEnabled } from '../src/agent/ollama';

const enquiry='We are planning a wedding next December for around two hundred guests. We need roughly three dozen rooms and dinner for everyone.';
async function main(){
 if(!ollamaEnabled())throw new Error('Set AI_PROVIDER=ollama in backend/.env first');
 const result=await semanticExtract(enquiry);
 console.log('Local semantic extraction:',JSON.stringify(result,null,2));
 if(result.meta.source!=='ollama')throw new Error('Ollama structured extraction did not succeed; check `ollama list`, model name, and Ollama app');
 if(result.extraction.guestCount!==200||result.extraction.roomsRequired!==36)throw new Error('Incorrect extraction. Review the model output and prompting; do not use unverified data for feasibility.');
 if(result.extraction.exactCheckIn!==null)throw new Error('Ambiguous date incorrectly became an exact date');
 const wording=await ollamaWording('advisory','Can the lawn accommodate 200 wedding guests next December?');
 if(!wording)throw new Error('Local AI wording did not produce a safe short reply; the live concierge will use its existing guided fallback.');
 console.log('Advisory preview (not sent):',wording);
 console.log('PASS: Real local Ollama extraction and draft generation; no booking or message sent.');
}
main().catch(err=>{console.error('OLLAMA SMOKE FAILED:',(err as Error).message);process.exitCode=1;});
