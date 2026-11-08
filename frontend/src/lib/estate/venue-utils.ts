/** Venue preference is a guest/staff REQUEST, never a verified capacity or a reservation. */
export type VenuePreference = 'LAWN'|'CONFERENCE_HALL'|'PLANTATION_PAVILION'|'UNCONFIRMED';
export type EventKind = 'Wedding'|'Corporate offsite'|'Celebration'|'Other events';

export function normalizeVenue(raw: unknown): VenuePreference {
  const v=String(raw??'').trim().toLowerCase();
  if(v==='lawn'||/\b(lawn|garden venue)\b/.test(v))return 'LAWN';
  if(v==='conference_hall'||/\b(conference|meeting hall|meeting room|meeting space)\b/.test(v))return 'CONFERENCE_HALL';
  if(v==='plantation_pavilion'||/\b(pavilion|celebration venue|private event space)\b/.test(v))return 'PLANTATION_PAVILION';
  return 'UNCONFIRMED';
}

export function inferVenue(text: string): VenuePreference {
  // Conservative deterministic fallback when neither form nor corrected extraction supplied a venue.
  // Do not infer a lawn just because the event is a wedding.
  if(/\b(conference hall|meeting hall|meeting room|meeting space)\b/i.test(text))return 'CONFERENCE_HALL';
  if(/\b(plantation pavilion|pavilion)\b/i.test(text))return 'PLANTATION_PAVILION';
  if(/\b(lawn|garden venue)\b/i.test(text))return 'LAWN';
  return 'UNCONFIRMED';
}

export const SUGGESTED_VENUES:Record<EventKind,string>={
  Wedding:'Wedding lawn',
  'Corporate offsite':'Conference hall',
  Celebration:'Plantation pavilion',
  'Other events':'Plantation pavilion',
};

/** Change the initial suggestion with event type, but NEVER override an explicitly chosen venue. */
export function venueOnTypeChange(previous:EventKind,currentVenue:string,next:EventKind):string {
  return currentVenue===SUGGESTED_VENUES[previous]?SUGGESTED_VENUES[next]:currentVenue;
}
