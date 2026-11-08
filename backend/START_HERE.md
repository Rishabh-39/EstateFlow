**Current release v0.12.0:** Read `docs/MILESTONE_12_REVIEWER_HANDOFF.md` first. This remains a backend-only project; the Lovable frontend is separate. The next backend milestone is reviewer/demo readiness, not the final two-file assignment submission.

**Current release v0.11.0:** Read `docs/MILESTONE_11_BOOKING_CANCELLATION.md` first. Extract the complete archive and run `npm run db:migrate` to apply `004_booking_cancellation.sql` before testing the new endpoint.

# EstateFlow Backend v0.10.0 — START HERE

Milestone 10: inspect `docs/MILESTONE_10_SECURITY_AND_DEPLOYMENT.md` for the Multer vulnerability fix, security commands and CI/Docker setup.

# EstateFlow — Milestone 9 (complete backend)

This archive contains the full source tree, **not a patch**. Open the inner `EstateFlow_Backend` folder in VS Code.

- Backend version: `0.10.0`; frontend is still being built separately in Lovable.
- Local PostgreSQL user: `rishabh` (password lives only in your private `.env`).
- To fix your old browser `404 Cannot GET /` confusion: after running `npm run dev`, open `http://localhost:4000/` to see a JSON backend overview, `http://localhost:4000/openapi.json` to see the API contract, or `http://localhost:4000/room-types` for data. **No UI webpage is served here.**
- See `docs/MILESTONE_9_API_DISCOVERY.md` for setup, verification, E2E warnings and Lovable handoff.

```sh
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run contract:m9
npm run test:m9
npm run build
npm run test:m8
npm run db:verify
npm run dev
# In a second terminal: npm run smoke:m9
# Optional: npm run test:e2e only against disposable estateflow_test
```

Never upload your `.env` or use `npm run test:e2e` against the real `estateflow` database.
