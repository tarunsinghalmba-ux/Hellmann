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

      const { data: originData } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
        q.select('port_of_loading').order('port_of_loading')
      );
      
      const { data: destinationData } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
        q.select('port_of_discharge').order('port_of_discharge')
      );

      const origins = Array.from(new Set(originData?.map(item => item.port_of_loading).filter(Boolean) || []));
      const destinations = Array.from(new Set(destinationData?.map(item => item.port_of_discharge).filter(Boolean) || []));
      const allPorts = Array.from(new Set([...origins, ...destinations])).sort();

      setPortOptions(allPorts.map(port => ({ value: String(port || ''), label: String(port || '') })));
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

      const { data } = await selectWithFallback(TABLE_KEYS.transport, (q) =>
        q.select('pick_up_location, delivery_location').order('pick_up_location')
      );

      const locations = new Set<string>();
      data?.forEach(item => {
        if (item.pick_up_location && item.pick_up_location.trim()) locations.add(item.pick_up_location);
        if (item.delivery_location && item.delivery_location.trim()) locations.add(item.delivery_location);
      });

      setLocationOptions(Array.from(locations).sort().map(loc => ({ value: String(loc || ''), label: String(loc || '') })));
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

      const { data } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
        q.select('mode').order('mode')
      );

      const modes = Array.from(new Set(data?.map(item => item.mode).filter(Boolean) || []));
      setModeOptions(modes.sort().map(mode => ({ value: String(mode || ''), label: String(mode || '') })));
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

      const { data } = await selectWithFallback(TABLE_KEYS.transport, (q) =>
        q.select('vehicle_type').order('vehicle_type')
      );

      const vehicleTypes = Array.from(new Set(data?.map(item => item.vehicle_type).filter(Boolean) || []));
      setVehicleTypeOptions(vehicleTypes.sort().map(type => ({ value: String(type || ''), label: String(type || '') })));
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

      const { data } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
        q.select('carrier').order('carrier')
      );

      const carriers = Array.from(new Set(data?.map(item => item.carrier).filter(Boolean) || []));
      setCarrierOptions(carriers.sort().map(carrier => ({ value: String(carrier || ''), label: String(carrier || '') })));
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

      const { data } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
        q.select('service_type').order('service_type')
      );

      const serviceTypes = Array.from(new Set(data?.map(item => item.service_type).filter(Boolean) || []));
      setServiceTypeOptions(serviceTypes.sort().map(type => ({ value: String(type || ''), label: String(type || '') })));
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

      const { data } = await selectWithFallback(TABLE_KEYS.transport, (q) =>
        q.select('transport_vendor').order('transport_vendor')
      );

      const transportVendors = Array.from(new Set(data?.map(item => item.transport_vendor).filter(Boolean) || []));
      setTransportVendorOptions(transportVendors.sort().map(vendor => ({ value: String(vendor || ''), label: String(vendor || '') })));
    } catch (error) {
      console.error('Error loading transport vendor options:', error);
    } finally {
      setLoadingTransportVendors(false);
    }
  };

  const handleChange = (field: keyof CalculationInputs, value: any) => {
    onChange({ ...inputs, [field]: value });
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