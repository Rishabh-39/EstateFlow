-- Frontend handoff: persist verified guest booking details and submitted structured enquiry fields.
-- No changes to physical room-night or resource-allocation correctness constraints.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_requests text;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS form_payload jsonb;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
