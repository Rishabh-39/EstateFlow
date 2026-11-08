# EstateFlow Milestone 8 — Lovable-to-NestJS Integration Handoff

## Purpose

EstateFlow's premium guest screens and staff workbench are being built separately in Lovable. This backend v0.8.0 ships a **typed, fetch-based React client** and a dedicated room-detail API. Do not replace NestJS/PostgreSQL with Lovable's hosted backend; keep the existing resource feasibility, atomic reservations and locally trained AI services.

## Project assets

- `integrations/estateflow-api.ts` — copy to the Lovable project's `src/lib/estateflow-api.ts`.
- `integrations/LOVABLE_IMPLEMENTATION_PROMPT.md` — integration prompt to paste into Lovable **after** it has generated the frontend.
- `scripts/smoke-m8.mjs` — a read-only health/room-detail/availability connectivity check.
- `test/m8-frontend-client.unit.ts` — 28 offline contract assertions using a fake fetch implementation; no real DB needed.
- `GET /room-types/:id` — new public read-only endpoint for room detail screens. All previously implemented APIs remain.

## Exact setup sequence on Rishabh's Mac

1. Extract the complete ZIP and open the **inner `EstateFlow_Backend` folder**, not the ZIP's parent directory.
2. Copy the working v0.7 `.env` to the new project; do not share it or commit it.
3. Use local PostgreSQL `DB_USER=rishabh`, with your actual password in `.env`.
4. Run:

```sh
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run build
npm run test:m8
npm run test:m7
npm run test:m6
npm run db:verify
npm run dev
```

5. In another terminal, run `npm run smoke:m8`. This script reads only public endpoints and changes no data. It expects seeded room types.
6. For full E2E, first verify `estateflow_test` is a **disposable** database, then run `npm run test:e2e`. This **erases the public schema in `estateflow_test`**. It must not target `estateflow`.

## Connection modes

| Mode | Browser URL | Backend URL | Notes |
|---|---|---|---|
| Local Lovable/Vite export on same Mac | `http://localhost:5173` | `http://localhost:4000` | Configure `CORS_ORIGIN=http://localhost:5173` and Vite's `VITE_ESTATEFLOW_API_BASE_URL=http://localhost:4000` |
| Remote Lovable preview | Hosted HTTPS origin | **Hosted HTTPS backend or controlled HTTPS tunnel** | A hosted browser cannot reach `localhost:4000` on your Mac. Set the actual preview origin explicitly in backend CORS; do not use `*`. |
| Production | Deployed HTTPS frontend | Deployed HTTPS NestJS | Use a managed TLS termination / application server and a separate secret. The rate limiter is in-memory and must be replaced with a shared store for scaled production. |

`CORS_ORIGIN` accepts a comma-separated list of trusted, exact origins. NestJS currently uses Bearer JWT access tokens; the client takes a `getAccessToken` callback and **does not persist tokens by itself**. Do not put `JWT_SECRET`, PostgreSQL credentials, database URIs or model files into Vite environment variables.

Simple React integration in the frontend, after a local login flow is available:

```ts
import { EstateFlowApi } from './lib/estateflow-api';

// Keep accessToken in React state for the current session; never put it in source.
let accessToken: string | null = null;
export const api = new EstateFlowApi(
  import.meta.env.VITE_ESTATEFLOW_API_BASE_URL ?? 'http://localhost:4000',
  () => accessToken
);
export function setSessionToken(token: string | null) { accessToken = token; }
```

Use a React auth provider instead of the module-level variable when integrating the actual generated code. A refresh-token endpoint is **not** implemented; on token expiration, return the user to sign-in. Do not claim persistent login, real payment, direct WhatsApp sending or true OTA synchronization.

## UX case-study screen to backend mapping

