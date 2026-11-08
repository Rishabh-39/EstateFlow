-- M25: staff-attested client contacts; no automated external messages.
CREATE TABLE IF NOT EXISTS enquiry_client_followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enquiry_id uuid NOT NULL REFERENCES enquiries(id),
 staff_id uuid NOT NULL REFERENCES users(id),
 channel text NOT NULL CHECK (channel IN ('email','phone','whatsapp')),
 summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 10 AND 2000),
 contacted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiry_client_followups_recent_idx
 ON enquiry_client_followups(enquiry_id, contacted_at DESC, id DESC);
