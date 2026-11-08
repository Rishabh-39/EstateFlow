> **v0.13.3:** Optional local Ollama + Qwen structured extraction and conversational draft wording. See [OLLAMA_LOCAL_INTEGRATION.md](OLLAMA_LOCAL_INTEGRATION.md) for setup and safeguards. No change to original Lovable visual template.

# EstateFlow — Integrated Lovable Frontend + NestJS Backend

**Status: source-integrated release v0.13.3 (local development; Ollama semantic extraction + earlier concierge/GM fixes).** The project combines the original Lovable UI with the NestJS/PostgreSQL backend and the staff/GM review workflow. See `AI_AND_STAFF_FIXES.md` for the five fixes in v0.13.2; migrations 005 and 006 must be applied.

**Not a claim of fully tested deployment.** Previous backend v0.12 passed 71 integration tests and 11 smoke checks on the user's Mac. The *new integrated v0.13 source* passed offline API/OpenAPI contract checks, isolated API-adapter TypeScript checking, and syntax checks; a complete frontend build and live PostgreSQL E2E must be run on the user's machine.

## Directory layout

- `frontend/` — original Lovable TanStack Start/React UI, with real room booking and staff API integration.
- `backend/` — NestJS 11, TypeScript, local PostgreSQL, custom-trained Naive Bayes enquiry agent, transactional reservation engine.
- `docs/` — feature-to-problem mapping, local setup, acceptance tests, and limitations.

## Start locally (macOS)

Install Node.js **22.12+** for the frontend (NestJS supports Node 20.19+), npm, and local PostgreSQL. The PostgreSQL username is `rishabh`, but its password is **not included**.

**Terminal A: backend**

```bash
cd backend
cp .env.example .env
# Edit .env: DB_PASSWORD=..., JWT_SECRET=<new random 64-char secret>, CORS_ORIGIN=http://localhost:5173
npm install
npm run db:migrate
# On an empty demo database only:
npm run db:seed
npm run agent:train
npm run preflight
npm run build
npm run test:m13
npm run test:m15
npm run db:verify
npm run dev
```

Generate the JWT secret locally with `openssl rand -hex 32`. Do not place `.env` in Git or frontend code.

**Terminal B: frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Visit `http://localhost:5173`; the JSON backend is at `http://localhost:4000`. If TanStack Start uses a different port, update **backend** `CORS_ORIGIN` and restart it. The frontend sends `VITE_API_URL=http://localhost:4000`, never a database password or JWT signing key.

**Terminal C: checks**

```bash
cd backend
npm run smoke:m9
npm run test:e2e
```

**WARNING:** `test:e2e` **recreates the `public` schema in `estateflow_test`**, not the primary database. Only run it if `estateflow_test` is disposable; verify your `.env` targets carefully.

## Demo accounts (LOCAL SEED ONLY)

The built-in demo seed creates:

| Role | Email | Local demo password |
|---|---|---|
| Staff | `staff@estateflow.local` | `DemoStaff!2026` |
| General Manager | `gm@estateflow.local` | `DemoManager!2026` |
| Guest | `guest@estateflow.local` | `DemoGuest!2026` |

**Never deploy public with these seeded passwords.** Guest accounts may also register through `/auth/register` (password minimum 10 characters). Demo seeding is blocked in `NODE_ENV=production`.

## Useful paths

Guest: `/`, `/stays`, `/stays/<uuid>`, `/book/<uuid>`, `/booking/<reference>`, `/events`.

Staff: `/staff/login`, `/staff/inbox`, `/staff/workbench`, `/staff/rates`, `/staff/allocation`, `/staff/export`. GM: `/gm/login`.

Backend: `/health/ready`, `/room-types`, `/openapi.json`.

## What is actually integrated

- Rooms/availability/nightly pricing/GST: **PostgreSQL**.
- Direct booking: authenticated **10-minute hold**, mock payment, real DB booking reference, and atomic cancellation/release.
- Event forms: persisted web enquiry with original structured inputs; staff inbox, locally trained AI routing, manual overrides, editable draft and **simulated** send.
- Event resource feasibility: physical room units for all stay nights, event-day lawn/dining/parking/staff pool, detailed blockers, verified alternative date, staff-triggered atomic reservation.
- Admin: daily rates, direct website allotment, blackout dates, active promotional codes; CSV booking export.

See `docs/PROBLEM_STATEMENT_TRACEABILITY.md` for detailed assignment mapping and known limitations. Source tests: `npm run test:m13` in `backend/` and optional `tsc -p tsconfig.integration-check.json` in `frontend/`.

## Critical limitations

- **Mock payments only**: no real money/refunds. Simulated email/WhatsApp inbound/outbound; no real delivery.
- Backend's seeded accommodation categories are **Estate Room** and **Plantation Villa** (64+12 physical units), not Lovable's original four invented categories. The UI now reads the two real types.
- Event pool capacities are **day-level**, not minute/shift-level individual staff assignment; the “Staff capacity” screen reflects the actual model.
- Only a **wedding lawn** venue is seeded for atomic approval. Other venue requests remain manual review.
- The local AI is a 210-synthetic-example trained classifier plus transparent topic-specific guided answers; it is **not a generative LLM**. Optionally supply a backend-only `GEMINI_API_KEY` to improve concierge advisory wording and editable staff drafts; guest message text then leaves the server for Google processing. Human staff review remains required for operational replies, WhatsApp delivery, staffing and reservations.
- Direct website allotment is not a real OTA channel-manager synchronization.
- Images retained from Lovable are **illustrative** until verified property images are provided.
- Auth tokens are kept in browser `sessionStorage` in this local MVP; hardening and production legal/privacy review are necessary before deployment.
- No public GitHub URL, deployment URL, or browser test evidence is invented.

**Final assignment submission:** The client challenge requires a separate **two-file submission ZIP** with Technical Design Document and `deployment.md`. This source ZIP is the codebase to commit to a public repository; it is **not** that final two-file submission.


## Local CORS / demo-account connection patch

When starting Vite with `--host 127.0.0.1 --port 5173`, its Origin differs from `localhost:5173`. The patched NestJS server permits both **loopback aliases only during nonproduction development**, even if an older local `.env` specifies just `http://localhost:5173`; production remains an exact origin allowlist. Images are bundled locally but room cards require `/room-types` to load.

If demo sign-in fails, run `npm run demo:accounts` in `backend` to check bcrypt hashes. If old seed data retained incompatible passwords, run the explicitly guarded `npm run demo:accounts -- --reset` locally. This changes **only** the 3 known synthetic demo users, not bookings or inventory.

Run `npm run test:connection` for offline regressions; the E2E suite also verifies both browser CORS preflights. The TanStack frontend package requires Node.js >=22.12.

## v0.13.2 AI / WhatsApp / GM test sequence

- Keep original Lovable UI; both Staff Allocation and GM Dashboard remain present.
- The original Lovable concierge used a hard-coded `replyFor` regex prototype. This release offers truthful topic-aware local answers and **optional** Gemini-generated suggestions. It never claims a reservation or unverified capacity.
- Previously stored template drafts persist until you choose **Regenerate AI draft** in Staff inbox. Edited human drafts are retained.
- WhatsApp is a deliberate handoff to the WhatsApp application, not an automatic send. Staff reviews and decides to send manually.
- Staff role-count suggestions are prepopulated from event requirements. Staff edits counts and presses **Send to GM**; the UI now always saves the plan before requesting approval. GM sees it as **Pending GM**.
- Run `npm run test:m15` and `npm run test:design` in backend after installing dependencies. Tests do not require a Gemini API key, but live provider and PostgreSQL flows remain to be checked locally.
