-- A step can apply to several release types, stored as a comma-separated list, e.g. "application,maintenance"
-- NULL means the step applies to every release type; existing single values stay valid one-item lists
ALTER TABLE release_step_templates CHANGE release_type release_types VARCHAR(100) NULL;
