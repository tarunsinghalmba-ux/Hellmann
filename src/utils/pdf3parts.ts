import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalcResult } from './calc3parts';
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

export async function exportPdf3Parts(res: CalcResult, meta: { direction: string; pol: string; pod: string; suburb: string; fromDate: string; toDate: string; qty20: number; qty40: number; qty40HC: number; lclCbm: number; }) {
  const doc = new jsPDF();
  const usdToAudRate = 1.52; // Same rate as used in UI
  
  // Header
  doc.setFontSize(16);
  doc.setTextColor(25, 43, 81);
  doc.text('Hellmann Australia', 14, 20);
  doc.setFontSize(12);
  doc.text('Sea Freight Rate Calculation', 14, 28);
  
  // Metadata
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Direction: ${meta.direction.toUpperCase()}  |  POL: ${meta.pol}  |  POD: ${meta.pod}  |  Point: ${meta.suburb}`, 14, 36);
  
  // Equipment summary
  const equipmentParts = [];
  if (meta.qty20 > 0) equipmentParts.push(`${meta.qty20}x20GP`);
  if (meta.qty40 > 0) equipmentParts.push(`${meta.qty40}x40GP`);
  if (meta.qty40HC > 0) equipmentParts.push(`${meta.qty40HC}x40HC`);
  if (meta.lclCbm > 0) equipmentParts.push(`${meta.lclCbm}CBM`);
  const equipmentSummary = equipmentParts.join(', ') || 'No equipment';
  
  doc.text(`Validity: ${new Date(res.validityPeriod.from).toLocaleDateString()} - ${new Date(res.validityPeriod.to).toLocaleDateString()}  |  Equipment: ${equipmentSummary}`, 14, 42);
  
  let y = 55;
  
  // Calculation Summary Section (matching UI)
  doc.setFontSize(12);
  doc.setTextColor(25, 43, 81);
  doc.text('Calculation Summary', 14, y);
  y += 8;
  
  // Summary box background (light blue)
  doc.setFillColor(239, 246, 255); // Light blue background
  doc.rect(14, y - 2, 182, 35, 'F');
  
  // Summary content
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Valid: ${new Date(res.validityPeriod.from).toLocaleDateString()} - ${new Date(res.validityPeriod.to).toLocaleDateString()}`, 18, y + 5);
  doc.text(`USD to AUD Rate: ${usdToAudRate.toFixed(4)}`, 140, y + 5);
  
  y += 12;
  
  // Calculate totals
  const oceanUSDTotal = res.oceanUSD.subtotal;
  const oceanAUDTotal = oceanUSDTotal * usdToAudRate;
  const localsAUDTotal = res.localsAUD.subtotal;
  const deliveryAUDTotal = res.deliveryAUD.subtotal;
  const netTotalAUD = oceanAUDTotal + localsAUDTotal + deliveryAUDTotal;
  
  // Summary boxes (4 columns)
  const boxWidth = 42;
  const boxHeight = 18;
  const startX = 18;
  
  // Ocean Freight box
  doc.setFillColor(255, 255, 255); // White background
  doc.setDrawColor(59, 130, 246); // Blue border
  doc.rect(startX, y, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Ocean Freight', startX + 2, y + 4);
  doc.setFontSize(7);
  doc.text(`USD ${oceanUSDTotal.toFixed(2)} → AUD ${oceanAUDTotal.toFixed(2)}`, startX + 2, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(59, 130, 246);
  doc.text(`AUD ${oceanAUDTotal.toFixed(2)}`, startX + 2, y + 14);
  
  // Local Charges box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(16, 185, 129); // Emerald border
  doc.rect(startX + boxWidth + 3, y, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Local Charges', startX + boxWidth + 5, y + 4);
  doc.setFontSize(7);
  doc.text('Already in AUD', startX + boxWidth + 5, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text(`AUD ${localsAUDTotal.toFixed(2)}`, startX + boxWidth + 5, y + 14);
  
  // Transport box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11); // Amber border
  doc.rect(startX + (boxWidth + 3) * 2, y, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Transport', startX + (boxWidth + 3) * 2 + 2, y + 4);
  doc.setFontSize(7);
  doc.text('Already in AUD', startX + (boxWidth + 3) * 2 + 2, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text(`AUD ${deliveryAUDTotal.toFixed(2)}`, startX + (boxWidth + 3) * 2 + 2, y + 14);
  
  // Net Total box (larger, green gradient effect)
  doc.setFillColor(240, 253, 244); // Light green background
  doc.setDrawColor(34, 197, 94); // Green border
  doc.setLineWidth(1.5);
  doc.rect(startX + (boxWidth + 3) * 3, y, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Net Total', startX + (boxWidth + 3) * 3 + 2, y + 4);
  doc.setFontSize(7);
  doc.text('All costs in AUD', startX + (boxWidth + 3) * 3 + 2, y + 8);
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text(`AUD ${netTotalAUD.toFixed(2)}`, startX + (boxWidth + 3) * 3 + 2, y + 14);
  
  // Reset line width
  doc.setLineWidth(0.1);
  
  y += 30;
  
  // Detailed sections
  const sections = [res.oceanUSD, res.localsAUD, res.deliveryAUD];
  
  sections.forEach((s, index) => {
    // Check if we need a new page
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    
    // Section header
    doc.setFontSize(12);
    doc.setTextColor(25, 43, 81);
    doc.text(`${s.title}`, 14, y);
    
    // Subtitle
    if (s.subtitle) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(s.subtitle, 14, y + 6);
      y += 6;
    }
    
    // Subtotal
    const subtotalText = new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(s.subtotal);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(subtotalText, 150, y);
    
    y += 8;
    
    if (s.items.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('No matching rows for this section.', 14, y);
      y += 15;
    } else {
      // Table data
      const tableData = s.items.map(i => [
        i.label + (i.extra ? ` (${i.extra})` : ''),
        i.unit ?? '',
        String(i.qty),
        new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(i.rate),
        new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(i.total)
      ]);
      
      // Set border colors based on section
      let borderColor = [25, 43, 81]; // Default blue
      if (s.title.includes('Ocean')) borderColor = [59, 130, 246]; // Blue
      else if (s.title.includes('Locals')) borderColor = [16, 185, 129]; // Emerald
      else if (s.title.includes('Delivery')) borderColor = [245, 158, 11]; // Amber
      
      autoTable(doc, {
        startY: y,
        head: [['Description', 'Unit', 'Qty', 'Rate', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: borderColor, textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 
          0: { cellWidth: 80 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        tableLineColor: borderColor,
        tableLineWidth: 0.5
      });
      
      y = (doc as any).lastAutoTable.finalY + 15;
    }
  });
  
  // Fetch and append terms and conditions
  const termsText = await fetchTermsAndConditions();
  if (termsText) {
    // Add new page for terms and conditions
    doc.addPage();
    y = 20;
    
    // Terms and conditions header
    doc.setFontSize(14);
    doc.setTextColor(25, 43, 81);
    doc.text('Terms and Conditions', 14, y);
    y += 15;
    
    // Terms and conditions content
    doc.setFontSize(9);
    doc.setTextColor(0);
    
    // Split text into lines and handle page breaks
    const lines = doc.splitTextToSize(termsText, 180); // 180mm width
    
    for (let i = 0; i < lines.length; i++) {
      if (y > 270) { // Check if we need a new page
        doc.addPage();
        y = 20;
      }
      doc.text(lines[i], 14, y);
      y += 4;
    }
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, 14, 285);
    doc.text('Hellmann Australia - Sea Freight Calculator', 120, 285);
  }
  
  doc.save(`sea-freight-rates-${new Date().toISOString().split('T')[0]}.pdf`);
}