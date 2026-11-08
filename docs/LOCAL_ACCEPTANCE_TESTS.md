# Local build, test and acceptance plan

## Prerequisites and initial database

Use PostgreSQL role `rishabh` (local credentials in `backend/.env`, not in frontend). One-time database creation when needed:

```sh
psql -h localhost -U rishabh -d postgres -c 'CREATE DATABASE estateflow;'
psql -h localhost -U rishabh -d postgres -c 'CREATE DATABASE estateflow_test;'
```

`estateflow_test` must be disposable. The E2E runner **destructively recreates its `public` schema**. It refuses primary `estateflow`, but never put real guest data in `estateflow_test`.

Backend terminal:

```sh
cd backend
cp .env.example .env
# Set DB_PASSWORD and generated JWT_SECRET, retain DB_NAME=estateflow and PORT=4000
npm install
npm run db:migrate
# Only if your demo DB is not seeded:
npm run db:seed
npm run agent:train
npm run preflight
npm run contract:m9
npm run test:m13
npm run test:m9
npm run test:unit
npm run test:agent
npm run db:verify
npm run build
npm run dev
```

Frontend terminal:

```sh
cd frontend
cp .env.example .env
npm install
npx tsc -p tsconfig.integration-check.json --noEmit
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

If frontend's installed dependencies require a newer Node version, use Node 22 LTS. Do not silently replace the TanStack Start project with a new framework. Verify browser developer tools for network/CORS errors.

Third terminal:

```sh
cd backend
npm run smoke:m9
npm run test:e2e
```

## Browser acceptance checklist (to execute on Mac)

- [ ] At `/stays`, see **Estate Room** and **Plantation Villa** from `GET /room-types`, not four hardcoded cards. Rates come from PostgreSQL.
- [ ] Pick seeded dates, guests within occupancy, and see `GET /availability` and `POST /quotes`; verify subtotal, GST, total and optional `WELCOME10` promotion.
- [ ] Register/login as GUEST, create a hold in `/book/<room UUID>`, see 10-minute countdown, simulate decline then success; no real card data/charge.
- [ ] Confirmation `/booking/EF-...` loads the owner-only DB booking; check cancellation releases the dates, does not claim refund; other user must not read the same reference.
- [ ] `/events` submit wedding event dates/guests/rooms/parking/dining/budget note and see real `ENQ-...` response in network and staff inbox.
- [ ] Staff login: `staff@estateflow.local`, demo password only for local seeded database. See inbox, AI category/extraction, preserve manual edits on reprocessing and save draft. `send-simulated` changes draft status but sends nothing externally.
- [ ] Explicitly review complete event requirement quantities. Run feasibility; show resource shortfall (demo February 2027 wedding has parking deficit of 12), select a verified alternative (no allocation yet), approve; verify actual reserved bundle.
- [ ] Two requests for the same lawn/date must not both reserve. Check result by running backend `npm run test:e2e` against `estateflow_test`.
- [ ] Rates/allotment/blackout and promo manager read/write PostgreSQL; export staff CSV.
- [ ] `/gm/login` displays escalated complaints; no automatic reply or venue approval from AI.
- [ ] On 390px mobile, guest search, date selection, checkout and event form remain readable; staff views have usable navigation. No fabricated stats or booking claims.
- [ ] Run `npm audit --omit=dev --audit-level=high` and check no high production advisories.

## Known limits

- This environment could not install Lovable frontend npm packages or connect to the user's local PostgreSQL database. Source syntax, isolated API adapter types and offline source/OpenAPI contract checks **passed**; complete frontend build, visual acceptance and live E2E for integrated v0.13 **must be executed on Mac**.
- The previous backend v0.12 was verified by the user: 71/71 E2E, 11/11 API smoke, 0 npm audit vulnerabilities. Those outcomes do not automatically certify v0.13.
- `frontend/src/services/api/mock.ts` and former prototype pricing utilities remain only as unused test/prototype source. Runtime route modules import `api` from `live.ts`, not `mockApi`.
