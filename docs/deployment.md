# EstateFlow local deployment — integrated development candidate

This is a **local prototype**, not a live deployment. See `README.md` for full setup and `docs/LOCAL_ACCEPTANCE_TESTS.md` for acceptance criteria.

- Frontend: Lovable TanStack Start/React, port 5173; `VITE_API_URL=http://localhost:4000`.
- Backend: NestJS 11, port 4000, `CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173`.
- Database: local PostgreSQL `estateflow` with role `rishabh`; password supplied privately in `backend/.env`.
- Agent: local trained Naive Bayes + extraction/rules (`npm run agent:train`), never an LLM or autonomous agent with write authority.

Quick start: create local PostgreSQL DB and copy backend `.env.example` to `.env`; run `npm install && npm run db:migrate && npm run db:seed && npm run agent:train && npm run dev` in `backend`. In `frontend`, copy `.env.example` and run `npm install && npm run dev -- --port 5173`.

Reviewer demo accounts **only in isolated local seeded environment**: staff `staff@estateflow.local` / `DemoStaff!2026`, GM `gm@estateflow.local` / `DemoManager!2026`, guest `guest@estateflow.local` / `DemoGuest!2026`. Never deploy those known passwords publicly.

Test: `npm run test:m13`, `npm run build`, `npm run db:verify`, `npm run smoke:m9`, `npm run test:e2e` from backend; `npm run build` and browser/manual checks from frontend. **E2E resets disposable `estateflow_test`, not live data.**

All payments and communication sends are simulated; do not collect real payment details. Public GitHub repository and deployed HTTPS URLs are **pending**. The final assignment's two-file submission ZIP (technical design + deployment.md with real URLs) must be prepared separately after browser tests and deployment.


## Local connection and demo sign-in troubleshooting

- Use **Node.js 22.12+** for the TanStack Start frontend. Node 20 may build but does not satisfy its package engine requirements.
- Frontend at `http://127.0.0.1:5173` and frontend at `http://localhost:5173` have **different** browser origins; both must be allowed by backend CORS. The patched local backend accepts both aliases in nonproduction mode. Restart the backend after any `.env` change.
- Run `npm run demo:accounts` inside backend to check the **three synthetic** local accounts without changing anything. Old seeded accounts can retain old hashes because normal `db:seed` uses `ON CONFLICT DO NOTHING`.
- If demo checks fail, run `npm run demo:accounts -- --reset` once. It updates ONLY the three fixed demo emails and is blocked for production/remote/test databases. Never run it on real accounts.
- Afterward retry staff/GM login. For diagnosis, `curl -i -X POST http://localhost:4000/auth/login -H 'Content-Type: application/json' -d '{"email":"staff@estateflow.local","password":"DemoStaff!2026"}'` should produce a 201 response on the local demo. **Do not post the JWT**.
- Confirm `GET /room-types` responds, then open `/stays`; both room categories use bundled local JPGs, while prices and availability come from PostgreSQL.
