# v0.13 integration notes

Use the repository-root `README.md`, `docs/PROBLEM_STATEMENT_TRACEABILITY.md`, and `docs/LOCAL_ACCEPTANCE_TESTS.md`.

The supplied Lovable frontend is preserved in the sibling `frontend` directory. `005_frontend_integration.sql` adds booking guest details, structured event form JSON and promo activation. No inventory lock/room-night uniqueness semantics were changed. New read/write endpoints include owner-only booking reference lookup, active promo reads/toggles, and DB-derived starting rate in room category and detail responses.

The SPA is not served by NestJS at `/`; run the TanStack Start app separately on port 5173. `/` on port 4000 is an API status JSON by design.

`npm run test:m13` verifies static integration/API contracts only; `npm run test:e2e` verifies real PostgreSQL behavior in a disposable DB. This version's end-to-end runtime success is pending confirmation from Mac.
