import jsPDF from 'jspdf';
import { isRTL } from '../services/i18n';
import { formatCurrency } from '../services/DataService';
import { setupArabicFont, applyBranding, getPDFDimensions } from '../services/PDFService';

/**
 * Generate a Cheque Custody Receipt (حافظة استلام شيكات) PDF
 */
export const generateChequeCustodyPDF = async (data) => {
  const dims = getPDFDimensions();
  const pageW = dims.PAGE_WIDTH;
  const pageH = dims.PAGE_HEIGHT;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  setupArabicFont(doc);

  // Always use 'normal' style — bold variant is not registered for Amiri
  doc.setFont('Amiri', 'normal');

  let y = 38;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  const title = '\u062d\u0627\u0641\u0638\u0629 \u0627\u0633\u062a\u0644\u0627\u0645 \u0634\u064a\u0643\u0627\u062a';
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 7;

  // Subtitle
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const refNum = `CHQ-${data.unitId}-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Ref: ${refNum}  |  Date: ${dateStr}  |  ${data.companyName || ''}`, pageW / 2, y, { align: 'center' });
  y += 3;

  // Gold divider
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.6);
  doc.line(15, y, pageW - 15, y);
  y += 8;

  // Info section
  const leftX = 16;
  const rightX = pageW / 2 + 10;
  const isAr = isRTL();

  const infoRows = [
    { label: isAr ? '\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644' : 'Customer', value: data.customerName || '-' },
    { label: isAr ? '\u0627\u0644\u0648\u062d\u062f\u0629' : 'Unit', value: String(data.unitId || '-') },
    { label: isAr ? '\u0639\u062f\u062f \u0627\u0644\u0634\u064a\u0643\u0627\u062a' : 'Total Cheques', value: String(data.cheques.length) },
    { label: isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0645\u0628\u0644\u063a \u0627\u0644\u0634\u064a\u0643\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0644\u0645\u0629' : 'Total Cheques Amount', value: formatCurrency(data.cheques.reduce((s, c) => s + Number(c.amount || 0), 0)) }
  ];

  doc.setFontSize(9);
  for (let i = 0; i < infoRows.length; i += 2) {
    const row1 = infoRows[i];
    const row2 = infoRows[i + 1];
    doc.setTextColor(100, 116, 139);
    doc.text(`${row1.label}:`, leftX, y);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(row1.value, leftX + 30, y);
    doc.setFontSize(9);
    if (row2) {
      doc.setTextColor(100, 116, 139);
      doc.text(`${row2.label}:`, rightX, y);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text(row2.value, rightX + 30, y);
      doc.setFontSize(9);
    }
    y += 7;
  }
  y += 4;

  // Table columns
  const cols = [
    { label: '#', w: 10 },
    { label: isAr ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642' : 'Due Date', w: 30 },
    { label: isAr ? '\u0627\u0644\u0645\u0628\u0644\u063a' : 'Amount', w: 35 },
    { label: isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0634\u064a\u0643' : 'Cheque #', w: 35 },
    { label: isAr ? '\u0627\u0644\u0628\u0646\u0643' : 'Bank', w: 30 },
    { label: isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status', w: 25 },
    { label: isAr ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes', w: 0 }
  ];

  const tableX = 12;
  const tableW = pageW - 24;
  const fixedW = cols.reduce((s, c) => s + c.w, 0);
  cols[cols.length - 1].w = tableW - fixedW;

  const rowH = 8;
  const headerH = 9;

  // Draw table header helper
  const drawTableHeader = (yPos) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(tableX, yPos, tableW, headerH, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont('Amiri', 'normal');
    let cx = tableX;
    cols.forEach(col => {
      doc.text(col.label, cx + col.w / 2, yPos + headerH / 2 + 1.5, { align: 'center' });
      cx += col.w;
    });
  };

  drawTableHeader(y);
  y += headerH;

  // Date formatter
  const fmtDate = (dateVal) => {
    if (!dateVal) return '-';
    let d;
    if (!isNaN(dateVal) && Number(dateVal) > 20000) {
      const excelEpoch = new Date(1899, 11, 30);
      d = new Date(excelEpoch.getTime() + Number(dateVal) * 86400000);
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return String(dateVal);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Table rows
  doc.setFont('Amiri', 'normal');
  let totalAmount = 0;

  data.cheques.forEach((chq, idx) => {
    if (y + rowH > pageH - 45) {
      doc.addPage();
      y = 20;
      doc.setFont('Amiri', 'normal');
      drawTableHeader(y);
      y += headerH;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

    const amount = Number(chq.amount || 0);
    totalAmount += amount;

    const rowData = [
      String(idx + 1),
      fmtDate(chq.dueDate),
      formatCurrency(amount),
      String(chq.chequeNumber || '-'),
      String(chq.bank || '-'),
      String(chq.status || 'Pending'),
      ''
    ];

    doc.setFontSize(7);
    let rx = tableX;
    rowData.forEach((val, ci) => {
      const colW = cols[ci].w;
      if (ci === 0) {
        doc.setTextColor(100, 116, 139);
      } else if (ci === 2) {
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
      } else {
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
      }
      doc.text(val, rx + colW / 2, y + rowH / 2 + 1.5, { align: 'center' });
      rx += colW;
    });

    y += rowH;
  });

  // Total row
  doc.setFillColor(30, 58, 138);
  doc.rect(tableX, y, tableW, headerH, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('Amiri', 'normal');
  doc.text(isAr ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'TOTAL', tableX + cols[0].w + cols[1].w / 2, y + headerH / 2 + 1.5, { align: 'center' });
  doc.text(formatCurrency(totalAmount), tableX + cols[0].w + cols[1].w + cols[2].w / 2, y + headerH / 2 + 1.5, { align: 'center' });
  doc.text(`${data.cheques.length} ${isAr ? '\u0634\u064a\u0643' : 'cheques'}`, tableX + cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w / 2, y + headerH / 2 + 1.5, { align: 'center' });
  y += headerH;

  // Empty row below total for manual cheque addition (+ sign)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  let emptyX = tableX;
  cols.forEach(col => {
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(emptyX, y, col.w, rowH);
    emptyX += col.w;
  });
  doc.setLineDashPattern([], 0);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('+', tableX + cols[0].w / 2, y + rowH / 2 + 1.5, { align: 'center' });
  y += rowH + 15;

  // Signatures
  if (y > pageH - 40) {
    doc.addPage();
    y = 30;
  }

  const sigW = (tableW - 20) / 2;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('Amiri', 'normal');

  doc.text(isAr ? '\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0645\u0633\u062a\u0644\u0645' : 'Received By', tableX + sigW / 2, y, { align: 'center' });
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(tableX + 5, y + 15, tableX + sigW - 5, y + 15);
  doc.setFontSize(7);
  doc.text(`(${data.companyName || 'Company'})`, tableX + sigW / 2, y + 20, { align: 'center' });

  doc.setFontSize(8);
  doc.text(isAr ? '\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0639\u0645\u064a\u0644' : 'Customer Signature', tableX + sigW + 20 + sigW / 2, y, { align: 'center' });
  doc.line(tableX + sigW + 25, y + 15, tableX + 2 * sigW + 15, y + 15);
  doc.setFontSize(7);
  doc.text(`(${data.customerName || 'Customer'})`, tableX + sigW + 20 + sigW / 2, y + 20, { align: 'center' });

  // Footer
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated by ${data.companyName || 'DYR'}  |  ${refNum}`, pageW / 2, pageH - 5, { align: 'center' });

  // Apply company branding (header/footer images)
  await applyBranding(doc);

  return doc;
};
