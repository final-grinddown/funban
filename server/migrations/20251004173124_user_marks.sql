-- Add migration script here
CREATE TABLE IF NOT EXISTS user_marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mark_type VARCHAR(50) NOT NULL,
    custom_text VARCHAR(255) NULL,
    expires_after_status_ends INT NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
