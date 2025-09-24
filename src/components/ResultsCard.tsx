import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { CalculationResult } from '../types';

interface ResultsCardProps {
  results: CalculationResult[];
}

interface CategorySectionProps {
  title: string;
  items: any[];
  subtotal: number;
  currency: string;
  isOpen: boolean;
  onToggle: () => void;
}

function CategorySection({ title, items, subtotal, currency, isOpen, onToggle }: CategorySectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h4 className="font-medium text-gray-900">{title}</h4>
          <span className="text-sm text-gray-500">({items.length} items)</span>
        </div>
        <span className="font-semibold text-gray-900">
          {currency} {subtotal.toFixed(2)}
        </span>
      </div>
      
      {isOpen && (
        <div className="border-t border-gray-200 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-100">
                    <td className="py-2">
                      <div>
                        {item.description}
                        {item.notes && (
                          <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2">{item.containerType || '-'}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{currency} {item.rate.toFixed(2)}</td>
                    <td className="text-right py-2 font-medium">{currency} {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsCard({ results }: ResultsCardProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  if (!results.length) return null;

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasMultipleCurrencies = results.length > 1;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Calculation Results</h3>
      
      {hasMultipleCurrencies && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Multiple currencies detected. Totals are shown per currency without conversion.
            </span>
          </div>
        </div>
      )}

      {results.map((result, index) => (
        <div key={`${result.currency}-${index}`} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              Currency: {result.currency}
            </h4>
            <div className="text-right">
              <div className="text-sm text-gray-500">Grand Total</div>
              <div className="text-2xl font-bold text-blue-600">
                {result.currency} {result.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <CategorySection
            title="Ocean Freight"
            items={result.ocean.items}
            subtotal={result.ocean.subtotal}
            currency={result.currency}
            isOpen={openSections[`ocean-${result.currency}`] || false}
            onToggle={() => toggleSection(`ocean-${result.currency}`)}
          />

          <CategorySection
            title="Transport"
            items={result.transport.items}
            subtotal={result.transport.subtotal}
            currency={result.currency}
            isOpen={openSections[`transport-${result.currency}`] || false}
            onToggle={() => toggleSection(`transport-${result.currency}`)}
          />

          <CategorySection
            title="Local Charges"
            items={result.local.items}
            subtotal={result.local.subtotal}
            currency={result.currency}
            isOpen={openSections[`local-${result.currency}`] || false}
            onToggle={() => toggleSection(`local-${result.currency}`)}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-blue-900">Grand Total:</span>
              <span className="text-xl font-bold text-blue-600">
                {result.currency} {result.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-blue-700 mt-1">
              Ocean: {result.currency} {result.ocean.subtotal.toFixed(2)} • 
              Transport: {result.currency} {result.transport.subtotal.toFixed(2)} • 
              Local: {result.currency} {result.local.subtotal.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}