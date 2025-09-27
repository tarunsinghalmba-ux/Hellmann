/*
  # Fix Infinite Recursion in User Roles RLS Policy

  1. Problem
    - The current Super Admin policy creates infinite recursion by checking user_roles table within the policy itself
    - This causes a circular reference when evaluating permissions

  2. Solution
    - Remove the recursive Super Admin policy that references user_roles table
    - Keep only simple, non-recursive policies
    - Use direct auth.uid() comparisons without subqueries to user_roles

  3. Security
    - Users can still read and manage their own roles
    - Signup process remains functional
    - Remove problematic Super Admin policies temporarily to fix recursion
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Allow user role creation during signup" ON user_roles;
DROP POLICY IF EXISTS "Super Admin full access to user roles" ON user_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user role creation during signup"
  ON user_roles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Note: Super Admin functionality will need to be handled differently
-- to avoid infinite recursion. Consider using service role or 
-- a different approach for admin operations.