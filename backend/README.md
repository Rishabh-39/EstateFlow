> **Local Ollama inference (optional):** See `../OLLAMA_LOCAL_INTEGRATION.md` for `AI_PROVIDER=ollama`, `qwen3:4b` and `npm run smoke:ollama`. Enquiry data stays local; staff review remains mandatory.

# EstateFlow Backend v0.12.0

**Frontend status:** Lovable React UI is not included. The backend and reviewer/demo tooling are separate. Start with [`docs/MILESTONE_12_REVIEWER_HANDOFF.md`](docs/MILESTONE_12_REVIEWER_HANDOFF.md).

# EstateFlow Backend v0.11.0 — Booking Cancellation and Atomic Inventory Release

New endpoint `POST /bookings/:id/cancel`, 004 migration, 18 cancellation-rule assertions, seven DB invariant checks, E2E coverage and a read-only cancellation audit command. **Simulated payments only; no real refunds.** See `docs/MILESTONE_11_BOOKING_CANCELLATION.md`.

# EstateFlow Backend v0.10.0 — Dependency Security and Deployment Checks

**New:** Patched Multer dependency override, dependency verifier, CI checks, and deployment example. See `docs/MILESTONE_10_SECURITY_AND_DEPLOYMENT.md`. Full working backend included; Lovable frontend is separate.

# Milestone 9 update — API discovery and Lovable handoff

See `START_HERE.md` and `docs/MILESTONE_9_API_DISCOVERY.md`. The complete v0.9.0 backend adds `GET /`, `GET /openapi.json`, per-request `X-Request-ID`, and generated OpenAPI route coverage tests. The React UI is built separately in Lovable.

# EstateFlow Backend v0.8.0 — Lovable Integration Bridge

**Latest:** Complete Milestone 8 backend, with `GET /room-types/:id`, expanded typed React API client, 28 offline client contract assertions, a read-only API smoke test, and the Lovable implementation handoff.

See `docs/MILESTONE_8_LOVABLE_HANDOFF.md` for the Mac setup and frontend wiring. This project uses **NestJS + local PostgreSQL (`rishabh`) + a custom locally trained enquiry model**. No frontend or production deployment is included in this ZIP.

Quick local verification after installing dependencies and copying your own `.env`:

```sh
npm run agent:train
npm run db:migrate
npm run preflight
npm run build
npm run test:m8
npm run db:verify
npm run dev
# Separate terminal:
npm run smoke:m8
```

`npm run test:e2e` erases the disposable `estateflow_test` public schema only. Do not point it at any important data.

---

# EstateFlow Backend — Milestone 7

**Updated:** 2026-11-05 · **Owner:** Rishabh Tomar · **Stack:** NestJS 11 / Node 20.19+ / PostgreSQL 14+ / TypeScript · **Frontend:** being designed separately in Lovable.

This is an implementation starter with a **working-in-source backend design**, not a claim that it has been deployed. It includes room booking and mock payment APIs, staff inventory and rates, atomic event resource reservations, seeded enquiries, and an **original locally trained Naive Bayes agent** for resort enquiry classification, basic extraction and draft-only replies.

## Milestone 7 additions — specialized local AI + independent evaluation

- `local-nb-v3` trained on **210 synthetic, labelled resort enquiries** (not an LLM).
- New **50-case synthetic diagnostic** and **30-case synthetic final-check** evaluation sets. Diagnostic accuracy 90%, final check accuracy 90%; both are small synthetic checks, **not production accuracy**.
- Expanded complaint keyword escalation, including *rudely* and *hostile*; UNKNOWN continues to require human review.
- `npm run test:m7`, `npm run agent:holdout`, `npm run agent:final-check` generate per-class and auto-routing metrics.
- Optional **local-only, manually reviewed, anonymized** training import using `npm run agent:import-reviewed -- /path/to/approved.jsonl`. This never trains automatically and does not automatically read from the customer DB.
- Full instructions and caveats: `docs/MILESTONE_7_AGENT_EVALUATION.md`. No new SQL migrations. The React frontend remains a separate Lovable project.

## Milestone 6 additions — security hardening

- PostgreSQL-verified JWT user identity and role on every private request (stale role tokens now return 401).
- Per-IP rate limits on public login, registration and enquiry submission, with HTTP 429 / `Retry-After` (single-process MVP).
- API security headers, no-store caching for sensitive API paths and hidden Express fingerprinting.
- `npm run test:m6` plus six additional `estateflow_test` E2E assertions.
- Full instructions: `docs/MILESTONE_6_SECURITY.md` and `docs/LOVABLE_M6_HANDOFF.md`.

## Milestone 5 additions (frontend-ready read APIs)

