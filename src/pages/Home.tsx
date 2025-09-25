import React, { useState } from 'react';
import { Anchor } from 'lucide-react';
import InputsCard from '../components/InputsCard';
import { ResultsThreeParts } from '../components/ResultsThreeParts';
import { calculateThreeParts, toCsv, type CalcInput, type CalcResult } from '../utils/calc3parts';
import { exportPdf3Parts } from '../utils/pdf3parts';
import type { CalculationInputs, Equipment } from '../types';

const initialInputs: CalculationInputs = {
  direction: 'export',
  pol: '',
  pod: '',
  point: '',
  validityFrom: new Date().toISOString().split('T')[0],
  validityTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    const csv = toCsv(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sea-freight-rates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!results) return;
    const meta = {
      direction: inputs.direction,
      pol: inputs.pol,
      pod: inputs.pod,
      suburb: inputs.point,
      fromDate: inputs.validityFrom,
      toDate: inputs.validityTo,
      qty20: inputs.qty20,
      qty40: inputs.qty40,
      qty40HC: inputs.qty40HC,
      lclCbm: inputs.lclCbm
    };
    exportPdf3Parts(results, meta);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="/Logo Hellmann Worldwide Logistics RGB copy.png" 
              alt="Hellmann Worldwide Logistics" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sea Freight Calculator</h1>
              <p className="text-sm text-gray-600">Sea Freight Calculator</p>
            </div>
          </div>
        </div>
      </div>

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