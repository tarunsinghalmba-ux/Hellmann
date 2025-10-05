import { supabase } from '../lib/supabase';
import { selectWithFallback, TABLE_KEYS } from '../lib/tableMap';
import type { Direction, Equipment, OceanRow, LocalRow, TransportRow } from '../types';

export interface CalcInput {
  direction: Direction;
  pol: string | string[]; // Port of Loading (supports multi-select)
  pod: string | string[]; // Port of Discharge (supports multi-select)
  suburb: string; // Delivery point for import, Pickup point for export
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  qty20: number;        // 20GP container quantity
  qty40: number;        // 40GP container quantity
  qty40HC: number;      // 40HC container quantity
  lclCbm?: number;      // only when equipment = 'LCL'
  mode?: string;        // transportation mode filter
  vehicleType?: string; // vehicle type filter
  carrier?: string;    // carrier filter
  transitTime?: string; // transit time filter
  transportVendor?: string; // transport vendor filter
  dangerousGoods?: boolean; // dangerous goods filter
  dropTrailer?: boolean; // drop trailer filter
  heavyWeightSurcharge?: boolean; // heavy weight surcharge filter
  viaTailgate?: boolean; // via tailgate filter
  sideLoaderAccessFees?: boolean; // side loader access fees filter
  unpackPalletized?: boolean; // unpack palletized filter
  fumigationSurcharge?: boolean; // fumigation surcharge filter
  serviceType?: string; // service type filter
  sideloaderSamedayCollection?: boolean; // sideloader sameday collection filter
  unpackLoose?: boolean; // unpack loose filter
}

export interface LineItem { 
  label: string; 
  unit?: string; 
  qty: number; 
  rate: number; 
  total: number; 
  extra?: string; 
}

export interface Section { 
  currency: string; 
  title: string; 
  subtitle?: string; 
  items: LineItem[]; 
  subtotal: number; 
}

export interface CalcResult { 
  oceanUSD: Section; 
  localsAUD: Section; 
  deliveryAUD: Section; 
  validityPeriod: {
    from: string;
    to: string;
  };
  sqlQueries: string[];
}

const nf = (currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 });

function subTotal(items: LineItem[]) { return items.reduce((s, r) => s + r.total, 0); }