- `GET /health/ready` checks PostgreSQL reachability and fails safely with HTTP 503 if a dependency is unavailable.
- `GET /booking-holds/:id` gives the signed-in hold owner a date-safe status and remaining checkout seconds; never reveals another guest's hold.
- `GET /staff/resources/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` returns 1–31 days of capacity, bookings, blocked slots, and missing-slot warnings (requires staff access).
- `npm run preflight` checks your Node version, non-placeholder JWT secret, local AI model, PostgreSQL connection, and migration tables without modifying data.
- `npm run test:m5` runs the pure contract regression tests; `npm run test:e2e` includes the new API tests against **only** the disposable `estateflow_test` database.
- `integrations/estateflow-api.ts` exposes typed frontend methods for the two new read APIs. See `docs/MILESTONE_5_EXECUTION.md` and `docs/LOVABLE_M5_HANDOFF.md`.

## 1. Prerequisites

- Node.js 20.19+ and npm
- Local PostgreSQL 14+, running on port 5432
- PostgreSQL role **`rishabh`** with permission to create/use a database
- A local password for that role, if configured (NEVER commit it)

The application does **not** need a Gemini/OpenAI API key. Its local model is trained using labelled examples in `data/agent-training.jsonl`. It is a small statistical intent classifier plus extraction and a tool-gated workflow, **not** a newly trained large language model. Reply text is assembled from guarded templates, not generated by an LLM.

## 2. Local setup (Windows PowerShell or terminal)

```bash
# In PostgreSQL as a role permitted to create databases:
psql -h localhost -U rishabh -d postgres -c "CREATE DATABASE estateflow;"

# From this repository:
cp .env.example .env
npm install
```

On Windows PowerShell, replace `cp` with `Copy-Item .env.example .env`.

Edit `.env` locally. Defaults: `DB_USER=rishabh`, `DB_HOST=localhost`, `DB_NAME=estateflow`. Set `DB_PASSWORD=` to your local DB password (not supplied to us). Generate a random `JWT_SECRET` at least 32 characters long, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never publish `.env`.

```bash
npm run db:migrate
npm run db:seed
npm run agent:train
npm run preflight
npm run test:unit
npm run agent:evaluate
npm run dev
```

The local backend is at `http://localhost:4000`. Check `GET /health`. If you edit the training dataset, rerun `npm run agent:train` and restart the API.

**Note:** The packaged source already contains a trained model for immediate startup; `agent:train` retrains it from your dataset.

### Windows PostgreSQL troubleshooting

- If `psql` isn't found, add the PostgreSQL `bin` directory to PATH or run it using its full path.
- If `password authentication failed for user rishabh`, verify the role/password locally; use the password in `.env`, not the chat or repository.
- If `database "estateflow" does not exist`, run the CREATE DATABASE command above.
- If `permission denied for schema public`, give the role appropriate privileges on the database/schema.

## 3. Demo accounts (synthetic data only)

These are deliberately fake seeded accounts; **change passwords before any public deployment.**

| Role | Email | Demo password |
| --- | --- | --- |
| Staff | `staff@estateflow.local` | `DemoStaff!2026` |
| GM | `gm@estateflow.local` | `DemoManager!2026` |
| Guest | `guest@estateflow.local` | `DemoGuest!2026` |

Use `POST /auth/login` with JSON `{ "email": "...", "password": "..." }`. Include `Authorization: Bearer <accessToken>` on protected routes. Auth uses an eight-hour bearer token for this milestone; cookie+CSRF hardening is future work.

## 4. Smoke tests

While `npm run dev` is running in another terminal:

```bash
npm run build
node scripts/smoke.mjs
```

Smoke suite attempts two simultaneous holds with just one website unit; exactly one must succeed. It also verifies mock payment retry idempotence, AI enquiry classification, and a failed wedding due to parking capacity.

**This smoke script changes seeded demo records** and is not intended for production. To rerun cleanly, use another date or reset the local demo database. No destructive reset script is supplied.

## 5. API summary

| Method | Route | Role |
| --- | --- | --- |
| GET | `/health` | Public |
| POST | `/auth/register`, `/auth/login` | Public |
| GET | `/auth/me` | Signed in |
| GET | `/room-types`, `/availability` | Public |
| POST | `/quotes`, `/enquiries` | Public |
| POST | `/booking-holds`, `/payments/mock/confirm` | Guest / signed in |
| GET | `/bookings`, `/bookings/:id` | Owner or staff |
| GET/PUT | `/staff/inventory`, `/staff/inventory/:roomTypeId/days/:date` | Staff / GM |
| GET/PUT | `/staff/rates`, `/staff/rates/:roomTypeId/days/:date` | Staff / GM |
| POST | `/staff/promo-codes` | Staff / GM |
| GET/PATCH | `/staff/resources`, `/staff/resources/:id/capacity` | Staff / GM |
| GET | `/staff/bookings/export?date=2027-02-14` | Staff / GM |
| POST/GET/PATCH | `/staff/enquiries/...`, `/staff/drafts/...` | Staff / GM |
| POST | `/staff/events` | Staff / GM |
| GET | `/staff/events/:id`, `/requirements`, `/alternatives` | Staff / GM |
| PUT | `/staff/events/:id/requirements` | Staff / GM |
| POST | `/staff/events/:id/evaluations`, `/reserve` | Staff / GM |

