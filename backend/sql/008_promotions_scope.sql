-- M20: One PostgreSQL source of truth for room-scoped promotional offers.
-- NULL room_type_id = eligible for both Estate Room and Plantation Villa.
-- Existing historic codes keep BOTH scope until staff explicitly changes them.
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS room_type_id uuid REFERENCES room_types(id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_room_eligibility
 ON promo_codes (room_type_id, valid_from, valid_to) WHERE active=true;
