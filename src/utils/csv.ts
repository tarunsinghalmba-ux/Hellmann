import type { CalculationResult, LineItem } from '../types';
import { supabase } from '../lib/supabase';

async function fetchTermsAndConditions(): Promise<string> {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return '';
    }

    const { data, error } = await supabase
      .from('t_c')
      .select('terms_text')
      .order('id');

    if (error) {
      console.error('Error fetching terms and conditions:', error);
      return '';
    }

    // Combine all terms_text from all records
    return data?.map(record => record.terms_text).filter(Boolean).join('\n\n') || '';
  } catch (error) {
    console.error('Error fetching terms and conditions:', error);
    return '';
  }
}

export async function exportResultsToCSV(results: CalculationResult[]): Promise<void> {
  const rows: string[] = [];
  
  // Headers
  rows.push('Currency,Category,Description,Unit,Quantity,Rate,Total,Container Type,Notes');
  
  for (const result of results) {
    // Ocean freight items
    for (const item of result.ocean.items) {
      rows.push(formatCSVRow([
        result.currency,
        'Ocean Freight',
        item.description,
        item.unit,
        item.quantity.toString(),
        item.rate.toFixed(2),
        item.total.toFixed(2),
        item.containerType || '',
        item.notes || ''
      ]));
    }
    
    // Transport items
    for (const item of result.transport.items) {
      rows.push(formatCSVRow([
        result.currency,
        'Transport',
        item.description,
        item.unit,
        item.quantity.toString(),
        item.rate.toFixed(2),
        item.total.toFixed(2),
        item.containerType || '',
        item.notes || ''
      ]));
    }
    
    // Local charges
    for (const item of result.local.items) {
      rows.push(formatCSVRow([
        result.currency,
        'Local Charges',
        item.description,
        item.unit,
        item.quantity.toString(),
        item.rate.toFixed(2),
        item.total.toFixed(2),
        item.containerType || '',
        item.notes || ''
      ]));
    }
    
    // Subtotals
    rows.push(formatCSVRow([
      result.currency,
      'SUBTOTAL - Ocean Freight',
      '',
      '',
      '',
      '',
      result.ocean.subtotal.toFixed(2),
      '',
      ''
    ]));
    
    rows.push(formatCSVRow([
      result.currency,
      'SUBTOTAL - Transport',
      '',
      '',
      '',
      '',
      result.transport.subtotal.toFixed(2),
      '',
      ''
    ]));
    
    rows.push(formatCSVRow([
      result.currency,
      'SUBTOTAL - Local Charges',
      '',
      '',
      '',
      '',
      result.local.subtotal.toFixed(2),
      '',
      ''
    ]));
    
    // Grand total
    rows.push(formatCSVRow([
      result.currency,
      'GRAND TOTAL',
      '',
      '',
      '',
      '',
      result.grandTotal.toFixed(2),
      '',
      ''
    ]));
    
    // Empty row between currencies
    rows.push('');
  }
  
  // Fetch and append terms and conditions
  const termsText = await fetchTermsAndConditions();
  if (termsText) {
    rows.push('');
    rows.push(formatCSVRow(['TERMS AND CONDITIONS', '', '', '', '', '', '', '', '']));
    rows.push('');
    // Split terms text by lines and add each line as a separate row
    const termsLines = termsText.split('\n');
    termsLines.forEach(line => {
      if (line.trim()) {
        rows.push(formatCSVRow([line.trim(), '', '', '', '', '', '', '', '']));
      } else {
        rows.push('');
      }
    });
  }

export function exportFilteredDataToCSV(data: any[], filename: string): void {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const rows: string[] = [];
  
  // Add headers
  rows.push(formatCSVRow(headers));
  
  // Add data rows
  for (const item of data) {
    const values = headers.map(header => {
      const value = item[header];
      return value?.toString() || '';
    });
    rows.push(formatCSVRow(values));
  }
  
  downloadCSV(rows.join('\n'), filename);
}

function formatCSVRow(values: string[]): string {
  return values.map(value => {
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}