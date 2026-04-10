import React, { useMemo } from 'react';
import {
    IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonContent
} from '@ionic/react';
import { close, downloadOutline } from 'ionicons/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../services/DataService';
import { getLandscapePDFDimensions, applyBranding, setupArabicFont } from '../services/PDFService';
import { getCurrentLanguage, isRTL } from '../services/i18n';

const parseSafeDate = (dStr) => {
    if (!dStr) return new Date(NaN);
    if (dStr instanceof Date) return dStr;

    const num = Number(dStr);
    if (!isNaN(num) && num > 20000 && num < 100000) {
        return new Date((num - 25569) * 86400 * 1000);
    }

    let d = new Date(dStr);
    if (!isNaN(d.getTime())) return d;

    if (typeof dStr === 'string' && (dStr.includes('-') || dStr.includes('/'))) {
        const sep = dStr.includes('-') ? '-' : '/';
        const pts = dStr.split(sep);
        if (pts.length === 3) {
            if (pts[0].length === 4) {
                return new Date(parseInt(pts[0]), parseInt(pts[1]) - 1, parseInt(pts[2]));
            } else if (pts[2].length === 4) {
                return new Date(parseInt(pts[2]), parseInt(pts[1]) - 1, parseInt(pts[0]));
            }
        }
    }
    return d;
};

