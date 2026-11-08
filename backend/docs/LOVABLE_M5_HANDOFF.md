# Lovable → EstateFlow Milestone 5 API handoff

When your Lovable UI is ready, **retain** its React components and routes. Do not replace the NestJS + PostgreSQL inventory authority with Supabase or another database.

1. Copy `integrations/estateflow-api.ts` to the Lovable frontend as `src/lib/estateflow-api.ts`.
2. Add only `VITE_API_BASE_URL=http://localhost:4000` to the React frontend environment. Configure `CORS_ORIGIN` in the backend if Vite serves a different origin.
3. Instantiate `new EstateFlowApi(import.meta.env.VITE_API_BASE_URL, () => tokenInMemory)` in your frontend's auth context.
4. Hook the checkout timer to `api.holdStatus(holdId)`; show `ACTIVE`, `EXPIRED`, `CONFIRMED` and remaining seconds returned by the server. A local timer is only presentational. A 404 means the current guest cannot view that hold.
5. Hook the staff Resource Planning calendar to `api.resourceCalendar(start,end)` with a maximum 31-day window. Render `NEEDS_REVIEW` for missing capacity slots, not green availability.
6. Staff event workflow: select enquiry → staff-reviewed proposal → feasibility evaluation → verified alternative (if needed) → explicit staff approval → reservation bundle. Only the final API `RESERVED` state means commitment.
7. Keep AI output read-only and drafts staff-reviewed. The local agent must never call the approval endpoint.

**Please do not put `DB_PASSWORD`, `JWT_SECRET`, model file contents, or PostgreSQL connections in the Lovable frontend.**

API read endpoints added in Milestone 5:

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/health/ready` | Public readiness (no DB secrets) |
| GET | `/booking-holds/:id` | JWT, hold owner only |
| GET | `/staff/resources/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` | STAFF or GM |

No new migrations required. See `docs/MILESTONE_5_EXECUTION.md` for verification.