Specific request/response examples and frontend integration guidance: see `docs/LOVABLE_INTEGRATION.md` and `docs/API_EXAMPLES.md`.

## 6. Important engineering guarantees and limitations

**Inventory correctness:** `room_nights` has a primary key on `(room_unit_id, stay_date)`; every direct booking and wedding shares this physical inventory. All mutating paths acquire a PostgreSQL transaction-scoped advisory lock before checking and allocating capacity. The approach prioritizes correctness and simplicity over high write throughput for a 76-key resort. Day-level resource capacity is locked during approval and checked for each mandatory resource.

**Website allotment:** Direct bookings must meet both physical availability and admin-set allotment on every stay night. Wedding bundles check physical availability and non-room resource capacity. No OTA / PMS live sync exists—external inventory partitioning must be maintained by staff.

**Test payments:** No financial charges occur. Payment outcome is explicitly simulated. A successful payment creates a confirmed booking and cannot be duplicated with the same idempotency key.

**Resource granularity:** The MVP models lawn, dining, parking and staff in seeded `DAY` slots. This does **not** support exact overlapping shifts, partial-day lawn setup or named employee rosters. A later version requires time-range allocations and shift planning. Rooms are allocated per actual physical unit across a continuous stay.

**AI:** 210 synthetic labelled local examples are included; classifier can be retrained. Low-confidence/UNKNOWN goes to Unsorted, complaints to GM. Dates not explicit remain unknown. The model is not a generative LLM. No tool can modify inventory or reserve/send on behalf of the AI. All replies are drafts until staff explicitly sends through a **simulated** channel.

**Privacy/security:** No passport data. Passwords hashed with bcrypt. Public enquiry form needs production-grade rate limits, bot protection and data-retention policy before real launch. Do not use real guest data in this demo. Bearer tokens need secure frontend storage (in memory, not localStorage) and all protected endpoints enforce role checks.

**Run status:** User-provided Milestone 5 Mac logs confirm migrations, the full NestJS build, the existing unit suites, five database invariants, and 48 visible E2E assertions. The new Milestone 6 DB-backed checks remain to be run on the Mac. The build environment executed the new M6 pure security tests and TypeScript syntax checks but does not have the local PostgreSQL server or npm dependencies.

## 7. Repository structure

```
/ src/              NestJS controllers, services, inventory, trained agent
/ sql/              PostgreSQL migration
/ scripts/          migration, seed, train, evaluate, smoke
/ data/             100 labelled synthetic training examples
/ model/            trained statistical model JSON
/ test/             local agent assertions
/ docs/             API integration, architecture and test plan
```

## 8. Milestone 2: Resource approval test suite

Read `docs/MILESTONE_2_EXECUTION.md` for detailed setup, new APIs, known limitations and the isolated database test workflow. Run `npm run test:unit` for local classifier/inventory tests, `npm run agent:cv` for 5-fold synthetic classification evaluation, and `npm run db:verify` against your local PostgreSQL database. To execute the full test-only API suite, create the separate `estateflow_test` database and run `npm run test:e2e`.

**New endpoints:** `POST /staff/events/:id/alternatives/select` (select & revalidate proposal) and `GET /staff/events/:id/bundle` (committed resources). Frontend must not show `RESERVED` until an approval returns success.

## 9. Frontend handoff

This package deliberately contains **no React frontend** because Lovable is generating it separately. When you export Lovable's React project, we'll connect its fetch layer to these endpoint contracts. Do not let Lovable silently replace NestJS/PostgreSQL with another backend.

## Milestone 3 update (local AI safety + staff review)

See [Milestone 3 Execution](docs/MILESTONE_3_EXECUTION.md) and [Agent V2](docs/AI_AGENT_V2.md).

- `npm run db:migrate` now includes idempotent `002_agent_review.sql`.
- In Milestone 3, `npm run agent:train` originally built `local-nb-v2` on 160 synthetic examples; Milestone 7 now builds `local-nb-v3` on 210 synthetic examples.
- `npm run test:agent` runs 17 offline extraction, safety and review-policy checks.
- `npm run test:e2e` includes human override persistence and complaint escalation.
- Never commit `.env` or any private database/customer data.

## Milestone 4 — backend operations integration

See [`docs/MILESTONE_4_EXECUTION.md`](docs/MILESTONE_4_EXECUTION.md) for event listing, staff summary, verified enquiry-to-event proposals, hold-key safety, migration `003_event_enquiry_link.sql`, new test cases, and the typed Lovable React API client in `integrations/estateflow-api.ts`.

M4 verification commands: `npm run build && npm run test:m4 && npm run db:verify`. `npm run test:e2e` resets **only disposable** `estateflow_test` and needs your explicit acceptance of that destructive reset.
