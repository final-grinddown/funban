-- Add migration script here
ALTER TABLE notes ADD COLUMN change_set VARCHAR(64) NULL;