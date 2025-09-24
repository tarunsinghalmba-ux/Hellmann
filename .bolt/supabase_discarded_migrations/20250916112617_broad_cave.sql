@@ .. @@
 create or replace view public.ocean_freight_rates as
 select
   of.id,
-  of.origin_port,
-  of.destination_port,
+  of.port_of_loading as origin_port,
+  of.port_of_discharge as destination_port,
   of.direction,
   '20GP'::text as container_type,
-  of."20GP"::numeric as rate,
+  of."20gp"::numeric as rate,
   coalesce(of.currency, 'USD')::text as currency,
-  of.validity_start,
-  of.validity_end,
+  of.effective_date as validity_start,
+  of.valid_until as validity_end,
   of.carrier,
   of.notes,
   of.created_at
 from public.ocean_freight of
-where of."20GP" is not null
+where of."20gp" is not null and of."20gp" != '0'

 union all

 select
   of.id,
-  of.origin_port,
-  of.destination_port,
+  of.port_of_loading as origin_port,
+  of.port_of_discharge as destination_port,
   of.direction,
   '40GP'::text as container_type,
   of."40gp_40hc"::numeric as rate,
   coalesce(of.currency, 'USD')::text as currency,
-  of.validity_start,
-  of.validity_end,
+  of.effective_date as validity_start,
+  of.valid_until as validity_end,
   of.carrier,
   of.notes,
   of.created_at
 from public.ocean_freight of
-where of."40gp_40hc" is not null
+where of."40gp_40hc" is not null and of."40gp_40hc" != '0'

 union all

 select
   of.id,
-  of.origin_port,
-  of.destination_port,
+  of.port_of_loading as origin_port,
+  of.port_of_discharge as destination_port,
   of.direction,
   '40HC'::text as container_type,
   of."40gp_40hc"::numeric as rate,
   coalesce(of.currency, 'USD')::text as currency,
-  of.validity_start,
-  of.validity_end,
+  of.effective_date as validity_start,
+  of.valid_until as validity_end,
   of.carrier,
   of.notes,
   of.created_at
 from public.ocean_freight of
-where of."40gp_40hc" is not null;
+where of."40gp_40hc" is not null and of."40gp_40hc" != '0'
+
+union all
+
+select
+  of.id,
+  of.port_of_loading as origin_port,
+  of.port_of_discharge as destination_port,
+  of.direction,
+  'LCL'::text as container_type,
+  of.cubic_rate::numeric as rate,
+  coalesce(of.currency, 'USD')::text as currency,
+  of.effective_date as validity_start,
+  of.valid_until as validity_end,
+  of.carrier,
+  of.notes,
+  of.created_at
+from public.ocean_freight of
+where of.cubic_rate is not null and of.cubic_rate != 0;