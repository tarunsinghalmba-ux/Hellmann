/*
  # Add primary key to local table

  1. Changes
    - Add `record_id` column as primary key with auto-increment sequence
    - Use SERIAL type for automatic sequence generation
    - Set as primary key constraint

  2. Notes
    - SERIAL automatically creates a sequence and sets default values
    - Primary key ensures unique identification for each record
    - Existing data will get sequential IDs starting from 1
*/

-- Add record_id column as primary key with auto-increment
ALTER TABLE local ADD COLUMN IF NOT EXISTS record_id SERIAL PRIMARY KEY;