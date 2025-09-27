/*
  # Add SuperUser Role System

  1. Updates
    - Add SuperUser role support
    - Create policies for SuperUsers to manage other users
    - Add function to check if user is SuperUser

  2. Security
    - SuperUsers can read and update all user roles
    - Regular users can only read their own role
    - Only SuperUsers can activate/deactivate users
*/

-- Add function to check if current user is SuperUser
CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'SuperUser' 
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;

-- Allow users to read their own role, SuperUsers can read all
CREATE POLICY "Users can read roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR is_superuser()
  );

-- Allow SuperUsers to update any user role, regular users cannot update
CREATE POLICY "SuperUsers can update roles" ON user_roles
  FOR UPDATE
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Allow SuperUsers to insert roles for any user
CREATE POLICY "SuperUsers can insert roles" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superuser() OR auth.uid() = user_id);

-- Create a view for SuperUsers to manage users
CREATE OR REPLACE VIEW user_management AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  ur.role,
  ur.active,
  ur.created_at as role_created_at,
  ur.updated_at as role_updated_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- Grant access to the view for SuperUsers
GRANT SELECT ON user_management TO authenticated;

-- Create RLS policy for the view
ALTER VIEW user_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperUsers can view user management" ON user_management
  FOR SELECT
  TO authenticated
  USING (is_superuser());