import React from 'react';
import type { CalcResult } from '../utils/calc3parts';

const Money: React.FC<{ value: number; currency: string }> = ({ value, currency }) => (
  <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0)}</span>
);

export const ResultsThreeParts: React.FC<{ data: CalcResult; emptyHints?: string[] }> = ({ data, emptyHints = [] }) => {
  const cards: Array<{ key: keyof CalcResult; accent: string }> = [
    { key: 'oceanUSD', accent: 'border-blue-500' },
    { key: 'localsAUD', accent: 'border-emerald-500' },
    { key: 'deliveryAUD', accent: 'border-amber-500' },
  ];

  return (
    <div className="grid gap-4">
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
                          {i.extra ? <span className="ml-2 text-xs text-gray-400">({i.extra})</span> : null}
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