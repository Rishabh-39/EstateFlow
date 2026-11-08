# Milestone 4 — Date-only Booking Hold Idempotency Fix

## Symptom

`npm run test:e2e` passes concurrency/allotment tests and fails on `identical hold request key safely replays the active hold`.

## Root cause

Node PostgreSQL `DATE` values may be materialized as JavaScript `Date` objects at **local midnight**. In India Standard Time, `new Date(2027, 7, 11).toISOString().slice(0,10)` is `2027-08-10`, not `2027-08-11`. The idempotency matcher previously compared this shifted value against the guest-requested calendar date and rejected a valid replay.

## Resolution

- Cast `booking_holds.check_in` and `check_out` to `::text` when retrieving an existing hold and returning a new hold.
- Normalize the returned rows to canonical `YYYY-MM-DD` strings.
- Refuse ambiguous JavaScript `Date` objects in the hold request comparison helper, so future code cannot silently regress.
- Add a timezone-specific regression test and improve E2E diagnostics.

This fix requires **no database migration**. It does not change any existing reservations, allotments, or prices.

## Apply patch to your existing EstateFlow_Backend 4

1. Back up your current working folder.
2. Copy the following patch files, preserving paths:
   - `src/bookings/bookings.ts`
   - `src/shared/hold-idempotency.ts`
   - `test/m4-contract.unit.ts`
   - `scripts/e2e.mjs`
3. Leave `.env`, `model/`, and local PostgreSQL data untouched.
4. Run:

```bash
npm run build
npm run test:m4
npm run db:verify
npm run test:e2e
```

**WARNING:** `npm run test:e2e` resets the `public` schema of the disposable **estateflow_test** database. Never point it at any database containing data you need.

## Verification performed for this patch

The idempotency regression tests were executed successfully with both `TZ=Asia/Kolkata` and `TZ=UTC`; E2E JS syntax was also checked. Full NestJS build and PostgreSQL E2E remain to be run in your local environment.
