-- M11: booking cancellation metadata and readable cancelled hold state.
-- Idempotent because migrate.ts executes each SQL file on every run.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason_code text;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_cancellation_reason_code_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_cancellation_reason_code_check
 CHECK (cancellation_reason_code IS NULL OR cancellation_reason_code IN ('GUEST_REQUEST','DUPLICATE','STAFF_CORRECTION','OTHER'));
ALTER TABLE booking_holds DROP CONSTRAINT IF EXISTS booking_holds_status_check;
ALTER TABLE booking_holds ADD CONSTRAINT booking_holds_status_check
 CHECK (status IN ('HELD','EXPIRED','CONFIRMED','CANCELLED'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_action ON audit_logs(entity_id,action,created_at DESC);
