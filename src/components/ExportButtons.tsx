import React from 'react';
import { Download, FileText } from 'lucide-react';
import { exportResultsToCSV } from '../utils/csv';
import { exportResultsToPDF } from '../utils/pdf';
import type { CalculationResult, CalculationInputs } from '../types';

interface ExportButtonsProps {
  results: CalculationResult[];
  inputs: CalculationInputs;
  disabled?: boolean;
}

export default function ExportButtons({ results, inputs, disabled = false }: ExportButtonsProps) {
  if (!results.length) return null;

  const handleExportCSV = async () => {
    await exportResultsToCSV(results);
  };

  const handleExportPDF = async () => {
    await exportResultsToPDF(results, inputs);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleExportCSV}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
      
      <button
        onClick={handleExportPDF}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </button>
    </div>
  );
}