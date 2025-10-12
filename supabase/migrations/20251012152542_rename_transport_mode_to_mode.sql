/*
  # Rename transport_mode column to mode

  1. Changes
    - Rename column `transport_mode` to `mode` in the `transport` table
  
  2. Notes
    - This migration uses IF EXISTS checks to ensure it's safe to run multiple times
    - No data is lost during the column rename operation
*/

-- Rename transport_mode to mode if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transport' AND column_name = 'transport_mode'
  ) THEN
    ALTER TABLE transport RENAME COLUMN transport_mode TO mode;
  END IF;
END $$;