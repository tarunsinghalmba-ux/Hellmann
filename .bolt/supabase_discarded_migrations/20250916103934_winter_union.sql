-- Create views so the app's expected REST paths exist even if base tables are named differently
create or replace view public.ocean_freight_rates as
select
  -- Adjust/alias columns here to match the app's schema
  id,
  pick_up_location as origin_port,
  port_of_loading as origin_port,
  port_of_discharge as destination_port,
  direction,
  '20GP' as container_type, -- Default container type, adjust based on your data
  COALESCE(
    CASE 
      WHEN "20gp" ~ '^[0-9]+\.?[0-9]*$' THEN "20gp"::numeric
      ELSE NULL
    END,
    0
  ) as rate,
  currency,
  effective_date as validity_start,
  valid_until as validity_end,
  '' as carrier,
  terms_and_conditions as notes,
  now() as created_at
from public.transport_pricing
where "20gp" is not null and "20gp" != ''

UNION ALL

select
  gen_random_uuid() as id,
  port_of_loading as origin_port,
  port_of_discharge as destination_port,
  direction,
  '40GP' as container_type,
  COALESCE(
    CASE 
      WHEN "40gp_40hc" ~ '^[0-9]+\.?[0-9]*$' THEN "40gp_40hc"::numeric
      ELSE NULL
    END,
    0
  ) as rate,
  currency,
  effective_date as validity_start,
  valid_until as validity_end,
  '' as carrier,
  terms_and_conditions as notes,
  now() as created_at
from public.transport_pricing
where "40gp_40hc" is not null and "40gp_40hc" != '';

create or replace view public.local_charges as
select
  gen_random_uuid() as id,
  COALESCE(port_of_loading, port_of_discharge, destination) as port,
  direction,
  cw1_charge_code as charge_code,
  charge_description as charge_name,
  CASE 
    WHEN basis = 'per shipment' THEN 'PER_SHIPMENT'
    WHEN basis = 'per container' THEN 'PER_CONTAINER'
    WHEN basis = 'per cbm' THEN 'PER_CBM'
    ELSE 'PER_SHIPMENT'
  END as unit,
  CASE 
    WHEN "20gp" is not null THEN '20GP'
    WHEN "40gp_40hc" is not null THEN '40GP'
    ELSE NULL
  END as container_type,
  0 as min_charge,
  COALESCE(
    CASE 
      WHEN "20gp" ~ '^[0-9]+\.?[0-9]*$' THEN "20gp"::numeric
      WHEN "40gp_40hc" ~ '^[0-9]+\.?[0-9]*$' THEN "40gp_40hc"::numeric
      WHEN per_shipment_charge is not null THEN per_shipment_charge
      ELSE 0
    END,
    0
  ) as rate,
  currency,
  effective_date as validity_start,
  valid_until as validity_end,
  terms_and_conditions as notes,
  now() as created_at
from public.local_charges
where charge_description is not null;

create or replace view public.transport_pricing as
select
  gen_random_uuid() as id,
  pick_up_location as pickup_location,
  delivery_location,
  direction,
  CASE 
    WHEN "20gp" is not null and "20gp" != '' THEN '20GP'
    WHEN "40gp_40hc" is not null and "40gp_40hc" != '' THEN '40GP'
    ELSE '20GP'
  END as container_type,
  'PER_CONTAINER' as unit,
  COALESCE(
    CASE 
      WHEN "20gp" ~ '^[0-9]+\.?[0-9]*$' THEN "20gp"::numeric
      WHEN "40gp_40hc" ~ '^[0-9]+\.?[0-9]*$' THEN "40gp_40hc"::numeric
      ELSE 0
    END,
    0
  ) as rate,
  currency,
  effective_date as validity_start,
  valid_until as validity_end,
  '' as zone,
  terms_and_conditions as notes,
  now() as created_at
from public.transport_pricing
where (
  ("20gp" is not null and "20gp" != '') or 
  ("40gp_40hc" is not null and "40gp_40hc" != '')
);

-- Force PostgREST to reload the schema so /rest/v1/* sees the new views immediately
notify pgrst, 'reload schema';