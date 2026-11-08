# EstateFlow — Milestone 2: End-to-End Resource Feasibility

**Owner:** Rishabh Tomar  
**Backend:** NestJS / TypeScript  
**Database:** LOCAL PostgreSQL; role `rishabh` (password is stored only in your `.env`)  
**Frontend:** Lovable UI is not needed for these tests.

## What was fixed / added

1. **Fixed website allotment availability:** `GET /availability` now returns no more than the minimum unused website allotment for any night in the stay, further limited by continuous physical room availability. Earlier, it sometimes showed the full number of physical rooms rather than the number eligible for direct website sale.
2. **Explicit event alternative selection:** `POST /staff/events/:id/alternatives/select` applies a verified candidate to a **PROPOSED** event. It updates proposed dates, stores a feasibility snapshot and writes an audit record. It does not allocate anything; a separate staff action must approve.
3. **Committed-bundle details:** `GET /staff/events/:id/bundle` returns the committed room-unit list and resource allocations, or `bundle: null` if not yet reserved.
4. **Defensive locking:** event approval uses an application-wide PostgreSQL transaction advisory lock plus `FOR UPDATE` locks on relevant resource-capacity rows. Allocation remains all-or-nothing; database room-night primary keys protect the same physical room from duplicate allocation.
5. **Local AI quality check:** added deterministic stratified five-fold cross-validation for the synthetic intent dataset; the model and inference remain local and read-only. No false claim of production accuracy is made.
6. **Database invariant report:** `npm run db:verify` checks stock and allocation integrity.
7. **Integration tests:** test-only workflow checks conflicting holds, payment idempotence, simulated wedding parking shortage, alternative dates, staff approval, and two concurrent wedding approvals competing for the same lawn.

## Main API flow

```text
POST /staff/events                     Create PROPOSED wedding
POST /staff/events/:id/evaluations     Return blocker details
GET  /staff/events/:id/alternatives    List verified candidates
POST /staff/events/:id/alternatives/select { "eventDate": "YYYY-MM-DD" }
                                     Re-check candidate + update proposal
GET  /staff/events/:id/bundle          Show no allocation yet
POST /staff/events/:id/reserve         Explicit staff approval; atomic commit
GET  /staff/events/:id/bundle          Show committed rooms + services
```

Guest room booking remains separate, but uses the **same physical room-night inventory** and the website-allotment restriction.

## Running on your machine

1. Install Node.js 20.19+ and PostgreSQL 14+.
2. Verify your local PostgreSQL role is named `rishabh` and has database creation permission.
3. Extract the ZIP, then open the `EstateFlow_Backend` directory.
4. Copy `.env.example` to `.env`. Set `DB_USER=rishabh`, `DB_NAME=estateflow`, and your own `DB_PASSWORD`. Never paste a database password into ChatGPT, commit it, or store it in documentation. Generate your own 32+ character `JWT_SECRET`.
5. Create the normal database (once) in a terminal where `psql` is installed:

   `psql -h localhost -U rishabh -d postgres -c "CREATE DATABASE estateflow;"`

6. Execute:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run agent:train
npm run build
npm run test:unit
npm run agent:cv
npm run db:verify
npm run dev
```

Then check `http://localhost:4000/health`. Seeded synthetic accounts are in the root README.

### Running the isolated API tests

Create a **separate, disposable** database named `estateflow_test` owned by role `rishabh`:

`psql -h localhost -U rishabh -d postgres -c "CREATE DATABASE estateflow_test;"`

Then run `npm run test:e2e`. The runner sets `NODE_ENV=test`, `DB_NAME=estateflow_test`, `PORT=4100`, migrates and seeds the test database, starts a temporary NestJS server, runs the tests, and stops it. The test server explicitly refuses to start in test mode against any database other than `estateflow_test`.

**Warning:** The E2E suite creates confirmed reservations and changes inventory **inside `estateflow_test`**. Use a fresh test database for each rerun. For another run, drop and recreate only `estateflow_test` using your local PostgreSQL admin, then rerun. **Never run E2E against `estateflow` or another real-data database.**

### If `npm install` or Postgres fails

- Install dependencies on your computer with network access; this package deliberately contains no `node_modules`.
- On Windows if `psql` is not recognized, use `C:\\Program Files\\PostgreSQL\\<version>\\bin\\psql.exe` (replace `<version>` with your installed version).
- If `database "estateflow" does not exist`, create it with the command above.
- If the PostgreSQL role lacks `CREATE DATABASE`, grant that privilege using an admin account; do not change the application's DB username from `rishabh` unless you intend to.
- Check that another server isn't using ports 4000 or 4100.

## What this milestone does not prove

The generated source, local TypeScript transpilation and local-agent tests were run in the build environment. However, that environment has no PostgreSQL server and cannot reach the npm registry, so **NestJS runtime compilation and DB-backed E2E tests have not been executed here**. Those results must be reported from your machine.

The seeded resource capacity slots are **day-level**. This is not minute-by-minute venue scheduling or an individual staff shift optimizer. External OTA/PMS synchronization is mocked, not a real stock guarantee across outside systems. The AI is a small original trainable classifier, not a foundation model trained from scratch; it cannot send messages or reserve resources.

## Local agent quality results

The original 8 curated checks passed, but five-fold cross-validation on the 100 synthetic examples reached **62/100 (62.0%)** with the conservative review threshold of 0.75. This lower score is more informative than the eight-item smoke test. Low-confidence cases are deliberately routed to review rather than automatically sent. Before client deployment, we need a larger, diverse labelled dataset, blind holdout tests, and better calibration/coverage. Do not describe the agent as production-accurate yet.

## Next phase (when the UI arrives)

Connect Lovable's React UI to the API routes in `docs/LOVABLE_INTEGRATION.md` and the newly documented event endpoints. Keep NestJS and local PostgreSQL as the authoritative backend; do not let a frontend builder replace them with a different backend. Begin with read-only room search and staff feasibility results, then integrate explicit approval actions.
