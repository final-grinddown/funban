-- Whether the team performs the deployment itself (TRUE) or only oversees it (FALSE); kept for statistics
ALTER TABLE releases ADD COLUMN deployed_by_us BOOLEAN NOT NULL DEFAULT TRUE AFTER release_at;

-- Steps are multiline markdown and carry a free-text hint of when to do them, e.g. "3 days before release"
ALTER TABLE release_step_templates
    MODIFY title TEXT NOT NULL,
    ADD COLUMN timing VARCHAR(100) NULL AFTER title;

ALTER TABLE release_tasks
    MODIFY title TEXT NOT NULL,
    ADD COLUMN timing VARCHAR(100) NULL AFTER title;
