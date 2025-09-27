/*
  # Create Role Master Table

  1. New Tables
    - `role_master`
      - `id` (uuid, primary key)
      - `role_name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)

  2. Initial Data
    - Insert "Regular" and "Super Admin" roles

  3. Security
    - Enable RLS on `role_master` table
    - Add policy for authenticated users to read roles

  4. Updates
    - Update existing user roles to use new standardized names
    - Add foreign key constraint to user_roles table
*/

-- Create role_master table
CREATE TABLE IF NOT EXISTS role_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE role_master ENABLE ROW LEVEL SECURITY;

-- Create policy for reading roles
CREATE POLICY "Anyone can read roles"
  ON role_master
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial roles
INSERT INTO role_master (role_name, description) VALUES
  ('Regular', 'Standard user with basic access to the application'),
  ('Super Admin', 'Administrator with full access to user management and system settings')
ON CONFLICT (role_name) DO NOTHING;

-- Update existing user roles to use standardized names
UPDATE user_roles 
SET role = 'Regular' 
WHERE role = 'Regular User';

UPDATE user_roles 
SET role = 'Super Admin' 
WHERE role = 'SuperUser';

-- Add foreign key constraint to user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_role_fkey'
  ) THEN
    ALTER TABLE user_roles 
    ADD CONSTRAINT user_roles_role_fkey 
    FOREIGN KEY (role) REFERENCES role_master(role_name);
  END IF;
END $$;

-- Update the is_superuser function to use new role name
CREATE OR REPLACE FUNCTION is_superuser()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'Super Admin' 
    AND active = true
  );
$$;

-- Update user_management view if it exists
DROP VIEW IF EXISTS user_management;
CREATE VIEW user_management AS
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

-- Update trigger function to use new default role
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_roles (user_id, role, active)
  VALUES (NEW.id, 'Regular', false);
  RETURN NEW;
END;
$$;