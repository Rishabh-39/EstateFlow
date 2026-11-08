-- GM escalation review history and persistent in-app notice to staff.
-- Deliberately separate from event_approval_reviews: complaint resolution never reserves inventory.
CREATE TABLE IF NOT EXISTS gm_escalation_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enquiry_id uuid NOT NULL REFERENCES enquiries(id),
 decision text NOT NULL CHECK (decision IN ('RESOLUTION_APPROVED','ACTION_REQUIRED')),
 note text NOT NULL CHECK (length(trim(note)) BETWEEN 10 AND 2000),
 decided_by uuid NOT NULL REFERENCES users(id),
 returned_to_staff_id uuid REFERENCES users(id),
 decided_at timestamptz NOT NULL DEFAULT now(),
 staff_acknowledged_at timestamptz,
 staff_acknowledged_by uuid REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_gm_escalation_decisions_enquiry_latest
 ON gm_escalation_decisions(enquiry_id, decided_at DESC, id DESC);
