-- Add migration script here
ALTER TABLE history ADD COLUMN version INT NOT NULL DEFAULT 1;
