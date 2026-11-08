# EstateFlow Backend Test Plan

## Completed in this source-build environment

- TypeScript source syntax parsed successfully (18 TS files at build time).
- Local trained model created from 100 labelled examples without third-party ML services.
- Intent extraction, complaint routing and draft-only policy assertions passed (`npm run test:unit`).
- Eight curated independent-phrase classifier checks passed (`npm run agent:evaluate`).
- ZIP archive integrity checked.

## Must execute after local npm install + PostgreSQL setup

Run `npm run build`, `npm run db:migrate`, `npm run db:seed`, start server, then `node scripts/smoke.mjs`.

| Area | Test scenario | Expected |
| --- | --- | --- |
| Concurrency | Two guests hold the final website unit at the same time | Exactly one hold; one HTTP 409 |
| Physical room inventory | Wedding allocation and direct booking compete for same physical units | Never overlapping `room_nights` key |
| Multi-night stays | Room free on one night, booked on another | Not available for continuous stay |
| Blackout | Staff blacks out a date | New direct hold is rejected |
| Allotment admin | Reduce allotment below direct reservations | HTTP 409, unchanged |
| Rate integrity | Quote ₹9,500 with configured 18% tax | ₹11,210 total before promo |
| Payment | Mock FAILURE | No booking, no charge |
| Payment retry | Duplicate success with same idempotency key | One booking, replay result |
| Hold expiry | Expired hold is paid | HTTP 409; stock released on next locked mutation |
| Feasibility | 250 guests, 35 rooms, 60 parking, 48 slots | NOT_FEASIBLE and parking deficit 12 |
| Feasibility | Valid shifted date with sufficient capacity | FEASIBLE from verified DB state |
| Event approval | Two conflicting event approvals | At most one reservation commits |
| Atomicity | Conflict in any service resource | No room nights or other allocations left committed |
| AI routing | Three brief sample enquiries | Wedding, Room, Offsite |
| AI uncertainty | Ambiguous short enquiry | UNKNOWN/UNSORTED |
| Complaint | Refund/dissatisfaction enquiry | COMPLAINT, GM_ESCALATION |
| AI safety | Inject text asking for auto-send/reservation | No ability; only DRAFT |
| Access control | Guest calls staff inventory/event approval API | HTTP 403 |
| Privacy | Attempt to view another guest's booking | HTTP 403 |
| CSV | Export day with booking | Valid CSV with no passport details |

Automated browser tests with the Lovable frontend are not included in this backend-only milestone. The provided smoke script covers the highest-priority integration paths once PostgreSQL is available.
