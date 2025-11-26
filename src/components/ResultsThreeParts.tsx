import React from 'react';
import { Calculator, DollarSign, Calendar } from 'lucide-react';
import type { CalcResult } from '../utils/calc3parts';

const Money: React.FC<{ value: number; currency: string }> = ({ value, currency }) => (
  <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0)}</span>
);

const SummaryPanel: React.FC<{ data: CalcResult }> = ({ data }) => {
  const USD_TO_AUD_RATE = 1.52; // Same rate as used in calculation
  const oceanUSDTotal = data.oceanUSD.subtotal;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Calculation Summary</h2>
        <div className="flex items-center gap-2 ml-4">
          <Calendar className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Valid: {new Date(data.validityPeriod.from).toLocaleDateString()} - {new Date(data.validityPeriod.to).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">
            USD to AUD Rate: {USD_TO_AUD_RATE.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Ocean Freight</div>
          <div className="text-sm text-gray-500 mb-2">
            <Money value={oceanUSDTotal} currency="USD" /> → <Money value={data.summary.items[0].amount} currency="AUD" />
          </div>
          <div className="text-lg font-bold text-blue-600">
            <Money value={data.summary.items[0].amount} currency={data.summary.currency} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-emerald-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Local Charges</div>
          <div className="text-sm text-gray-500 mb-2">Already in AUD</div>
          <div className="text-lg font-bold text-emerald-600">
            <Money value={data.summary.items[1].amount} currency={data.summary.currency} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-amber-100">
          <div className="text-sm font-medium text-gray-600 mb-1">Transport</div>
          <div className="text-sm text-gray-500 mb-2">Already in AUD</div>
          <div className="text-lg font-bold text-amber-600">
            <Money value={data.summary.items[2].amount} currency={data.summary.currency} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Grand Total</div>
          <div className="text-sm text-gray-500 mb-2">All costs in AUD</div>
          <div className="text-2xl font-bold text-green-700">
            <Money value={data.summary.grandTotal} currency={data.summary.currency} />
          </div>
        </div>
      </div>
    </div>
  );
};
export const ResultsThreeParts: React.FC<{ data: CalcResult; emptyHints?: string[] }> = ({ data, emptyHints = [] }) => {
  // Check if we have any results to show
  const hasResults = data.oceanUSD.items.length > 0 || data.localsAUD.items.length > 0 || data.deliveryAUD.items.length > 0;

  // If no results at all, show a message
  if (!hasResults) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500 mb-4">
          <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600">
            No matching rates found for the selected criteria and validity dates.
            Please try adjusting your search parameters or date range.
          </p>
        </div>
      </div>
    );
  }

  const cards: Array<{ key: keyof CalcResult; accent: string }> = [
    { key: 'oceanUSD', accent: 'border-blue-500' },
    { key: 'localsAUD', accent: 'border-emerald-500' },
    { key: 'deliveryAUD', accent: 'border-amber-500' },
  ];

  return (
    <div className="grid gap-4">
      <SummaryPanel data={data} />
      {cards.map(({ key, accent }) => {
        const s = data[key];
        const empty = !s.items.length;

        // Don't render empty sections
        if (empty) {
          return null;
        }

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
          </div>
        );
      })}
    </div>
  );
};