# EstateFlow E2E Repeatability Fix — Milestone 3

## Root issue

The original `npm run test:e2e` reused a persistent `estateflow_test` database. Seed inserts used `ON CONFLICT DO NOTHING`, so earlier confirmed room bookings and event reservations survived. Since the suite reused the same August/September 2027 dates, later runs could fail the "one available website room" assertion even when the inventory API was correct.

## Changes

- `scripts/run-e2e.mjs`: after checking the **actual** connected database name, clears `public` schema in **estateflow_test only**, then migrates and seeds anew. Does not connect to or erase the main `estateflow` database.
- `scripts/e2e.mjs`: if availability is unexpectedly different, logs HTTP response, active physical room count, daily allotment, blackout status, physical occupancy, and direct occupancy for the two test nights.

## Run on your Mac

1. Back up your local code and `.env`. Replace the two scripts from this patch or use the complete updated ZIP; keep your existing `.env`.
2. Ensure `estateflow_test` exists. If it does not, run:
   `psql -h localhost -U rishabh -d postgres -c 'CREATE DATABASE estateflow_test;'`
3. Run `npm run build` and `npm run test:e2e` from the backend root.

**CAUTION: Every `npm run test:e2e` now deletes the entire `public` schema in `estateflow_test`. Never store valuable records there.** The main `estateflow` database is not modified by the runner.

## Why the result is not yet verified against your Mac

The patch passes local JS syntax checks, but this packaging environment has no running PostgreSQL server or installed project node_modules. PostgreSQL integration behavior is only verified after you run it locally.

If the test still fails after reset, copy the `E2E availability diagnostic` block. That will identify whether the API returns the wrong room type, allotment, occupancy, or status.
