import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, Database } from 'lucide-react';
import FiltersPanel from '../components/FiltersPanel';
import DataTable from '../components/DataTable';
import { exportFilteredDataToCSV } from '../utils/csv';
import { exportFilteredDataToPDF } from '../utils/pdf';
import { selectWithFallback, TABLE_KEYS } from '../lib/tableMap';
import type { FilterParams } from '../types';

interface CombinedData {
  id: string;
  source: 'Ocean' | 'Transport' | 'Local';
  direction: string;
  description: string;
  rate: number;
  currency: string;
  validity_start: string;
  validity_end: string;
  port?: string;
  origin_port?: string;
  destination_port?: string;
  pickup_location?: string;
  delivery_location?: string;
  container_type?: string;
  unit?: string;
  charge_code?: string;
  mode?: string;
  notes?: string;
}

export default function Explore() {
  const [filters, setFilters] = useState<FilterParams>({});
  const [data, setData] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const combinedData: CombinedData[] = [];

      // Load ocean freight rates
      try {
        const { data: oceanData } = await selectWithFallback(TABLE_KEYS.ocean, (q) => {
          let query = q.select('port_of_loading,port_of_discharge,direction,20gp,40gp_40hc,currency,effective_date,valid_until,carrier,mode,transit_time,service_type,dg');
          if (filters.direction) query = query.eq('direction', filters.direction);
          if (filters.pol) query = query.ilike('port_of_loading', `%${filters.pol}%`);
          if (filters.pod) query = query.ilike('port_of_discharge', `%${filters.pod}%`);
          if (filters.currency) query = query.eq('currency', filters.currency);
          if (filters.mode) query = query.eq('mode', filters.mode);
          if (filters.transit_time && parseInt(filters.transit_time) > 0) query = query.eq('transit_time', parseInt(filters.transit_time));
          if (filters.service_type) query = query.eq('service_type', filters.service_type);
          if (filters.dangerous_goods === true) {
            query = query.eq('dg', 'Yes');
          } else if (filters.dangerous_goods === false) {
            query = query.eq('dg', 'No');
          }
          if (filters.validity_start) query = query.gte('valid_until', filters.validity_start);
          if (filters.validity_end) query = query.lte('effective_date', filters.validity_end);
          return query.limit(500);
        });
      
        oceanData?.forEach(item => {
          combinedData.push({
            id: item.id,
            source: 'Ocean',
            direction: item.direction,
            description: `Ocean Freight - ${item.port_of_loading} to ${item.port_of_discharge}`,
            rate: parseFloat(item['20gp']) || 0,
            currency: item.currency,
            validity_start: item.effective_date,
            validity_end: item.valid_until,
            origin_port: item.port_of_loading,
            destination_port: item.port_of_discharge,
            container_type: '20GP',
           mode: item.mode,
            notes: [item.carrier && `Carrier: ${item.carrier}`, item.transit_time && `Transit: ${item.transit_time}`, item.service_type && `Service: ${item.service_type}`, item.dg && `DG: ${item.dg}`].filter(Boolean).join(' | ') || undefined
          });
        });
      } catch (error) {
        console.error('Error loading ocean freight data:', error);
      }

      // Load transport pricing
      try {
        const { data: transportData } = await selectWithFallback(TABLE_KEYS.transport, (q) => {
          let query = q.select('*');
          if (filters.direction) query = query.eq('direction', filters.direction);
          if (filters.pickup_location) query = query.ilike('pick_up_location', `%${filters.pickup_location}%`);
          if (filters.delivery_location) query = query.ilike('delivery_location', `%${filters.delivery_location}%`);
          if (filters.currency) query = query.eq('currency', filters.currency);
          if (filters.drop_trailer === true) {
            query = query.not('drop_trailer', 'is', null);
          }
          if (filters.heavy_weight_surcharge === true) {
            query = query.not('heavy_weight_surcharge', 'is', null);
          }
          if (filters.via_tailgate === true) {
            query = query.not('tail_gate', 'is', null);
          }
          if (filters.side_loader_access_fees === true) {
            query = query.not('side_loader_access_fees', 'is', null);
          }
          if (filters.validity_start) query = query.gte('valid_until', filters.validity_start);
          if (filters.validity_end) query = query.lte('effective_date', filters.validity_end);
          return query.limit(500);
        });
      
        transportData?.forEach(item => {
          const locationDesc = item.direction === 'import' 
            ? `To ${item.delivery_location || 'Unknown'}`
            : `From ${item.pick_up_location || 'Unknown'}`;
          
          // Calculate additional charges
          const baseRate = parseFloat(item['20gp']) || 0;
          const dropTrailerCharge = filters.drop_trailer ? (parseFloat(item.drop_trailer) || 0) : 0;
          const heavyWeightCharge = filters.heavy_weight_surcharge ? (parseFloat(item.heavy_weight_surcharge) || 0) : 0;
          const tailgateCharge = filters.via_tailgate ? (parseFloat(item.tail_gate) || 0) : 0;
          const sideLoaderCharge = filters.side_loader_access_fees ? (parseFloat(item.side_loader_access_fees) || 0) : 0;
          const totalRate = baseRate + dropTrailerCharge + heavyWeightCharge + tailgateCharge + sideLoaderCharge;
        
          combinedData.push({
            id: item.id,
            source: 'Transport',
            direction: item.direction,
            description: `Transport - ${locationDesc}`,
            rate: totalRate,
            currency: item.currency,
            validity_start: item.effective_date,
            validity_end: item.valid_until,
            pickup_location: item.pick_up_location,
            delivery_location: item.delivery_location,
            container_type: '20GP',
            unit: 'PER_CONTAINER',
            notes: [
              item.terms_and_conditions ? `Terms: ${item.terms_and_conditions}` : null,
              dropTrailerCharge > 0 ? `Drop Trailer: ${item.currency} ${dropTrailerCharge.toFixed(2)}` : null,
              heavyWeightCharge > 0 ? `Heavy Weight: ${item.currency} ${heavyWeightCharge.toFixed(2)}` : null,
              tailgateCharge > 0 ? `Tailgate: ${item.currency} ${tailgateCharge.toFixed(2)}` : null,
              sideLoaderCharge > 0 ? `Side Loader: ${item.currency} ${sideLoaderCharge.toFixed(2)}` : null
            ].filter(Boolean).join(' | ') || undefined
          });
        });
      } catch (error) {
        console.error('Error loading transport data:', error);
      }

      // Load local charges
      try {
        const { data: localData } = await selectWithFallback(TABLE_KEYS.local, (q) => {
          let query = q.select('*,dg_surcharge');
          if (filters.direction) query = query.eq('direction', filters.direction);
          if (filters.port) query = query.ilike('port_of_loading', `%${filters.port}%`);
          if (filters.currency) query = query.eq('currency', filters.currency);
          if (filters.charge_code) query = query.ilike('cw1_charge_code', `%${filters.charge_code}%`);
          if (filters.dangerous_goods === true) {
            query = query.not('dg_surcharge', 'is', null);
          }
          if (filters.validity_start) query = query.gte('valid_until', filters.validity_start);
          if (filters.validity_end) query = query.lte('effective_date', filters.validity_end);
          return query.limit(500);
        });
      
        localData?.forEach(item => {
          const baseRate = parseFloat(item['20gp']) || 0;
          const dgSurcharge = filters.dangerous_goods === true ? (parseFloat(item.dg_surcharge) || 0) : 0;
          const totalRate = baseRate + dgSurcharge;
          
          combinedData.push({
            id: item.id,
            source: 'Local',
            direction: item.direction,
            description: item.charge_description,
            rate: totalRate,
            currency: item.currency,
            validity_start: item.effective_date,
            validity_end: item.valid_until,
            port: item.port_of_loading,
            container_type: '20GP',
            unit: 'PER_CONTAINER',
            charge_code: item.cw1_charge_code,
            notes: [
              item.cw1_charge_code ? `Code: ${item.cw1_charge_code}` : null,
              dgSurcharge > 0 ? `DG Surcharge: ${item.currency} ${dgSurcharge.toFixed(2)}` : null
            ].filter(Boolean).join(' | ') || undefined
          });
        });
      } catch (error) {
        console.error('Error loading local charges data:', error);
      }

      // Sort by source, then by description
      combinedData.sort((a, b) => {
        if (a.source !== b.source) {
          return a.source.localeCompare(b.source);
        }
        return a.description.localeCompare(b.description);
      });

      setData(combinedData);
    } catch (error) {
      console.error('Error loading data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleExportCSV = () => {
    exportFilteredDataToCSV(data, 'sea-freight-data');
  };

  const handleExportPDF = () => {
    exportFilteredDataToPDF(data, 'Sea Freight Data');
  };

  const columns = [
    { key: 'source', title: 'Source', width: '80px' },
    { key: 'direction', title: 'Direction', width: '90px' },
    { key: 'description', title: 'Description', width: '300px' },
    { key: 'container_type', title: 'Type', width: '70px' },
    { key: 'unit', title: 'Unit', width: '120px' },
    { key: 'mode', title: 'Mode', width: '100px' },
    { 
      key: 'rate', 
      title: 'Rate',
      width: '100px',
      render: (value: number, record: CombinedData) => `${record.currency} ${value.toFixed(2)}`
    },
    { key: 'validity_start', title: 'Valid From', width: '110px' },
    { key: 'validity_end', title: 'Valid To', width: '110px' },
    { 
      key: 'location', 
      title: 'Location/Port',
      width: '150px',
      render: (value: any, record: CombinedData) => {
        if (record.source === 'Ocean') {
          return `${record.origin_port} → ${record.destination_port}`;
        } else if (record.source === 'Transport') {
          return record.pickup_location || record.delivery_location || '-';
        } else {
          return record.port || '-';
        }
      }
    },
    { key: 'charge_code', title: 'Code', width: '80px' },
    { key: 'notes', title: 'Notes', width: '150px' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/Logo Hellmann Worldwide Logistics RGB.png" 
                alt="Hellmann Worldwide Logistics" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Data Explorer</h1>
                <p className="text-sm text-gray-600">Browse and filter all freight data</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors duration-200"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors duration-200"
                >
                  Export PDF
                </button>
              </div>
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Calculator
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <div className="w-80 flex-shrink-0">
            <FiltersPanel
              filters={filters}
              onChange={setFilters}
              onReset={handleResetFilters}
            />
          </div>

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {loading ? 'Loading...' : `${data.length} records found`}
                </span>
              </div>
            </div>

            <DataTable
              data={data}
              columns={columns}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}