import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FilterParams } from '../types';

interface FiltersPanelProps {
  filters: FilterParams;
  onChange: (filters: FilterParams) => void;
  onReset: () => void;
}

export default function FiltersPanel({ filters, onChange, onReset }: FiltersPanelProps) {
  console.log('🔥🔥🔥 FiltersPanel COMPONENT MOUNTED 🔥🔥🔥');

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

  const loadFilterOptions = async () => {
    console.log('🚀🚀🚀 NEW VERSION LOADED - DIRECT SUPABASE QUERIES 🚀🚀🚀');
    
    try {
      const ports = new Set<string>();
      const locations = new Set<string>();
      const currencies = new Set<string>();
      const chargeCodes = new Set<string>();
      const modes = new Set<string>();
      const serviceTypes = new Set<string>();
      const carriers = new Set<string>();
      const vehicleTypes = new Set<string>();

      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return;
      }

      // TEST: First get the total count
      const { count: totalCount, error: countError } = await supabase
        .from('ocean_freight')
        .select('*', { count: 'exact', head: true });

      console.log('📊 Total records in ocean_freight table:', totalCount);
      if (countError) console.error('❌ Count error:', countError);

      // Helper function with detailed logging
      const fetchAllRecordsDirect = async (
        tableName: string,
        selectFields: string,
        batchSize = 1000
      ) => {
        let allData: any[] = [];
        let start = 0;
        let hasMore = true;
        let batchNumber = 1;

        while (hasMore && batchNumber <= 10) {
          const end = start + batchSize - 1;
          console.log(`\n📦 Batch ${batchNumber}: Fetching ${tableName} range [${start}, ${end}]`);
          
          const { data, error, count } = await supabase
            .from(tableName)
            .select(selectFields, { count: 'exact' })
            .range(start, end);

          if (error) {
            console.error(`❌ Error fetching ${tableName}:`, error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            break;
          }

          const fetchedCount = data?.length || 0;
          console.log(`✅ Batch ${batchNumber} result: ${fetchedCount} records`);
          console.log(`   Total count from query: ${count}`);
          console.log(`   Cumulative records: ${allData.length + fetchedCount}`);

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            start += batchSize;
            hasMore = data.length === batchSize;
            batchNumber++;
            
            if (data.length < batchSize) {
              console.log(`🏁 Last batch detected (${data.length} < ${batchSize})`);
            }
          } else {
            console.log('🛑 No more data to fetch');
            hasMore = false;
          }
        }

        console.log(`\n✅ Total ${tableName} records fetched: ${allData.length}\n`);
        return allData;
      };

      // Try ocean_freight first, then fall back to ocean_freight_rates
      console.log('=== FETCHING OCEAN DATA ===');
      let oceanData: any[] = [];
      try {
        oceanData = await fetchAllRecordsDirect(
          'ocean_freight',
          'port_of_loading, port_of_discharge, currency, mode, service_type, carrier'
        );
      } catch (e) {
        console.log('⚠️ ocean_freight failed, trying ocean_freight_rates...');
        try {
          oceanData = await fetchAllRecordsDirect(
            'ocean_freight_rates',
            'port_of_loading, port_of_discharge, currency, mode, service_type, carrier'
          );
        } catch (e2) {
          console.error('❌ Both ocean tables failed');
        }
      }

      console.log(`\n🎯 Processing ${oceanData.length} ocean records...`);

      oceanData.forEach((item: any) => {
        const trimmedPOL = String(item.port_of_loading || '').trim();
        const trimmedPOD = String(item.port_of_discharge || '').trim();
        const trimmedCurrency = String(item.currency || '').trim();
        const trimmedMode = String(item.mode || '').trim();
        const trimmedServiceType = String(item.service_type || '').trim();
        const trimmedCarrier = String(item.carrier || '').trim();

        if (trimmedPOL) ports.add(trimmedPOL);
        if (trimmedPOD) ports.add(trimmedPOD);
        if (trimmedCurrency) currencies.add(trimmedCurrency);
        if (trimmedMode) modes.add(trimmedMode);
        if (trimmedServiceType) serviceTypes.add(trimmedServiceType);
        if (trimmedCarrier) carriers.add(trimmedCarrier);
      });

      console.log(`Unique ports after ocean: ${ports.size}`);

      // Fetch local charges
      console.log('\n=== FETCHING LOCAL CHARGES ===');
      let localData: any[] = [];
      try {
        localData = await fetchAllRecordsDirect(
          'local',
          'port_of_discharge, currency, cw1_charge_code'
        );
      } catch (e) {
        console.log('⚠️ local failed, trying local_charges...');
        try {
          localData = await fetchAllRecordsDirect(
            'local_charges',
            'port_of_discharge, currency, cw1_charge_code'
          );
        } catch (e2) {
          console.error('❌ Both local tables failed');
        }
      }

      console.log(`\n🎯 Processing ${localData.length} local charge records...`);

      localData.forEach((item: any) => {
        const trimmedPOD = String(item.port_of_discharge || '').trim();
        const trimmedCurrency = String(item.currency || '').trim();
        const trimmedChargeCode = String(item.cw1_charge_code || '').trim();

        if (trimmedPOD) ports.add(trimmedPOD);
        if (trimmedCurrency) currencies.add(trimmedCurrency);
        if (trimmedChargeCode) chargeCodes.add(trimmedChargeCode);
      });

      console.log(`Unique ports after local charges: ${ports.size}`);

      // Fetch transport data
      console.log('\n=== FETCHING TRANSPORT DATA ===');
      let transportData: any[] = [];
      try {
        transportData = await fetchAllRecordsDirect(
          'transport',
          'pick_up_location, delivery_location, currency, vehicle_type'
        );
      } catch (e) {
        console.log('⚠️ transport failed, trying transport_pricing...');
        try {
          transportData = await fetchAllRecordsDirect(
            'transport_pricing',
            'pick_up_location, delivery_location, currency, vehicle_type'
          );
        } catch (e2) {
          console.error('❌ Both transport tables failed');
        }
      }

      console.log(`\n🎯 Processing ${transportData.length} transport records...`);

      transportData.forEach((item: any) => {
        const trimmedPickup = String(item.pick_up_location || '').trim();
        const trimmedDelivery = String(item.delivery_location || '').trim();
        const trimmedCurrency = String(item.currency || '').trim();
        const trimmedVehicleType = String(item.vehicle_type || '').trim();

        if (trimmedPickup) locations.add(trimmedPickup);
        if (trimmedDelivery) locations.add(trimmedDelivery);
        if (trimmedCurrency) currencies.add(trimmedCurrency);
        if (trimmedVehicleType) vehicleTypes.add(trimmedVehicleType);
      });

      const portsList = Array.from(ports).sort();

      console.log('\n' + '='.repeat(50));
      console.log('🎉 FINAL RESULTS');
      console.log('='.repeat(50));
      console.log(`📊 Total ocean records: ${oceanData.length} (expected ~6228)`);
      console.log(`📊 Total local records: ${localData.length}`);
      console.log(`📊 Total transport records: ${transportData.length}`);
      console.log(`🚢 Total unique ports: ${portsList.length} (expected 399)`);
      console.log(`🚂 Total modes: ${modes.size}`);
      console.log(`🚚 Total carriers: ${carriers.size}`);
      console.log(`📍 Total locations: ${locations.size}`);
      console.log(`\n📋 First 10 ports:`, portsList.slice(0, 10));
      console.log(`📋 Last 10 ports:`, portsList.slice(-10));
      console.log('='.repeat(50) + '\n');

      const newOptions = {
        directions: ['import', 'export'],
        ports: portsList,
        locations: Array.from(locations).sort(),
        containerTypes: ['20GP', '40GP', '40HC', 'LCL'],
        currencies: Array.from(currencies).sort(),
        chargeCodes: Array.from(chargeCodes).sort(),
        units: ['PER_SHIPMENT', 'PER_CONTAINER', 'PER_CBM'],
        modes: Array.from(modes).sort(),
        serviceTypes: Array.from(serviceTypes).sort(),
        carriers: Array.from(carriers).sort(),
        vehicleTypes: Array.from(vehicleTypes).sort(),
      };

      console.log(`✅ Setting options with ${newOptions.ports.length} ports`);
      setOptions(newOptions);
      console.log('✅ Options state updated successfully!');
    } catch (error) {
      console.error('❌ Error loading filter options:', error);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Port of Loading ({options.ports.length} ports)
          </label>
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