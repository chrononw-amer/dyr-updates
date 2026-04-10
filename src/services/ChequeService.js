import jsPDF from 'jspdf';
import { tafqeet } from '../helpers/Tafqeet';

/**
 * Cheque Service - Rebuilt for high precision printing
 */

// Default settings if none provided
const DEFAULT_DIMENSIONS = {
    width: 175,  // mm
    height: 85,  // mm
};

const DEFAULT_OFFSETS = {
    payee: { x: 40, y: 30, fontSize: 12 },
    amount: { x: 150, y: 30, fontSize: 12 },
    tafqeet: { x: 40, y: 45, fontSize: 10 },
    date: { x: 150, y: 15, fontSize: 12 },
    crossing: { x: 20, y: 10, show: true, text: 'ACCOUNT PAYEE ONLY' }
};

/**
 * Generates Cheque HTML for clean, high-precision printing
 */
export const generateChequeHTML = (data, settings = {}) => {
    const {
        width = 175,
        height = 85,
        offsets = {}
    } = settings;

    const amountInWords = tafqeet(Number(data.amount));

    // Create a clean HTML layout with absolute positioning
    const html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { 
                    size: A4 landscape; 
                    margin: 0 !important; 
                }
                * { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    box-sizing: border-box !important; 
                }
                html, body { 
                    width: 297mm !important; 
                    height: 210mm !important; 
                    position: relative !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    font-family: 'Arial', sans-serif;
                    overflow: hidden;
                    background-color: white !important;
                    color: black !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .cheque-container {
                    position: absolute !important;
                    right: 0 !important;
                    top: 50% !important;
                    width: ${width}mm !important;
                    height: ${height}mm !important;
                    transform: translateY(-50%) !important;
                    /* border: 1px dashed #ccc; */
                }
                .field {
                    position: absolute !important;
                    white-space: nowrap;
                    color: black !important;
                    display: block !important;
                    line-height: 1 !important;
                }
                .date { 
                    left: ${offsets.date?.x}mm; 
                    top: ${offsets.date?.y}mm; 
                    font-size: ${offsets.date?.fontSize || 12}pt;
                    font-weight: bold;
                    direction: ltr;
                }
                .payee { 
                    right: ${width - (offsets.payee?.x || 0)}mm; 
                    top: ${offsets.payee?.y}mm; 
                    font-size: ${offsets.payee?.fontSize || 13}pt;
                    font-weight: bold;
                    text-align: right;
                }
                .amount { 
                    left: ${offsets.amount?.x}mm; 
                    top: ${offsets.amount?.y}mm; 
                    font-size: ${offsets.amount?.fontSize || 14}pt;
                    font-weight: bold;
                    direction: ltr;
                }
                .tafqeet { 
                    right: ${width - (offsets.tafqeet?.x || 0)}mm; 
                    top: ${offsets.tafqeet?.y}mm; 
                    font-size: ${offsets.tafqeet?.fontSize || 11}pt;
                    direction: rtl;
                    text-align: right;
                }
                .crossing {
                    left: ${offsets.crossing?.x}mm;
                    top: ${offsets.crossing?.y}mm;
                    transform: rotate(-55deg);
                    border-top: 2pt solid black;
                    border-bottom: 2pt solid black;
                    width: 15mm;
                    height: 4.5mm;
                }
                .customer {
                    right: ${width - (offsets.customer?.x || 0)}mm;
                    top: ${offsets.customer?.y}mm;
                    font-size: ${offsets.customer?.fontSize || 10}pt;
                    color: black;
                    font-style: italic;
                    text-align: right;
                }
            </style>
        </head>
        <body class="print-body">
            <div class="cheque-container">
                <div class="field date">${(() => {
            const d = data.date || '';
            if (d.length === 10 && d.includes('-')) return d.split('-').join(' - ');
            return d;
        })()
        }</div>
                <div class="field payee">${data.payeeName || ''}</div>
                <div class="field amount">#${Number(data.amount).toLocaleString()}#</div>
                <div class="field tafqeet">${amountInWords}</div>
                ${offsets.crossing?.show ? `<div class="field crossing"></div>` : ''}
                ${offsets.customer?.show ? `<div class="field customer">${data.customerName || ''}</div>` : ''}
            </div>
        </body>
        </html>
    `;
    return html;
};

/**
 * Print cheque via Electron's direct-print or browser print
 */
export const printCheque = async (data, settings) => {
    const html = generateChequeHTML(data, settings);
    const { width, height, printerName } = settings;

    if (window.electronAPI && window.electronAPI.directPrint) {
        // Send to Electron for clean background printing
        await window.electronAPI.directPrint(html, printerName || null, {
            width: width * 1000, // microns
            height: height * 1000
        });
    } else {
        // Fallback for web
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    }
};

export default { generateChequeHTML, printCheque };
