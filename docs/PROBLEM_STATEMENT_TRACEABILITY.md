# EstateFlow — assignment requirements mapped to source

Project client: 76-key Chikkamagaluru coffee-estate resort, with weddings/offsites and booking/inventory conflicts. The backend's database enforces operational decisions; frontend provides experience and staff actions.

| Requirement from client brief | Frontend | Backend / evidence | Boundary |
|---|---|---|---|
| Room and villa browsing | `/stays`, `/stays/$roomId` | `GET /room-types`, `/room-types/:id` | 64 Estate Rooms + 12 Villas are physical units; imagery illustrative. |
| Date/guest search, live availability | Stay search/detail | `GET /availability`, inventory-day/allotment and physical room-night query | Direct website allotment is **not** OTA synchronization. |
| Real rates, taxes, promotions | Room detail, checkout, staff rates | `POST /quotes`, daily_rates, GST basis points, promo table | All money is integer paise server-side. No browser price calculation. |
| Simple guest booking | `/book/$roomId`, `/booking/$reference` | `POST /booking-holds`, `/payments/mock/confirm`, `/bookings/reference/:reference` | Up to 10-minute hold, fake payment, real DB confirmation. |
| Cancellation | Booking page | `POST /bookings/:id/cancel`, room-night rollback + audit | Before India-local check-in; **no real refund**. |
| Daily rates, allotment, blackout, promo admin | `/staff/rates` | `/staff/rates`, `/staff/inventory`, `/staff/promo-codes` | Website stock only. |
| Unified enquiries from web and mocked forwarded channels | `/events`, concierge intake, `/staff/inbox` | `/enquiries` and `/staff/enquiries/mock-inbound` | Email/WhatsApp are **simulated**, not connected to inbox APIs. |
| Local project-specific AI | Staff inbox | Custom trained local Naive Bayes classifier, extraction, routing, guarded read-only tools, template reply draft | 210 synthetic labelled examples; uncertain routed for review. No autonomous sends, prices or bookings. |
| Complaint escalation | Staff/GM inbox | Agent routing lane `GM_ESCALATION`, staff overrides cannot bypass previously escalated complaint | GM review required. |
| Structured wedding/offsite enquiry | `/events` multistep | `enquiries.form_payload`, 005 migration | Submitting is an enquiry, **not a reservation**. |
| Room + lawn + dining + parking + staffing feasibility | `/staff/workbench/$enquiryId`, `/staff/allocation` | Events `evaluateSpec`, `resource_slots`, `room_nights` | Rooms checked across all nights, other services DAY slots on event date. |
| Bottlenecks, verified alternatives, atomic reservation | Feasibility workbench | `/staff/events/:id/evaluations`, `/alternatives`, `/alternatives/select`, `/reserve` | Alternatives are not reserved until explicitly staff-approved; DB locks/re-evaluation on approval. |
| Booking CSV | `/staff/export` | `GET /staff/bookings/export` | Real CSV response. |
| Staff/GM roles | Staff/GM sign-ins | JWT DB-role verification and guards | Auth token kept session-scoped in local browser. |
| Reviewer demo | Local readme, backend documentation | 76-seeded-room readiness, unit/policy/DB/E2E scripts | Actual browser acceptance/deployment pending user-run verification. |

## Explicit no-fake-functionality decisions

- Removed Lovable's client-side pricing/feasibility and substituted NestJS calculations.
- Replaced fictitious concierge answers with a real staff-reviewed enquiry intake.
- Replaced fictitious individual staff allocation/GM shift approvals with an honest day-level resource-capacity view. The staff can approve **resource bundles**, not individual employee shifts.
- Original four visual room types are replaced by the two database-backed categories. Guest room image assets are illustrative, not verified resort photography.
- Distinct exception states: insufficient allotment, expired hold, declined mock payment, conflict after feasibility evaluation, missing required venue/quantities and staff role enforcement.

## Implemented v0.13 backend changes

Migration `005_frontend_integration.sql` adds booking guest detail columns, a JSON event form payload, and promo active status. Staff client reads original form plus persistent `manual_extracted`; explicit human corrections override AI and web form fields. Booking-reference lookup is owner-only. Promo creation/toggling and room starting rate are actual DB APIs. New E2E assertions cover those integration contracts.

## Honest scope limitations

- The full end-to-end *browser* journey has not been executed in this authoring environment. Run frontend build, mobile checks and live QA on Mac; no public deployment claimed.
- Inventory models 76 keys and day-based pooled event constraints, not dynamic employee schedules or OTA feeds.
- Payouts, Form C collection, real email/WhatsApp and external payment gateways are outside this MVP. Passport handling is not collected at website booking.
