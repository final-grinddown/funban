-- Releases are often planned before anyone is assigned; NULL assignee_id + NULL assignee_name means unassigned
ALTER TABLE releases MODIFY assignee_name VARCHAR(255) NULL;
