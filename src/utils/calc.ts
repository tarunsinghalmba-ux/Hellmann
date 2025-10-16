import { supabase } from '../lib/supabase';
import { fetchOceanFreightRates as _fetchOceanFreightRates, fetchLocalCharges as _fetchLocalCharges, fetchTransportPricing as _fetchTransportPricing } from '../data/fetchers';
import type { CalculationInputs, CalculationResult, LineItem, OceanFreightRate, LocalCharge, TransportPricing } from '../types';

export async function calculateRates(inputs: CalculationInputs): Promise<CalculationResult[]> {
  const results: Map<string, CalculationResult> = new Map();

  // Initialize result structure for each currency
  const initCurrency = (currency: string): CalculationResult => ({
    currency,
    ocean: { items: [], subtotal: 0 },
    transport: { items: [], subtotal: 0 },
    local: { items: [], subtotal: 0 },
    grandTotal: 0
  });

  // Calculate Ocean Freight
  const oceanRates = await fetchOceanFreight(inputs);
  for (const rate of oceanRates) {
    if (!results.has(rate.currency)) {
      results.set(rate.currency, initCurrency(rate.currency));
    }
    
    const result = results.get(rate.currency)!;
    const quantity = getQuantityForContainer(inputs, rate.container_type);
    
    if (quantity > 0) {
      const total = rate.rate * quantity;
      const item: LineItem = {
        id: rate.id,
        description: `Ocean Freight - ${rate.origin_port} to ${rate.destination_port}`,
        unit: rate.container_type,
        quantity,
        rate: rate.rate,
        total,
        currency: rate.currency,
        containerType: rate.container_type,
        notes: rate.carrier ? `Carrier: ${rate.carrier}` : undefined
      };
      
      result.ocean.items.push(item);
      result.ocean.subtotal += total;
    }
  }

  // Calculate Transport
  const transportRates = await fetchTransport(inputs);
  for (const rate of transportRates) {
    if (!results.has(rate.currency)) {
      results.set(rate.currency, initCurrency(rate.currency));
    }
    
    const result = results.get(rate.currency)!;
    let quantity = 1;
    
    if (rate.unit === 'PER_CONTAINER') {
      quantity = inputs.qty20 + inputs.qty40 + inputs.qty40HC;
      if (inputs.lclCbm > 0) quantity += 1; // LCL counts as 1 container
    }
    
    if (quantity > 0) {
      const total = rate.rate * quantity;
      const locationDesc = inputs.direction === 'import' 
        ? `To ${rate.delivery_location || inputs.point}`
        : `From ${rate.pickup_location || inputs.point}`;
      
      const item: LineItem = {
        id: rate.id,
        description: `Transport - ${locationDesc}`,
        unit: rate.unit,
        quantity,
        rate: rate.rate,
        total,
        currency: rate.currency,
        containerType: rate.container_type,
        notes: rate.zone ? `Zone: ${rate.zone}` : undefined
      };
      
      result.transport.items.push(item);
      result.transport.subtotal += total;
    }
  }

  // Calculate Local Charges
  const localCharges = await fetchLocalCharges(inputs);
  for (const charge of localCharges) {
    // Skip "If Applicable" charges if the checkbox is not checked
    if ((charge as any).mandatory_or_if_applicable === 'If Applicable' && !inputs.showIfApplicable) {
      continue;
    }

    if (!results.has(charge.currency)) {
      results.set(charge.currency, initCurrency(charge.currency));
    }

    const result = results.get(charge.currency)!;
    let quantity = 1;
    let total = 0;
    
    switch (charge.unit) {
      case 'PER_SHIPMENT':
        total = charge.rate;
        break;
      case 'PER_CONTAINER':
        if (charge.container_type) {
          quantity = getQuantityForContainer(inputs, charge.container_type);
        } else {
          quantity = inputs.qty20 + inputs.qty40 + inputs.qty40HC;
        }
        total = charge.rate * quantity;
        break;
      case 'PER_CBM':
        quantity = inputs.lclCbm;
        total = charge.rate * quantity;
        break;
    }
    
    // Apply minimum charge
    if (charge.min_charge && total < charge.min_charge) {
      total = charge.min_charge;
    }
    
    if (total > 0) {
      const item: LineItem = {
        id: charge.id,
        description: charge.charge_name,
        unit: charge.unit,
        quantity,
        rate: charge.rate,
        total,
        currency: charge.currency,
        containerType: charge.container_type || undefined,
        notes: charge.charge_code ? `Code: ${charge.charge_code}` : undefined
      };
      
      result.local.items.push(item);
      result.local.subtotal += total;
    }
  }

  // Calculate grand totals
  for (const result of results.values()) {
    result.grandTotal = result.ocean.subtotal + result.transport.subtotal + result.local.subtotal;
  }

  return Array.from(results.values());
}

function getQuantityForContainer(inputs: CalculationInputs, containerType: string): number {
  switch (containerType) {
    case '20GP': return inputs.qty20;
    case '40GP': return inputs.qty40;
    case '40HC': return inputs.qty40HC;
    case 'LCL': return inputs.lclCbm > 0 ? 1 : 0;
    default: return 0;
  }
}

async function fetchOceanFreight(inputs: CalculationInputs): Promise<OceanFreightRate[]> {
  try {
    const { data } = await _fetchOceanFreightRates({
      pol: inputs.pol,
      pod: inputs.pod,
      direction: inputs.direction,
      from: inputs.validityFrom,
      to: inputs.validityTo
    });
    return data;
  } catch (error: any) {
    const msg = error?.message || error?.error_description || "Unknown error";
    console.error('Ocean Freight load failed:', msg);
    return [];
  }
}

async function fetchTransport(inputs: CalculationInputs): Promise<TransportPricing[]> {
  try {
    const { data } = await _fetchTransportPricing({
      point: inputs.point,
      direction: inputs.direction,
      from: inputs.validityFrom,
      to: inputs.validityTo
    });
    return data;
  } catch (error: any) {
    const msg = error?.message || error?.error_description || "Unknown error";
    console.error('Transport load failed:', msg);
    return [];
  }
}

async function fetchLocalCharges(inputs: CalculationInputs): Promise<LocalCharge[]> {
  try {
    const port = inputs.direction === 'import' ? inputs.pod : inputs.pol;
    const { data } = await _fetchLocalCharges({
      port,
      direction: inputs.direction,
      from: inputs.validityFrom,
      to: inputs.validityTo
    });
    return data;
  } catch (error: any) {
    const msg = error?.message || error?.error_description || "Unknown error";
    console.error('Local Charges load failed:', msg);
    return [];
  }
}