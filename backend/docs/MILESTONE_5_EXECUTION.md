# EstateFlow — Milestone 5 Execution Guide

**Role:** Rishabh Tomar | **Backend:** NestJS + local PostgreSQL (`DB_USER=rishabh`) | **Version:** 0.5.0

## What changed

No PostgreSQL schema changes and no migrations are added in this milestone. This is a **complete source project**, not just a patch.

1. `GET /booking-holds/:id` returns `ACTIVE`, `EXPIRED`, or `CONFIRMED`, a 10-minute hold's remaining seconds, INR amount, and ISO date-only stay dates. Reads are restricted to the owning JWT subject (404 to everyone else, including staff).
2. `GET /staff/resources/calendar?start=2027-02-13&end=2027-02-15` returns up to 31 inclusive days, all configured resource types, their `DAY` slots, capacity, reserved quantity, remaining capacity, and statuses `AVAILABLE`, `FULL`, `BLOCKED`, or `NEEDS_REVIEW`. A missing slot cannot be silently treated as available. Only STAFF/GM can view it.
3. `GET /health/ready` checks DB reachability and local JWT configuration. Agent model is already checked at startup. If unavailable, this route responds 503 without leaking secrets.
4. `npm run preflight` verifies local configuration without altering PostgreSQL.
5. The typed React API client now supports `holdStatus(id)` and `resourceCalendar(start,end)`.

## Run in your existing local installation

Extract the **complete** ZIP and open the inner `EstateFlow_Backend` directory. Back up and copy your existing `.env` into it. Do NOT use `.env.example` as a substitute for a configured secret. Install dependencies as usual:

```bash
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run build
npm run test:m5
npm run test:m4
npm run test:unit
npm run test:agent
npm run db:verify
```

Then optionally run `npm run dev`. Visit `http://localhost:4000/health/ready`. `npm run preflight` is read-only.

**E2E:** `npm run test:e2e` resets **only** the disposable PostgreSQL database `estateflow_test` and recreates its schema. Never put real data in that database. It needs `JWT_SECRET` in `.env` and the test DB role permissions. The E2E suite now covers the new read APIs, authenticated access, hold-status transition and bounded calendar.

## Example response: GET /booking-holds/:id

```json
{
  "id":"550e8400-e29b-41d4-a716-446655440000",
  "roomTypeId":"550e8400-e29b-41d4-a716-446655440001",
  "checkIn":"2027-08-11",
  "checkOut":"2027-08-13",
  "guests":2,
  "status":"ACTIVE",
  "expiresAt":"2027-08-01T10:10:00.000Z",
  "remainingSeconds":581,
  "totalPaise":2250000,
  "currency":"INR"
}
```

Values above are **illustrative**. Do not trust a browser countdown as the source of truth; payments and reservations are rechecked server-side.

## Example resource-calendar result

Each day has `resources`. One resource entry has `code`, `name`, `slotId`, `slotName`, `capacity`, `reserved`, `available`, `blocked`, and `status`. A missing DAY slot has `capacity: null`, `available: null` and `status: "NEEDS_REVIEW"`.

This calendar intentionally models **daily** service capacity only. It does not solve venue setup/cleanup time windows or named staff shifts.

## Frontend notes

- Local API origin: `VITE_API_BASE_URL=http://localhost:4000` in Lovable's Vite frontend.
- Existing NestJS `CORS_ORIGIN` defaults to `http://localhost:5173`; update it for a different Lovable dev URL.
- No API secrets should go in React `.env` files; only the public base URL.
- Keep bearer token in React memory for this MVP. Do not store the secret itself in the browser.
- Checkout uses `POST /booking-holds`, `GET /booking-holds/:id`, and `POST /payments/mock/confirm`.
- Staff resource planning uses `GET /staff/resources/calendar`, not direct client SQL.

## Quality limits

- Tests for SQL-backed endpoints must run on the developer's PostgreSQL; they were not runnable in the artifact authoring environment.
- The new unit tests cover date-range bounds, status modeling, missing/blocked resources, JWT placeholder detection, and date-only hold representation.
- Remaining security hardening includes cookie/CSRF auth, rate limits, structured DTO validation and stronger user account/session management; this is an MVP, not production-ready.
