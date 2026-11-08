# EstateFlow Milestone 12 — E2E version-check fix

Cause: `scripts/e2e.mjs` hardcoded API version `0.11.0` in the root and OpenAPI checks, while the v0.12.0 server correctly returns `0.12.0`.

Fix: The E2E assertions now read the expected version from `../package.json`, as the smoke test does. There are **no database or booking code changes**.

## Option A — Apply single file (recommended)

Replace `<your project>/scripts/e2e.mjs` with the included `scripts/e2e.mjs`. Keep your existing `.env`.

## Option B — Complete project

Open the inner `EstateFlow_Backend/` from the complete corrected ZIP, copy in your working `.env`, then run `npm install`.

## Validate

```bash
node --check scripts/e2e.mjs
npm run test:e2e
```

The E2E runner **deletes the `public` schema in the disposable database `estateflow_test`**. Confirm no important data lives there. Your main `estateflow` database is not the intended target.

Expected root and OpenAPI version assertions: PASS. The rest of the suite must run on your Mac with PostgreSQL; this patch cannot guarantee every later assertion will pass.
