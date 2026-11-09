/**
 * A conversation is the unit of memory, not a single guest message.
 * Rebuild facts from ordered, persisted enquiry_messages so an asynchronous
 * classifier, server restart, or follow-up without a date cannot erase them.
 * No AI-generated value is permitted into these confirmed customer facts.
 */
import { extractRequirements, type Extraction } from '../agent/classifier';

export type GuestConversationFacts = {
 dateText: string | null;
 dateIso: string | null;
 exactCheckIn: string | null;
 exactCheckOut: string | null;
 guestCount: number | null;
 requestedVenue: Extraction['requestedVenue'];
 venueSuggestionRequested:boolean;
};
export type VenueScheduleObservation = 'NOT_CONFIGURED'|'BOOKED'|'BLOCKED'|'OPEN_SLOT'|'UNAVAILABLE';

const EMPTY: GuestConversationFacts = {dateText:null,dateIso:null,exactCheckIn:null,exactCheckOut:null,guestCount:null,requestedVenue:null,venueSuggestionRequested:false};
const wantsSuggestion=(message:string)=>/\b(?:suggest|recommend|which|what)\b.{0,70}\b(?:venue|place|lawn|hall)\b|\bvenue\b.{0,40}\b(?:suggest|recommend)\b/i.test(message);
const MONTHS:Record<string,number>={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function isoDate(day:number,month:number,year:number):string|null{
 const value=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const d=new Date(`${value}T00:00:00Z`);
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value?value:null;
}
function confirmedDate(message:string,priorYear:number|null):{text:string;iso:string}|null{
 // Explicit day/month/year is standard for the project's Indian audience.
 // 'Change the date from 17/11/2026 to 20/11/2026' is a correction, NOT a stay range.
 const slashMatches=[...message.matchAll(/\b([0-3]?\d)\/([01]?\d)\/(20\d{2})\b/g)];
 const correction=/\b(?:change|reschedule|move|shift|update|instead)\b/i.test(message);
 const slash=correction&&slashMatches.length>1?slashMatches[slashMatches.length-1]:slashMatches[0];
 if(slash){const iso=isoDate(Number(slash[1]),Number(slash[2]),Number(slash[3]));return iso?{text:slash[0],iso}:null;}
 const standard=/\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(message);
 if(standard){const iso=isoDate(Number(standard[3]),Number(standard[2]),Number(standard[1]));return iso?{text:standard[0],iso}:null;}
 // Follow-up "change it to 20 November" inherits the confirmed year only.
 const written=/\b([0-3]?\d)(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(20\d{2}))?\b/i.exec(message);
 if(written){const year=written[3]?Number(written[3]):priorYear;if(!year)return null;
  const iso=isoDate(Number(written[1]),MONTHS[written[2].slice(0,3).toLowerCase()],year);
  return iso?{text:written[0],iso}:null;
 }
 return null;
}

export function conversationFacts(messages:readonly string[]):GuestConversationFacts{
 const current={...EMPTY};
 for(const raw of messages){
  const message=String(raw||'').slice(0,5000);
  const extracted=extractRequirements(message);
  // For a date range retain both bound dates. A later single day replaces that range.
  if(extracted.exactCheckIn && extracted.exactCheckOut && !(/\b(?:change|reschedule|move|shift|update|instead)\b/i.test(message) && /\bfrom\b/i.test(message))){
   current.dateText=extracted.dateText;
   current.dateIso=extracted.exactCheckIn;
   current.exactCheckIn=extracted.exactCheckIn;
   current.exactCheckOut=extracted.exactCheckOut;
  } else {
   const previousYear=current.dateIso?Number(current.dateIso.slice(0,4)):null;
   const found=confirmedDate(message,previousYear);
   if(found){current.dateText=found.text;current.dateIso=found.iso;current.exactCheckIn=null;current.exactCheckOut=null;}
  }
  if(extracted.guestCount!==null)current.guestCount=extracted.guestCount;
  if(extracted.requestedVenue){current.requestedVenue=extracted.requestedVenue;current.venueSuggestionRequested=false;}
  else if(wantsSuggestion(message))current.venueSuggestionRequested=true;
 }
 return current;
}

/** Keep the existing extraction contract used by the staff inbox. */
export function withConversationFacts(base:Extraction,facts:GuestConversationFacts):Extraction{
 const checkIn=facts.dateText?facts.exactCheckIn:base.exactCheckIn;
 const checkOut=facts.dateText?facts.exactCheckOut:base.exactCheckOut;
 const updated:Extraction={...base,
  dateText:facts.dateText??base.dateText,
  exactCheckIn:checkIn,
  exactCheckOut:checkOut,
  guestCount:facts.guestCount??base.guestCount,
  requestedVenue:facts.requestedVenue??base.requestedVenue,
 };
 updated.missingFields=[...new Set([
  ...(checkIn&&checkOut?[]:['exact_dates']),
  ...(updated.guestCount===null?['guests']:[]),
 ])];
 return updated;
}

const fmtCount=(n:number)=>n.toLocaleString('en-IN');
const suggestVenue=wantsSuggestion;
const askAvailability=(message:string)=>/\b(?:availability|available|vacant|free\s+(?:for|on)|check\s+(?:the\s+)?(?:date|venue|lawn|room))\b/i.test(message);
const changeDate=(message:string)=>/\b(?:change|move|reschedule|shift|update|different|instead)\b.{0,55}\b(?:date|day|november|december|january|february|march|april|may|june|july|august|september|october)\b|\b(?:date|day)\b.{0,30}\b(?:change|move|reschedule|instead)\b/i.test(message);

/**
 * A safe answer for questions requiring grounded cumulative facts or availability.
 * Never treats venue resource units as a certified *guest* occupancy limit.
 * null means the ordinary model-powered FAQ path may answer.
 */
export function contextualGuestReply(latestMessage:string,facts:GuestConversationFacts,venueStatus?:VenueScheduleObservation):string|null{
 const latest=latestMessage.trim();
 const hasCurrent=extractRequirements(latest);
 const recommended=suggestVenue(latest);
 const availability=askAvailability(latest);
 const change=changeDate(latest);
 const known=facts.dateText?`${facts.dateText}`:'an unconfirmed date';
 const guests=facts.guestCount!==null?`${fmtCount(facts.guestCount)} guests`:'an unconfirmed guest count';
 if(change && !hasCurrent.dateText && !confirmedDate(latest,facts.dateIso?Number(facts.dateIso.slice(0,4)):null)){
  return `I still have ${known} recorded for your enquiry, with ${guests}. What new exact date would you like to use? Your previous details remain saved until you provide a replacement. No reservation has been changed.`;
 }
 if(recommended){
  const context=facts.dateText?`on ${facts.dateText}`:'for your preferred date';
  const existing=facts.guestCount!==null?`${fmtCount(facts.guestCount)} guests ${context}`:`your group ${context}`;
  return `I have ${existing} recorded. You asked me to suggest a venue. The resort has wedding lawns, but I don't have a verified guest-capacity record showing which venue could accommodate this group, so I can't safely recommend one as suitable. Is this a wedding, corporate event or another gathering? Our reservations team must verify venue capacity, dining, parking and staffing; no reservation has been made.`;
 }
 if(availability){
  const dated=facts.dateText?`for ${facts.dateText}`:'but I still need your exact date';
  const group=facts.guestCount!==null?` for ${fmtCount(facts.guestCount)} guests`:'';
  const venue=facts.requestedVenue==='LAWN'?'the wedding lawn':facts.requestedVenue==='CONFERENCE_HALL'?'the conference hall':'the venue';
  const status=venueStatus==='BOOKED'?`The recorded ${venue} is already claimed on that date. `:
   venueStatus==='BLOCKED'?`The ${venue} booking slot is blocked or full on that date. `:
   venueStatus==='OPEN_SLOT'?`A booking slot is recorded for ${venue} on that date, but this does not prove it can accommodate ${guests} or that the entire event is feasible. `:
   venueStatus==='NOT_CONFIGURED'?`The ${venue} booking capacity for that date has not been configured. `:
   venueStatus==='UNAVAILABLE'?`The live venue schedule could not be checked right now. `:'';
  const needs=!facts.dateText?' Please provide your event date.':facts.requestedVenue===null && facts.venueSuggestionRequested?' You previously asked for a venue recommendation; no venue has been selected or verified for your group.':facts.requestedVenue===null?' Is this an overnight stay or an event requiring a venue?':'';
  return `I'll use your existing enquiry details: ${dated}${group}. ${status}Full availability is not confirmed; the reservations team must validate venue, dining, parking, staffing and any room needs against current bookings.${needs} No booking has been made.`;
 }
 if(hasCurrent.dateText || hasCurrent.guestCount!==null || /\b(?:change|update|reschedule|shift)\b/i.test(latest)){
  const details=[facts.dateText?`the date ${facts.dateText}`:null,facts.guestCount!==null?`${fmtCount(facts.guestCount)} guests`:null].filter(Boolean).join(' and ');
  const needs=[!facts.dateText?'your exact date':null,facts.guestCount===null?'expected guest count':null].filter(Boolean);
  const followup=needs.length?` Please share ${needs.join(' and ')}.`:facts.requestedVenue===null?' Is this an overnight stay or an event, and do you have a preferred venue?':'';
  return `I have ${details||'your enquiry'} recorded in this conversation.${followup} The team will verify availability and feasibility from resort records; no booking has been made.`;
 }
 return null;
}
