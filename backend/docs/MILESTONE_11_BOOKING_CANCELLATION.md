# EstateFlow Milestone 11 — Booking cancellation and room-inventory recovery

Owner: Rishabh Tomar. Backend v0.11.0. Guest UI remains a separate Lovable project.

## What is new

- `POST /bookings/{id}/cancel` is **authenticated**. A guest may cancel only their own confirmed booking. STAFF/GM may cancel other guests' bookings. The backend re-checks database role on every request.
- JSON body: `{ "reasonCode": "GUEST_REQUEST" }`. Accepted values: `GUEST_REQUEST`, `DUPLICATE`, `STAFF_CORRECTION`, `OTHER`. No guest contact information is required.
- Cancellations are permitted **only before the check-in date in Asia/Kolkata**, not on or after the local check-in date. This is a proposed technical MVP rule, **not** a verified resort cancellation/refund policy. Confirm the business policy before production.
- Uses the same global transaction-scoped inventory advisory lock as room holds and staff-approved events. Within one PostgreSQL transaction it validates owner and state, removes exactly the expected DIRECT room-night rows, marks booking and hold CANCELLED, and creates an audit log. Unexpected inventory counts cause complete rollback.
- Retrying cancellation returns `replayed: true` and frees **zero** additional room nights. A previously used mock-payment key returns the current CANCELLED booking status, never re-confirms it.
- `GET /booking-holds/:id` and the typed React client now recognize `CANCELLED`.
- `GET /bookings` and `GET /bookings/:id` include the booking status; no new guest UI is shipped.
- `npm run db:verify` now has 7 checks, including cancelled-booking integrity. `npm run audit:cancellations` is a read-only local audit inspector.

## Mock-money limitation (important)

EstateFlow has only simulated payments. **No real refund is processed.** Cancellation responses include `simulatedPayment: true` and `refundStatus: NOT_PROCESSED`. Do not label a cancelled booking as refunded. No accounting ledger or refund gateway is integrated. Promotional redemptions remain counted; no real-money reconciliation is attempted. Event bundles cannot be cancelled through this endpoint.

## Exact local setup

Extract the COMPLETE zip, open the inner `EstateFlow_Backend` directory, copy your existing local `.env` from v0.10.0 without publishing it, and run:

```bash
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run contract:m9
npm run test:m11
npm run test:m10
npm run test:m9
npm run build
npm run db:verify
npm run audit:cancellations
npm run test:e2e
```

**Safety:** `npm run test:e2e` **ERASES the public schema of `estateflow_test`** only. Ensure that database is disposable. The main `estateflow` database must never be used for this test.

M11 migration `sql/004_booking_cancellation.sql` is idempotent and updates booking cancellation metadata and hold state check constraint. Do **not** run `db:seed` against an active operational database without reviewing the seed script.

## Request and response example

```http
POST /bookings/UUID-HERE/cancel
Authorization: Bearer <guest-access-token>
Content-Type: application/json

{"reasonCode":"GUEST_REQUEST"}
```

Example (illustrative; no actual reservation):

```json
{
  "bookingId":"...",
  "reference":"EF-...",
  "status":"CANCELLED",
  "replayed":false,
  "roomNightsReleased":2,
  "simulatedPayment":true,
  "refundStatus":"NOT_PROCESSED",
  "message":"This cancels a simulated booking and releases its physical room nights. No actual refund is processed."
}
```

Expected failure codes: 401 unauthenticated, 403 guest trying to cancel someone else's booking, 404 non-existent ID, 400 malformed ID/reason, 409 cancellation on/after check-in or inconsistent room inventory.

## Verifications and constraints

- Offline: `test:m11` (18 pure-rule assertions), previous M4/M5/M10 tests, and source/OpenAPI consistency checks.
- DB-based E2E: independently registered guest cannot cancel another's booking; confirmed booking cancellation frees 2 nights; availability recovers; hold becomes CANCELLED; retries are safe; previous payment key cannot resurrect booking; exactly one cancellation audit event.
- PostgreSQL E2E has **not been run in this authoring environment**; it must pass on the Mac with `estateflow_test`.
- Release does **not** implement staff event cancellation, real payments/refunds, timed staff shifts, OTA synchronization, or minute-level resource scheduling.

## Lovable handoff

Show a Cancel Booking action only on a confirmed future stay. Use `api.cancelBooking(id,'GUEST_REQUEST')`. After cancellation refresh `api.myBookings()`, and display a clear message **"Simulated booking cancelled; no real payment or refund"**. Disable the button for past/on-arrival stays; the backend is the authoritative eligibility check. Never let the AI agent call this operational mutation endpoint.
