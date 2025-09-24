/*
  # Add primary key to ocean_freight table

  1. New Column
    - `record_id` (serial, primary key)
      - Auto-incrementing integer
      - Primary key constraint
      - Default sequence for unique IDs

  2. Changes
    - Adds record_id column to ocean_freight table
    - Creates sequence for auto-incrementing values
    - Sets as primary key for the table
*/

ALTER TABLE ocean_freight ADD COLUMN IF NOT EXISTS record_id SERIAL PRIMARY KEY;