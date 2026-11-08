# Lovable add-on — cancel booking UI (v0.11.0)

Continue the existing EstateFlow guest UX without rebuilding its architecture.

On guest booking details for a CONFIRMED, future stay, add a secondary **Cancel booking** action with a confirmation dialog that clearly states **test/mock payment only — no actual refund**. Do not imply a real payment or refund has occurred. Require a deliberate user click and confirmation. Call the typed API client method `cancelBooking(bookingId, 'GUEST_REQUEST')` and refresh `myBookings()` after success. Show a success state with `status: CANCELLED`; avoid hiding the booking entirely so its history remains visible.

No cancellation button for already cancelled or checked-in stays. Server is the authoritative policy check (local Asia/Kolkata date); handle API 401, 403, 404, and 409 with appropriate messages. Do not offer event cancellation: this endpoint only releases DIRECT physical room nights. AI must never invoke cancellation.

The backend uses a new idempotent `POST /bookings/{id}/cancel` route. `GET /booking-holds/{id}` can now report CANCELLED. The site must not claim refunded funds; the response says `refundStatus: NOT_PROCESSED`. This policy is a technical MVP assumption until approved by the resort.
