# EstateFlow — Milestone 4: Staff operations + Lovable API handoff

**Owner:** Rishabh Tomar  
**Stack:** NestJS 11, PostgreSQL 14+, Node.js 20.19+, custom local intent classifier  
**Scope:** Backend-only (Lovable frontend is still under construction).  
**Status:** Source changes and offline checks complete. PostgreSQL-backed E2E requires your Mac.

## What changed

1. **Staff event list:** `GET /staff/events?status=PROPOSED&limit=25&offset=0` now returns a paginated list with `enquiry_ref`, for the Feasibility Workbench navigation.
2. **Operations overview:** `GET /staff/overview?date=2027-02-14` returns aggregate counts (open enquiries, GM escalations, unsorted cases, proposed/reserved events, confirmed arrivals/departures). No customer personal data in this response.
3. **Explicit enquiry → proposal handoff:** `POST /staff/enquiries/:id/event-proposal` creates a **PROPOSED** event, linked to a previously classified wedding/offsite enquiry. Staff MUST supply and verify all required resource values; it does not automatically reserve anything.
4. **Duplicate and complaint guardrails:** One event proposal per enquiry (`sql/003_event_enquiry_link.sql`). Attempts to convert complaint-escalated enquiries to proposals are rejected. These rules are enforced by NestJS and PostgreSQL, not the AI model.
5. **Idempotent hold safety:** Reusing a booking hold key with different dates, room type, or guests returns HTTP 409 rather than replaying an unrelated hold. Replaying an identical active hold returns the original hold with `replayed: true`; expired or confirmed holds require a new key.
6. **Lovable handoff:** `integrations/estateflow-api.ts` is a zero-dependency typed React API client which consumes these real backend routes. It never stores credentials and does not fake reservations.
7. **Additional tests:** `npm run test:m4` provides offline hold-key unit checks. The `test:e2e` script includes the staff list, overview, enquiry proposal, duplicate prevention, complaint protection and idempotency scenarios.

## Apply to your existing working directory

The complete ZIP contains every source file. For an existing Milestone 3 project, prefer the separate patch ZIP. **Back up your project and preserve your `.env` and local model/training files.** Copy the patch files into the backend root, keeping their relative paths.

```bash
npm install
npm run db:migrate        # Adds 003; does not drop your main DB
npm run agent:train       # Optional if model already exists and is current
npm run build
npm run test:unit
npm run test:agent
npm run test:m4
npm run db:verify
npm run dev
```

For actual integration tests:

```bash
npm run test:e2e
```

> **DANGER:** `test:e2e` DROPS and recreates the `public` schema in `estateflow_test`. Run it only if `estateflow_test` is a disposable database. Never run against the production or main `estateflow` DB. The test runner checks the connected database's identity before resetting.

The main local database remains configured with `DB_USER=rishabh`. **Do not share or commit your DB password or `.env`.**

## New API contracts

All new routes require `Authorization: Bearer <staff-or-GM-JWT>`.

### Staff operational overview

```http
GET /staff/overview?date=2027-02-14
```

Example shape:

```json
{
  "date": "2027-02-14",
  "counts": {
    "open_enquiries": 3,
    "gm_escalations": 0,
    "unsorted_enquiries": 0,
    "proposed_events": 1,
    "reserved_events": 0,
    "arrivals": 0,
    "departures": 0
  },
  "asOf": "2026-11-05T00:00:00.000Z"
}
```

Values are illustrative. Dates are ISO local calendar dates; the default date is in `Asia/Kolkata`.

### Event listing

```http
GET /staff/events?status=PROPOSED&limit=25&offset=0
```

Returns `{items:[...],total,limit,offset}`. `status` is optional (`PROPOSED` or `RESERVED`). Invalid filters return 400.

### Create a staff-verified event proposal from an enquiry

```http
POST /staff/enquiries/{enquiryId}/event-proposal
Content-Type: application/json
```

```json
{
  "title": "Wedding — Staff reviewed",
  "eventDate": "2027-02-14",
  "checkIn": "2027-02-13",
  "checkOut": "2027-02-15",
  "guests": 250,
  "roomsRequired": 35,
  "diningGuests": 250,
  "parkingSpaces": 60,
  "eventStaff": 12,
  "venueCode": "LAWN"
}
```

Returns HTTP 201 with `{ event, requiresApproval: true, reserved: false }`. Staff then explicitly call evaluation, alternative search, and finally approval after a feasibility check. **This endpoint does not allocate resources.** A repeated proposal, a complaint escalation, or an unsupported enquiry category returns 409.

## Lovable integration map

| React experience | Endpoint |
|---|---|
| Resort landing / room cards | `GET /room-types` |
| Date search | `GET /availability` |
| Tax-inclusive quote | `POST /quotes` |
| Guest checkout | `POST /booking-holds` |
| Test payment | `POST /payments/mock/confirm` |
| Wedding/offsite form | `POST /enquiries` |
| Reservations dashboard | `GET /staff/overview` |
| AI inbox | `GET /staff/enquiries` |
| Event workbench list | `GET /staff/events` |
| Enquiry → verified event | `POST /staff/enquiries/:id/event-proposal` |
| Resource graph | `GET /staff/events/:id/requirements` |
| Feasibility | `POST /staff/events/:id/evaluations` |
| Alternatives | `GET /staff/events/:id/alternatives` |
| Approve resource bundle | `POST /staff/events/:id/reserve` |
| Daily rate & stock controls | `GET/PUT /staff/rates`, `GET/PUT /staff/inventory` |

### Frontend API configuration

Set a Lovable/Vite environment variable in the frontend project:

```dotenv
VITE_ESTATEFLOW_API_URL=http://localhost:4000
```

Create the client in React using an **in-memory token** returned from `POST /auth/login`:

```typescript
import { EstateFlowApi } from './lib/estateflow-api';
const api = new EstateFlowApi(
  import.meta.env.VITE_ESTATEFLOW_API_URL,
  () => accessToken // from React state, NOT localStorage
);
```

**Note:** A hosted Lovable preview cannot reach PostgreSQL or NestJS on your Mac through the preview server by using `localhost`; `localhost` in a remote browser/runtime does not refer to your Mac. For remote preview, configure a reachable HTTPS backend deployment or a carefully controlled development tunnel. Keep secrets server-side.

## AI agent boundaries

The local intent classifier remains the existing project-specific model (`local-nb-v2`, 160 synthetic labelled messages). It only classifies, extracts and drafts. The new enquiry-to-event endpoint is staff-only. The agent has **no access to write or approval endpoints**.

## Testing expectations

- `npm run test:m4`: seven offline idempotency assertions.
- `npm run test:e2e`: creates, evaluates and reserves event bundles; tests concurrent holds and lawn allocations; new M4 checks confirm proposal linkage and staff-only APIs.
- `npm run db:verify`: checks the original five resource/allotment invariants.
- `npm run build`: authoritative TypeScript compilation on your Mac.

**Known limitations:** The resort service capacity model is day-level, not minute-by-minute rostering. The local AI is not a generative LLM; customer replies are reviewed templates. The website allotment is not synchronized with external OTAs/PMS.

## Next milestone after M4 validation

Integrate the exported Lovable React app screen by screen, using the typed API adapter; validate the exact checkout response fields, event workbench status transitions, mobile error states and production network behavior. Prioritize a true end-to-end user experience over additional demo features.
