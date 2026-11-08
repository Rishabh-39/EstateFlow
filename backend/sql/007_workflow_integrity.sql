-- EstateFlow M18: durable concierge sessions, exclusive venues and staff/GM review.
-- Existing confirmed allocations are backfilled. If already double-booked, migration
-- intentionally fails instead of choosing which event to erase.
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS conversation_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS enquiries_conversation_id_idx ON enquiries(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS enquiry_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enquiry_id uuid NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('GUEST','CONCIERGE')),
 body text NOT NULL CHECK(length(body)>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiry_messages_enquiry_idx ON enquiry_messages(enquiry_id,created_at);

CREATE TABLE IF NOT EXISTS exclusive_venue_claims (
 venue_code text NOT NULL,
 event_date date NOT NULL,
 event_id uuid NOT NULL UNIQUE REFERENCES event_requests(id),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (venue_code,event_date)
);
-- Do not erase an existing double booking to make this migration succeed.
INSERT INTO exclusive_venue_claims(venue_code,event_date,event_id)
SELECT er.venue_code,er.event_date,er.id
FROM event_requests er
JOIN reservation_bundles rb ON rb.event_id=er.id
WHERE er.venue_code='LAWN'
ON CONFLICT(event_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS event_approval_reviews (
 event_id uuid PRIMARY KEY REFERENCES event_requests(id),
 status text NOT NULL CHECK(status IN ('PENDING_GM','GM_APPROVED','GM_REJECTED','CLIENT_CONFIRMED')),
 requested_by uuid NOT NULL REFERENCES users(id),
 reviewed_by uuid REFERENCES users(id),
 gm_note text NOT NULL DEFAULT '',
 client_channel text CHECK(client_channel IN ('email','whatsapp','manual')),
 client_recorded_by uuid REFERENCES users(id),
 requested_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 client_recorded_at timestamptz
);
CREATE INDEX IF NOT EXISTS event_approval_reviews_status_idx ON event_approval_reviews(status);
