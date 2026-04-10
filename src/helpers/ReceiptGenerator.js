import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { t, isRTL } from '../services/i18n';
import { formatCurrency, getCurrency } from '../services/DataService';
import { setupArabicFont, applyBranding, getPDFDimensions } from '../services/PDFService';

export const generateReceiptPDF = async (receiptData) => {

    // Create a hidden container for the receipt
    const container = document.createElement('div');
    container.className = 'pdf-render-zone';
    container.style.position = 'fixed';
    container.style.left = '0'; // Must be in viewport for html2canvas to capture it
    container.style.top = '0';
    container.style.width = '794px'; // A4 width in pixels at 96 DPI
    container.style.minHeight = '1123px'; // A4 height
    container.style.background = '#ffffff';
    container.style.fontFamily = isRTL() ? 'Amiri, serif' : 'Arial, sans-serif';
    container.style.color = '#000';
    container.dir = isRTL() ? 'rtl' : 'ltr';
    container.style.zIndex = '-9999'; // Hidden behind everything but technically "visible"
    container.style.visibility = 'visible';
    document.body.appendChild(container);

    const formatReceiptDate = (dateVal) => {
        if (!dateVal) return '-';
        let date;
        if (!isNaN(dateVal) && Number(dateVal) > 20000) {
            const serialNumber = Number(dateVal);
            const excelEpoch = new Date(1899, 11, 30);
            date = new Date(excelEpoch.getTime() + serialNumber * 86400000);
        } else {
            date = new Date(dateVal);
        }

        if (isNaN(date.getTime())) return String(dateVal);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${yyyy}-${mm}-${dd}`;
    };

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const serial = receiptData.receipt_serial || `REC-${receiptData.unitId}-${Date.now()}`;
    const dueDateFormatted = formatReceiptDate(receiptData.dueDate);

    // Totals
    const insTotal = Number(receiptData.installmentTotal || 0);
    const insPaid = Number(receiptData.installmentPaid || 0);
    const insRemaining = insTotal - insPaid;

    const printCount = receiptData.print_count || 1;
    const copyLabel = printCount > 1 ? t('receipt.copy') : t('receipt.original');

    const sortedPayments = [...(receiptData.payments || [])].sort((a, b) => {
        const getSortDate = (d) => {
            if (!d) return new Date(0);
            if (typeof d === 'number' && d > 20000 && d < 100000) return new Date((d - 25569) * 86400 * 1000);
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? new Date(0) : parsed;
        };
        return getSortDate(b.date) - getSortDate(a.date); // Newer to older
    });

    const paymentsHtml = sortedPayments.map(p => `
        <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 10px;">${formatReceiptDate(p.date)}</td>
            <td style="padding: 10px;">${formatCurrency(p.amount)}</td>
            <td style="padding: 10px;">${p.method || p.paymentMethod || '-'}</td>
            <td style="padding: 10px;">${p.ref || '-'}</td>
            <td style="padding: 10px;">${p.notes || '-'}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="padding: 20px; box-sizing: border-box; width: 100%; height: 100%;">
            <!-- Header REMOVED for Branding Service -->

            <!-- Title -->
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="font-size: 24px; margin: 0; color: #000; letter-spacing: 1px;">${t('receipt.title')}</h2>
                <p style="color: #eb445a; font-weight: bold; margin: 5px 0; font-size: 14px; letter-spacing: 1px;">${copyLabel}</p>
                <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                    <span><strong>${t('receipt.number')}:</strong> ${serial}</span>
                    <span><strong>${t('receipt.date')}:</strong> ${date}</span>
                </div>
            </div>

            <!-- Details & Picture Area -->
            <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 30px; ${isRTL() ? 'flex-direction: row-reverse;' : ''}">
                <div style="flex: ${receiptData.layoutImage ? '1.5' : '1'};">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #333; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                <th style="padding: 12px; text-align: ${isRTL() ? 'right' : 'left'}; width: 40%;">${t('receipt.description')}</th>
                                <th style="padding: 12px; text-align: ${isRTL() ? 'right' : 'left'};">${t('receipt.details')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.customerName')}</td><td style="padding: 12px; font-size: 16px;">${receiptData.customerName || 'N/A'}</td></tr>
                            ${receiptData.jointPurchasers && receiptData.jointPurchasers.length > 0 ? `
                                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.jointPurchasers')}</td><td style="padding: 12px;">${receiptData.jointPurchasers.join(', ')}</td></tr>
                            ` : ''}
                            ${receiptData.guarantor ? `
                                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.guarantor')}</td><td style="padding: 12px;">${receiptData.guarantor}</td></tr>
                            ` : ''}
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.unitNumber')}</td><td style="padding: 12px;">${receiptData.unitId || 'N/A'}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.contractTotal')}</td><td style="padding: 12px;">${receiptData.contractTotal ? formatCurrency(receiptData.contractTotal) : '-'}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.paymentDate')}</td><td style="padding: 12px;">${dueDateFormatted}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.reason')}</td><td style="padding: 12px;">${receiptData.type || 'N/A'}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.paymentMethod')}</td><td style="padding: 12px;">${receiptData.paymentMethod || 'CASH'}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.bankName')}</td><td style="padding: 12px;">${(receiptData.paymentMethod === 'Cheque' || receiptData.bank) ? (receiptData.bank || '-') : ''}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.chequeNumber')}</td><td style="padding: 12px;">${receiptData.chequeNumber || receiptData.reference || '-'}</td></tr>
                            ${receiptData.paymentMethod === 'Cheque' ? `
                                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.chequeStatus')}</td><td style="padding: 12px;">${receiptData.chequeStatus || 'N/A'}</td></tr>
                                ${!receiptData.isOfferPayment ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.depositedTo')}</td><td style="padding: 12px;">${receiptData.depositedBank || '-'}</td></tr>` : ''}
                            ` : ''}
                            
                            <tr style="background-color: #fafafa;"><td colspan="2" style="padding: 10px;"></td></tr>
                            
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.installmentAmount')}</td><td style="padding: 12px;">${formatCurrency(insTotal)}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.totalPaid')}</td><td style="padding: 12px;">${formatCurrency(insPaid)}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 12px; font-weight: bold;">${t('receipt.remainingBalance')}</td><td style="padding: 12px;">${formatCurrency(insRemaining < 0 ? 0 : insRemaining)}</td></tr>
                            
                            <tr style="background-color: #fafafa;"><td colspan="2" style="padding: 10px;"></td></tr>
                            
                            <tr style="background-color: #fffde7; -webkit-print-color-adjust: exact; print-color-adjust: exact; border: 2px solid #ffeb3b;">
                                <td style="padding: 15px; font-weight: bold; font-size: 16px; color: #f57f17;">${t('receipt.currentPayment')}</td>
                                <td style="padding: 15px; font-weight: bold; font-size: 20px; color: #1a1a1a;">${formatCurrency(receiptData.paidAmount || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Picture Area -->
                ${receiptData.layoutImage ? `
                    <div style="flex: 1; border: 2px solid #c5a059; border-radius: 12px; padding: 10px; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 350px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                         <span style="font-size: 12px; color: #c5a059; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">${t('receipt.unitMap')}</span>
                         <img src="${receiptData.layoutImage}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 300px; object-fit: contain;" />
                    </div>
                ` : ''}
            </div>

            <!-- Payment History -->
            ${receiptData.payments && receiptData.payments.length > 0 ? `
                <h3 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #c5a059; padding-bottom: 5px; display: inline-block;">${t('receipt.history')}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #c5a059; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <th style="padding: 10px; text-align: ${isRTL() ? 'right' : 'left'};">${t('receipt.history.date')}</th>
                            <th style="padding: 10px; text-align: ${isRTL() ? 'right' : 'left'};">${t('receipt.history.amount')}</th>
                            <th style="padding: 10px; text-align: ${isRTL() ? 'right' : 'left'};">${t('receipt.history.method')}</th>
                            <th style="padding: 10px; text-align: ${isRTL() ? 'right' : 'left'};">${t('receipt.history.ref')}</th>
                            <th style="padding: 10px; text-align: ${isRTL() ? 'right' : 'left'};">${t('receipt.history.notes')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsHtml}
                    </tbody>
                </table>
            ` : ''}

            <!-- Amount in Words & Footer -->
            <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; font-style: italic; border-left: 4px solid #c5a059; border-right: ${isRTL() ? '4px solid #c5a059' : 'none'};">
                ${t('receipt.sumOf')}: ${formatCurrency(receiptData.paidAmount || 0)} (${getCurrency()})
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 80px; font-size: 14px;">
                <div style="text-align: center; border-top: 1px solid #000; width: 40%; padding-top: 10px;">${t('receipt.receivedBy')}</div>
                <div style="text-align: center; border-top: 1px solid #000; width: 40%; padding-top: 10px;">${t('receipt.customerSignature')}</div>
            </div>

             <div style="text-align: center; margin-top: 60px; font-size: 12px; color: #888;">
                ${t('receipt.thankYou')}
            </div>
        </div>
    `;

    // Generate PDF using explicit rasterization (Image)
    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 794
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7);
        const doc = new jsPDF('p', 'mm', 'a4', true); // Enable compression
        setupArabicFont(doc);

        const { PAGE_WIDTH, PAGE_HEIGHT, HEADER_HEIGHT, FOOTER_HEIGHT } = getPDFDimensions();

        // Calculate available content area
        const contentWidth = PAGE_WIDTH - 20; // 10mm margins sides
        const contentHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 10; // 10mm padding

        // Image dimensions
        const imgProps = doc.getImageProperties(imgData);
        const originalWidth = imgProps.width;
        const originalHeight = imgProps.height;

        // Calculate scale to fit
        const ratio = Math.min(contentWidth / originalWidth, contentHeight / originalHeight);

        // Final dimensions (ratio used for scaling below)
        void ratio; // Suppress unused warning - kept for semantic clarity

        // Centering logic: html2canvas size is varying. Better approach:

        const pdfImgWidth = contentWidth;
        const pdfImgHeight = (originalHeight * contentWidth) / originalWidth;

        let finalPdfWidth = pdfImgWidth;
        let finalPdfHeight = pdfImgHeight;

        // If height is too big, scale down by height
        if (pdfImgHeight > contentHeight) {
            finalPdfHeight = contentHeight;
            finalPdfWidth = (originalWidth * contentHeight) / originalHeight;
        }

        const marginX = (PAGE_WIDTH - finalPdfWidth) / 2;
        const marginY = HEADER_HEIGHT + 5; // 5mm top padding below header

        doc.addImage(imgData, 'JPEG', marginX, marginY, finalPdfWidth, finalPdfHeight, undefined, 'FAST');

        // Apply Branding
        await applyBranding(doc);

        // Return the doc instead of saving directly to allow for Preview
        return doc;

    } catch (e) {
        console.error("PDF Gen Error:", e);
        throw e;
    } finally {
        // Cleanup
        if (document.body.contains(container)) document.body.removeChild(container);
    }
};
