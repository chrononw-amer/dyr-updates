import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { t, isRTL } from '../services/i18n';
import { formatCurrency, getCurrency } from '../services/DataService';
import { setupArabicFont, applyBranding, getPDFDimensions } from '../services/PDFService';

export const generateCommissionReceiptPDF = async (data) => {
    const container = document.createElement('div');
    container.className = 'pdf-render-zone';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.minHeight = '1123px';
    container.style.background = '#ffffff';
    container.style.fontFamily = isRTL() ? 'Amiri, serif' : 'Arial, sans-serif';
    container.style.color = '#000';
    container.dir = isRTL() ? 'rtl' : 'ltr';
    container.style.zIndex = '-9999';
    container.style.visibility = 'visible';
    document.body.appendChild(container);

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const serial = data.receiptSerial || `COM-${data.unitId}-${Date.now()}`;
    const align = isRTL() ? 'right' : 'left';

    const commissionTotal = Number(data.commissionAmount) || 0;
    const commissionPaid = Number(data.totalPaid) || 0;
    const commissionRemaining = commissionTotal - commissionPaid;
    const currentPayout = Number(data.currentPayoutAmount) || 0;

    // Payment history rows
    const paymentsHtml = (data.payments || []).map(p => `
        <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 8px; font-size: 13px;">${p.date || '-'}</td>
            <td style="padding: 8px; font-size: 13px;">${formatCurrency(p.amount)}</td>
            <td style="padding: 8px; font-size: 13px;">${p.paymentMethod || '-'}</td>
            <td style="padding: 8px; font-size: 13px;">${p.notes || '-'}</td>
        </tr>
    `).join('');

    // Joint purchasers
    const jpNames = (data.jointPurchasers || []).map(jp => {
        if (typeof jp === 'string') return jp;
        return jp.name || jp.id || '-';
    });

    container.innerHTML = `
        <div style="padding: 20px; box-sizing: border-box; width: 100%; height: 100%;">

            <!-- Title -->
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="font-size: 26px; margin: 0; color: #1E293B; letter-spacing: 2px; font-weight: 900;">
                    COMMISSION PAYOUT RECEIPT
                </h2>
                <p style="color: #c5a059; font-weight: bold; margin: 5px 0; font-size: 13px; letter-spacing: 1px;">ORIGINAL RECEIPT</p>
                <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 13px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                    <span><strong>Receipt #:</strong> ${serial}</span>
                    <span><strong>Date:</strong> ${today}</span>
                </div>
            </div>

            <!-- Section: Broker & Agent Info -->
            <div style="margin-bottom: 20px; border: 2px solid #c5a059; border-radius: 8px; overflow: hidden;">
                <div style="background: #c5a059; color: #fff; padding: 10px 15px; font-weight: 800; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    BROKER / AGENT INFORMATION
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; width: 40%; color: #333;">Broker Company</td>
                            <td style="padding: 10px 15px;">${data.brokerName || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Sales Agent</td>
                            <td style="padding: 10px 15px;">${data.salesName || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Commission Rate</td>
                            <td style="padding: 10px 15px;">${data.commissionRate || 0}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Section: Unit & Contract Info -->
            <div style="margin-bottom: 20px; border: 2px solid #c5a059; border-radius: 8px; overflow: hidden;">
                <div style="background: #c5a059; color: #fff; padding: 10px 15px; font-weight: 800; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    UNIT & CONTRACT DETAILS
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; width: 40%; color: #333;">Unit ID</td>
                            <td style="padding: 10px 15px; font-size: 16px; font-weight: 700;">${data.unitId || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Customer Name</td>
                            <td style="padding: 10px 15px;">${data.customerName || '-'}</td>
                        </tr>
                        ${jpNames.length > 0 ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Joint Purchasers</td>
                            <td style="padding: 10px 15px;">${jpNames.join(', ')}</td>
                        </tr>` : ''}
                        ${data.guarantor ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Guarantor</td>
                            <td style="padding: 10px 15px;">${data.guarantor}</td>
                        </tr>` : ''}
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Contract Total</td>
                            <td style="padding: 10px 15px; font-weight: 700;">${formatCurrency(data.contractTotal)}</td>
                        </tr>
                        ${data.offerDate ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Offer Date</td>
                            <td style="padding: 10px 15px;">${data.offerDate}</td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Contract Date</td>
                            <td style="padding: 10px 15px;">${data.contractDate || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Section: Commission Financials -->
            <div style="margin-bottom: 20px; border: 2px solid #c5a059; border-radius: 8px; overflow: hidden;">
                <div style="background: #c5a059; color: #fff; padding: 10px 15px; font-weight: 800; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    COMMISSION FINANCIALS
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; width: 40%; color: #333;">Total Commission</td>
                            <td style="padding: 10px 15px; font-weight: 700; color: #000;">${formatCurrency(commissionTotal)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Total Paid Out</td>
                            <td style="padding: 10px 15px; font-weight: 700; color: #000;">${formatCurrency(commissionPaid)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Remaining Balance</td>
                            <td style="padding: 10px 15px; font-weight: 700; color: #000;">${formatCurrency(commissionRemaining < 0 ? 0 : commissionRemaining)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Payout Date</td>
                            <td style="padding: 10px 15px;">${data.payoutDate || today}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Payment Method</td>
                            <td style="padding: 10px 15px;">${data.paymentMethod || 'CASH'}</td>
                        </tr>
                        ${data.paymentMethod === 'Cheque' ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Bank Name</td>
                            <td style="padding: 10px 15px;">${data.bank || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Cheque Number</td>
                            <td style="padding: 10px 15px;">${data.chequeNumber || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 15px; font-weight: bold; color: #333;">Cheque Date</td>
                            <td style="padding: 10px 15px;">${data.chequeDate || '-'}</td>
                        </tr>
                        ` : ''}
                        <tr style="background-color: #fffde7; -webkit-print-color-adjust: exact; print-color-adjust: exact; border: 2px solid #ffeb3b;">
                            <td style="padding: 15px; font-weight: bold; font-size: 16px; color: #f57f17;">Current Payout</td>
                            <td style="padding: 15px; font-weight: bold; font-size: 22px; color: #1a1a1a;">${formatCurrency(currentPayout)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Payment History -->
            ${data.payments && data.payments.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 2px solid #c5a059; padding-bottom: 5px; display: inline-block;">Payout History</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #c5a059; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                <th style="padding: 8px; text-align: ${align};">Date</th>
                                <th style="padding: 8px; text-align: ${align};">Amount</th>
                                <th style="padding: 8px; text-align: ${align};">Method</th>
                                <th style="padding: 8px; text-align: ${align};">Notes</th>
                            </tr>
                        </thead>
                        <tbody>${paymentsHtml}</tbody>
                    </table>
                </div>
            ` : ''}

            <!-- Amount in Words -->
            <div style="margin-top: 15px; padding: 15px; background: #f9f9f9; font-style: italic; border-left: 4px solid #c5a059; border-right: ${isRTL() ? '4px solid #c5a059' : 'none'};">
                The sum of: ${formatCurrency(currentPayout)} (${getCurrency()})
            </div>

            <!-- Signatures -->
            <div style="display: flex; justify-content: space-between; margin-top: 70px; font-size: 14px;">
                <div style="text-align: center; border-top: 1px solid #000; width: 35%; padding-top: 10px;">Company Representative</div>
                <div style="text-align: center; border-top: 1px solid #000; width: 35%; padding-top: 10px;">Agent / Broker Signature</div>
            </div>

            <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #888;">
                This receipt confirms the commission payout described above.
            </div>
        </div>
    `;

    try {
        // Wait for paint so DOM is ready
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const canvas = await html2canvas(container, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7);
        const doc = new jsPDF('p', 'mm', 'a4', true);
        setupArabicFont(doc);

        const { PAGE_WIDTH, PAGE_HEIGHT, HEADER_HEIGHT, FOOTER_HEIGHT } = getPDFDimensions();
        const contentWidth = PAGE_WIDTH - 20;
        const contentHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 10;

        const imgProps = doc.getImageProperties(imgData);
        const originalWidth = imgProps.width;
        const originalHeight = imgProps.height;

        let finalPdfWidth = contentWidth;
        let finalPdfHeight = (originalHeight * contentWidth) / originalWidth;

        if (finalPdfHeight > contentHeight) {
            finalPdfHeight = contentHeight;
            finalPdfWidth = (originalWidth * contentHeight) / originalHeight;
        }

        const marginX = (PAGE_WIDTH - finalPdfWidth) / 2;
        const marginY = HEADER_HEIGHT + 5;

        doc.addImage(imgData, 'JPEG', marginX, marginY, finalPdfWidth, finalPdfHeight, undefined, 'FAST');
        await applyBranding(doc);

        return doc;
    } catch (e) {
        console.error('Commission Receipt PDF Error:', e);
        throw e;
    } finally {
        if (document.body.contains(container)) document.body.removeChild(container);
    }
};
