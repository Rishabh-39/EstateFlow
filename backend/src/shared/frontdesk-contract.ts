/** Pure frontend-facing read models. No SQL, NestJS or environment dependencies. */
export type CalendarRow = {
  date: string;
  code: string;
  display_name: string;
  slot_id: string | null;
  slot_name: string | null;
  capacity: number | null;
  blocked: boolean | null;
  reserved: number | string | null;
};

function validIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

/** Inclusive calendar range, limited to 31 days to prevent unbounded data pulls. */
export function validateCalendarWindow(start: unknown, end: unknown) {
  if (typeof start !== 'string' || typeof end !== 'string' || !validIsoDay(start) || !validIsoDay(end)) {
    throw new Error('start and end must be valid YYYY-MM-DD dates');
  }
  const days = (Date.parse(end+'T00:00:00Z') - Date.parse(start+'T00:00:00Z')) / 86400000 + 1;
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new Error('Calendar range must be 1 to 31 inclusive days');
  return {start, end, days};
}

/** Missing resource slots mean NEEDS_REVIEW, never implicit free capacity. */
export function calendarView(rows: CalendarRow[], start: string, end: string) {
  validateCalendarWindow(start, end);
  const byDate = new Map<string, {date: string; resources: Array<{
    code:string; name:string; slotId:string|null; slotName:string|null;
    capacity:number|null;reserved:number;available:number|null;
    blocked:boolean|null;status:'AVAILABLE'|'FULL'|'BLOCKED'|'NEEDS_REVIEW';
  }>}>();
  for (const row of rows) {
    if (row.date < start || row.date > end) throw new Error('Calendar query returned date outside requested range');
    const reserved = Number(row.reserved ?? 0);
    if (!Number.isSafeInteger(reserved) || reserved < 0) throw new Error('Invalid reserved count');
    const exists = row.slot_id !== null;
    const capacity = exists ? Number(row.capacity) : null;
    if (exists && (!Number.isSafeInteger(capacity) || capacity! < 0)) throw new Error('Invalid slot capacity');
    const blocked = exists ? row.blocked === true : null;
    const available = exists ? (blocked ? 0 : Math.max(0, capacity! - reserved)) : null;
    const status = !exists ? 'NEEDS_REVIEW' : blocked ? 'BLOCKED' : available === 0 ? 'FULL' : 'AVAILABLE';
    if (!byDate.has(row.date)) byDate.set(row.date,{date:row.date,resources:[]});
    byDate.get(row.date)!.resources.push({code:row.code,name:row.display_name,
      slotId:row.slot_id,slotName:row.slot_name,capacity,reserved,available,blocked,status});
  }
  return {start,end,days:[...byDate.values()],asOf:new Date().toISOString(),
    note:'Daily DAY slots only. Missing slots require staff review; this is not minute-level scheduling.'};
}

/** Keep checkout hold state simple for the UI; the DB determines expiry with NOW(). */
export function holdView(row: Record<string, unknown>) {
  const checkIn = row.check_in as string, checkOut = row.check_out as string;
  if (!validIsoDay(checkIn) || !validIsoDay(checkOut)) throw new Error('Booking hold dates must be PostgreSQL DATE::text');
  if (!['ACTIVE','EXPIRED','CONFIRMED','CANCELLED'].includes(String(row.effective_status))) throw new Error('Unknown hold status');
  const seconds = Number(row.remaining_seconds);
  if (!Number.isSafeInteger(seconds) || seconds < 0) throw new Error('Invalid hold expiry');
  return {
    id:String(row.id),roomTypeId:String(row.room_type_id),checkIn,checkOut,
    guests:Number(row.guests),status:row.effective_status as 'ACTIVE'|'EXPIRED'|'CONFIRMED'|'CANCELLED',
    expiresAt:new Date(String(row.expires_at)).toISOString(),remainingSeconds:seconds,
    totalPaise:Number(row.total_paise),currency:'INR' as const
  };
}

/** Reject default/placeholder signing secrets even if they exceed 32 chars. */
export function isStrongJwtConfigured(secret: unknown): boolean {
  return typeof secret === 'string' && secret.length >= 32
    && !/REPLACE|YOUR_OWN|CHANGE_ME|EXAMPLE|PLACEHOLDER|^0+$|^a+$/i.test(secret);
}
