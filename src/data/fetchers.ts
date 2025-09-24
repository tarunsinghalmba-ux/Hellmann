// src/data/fetchers.ts
import { TABLE_KEYS, selectWithFallback } from "../lib/tableMap";

export async function fetchOceanFreightRates(filters: {
  pol: string; pod: string; direction: "import" | "export"; from: string; to: string;
}) {
  const { pol, pod, direction, from, to } = filters;
  return selectWithFallback(TABLE_KEYS.ocean, (q) =>
    q
      .select("port_of_loading,port_of_discharge,direction,20gp,40gp_40hc,currency,effective_date,valid_until,carrier")
      .eq("port_of_loading", pol)
      .eq("port_of_discharge", pod)
      .eq("direction", direction)
      .lte("effective_date", to)
      .gte("valid_until", from)
      .limit(500)
  );
}

export async function fetchLocalCharges(filters: {
  port: string; direction: "import" | "export"; from: string; to: string;
}) {
  const { port, direction, from, to } = filters;
  return selectWithFallback(TABLE_KEYS.local, (q) =>
    q
      .select("*")
      .eq("port_of_loading", port)
      .eq("direction", direction)
      .lte("effective_date", to)
      .gte("valid_until", from)
      .limit(500)
  );
}

export async function fetchTransportPricing(filters: {
  point: string; direction: "import" | "export"; from: string; to: string;
}) {
  const { point, direction, from, to } = filters;
  return selectWithFallback(TABLE_KEYS.transport, (q) => {
    const base = q
      .select("*")
      .eq("direction", direction)
      .lte("effective_date", to)
      .gte("valid_until", from);
    return direction === "import"
      ? base.eq("delivery_location", point).limit(500)
      : base.eq("pick_up_location", point).limit(500);
  });
}