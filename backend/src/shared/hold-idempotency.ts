/** Pure, deterministic booking-hold retry comparison. */
export function toDateOnly(value: unknown): string | null {
 if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
 // PostgreSQL DATE must be selected as ::text. Date objects are ambiguous across time zones.
 // Fail closed instead of silently converting local midnight to the previous UTC day.
 if (value instanceof Date) return null;
 return null;
}
export function assertMatchingHoldRequest(
 existing: {room_type_id: string;check_in: unknown;check_out: unknown;guests: number},
 requested: {roomTypeId?: unknown;checkIn?: unknown;checkOut?: unknown;guests?: unknown}
): boolean {
 return existing.room_type_id === requested.roomTypeId
  && toDateOnly(existing.check_in) !== null
  && toDateOnly(existing.check_in) === toDateOnly(requested.checkIn)
  && toDateOnly(existing.check_out) === toDateOnly(requested.checkOut)
  && Number(existing.guests) === requested.guests;
}

/** Convert a PostgreSQL booking_holds query result to canonical date-only strings.
 * SQL must select: check_in::text AS check_in_date, check_out::text AS check_out_date.
 * Never format pg DATE instances using Date.toISOString() for booking comparisons.
 */
export function normalizeHoldDateFields(row: Record<string, unknown>) {
 const { check_in_date, check_out_date, ...rest } = row;
 if (typeof check_in_date !== 'string' || typeof check_out_date !== 'string'
     || !/^\d{4}-\d{2}-\d{2}$/.test(check_in_date)
     || !/^\d{4}-\d{2}-\d{2}$/.test(check_out_date)) {
  throw new Error('Expected PostgreSQL DATE columns cast to text');
 }
 // Validate the stored request fields as well as the dates. Explicitly including
 // them in the return value gives TypeScript a sound, concrete result type.
 // Without these properties, the inferred return type only contains dates and
 // a generic Record<string, unknown>; strict TS rejects hold comparisons.
 const roomTypeId = row.room_type_id;
 const guests = row.guests;
 if (typeof roomTypeId !== 'string' || roomTypeId.length === 0
     || typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1) {
  throw new Error('Expected room_type_id and guests in booking hold row');
 }
 return {
  ...rest,
  room_type_id: roomTypeId,
  guests,
  check_in: check_in_date,
  check_out: check_out_date
 };
}
