/*
  # Add SELECT policy for transport table

  1. Security Changes
    - Add policy to allow SELECT access to transport table for all users
    - Transport pricing data is public read-only data, so we allow unauthenticated access
*/

CREATE POLICY "Allow public read access to transport"
  ON transport
  FOR SELECT
  TO anon, authenticated
  USING (true);
