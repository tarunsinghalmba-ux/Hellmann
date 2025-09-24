import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResult, CalculationInputs } from '../types';

export function exportResultsToPDF(results: CalculationResult[], inputs: CalculationInputs): void {
  const pdf = new jsPDF();
  
  // Header
  pdf.setFontSize(18);
  pdf.setTextColor(25, 43, 81); // Navy blue
  pdf.text('Hellmann Australia', 20, 20);
  pdf.setFontSize(14);
  pdf.text('Sea Freight Calculator', 20, 28);
  
  // Date and time
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  const now = new Date();
  pdf.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, 35);
  
  // Input summary
  let yPos = 50;
  pdf.setFontSize(12);
  pdf.setTextColor(0);
  pdf.text('Calculation Parameters:', 20, yPos);
  
  yPos += 8;
  pdf.setFontSize(10);
  pdf.text(`Direction: ${inputs.direction.toUpperCase()}`, 20, yPos);
  pdf.text(`Port of Loading: ${inputs.pol}`, 120, yPos);
  
  yPos += 6;
  pdf.text(`Port of Discharge: ${inputs.pod}`, 20, yPos);
  pdf.text(`${inputs.direction === 'import' ? 'Delivery' : 'Pickup'}: ${inputs.point}`, 120, yPos);
  
  yPos += 6;
  pdf.text(`Validity: ${inputs.validityFrom} to ${inputs.validityTo}`, 20, yPos);
  
  yPos += 6;
  const containers = [];
  if (inputs.qty20 > 0) containers.push(`${inputs.qty20}x20GP`);
  if (inputs.qty40 > 0) containers.push(`${inputs.qty40}x40GP`);
  if (inputs.qty40HC > 0) containers.push(`${inputs.qty40HC}x40HC`);
  if (inputs.lclCbm > 0) containers.push(`${inputs.lclCbm}CBM LCL`);
  pdf.text(`Containers: ${containers.join(', ') || 'None'}`, 20, yPos);
  
  yPos += 15;
  
  // Results for each currency
  for (const result of results) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
    
    // Currency header
    pdf.setFontSize(14);
    pdf.setTextColor(25, 43, 81);
    pdf.text(`Results - ${result.currency}`, 20, yPos);
    yPos += 10;
    
    // Ocean Freight
    if (result.ocean.items.length > 0) {
      pdf.setFontSize(12);
      pdf.setTextColor(0);
      pdf.text('Ocean Freight', 20, yPos);
      yPos += 5;
      
      const oceanData = result.ocean.items.map(item => [
        item.description,
        item.containerType || '',
        item.quantity.toString(),
        `${result.currency} ${item.rate.toFixed(2)}`,
        `${result.currency} ${item.total.toFixed(2)}`
      ]);
      
      autoTable(pdf, {
        startY: yPos,
        head: [['Description', 'Type', 'Qty', 'Rate', 'Total']],
        body: oceanData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [25, 43, 81] }
      });
      
      yPos = (pdf as any).lastAutoTable.finalY + 5;
      
      // Ocean subtotal
      pdf.setFontSize(10);
      pdf.text(`Ocean Freight Subtotal: ${result.currency} ${result.ocean.subtotal.toFixed(2)}`, 20, yPos);
      yPos += 10;
    }
    
    // Transport
    if (result.transport.items.length > 0) {
      if (yPos > 220) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setTextColor(0);
      pdf.text('Transport', 20, yPos);
      yPos += 5;
      
      const transportData = result.transport.items.map(item => [
        item.description,
        item.containerType || '',
        item.quantity.toString(),
        `${result.currency} ${item.rate.toFixed(2)}`,
        `${result.currency} ${item.total.toFixed(2)}`
      ]);
      
      autoTable(pdf, {
        startY: yPos,
        head: [['Description', 'Type', 'Qty', 'Rate', 'Total']],
        body: transportData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [25, 43, 81] }
      });
      
      yPos = (pdf as any).lastAutoTable.finalY + 5;
      
      // Transport subtotal
      pdf.setFontSize(10);
      pdf.text(`Transport Subtotal: ${result.currency} ${result.transport.subtotal.toFixed(2)}`, 20, yPos);
      yPos += 10;
    }
    
    // Local Charges
    if (result.local.items.length > 0) {
      if (yPos > 220) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setTextColor(0);
      pdf.text('Local Charges', 20, yPos);
      yPos += 5;
      
      const localData = result.local.items.map(item => [
        item.description,
        item.containerType || '',
        item.quantity.toString(),
        `${result.currency} ${item.rate.toFixed(2)}`,
        `${result.currency} ${item.total.toFixed(2)}`
      ]);
      
      autoTable(pdf, {
        startY: yPos,
        head: [['Description', 'Type', 'Qty', 'Rate', 'Total']],
        body: localData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [25, 43, 81] }
      });
      
      yPos = (pdf as any).lastAutoTable.finalY + 5;
      
      // Local subtotal
      pdf.setFontSize(10);
      pdf.text(`Local Charges Subtotal: ${result.currency} ${result.local.subtotal.toFixed(2)}`, 20, yPos);
      yPos += 10;
    }
    
    // Grand Total
    pdf.setFontSize(14);
    pdf.setTextColor(25, 43, 81);
    pdf.text(`GRAND TOTAL: ${result.currency} ${result.grandTotal.toFixed(2)}`, 20, yPos);
    yPos += 20;
  }
  
  // Footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Page ${i} of ${pageCount}`, 20, 285);
    pdf.text('Hellmann Australia - Sea Freight Calculator', 120, 285);
  }
  
  // Save
  pdf.save(`sea-freight-calculation-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportFilteredDataToPDF(data: any[], title: string): void {
  if (!data.length) return;
  
  const pdf = new jsPDF();
  
  // Header
  pdf.setFontSize(18);
  pdf.setTextColor(25, 43, 81);
  pdf.text('Hellmann Australia', 20, 20);
  pdf.setFontSize(14);
  pdf.text('Sea Freight Data Export', 20, 28);
  
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  const now = new Date();
  pdf.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, 35);
  
  // Data table
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => item[header]?.toString() || ''));
  
  autoTable(pdf, {
    startY: 50,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 43, 81] }
  });
  
  pdf.save(`${title}-${new Date().toISOString().split('T')[0]}.pdf`);
}