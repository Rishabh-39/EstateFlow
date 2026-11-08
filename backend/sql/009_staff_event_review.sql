-- Staff may explicitly classify an enquiry as OTHER_EVENT; the trained
-- Naive Bayes model remains unchanged and never predicts this label.
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_category_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_category_check
 CHECK (category IN ('ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','OTHER_EVENT','COMPLAINT','UNKNOWN'));
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_manual_category_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_manual_category_check
 CHECK (manual_category IS NULL OR manual_category IN
 ('ROOM_BOOKING','WEDDING','CORPORATE_OFFSITE','OTHER_EVENT','COMPLAINT','UNKNOWN'));
-- Add venue identities only, with NO fictional capacities or bookable slots.
INSERT INTO resource_types(code,display_name) VALUES
 ('CONFERENCE_HALL','Conference / meeting hall'),
 ('PLANTATION_PAVILION','Plantation pavilion / celebration venue')
ON CONFLICT(code) DO NOTHING;
