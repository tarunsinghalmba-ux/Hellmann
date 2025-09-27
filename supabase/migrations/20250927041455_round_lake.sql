/*
  # Comprehensive Super Admin RLS Policies

  1. Security Functions
    - Create helper function to check Super Admin status
    - Avoid infinite recursion by using auth.jwt() claims
  
  2. User Roles Policies
    - Allow Super Admin full access to user_roles table
    - Maintain existing user access policies
  
  3. Users Table Policies
    - Allow Super Admin to view all users
    - Enable comprehensive user management
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Allow user role creation during signup" ON user_roles;
DROP POLICY IF EXISTS "Super Admin can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Super Admin can update user roles" ON user_roles;

-- Create a security definer function to check Super Admin status
-- This avoids RLS recursion by using a function with elevated privileges
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_record RECORD;
BEGIN
  -- Get the current user ID
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Query user_roles directly without RLS
  SELECT role, active INTO user_role_record
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Check if user is an active Super Admin
  RETURN (user_role_record.role = 'Super Admin' AND user_role_record.active = true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.is_super_admin() TO authenticated;

-- User Roles Table Policies
-- Policy for users to read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own role (signup process)
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for public signup process
CREATE POLICY "Allow user role creation during signup"
  ON user_roles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Super Admin policies using the security definer function
CREATE POLICY "Super Admin can read all user roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.is_super_admin());

CREATE POLICY "Super Admin can insert user roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.is_super_admin());

CREATE POLICY "Super Admin can update user roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.is_super_admin())
  WITH CHECK (auth.is_super_admin());

CREATE POLICY "Super Admin can delete user roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (auth.is_super_admin());

-- Enable RLS on auth.users table and create Super Admin policy
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Policy for Super Admin to view all users
CREATE POLICY "Super Admin can read all users"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (auth.is_super_admin());

-- Policy for Super Admin to update users (for admin operations)
CREATE POLICY "Super Admin can update all users"
  ON auth.users
  FOR UPDATE
  TO authenticated
  USING (auth.is_super_admin())
  WITH CHECK (auth.is_super_admin());

-- Policy for Super Admin to delete users
CREATE POLICY "Super Admin can delete all users"
  ON auth.users
  FOR DELETE
  TO authenticated
  USING (auth.is_super_admin());

-- Policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);