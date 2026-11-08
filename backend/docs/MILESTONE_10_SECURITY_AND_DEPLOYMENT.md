# EstateFlow Milestone 10 — Dependency security, repeatable CI and backend deployment recipe

Release: **0.10.0**. Frontend still generated separately in Lovable. Local PostgreSQL role `rishabh` is unchanged; no new SQL migrations, no changed reservation/AI workflows.

## Security finding and remedy

Your Mac reported `GHSA-q7qp-rjg7-q26m` and two high-severity npm audit findings because `@nestjs/platform-express` depends on vulnerable `multer` 2.0–2.4.x. Official GitHub advisory (published 2026-10-22): https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m . **Patched release: `multer@2.5.0`.**

`package.json` uses `"overrides": {"multer":"2.5.0"}` so npm resolves the patched transitive dependency without a forced NestJS major upgrade. After `npm install` on the Mac, run `npm run security:verify` to examine the ACTUAL installed dependency tree. Also run `npm audit --omit=dev --audit-level=high` to confirm advisory resolution and catch other issues. Neither an override nor these instructions constitute an audit result until run on your machine.

`npm audit` may report **two high-severity entries in the same dependency chain**, not necessarily two distinct root causes. Record the result after reinstalling. Do not use `npm audit fix --force` blindly.

## Mac: installation and verification

1. Unzip the COMPLETE `EstateFlow_Backend` directory, not a patch folder.
2. Copy your working `.env` from v0.9.0. Never expose its `DB_PASSWORD` or `JWT_SECRET`.
3. From the new folder:

```bash
npm install
npm run security:verify
npm audit --omit=dev --audit-level=high
npm run security:config
npm run agent:train
npm run db:migrate
npm run preflight
npm run contract:m9
npm run test:m9
npm run test:m10
npm run test:m8
npm run build
npm run db:verify
npm run dev
```

In a second terminal run `npm run smoke:m9`. Stop `npm run dev` if desired, and run `npm run test:e2e` against the disposable **`estateflow_test`** database. **DANGER:** E2E destroys the `public` schema in that test DB; it never intentionally targets the main `estateflow` DB.

**Save and commit the newly generated `package-lock.json`** in the project Git repository so local installs, Docker builds and CI use the same resolved dependencies. The distributed ZIP does not fabricate npm registry integrity hashes and intentionally does not include a lockfile; npm install generates it online on your Mac.

## Docker/backend demo (optional)

- `Dockerfile` builds the NestJS API and runs it as non-root `node`. It contains no frontend and no PostgreSQL server.
- For a **macOS Docker Desktop + Mac-local PostgreSQL** demo: `docker compose -f deploy/compose.local.yml up --build`. The sample points `DB_HOST=host.docker.internal` at your existing database. Your local PostgreSQL may need to accept host-Docker connections (check its listener and `pg_hba.conf`); do not expose PostgreSQL to the public Internet.
- The Docker compose sample uses `NODE_ENV=development` only for the local demo; deploy behind HTTPS with private managed PostgreSQL when ready.
- Run SQL migrations/seed from your Mac before building the production image. The minimal Docker image deliberately omits `ts-node` and SQL migration tooling.
- Never include `.env` in Docker images, public GitHub, logs, screenshots or client bundles. `.dockerignore` excludes it.

## CI workflow

`.github/workflows/backend-ci.yml` starts disposable PostgreSQL 16, installs dependencies, confirms the Multer patch and npm audit, builds TypeScript, runs contract/unit checks, then runs the existing transactional E2E suite against only `estateflow_test`.

CI requires GitHub push and network dependency installation; it has **not been executed in this sandbox**. The CI password and JWT are example credentials for an isolated ephemeral test environment only, never production values.

## Known deployment boundaries

- API runs on `/` (JSON), `/openapi.json` (contract), `/health` and `/health/ready` (readiness). This is NOT the Lovable website.
- Custom AI is a small, locally trained intent model with deterministic extraction/draft policies, **not a self-trained LLM**. It cannot send messages or make reservations by itself.
- Mock payments and simulated outbound channels remain mocks; do not accept real card information.
- Single-process in-memory rate limiting is not a production distributed rate limiter. Hosted multi-instance rollouts require shared-store throttling and careful trusted-proxy IP handling. The app should not be marketed as fully production-hardened solely because the audit passes.
- Production use also requires HTTPS termination, database backup/restore rehearsals, credential rotation, stable observability, safe migrations and end-to-end UX testing.
- Lovable hosted previews cannot access `localhost:4000` on your Mac. Integrate by running Lovable's exported React project locally or by deploying the API over HTTPS with an appropriate CORS origin.

## Acceptance checklist

```text
[ ] npm install resolves Multer: npm ls multer --all (must show 2.5.0)
[ ] npm run security:verify exits 0
[ ] npm audit --omit=dev --audit-level=high exits 0 (no high prod advisories)
[ ] npm run test:m10 passes
[ ] npm run test:m9 and npm run build pass
[ ] npm run smoke:m9 passes on running API
[ ] npm run test:e2e reports all existing 60 checks passed
[ ] package-lock.json committed to repo
[ ] Docker build tested if choosing that route
```
