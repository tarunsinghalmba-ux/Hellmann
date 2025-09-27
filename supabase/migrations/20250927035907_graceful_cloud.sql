/*
  # Delete user archie1877@gmail.com

  1. User Deletion
    - Delete from user_roles table (cascades due to foreign key)
    - Delete from auth.users table
    - Handle case where user might not exist

  2. Safety
    - Uses WHERE clause to target specific email
    - Logs the deletion for audit purposes
*/

-- Delete user role record first (though it should cascade)
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'archie1877@gmail.com'
);

-- Delete the user from auth.users
DELETE FROM auth.users 
WHERE email = 'archie1877@gmail.com';

-- Log the deletion (this will show in the migration output)
DO $$
BEGIN
  RAISE NOTICE 'User archie1877@gmail.com has been deleted from the system';
END $$;