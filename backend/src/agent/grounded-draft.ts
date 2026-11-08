/** Staff-editable reply composed from *stated* structured form fields, not unverified facts.
 * Do not ask the guest again for facts the form already includes. */
export function formGroundedDraft(name:string,form:any):string|null{
 if(!form||typeof form!=='object'||typeof form.type!=='string')return null;
 const kind=String(form.type||'event').trim();
 const label=kind==='Other events'&&form.eventName?String(form.eventName).slice(0,80):kind;
 const known:string[]=[];
 if(form.startDate&&form.endDate)known.push(`dates ${form.startDate} to ${form.endDate}`);
 if(Number.isSafeInteger(Number(form.guests))&&Number(form.guests)>0)known.push(`${form.guests} guests`);
 if(Number.isSafeInteger(Number(form.rooms)))known.push(`${form.rooms} rooms`);
 if(form.venue&&form.venue!=='Not sure yet')known.push(`requested venue: ${form.venue}`);
 if(form.dining&&form.dining!=='Not required')known.push(`dining preference: ${form.dining}`);
 if(Number.isSafeInteger(Number(form.parking)))known.push(`${form.parking} parking spaces`);
 if(form.eventDescription)known.push(`event details: ${String(form.eventDescription).slice(0,160)}`);
 const missing:string[]=[];
 if(!form.startDate||!form.endDate)missing.push('the preferred dates');
 if(!form.guests)missing.push('the guest count');
 if(form.venue==='Not sure yet')missing.push('your venue preference');
 const greeting=`Hello ${name},`;
 const intro=`Thank you for your ${label.toLowerCase()} enquiry. I have recorded ${known.length?known.join(', '):'your enquiry details'}.`;
 const remaining=missing.length?`Could you please clarify ${missing.join(' and ')}? `:'';
 return `${greeting}\n\n${intro}\n\n${remaining}Our reservations team will verify venue, room, dining, parking and staff capacity against the requested dates before confirming feasibility. No reservation has been made yet.\n\nWarm regards,\nEstateFlow Reservations`;
}
export function redundantQuestion(draft:string,form:any):boolean{
 if(!form)return false;
 const t=draft.toLowerCase();
 return Boolean((form.startDate&&form.endDate&&/\b(provide|share|confirm|clarify|tell us)\b.{0,65}\b(exact|preferred|event|check-?in|check-?out)?\s*dates?\b/.test(t))
  ||(form.guests&&/\b(provide|share|confirm|clarify|tell us)\b.{0,50}\b(guest count|how many guests|number of guests)\b/.test(t))
  ||(form.venue&&form.venue!=='Not sure yet'&&/\b(provide|share|confirm|clarify)\b.{0,55}\b(venue|lawn|hall)\b/.test(t)));
}
