# EstateFlow — Lovable design preservation update (v0.13.1)

The original Lovable frontend is the visual design baseline. This package **restores the original Staff Allocation editor, General Manager review dashboard, and their surrounding navigation/layout**, instead of the simplified screens introduced in the first backend integration.

## What is restored

- The original staff allocation list, eight-role counters, notes, GM submission, approval-state chips, and manually opened WhatsApp/email links.
- The original GM desk grouped escalations by priority, plus pending staffing plans with approval/revision controls.
- The original sidebar label **Staff allocation** and GM header/navigation layout.
- The original chat-style concierge card and suggestion pills. Instead of inventing prices, availability or sending replies, it records guest enquiries for staff review and gives a real reference number.

The rest of the guest and staff pages keep the existing integrated backend API adapter, real room pricing and inventory, and operational booking/event reservation actions. Some previous checkout markup was adapted during the first integration, and is **not claimed pixel-identical** to Lovable's source. If exact checkout design parity is required, compare its JSX against `frontend.zip` before final design acceptance.

## Correct data-flow / safety boundaries

`staff_plans` is an **independent proposed team-plan workflow**, with a human approval step; it is not a record of employee shift assignments or a physical reservation. GM approval of a staffing plan does not reserve rooms, venue, dining, parking or workers. The previously tested event feasibility engine and its separately authenticated atomic reservation endpoint remain the only way to commit those capacity resources. No real email, WhatsApp or payment processing is implemented.

The saved plan is durable in PostgreSQL (migration `006_staff_plan_review.sql`). Only STAFF may edit and submit; only GM may approve or request changes. Marking a plan sent is a **manual staff attestation** after opening an external client messaging link; the API never sends it.

## Run locally

1. Use Node.js 22.12 or later for the TanStack frontend; Node 20.19+ is acceptable for backend alone. Configure backend `.env` with the existing local `rishabh` PostgreSQL credentials, JWT secret and correct CORS origins for `localhost:5173` / `127.0.0.1:5173`.
2. In `backend`: `npm install && npm run db:migrate && npm run contract:m9 && npm run test:m9 && npm run test:m13 && npm run test:design && npm run build && npm run db:verify && npm run dev`.
3. In another terminal, in `frontend`: `cp .env.example .env && npm install && npm run build && npm run dev -- --host 127.0.0.1 --port 5173`.
4. Confirm staff and GM authentication with your verified local demo accounts. Visit `/staff/allocation` and `/gm`, create/save a plan, submit to GM, approve as GM, and verify state persists on refresh.
5. Finally run `npm run test:e2e` from `backend` **only if your `estateflow_test` database is disposable**. The suite clears that test schema. The existing E2E suite does not yet cover the new staffing-plan workflow; it needs live browser testing before final submission.

## Acceptance details

- Confirm the Staff Allocation and General Manager layouts match your original Lovable screenshots.
- Verify browser Network tab has no CORS errors.
- Verify only authenticated GM can approve a submitted staffing plan and that a guest cannot access the staffing endpoints.
- Verify there are no claims of employee-level shift assignment or capacity reservation from the plan UI.
- Use the resource feasibility workbench for actual event-capacity checks and resource approval.
- Do not upload `.env`, local backups, test accounts or credentials to GitHub.
