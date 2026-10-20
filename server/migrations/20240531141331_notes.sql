-- Add migration script here
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    owner INT NOT NULL,
    state VARCHAR(31) NOT NULL,
    `index` INT NOT NULL
);