export async function calculateThreeParts(input: CalcInput): Promise<CalcResult> {
  const { direction, pol, pod, suburb, fromDate, toDate, qty20, qty40, qty40HC, lclCbm = 0 } = input;
  const queries: string[] = [];
  const polArray = Array.isArray(pol) ? pol : [pol];
  const podArray = Array.isArray(pod) ? pod : [pod];
  const polDisplay = polArray.join(', ');
  const podDisplay = podArray.join(', ');

  console.log('=== CALCULATION INPUT ===');
  console.log('Direction:', direction);
  console.log('POL:', polDisplay);
  console.log('POD:', podDisplay);
  console.log('Suburb:', suburb);
  console.log('Date Range:', fromDate, 'to', toDate);
  console.log('20GP Quantity:', qty20);
  console.log('40GP Quantity:', qty40);
  console.log('40HC Quantity:', qty40HC);
  console.log('LCL CBM:', lclCbm);
  console.log('Mode:', input.mode);
  console.log('Transit Time:', input.transitTime);
  console.log('Vehicle Type:', input.vehicleType);
  console.log('========================');
  // 1) OCEAN USD
  let oceanItems: LineItem[] = [];
  try {
    const modeFilter = input.mode ? ` AND UPPER("mode") = UPPER('${input.mode}')` : '';
    const carrierFilter = input.carrier ? ` AND UPPER("carrier") = UPPER('${input.carrier}')` : '';
    const transitTimeFilter = (input.transitTime && parseInt(input.transitTime) > 0) ? ` AND "transit_time" = ${parseInt(input.transitTime)}` : '';
    const serviceTypeFilter = input.serviceType ? ` AND UPPER("service_type") = UPPER('${input.serviceType}')` : '';
    const dangerousGoodsFilter = input.dangerousGoods === true ? ` AND "dg" = 'Yes'` : input.dangerousGoods === false ? ` AND "dg" = 'No'` : '';
    const polFilter = polArray.length > 1
      ? ` AND UPPER("port_of_loading") IN (${polArray.map(p => `UPPER('${p}')`).join(',')})`
      : ` AND UPPER("port_of_loading") = UPPER('${polArray[0]}')`;
    const podFilter = podArray.length > 1
      ? ` AND UPPER("port_of_discharge") IN (${podArray.map(p => `UPPER('${p}')`).join(',')})`
      : ` AND UPPER("port_of_discharge") = UPPER('${podArray[0]}')`;
    const oceanQuery = `SELECT "port_of_loading","port_of_discharge","direction","20gp","40gp_40hc","currency","mode","carrier","transit_time","service_type","dg","effective_date","valid_until" FROM "ocean_freight" WHERE ${polFilter}${podFilter} AND UPPER("direction") = UPPER('${direction}') AND UPPER("currency") = UPPER('USD') AND "effective_date" <= '${toDate}' AND "valid_until" >= '${fromDate}'${modeFilter}${carrierFilter}${transitTimeFilter}${serviceTypeFilter}${dangerousGoodsFilter} LIMIT 200`;
    queries.push(oceanQuery);

    console.log('=== OCEAN FREIGHT QUERY ===');
    console.log('SQL:', oceanQuery);

    const { data: ocean } = await selectWithFallback(TABLE_KEYS.ocean, (q) => {
      let query = q.select('port_of_loading,port_of_discharge,direction,20gp,40gp_40hc,currency,mode,carrier,transit_time,service_type')
        .in('port_of_loading', polArray)
        .in('port_of_discharge', podArray)
        .ilike('direction', direction)
        .eq('currency', 'USD')
        .lte('effective_date', toDate)
        .gte('valid_until', fromDate)
        .limit(200);
      
      if (input.mode) {
        query = query.ilike('mode', input.mode);
      }
      
      if (input.carrier) {
        query = query.ilike('carrier', input.carrier);
      }
      
      if (input.transitTime && parseInt(input.transitTime) > 0) {
        query = query.eq('transit_time', parseInt(input.transitTime));
      }
      
      if (input.serviceType) {
        query = query.ilike('service_type', input.serviceType);
      }
      
      if (input.dangerousGoods === true) {
        query = query.eq('dg', 'Yes');
      } else if (input.dangerousGoods === false) {
        query = query.eq('dg', 'No');
      }
      
      return query;
    });

    console.log('Ocean Freight Results:');
    console.log('- Row count:', ocean?.length || 0);
    console.log('- Raw data:', ocean);
    console.log('===========================');

    // Track unique combinations including carrier, mode, service type to show all options
    const seenCombinations = new Map<string, any>();

    // First pass: collect unique combinations based on all relevant fields
    (ocean ?? []).forEach((r: any) => {
      // Double-check validity dates on each record
      const effectiveDate = new Date(r.effective_date);
      const validUntilDate = new Date(r.valid_until);
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);

      // Skip if record doesn't fall within the requested date range
      if (effectiveDate > toDateObj || validUntilDate < fromDateObj) {
        console.log(`Skipping ocean record due to date mismatch: ${r.effective_date} - ${r.valid_until}`);
        return;
      }

      // Create unique key including carrier, mode, service type, transit time, and DG status
      const uniqueKey = `${r.port_of_loading}→${r.port_of_discharge}|${r.carrier || 'N/A'}|${r.mode || 'N/A'}|${r.service_type || 'N/A'}|${r.transit_time || 'N/A'}|${r.dg || 'N/A'}`;
      const existing = seenCombinations.get(uniqueKey);

      // Keep the record with the lowest rate (or first if rates are equal)
      if (!existing) {
        seenCombinations.set(uniqueKey, r);
      } else {
        const existingRate = parseFloat(existing['20gp']) || parseFloat(existing['40gp_40hc']) || 0;
        const currentRate = parseFloat(r['20gp']) || parseFloat(r['40gp_40hc']) || 0;
        if (currentRate > 0 && (existingRate === 0 || currentRate < existingRate)) {
          seenCombinations.set(uniqueKey, r);
        }
      }
    });

    console.log(`Unique combinations found: ${seenCombinations.size}`);

    // Second pass: process unique combinations
    seenCombinations.forEach((r: any) => {
      // 20GP containers
      if (qty20 > 0) {
        const rate = parseFloat(r['20gp']) || 0;
        if (rate > 0) {
          const total = rate * qty20;
          const extraInfo = [r.mode, r.carrier, r.transit_time, r.service_type, r.dg && `DG: ${r.dg}`].filter(Boolean).join(' - ');
          oceanItems.push({
            label: `${r.port_of_loading} → ${r.port_of_discharge} (20GP${extraInfo ? ` - ${extraInfo}` : ''})`,
            unit: 'PER_CONTAINER',
            qty: qty20,
            rate,
            total,
            extra: extraInfo || undefined
          });
        }
      }

      // 40GP containers
      if (qty40 > 0) {
        const rate = parseFloat(r['40gp_40hc']) || 0;
        if (rate > 0) {
          const total = rate * qty40;
          const extraInfo = [r.mode, r.carrier, r.transit_time, r.service_type, r.dg && `DG: ${r.dg}`].filter(Boolean).join(' - ');
          oceanItems.push({
            label: `${r.port_of_loading} → ${r.port_of_discharge} (40GP${extraInfo ? ` - ${extraInfo}` : ''})`,
            unit: 'PER_CONTAINER',
            qty: qty40,
            rate,
            total,
            extra: extraInfo || undefined
          });
        }
      }

      // 40HC containers
      if (qty40HC > 0) {
        const rate = parseFloat(r['40gp_40hc']) || 0;
        if (rate > 0) {
          const total = rate * qty40HC;
          const extraInfo = [r.mode, r.carrier, r.transit_time, r.service_type, r.dg && `DG: ${r.dg}`].filter(Boolean).join(' - ');
          oceanItems.push({
            label: `${r.port_of_loading} → ${r.port_of_discharge} (40HC${extraInfo ? ` - ${extraInfo}` : ''})`,
            unit: 'PER_CONTAINER',
            qty: qty40HC,
            rate,
            total,
            extra: extraInfo || undefined
          });
        }
      }

      // LCL
      if (lclCbm > 0) {
        const rate = parseFloat(r.cubic_rate) || 0;
        if (rate > 0) {
          const total = rate * lclCbm;
          const extraInfo = [r.mode, r.carrier, r.transit_time, r.service_type, r.dg && `DG: ${r.dg}`].filter(Boolean).join(' - ');
          oceanItems.push({
            label: `${r.port_of_loading} → ${r.port_of_discharge} (LCL${extraInfo ? ` - ${extraInfo}` : ''})`,
            unit: 'PER_CBM',
            qty: lclCbm,
            rate,
            total,
            extra: extraInfo || undefined
          });
        }
      }
    });
  } catch (error) {
    console.error('Error fetching ocean freight:', error);
  }

  const oceanUSD: Section = {
    currency: 'USD',
    title: 'Ocean Freight (USD)',
    subtitle: `${polDisplay} → ${podDisplay} • ${getEquipmentSummary(qty20, qty40, qty40HC, lclCbm)}`,
    items: oceanItems,
    subtotal: subTotal(oceanItems)
  };

  // 2) LOCALS AUD (mandatory only if column exists)
  let localsItems: LineItem[] = [];
  try {
    const localPortArray = direction === 'import' ? podArray : polArray;
    const localPortFilter = localPortArray.length > 1
      ? ` AND UPPER("port_of_discharge") IN (${localPortArray.map(p => `UPPER('${p}')`).join(',')})`
      : ` AND UPPER("port_of_discharge") = UPPER('${localPortArray[0]}')`;
    const localsQuery = `SELECT "port_of_discharge","direction","cw1_charge_code","charge_description","basis","20gp","40gp_40hc","per_shipment_charge","currency","effective_date","valid_until" FROM "local" WHERE UPPER("direction") = UPPER('${direction}')${localPortFilter} AND UPPER("currency") = UPPER('AUD') AND "effective_date" <= '${toDate}' AND "valid_until" >= '${fromDate}' LIMIT 500`;
    queries.push(localsQuery);

    console.log('=== LOCAL CHARGES QUERY ===');
    console.log('SQL:', localsQuery);

    const { data: locals } = await selectWithFallback(TABLE_KEYS.local, (q) =>
      q.select('port_of_discharge,direction,cw1_charge_code,charge_description,basis,20gp,40gp_40hc,per_shipment_charge,currency')
        .ilike('direction', direction)
        .in('port_of_discharge', localPortArray)
        .eq('currency', 'AUD')
        .lte('effective_date', toDate)
        .gte('valid_until', fromDate)
        .limit(500)
    );

    console.log('Local Charges Results:');
    console.log('- Row count:', locals?.length || 0);
    console.log('- Raw data:', locals);
    console.log('===========================');
    
    // Process local charges for each container type with validity date enforcement
    (locals ?? []).forEach((r: any) => {
      // Double-check validity dates on each record
      const effectiveDate = new Date(r.effective_date);
      const validUntilDate = new Date(r.valid_until);
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);
      
      // Skip if record doesn't fall within the requested date range
      if (effectiveDate > toDateObj || validUntilDate < fromDateObj) {
        console.log(`Skipping local record due to date mismatch: ${r.effective_date} - ${r.valid_until}`);
        return;
      }
      
      // Per shipment charges (apply once regardless of container count)
      if (r.per_shipment_charge && parseFloat(r.per_shipment_charge) > 0) {
        const rate = parseFloat(r.per_shipment_charge);
        localsItems.push({
          label: r.charge_description || 'Local Charge',
          unit: 'PER_SHIPMENT',
          qty: 1,
          rate,
          total: rate,
          extra: r.cw1_charge_code ?? undefined
        });
      }
      
      // 20GP container charges
      if (qty20 > 0 && r['20gp']) {
        const rate = parseFloat(r['20gp']) || 0;
        if (rate > 0) {
          const total = rate * qty20;
          localsItems.push({
            label: `${r.charge_description || 'Local Charge'} (20GP)`,
            unit: 'PER_CONTAINER',
            qty: qty20,
            rate,
            total,
            extra: r.cw1_charge_code ?? undefined
          });
        }
      }
      
      // 40GP/40HC container charges
      if ((qty40 > 0 || qty40HC > 0) && r['40gp_40hc']) {
        const rate = parseFloat(r['40gp_40hc']) || 0;
        if (rate > 0) {
          // 40GP charges
          if (qty40 > 0) {
            const total = rate * qty40;
            localsItems.push({
              label: `${r.charge_description || 'Local Charge'} (40GP)`,
              unit: 'PER_CONTAINER',
              qty: qty40,
              rate,
              total,
              extra: r.cw1_charge_code ?? undefined
            });
          }
          
          // 40HC charges
          if (qty40HC > 0) {
            const total = rate * qty40HC;
            localsItems.push({
              label: `${r.charge_description || 'Local Charge'} (40HC)`,
              unit: 'PER_CONTAINER',
              qty: qty40HC,
              rate,
              total,
              extra: r.cw1_charge_code ?? undefined
            });
          }
        }
      }
      
      // LCL charges (if cubic rate available)
      if (lclCbm > 0 && r.cubic_rate) {
        const rate = parseFloat(r.cubic_rate) || 0;
        if (rate > 0) {
          const total = rate * lclCbm;
          localsItems.push({
            label: `${r.charge_description || 'Local Charge'} (LCL)`,
            unit: 'PER_CBM',
            qty: lclCbm,
            rate,
            total,
            extra: r.cw1_charge_code ?? undefined
          });
        }
      }
    });
  } catch (error) {
    console.error('Error fetching local charges:', error);
  }

  const localsAUD: Section = { 
    currency: 'AUD', 
    title: 'Locals (AUD)', 
    subtitle: `${direction === 'import' ? pod : pol} • ${getEquipmentSummary(qty20, qty40, qty40HC, lclCbm)}`, 
    items: localsItems, 
    subtotal: subTotal(localsItems) 
  };

  // 3) DELIVERY AUD (transport)
  let delItems: LineItem[] = [];
  try {
    const vehicleTypeFilter = input.vehicleType ? ` AND UPPER("vehicle_type") = UPPER('${input.vehicleType}')` : '';
    const transportVendorFilter = input.transportVendor ? ` AND UPPER("transport_vendor") = UPPER('${input.transportVendor}')` : '';
    const transportQuery = direction === 'import' 
      ? `SELECT "pick_up_location","delivery_location","direction","vehicle_type","charge_description","20gp","40gp_40hc","currency","transport_vendor","tail_gate","side_loader_access_fees","container_unpack_rate_loose","container_unpack_rate_palletized","fumigation_bmsb","sideloader_same_day_collection","effective_date","valid_until" FROM "transport" WHERE UPPER("direction") = UPPER('${direction}') AND UPPER("delivery_location") LIKE UPPER('%${suburb}%') AND UPPER("currency") = UPPER('AUD') AND "effective_date" <= '${toDate}' AND "valid_until" >= '${fromDate}'${vehicleTypeFilter}${transportVendorFilter} LIMIT 200`
      : `SELECT "pick_up_location","delivery_location","direction","vehicle_type","charge_description","20gp","40gp_40hc","currency","transport_vendor","tail_gate","side_loader_access_fees","container_unpack_rate_loose","container_unpack_rate_palletized","fumigation_bmsb","sideloader_same_day_collection","effective_date","valid_until" FROM "transport" WHERE UPPER("direction") = UPPER('${direction}') AND UPPER("pick_up_location") LIKE UPPER('%${suburb}%') AND UPPER("currency") = UPPER('AUD') AND "effective_date" <= '${toDate}' AND "valid_until" >= '${fromDate}'${vehicleTypeFilter}${transportVendorFilter} LIMIT 200`;
    queries.push(transportQuery);
    
    console.log('=== TRANSPORT QUERY ===');
    console.log('SQL:', transportQuery);
    
    const { data: transport } = await selectWithFallback(TABLE_KEYS.transport, (q) => {
      let base = q
        .select('pick_up_location,delivery_location,direction,vehicle_type,charge_description,20gp,40gp_40hc,currency,dg_surcharge,transport_vendor,drop_trailer,heavy_weight_surcharge,tail_gate,side_loader_access_fees,container_unpack_rate_loose,container_unpack_rate_palletized,fumigation_bmsb,sideloader_same_day_collection')
        .ilike('direction', direction)
        .eq('currency', 'AUD')
        .lte('effective_date', toDate)
        .gte('valid_until', fromDate)
        .limit(200);
      
      if (input.vehicleType) {
        base = base.ilike('vehicle_type', input.vehicleType);
      }
      
      if (input.transportVendor) {
        base = base.ilike('transport_vendor', input.transportVendor);
      }
      
      return direction === 'import'
        ? base.ilike('delivery_location', `%${suburb}%`)
        : base.ilike('pick_up_location', `%${suburb}%`);
    });

    console.log('Transport Results:');
    console.log('- Row count:', transport?.length || 0);
    console.log('- Raw data:', transport);
    console.log('=======================');
    
    // Process transport charges for each container type with validity date enforcement
    (transport ?? []).forEach((r: any) => {
      // Double-check validity dates on each record
      const effectiveDate = new Date(r.effective_date);
      const validUntilDate = new Date(r.valid_until);
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);
      
      // Skip if record doesn't fall within the requested date range
      if (effectiveDate > toDateObj || validUntilDate < fromDateObj) {
        console.log(`Skipping transport record due to date mismatch: ${r.effective_date} - ${r.valid_until}`);
        return;
      }
      
      const baseLabel = r.charge_description || (direction === 'import' 
        ? `${r.delivery_location ?? suburb} delivery` 
        : `${r.pick_up_location ?? suburb} pickup`);
      
      // Calculate DG surcharge if dangerous goods are selected
      const dgSurcharge = input.dangerousGoods ? (parseFloat(r.dg_surcharge) || 0) : 0;
      
      // Calculate drop trailer charge if drop trailer is selected
      const dropTrailerCharge = input.dropTrailer ? (parseFloat(r.drop_trailer) || 0) : 0;
      
      // Calculate heavy weight surcharge if heavy weight surcharge is selected
      const heavyWeightSurcharge = input.heavyWeightSurcharge ? (parseFloat(r.heavy_weight_surcharge) || 0) : 0;
      
      // Calculate tailgate charge if via tailgate is selected
      const tailgateCharge = input.viaTailgate ? (parseFloat(r.tail_gate) || 0) : 0;
      
      // Calculate side loader access fees if side loader access fees is selected
      const sideLoaderAccessFees = input.sideLoaderAccessFees ? (parseFloat(r.side_loader_access_fees) || 0) : 0;
      
      // Calculate unpack loose charge if unpack loose is selected
      const unpackLooseCharge = input.unpackLoose ? (parseFloat(r.container_unpack_rate_loose) || 0) : 0;
      
      // Calculate unpack palletized charge if unpack palletized is selected
      const unpackPalletizedCharge = input.unpackPalletized ? (parseFloat(r.container_unpack_rate_palletized) || 0) : 0;
      
      // Calculate fumigation surcharge if fumigation surcharge is selected
      const fumigationCharge = input.fumigationSurcharge ? (parseFloat(r.fumigation_bmsb) || 0) : 0;
      
      // Calculate sideloader same day collection charge if sideloader same day collection is selected
      const sideloaderSamedayCharge = input.sideloaderSamedayCollection ? (parseFloat(r.sideloader_same_day_collection) || 0) : 0;
      
      // 20GP transport
      if (qty20 > 0) {
        const baseRate = parseFloat(r['20gp']) || 0;
        const rate = baseRate + dgSurcharge + dropTrailerCharge + heavyWeightSurcharge + tailgateCharge + sideLoaderAccessFees + unpackLooseCharge + unpackPalletizedCharge + fumigationCharge + sideloaderSamedayCharge;
        if (rate > 0) {
          const total = rate * qty20;
          const additionalCharges = [];
          if (dgSurcharge > 0) additionalCharges.push(`DG: ${dgSurcharge.toFixed(2)}`);
          if (dropTrailerCharge > 0) additionalCharges.push(`Drop Trailer: ${dropTrailerCharge.toFixed(2)}`);
          if (heavyWeightSurcharge > 0) additionalCharges.push(`Heavy Weight: ${heavyWeightSurcharge.toFixed(2)}`);
          if (tailgateCharge > 0) additionalCharges.push(`Tailgate: ${tailgateCharge.toFixed(2)}`);
          if (sideLoaderAccessFees > 0) additionalCharges.push(`Side Loader: ${sideLoaderAccessFees.toFixed(2)}`);
          if (unpackLooseCharge > 0) additionalCharges.push(`Unpack Loose: ${unpackLooseCharge.toFixed(2)}`);
          if (unpackPalletizedCharge > 0) additionalCharges.push(`Unpack Palletized: ${unpackPalletizedCharge.toFixed(2)}`);
          if (fumigationCharge > 0) additionalCharges.push(`Fumigation: ${fumigationCharge.toFixed(2)}`);
          if (sideloaderSamedayCharge > 0) additionalCharges.push(`Sideloader Sameday: ${sideloaderSamedayCharge.toFixed(2)}`);
          const chargesNote = additionalCharges.length > 0 ? ` + ${additionalCharges.join(' + ')}` : '';
          delItems.push({
            label: `${baseLabel} (20GP${r.vehicle_type ? ` - ${r.vehicle_type}` : ''}${chargesNote})`,
            unit: 'PER_CONTAINER',
            qty: qty20,
            rate,
            total,
            extra: r.vehicle_type ?? undefined
          });
        }
      }
      
      // 40GP transport
      if (qty40 > 0) {
        const baseRate = parseFloat(r['40gp_40hc']) || 0;
        const rate = baseRate + dgSurcharge + dropTrailerCharge + heavyWeightSurcharge + tailgateCharge + sideLoaderAccessFees + unpackLooseCharge + unpackPalletizedCharge + fumigationCharge + sideloaderSamedayCharge;
        if (rate > 0) {
          const total = rate * qty40;
          const additionalCharges = [];
          if (dgSurcharge > 0) additionalCharges.push(`DG: ${dgSurcharge.toFixed(2)}`);
          if (dropTrailerCharge > 0) additionalCharges.push(`Drop Trailer: ${dropTrailerCharge.toFixed(2)}`);
          if (heavyWeightSurcharge > 0) additionalCharges.push(`Heavy Weight: ${heavyWeightSurcharge.toFixed(2)}`);
          if (tailgateCharge > 0) additionalCharges.push(`Tailgate: ${tailgateCharge.toFixed(2)}`);
          if (sideLoaderAccessFees > 0) additionalCharges.push(`Side Loader: ${sideLoaderAccessFees.toFixed(2)}`);
          if (unpackLooseCharge > 0) additionalCharges.push(`Unpack Loose: ${unpackLooseCharge.toFixed(2)}`);
          if (unpackPalletizedCharge > 0) additionalCharges.push(`Unpack Palletized: ${unpackPalletizedCharge.toFixed(2)}`);
          if (fumigationCharge > 0) additionalCharges.push(`Fumigation: ${fumigationCharge.toFixed(2)}`);
          if (sideloaderSamedayCharge > 0) additionalCharges.push(`Sideloader Sameday: ${sideloaderSamedayCharge.toFixed(2)}`);
          const chargesNote = additionalCharges.length > 0 ? ` + ${additionalCharges.join(' + ')}` : '';
          delItems.push({
            label: `${baseLabel} (40GP${r.vehicle_type ? ` - ${r.vehicle_type}` : ''}${chargesNote})`,
            unit: 'PER_CONTAINER',
            qty: qty40,
            rate,
            total,
            extra: r.vehicle_type ?? undefined
          });
        }
      }
      
      // 40HC transport
      if (qty40HC > 0) {
        const baseRate = parseFloat(r['40gp_40hc']) || 0;
        const rate = baseRate + dgSurcharge + dropTrailerCharge + heavyWeightSurcharge + tailgateCharge + sideLoaderAccessFees + unpackLooseCharge + unpackPalletizedCharge + fumigationCharge + sideloaderSamedayCharge;
        if (rate > 0) {
          const total = rate * qty40HC;
          const additionalCharges = [];
          if (dgSurcharge > 0) additionalCharges.push(`DG: ${dgSurcharge.toFixed(2)}`);
          if (dropTrailerCharge > 0) additionalCharges.push(`Drop Trailer: ${dropTrailerCharge.toFixed(2)}`);
          if (heavyWeightSurcharge > 0) additionalCharges.push(`Heavy Weight: ${heavyWeightSurcharge.toFixed(2)}`);
          if (tailgateCharge > 0) additionalCharges.push(`Tailgate: ${tailgateCharge.toFixed(2)}`);
          if (sideLoaderAccessFees > 0) additionalCharges.push(`Side Loader: ${sideLoaderAccessFees.toFixed(2)}`);
          if (unpackLooseCharge > 0) additionalCharges.push(`Unpack Loose: ${unpackLooseCharge.toFixed(2)}`);
          if (unpackPalletizedCharge > 0) additionalCharges.push(`Unpack Palletized: ${unpackPalletizedCharge.toFixed(2)}`);
          if (fumigationCharge > 0) additionalCharges.push(`Fumigation: ${fumigationCharge.toFixed(2)}`);
          if (sideloaderSamedayCharge > 0) additionalCharges.push(`Sideloader Sameday: ${sideloaderSamedayCharge.toFixed(2)}`);
          const chargesNote = additionalCharges.length > 0 ? ` + ${additionalCharges.join(' + ')}` : '';
          delItems.push({
            label: `${baseLabel} (40HC${r.vehicle_type ? ` - ${r.vehicle_type}` : ''}${chargesNote})`,
            unit: 'PER_CONTAINER',
            qty: qty40HC,
            rate,
            total,
            extra: r.vehicle_type ?? undefined
          });
        }
      }
      
      // LCL transport (if applicable - some transport may charge per CBM)
      if (lclCbm > 0) {
        // Check if there's a cubic rate for LCL transport
        const cubicRate = parseFloat(r.cubic_rate) || 0;
        if (cubicRate > 0) {
          const rate = cubicRate + dgSurcharge + dropTrailerCharge + heavyWeightSurcharge + tailgateCharge + sideLoaderAccessFees + unpackLooseCharge + unpackPalletizedCharge + fumigationCharge + sideloaderSamedayCharge;
          const total = cubicRate * lclCbm;
          const additionalCharges = [];
          if (dgSurcharge > 0) additionalCharges.push(`DG: ${dgSurcharge.toFixed(2)}`);
          if (dropTrailerCharge > 0) additionalCharges.push(`Drop Trailer: ${dropTrailerCharge.toFixed(2)}`);
          if (heavyWeightSurcharge > 0) additionalCharges.push(`Heavy Weight: ${heavyWeightSurcharge.toFixed(2)}`);
          if (tailgateCharge > 0) additionalCharges.push(`Tailgate: ${tailgateCharge.toFixed(2)}`);
          if (sideLoaderAccessFees > 0) additionalCharges.push(`Side Loader: ${sideLoaderAccessFees.toFixed(2)}`);
          if (unpackLooseCharge > 0) additionalCharges.push(`Unpack Loose: ${unpackLooseCharge.toFixed(2)}`);
          if (unpackPalletizedCharge > 0) additionalCharges.push(`Unpack Palletized: ${unpackPalletizedCharge.toFixed(2)}`);
          if (fumigationCharge > 0) additionalCharges.push(`Fumigation: ${fumigationCharge.toFixed(2)}`);
          if (sideloaderSamedayCharge > 0) additionalCharges.push(`Sideloader Sameday: ${sideloaderSamedayCharge.toFixed(2)}`);
          const chargesNote = additionalCharges.length > 0 ? ` + ${additionalCharges.join(' + ')}` : '';
          delItems.push({
            label: `${baseLabel} (LCL${r.vehicle_type ? ` - ${r.vehicle_type}` : ''}${chargesNote})`,
            unit: 'PER_CBM',
            qty: lclCbm,
            rate,
            total,
            extra: r.vehicle_type ?? undefined
          });
        } else {
          // Fallback: treat LCL as 1 container for transport
          const baseRate = parseFloat(r['20gp']) || 0;
          const rate = baseRate + dgSurcharge + dropTrailerCharge + heavyWeightSurcharge + tailgateCharge + sideLoaderAccessFees + unpackLooseCharge + unpackPalletizedCharge + fumigationCharge + sideloaderSamedayCharge;
          if (rate > 0) {
            const additionalCharges = [];
            if (dgSurcharge > 0) additionalCharges.push(`DG: ${dgSurcharge.toFixed(2)}`);
            if (dropTrailerCharge > 0) additionalCharges.push(`Drop Trailer: ${dropTrailerCharge.toFixed(2)}`);
            if (heavyWeightSurcharge > 0) additionalCharges.push(`Heavy Weight: ${heavyWeightSurcharge.toFixed(2)}`);
            if (tailgateCharge > 0) additionalCharges.push(`Tailgate: ${tailgateCharge.toFixed(2)}`);
            if (sideLoaderAccessFees > 0) additionalCharges.push(`Side Loader: ${sideLoaderAccessFees.toFixed(2)}`);
            if (unpackLooseCharge > 0) additionalCharges.push(`Unpack Loose: ${unpackLooseCharge.toFixed(2)}`);
            if (unpackPalletizedCharge > 0) additionalCharges.push(`Unpack Palletized: ${unpackPalletizedCharge.toFixed(2)}`);
            if (fumigationCharge > 0) additionalCharges.push(`Fumigation: ${fumigationCharge.toFixed(2)}`);
            if (sideloaderSamedayCharge > 0) additionalCharges.push(`Sideloader Sameday: ${sideloaderSamedayCharge.toFixed(2)}`);
            const chargesNote = additionalCharges.length > 0 ? ` + ${additionalCharges.join(' + ')}` : '';
            delItems.push({
              label: `${baseLabel} (LCL${r.vehicle_type ? ` - ${r.vehicle_type}` : ''}${chargesNote})`,
              unit: 'PER_CONTAINER',
              qty: 1,
              rate,
              total: rate,
              extra: r.vehicle_type ?? undefined
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transport charges:', error);
  }

  console.log('=== FINAL RESULTS SUMMARY ===');
  console.log('Ocean items processed:', oceanItems.length);
  console.log('Local items processed:', localsItems.length);
  console.log('Transport items processed:', delItems.length);
  console.log('==============================');
  const deliveryAUD: Section = { 
    currency: 'AUD', 
    title: 'Destination Delivery (AUD)', 
    subtitle: `${suburb} • ${getEquipmentSummary(qty20, qty40, qty40HC, lclCbm)}`, 
    items: delItems, 
    subtotal: subTotal(delItems) 
  };

  return { 
    oceanUSD, 
    localsAUD, 
    deliveryAUD, 
    validityPeriod: {
      from: fromDate,
      to: toDate
    },
    sqlQueries: queries 
  };
}

function getEquipmentSummary(qty20: number, qty40: number, qty40HC: number, lclCbm: number): string {
  const parts: string[] = [];
  if (qty20 > 0) parts.push(`${qty20}x20GP`);
  if (qty40 > 0) parts.push(`${qty40}x40GP`);
  if (qty40HC > 0) parts.push(`${qty40HC}x40HC`);
  if (lclCbm > 0) parts.push(`${lclCbm}CBM`);
  return parts.join(', ') || 'No equipment';
}
export function toCsv(sections: CalcResult): string {
  const rows: string[] = [];
  const pushSec = (name: string, s: Section) => {
    rows.push(`${name} (${s.currency})`);
    rows.push('Label,Unit,Qty,Rate,Total');
    s.items.forEach(i => rows.push(`${escapeCsv(i.label)},${i.unit ?? ''},${i.qty},${i.rate},${i.total}`));
    rows.push(`Subtotal,, , ,${s.subtotal}`);
    rows.push('');
  };
  pushSec('Ocean Freight', sections.oceanUSD);
  pushSec('Locals', sections.localsAUD);
  pushSec('Destination Delivery', sections.deliveryAUD);
  return rows.join('\n');
}

function escapeCsv(v: string) { return '"' + (v ?? '').replaceAll('"', '""') + '"'; }