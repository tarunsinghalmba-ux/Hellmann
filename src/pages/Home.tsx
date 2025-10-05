import React, { useState, useEffect } from 'react';
import { Crown, Users, Shield, Check, X, CreditCard as Edit2, Save, RotateCcw, Trash2, DollarSign, TrendingUp } from 'lucide-react';
import Header from '../components/Header';
import InputsCard from '../components/InputsCard';
import { ResultsThreeParts } from '../components/ResultsThreeParts';
import { calculateThreeParts, toCsv, type CalcInput, type CalcResult } from '../utils/calc3parts';
import { exportPdf3Parts } from '../utils/pdf3parts';
import { selectWithFallback, TABLE_KEYS } from '../lib/tableMap';
import type { CalculationInputs, Equipment } from '../types';

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
  lclCbm: 0,
  dangerousGoods: false,
  dropTrailer: false,
  heavyWeightSurcharge: false,
  viaTailgate: false,
  sideLoaderAccessFees: false,
  unpackLoose: false,
  unpackPalletized: false,
  fumigationSurcharge: false
};

export default function Home() {
  const [inputs, setInputs] = useState<CalculationInputs>(initialInputs);
  const [results, setResults] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sqlQueries, setSqlQueries] = useState<string[]>([]);
  const [consolidatedPrices, setConsolidatedPrices] = useState<ConsolidatedPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [usdToAudRate, setUsdToAudRate] = useState<number>(1.5);
  const [totalAudValue, setTotalAudValue] = useState<number>(0);

  useEffect(() => {
    loadConsolidatedPrices();
  }, []);

  const loadConsolidatedPrices = async () => {
    setLoadingPrices(true);
    try {
      const consolidated: ConsolidatedPrice[] = [];

      // Load Ocean Freight (USD -> AUD conversion)
      try {
        const { data: oceanData } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
          q.select('record_id,port_of_loading,port_of_discharge,direction,20gp,40gp_40hc,currency')
            .limit(100)
        );

        oceanData?.forEach(item => {
          const price20gp = parseFloat(item['20gp']) || 0;
          const price40gp = parseFloat(item['40gp_40hc']) || 0;

          if (price20gp > 0) {
            consolidated.push({
              id: `ocean-20gp-${item.record_id}`,
              source: 'Ocean',
              description: `Ocean Freight - ${item.port_of_loading} to ${item.port_of_discharge}`,
              originalPrice: price20gp,
              originalCurrency: item.currency || 'USD',
              audPrice: item.currency === 'USD' ? price20gp * usdToAudRate : price20gp,
              route: `${item.port_of_loading} → ${item.port_of_discharge}`,
              containerType: '20GP',
              direction: item.direction
            });
          }

          if (price40gp > 0) {
            consolidated.push({
              id: `ocean-40gp-${item.record_id}`,
              source: 'Ocean',
              description: `Ocean Freight - ${item.port_of_loading} to ${item.port_of_discharge}`,
              originalPrice: price40gp,
              originalCurrency: item.currency || 'USD',
              audPrice: item.currency === 'USD' ? price40gp * usdToAudRate : price40gp,
              route: `${item.port_of_loading} → ${item.port_of_discharge}`,
              containerType: '40GP/40HC',
              direction: item.direction
            });
          }
        });
      } catch (error) {
        console.error('Error loading ocean freight prices:', error);
      }

      // Load Local Charges (already in AUD)
      try {
        const { data: localData } = await selectWithFallback(TABLE_KEYS.local, (q) =>
          q.select('record_id,port_of_discharge,direction,charge_description,20gp,40gp_40hc,per_shipment_charge,currency')
            .limit(100)
        );

        localData?.forEach(item => {
          const price20gp = parseFloat(item['20gp']) || 0;
          const price40gp = parseFloat(item['40gp_40hc']) || 0;
          const perShipment = parseFloat(item.per_shipment_charge) || 0;

          if (price20gp > 0) {
            consolidated.push({
              id: `local-20gp-${item.record_id}`,
              source: 'Local',
              description: item.charge_description || 'Local Charge',
              originalPrice: price20gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price20gp,
              route: item.port_of_discharge,
              containerType: '20GP',
              direction: item.direction
            });
          }

          if (price40gp > 0) {
            consolidated.push({
              id: `local-40gp-${item.record_id}`,
              source: 'Local',
              description: item.charge_description || 'Local Charge',
              originalPrice: price40gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price40gp,
              route: item.port_of_discharge,
              containerType: '40GP/40HC',
              direction: item.direction
            });
          }

          if (perShipment > 0) {
            consolidated.push({
              id: `local-shipment-${item.record_id}`,
              source: 'Local',
              description: item.charge_description || 'Local Charge',
              originalPrice: perShipment,
              originalCurrency: item.currency || 'AUD',
              audPrice: perShipment,
              route: item.port_of_discharge,
              containerType: 'Per Shipment',
              direction: item.direction
            });
          }
        });
      } catch (error) {
        console.error('Error loading local charges:', error);
      }

      // Load Transport (already in AUD)
      try {
        const { data: transportData } = await selectWithFallback(TABLE_KEYS.transport, (q) =>
          q.select('record_id,pick_up_location,delivery_location,direction,charge_description,20gp,40gp_40hc,currency')
            .limit(100)
        );

        transportData?.forEach(item => {
          const price20gp = parseFloat(item['20gp']) || 0;
          const price40gp = parseFloat(item['40gp_40hc']) || 0;

          if (price20gp > 0) {
            consolidated.push({
              id: `transport-20gp-${item.record_id}`,
              source: 'Transport',
              description: item.charge_description || 'Transport',
              originalPrice: price20gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price20gp,
              route: item.direction === 'import' 
                ? `To ${item.delivery_location}` 
                : `From ${item.pick_up_location}`,
              containerType: '20GP',
              direction: item.direction
            });
          }

          if (price40gp > 0) {
            consolidated.push({
              id: `transport-40gp-${item.record_id}`,
              source: 'Transport',
              description: item.charge_description || 'Transport',
              originalPrice: price40gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price40gp,
              route: item.direction === 'import' 
                ? `To ${item.delivery_location}` 
                : `From ${item.pick_up_location}`,
              containerType: '40GP/40HC',
              direction: item.direction
            });
          }
        });
      } catch (error) {
        console.error('Error loading transport prices:', error);
      }

      // Sort by AUD price descending
      consolidated.sort((a, b) => b.audPrice - a.audPrice);

      // Calculate total AUD value
      const total = consolidated.reduce((sum, item) => sum + item.audPrice, 0);
      setTotalAudValue(total);
      setConsolidatedPrices(consolidated);
    } catch (error) {
      console.error('Error loading consolidated prices:', error);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    setSqlQueries([]); // Clear previous queries
    try {
      // Convert inputs to CalcInput format
      const calcInput: CalcInput = {
        direction: inputs.direction,
        pol: inputs.pol,
        pod: inputs.pod,
        suburb: inputs.point,
        fromDate: inputs.validityFrom,
        toDate: inputs.validityTo,
        qty20: inputs.qty20,
        qty40: inputs.qty40,
        qty40HC: inputs.qty40HC,
        lclCbm: inputs.lclCbm,
        mode: inputs.mode,
        vehicleType: inputs.vehicleType,
        carrier: inputs.carrier,
        transitTime: inputs.transitTime,
        serviceType: inputs.serviceType,
        transportVendor: inputs.transportVendor,
        dangerousGoods: inputs.dangerousGoods,
        dropTrailer: inputs.dropTrailer,
        heavyWeightSurcharge: inputs.heavyWeightSurcharge,
        viaTailgate: inputs.viaTailgate,
        sideLoaderAccessFees: inputs.sideLoaderAccessFees,
        unpackLoose: inputs.unpackLoose,
        unpackPalletized: inputs.unpackPalletized,
        sideloaderSamedayCollection: inputs.sideloaderSamedayCollection
      };
      
      const calculationResults = await calculateThreeParts(calcInput, setSqlQueries);
      setResults(calculationResults);
      setSqlQueries(calculationResults.sqlQueries);
    } catch (error) {
      console.error('Error calculating rates:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentFromQuantities = (inputs: CalculationInputs): Equipment => {
    if (inputs.qty20 > 0) return '20GP';
    if (inputs.qty40 > 0) return '40GP';
    if (inputs.qty40HC > 0) return '40HC';
    if (inputs.lclCbm > 0) return 'LCL';
    return '20GP'; // default
  };

  const getTotalQuantity = (inputs: CalculationInputs): number => {
    return inputs.qty20 + inputs.qty40 + inputs.qty40HC;
  };

  const handleExportCSV = () => {
    if (!results) return;
    (async () => {
      const csv = toCsv(results);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sea-freight-rates-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    })();
  };

  const handleExportPDF = async () => {
    if (!results) return;
    
    // Create equipment summary
    const equipmentParts = [];
    if (inputs.qty20 > 0) equipmentParts.push(`${inputs.qty20}x20GP`);
    if (inputs.qty40 > 0) equipmentParts.push(`${inputs.qty40}x40GP`);
    if (inputs.qty40HC > 0) equipmentParts.push(`${inputs.qty40HC}x40HC`);
    if (inputs.lclCbm > 0) equipmentParts.push(`${inputs.lclCbm}CBM`);
    const equipmentSummary = equipmentParts.join(', ') || 'No equipment';
    
    const meta = {
      direction: inputs.direction,
      pol: inputs.pol,
      pod: inputs.pod,
      suburb: inputs.point,
      fromDate: inputs.validityFrom,
      toDate: inputs.validityTo,
      equipment: equipmentSummary
    };
    await exportPdf3Parts(results, meta);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <InputsCard
              inputs={inputs}
              onChange={setInputs}
              onCalculate={handleCalculate}
              loading={loading}
            />
            
            {results && (
              <div className="mt-8">
                <ResultsThreeParts 
                  data={results}
                  emptyHints={[
                    'No USD ocean rates found for the selected POL/POD/equipment/validity.',
                    'No AUD local charges found (or none marked mandatory).',
                    'No AUD transport charges found for the selected suburb.',
                  ]}
                />
              </div>
            )}
            
          </div>

          <div>
            <div className="sticky top-8">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handleExportCSV}
                      disabled={loading || !results}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Export CSV
                    </button>
                    
                    <button
                      onClick={handleExportPDF}
                      disabled={loading || !results}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Export PDF
                    </button>
                  </div>
                  <div className="border-t pt-3">
                    <a
                      href="/explore"
                      className="block w-full text-center px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors duration-200"
                    >
                      Explore All Data
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>1. Select direction (Import/Export)</p>
                  <p>2. Choose ports and locations</p>
                  <p>3. Set validity dates</p>
                  <p>4. Enter container quantities</p>
                  <p>5. Click Calculate to get rates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}