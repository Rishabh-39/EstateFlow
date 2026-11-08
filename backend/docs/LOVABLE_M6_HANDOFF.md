# EstateFlow — Lovable UI handoff (M6)

Lovable is building the React UI independently. **Don't create a second backend** or let Lovable replace NestJS/PostgreSQL with a different hosted database. Point the frontend service layer to `http://localhost:4000` during local development; configure `CORS_ORIGIN` in the backend `.env` to match the actual Vite origin.

## Authentication and status codes

- `POST /auth/login` JSON `{ "email": "staff@estateflow.local", "password": "..." }` returns `{ accessToken, tokenType, expiresInSeconds, user }` for valid seeded users. Do not ship these seed credentials to production.
- `GET /auth/me` must be sent with `Authorization: Bearer <accessToken>`. The DB now verifies current role on every authenticated request.
- `401`: session expired/revoked; prompt sign-in. `403`: insufficient privileges. `429`: display request limit message and obey `Retry-After` seconds. Avoid retry storms.
- Use the existing `integrations/estateflow-api.ts`; keep token only in memory, add it to authenticated calls; never hardcode `JWT_SECRET` in React.

## Guest flows

- Room search: `GET /room-types` + `GET /availability`.
- Checkout: `POST /quotes` → `POST /booking-holds` → `GET /booking-holds/:id` countdown → `POST /payments/mock/confirm` → booking confirmation.
- Event enquiry: `POST /enquiries`; a success response means an **enquiry was received**, not that a venue is reserved.

## Staff flows

- Staff dashboard: `GET /staff/overview`.
- AI inbox: `GET /staff/enquiries`, `POST /staff/enquiries/:id/ai-process`, review/edit draft.
- Event workbench: `POST /staff/enquiries/:id/event-proposal` → `POST /staff/events/:id/evaluations` → `GET /staff/events/:id/alternatives` → `POST /staff/events/:id/alternatives/select` → explicit `POST /staff/events/:id/reserve` after staff approval.
- Planning: `GET /staff/resources/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD`, maximum inclusive 31 days. No automated sending, payments, or agent booking.

## UI obligations

All forms must show validation errors, loading/empty states, and network errors. A 429 should explain when the request may be tried again. A 409 conflict in checkout/reservations should prompt a refresh, never claim success. The event calendar is DAY-granularity; do not depict exact shift-by-shift staff scheduling as live functionality.
