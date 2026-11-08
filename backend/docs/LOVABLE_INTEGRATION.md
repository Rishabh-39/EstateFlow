# EstateFlow — Lovable Frontend Handoff

## Preserve this backend

Use the React + Vite frontend generated in Lovable. **Do not use Supabase or Lovable Cloud as the booking/reservation authority.** The only backend authority is NestJS + PostgreSQL in this repository.

Set in the React frontend (development):

```env
VITE_API_BASE_URL=http://localhost:4000
```

For production use the deployed HTTPS API base URL. This is a public endpoint URL, **not a secret**. Do not expose JWT secret, database credentials or server env variables in `VITE_` env names.

A minimal fetch wrapper:

```ts
const API = import.meta.env.VITE_API_BASE_URL;
let accessToken: string | null = null; // demonstration only; in-memory state
export function setAccessToken(token: string) { accessToken = token; }
export async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `API error ${res.status}`);
  return body;
}
```

**Screen to API mapping:**

| Lovable screen | HTTP operation |
| --- | --- |
| Homepage room cards | GET `/room-types` |
| Stay search | GET `/availability?checkIn=2027-02-13&checkOut=2027-02-15` |
| Room quote | POST `/quotes` |
| Checkout | POST `/auth/register` or `/auth/login`; POST `/booking-holds` with idempotency key |
| Test payment | POST `/payments/mock/confirm` with unique idempotency key |
| Booking confirmation | GET `/bookings/:id` |
| Event enquiry | POST `/enquiries` |
| Staff inbox | GET `/staff/enquiries` |
| AI interpretation | POST `/staff/enquiries/:id/ai-process` |
| Edit/send draft | PATCH `/staff/drafts/:id`, POST `/staff/drafts/:id/send-simulated` |
| Staff event feasibility | POST `/staff/events`, POST `/staff/events/:id/evaluations` |
| Alternatives | GET `/staff/events/:id/alternatives` |
| Staff approval | POST `/staff/events/:id/reserve` |
| Rates/allotments | GET `/staff/rates` and `/staff/inventory`; PUT corresponding day routes |
| Resource planning | GET `/staff/resources?date=2027-02-14` |
| CSV export | GET `/staff/bookings/export?date=2027-02-14` |

Booking and event APIs are separate: a wedding enquiry does not automatically create or reserve an `event_request`. An authorized staff member must supply missing operational requirements, create/update the event, evaluate, and explicitly reserve it.

**Error states to render:** 400 invalid input, 401 invalid token, 403 staff-only, 404 missing resource or unseeded date, 409 sold out/expired hold/not feasible/changed capacity, 500 infrastructure failure. A 409 should offer a recheck or alternative, not silently retry the same approval.

**Design note:** Preserve the calm Airbnb-inspired guest flow and the Feasibility Workbench UI. All optimistic estimates should be clearly labelled until verified by the API.

## Milestone 2: Feasibility Workbench endpoints

Lovable can wire up the event workflow after its screens are ready. These APIs already exist in the backend source:

- `POST /staff/events/:id/evaluations`: Returns `status`, `details`, `blockers` and `selectedRoomUnitIds`; treat this as a **snapshot**, never a confirmed reservation.
- `GET /staff/events/:id/alternatives`: Returns checked candidate dates and check-in/check-out windows.
- `POST /staff/events/:id/alternatives/select` with `{ "eventDate": "2027-02-15" }`: Proposes a new date and re-evaluates it. Still requires human approval.
- `GET /staff/events/:id/bundle`: Returns `bundle: null` before booking; after commit returns room units and resource allocations.
- `POST /staff/events/:id/reserve`: Explicitly authorized staff action; if any constraint fails, API returns HTTP 409 and no partial bundle.

**UI status convention:** `NOT_FEASIBLE` shows all blockers and alternative actions. `NEEDS_REVIEW` requests details. `FEASIBLE` permits showing an approval CTA. Only an actual `RESERVED` API response should display confirmed event allocation. Re-run the feasibility evaluation if conditions have changed.
