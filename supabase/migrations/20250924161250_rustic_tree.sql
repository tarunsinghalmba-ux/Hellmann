/*
  # Add transport_vendor column to transport table

  1. Changes
    - Add `transport_vendor` column to transport table with default value "Hellmann Transport"
    - Update all existing rows to have "Hellmann Transport" as the vendor
    - Set default value for future inserts

  2. Security
    - No RLS changes needed as this is just adding a column to existing table
*/

-- Add transport_vendor column with default value
ALTER TABLE transport 
ADD COLUMN IF NOT EXISTS transport_vendor text DEFAULT 'Hellmann Transport';

-- Update all existing rows to have the default value
UPDATE transport 
SET transport_vendor = 'Hellmann Transport' 
WHERE transport_vendor IS NULL;

-- Ensure the column has the default value for future inserts
ALTER TABLE transport 
ALTER COLUMN transport_vendor SET DEFAULT 'Hellmann Transport';