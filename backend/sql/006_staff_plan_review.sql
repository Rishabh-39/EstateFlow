-- Proposed workforce planning is a separate review workflow.
-- It does NOT reserve shifts or physical event resources.
CREATE TABLE IF NOT EXISTS staff_plans (
  enquiry_id uuid PRIMARY KEY REFERENCES enquiries(id) ON DELETE CASCADE,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft'
     CHECK (status IN ('Draft','Pending GM','Changes requested','Approved','Sent to client')),
  gm_note text NOT NULL DEFAULT '',
  submitted_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_plans_status_idx ON staff_plans (status);