| Screen / flow | API client methods | UI behavior |
|---|---|---|
| Resort home / room search | `roomTypes`, `availability` | Guest date range; zero stock -> explain unavailable, never fake rooms |
| Room detail | **`roomType` (M8)**, `availability`, `quote` | Accurate occupancy, descriptive content, nightly paise/GST breakdown |
| Account / checkout | `register`, `login`, `me`, `hold`, `holdStatus`, `mockPay`, `myBookings`, `booking` | Hold countdown; separate stable idempotency key per hold and payment action; mock payment clearly labeled |
| Event enquiry | `submitEnquiry` | Only reports enquiry received, not resource reservation |
| Staff inbox | `enquiries`, `enquiry`, `enquiryDrafts`, `processEnquiry`, `routeEnquiry`, `correctEnquiry`, `editDraft`, `simulateSendDraft` | Human correction is durable; draft sending is **simulated**; complaint escalation goes to GM |
| Event feasibility | `createEventFromEnquiry`, `createEvent`, `event`, `requirements`, `evaluate`, `alternatives`, `selectAlternative`, `reserve`, `bundle` | Proposal and alternative selection allocate **nothing**; reserve only via explicit staff approval; explain conflicts |
| Staff rates / inventory | `overview`, `inventory`, `rates`, `updateAllotment`, `updateRate`, `promoCode` | Show unsaved changes, conflict errors and save confirmation |
| Resource planning and reporting | `resourceCalendar`, `resources`, `updateResourceCapacity`, `bookingExportCsv` | Bound calendar window <=31 days; CSV export is text, not JSON |

Important API semantics:
- Dates are `YYYY-MM-DD`; **checkout is exclusive**. Avoid timezone conversion of calendar dates.
- Money in every API request/response is integer INR **paise**; divide by 100 only for formatting.
- The service expects `Authorization: Bearer <token>` for auth/staff routes. Do not pass the token on public calls.
- `Idempotency-Key` must be stable on a retry of the **same** booking/payment request, and new for a materially different one.
- `409 Conflict` means changed inventory, exhausted promo/hold, infeasible resources, or incorrect idempotency reuse. Show a contextual retry/re-evaluate state, **not** an automatic approval.
- `401` means re-authentication; `403` means insufficient role; `429` means wait and retry after `Retry-After`. Do not replay payment operations automatically on arbitrary error responses.
- During local prototyping, authenticated staff endpoints should only be shown behind the role-aware staff navigation; the server remains the final authorization authority.

## Boundaries and known gaps

- **Mock payments only**, no payment gateway, settlement or refunds.
- **Simulated email/WhatsApp**; no actual sends. AI cannot independently allocate inventory or send messages.
- Venue, dining, parking and staff capacity is modeled by day slots, not sub-hour shift scheduling.
- Local model v3 evaluated on synthetic resort messages only; real-world performance still unknown.
- Guest media assets may be placeholders until Lovable's design and licensing are finalized.
- The public `POST /enquiries` endpoint currently accepts `contactName`, optional `contactEmail`, and a `message` string. Until a typed structured-event-enquiry endpoint is added, the frontend must clearly serialize the form fields (event type, dates, room count, guests, budget, venue, dining, parking) into the **message** without silently dropping them; staff must verify AI-extracted values. Do not pretend those fields have their own database columns.
- Rate limiter is in-memory and keyed by socket address; change to trusted proxy/shared Redis for production scaling.
- Previous local `npm install` showed two high-severity advisories. See `docs/DEPENDENCY_AUDIT_M8.md`. Removal of `ts-node-dev` may eliminate old transitive dependencies but **must not be represented as an audit clearance** before a fresh npm audit runs on your Mac.

## Definition of ready to connect

1. `npm run preflight`, `npm run build`, `npm run test:m8`, `npm run db:verify` pass.
2. `npm run smoke:m8` passes against your local NestJS process.
3. `npm run test:e2e` reports **57** passing checks against disposable `estateflow_test` (54 M6 + 3 new room-detail checks). If the E2E suite changes before running, use its own final count rather than assuming 57.
4. You have an actual local exported Lovable frontend or an HTTPS-accessible NestJS backend for hosted preview.
5. No auth secrets or database credentials are in the frontend bundle or Git repository.
