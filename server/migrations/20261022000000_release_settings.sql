-- Team-wide settings for release notifications; a single row with id = 1
-- Recipient lists are stored as comma-separated email addresses
CREATE TABLE IF NOT EXISTS release_settings (
    id TINYINT PRIMARY KEY,
    notification_to TEXT NOT NULL,
    notification_cc TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO release_settings (id, notification_to, notification_cc)
VALUES (1, 'dl-reamontax-all@eurowag.com', 'marcel.haspl@eurowag.com');
