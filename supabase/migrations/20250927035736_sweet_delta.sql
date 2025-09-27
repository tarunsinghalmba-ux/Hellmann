/*
  # Fix Super Admin User Role Update Policy

  1. Policy Updates
    - Drop and recreate Super Admin policies with correct conditions
    - Ensure Super Admin can update any user's role and active status
    - Fix the policy logic to properly check Super Admin status

  2. Security
    - Maintain RLS protection for regular users
    - Allow Super Admin full user management capabilities
*/

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Super Admin can insert any user role" ON user_roles;
DROP POLICY IF EXISTS "Super Admin can update any user role" ON user_roles;

-- Create policy for Super Admin to insert user roles
CREATE POLICY "Super Admin can insert any user role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'Super Admin'
      AND ur.active = true
    )
  );

-- Create policy for Super Admin to update user roles
CREATE POLICY "Super Admin can update any user role"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'Super Admin'
      AND ur.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'Super Admin'
      AND ur.active = true
    )
  );

-- Ensure the policies are properly ordered (most specific first)
-- The existing policies should remain:
-- - "Allow user role creation during signup" (for public signup)
-- - "Users can insert own role" (for authenticated users managing their own role)
-- - "Users can read own role" (for users reading their own role)