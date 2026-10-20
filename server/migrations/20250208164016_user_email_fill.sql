UPDATE users 
SET email = CONCAT(LOWER(name), '@eurowag.cz')
WHERE email IS NULL OR email = '';