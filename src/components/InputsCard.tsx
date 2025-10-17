import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import SuggestiveSelect from './SuggestiveSelect';
import MultiSelect from './MultiSelect';
import { supabase } from '../lib/supabase';
import { selectWithFallback, TABLE_KEYS } from '../lib/tableMap';
import type { CalculationInputs } from '../types';

interface InputsCardProps {
  inputs: CalculationInputs;
  onChange: (inputs: CalculationInputs) => void;
  onCalculate: () => void;
  loading: boolean;
}

export default function InputsCard({ inputs, onChange, onCalculate, loading }: InputsCardProps) {
  const [portOptions, setPortOptions] = useState<{ value: string; label: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);
  const [modeOptions, setModeOptions] = useState<{ value: string; label: string }[]>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [carrierOptions, setCarrierOptions] = useState<{ value: string; label: string }[]>([]);
  const [serviceTypeOptions, setServiceTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [transportVendorOptions, setTransportVendorOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingModes, setLoadingModes] = useState(false);
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(false);
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(false);
  const [loadingTransportVendors, setLoadingTransportVendors] = useState(false);

  const fetchAllRecords = async (tableName: string, selectFields: string, batchSize = 1000) => {
    let allData: any[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const end = start + batchSize - 1;
      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .range(start, end);

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        start += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    return allData;
  };

  useEffect(() => {
    loadPortOptions();
    loadLocationOptions();
    loadModeOptions();
    loadVehicleTypeOptions();
    loadCarrierOptions();
    loadServiceTypeOptions();
    loadTransportVendorOptions();
  }, []);

  const loadPortOptions = async () => {
    setLoadingPorts(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setPortOptions([]);
        return;
      }

      const ports = new Set<string>();

      let oceanData: any[] = [];
      try {
        oceanData = await fetchAllRecords('ocean_freight', 'port_of_loading, port_of_discharge');
      } catch (e) {
        try {
          oceanData = await fetchAllRecords('ocean_freight_rates', 'port_of_loading, port_of_discharge');
        } catch (e2) {
          console.error('Both ocean tables failed');
        }
      }

      oceanData.forEach((item: any) => {
        const trimmedPOL = String(item.port_of_loading || '').trim();
        const trimmedPOD = String(item.port_of_discharge || '').trim();
        if (trimmedPOL) ports.add(trimmedPOL);
        if (trimmedPOD) ports.add(trimmedPOD);
      });

      let localData: any[] = [];
      try {
        localData = await fetchAllRecords('local', 'port_of_discharge');
      } catch (e) {
        try {
          localData = await fetchAllRecords('local_charges', 'port_of_discharge');
        } catch (e2) {
          console.error('Both local tables failed');
        }
      }

      localData.forEach((item: any) => {
        const trimmedPOD = String(item.port_of_discharge || '').trim();
        if (trimmedPOD) ports.add(trimmedPOD);
      });

      const portsList = Array.from(ports).sort();
      setPortOptions(portsList.map(port => ({ value: port, label: port })));
    } catch (error) {
      console.error('Error loading port options:', error);
    } finally {
      setLoadingPorts(false);
    }
  };

  const loadLocationOptions = async () => {
    setLoadingLocations(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setLocationOptions([]);
        return;
      }

      const locations = new Set<string>();

      let transportData: any[] = [];
      try {
        transportData = await fetchAllRecords('transport', 'pick_up_location, delivery_location');
      } catch (e) {
        try {
          transportData = await fetchAllRecords('transport_pricing', 'pick_up_location, delivery_location');
        } catch (e2) {
          console.error('Both transport tables failed');
        }
      }

      transportData.forEach((item: any) => {
        const trimmedPickup = String(item.pick_up_location || '').trim();
        const trimmedDelivery = String(item.delivery_location || '').trim();
        if (trimmedPickup) locations.add(trimmedPickup);
        if (trimmedDelivery) locations.add(trimmedDelivery);
      });

      const locationsList = Array.from(locations).sort();
      setLocationOptions(locationsList.map(loc => ({ value: loc, label: loc })));
    } catch (error) {
      console.error('Error loading location options:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadModeOptions = async () => {
    setLoadingModes(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setModeOptions([]);
        return;
      }

      const modes = new Set<string>();

      let oceanData: any[] = [];
      try {
        oceanData = await fetchAllRecords('ocean_freight', 'mode');
      } catch (e) {
        try {
          oceanData = await fetchAllRecords('ocean_freight_rates', 'mode');
        } catch (e2) {
          console.error('Both ocean tables failed');
        }
      }

      oceanData.forEach((item: any) => {
        const trimmedMode = String(item.mode || '').trim();
        if (trimmedMode) modes.add(trimmedMode);
      });

      const modesList = Array.from(modes).sort();
      setModeOptions(modesList.map(mode => ({ value: mode, label: mode })));
    } catch (error) {
      console.error('Error loading mode options:', error);
    } finally {
      setLoadingModes(false);
    }
  };

  const loadVehicleTypeOptions = async () => {
    setLoadingVehicleTypes(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setVehicleTypeOptions([]);
        return;
      }

      const vehicleTypes = new Set<string>();

      let transportData: any[] = [];
      try {
        transportData = await fetchAllRecords('transport', 'vehicle_type');
      } catch (e) {
        try {
          transportData = await fetchAllRecords('transport_pricing', 'vehicle_type');
        } catch (e2) {
          console.error('Both transport tables failed');
        }
      }

      transportData.forEach((item: any) => {
        const trimmedVehicleType = String(item.vehicle_type || '').trim();
        if (trimmedVehicleType) vehicleTypes.add(trimmedVehicleType);
      });

      const vehicleTypesList = Array.from(vehicleTypes).sort();
      setVehicleTypeOptions(vehicleTypesList.map(type => ({ value: type, label: type })));
    } catch (error) {
      console.error('Error loading vehicle type options:', error);
    } finally {
      setLoadingVehicleTypes(false);
    }
  };

  const loadCarrierOptions = async () => {
    setLoadingCarriers(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setCarrierOptions([]);
        return;
      }

      const carriers = new Set<string>();

      let oceanData: any[] = [];
      try {
        oceanData = await fetchAllRecords('ocean_freight', 'carrier');
      } catch (e) {
        try {
          oceanData = await fetchAllRecords('ocean_freight_rates', 'carrier');
        } catch (e2) {
          console.error('Both ocean tables failed');
        }
      }

      oceanData.forEach((item: any) => {
        const trimmedCarrier = String(item.carrier || '').trim();
        if (trimmedCarrier) carriers.add(trimmedCarrier);
      });

      const carriersList = Array.from(carriers).sort();
      setCarrierOptions(carriersList.map(carrier => ({ value: carrier, label: carrier })));
    } catch (error) {
      console.error('Error loading carrier options:', error);
    } finally {
      setLoadingCarriers(false);
    }
  };

  const loadServiceTypeOptions = async () => {
    setLoadingServiceTypes(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setServiceTypeOptions([]);
        return;
      }

      const serviceTypes = new Set<string>();

      let oceanData: any[] = [];
      try {
        oceanData = await fetchAllRecords('ocean_freight', 'service_type');
      } catch (e) {
        try {
          oceanData = await fetchAllRecords('ocean_freight_rates', 'service_type');
        } catch (e2) {
          console.error('Both ocean tables failed');
        }
      }

      oceanData.forEach((item: any) => {
        const trimmedServiceType = String(item.service_type || '').trim();
        if (trimmedServiceType) serviceTypes.add(trimmedServiceType);
      });

      const serviceTypesList = Array.from(serviceTypes).sort();
      setServiceTypeOptions(serviceTypesList.map(type => ({ value: type, label: type })));
    } catch (error) {
      console.error('Error loading service type options:', error);
    } finally {
      setLoadingServiceTypes(false);
    }
  };

  const loadTransportVendorOptions = async () => {
    setLoadingTransportVendors(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized. Please check your environment variables.');
        setTransportVendorOptions([]);
        return;
      }

      const transportVendors = new Set<string>();

      let transportData: any[] = [];
      try {
        transportData = await fetchAllRecords('transport', 'transport_vendor');
      } catch (e) {
        try {
          transportData = await fetchAllRecords('transport_pricing', 'transport_vendor');
        } catch (e2) {
          console.error('Both transport tables failed');
        }
      }

      transportData.forEach((item: any) => {
        const trimmedVendor = String(item.transport_vendor || '').trim();
        if (trimmedVendor) transportVendors.add(trimmedVendor);
      });

      const transportVendorsList = Array.from(transportVendors).sort();
      setTransportVendorOptions(transportVendorsList.map(vendor => ({ value: vendor, label: vendor })));
    } catch (error) {
      console.error('Error loading transport vendor options:', error);
    } finally {
      setLoadingTransportVendors(false);
    }
  };

  const handleChange = (field: keyof CalculationInputs, value: any) => {
    const updates: Partial<CalculationInputs> = { [field]: value };

    // When LCL is entered with a value > 0, clear FCL quantities and set mode to Sea Freight LCL
    if (field === 'lclCbm' && value > 0) {
      updates.qty20 = 0;
      updates.qty40 = 0;
      updates.qty40HC = 0;
      updates.qty20RE = 0;
      updates.qty40RH = 0;
      updates.mode = 'Sea Freight LCL';
    }

    // When LCL is cleared (value = 0), clear the mode filter
    if (field === 'lclCbm' && value === 0) {
      updates.mode = '';
    }

    // When any FCL quantity is entered with a value > 0, clear LCL and mode
    if (['qty20', 'qty40', 'qty40HC', 'qty20RE', 'qty40RH'].includes(field) && value > 0) {
      updates.lclCbm = 0;
      updates.mode = '';
    }

    onChange({ ...inputs, ...updates });
  };

  const isValidForm = () => {
    const hasValidPol = Array.isArray(inputs.pol) ? inputs.pol.length > 0 : inputs.pol !== '';
    const hasValidPod = Array.isArray(inputs.pod) ? inputs.pod.length > 0 : inputs.pod !== '';
    return (
      inputs.direction &&
      hasValidPol &&
      hasValidPod &&
      inputs.validityFrom &&
      inputs.validityTo &&
      inputs.validityFrom <= inputs.validityTo &&
      (inputs.qty20 > 0 || inputs.qty40 > 0 || inputs.qty40HC > 0 || inputs.qty20RE > 0 || inputs.qty40RH > 0 || inputs.lclCbm > 0)
    );
  };

  const handleReset = () => {
    const initialInputs: CalculationInputs = {
      direction: 'export',
      pol: [],
      pod: [],
      point: '',
      validityFrom: new Date().toISOString().split('T')[0],
      validityTo: (() => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.toISOString().split('T')[0];
      })(),
      qty20: 0,
      qty40: 0,
      qty40HC: 0,
      qty20RE: 0,
      qty40RH: 0,
      lclCbm: 0,
      sortBy: 'recommended',
      mode: '',
      vehicleType: '',
      carrier: '',
      serviceType: '',
      transportVendor: '',
      dangerousGoods: false
    };
    onChange(initialInputs);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Rate Calculator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Direction *
          </label>
          <select
            value={inputs.direction}
            onChange={(e) => handleChange('direction', e.target.value as 'import' | 'export')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select direction</option>
            <option value="import">Import</option>
            <option value="export">Export</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {inputs.direction === 'import' ? 'Delivery Point' : 'Pickup Point'} *
          </label>
          <SuggestiveSelect
            value={inputs.point}
            onChange={(value) => handleChange('point', value)}
            options={locationOptions}
            placeholder={`Enter ${inputs.direction === 'import' ? 'delivery' : 'pickup'} location`}
            loading={loadingLocations}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Port of Loading (POL) *
          </label>
          <MultiSelect
            values={Array.isArray(inputs.pol) ? inputs.pol : inputs.pol ? [inputs.pol] : []}
            onChange={(values) => handleChange('pol', values)}
            options={portOptions}
            placeholder="Select origin ports"
            loading={loadingPorts}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Port of Discharge (POD) *
          </label>
          <MultiSelect
            values={Array.isArray(inputs.pod) ? inputs.pod : inputs.pod ? [inputs.pod] : []}
            onChange={(values) => handleChange('pod', values)}
            options={portOptions}
            placeholder="Select destination ports"
            loading={loadingPorts}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validity From *
          </label>
          <input
            type="date"
            value={inputs.validityFrom}
            onChange={(e) => handleChange('validityFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validity To *
          </label>
          <input
            type="date"
            value={inputs.validityTo}
            onChange={(e) => handleChange('validityTo', e.target.value)}
            min={inputs.validityFrom}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mode
          </label>
          <SuggestiveSelect
            value={inputs.mode || ''}
            onChange={(value) => handleChange('mode', value)}
            options={modeOptions}
            placeholder="Select transportation mode"
            loading={loadingModes}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Type
          </label>
          <SuggestiveSelect
            value={inputs.vehicleType || ''}
            onChange={(value) => handleChange('vehicleType', value)}
            options={vehicleTypeOptions}
            placeholder="Select vehicle type"
            loading={loadingVehicleTypes}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carrier
          </label>
          <SuggestiveSelect
            value={inputs.carrier || ''}
            onChange={(value) => handleChange('carrier', value)}
            options={carrierOptions}
            placeholder="Select carrier"
            loading={loadingCarriers}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transport Vendor
          </label>
          <SuggestiveSelect
            value={inputs.transportVendor || ''}
            onChange={(value) => handleChange('transportVendor', value)}
            options={transportVendorOptions}
            placeholder="Select transport vendor"
            loading={loadingTransportVendors}
          />
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.showIfApplicable || false}
              onChange={(e) => handleChange('showIfApplicable', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Show If Applicable Local Charges</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.dangerousGoods || false}
              onChange={(e) => handleChange('dangerousGoods', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Dangerous Goods</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.dropTrailer || false}
              onChange={(e) => handleChange('dropTrailer', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Drop Trailer</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.heavyWeightSurcharge || false}
              onChange={(e) => handleChange('heavyWeightSurcharge', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Heavy Weight Surcharge</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.viaTailgate || false}
              onChange={(e) => handleChange('viaTailgate', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Via Tailgate</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.sideLoaderAccessFees || false}
              onChange={(e) => handleChange('sideLoaderAccessFees', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Side Loader Access Fees</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.unpackLoose || false}
              onChange={(e) => handleChange('unpackLoose', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Unpack Loose</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.unpackPalletized || false}
              onChange={(e) => handleChange('unpackPalletized', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Unpack Palletized</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.fumigationSurcharge || false}
              onChange={(e) => handleChange('fumigationSurcharge', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Fumigation Surcharge AU</span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputs.sideloaderSamedayCollection || false}
              onChange={(e) => handleChange('sideloaderSamedayCollection', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Sideloader Sameday Collection</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Ocean Freight By</h3>
        <div className="flex gap-6 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortBy"
              value="all"
              checked={!inputs.sortBy}
              onChange={(e) => handleChange('sortBy', undefined)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">All</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortBy"
              value="cheapest"
              checked={inputs.sortBy === 'cheapest'}
              onChange={(e) => handleChange('sortBy', e.target.value as 'cheapest' | 'fastest' | 'recommended')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Cheapest</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortBy"
              value="fastest"
              checked={inputs.sortBy === 'fastest'}
              onChange={(e) => handleChange('sortBy', e.target.value as 'cheapest' | 'fastest' | 'recommended')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Fastest</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortBy"
              value="recommended"
              checked={inputs.sortBy === 'recommended'}
              onChange={(e) => handleChange('sortBy', e.target.value as 'cheapest' | 'fastest' | 'recommended')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Recommended</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Container Quantities</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">20GP</label>
            <input
              type="number"
              min="0"
              value={inputs.qty20}
              onChange={(e) => handleChange('qty20', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">40GP</label>
            <input
              type="number"
              min="0"
              value={inputs.qty40}
              onChange={(e) => handleChange('qty40', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">40HC</label>
            <input
              type="number"
              min="0"
              value={inputs.qty40HC}
              onChange={(e) => handleChange('qty40HC', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">20RE</label>
            <input
              type="number"
              min="0"
              value={inputs.qty20RE}
              onChange={(e) => handleChange('qty20RE', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">40RH</label>
            <input
              type="number"
              min="0"
              value={inputs.qty40RH}
              onChange={(e) => handleChange('qty40RH', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">LCL (CBM)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={inputs.lclCbm}
              onChange={(e) => handleChange('lclCbm', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors duration-200 font-medium"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Filters
        </button>
        
        <button
          onClick={onCalculate}
          disabled={!isValidForm() || loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
        >
          {loading ? 'Calculating...' : 'Calculate Rates'}
        </button>
      </div>
    </div>
  );
}