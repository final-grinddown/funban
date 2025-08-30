ALTER TABLE `users` 
  ADD COLUMN `index` INT NOT NULL DEFAULT 0 AFTER `id`;

UPDATE `users` SET `index` = id;