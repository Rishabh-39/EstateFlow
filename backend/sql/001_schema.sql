-- EstateFlow schema v1. PostgreSQL 14+. Run once via npm run db:migrate.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('GUEST','STAFF','GM')),
 display_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS room_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE,
 name text NOT NULL,
 description text NOT NULL DEFAULT '',
 max_guests int NOT NULL CHECK(max_guests > 0),
 image_url text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS room_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 room_type_id uuid NOT NULL REFERENCES room_types(id),
 unit_code text NOT NULL UNIQUE,
 active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_room_units_type ON room_units(room_type_id);
CREATE TABLE IF NOT EXISTS inventory_days (
 room_type_id uuid NOT NULL REFERENCES room_types(id),
 stay_date date NOT NULL,
 website_allotment int NOT NULL CHECK(website_allotment >= 0),
 blacked_out boolean NOT NULL DEFAULT false,
 PRIMARY KEY (room_type_id, stay_date)
);
CREATE TABLE IF NOT EXISTS daily_rates (
 room_type_id uuid NOT NULL REFERENCES room_types(id),
 stay_date date NOT NULL,
 rate_paise int NOT NULL CHECK(rate_paise >= 0),
 gst_basis_points int NOT NULL CHECK(gst_basis_points BETWEEN 0 AND 10000),
 PRIMARY KEY (room_type_id, stay_date)
);
CREATE TABLE IF NOT EXISTS promo_codes (
 code text PRIMARY KEY,
 discount_percent int NOT NULL CHECK(discount_percent BETWEEN 1 AND 100),
 valid_from date NOT NULL,
 valid_to date NOT NULL,
 max_uses int NOT NULL CHECK(max_uses >= 1),
 uses int NOT NULL DEFAULT 0 CHECK(uses >= 0),
 CHECK(valid_to >= valid_from)
);
CREATE TABLE IF NOT EXISTS booking_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 request_key text,
 room_type_id uuid NOT NULL REFERENCES room_types(id),
 room_unit_id uuid NOT NULL REFERENCES room_units(id),
 check_in date NOT NULL,
 check_out date NOT NULL,
 guests int NOT NULL CHECK(guests > 0),
 subtotal_paise int NOT NULL,
 gst_paise int NOT NULL,
 discount_paise int NOT NULL DEFAULT 0,
 total_paise int NOT NULL,
 promo_code text REFERENCES promo_codes(code),
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD','EXPIRED','CONFIRMED')),
 UNIQUE(user_id, request_key),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(check_out > check_in)
);
CREATE TABLE IF NOT EXISTS bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 hold_id uuid NOT NULL UNIQUE REFERENCES booking_holds(id),
 reference text NOT NULL UNIQUE,
 total_paise int NOT NULL,
 status text NOT NULL CHECK(status IN ('CONFIRMED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES bookings(id),
 idempotency_key text NOT NULL UNIQUE,
 mock_reference text NOT NULL,
 amount_paise int NOT NULL,
 status text NOT NULL CHECK(status IN ('SUCCEEDED','FAILED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 public_ref text NOT NULL UNIQUE,
 source text NOT NULL CHECK(source IN ('WEB','EMAIL_SIM','WHATSAPP_SIM')),
 message text NOT NULL,
 contact_name text NOT NULL,
 contact_email text,
 category text NOT NULL DEFAULT 'UNKNOWN' CHECK(category IN ('ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','COMPLAINT','UNKNOWN')),
 routing_lane text NOT NULL DEFAULT 'UNSORTED',
 assigned_user_id uuid REFERENCES users(id),
 extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
 agent_confidence real,
 status text NOT NULL DEFAULT 'OPEN',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reply_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enquiry_id uuid NOT NULL REFERENCES enquiries(id),
 body text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SENT_SIMULATED')),
 edited_by uuid REFERENCES users(id),
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS event_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enquiry_id uuid REFERENCES enquiries(id),
 title text NOT NULL,
 event_date date NOT NULL,
 check_in date NOT NULL,
 check_out date NOT NULL,
 guests int NOT NULL CHECK(guests > 0),
 rooms_required int NOT NULL CHECK(rooms_required >= 0),
 dining_guests int NOT NULL CHECK(dining_guests >= 0),
 parking_spaces int NOT NULL CHECK(parking_spaces >= 0),
 event_staff int NOT NULL CHECK(event_staff >= 0),
 venue_code text NOT NULL,
 status text NOT NULL DEFAULT 'PROPOSED' CHECK(status IN ('PROPOSED','RESERVED')),
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(check_out > check_in),
 CHECK(event_date >= check_in AND event_date < check_out)
);
CREATE TABLE IF NOT EXISTS resource_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE,
 display_name text NOT NULL
);
CREATE TABLE IF NOT EXISTS resource_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 resource_id uuid NOT NULL REFERENCES resource_types(id),
 slot_date date NOT NULL,
 slot_name text NOT NULL DEFAULT 'DAY',
 capacity int NOT NULL CHECK(capacity >= 0),
 blocked boolean NOT NULL DEFAULT false,
 UNIQUE(resource_id, slot_date, slot_name)
);
CREATE TABLE IF NOT EXISTS feasibility_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES event_requests(id),
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reservation_bundles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL UNIQUE REFERENCES event_requests(id),
 approved_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS resource_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bundle_id uuid NOT NULL REFERENCES reservation_bundles(id),
 slot_id uuid NOT NULL REFERENCES resource_slots(id),
 quantity int NOT NULL CHECK(quantity > 0),
 UNIQUE(bundle_id, slot_id)
);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_slot ON resource_allocations(slot_id);
-- This table is the physical inventory authority shared by direct stays and events.
CREATE TABLE IF NOT EXISTS room_nights (
 room_unit_id uuid NOT NULL REFERENCES room_units(id),
 stay_date date NOT NULL,
 origin text NOT NULL CHECK(origin IN ('DIRECT','EVENT')),
 hold_id uuid REFERENCES booking_holds(id),
 bundle_id uuid REFERENCES reservation_bundles(id),
 PRIMARY KEY (room_unit_id, stay_date),
 CHECK ((origin='DIRECT' AND hold_id IS NOT NULL AND bundle_id IS NULL)
    OR (origin='EVENT' AND bundle_id IS NOT NULL AND hold_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_room_nights_date ON room_nights(stay_date);
CREATE INDEX IF NOT EXISTS idx_room_nights_hold ON room_nights(hold_id);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY,
 actor_id uuid REFERENCES users(id),
 action text NOT NULL,
 entity_id uuid,
 meta jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
