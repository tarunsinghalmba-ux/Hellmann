/*
  # Update Raghav's Role to Super Admin

  1. Changes
    - Update raghav.kapoor@hellman.com role from Regular to Super Admin
    - Activate the account if not already active
    - Set updated timestamp

  2. Security
    - Direct update to user_roles table
    - Uses email lookup from auth.users
*/

-- Update raghav.kapoor@hellman.com to Super Admin role
UPDATE user_roles 
SET 
  role = 'Super Admin',
  active = true,
  updated_at = now()
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'raghav.kapoor@hellman.com'
);

-- If the user doesn't have a role record yet, insert one
INSERT INTO user_roles (user_id, role, active, created_at, updated_at)
SELECT 
  id,
  'Super Admin',
  true,
  now(),
  now()
FROM auth.users 
WHERE email = 'raghav.kapoor@hellman.com'
  AND id NOT IN (SELECT user_id FROM user_roles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'Super Admin',
  active = true,
  updated_at = now();