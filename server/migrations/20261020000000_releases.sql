-- Releases: tracking of the release process (not tied to app versions)
CREATE TABLE IF NOT EXISTS releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    release_code VARCHAR(32) NOT NULL,
    release_type VARCHAR(20) NOT NULL,
    release_at DATETIME NOT NULL,
    assignee_id INT NULL,
    -- Snapshot of the assignee's name, kept so history survives when the user is deleted
    assignee_name VARCHAR(255) NOT NULL,
    -- Closed releases are read-only; reopening clears closed_at but keeps the summary
    closed_at DATETIME NULL,
    close_summary TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_release_code (release_code),
    INDEX idx_release_at (release_at),
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
