import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { selectWithFallback, TABLE_KEYS } from '../lib/tableMap';
import type { FilterParams } from '../types';

interface FiltersPanelProps {
  filters: FilterParams;
  onChange: (filters: FilterParams) => void;
  onReset: () => void;
}

export default function FiltersPanel({ filters, onChange, onReset }: FiltersPanelProps) {
  const [options, setOptions] = useState<{
    directions: string[];
    ports: string[];
    locations: string[];
    containerTypes: string[];
    currencies: string[];
    chargeCodes: string[];
    units: string[];
    modes: string[];
    serviceTypes: string[];
    carriers: string[];
    vehicleTypes: string[];
  }>({
    directions: ['import', 'export'],
    ports: [],
    locations: [],
    containerTypes: ['20GP', '40GP', '40HC', 'LCL'],
    currencies: [],
    chargeCodes: [],
    units: ['PER_SHIPMENT', 'PER_CONTAINER', 'PER_CBM'],
    modes: [],
    serviceTypes: [],
    carriers: [],
    vehicleTypes: [],
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Load ocean freight data
      const { data: oceanRates } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
        q.select('port_of_loading, port_of_discharge, currency, mode, service_type, transit_time, carrier')
      );
      
      // Load local charges data
      const { data: localCharges } = await selectWithFallback(TABLE_KEYS.local, (q) =>
        q.select('port_of_discharge, currency, cw1_charge_code')
      );
      
      // Load transport data
      const { data: transport } = await selectWithFallback(TABLE_KEYS.transport, (q) =>
        q.select('pick_up_location, delivery_location, currency, vehicle_type')
      );

      const ports = new Set<string>();
      const locations = new Set<string>();
      const currencies = new Set<string>();
      const chargeCodes = new Set<string>();
      const modes = new Set<string>();
      const serviceTypes = new Set<string>();
      const carriers = new Set<string>();
      const vehicleTypes = new Set<string>();

      // Process ocean freight data
      oceanRates?.forEach(item => {
        if (item.port_of_loading && String(item.port_of_loading || '').trim()) ports.add(String(item.port_of_loading || ''));
        if (item.port_of_discharge && String(item.port_of_discharge || '').trim()) ports.add(String(item.port_of_discharge || ''));
        if (item.currency && String(item.currency || '').trim()) currencies.add(String(item.currency || ''));
        if (item.mode && String(item.mode || '').trim()) modes.add(String(item.mode || ''));
        if (item.service_type && String(item.service_type || '').trim()) serviceTypes.add(String(item.service_type || ''));
        if (item.carrier && String(item.carrier || '').trim()) carriers.add(String(item.carrier || ''));
      });

      // Process local charges data
      localCharges?.forEach(item => {
        if (item.port_of_discharge && String(item.port_of_discharge || '').trim()) ports.add(String(item.port_of_discharge || ''));
        if (item.currency && String(item.currency || '').trim()) currencies.add(String(item.currency || ''));
        if (item.cw1_charge_code && String(item.cw1_charge_code || '').trim()) chargeCodes.add(String(item.cw1_charge_code || ''));
      });

      // Process transport data
      transport?.forEach(item => {
        if (item.pick_up_location && String(item.pick_up_location || '').trim()) locations.add(String(item.pick_up_location || ''));
        if (item.delivery_location && String(item.delivery_location || '').trim()) locations.add(String(item.delivery_location || ''));
        if (item.currency && String(item.currency || '').trim()) currencies.add(String(item.currency || ''));
        if (item.vehicle_type && String(item.vehicle_type || '').trim()) vehicleTypes.add(String(item.vehicle_type || ''));
      });

      setOptions({
        directions: ['import', 'export'],
        ports: Array.from(ports).sort(),
        locations: Array.from(locations).sort(),
        containerTypes: ['20GP', '40GP', '40HC', 'LCL'],
        currencies: Array.from(currencies).sort(),
        chargeCodes: Array.from(chargeCodes).sort(),
        units: ['PER_SHIPMENT', 'PER_CONTAINER', 'PER_CBM'],
        modes: Array.from(modes).sort(),
        serviceTypes: Array.from(serviceTypes).sort(),
        carriers: Array.from(carriers).sort(),
        vehicleTypes: Array.from(vehicleTypes).sort(),
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof FilterParams, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const handleBooleanFilterChange = (key: keyof FilterParams, value: boolean) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v.length > 0).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
        <select
          value={filters.mode || ''}
          onChange={(e) => handleFilterChange('mode', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All</option>
          {options.modes.map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
          <select
            value={filters.direction || ''}
            onChange={(e) => handleFilterChange('direction', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {options.directions.map(direction => (
              <option key={direction} value={direction}>
                {direction.charAt(0).toUpperCase() + direction.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Port of Loading</label>
          <select
            value={filters.pol || ''}
            onChange={(e) => handleFilterChange('pol', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any port</option>
            {options.ports.map(port => (
              <option key={port} value={port}>{port}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Port of Discharge</label>
          <select
            value={filters.pod || ''}
            onChange={(e) => handleFilterChange('pod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any port</option>
            {options.ports.map(port => (
              <option key={port} value={port}>{port}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Local Port</label>
          <select
            value={filters.port || ''}
            onChange={(e) => handleFilterChange('port', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any port</option>
            {options.ports.map(port => (
              <option key={port} value={port}>{port}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
          <select
            value={filters.pickup_location || ''}
            onChange={(e) => handleFilterChange('pickup_location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any location</option>
            {options.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
          <select
            value={filters.delivery_location || ''}
            onChange={(e) => handleFilterChange('delivery_location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any location</option>
            {options.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Container Type</label>
          <select
            value={filters.container_type || ''}
            onChange={(e) => handleFilterChange('container_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {options.containerTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={filters.currency || ''}
            onChange={(e) => handleFilterChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {options.currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
          <select
            value={filters.carrier || ''}
            onChange={(e) => handleFilterChange('carrier', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any carrier</option>
            {options.carriers.map(carrier => (
              <option key={carrier} value={carrier}>{carrier}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
          <select
            value={filters.vehicle_type || ''}
            onChange={(e) => handleFilterChange('vehicle_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any vehicle type</option>
            {options.vehicleTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
          <select
            value={filters.service_type || ''}
            onChange={(e) => handleFilterChange('service_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any service type</option>
            {options.serviceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Charge Code</label>
          <select
            value={filters.charge_code || ''}
            onChange={(e) => handleFilterChange('charge_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any charge code</option>
            {options.chargeCodes.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select
            value={filters.unit || ''}
            onChange={(e) => handleFilterChange('unit', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {options.units.map(unit => (
              <option key={unit} value={unit}>{unit.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
            <input
              type="date"
              value={filters.validity_start || ''}
              onChange={(e) => handleFilterChange('validity_start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
            <input
              type="date"
              value={filters.validity_end || ''}
              onChange={(e) => handleFilterChange('validity_end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.dangerous_goods || false}
              onChange={(e) => handleBooleanFilterChange('dangerous_goods', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Dangerous Goods</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.drop_trailer || false}
              onChange={(e) => handleBooleanFilterChange('drop_trailer', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Drop Trailer</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.heavy_weight_surcharge || false}
              onChange={(e) => handleBooleanFilterChange('heavy_weight_surcharge', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Heavy Weight Surcharge</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.via_tailgate || false}
              onChange={(e) => handleBooleanFilterChange('via_tailgate', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Via Tailgate</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.side_loader_access_fees || false}
              onChange={(e) => handleBooleanFilterChange('side_loader_access_fees', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Side Loader Access Fees</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.unpack_loose || false}
              onChange={(e) => handleBooleanFilterChange('unpack_loose', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Unpack Loose</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.unpack_palletized || false}
              onChange={(e) => handleBooleanFilterChange('unpack_palletized', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Unpack Palletized</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.fumigation_surcharge || false}
              onChange={(e) => handleBooleanFilterChange('fumigation_surcharge', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Fumigation Surcharge AU</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.sideloader_sameday_collection || false}
              onChange={(e) => handleBooleanFilterChange('sideloader_sameday_collection', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Sideloader Sameday Collection</span>
          </label>
        </div>

      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-200 font-medium"
        >
          <X className="h-4 w-4" />
          Reset All Filters
        </button>
      </div>
    </div>
  );
}