# Lovable prompt — EstateFlow M9 backend connection

Use this AFTER Lovable has actually created the frontend. Do not run this prompt as a replacement for the low/mid/high-fidelity design sequence.

---

You are integrating the already-built EstateFlow React/TypeScript frontend with an existing, independently tested NestJS/PostgreSQL backend. **Do not generate a new backend, database, demo payment gateway, Gemini dependency or Supabase replacement.** Do not redesign the visuals or recreate the frontend from scratch.

Backend current release: v0.11.0. Backend project includes a typed `integrations/estateflow-api.ts` client; copy or adapt it into `src/lib/estateflow-api.ts` in the frontend. Use the actual backend API contract at `/openapi.json` (a static export is in `docs/openapi-m9.json`). The API is mounted at root, **not** `/api/v1`.

Set one environment variable in the frontend for the **public backend base URL**, for example `VITE_ESTATEFLOW_API_URL=http://localhost:4000` when both apps run on the same machine. Never put `JWT_SECRET`, `DB_PASSWORD` or privileged server credentials in Vite env. A hosted Lovable preview cannot connect to local `localhost`; if the preview is hosted, you must first use an approved HTTPS backend deployment or export the frontend and run it locally.

Integrate the existing UI by screen:

1. Home/stays/search: `GET /room-types`, `/room-types/:id`, `/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&roomTypeId=...`.
2. Pricing/checkout: `POST /quotes`, then authenticated `POST /booking-holds` with a new Idempotency-Key; `GET /booking-holds/:id` for countdown; `POST /payments/mock/confirm` for simulated success; `GET /bookings` for confirmation. Rates are server-calculated in **INR paise**, not browser-derived numbers.
3. Public wedding/offsite enquiry: `POST /enquiries` with contact name/email/message; do not suggest that submission reserves an event.
4. Staff login: `POST /auth/login`, attach bearer token only to authenticated calls; `GET /auth/me`. Use role-aware route guards and never display staff screens to unauthenticated guests.
5. Inbox: `/staff/enquiries`, `/staff/enquiries/:id`, `/drafts`, `POST /ai-process`, staff correction PATCH endpoints, and simulated send endpoint only after staff action.
6. Events: staff explicitly creates the proposal, evaluates via `/staff/events/:id/evaluations`, views blockers/alternatives, chooses a verified alternative, then confirms through the **separate** `/staff/events/:id/reserve` endpoint. AI cannot do this alone.
7. Rates/allotment and calendar: `/staff/rates`, `/staff/inventory`, `/staff/resources/calendar`; show server 400/401/403/409/429 responses without inventing success.

Keep checkout at three steps maximum. Handle loading, empty, failure, expired hold, overbooking conflict, unknown AI classification, infeasible event, successful mock payment and successful staff reservation. On every request, preserve the server's `X-Request-ID` for support diagnostics if available; do not expose bearer tokens or guest messages in logs.

Do not claim true OTA synchronization, live payment, WhatsApp sending, model fine-tuning, general LLM generation or third-party reservation integration. Keep test users and illustrative prices clearly labelled.

**Acceptance check:** Guest room search → server quote → hold → mock payment → confirmation; staff enquiry → AI draft → manual correction → feasibility → alternative → explicit approval → committed resource bundle. Ensure all paths call NestJS, not hardcoded mock data, once integration is enabled.

## M11 guest cancellation
Use `api.cancelBooking(bookingId,reasonCode)` only after the guest explicitly requests it.
Read `CANCELLED` booking/hold states and show **simulated payment—no refund processed**.
Do not expose cancellation after the local check-in date.
