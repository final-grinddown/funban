-- Grant necessary privileges
GRANT ALL PRIVILEGES ON *.* TO 'web' @'%';

FLUSH PRIVILEGES;

INSERT INTO
    users (color, name)
VALUES ('blue', 'Alice'),
    ('red', 'Bob'),
    ('green', 'Charlie'),
    ('yellow', 'David'),
    ('orange', 'Eve');