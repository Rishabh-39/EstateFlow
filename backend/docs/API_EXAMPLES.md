# API Request Examples

Set `API=http://localhost:4000` and substitute IDs from your local database. All dates are `YYYY-MM-DD`; prices are **integer paise**.

## Authenticate

```bash
curl -X POST http://localhost:4000/auth/login -H 'Content-Type: application/json' -d '{"email":"staff@estateflow.local","password":"DemoStaff!2026"}'
```

Paste the returned token as `TOKEN` for staff requests. Guest token is obtained using `guest@estateflow.local`.

## Search / Quote / Hold / Simulated Pay

```http
GET /room-types
GET /availability?checkIn=2027-03-10&checkOut=2027-03-12
POST /quotes
Content-Type: application/json

{"roomTypeId":"<ESTATE_ROOM_TYPE_UUID>","checkIn":"2027-03-10","checkOut":"2027-03-12","guests":2,"promoCode":"WELCOME10"}

POST /booking-holds
Authorization: Bearer <GUEST_TOKEN>
Idempotency-Key: booking-demo-20270310
Content-Type: application/json

{"roomTypeId":"<ESTATE_ROOM_TYPE_UUID>","checkIn":"2027-03-10","checkOut":"2027-03-12","guests":2}

POST /payments/mock/confirm
Authorization: Bearer <GUEST_TOKEN>
Idempotency-Key: payment-demo-20270310
Content-Type: application/json

{"holdId":"<HOLD_UUID>","outcome":"SUCCESS"}
```

Mock payment `FAILURE` returns a declined simulation without creating a booking. Real cards and UPI details are never collected.

## Wedding / Feasibility

```http
POST /staff/events
Authorization: Bearer <STAFF_TOKEN>
Content-Type: application/json

{"title":"Demo Wedding","eventDate":"2027-02-14","checkIn":"2027-02-13","checkOut":"2027-02-15","guests":250,"roomsRequired":35,"diningGuests":250,"parkingSpaces":60,"eventStaff":12,"venueCode":"LAWN"}

POST /staff/events/<EVENT_UUID>/evaluations
Authorization: Bearer <STAFF_TOKEN>

GET /staff/events/<EVENT_UUID>/alternatives
Authorization: Bearer <STAFF_TOKEN>

POST /staff/events/<EVENT_UUID>/reserve
Authorization: Bearer <STAFF_TOKEN>
```

The seeded 14-Feb-2027 parking slot has only 48 spaces; 60 are required. This returns `NOT_FEASIBLE`, parking deficit 12. Reserve returns HTTP 409. Staff must choose/update a valid alternative and run evaluation again.

## Enquiry / Trained Agent / Draft

```http
POST /enquiries
Content-Type: application/json

{"contactName":"Sample Guest","contactEmail":"guest@example.test","message":"We need a wedding lawn for 250 guests in February 2027"}

GET /staff/enquiries
Authorization: Bearer <STAFF_TOKEN>

POST /staff/enquiries/<ENQUIRY_UUID>/ai-process
Authorization: Bearer <STAFF_TOKEN>

GET /staff/enquiries/<ENQUIRY_UUID>/drafts
Authorization: Bearer <STAFF_TOKEN>

PATCH /staff/drafts/<DRAFT_UUID>
Authorization: Bearer <STAFF_TOKEN>
Content-Type: application/json

{"body":"Hello, thank you for your enquiry. Could you confirm your exact event date?"}

POST /staff/drafts/<DRAFT_UUID>/send-simulated
Authorization: Bearer <STAFF_TOKEN>
```
