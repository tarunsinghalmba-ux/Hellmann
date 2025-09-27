/*
  # Fix Super Admin RLS Policy for User Role Management

  This migration fixes the RLS policy issues that prevent Super Admin users from
  activating/deactivating users and updating roles.

  ## Changes
  1. Drop all existing Super Admin policies to avoid conflicts
  2. Create comprehensive policies for Super Admin operations
  3. Ensure proper policy conditions for all CRUD operations
*/

-- Drop existing Super Admin policies to avoid conflicts
DROP POLICY IF EXISTS "Super Admin can insert any user role" ON user_roles;
DROP POLICY IF EXISTS "Super Admin can update any user role" ON user_roles;

-- Create comprehensive Super Admin policy for all operations
CREATE POLICY "Super Admin full access to user roles"
  ON user_roles
  FOR ALL
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

-- Ensure the existing policies for regular users and signup remain intact
-- These should already exist but let's verify they're properly defined

-- Policy for users to read their own role (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Users can read own role'
  ) THEN
    CREATE POLICY "Users can read own role"
      ON user_roles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy for users to insert their own role (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Users can insert own role'
  ) THEN
    CREATE POLICY "Users can insert own role"
      ON user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy for signup process (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Allow user role creation during signup'
  ) THEN
    CREATE POLICY "Allow user role creation during signup"
      ON user_roles
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;