export interface OceanFreightRate {
  id: string;
  origin_port: string;
  destination_port: string;
  direction: 'import' | 'export';
  container_type: '20GP' | '40GP' | '40HC' | 'LCL';
  rate: number;
  currency: string;
  validity_start: string;
  validity_end: string;
  carrier?: string;
  notes?: string;
  created_at?: string;
}

export interface LocalCharge {
  id: string;
  port: string;
  direction: 'import' | 'export';
  charge_code?: string;
  charge_name: string;
  unit: 'PER_SHIPMENT' | 'PER_CONTAINER' | 'PER_CBM';
  container_type?: '20GP' | '40GP' | '40HC' | 'LCL' | null;
  min_charge?: number;
  rate: number;
  currency: string;
  validity_start: string;
  validity_end: string;
  notes?: string;
  created_at?: string;
}

export interface TransportPricing {
  id: string;
  pickup_location?: string;
  delivery_location?: string;
  direction: 'import' | 'export';
  container_type: '20GP' | '40GP' | '40HC' | 'LCL';
  unit: 'PER_SHIPMENT' | 'PER_CONTAINER';
  rate: number;
  currency: string;
  validity_start: string;
  validity_end: string;
  zone?: string;
  notes?: string;
  created_at?: string;
}

export interface CalculationInputs {
  direction: 'import' | 'export';
  pol: string | string[]; // Port of Loading (supports multi-select)
  pod: string; // Port of Discharge
  point: string; // Delivery/Pickup point
  validityFrom: string;
  validityTo: string;
  qty20: number;
  qty40: number;
  qty40HC: number;
  lclCbm: number;
  mode?: string;
  vehicleType?: string;
  carrier?: string;
  transitTime?: string;
  serviceType?: string;
  transportVendor?: string;
  dangerousGoods?: boolean;
  dropTrailer?: boolean;
  heavyWeightSurcharge?: boolean;
  viaTailgate?: boolean;
  sideLoaderAccessFees?: boolean;
  unpackLoose?: boolean;
  unpackPalletized?: boolean;
  fumigationSurcharge?: boolean;
  sideloaderSamedayCollection?: boolean;
}

export interface LineItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
  currency: string;
  containerType?: string;
  notes?: string;
}

export interface CategoryResult {
  items: LineItem[];
  subtotal: number;
}

export interface CalculationResult {
  currency: string;
  ocean: CategoryResult;
  transport: CategoryResult;
  local: CategoryResult;
  grandTotal: number;
}

export type Direction = 'import' | 'export';
export type Equipment = '20GP' | '40GP' | '40HC' | 'LCL';
export type Unit = 'PER_SHIPMENT' | 'PER_CONTAINER' | 'PER_CBM';

export interface OceanRow {
  origin_port: string;
  destination_port: string; // aka port_of_discharge
  direction: Direction;
  container_type: Equipment;
  rate: number;
  currency: 'USD' | 'AUD' | string;
}

export interface LocalRow {
  port: string;
  direction: Direction;
  charge_code?: string;
  charge_name: string;
  unit: Unit;
  container_type: Equipment | null;
  min_charge?: number | null;
  rate: number;
  currency: 'AUD' | string;
  is_mandatory?: boolean | null;
}

export interface TransportRow {
  pickup_location: string | null;
  delivery_location: string | null;
  direction: Direction;
  container_type: Equipment;
  unit: Extract<Unit, 'PER_SHIPMENT' | 'PER_CONTAINER'>;
  rate: number;
  currency: 'AUD' | string;
}

export interface FilterParams {
  direction?: string;
  pol?: string;
  pod?: string;
  port?: string;
  pickup_location?: string;
  delivery_location?: string;
  container_type?: string;
  currency?: string;
  validity_start?: string;
  validity_end?: string;
  charge_code?: string;
  unit?: string;
  mode?: string;
  service_type?: string;
  carrier?: string;
  vehicle_type?: string;
  dangerous_goods?: boolean;
  drop_trailer?: boolean;
  heavy_weight_surcharge?: boolean;
  via_tailgate?: boolean;
  side_loader_access_fees?: boolean;
  unpack_loose?: boolean;
  unpack_palletized?: boolean;
  fumigation_surcharge?: boolean;
  sideloader_sameday_collection?: boolean;
}