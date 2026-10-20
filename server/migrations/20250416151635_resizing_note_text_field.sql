-- Add migration script here
ALTER TABLE `notes` 
  MODIFY COLUMN `text` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL;