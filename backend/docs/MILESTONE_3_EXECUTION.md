# EstateFlow — Milestone 3: local AI, human review, and backend validation

**Owner:** Rishabh Tomar  
**Stack:** NestJS / TypeScript / PostgreSQL (`DB_USER=rishabh`) / trainable local Naive Bayes model  
**Scope:** Agent improvements and tests while Lovable builds the React frontend.

## Changes from Milestone 2

- Added idempotent SQL migration `002_agent_review.sql`. Stores staff-reviewed category and field corrections **separately** from AI output.
- Fixed staff rerouting to select the correct owner role. A complaint previously escalated remains in the GM lane after a category edit.
- Reprocessing keeps staff corrections and does not replace a draft that staff have already edited.
- Local enquiry classifier retrained from 100 to **160 synthetic labeled messages**. It still isn't a production model.
- Natural-language extraction handles explicit-year date ranges, guest counts like `2 adults and a child`, Indian lakh budgets, and event resource counts.
- AI tool gateway rejects unapproved tools, unexpected arguments and invalid date/ID parameters. No agent-facing write or payment tools.
- Added 17 offline agent-policy tests and database-backed E2E cases for manual overrides and complaint escalation.
- Kept Milestone 2 availability/allotment fix and the five corrected database invariant queries.

## 1. Back up your existing project

Save your local `.env`, custom code, and database before replacing files. **Do not overwrite your real `.env`.** The ZIP does not include passwords.

## 2. Install or update

Extract the ZIP as `EstateFlow_Backend/`. In a terminal:

```bash
cd EstateFlow_Backend
npm install
```

If this is a new directory, copy your personal `.env` (with a real password) into it; see `.env.example`. Use `DB_USER=rishabh` as requested.

## 3. Run non-destructive migrations and training

```bash
npm run db:migrate
npm run agent:train
npm run build
npm run test:unit
npm run test:agent
npm run agent:evaluate
npm run agent:cv
npm run db:verify
npm run dev
```

`db:migrate` applies both SQL migrations in filename order in a transaction; the migrations are idempotent. `db:seed` is **only needed on a new database** and adds demonstration records. It does not erase existing production records, but demo accounts should never be used in production.

## 4. Test the full booking + resource workflow on a disposable DB

**Important:** E2E tests write reservations, hold records and event allocations. They must use a separate database named `estateflow_test`.

```bash
psql -h localhost -U rishabh -d postgres -c 'CREATE DATABASE estateflow_test;'
npm run test:e2e
```

The runner enforces `NODE_ENV=test`, `DB_NAME=estateflow_test`, and port 4100. If `estateflow_test` already exists, skip the CREATE command; for reproducible reruns, reset or recreate it. Do not aim this runner at your main `estateflow` DB.

## 5. Frontend integration contracts

- API: `http://localhost:4000` by default; configure Lovable's `VITE_API_BASE_URL` accordingly.
- `POST /enquiries` (public): `{ contactName, contactEmail?, message }`.
- `GET /staff/enquiries` (staff JWT): read inbox, `routing_lane`, `agent_confidence`.
- `GET /staff/enquiries/:id` (staff JWT): read `extracted`, `manual_extracted`, `manual_category`, `agent_flags`.
- `PATCH /staff/enquiries/:id/routing`: `{ category: 'WEDDING' | 'ROOM_BOOKING' | 'CORPORATE_OFFSITE' | 'COMPLAINT' | 'UNKNOWN' }`.
- `PATCH /staff/enquiries/:id/extraction`: e.g. `{ exactCheckIn:'2027-02-13', exactCheckOut:'2027-02-15', roomsRequired:35 }`.
- `POST /staff/enquiries/:id/ai-process`: runs local classifier again; respects human overrides.
- `GET /staff/enquiries/:id/drafts`: review unsent drafts. `PATCH /staff/drafts/:id`: manual editing.
- `POST /staff/drafts/:id/send-simulated`: requires staff JWT; this only marks simulated send after human action.
- `GET /staff/events/:id/alternatives`, `POST /staff/events/:id/reserve`: read-only recommendations vs transactional staff approval.

The AI agent itself cannot invoke reserve, payment, editing, or messaging endpoints.

## 6. Caveats and next tasks

- Synthetic 5-fold evaluation was **80.0%** with 160 examples. This is **not a measurement of live customer-message performance**. The `UNKNOWN` review lane intentionally catches uncertain requests.
- The local agent uses multinomial Naive Bayes + deterministic field extraction + templated replies. It is not a generative LLM. The project-specific training corpus is version-controlled for repeatable demonstration.
- Feasibility currently models parking, dining and staff capacity by **daily slots**, not minute-accurate staff rosters. The model should not be described as a complete scheduling optimizer.
- External email, WhatsApp and payment integrations remain simulated as allowed by the brief.
- The package was statically checked and offline unit-tested here, but **full `npm run build`, database migrations, and PostgreSQL E2E tests still must be executed on your Mac** because this workspace could not install dependencies or connect to your local PostgreSQL.
- Performance, privacy legal review, production account setup and actual customer-enquiry evaluation remain before a real deployment.