const formatReportDate = (dateVal) => {
    const d = parseSafeDate(dateVal);
    if (isNaN(d.getTime())) return String(dateVal || '');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const InstallmentsReportModal = ({ isOpen, onClose, installments, title }) => {
    const stats = useMemo(() => {
        const total = installments.reduce((s, i) => s + Number(i.amount), 0);
        const collected = installments.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
        const remaining = installments.reduce((s, i) => s + Math.max(0, Number(i.amount) - Number(i.paidAmount || 0)), 0);
        return { total, collected, remaining };
    }, [installments]);

    const handleExportPDF = async () => {
        try {
            const isArabic = getCurrentLanguage() === 'ar';
            const pdf = new jsPDF('l', 'mm', 'a4');

            setupArabicFont(pdf);
            pdf.setFont('Amiri');

            const { HEADER_HEIGHT, FOOTER_HEIGHT, PAGE_HEIGHT, PAGE_WIDTH } = getLandscapePDFDimensions();
            const margin = 10;
            const usableWidth = PAGE_WIDTH - (margin * 2);

            // Summary section via html2canvas
            const summaryElement = document.getElementById('report-summary-section');
            if (summaryElement) {
                summaryElement.classList.add('pdf-render-zone');
                const canvas = await html2canvas(summaryElement, { scale: 2 });
                summaryElement.classList.remove('pdf-render-zone');
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const imgWidth = usableWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'JPEG', margin, HEADER_HEIGHT + 2, imgWidth, imgHeight);
            }

            // Table
            const tableRows = installments.map(ins => {
                const balance = Math.max(0, Number(ins.amount) - Number(ins.paidAmount || 0));
                return [
                    ins.unitId,
                    ins.walletName && ins.walletName !== 'N/A'
                        ? `${ins.customerName}\n[${ins.walletName}]`
                        : ins.customerName,
                    `${ins.bank || 'N/A'}\n# ${ins.chequeNumber || '-'}`,
                    formatReportDate(ins.dueDate),
                    ins.status.toUpperCase(),
                    formatCurrency(ins.amount),
                    formatCurrency(balance)
                ];
            });

            // Distribute columns proportionally across full usable width
            const colRatios = [0.07, 0.25, 0.18, 0.1, 0.1, 0.15, 0.15];

            autoTable(pdf, {
                head: [['ID', 'Customer / Wallet', 'Bank / Cheque', 'Due Date', 'Status', 'Amount', 'Balance']],
                body: tableRows,
                startY: HEADER_HEIGHT + 55,
                margin: { top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5, left: margin, right: margin },
                tableWidth: usableWidth,
                theme: 'striped',
                headStyles: {
                    fillColor: [26, 29, 36],
                    textColor: [197, 160, 89],
                    fontStyle: 'bold',
                    fontSize: 9,
                    font: 'Amiri',
                    halign: isArabic ? 'right' : 'left',
                    cellPadding: 2
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'top',
                    overflow: 'linebreak',
                    font: 'Amiri',
                    halign: isArabic ? 'right' : 'left'
                },
                columnStyles: {
                    0: { cellWidth: usableWidth * colRatios[0] },
                    1: { cellWidth: usableWidth * colRatios[1] },
                    2: { cellWidth: usableWidth * colRatios[2] },
                    3: { cellWidth: usableWidth * colRatios[3] },
                    4: { cellWidth: usableWidth * colRatios[4] },
                    5: { cellWidth: usableWidth * colRatios[5], halign: 'right' },
                    6: { cellWidth: usableWidth * colRatios[6], halign: 'right' }
                },
                didDrawPage: async () => {
                    await applyBranding(pdf);
                }
            });

            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            alert("Error generating PDF: " + err.message);
        }
    };

    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose} className="chrono-modal" style={{ '--width': '98%', '--height': '98%' }}>
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': '#1a1d24', '--color': '#fff', padding: '6px 10px' }}>
                    <IonTitle style={{ fontSize: '1rem', fontWeight: '800', letterSpacing: '1px' }}>
                        REPORT PREVIEW
                    </IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={handleExportPDF} fill="solid" style={{ '--background': '#c5a059', '--color': '#000', '--border-radius': '10px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            <IonIcon icon={downloadOutline} slot="start" />
                            EXPORT PDF
                        </IonButton>
                        <IonButton onClick={onClose} style={{ marginLeft: '8px' }}>
                            <IonIcon icon={close} style={{ fontSize: '22px' }} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent style={{ '--background': '#0f1115' }}>
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div id="report-container" dir={isRTL() ? 'rtl' : 'ltr'} style={{
                        width: '100%',
                        maxWidth: '1400px',
                        background: '#fff',
                        color: '#000',
                        padding: '28px 32px',
                        borderRadius: '4px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        fontFamily: isRTL() ? "'Amiri', serif" : "'Inter', sans-serif"
                    }}>
                        <div id="report-summary-section">
                            {/* Header Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#c5a059', letterSpacing: '1px' }}>{title || 'SCHEDULE REPORT'}</h1>
                                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.75rem' }}>Generated {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString()}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Records</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1a1d24' }}>{installments.length}</div>
                                </div>
                            </div>

                            {/* Stats Row - Compact */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Volume</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>{formatCurrency(stats.total)}</div>
                                </div>
                                <div style={{ flex: 1, background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ color: '#16a34a', fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Collected</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#15803d' }}>{formatCurrency(stats.collected)}</div>
                                </div>
                                <div style={{ flex: 1, background: '#fffbeb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                    <div style={{ color: '#d97706', fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#b45309' }}>{formatCurrency(stats.remaining)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Table - Full Width */}
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ background: '#1a1d24' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '7%' }}>ID</th>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>Customer / Wallet</th>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '18%' }}>Bank / Cheque</th>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Due Date</th>
                                        <th style={{ textAlign: 'center', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Status</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '15%' }}>Amount</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: '#c5a059', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '15%' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {installments.map((ins, idx) => {
                                        const balance = Math.max(0, Number(ins.amount) - Number(ins.paidAmount || 0));
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ padding: '7px 10px', fontWeight: '700', color: '#334155', fontSize: '0.78rem' }}>
                                                    {ins.unitId}
                                                </td>
                                                <td style={{ padding: '7px 10px' }}>
                                                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.78rem' }}>{ins.customerName}</div>
                                                    {ins.walletName && ins.walletName !== 'N/A' && (
                                                        <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>↳ {ins.walletName}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '7px 10px' }}>
                                                    <div style={{ color: '#1e293b', fontWeight: '600', fontSize: '0.78rem' }}>{ins.bank || 'N/A'}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.68rem', fontFamily: 'monospace' }}>#{ins.chequeNumber || '-'}</div>
                                                </td>
                                                <td style={{ padding: '7px 10px', color: '#334155', fontSize: '0.78rem' }}>{formatReportDate(ins.dueDate)}</td>
                                                <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.68rem',
                                                        fontWeight: '800',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-block',
                                                        background: ins.status === 'Paid' ? '#dcfce7' : balance > 0 ? '#fef3c7' : '#f1f5f9',
                                                        color: ins.status === 'Paid' ? '#166534' : balance > 0 ? '#92400e' : '#475569'
                                                    }}>
                                                        {ins.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '0.78rem' }}>{formatCurrency(ins.amount)}</td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', fontSize: '0.78rem', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                                                    {formatCurrency(balance)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.65rem', textAlign: 'center', letterSpacing: '0.5px' }}>
                            Designed & Managed by DYR · Authenticated System Report
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default InstallmentsReportModal;
