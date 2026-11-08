# EstateFlow — Milestone 12 | Reviewer/demo readiness & safe local backups

**Project owner:** Rishabh Tomar. **Release:** 0.12.0. **Status:** complete backend source; Lovable frontend is not in this archive.

## Purpose

M12 adds a **read-only local reviewer readiness check**, local PostgreSQL backup utility with a guarded database target, operating runbook, and reviewer demonstration script. It does **not** replace or modify the already-tested booking, cancellation, AI-agent or event allocation APIs. No new SQL migration. The M11 four migrations are still required.

Your previous M11 Mac terminal log showed **71/71 E2E tests passed** on the *disposable* `estateflow_test` database. That result validates M11; M12 must be built and tested again locally. Do not claim this release passed PostgreSQL E2E until that happens.

## Getting started on your Mac

1. Extract the complete ZIP, open the inner `EstateFlow_Backend` directory, and copy over your private M11 `.env` (never share it).
2. Keep PostgreSQL at `localhost:5432` with `DB_NAME=estateflow` and `DB_USER=rishabh`. Never put a real password or JWT secret in the repository.
3. From the backend project root:

```sh
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run contract:m9
npm run test:m12
npm run test:m11
npm run test:m10
npm run test:m9
npm run build
npm run db:verify
npm run reviewer:ready
```

**Note on `reviewer:ready`:** this command reads the **local** `estateflow` database, not `estateflow_test`. If it reports missing inventory, staff users or sample event, the local demo database has not been seeded. You may run `npm run db:seed` **only on a disposable local demo database after confirming the target**, then repeat `reviewer:ready`. Do not reseed or run test scripts against a live resort database. Demo accounts have fixed sample credentials in `scripts/seed.ts` and must never be used in production.

For running the API:

```sh
npm run dev
# second terminal
npm run smoke:m9
```

For PostgreSQL integration tests (DESTRUCTIVE **test** database only):

```sh
npm run test:e2e
```

The runner drops and recreates the `public` schema of **`estateflow_test`**; do not point it at any database containing important data. The main `estateflow` database is not the E2E target.

## New operational commands

| Command | Scope | Data safety |
|---|---|---|
| `npm run test:m12` | Pure Node assertions | No database or server required |
| `npm run reviewer:ready` | Local `estateflow` | Read-only transaction; saves aggregate-only JSON in ignored `reports/` |
| `npm run backup:demo -- --dry-run` | Local `estateflow` | Prints plan; creates no file and changes no data |
| `npm run backup:demo` | Local `estateflow` | Uses `pg_dump` custom archive; read-only to DB; backup is ignored in `backups/` |

**Backup prerequisites:** `pg_dump` available in PATH and compatible with the PostgreSQL server, matching local `DB_PASSWORD` in `.env`. The generated `.dump` can contain guest names, contact emails, bookings and enquiry messages. It is protected with filesystem mode 0600, ignored by Git, and must **not** be uploaded in the assignment ZIP. The backup command refuses a remote host, production mode, other databases and existing output file collisions. It does not restore, overwrite or drop data.

Back up a local demo DB:

```sh
npm run backup:demo -- --dry-run
npm run backup:demo
# Inspect without restoring
pg_restore --list backups/<generated-name>.dump
```

**Recovery exercise:** restore only to a **new, empty, isolated local database** created for verification. Never use `--clean` on the main `estateflow` database. `pg_restore` can execute database objects; only restore backups you created and trust. The script deliberately does not perform a restore or automate deletion.

## Reviewer-ready acceptance criteria

The `reviewer:ready` check deliberately verifies the **sample demo** dataset, not an operating production resort:

- 76 active physical room units: 64 Estate rooms plus 12 Villas (the main sample-data assumption).
- At least two accommodation categories, with daily room rates and website allotment on 13–14 February 2027.
- Four operational resource types `LAWN`, `DINING`, `PARKING`, `EVENT_STAFF` and valid capacity slots for 14 February 2027.
- At least one local STAFF, GM and GUEST user; a seeded wedding scenario demonstrating parking bottleneck.
- Present trained local model file and M11 cancellation migration; generated OpenAPI documentation and React integration client.

The readiness report contains counts and check statuses **only**; it intentionally omits user identifiers, emails, guest names, enquiry text and passwords. File location: `reports/reviewer-readiness-m12.json`. This is an operational demo-data diagnostic, not a clinical/security certification.

## 7-minute walkthrough for a reviewer (after frontend integration)

1. **Public discovery:** show seeded room types, an available stay, date-sensitive room rates, and quoted GST. Verify website allotment limits without claiming OTA sync.
2. **Booking and cancellation:** register/sign in as a demo guest, create an expiring hold, complete a **simulated** payment and show confirmation. Cancel an eligible stay; explain the database transaction releases room nights and **no real refund occurs**.
3. **AI enquiry:** submit a wedding enquiry; staff runs the local trained intent classifier, sees uncertainty, corrects fields, and edits a draft before simulated send. AI never sends autonomously.
4. **Feasibility signature flow:** demo the 250-guest event needing 35 rooms for two nights, lawn, dining, 60 parking spaces, and 12 staff. The sample parking slot has only 48 spaces, so show the **12-space deficit**. Select a verified alternative, then execute explicit staff-approved atomic allocation.
5. **Concurrency proof:** reference the E2E assertion that competing wedding approvals cannot claim the same lawn, plus `db:verify` checks.
6. **Handoff:** `/` exposes backend overview, `/openapi.json` current contract; Lovable React uses `integrations/estateflow-api.ts` rather than duplicating business rules.

Screen transitions depend on the Lovable UI that has not yet been provided. Without its source these are **planned UI acceptance steps**, not completed browser tests.

## Design and assignment submission boundaries

- This ZIP is a **development source package** (not the final submission ZIP).
- Actual assignment submission remains one ZIP with exactly **Technical Design Document (PDF/Word)** and **deployment.md**. The first lines of the technical document must include the *actual public GitHub URL* and deployed URL if available. Do not fabricate URLs.
- The GitHub project contains backend source and, after integration, Lovable frontend source. Do **not** include `.env`, `node_modules`, local backups, fake payment proofs or real guest data.
- `deployment.md` should document separate guest/staff reviewer credentials for demo only, migration/seed commands, and known mock limitations.
- New production users must be provisioned securely; fixed seed credentials are demonstration-only. Do not ship them to production.
- Business policy on cancellations and taxes must be reviewed; no real payment or refund provider, no real outbound WhatsApp/email, no OTA synchronization or shift-level staffing model.
