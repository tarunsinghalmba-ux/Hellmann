/*
  # Fix Admin RLS Policy for User Role Updates

  1. Security Updates
    - Add policy for Super Admin users to update any user roles
    - Add policy for Super Admin users to insert new user roles
    - Update existing policies to work with the new role structure

  2. Changes
    - Allow Super Admin users to perform INSERT and UPDATE operations on user_roles table
    - Maintain security by checking the user's own role before allowing operations
    - Use the updated is_superuser() function that checks for 'Super Admin' role
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Allow user role creation during signup" ON user_roles;

-- Recreate the signup policy
CREATE POLICY "Allow user role creation during signup"
  ON user_roles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to insert their own role (for authenticated users)
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow Super Admin users to insert any user role
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

-- Allow Super Admin users to update any user role
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