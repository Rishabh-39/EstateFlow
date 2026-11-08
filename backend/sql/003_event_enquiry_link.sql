-- One event proposal per enquiry. Nullable enquiry_id remains allowed for directly
-- created staff events, including events seeded for demonstration.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_event_per_enquiry
  ON event_requests(enquiry_id) WHERE enquiry_id IS NOT NULL;
