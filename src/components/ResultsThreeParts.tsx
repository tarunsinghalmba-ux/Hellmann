import React from 'react';
import { Calculator, DollarSign } from 'lucide-react';
import type { CalcResult } from '../utils/calc3parts';

const Money: React.FC<{ value: number; currency: string }> = ({ value, currency }) => (
  <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0)}</span>
);

const SummaryPanel: React.FC<{ data: CalcResult; usdToAudRate: number }> = ({ data, usdToAudRate }) => {
  const oceanUSDTotal = data.oceanUSD.subtotal;
  const oceanAUDTotal = oceanUSDTotal * usdToAudRate;
  const localsAUDTotal = data.localsAUD.subtotal;
  const deliveryAUDTotal = data.deliveryAUD.subtotal;
  const netTotalAUD = oceanAUDTotal + localsAUDTotal + deliveryAUDTotal;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Calculation Summary</h2>
        <div className="flex items-center gap-2 ml-auto">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">
            USD to AUD Rate: {usdToAudRate.toFixed(4)}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Ocean Freight</div>
          <div className="text-sm text-gray-500 mb-2">
            <Money value={oceanUSDTotal} currency="USD" /> → <Money value={oceanAUDTotal} currency="AUD" />
          </div>
          <div className="text-lg font-bold text-blue-600">
            <Money value={oceanAUDTotal} currency="AUD" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-emerald-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Local Charges</div>
          <div className="text-sm text-gray-500 mb-2">Already in AUD</div>
          <div className="text-lg font-bold text-emerald-600">
            <Money value={localsAUDTotal} currency="AUD" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-amber-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Transport</div>
          <div className="text-sm text-gray-500 mb-2">Already in AUD</div>
          <div className="text-lg font-bold text-amber-600">
            <Money value={deliveryAUDTotal} currency="AUD" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Net Total</div>
          <div className="text-sm text-gray-500 mb-2">All costs in AUD</div>
          <div className="text-2xl font-bold text-green-700">
            <Money value={netTotalAUD} currency="AUD" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Ocean Freight (converted from USD):</span>
            <span><Money value={oceanAUDTotal} currency="AUD" /></span>
          </div>
          <div className="flex justify-between">
            <span>Local Charges (AUD):</span>
            <span><Money value={localsAUDTotal} currency="AUD" /></span>
          </div>
          <div className="flex justify-between">
            <span>Transport (AUD):</span>
            <span><Money value={deliveryAUDTotal} currency="AUD" /></span>
          </div>
          <div className="border-t border-gray-200 pt-1 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total (AUD):</span>
              <span><Money value={netTotalAUD} currency="AUD" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export const ResultsThreeParts: React.FC<{ data: CalcResult; emptyHints?: string[] }> = ({ data, emptyHints = [] }) => {
  // Default USD to AUD conversion rate - in a real app, this would come from an API
  const usdToAudRate = 1.52; // You can make this dynamic later

  const cards: Array<{ key: keyof CalcResult; accent: string }> = [
    { key: 'oceanUSD', accent: 'border-blue-500' },
    { key: 'localsAUD', accent: 'border-emerald-500' },
    { key: 'deliveryAUD', accent: 'border-amber-500' },
  ];

  return (
    <div className="grid gap-4">
      <SummaryPanel data={data} usdToAudRate={usdToAudRate} />
      {cards.map(({ key, accent }) => {
        const s = data[key];
        const empty = !s.items.length;
        return (
          <div key={key} className={`rounded-2xl border-2 p-6 shadow-sm bg-white ${accent}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                {s.subtitle && <p className="text-sm text-gray-600">{s.subtitle}</p>}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  <Money value={s.subtotal} currency={s.currency} />
                </div>
              </div>
            </div>
            {empty ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">{emptyHints.shift() ?? 'No matching rows for this section.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Description</th>
                      <th className="py-2 pr-4 font-medium">Unit</th>
                      <th className="py-2 pr-4 font-medium text-right">Qty</th>
                      <th className="py-2 pr-4 font-medium text-right">Rate</th>
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 pr-4">
                          {i.label}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{i.unit ?? ''}</td>
                        <td className="py-2 pr-4 text-right">{i.qty}</td>
                        <td className="py-2 pr-4 text-right"><Money value={i.rate} currency={s.currency} /></td>
                        <td className="py-2 font-medium text-right"><Money value={i.total} currency={s.currency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};