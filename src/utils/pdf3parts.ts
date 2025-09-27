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
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching terms and conditions:', error);
      return '';
    }

    return data?.terms_text || '';
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
  
  const sections = [res.oceanUSD, res.localsAUD, res.deliveryAUD];
  let y = 50;
  
  sections.forEach((s, index) => {
    // Section header
    doc.setFontSize(12);
    doc.setTextColor(25, 43, 81);
    doc.text(`${s.title}`, 14, y);
    
    // Subtotal
    const subtotalText = new Intl.NumberFormat(undefined, { style: 'currency', currency: s.currency }).format(s.subtotal);
    doc.text(`Subtotal: ${subtotalText}`, 150, y);
    
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
      
      autoTable(doc, {
        startY: y,
        head: [['Description', 'Unit', 'Qty', 'Rate', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [25, 43, 81], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 
          0: { cellWidth: 80 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        }
      });
      
      y = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Add page break if needed (except for last section)
    if (index < sections.length - 1 && y > 250) {
      doc.addPage();
      y = 20;
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