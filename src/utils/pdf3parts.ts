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

export async function exportPdf3Parts(res: CalcResult, meta: { direction: string; pol: string; pod: string; suburb: string; fromDate: string; toDate: string; equipment: string; }) {
  const doc = new jsPDF();
  
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
  doc.text(`Validity: ${meta.fromDate} → ${meta.toDate}  |  Equipment: ${meta.equipment}`, 14, 42);
  
  // Calculation Summary Section (matching UI)
  let y = 55;
  
  // Summary background
  doc.setFillColor(239, 246, 255); // Light blue background
  doc.rect(14, y - 5, 182, 45, 'F');
  
  // Summary title
  doc.setFontSize(14);
  doc.setTextColor(25, 43, 81);
  doc.text('Calculation Summary', 20, y + 5);
  
  // Validity period
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const validFromFormatted = new Date(meta.fromDate).toLocaleDateString();
  const validToFormatted = new Date(meta.toDate).toLocaleDateString();
  doc.text(`Valid: ${validFromFormatted} - ${validToFormatted}`, 20, y + 12);
  
  // USD to AUD rate
  const usdToAudRate = 1.52;
  doc.text(`USD to AUD Rate: ${usdToAudRate.toFixed(4)}`, 120, y + 12);
  
  // Calculate totals
  const oceanUSDTotal = res.oceanUSD.subtotal;
  const oceanAUDTotal = oceanUSDTotal * usdToAudRate;
  const localsAUDTotal = res.localsAUD.subtotal;
  const deliveryAUDTotal = res.deliveryAUD.subtotal;
  const netTotalAUD = oceanAUDTotal + localsAUDTotal + deliveryAUDTotal;
  
  // Summary boxes (4 columns)
  const boxWidth = 42;
  const boxHeight = 20;
  const startX = 20;
  const boxY = y + 18;
  
  // Ocean Freight box (Blue)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(startX, boxY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Ocean Freight', startX + 2, boxY + 5);
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(`${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(oceanUSDTotal)} → ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(oceanAUDTotal)}`, startX + 2, boxY + 9);
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text(new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(oceanAUDTotal), startX + 2, boxY + 15);
  
  // Local Charges box (Emerald)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(16, 185, 129);
  doc.rect(startX + boxWidth + 2, boxY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Local Charges', startX + boxWidth + 4, boxY + 5);
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('Already in AUD', startX + boxWidth + 4, boxY + 9);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(localsAUDTotal), startX + boxWidth + 4, boxY + 15);
  
  // Transport box (Amber)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11);
  doc.rect(startX + (boxWidth + 2) * 2, boxY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Transport', startX + (boxWidth + 2) * 2 + 2, boxY + 5);
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('Already in AUD', startX + (boxWidth + 2) * 2 + 2, boxY + 9);
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11);
  doc.text(new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(deliveryAUDTotal), startX + (boxWidth + 2) * 2 + 2, boxY + 15);
  
  // Net Total box (Green)
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.rect(startX + (boxWidth + 2) * 3, boxY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Net Total', startX + (boxWidth + 2) * 3 + 2, boxY + 5);
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('All costs in AUD', startX + (boxWidth + 2) * 3 + 2, boxY + 9);
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(netTotalAUD), startX + (boxWidth + 2) * 3 + 2, boxY + 15);
  
  y = boxY + boxHeight + 15;
  
  const sections = [res.oceanUSD, res.localsAUD, res.deliveryAUD];
  
  sections.forEach((s, index) => {
    // Check for page break before each section
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    
    // Section header
    doc.setFontSize(12);
    doc.setTextColor(25, 43, 81);
    doc.text(`${s.title}`, 14, y);
    
    // Add subtitle with route and equipment info
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    let subtitle = '';
    if (index === 0) { // Ocean
      subtitle = `${meta.pol} → ${meta.pod} • ${meta.equipment}`;
    } else if (index === 1) { // Locals
      const port = meta.direction === 'import' ? meta.pod : meta.pol;
      subtitle = `${port} • ${meta.equipment}`;
    } else { // Transport
      subtitle = `${meta.suburb} • ${meta.equipment}`;
    }
    doc.text(subtitle, 14, y + 6);
    
    // Subtotal
    const subtotalText = new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(s.subtotal);
    doc.setFontSize(12);
    doc.setTextColor(25, 43, 81);
    doc.text(`Subtotal: ${subtotalText}`, 150, y + 3);
    
    y += 12;
    
    if (s.items.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('No matching rows for this section.', 14, y);
      y += 10;
    } else {
      // Table data
      const tableData = s.items.map(i => [
        i.label + (i.extra ? ` (${i.extra})` : ''),
        i.unit ?? '',
        String(i.qty),
        new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(i.rate),
        new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(i.total)
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Description', 'Unit', 'Qty', 'Rate', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: index === 0 ? [59, 130, 246] : index === 1 ? [16, 185, 129] : [245, 158, 11], 
          textColor: 255 
        },
        alternateRowStyles: { 
          fillColor: index === 0 ? [239, 246, 255] : index === 1 ? [236, 253, 245] : [255, 251, 235]
        },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 
          0: { cellWidth: 80 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        }
      });
      
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Add page break if needed (except for last section)
    if (index < sections.length - 1 && y > 250) {
      doc.addPage();
      y = 20;
    }
  });
  
  // Add final summary on last page
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(16);
  doc.setTextColor(21, 128, 61);
  doc.text(`GRAND TOTAL: ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(netTotalAUD)}`, 14, y);
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Ocean: ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(oceanAUDTotal)} • Local: ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(localsAUDTotal)} • Transport: ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(deliveryAUDTotal)}`, 14, y + 6);
  
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