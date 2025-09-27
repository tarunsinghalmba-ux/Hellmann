/*
  # Fix Super Admin RLS Policies for User Management

  1. Security Updates
    - Add proper INSERT policy for Super Admin users
    - Add proper UPDATE policy for Super Admin users
    - Ensure policies don't cause infinite recursion
    - Maintain existing user self-management policies

  2. Policy Logic
    - Super Admin users can insert new user roles
    - Super Admin users can update any user roles
    - Regular users can still manage their own roles
    - Signup process remains functional
*/

-- Drop any existing Super Admin policies to avoid conflicts
DROP POLICY IF EXISTS "Super Admin can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Super Admin can update user roles" ON user_roles;

-- Create INSERT policy for Super Admin users
CREATE POLICY "Super Admin can insert user roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'Super Admin' 
        AND ur.active = true
    )
  );

-- Create UPDATE policy for Super Admin users
CREATE POLICY "Super Admin can update user roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'Super Admin' 
        AND ur.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'Super Admin' 
        AND ur.active = true
    )
  );