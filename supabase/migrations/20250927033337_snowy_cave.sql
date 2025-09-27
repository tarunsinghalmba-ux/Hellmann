/*
  # Add active status to user roles

  1. Changes
    - Add `active` boolean column to user_roles table
    - Set default value to false (deactivated)
    - Update trigger function to set new users as deactivated
    - Add policy for reading active status

  2. Security
    - Users can read their own active status
    - Only authenticated users can access their role data
*/

-- Add active column to user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'active'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN active boolean DEFAULT false;
  END IF;
END $$;

-- Update existing users to be deactivated by default
UPDATE user_roles SET active = false WHERE active IS NULL;

-- Update the trigger function to set new users as deactivated
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, active)
  VALUES (NEW.id, 'Regular User', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the policy to include active status
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);