-- Add migration script here
ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '$argon2i$v=19$m=16,t=2,p=1$YlpjRFNUd2E5SFVrY3dYVQ$Xvbh9z5v1IyHzupMbgNFMw';