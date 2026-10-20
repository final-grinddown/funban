-- Add expires_at column to support date-based expiration alongside counter-based expiration
ALTER TABLE user_marks
ADD COLUMN expires_at DATETIME NULL AFTER expires_after_status_ends;
