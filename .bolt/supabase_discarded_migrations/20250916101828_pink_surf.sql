/*
  # Hellmann AU Sea Freight Calculator Database Schema

  1. New Tables
    - `ocean_freight_rates`
      - `id` (uuid, primary key)
      - `origin_port` (text, origin port code)
      - `destination_port` (text, destination port code)
      - `direction` (text, import/export)
      - `container_type` (text, 20GP/40GP/40HC/LCL)
      - `rate` (numeric, freight rate)
      - `currency` (char, ISO currency code)
      - `validity_start` (date, rate start date)
      - `validity_end` (date, rate end date)
      - `carrier` (text, optional carrier name)
      - `notes` (text, optional notes)
      - `created_at` (timestamp)

    - `local_charges`
      - `id` (uuid, primary key)
      - `port` (text, port code)
      - `direction` (text, import/export)
      - `charge_code` (text, charge code like THC, DOC)
      - `charge_name` (text, charge description)
      - `unit` (text, PER_SHIPMENT/PER_CONTAINER/PER_CBM)
      - `container_type` (text, optional container type filter)
      - `min_charge` (numeric, minimum charge amount)
      - `rate` (numeric, charge rate)
      - `currency` (char, ISO currency code)
      - `validity_start` (date, charge start date)
      - `validity_end` (date, charge end date)
      - `notes` (text, optional notes)
      - `created_at` (timestamp)

    - `transport_pricing`
      - `id` (uuid, primary key)
      - `pickup_location` (text, pickup location)
      - `delivery_location` (text, delivery location)
      - `direction` (text, import/export)
      - `container_type` (text, 20GP/40GP/40HC/LCL)
      - `unit` (text, PER_SHIPMENT/PER_CONTAINER)
      - `rate` (numeric, transport rate)
      - `currency` (char, ISO currency code)
      - `validity_start` (date, rate start date)
      - `validity_end` (date, rate end date)
      - `zone` (text, optional zone classification)
      - `notes` (text, optional notes)
      - `created_at` (timestamp)

  2. Security
    - RLS disabled for quick prototype
    - Indexes added for optimal query performance
</sql>

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ocean freight rates table
CREATE TABLE IF NOT EXISTS ocean_freight_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_port text NOT NULL,
  destination_port text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('import','export')),
  container_type text NOT NULL CHECK (container_type IN ('20GP','40GP','40HC','LCL')),
  rate numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'AUD',
  validity_start date NOT NULL,
  validity_end date NOT NULL,
  carrier text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ofr_lookup ON ocean_freight_rates (origin_port, destination_port, direction, container_type, validity_start, validity_end);

-- Local charges table
CREATE TABLE IF NOT EXISTS local_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  port text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('import','export')),
  charge_code text,
  charge_name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('PER_SHIPMENT','PER_CONTAINER','PER_CBM')),
  container_type text NULL CHECK (container_type IN ('20GP','40GP','40HC','LCL')),
  min_charge numeric(12,2) DEFAULT 0,
  rate numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'AUD',
  validity_start date NOT NULL,
  validity_end date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_lookup ON local_charges (port, direction, container_type, validity_start, validity_end);

-- Transport pricing table
CREATE TABLE IF NOT EXISTS transport_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_location text,
  delivery_location text,
  direction text NOT NULL CHECK (direction IN ('import','export')),
  container_type text NOT NULL CHECK (container_type IN ('20GP','40GP','40HC','LCL')),
  unit text NOT NULL CHECK (unit IN ('PER_SHIPMENT','PER_CONTAINER')),
  rate numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'AUD',
  validity_start date NOT NULL,
  validity_end date NOT NULL,
  zone text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_lookup ON transport_pricing (pickup_location, delivery_location, direction, container_type, validity_start, validity_end);

-- Sample data for demonstration
INSERT INTO ocean_freight_rates (origin_port, destination_port, direction, container_type, rate, currency, validity_start, validity_end, carrier) VALUES
('SYD', 'SIN', 'export', '20GP', 850.00, 'AUD', '2024-01-01', '2024-12-31', 'MSC'),
('SYD', 'SIN', 'export', '40GP', 1200.00, 'AUD', '2024-01-01', '2024-12-31', 'MSC'),
('SYD', 'SIN', 'export', '40HC', 1350.00, 'AUD', '2024-01-01', '2024-12-31', 'MSC'),
('MEL', 'LAX', 'export', '20GP', 1450.00, 'AUD', '2024-01-01', '2024-12-31', 'COSCO'),
('MEL', 'LAX', 'export', '40GP', 2100.00, 'AUD', '2024-01-01', '2024-12-31', 'COSCO');

INSERT INTO local_charges (port, direction, charge_code, charge_name, unit, container_type, min_charge, rate, currency, validity_start, validity_end) VALUES
('SYD', 'export', 'THC', 'Terminal Handling Charge', 'PER_CONTAINER', '20GP', 0, 285.00, 'AUD', '2024-01-01', '2024-12-31'),
('SYD', 'export', 'THC', 'Terminal Handling Charge', 'PER_CONTAINER', '40GP', 0, 385.00, 'AUD', '2024-01-01', '2024-12-31'),
('SYD', 'export', 'THC', 'Terminal Handling Charge', 'PER_CONTAINER', '40HC', 0, 385.00, 'AUD', '2024-01-01', '2024-12-31'),
('SYD', 'export', 'DOC', 'Documentation Fee', 'PER_SHIPMENT', NULL, 0, 125.00, 'AUD', '2024-01-01', '2024-12-31'),
('SYD', 'export', 'ISPS', 'ISPS Security Fee', 'PER_SHIPMENT', NULL, 0, 35.00, 'AUD', '2024-01-01', '2024-12-31');

INSERT INTO transport_pricing (pickup_location, delivery_location, direction, container_type, unit, rate, currency, validity_start, validity_end, zone) VALUES
('Sydney CBD', NULL, 'export', '20GP', 'PER_CONTAINER', 320.00, 'AUD', '2024-01-01', '2024-12-31', 'Metro'),
('Sydney CBD', NULL, 'export', '40GP', 'PER_CONTAINER', 420.00, 'AUD', '2024-01-01', '2024-12-31', 'Metro'),
('Sydney CBD', NULL, 'export', '40HC', 'PER_CONTAINER', 420.00, 'AUD', '2024-01-01', '2024-12-31', 'Metro'),
(NULL, 'Melbourne CBD', 'import', '20GP', 'PER_CONTAINER', 280.00, 'AUD', '2024-01-01', '2024-12-31', 'Metro'),
(NULL, 'Melbourne CBD', 'import', '40GP', 'PER_CONTAINER', 380.00, 'AUD', '2024-01-01', '2024-12-31', 'Metro');