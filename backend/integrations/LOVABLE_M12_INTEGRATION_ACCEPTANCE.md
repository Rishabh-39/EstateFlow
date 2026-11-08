# Lovable-to-EstateFlow acceptance checklist — use AFTER the UI is generated

This is a handoff note, not a request to create a new frontend. The frontend remains owned by the existing Lovable project.

1. Keep all Lovable components, responsive layouts and visual design. Do **not** replace NestJS/PostgreSQL with a hosted backend vendor.
2. Use `integrations/estateflow-api.ts` as the typed reference; bind room cards to `GET /room-types`, details to `GET /room-types/:id`, dates to `GET /availability`, checkout pricing to `POST /quotes`.
3. Sign-in uses `/auth/login`; protected calls include bearer auth. Keep the JWT secret server-only; never put it in the Vite client environment.
4. Booking: `POST /booking-holds` with an idempotency key; `GET /booking-holds/:id` for expiry; `POST /payments/mock/confirm` for **mock** payment, not a live gateway; `POST /bookings/:id/cancel` for eligible simulated booking cancellations.
5. Event enquiries use `POST /enquiries`. Staff correction and reply review use the `/staff/enquiries` and `/staff/drafts` APIs. Staff manually creates a proposal from a reviewed enquiry.
6. Show resource feasibility and verified alternatives from `/staff/events/:id/evaluations` and `/staff/events/:id/alternatives`. Only explicit staff action may call `/staff/events/:id/reserve`. Never directly allocate on frontend or AI classification.
7. Show clear empty/invalid/full/expired/conflicting states. Display INR pricing from paise exactly; preserve date-only YYYY-MM-DD and arrival/departure local timezone.
8. For local frontend export, use `VITE_API_BASE_URL=http://localhost:4000` and the NestJS `CORS_ORIGIN=http://localhost:5173`; a **hosted** Lovable preview cannot access your Mac's localhost without a secure hosting/tunneling arrangement.
9. Run manual real-browser acceptance on desktop and 390px mobile; do not claim these checks passed until the actual frontend is connected.
10. Source handoff required: ZIP or public repository **of the actual Lovable-generated frontend**. A screenshot alone cannot establish click behavior or API integration.
