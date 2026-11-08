/** Booking cancellation rules are intentionally pure for deterministic testing. */
export const CANCELLATION_REASONS = ['GUEST_REQUEST','DUPLICATE','STAFF_CORRECTION','OTHER'] as const;
export type CancellationReason = typeof CANCELLATION_REASONS[number];
export function cancellationReason(value: unknown, role: string): CancellationReason {
  if (value === undefined || value === null) return role === 'GUEST' ? 'GUEST_REQUEST' : 'OTHER';
  if (typeof value !== 'string' || !CANCELLATION_REASONS.includes(value as CancellationReason))
    throw new Error('reasonCode must be GUEST_REQUEST, DUPLICATE, STAFF_CORRECTION or OTHER');
  return value as CancellationReason;
}
export function beforeCheckIn(checkIn: string, todayIndia: string): boolean {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(checkIn) || !iso.test(todayIndia)) throw new Error('Expected date-only ISO values');
  return checkIn > todayIndia;
}
export function cancellationView(bookingId:string, reference:string, replayed:boolean, roomNightsReleased:number) {
  return {bookingId,reference,status:'CANCELLED' as const,replayed,
    roomNightsReleased,simulatedPayment:true,refundStatus:'NOT_PROCESSED' as const,
    message:'This cancels a simulated booking and releases its physical room nights. No actual refund is processed.'};
}
