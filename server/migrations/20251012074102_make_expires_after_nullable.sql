-- Make expires_after_status_ends nullable to support permanent marks
-- NULL counter means the mark doesn't expire by standup count
ALTER TABLE user_marks
MODIFY COLUMN expires_after_status_ends INT NULL;
