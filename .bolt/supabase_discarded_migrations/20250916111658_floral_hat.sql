-- Create normalized view from public.ocean_freight that unpivots rate columns into rows
-- This allows the app to query ocean_freight_rates while using the actual column structure

create or replace view public.ocean_freight_rates as
select
  of.pick_up_location as id,
  of.port_of_loading as origin_port,
  of.port_of_discharge as destination_port,
  of.direction,
  '20GP'::text as container_type,
  case 
    when of."20gp" ~ '^[0-9]+\.?[0-9]*$' then of."20gp"::numeric
    else null
  end as rate,
  coalesce(of.currency, 'USD')::text as currency,
  of.effective_date as validity_start,
  of.valid_until as validity_end,
  of.carrier,
  of.terms_and_conditions as notes,
  now() as created_at
from public.transport_pricing of
where of."20gp" is not null 
  and of."20gp" ~ '^[0-9]+\.?[0-9]*$'
  and of."20gp"::numeric > 0

union all

select
  of.pick_up_location as id,
  of.port_of_loading as origin_port,
  of.port_of_discharge as destination_port,
  of.direction,
  '40GP'::text as container_type,
  case 
    when of."40gp_40hc" ~ '^[0-9]+\.?[0-9]*$' then of."40gp_40hc"::numeric
    else null
  end as rate,
  coalesce(of.currency, 'USD')::text as currency,
  of.effective_date as validity_start,
  of.valid_until as validity_end,
  of.carrier,
  of.terms_and_conditions as notes,
  now() as created_at
from public.transport_pricing of
where of."40gp_40hc" is not null 
  and of."40gp_40hc" ~ '^[0-9]+\.?[0-9]*$'
  and of."40gp_40hc"::numeric > 0

union all

select
  of.pick_up_location as id,
  of.port_of_loading as origin_port,
  of.port_of_discharge as destination_port,
  of.direction,
  '40HC'::text as container_type,
  case 
    when of."40gp_40hc" ~ '^[0-9]+\.?[0-9]*$' then of."40gp_40hc"::numeric
    else null
  end as rate,
  coalesce(of.currency, 'USD')::text as currency,
  of.effective_date as validity_start,
  of.valid_until as validity_end,
  of.carrier,
  of.terms_and_conditions as notes,
  now() as created_at
from public.transport_pricing of
where of."40gp_40hc" is not null 
  and of."40gp_40hc" ~ '^[0-9]+\.?[0-9]*$'
  and of."40gp_40hc"::numeric > 0;

-- Grant permissions
grant select on public.ocean_freight_rates to anon, authenticated;

-- Force PostgREST schema reload so REST endpoints appear immediately
notify pgrst, 'reload schema';