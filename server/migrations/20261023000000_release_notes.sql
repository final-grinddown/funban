-- Free-form markdown notes on a release, editable while the release is open
ALTER TABLE releases ADD COLUMN notes TEXT NULL AFTER close_summary;
