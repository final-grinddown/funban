-- Remove default password from users table
-- Users should now be created using the create_admin utility binary
-- This improves security by not having a default password in migrations

-- Remove the DEFAULT clause from the password column
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- Note: Existing users with the old default password will keep it
-- They should change their passwords after logging in
