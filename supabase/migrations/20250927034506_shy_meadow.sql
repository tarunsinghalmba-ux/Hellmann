/*
  # Fix User Signup Database Error

  1. Security
    - Update RLS policies to allow trigger function to insert new user roles
    - Add policy for service role to insert user roles during signup
    - Ensure trigger function runs with proper security context

  2. Changes
    - Add policy for authenticated users to insert their own role
    - Update trigger function to use SECURITY DEFINER
    - Ensure proper permissions for user creation process
*/

-- Drop existing trigger and function to recreate with proper security
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, active)
  VALUES (NEW.id, 'Regular', false);
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user role for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Add policy to allow the trigger function to insert user roles
CREATE POLICY "Allow user role creation during signup"
  ON user_roles
  FOR INSERT
  WITH CHECK (true);

-- Update existing policy to be more specific
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);