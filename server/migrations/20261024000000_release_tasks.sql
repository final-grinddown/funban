-- Team-wide template of release steps, copied into each release when it is created
-- release_type NULL means the step applies to every release type
CREATE TABLE IF NOT EXISTS release_step_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_type VARCHAR(20) NULL,
    position INT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Per-release copy of the steps, ticked off by the person managing the release
CREATE TABLE IF NOT EXISTS release_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    release_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    done_at DATETIME NULL,
    INDEX idx_release_tasks_release (release_id, position),
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
