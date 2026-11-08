-- Milestone 3: Persist human overrides separately from model-generated values.
-- Idempotent and non-destructive. Apply after 001_schema.sql.
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS manual_category text
  CHECK (manual_category IN ('ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','COMPLAINT','UNKNOWN'));
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS manual_extracted jsonb;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS agent_model_version text;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS agent_processed_at timestamptz;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS agent_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_enquiries_routing_queue ON enquiries(routing_lane,created_at DESC);
