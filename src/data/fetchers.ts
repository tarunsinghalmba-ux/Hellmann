// src/data/fetchers.ts
import { TABLE_KEYS, selectWithFallback } from "../lib/tableMap";

export async function fetchOceanFreightRates(filters: {
  pol: string;
  pod: string;
  direction: "import" | "export";
  from: string;
  to: string;
  carrier?: string;
  serviceType?: string;
  mode?: string;
}) {
  const { pol, pod, direction, from, to, carrier, serviceType, mode } = filters;
  return selectWithFallback(TABLE_KEYS.ocean, (q) => {
    let query = q
      .select("port_of_loading,port_of_discharge,direction,20gp,40gp_40hc,currency,effective_date,valid_until,carrier,service_type,mode")
      .eq("port_of_loading", pol)
      .eq("port_of_discharge", pod)
      .eq("direction", direction)
      .lte("effective_date", to)
      .gte("valid_until", from);

    if (carrier) {
      query = query.eq("carrier", carrier);
    }

    if (serviceType) {
      query = query.eq("service_type", serviceType);
    }

    if (mode) {
      query = query.eq("mode", mode);
    }

    return query.limit(10000);
  });
}

export async function fetchLocalCharges(filters: {
  port: string;
  direction: "import" | "export";
  from: string;
  to: string;
  mode?: string;
  serviceProvider?: string;
}) {
  const { port, direction, from, to, mode, serviceProvider } = filters;
  return selectWithFallback(TABLE_KEYS.local, (q) => {
    let query = q
      .select("*")
      .eq("port_of_discharge", port)
      .eq("direction", direction)
      .lte("effective_date", to)
      .gte("valid_until", from);

    if (mode) {
      query = query.eq("mode", mode);
    }

    if (serviceProvider) {
      query = query.eq("service_provider", serviceProvider);
    }

    return query.limit(10000);
  });
}

export async function fetchTransportPricing(filters: {
  point: string;
  direction: "import" | "export";
  from: string;
  to: string;
  vehicleType?: string;
  transportVendor?: string;
  mode?: string;
}) {
  const { point, direction, from, to, vehicleType, transportVendor, mode } = filters;
  return selectWithFallback(TABLE_KEYS.transport, (q) => {
    let query = q
      .select("*")
      .eq("direction", direction)
      .lte("effective_date", to)
      .gte("valid_until", from);

    // Apply location filter
    if (direction === "import") {
      query = query.ilike("delivery_location", `%${point}%`);
    } else {
      query = query.ilike("pick_up_location", `%${point}%`);
    }

    if (vehicleType) {
      query = query.ilike("vehicle_type", vehicleType);
    }

    if (transportVendor) {
      query = query.ilike("transport_vendor", transportVendor);
    }

    if (mode) {
      query = query.ilike("mode", mode);
    }

    return query.limit(10000);
  });
}