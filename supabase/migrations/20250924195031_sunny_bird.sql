/*
  # Add primary key to transport table

  1. New Changes
    - Add `record_id` column as primary key to `transport` table
    - Create sequence for auto-incrementing record_id
    - Set default value using the sequence

  2. Security
    - No RLS changes needed as this is just adding a primary key
*/

-- Add record_id column with auto-incrementing sequence
ALTER TABLE transport ADD COLUMN record_id SERIAL PRIMARY KEY;