import React, { useState } from 'react';
import {
    IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonSelect, IonSelectOption, IonSearchbar
} from '@ionic/react';
import { close, downloadOutline, create, mapOutline, statsChartOutline, cashOutline, peopleOutline, businessOutline, documentTextOutline, imagesOutline, checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { getBuildings, saveBuildings, formatCurrency, getCurrency } from '../services/DataService';
import { t, getCurrentLanguage, isRTL } from '../services/i18n';
import { applyBranding, getPDFDimensions, setupArabicFont } from '../services/PDFService';
import { Capacitor } from '@capacitor/core';
import PDFPreviewModal from './PDFPreviewModal';

// Helper to format dates (handles Excel serial numbers)
const formatExcelDate = (dateVal) => {
    if (!dateVal) return '-';

    if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return '-';
        const dd = String(dateVal.getDate()).padStart(2, '0');
        const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
        const yyyy = dateVal.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    let date;
    const num = Number(dateVal);
    if (!isNaN(num) && num > 20000 && num < 100000) {
        date = new Date((num - 25569) * 86400 * 1000);
    } else {
        date = parseSafe(String(dateVal));
    }

    if (isNaN(date.getTime())) return String(dateVal);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const parseSafe = (dStr) => {
    if (!dStr) return new Date(NaN);
    if (dStr instanceof Date) return dStr;

    // Handle Excel serial (typically 5 digits, e.g. 45000)
    const num = Number(dStr);
    if (!isNaN(num) && num > 20000 && num < 100000) {
        return new Date((num - 25569) * 86400 * 1000);
    }

    // Try native
    let d = new Date(dStr);
    if (!isNaN(d.getTime())) return d;

    // Try YYYY-MM-DD or DD-MM-YYYY or with slashes
    if (typeof dStr === 'string' && (dStr.includes('-') || dStr.includes('/'))) {
        const sep = dStr.includes('-') ? '-' : '/';
        const pts = dStr.split(sep);
        if (pts.length === 3) {
            if (pts[0].length === 4) {
                // YYYY-MM-DD
                return new Date(parseInt(pts[0]), parseInt(pts[1]) - 1, parseInt(pts[2]));
            } else if (pts[2].length === 4) {
                // DD-MM-YYYY
                return new Date(parseInt(pts[2]), parseInt(pts[1]) - 1, parseInt(pts[0]));
            }
        }
    }
    return d;
};

const ReportsHub = ({ isOpen, onClose, buildings, setBuildings, installments, customers, offers, contracts, terminatedContracts, terminatedInstallments, sales = [], wallets = [], initialTab = 'inventory' }) => {
    const isMobile = Capacitor.getPlatform() !== 'web' && Capacitor.getPlatform() !== 'electron';
    const [reportTab, setReportTab] = useState(initialTab);


    // Update tab if initialTab changes while open or when reopening
    React.useEffect(() => {
        if (isOpen) {
            setReportTab(initialTab);
        }
    }, [initialTab, isOpen]);

    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [overduePrintScope, setOverduePrintScope] = useState('all'); // 'all', 'rejected', 'no_rejected'
    const [overdueWalletFilter, setOverdueWalletFilter] = useState('all');

    // Inventory State
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [editingUnitPlan, setEditingUnitPlan] = useState(null);
    const [editPlanValue, setEditPlanValue] = useState('');

    // Unit Layout Modal State
    const [showLayoutModal, setShowLayoutModal] = useState(false);
    const [layoutImageUrl, setLayoutImageUrl] = useState(null);
    const [layoutUnitId, setLayoutUnitId] = useState('');
    const [includeLayouts, setIncludeLayouts] = useState(false);
    const [layoutsPerPage, setLayoutsPerPage] = useState(8);
    const [layoutProgress, setLayoutProgress] = useState('');

    // Sales Report State
    const [salesDateFrom, setSalesDateFrom] = useState('');
    const [salesDateTo, setSalesDateTo] = useState('');
    const [salesBuildingFilter, setSalesBuildingFilter] = useState('all');

    // Preview State
    const [previewPdf, setPreviewPdf] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFilename, setPreviewFilename] = useState('');

    // -- INTERNAL ESC NAVIGATION (Back one phase) --
    React.useEffect(() => {
        const handleInternalEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                // Check in order of specificity (nested modals first)
                if (showPreview) {
                    setShowPreview(false);
                    e.stopImmediatePropagation();
                    return;
                }
                if (showLayoutModal) {
                    setShowLayoutModal(false);
                    e.stopImmediatePropagation();
                    return;
                }
                if (editingUnitPlan) {
                    setEditingUnitPlan(null);
                    e.stopImmediatePropagation();
                    return;
                }
                if (viewingCustomer) {
                    setViewingCustomer(null);
                    e.stopImmediatePropagation();
                    return;
                }
                if (selectedBuilding) {
                    setSelectedBuilding(null);
                    e.stopImmediatePropagation();
                    return;
                }
            }
        };

        // Use capture: true so this runs before App.jsx global listener
        window.addEventListener('keydown', handleInternalEsc, true);
        return () => window.removeEventListener('keydown', handleInternalEsc, true);
    }, [isOpen, showPreview, showLayoutModal, editingUnitPlan, viewingCustomer, selectedBuilding]);

    const handlePreview = (doc, filename) => {
        setPreviewPdf(doc);
        setPreviewFilename(filename);
        setShowPreview(true);
    };

    // Terminated Tab Search
    const [searchTermTerminated, setSearchTermTerminated] = useState('');

    const handleViewLayout = async (unitId) => {
        if (!window.electronAPI) {
            alert("Layout viewing is only available in the desktop app.");
            return;
        }

        try {
            const imageUrl = await window.electronAPI.getUnitLayout(unitId);
            if (imageUrl) {
                setLayoutImageUrl(imageUrl);
                setLayoutUnitId(unitId);
                setShowLayoutModal(true);
            } else {
                alert(`No layout found for Unit ${unitId}. Please ensure ${unitId}.png exists in the LAYOUTS folder.`);
            }
        } catch (error) {
            console.error("Error loading layout:", error);
            alert("Failed to load unit layout. Please restart the application to apply the layout system updates.");
        }
    };

    // Helper to close and reset
    const handleClose = () => {
        setSelectedBuilding(null);
        setShowPreview(false);
        setPreviewPdf(null);
        onClose();
    };

    return (
        <IonModal
            isOpen={isOpen}
            onDidDismiss={handleClose}
            className="chrono-modal"
            style={{ '--width': '98%', '--max-width': '1400px', '--height': '96%' }}
        >
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': '#0f1115', '--color': '#c5a059', '--padding-top': isMobile ? '20px' : '0' }}>
                    <IonTitle style={{ fontWeight: '900', letterSpacing: '2px' }}>{t('home.reports').toUpperCase()}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={handleClose} color="light">
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent style={{ '--background': 'var(--app-bg)', '--overflow': 'hidden' }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    height: '100%',
                    background: 'transparent'
                }}>
                    {/* --- PRO SIDEBAR (MASTER) --- */}
                    <div style={{
                        width: isMobile ? '100%' : '300px',
                        background: 'rgba(15, 17, 21, 0.4)',
                        backdropFilter: 'blur(20px)',
                        borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        gap: '12px',
                        overflowX: isMobile ? 'auto' : 'visible',
                        zIndex: 10
                    }}>
                        {!isMobile && (
                            <div style={{ marginBottom: '20px', padding: '0 10px' }}>
                                <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px' }}>
                                    {t('reports.reportCategories')}
                                </div>
                            </div>
                        )}

                        {[
                            { id: 'inventory', label: t('reports.inventory'), color: '#c5a059', icon: businessOutline, desc: t('reports.inventory') },
                            { id: 'sales', label: t('reports.salesReport'), color: '#2dd36f', icon: statsChartOutline, desc: t('reports.volumeGrowth') },
                            { id: 'overdue', label: t('reports.overdueReport'), color: '#eb445a', icon: cashOutline, desc: t('reports.collections') },
                            { id: 'customers', label: t('reports.customersReport'), color: '#3880ff', icon: peopleOutline, desc: t('reports.clientRecords') }
                        ].map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setReportTab(tab.id)}
                                className="animate-fade-in"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '14px 18px',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: reportTab === tab.id ? `${tab.color}15` : 'rgba(255,255,255,0.02)',
                                    border: '1px solid',
                                    borderColor: reportTab === tab.id ? `${tab.color}40` : 'rgba(255,255,255,0.05)',
                                    color: reportTab === tab.id ? tab.color : '#ccc',
                                    minWidth: isMobile ? '140px' : 'auto',
                                    boxShadow: reportTab === tab.id ? `0 10px 20px ${tab.color}08` : 'none',
                                    transform: reportTab === tab.id ? 'translateX(5px)' : 'none'
                                }}
                            >
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    background: reportTab === tab.id ? tab.color : 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <IonIcon 
                                        icon={tab.icon} 
                                        style={{ 
                                            fontSize: '22px', 
                                            color: reportTab === tab.id ? '#000' : '#888' 
                                        }} 
                                    />
                                </div>
                                {!isMobile && (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.5px' }}>{tab.label}</span>
                                        <span style={{ fontSize: '0.7rem', color: reportTab === tab.id ? `${tab.color}99` : '#888', marginTop: '2px' }}>{tab.desc}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* --- MAIN CONTENT (DETAIL) --- */}
                    <div style={{ 
                        flex: 1, 
                        padding: isMobile ? '20px' : '30px', 
                        overflowY: 'auto',
                        background: 'transparent',
                        position: 'relative'
                    }}>

                    {/* --- TAB: SALES REPORT --- */}
                    {reportTab === 'sales' && (
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                                <div style={{ flex: 1, display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.65rem', color: '#1E293B', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>{t('reports.fromDate')}</label>
                                        <input 
                                            type="text" 
                                            placeholder="DD/MM/YYYY"
                                            value={salesDateFrom ? (() => {
                                                const d = new Date(salesDateFrom);
                                                if (isNaN(d.getTime())) return salesDateFrom;
                                                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                            })() : ''}
                                            onChange={e => {
                                                // Try to handle both formats for input
                                                const val = e.target.value;
                                                const parts = val.split(/[-/]/);
                                                if (parts.length === 3) {
                                                    if (parts[0].length === 2 && parts[2].length === 4) {
                                                        // DD/MM/YYYY -> YYYY-MM-DD
                                                        setSalesDateFrom(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
                                                    } else if (parts[0].length === 4) {
                                                        setSalesDateFrom(val);
                                                    }
                                                } else {
                                                    setSalesDateFrom(val);
                                                }
                                            }}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '12px', color: '#1E293B' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.65rem', color: '#1E293B', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>{t('reports.toDate')}</label>
                                        <input 
                                            type="text" 
                                            placeholder="DD/MM/YYYY"
                                            value={salesDateTo ? (() => {
                                                const d = new Date(salesDateTo);
                                                if (isNaN(d.getTime())) return salesDateTo;
                                                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                            })() : ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const parts = val.split(/[-/]/);
                                                if (parts.length === 3) {
                                                    if (parts[0].length === 2 && parts[2].length === 4) {
                                                        setSalesDateTo(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
                                                    } else if (parts[0].length === 4) {
                                                        setSalesDateTo(val);
                                                    }
                                                } else {
                                                    setSalesDateTo(val);
                                                }
                                            }}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '12px', color: '#1E293B' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ width: isMobile ? '100%' : '250px' }}>
                                    <label style={{ fontSize: '0.65rem', color: '#1E293B', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>{t('reports.buildingFilter')}</label>
                                    <IonSelect
                                        value={salesBuildingFilter}
                                        onIonChange={e => setSalesBuildingFilter(e.detail.value)}
                                        interface="popover"
                                        style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', color: '#1E293B', border: '1px solid rgba(0,0,0,0.1)', height: '45px' }}
                                    >
                                        <IonSelectOption value="all">{t('reports.allBuildings')}</IonSelectOption>
                                        {buildings.map(b => (
                                            <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
                                        ))}
                                    </IonSelect>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <IonButton
                                        color="medium"
                                        fill="clear"
                                        size="small"
                                        onClick={async () => {
                                            const element = document.getElementById('sales-report-content');
                                            if (element) {
                                                element.classList.add('pdf-render-zone');
                                                const canvas = await html2canvas(element, { scale: 2 });
                                                element.classList.remove('pdf-render-zone');
                                                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                                                const pdf = new jsPDF('p', 'mm', 'a4');
                                                setupArabicFont(pdf);
                                                pdf.setFont('Amiri');
                                                const { HEADER_HEIGHT, PAGE_WIDTH } = getPDFDimensions();
                                                const pW = PAGE_WIDTH - 20;
                                                const pH = (canvas.height * pW) / canvas.width;
                                                pdf.addImage(imgData, 'JPEG', 10, HEADER_HEIGHT, pW, pH);
                                                await applyBranding(pdf);
                                                handlePreview(pdf, 'Sales_Report.pdf');
                                            }
                                        }}
                                        style={{ '--color': '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    >
                                        <IonIcon icon={downloadOutline} slot="start" /> {t('reports.exportVisual')}
                                    </IonButton>
                                </div>
                            </div>

                            <div id="sales-report-content">
                                {(() => {
                                    // Utility to check if a date is within range
                                    const isWithinRange = (dateStr) => {
                                        if (!dateStr) return false;
                                        const date = parseSafe(dateStr);
                                        if (isNaN(date.getTime())) return false;
                                        
                                        if (salesDateFrom) {
                                            const from = new Date(salesDateFrom);
                                            from.setHours(0,0,0,0);
                                            if (date < from) return false;
                                        }
                                        if (salesDateTo) {
                                            const to = new Date(salesDateTo);
                                            to.setHours(23,59,59,999);
                                            if (date > to) return false;
                                        }
                                        return true;
                                    };

                                    // Utility to check building filter
                                    const matchesBuilding = (unitId) => {
                                        if (salesBuildingFilter === 'all') return true;
                                        const targetBuilding = buildings.find(b => String(b.id) === String(salesBuildingFilter));
                                        if (!targetBuilding) return false;
                                        return (targetBuilding.units || []).some(u => u.unitId === unitId);
                                    };

                                    const filteredOffers = (offers || []).filter(o => isWithinRange(o.date) && matchesBuilding(o.unitId));
                                    const filteredContracts = (contracts || []).filter(c => isWithinRange(c.date) && matchesBuilding(c.unitId));

                                    const totalOfferValue = filteredOffers.reduce((sum, o) => sum + Number(o.totalPrice || o.finalPrice || 0), 0);
                                    const totalContractValue = filteredContracts.reduce((sum, c) => sum + Number(c.totalPrice || c.finalPrice || 0), 0);

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                            {/* KPIs */}
                                            <div className="pro-grid" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '20px' }}>
                                                <div className="pro-glass-card" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #3880ff', background: '#fff' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.offersCount')}</div>
                                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1E293B' }}>{filteredOffers.length}</div>
                                                </div>
                                                <div className="pro-glass-card" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #2dd36f', background: '#fff' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.contractsCount')}</div>
                                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1E293B' }}>{filteredContracts.length}</div>
                                                </div>
                                                <div className="pro-glass-card" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #ffc409', background: '#fff' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.offerVolume')}</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{formatCurrency(totalOfferValue)}</div>
                                                </div>
                                                <div className="pro-glass-card" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #c5a059', background: '#fff' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.contractVolume')}</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B' }}>{formatCurrency(totalContractValue)}</div>
                                                </div>
                                            </div>

                                            {/* Details Tables */}
                                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
                                                {/* Offers List */}
                                                <div className="pro-glass-card" style={{ flex: 1, padding: '0', overflow: 'hidden' }}>
                                                    <div style={{ padding: '15px 20px', background: 'rgba(56, 128, 255, 0.1)', borderBottom: '1px solid #e2e8f0', fontWeight: '900', color: '#3880ff', fontSize: '0.8rem', letterSpacing: '1px' }}>
                                                        {t('reports.recentOffers')} ({filteredOffers.length})
                                                    </div>
                                                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                                                                <tr style={{ color: '#fff', textAlign: 'left' }}>
                                                                    <th style={{ padding: '12px' }}>{t('reports.date')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.unit')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.customer')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.agent')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.value')}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {filteredOffers.length === 0 ? (
                                                                    <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>{t('reports.noOffersInRange')}</td></tr>
                                                                ) : (
                                                                    filteredOffers.map(o => (
                                                                        <tr key={o.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: '#1E293B' }}>
                                                                            <td style={{ padding: '12px', color: '#64748B' }}>{formatExcelDate(o.date)}</td>
                                                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{o.unitId}</td>
                                                                            <td style={{ padding: '12px' }}>{customers.find(c => c.id === o.customerId)?.name || o.customerName || 'N/A'}</td>
                                                                            <td style={{ padding: '12px' }}>{sales.find(s => s.id === o.salesId)?.name || '—'}</td>
                                                                            <td style={{ padding: '12px', color: '#c5a059', fontWeight: '800' }}>{formatCurrency(o.totalPrice || o.finalPrice)}</td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Contracts List */}
                                                <div className="pro-glass-card" style={{ flex: 1, padding: '0', overflow: 'hidden' }}>
                                                    <div style={{ padding: '15px 20px', background: 'rgba(45, 211, 111, 0.1)', borderBottom: '1px solid #e2e8f0', fontWeight: '900', color: '#2dd36f', fontSize: '0.8rem', letterSpacing: '1px' }}>
                                                        {t('reports.convertedContracts')} ({filteredContracts.length})
                                                    </div>
                                                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                                                                <tr style={{ color: '#fff', textAlign: 'left' }}>
                                                                    <th style={{ padding: '12px' }}>{t('reports.date')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.unit')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.customer')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.agent')}</th>
                                                                    <th style={{ padding: '12px' }}>{t('reports.price')}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {filteredContracts.length === 0 ? (
                                                                    <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>{t('reports.noContractsInRange')}</td></tr>
                                                                ) : (
                                                                    filteredContracts.map(c => (
                                                                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: '#1E293B' }}>
                                                                            <td style={{ padding: '12px', color: '#64748B' }}>{formatExcelDate(c.date)}</td>
                                                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.unitId}</td>
                                                                            <td style={{ padding: '12px' }}>{customers.find(cust => cust.id === c.customerId)?.name || c.customerName || 'N/A'}</td>
                                                                            <td style={{ padding: '12px' }}>{sales.find(s => s.id === c.salesId)?.name || '—'}</td>
                                                                            <td style={{ padding: '12px', color: '#2dd36f', fontWeight: '800' }}>{formatCurrency(c.totalPrice || c.finalPrice)}</td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: INVENTORY --- */}
                    {reportTab === 'inventory' && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ width: isMobile ? '100%' : '350px' }}>
                                    <label style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>{t('reports.searchProperty')}</label>
                                    <IonSelect
                                        value={selectedBuilding?.id || ''}
                                        onIonChange={e => {
                                            const b = buildings.find(b => String(b.id) === String(e.detail.value));
                                            setSelectedBuilding(b || null);
                                        }}
                                        interface="action-sheet"
                                        placeholder={t('reports.chooseProject')}
                                        style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', color: '#1E293B', border: '1px solid rgba(0,0,0,0.1)' }}
                                    >
                                        {buildings.map(b => (
                                            <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
                                        ))}
                                    </IonSelect>
                                </div>

                                {selectedBuilding && (
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px', marginTop: isMobile ? '15px' : '0' }}>
                                        {/* Include Layouts Toggle */}
                                        {window.electronAPI && (
                                          <div
                                            onClick={() => setIncludeLayouts(!includeLayouts)}
                                            style={{
                                              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                              padding: '6px 14px', borderRadius: '10px',
                                              background: includeLayouts ? 'rgba(197, 160, 89, 0.15)' : 'rgba(255,255,255,0.04)',
                                              border: `1.5px solid ${includeLayouts ? '#c5a059' : 'rgba(255,255,255,0.1)'}`,
                                              transition: 'all 0.3s ease', userSelect: 'none'
                                            }}
                                          >
                                            <IonIcon icon={includeLayouts ? checkmarkCircle : ellipseOutline} style={{ fontSize: '18px', color: includeLayouts ? '#c5a059' : '#64748B' }} />
                                            <IonIcon icon={imagesOutline} style={{ fontSize: '16px', color: includeLayouts ? '#c5a059' : '#888' }} />
                                            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: includeLayouts ? '#c5a059' : '#888' }}>Include Layouts</span>
                                          </div>
                                        )}

                                        {/* Layouts Per Page Selector */}
                                        {includeLayouts && window.electronAPI && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '10px', background: 'rgba(197, 160, 89, 0.08)', border: '1.5px solid rgba(197, 160, 89, 0.25)' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#c5a059', whiteSpace: 'nowrap' }}>Per Page:</span>
                                            {[1, 2, 3, 4, 5, 6, 8, 9, 10, 12].map(n => (
                                              <div
                                                key={n}
                                                onClick={() => setLayoutsPerPage(n)}
                                                style={{
                                                  width: '26px', height: '26px', borderRadius: '6px', display: 'flex',
                                                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                  fontSize: '0.75rem', fontWeight: '800',
                                                  background: layoutsPerPage === n ? '#c5a059' : 'transparent',
                                                  color: layoutsPerPage === n ? '#000' : '#888',
                                                  border: layoutsPerPage === n ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                  transition: 'all 0.2s ease'
                                                }}
                                              >{n}</div>
                                            ))}
                                          </div>
                                        )}

                                        {layoutProgress && (
                                          <span style={{ fontSize: '0.75rem', color: '#c5a059', fontWeight: '600', animation: 'pulse 1.5s ease-in-out infinite' }}>{layoutProgress}</span>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                        <IonButton
                                            color="medium"
                                            fill="clear"
                                            size="small"
                                            onClick={async () => {
                                                const element = document.getElementById('inventory-report-container');
                                                if (element) {
                                                    try {
                                                        element.classList.add('pdf-render-zone');
                                                        const canvas = await html2canvas(element, { scale: 2 });
                                                        element.classList.remove('pdf-render-zone');
                                                        const imgData = canvas.toDataURL('image/jpeg', 0.7);
                                                        const pdf = new jsPDF('p', 'mm', 'a4', true);
                                                        setupArabicFont(pdf);
                                                        pdf.setFont('Amiri');
                                                        const { HEADER_HEIGHT, FOOTER_HEIGHT, PAGE_HEIGHT } = getPDFDimensions();
                                                        const pageWidth = pdf.internal.pageSize.getWidth();
                                                        const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
                                                        let contentWidth = pageWidth;
                                                        let contentHeight = (canvas.height * pageWidth) / canvas.width;
                                                        if (contentHeight > availableHeight) {
                                                            const scaleFactor = availableHeight / contentHeight;
                                                            contentHeight = availableHeight;
                                                            contentWidth = pageWidth * scaleFactor;
                                                        }
                                                        const xOffset = (pageWidth - contentWidth) / 2;
                                                        pdf.addImage(imgData, 'JPEG', xOffset, HEADER_HEIGHT, contentWidth, contentHeight, undefined, 'FAST');
                                                        await applyBranding(pdf);
                                                        handlePreview(pdf, `Inventory_Visual_${selectedBuilding.name}.pdf`);
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error: " + err.message);
                                                    }
                                                }
                                            }}
                                            style={{ '--color': '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        >
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            {t('reports.visual')}
                                        </IonButton>
                                        <IonButton
                                            color="primary"
                                            size="small"
                                            onClick={async () => {
                                                try {
                                                    const freshBuildings = await getBuildings();
                                                    const freshBuilding = freshBuildings.find(b => String(b.id) === String(selectedBuilding.id));
                                                    const srcBuilding = freshBuilding || selectedBuilding;
                                                    const availableUnits = (srcBuilding.units || []).filter(u => (u.status || '').toLowerCase() === 'available').sort((a, b) => String(a.unitId || '').localeCompare(String(b.unitId || ''), undefined, { numeric: true }));
                                                    const doc = new jsPDF();
                                                    setupArabicFont(doc);
                                                    doc.setFont('Amiri');
                                                    const today = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

                                                    doc.setFontSize(18);
                                                    doc.setTextColor(197, 160, 89);
                                                    doc.text(`${t('reports.inventoryTitle')}: ${srcBuilding.name}`, 14, 50);
                                                    doc.setFontSize(10);
                                                    doc.setTextColor(128, 128, 128);
                                                    doc.text(`${t('reports.generate')}: ${today}`, 14, 58);
                                                    if (includeLayouts) {
                                                        doc.setFontSize(8);
                                                        doc.setTextColor(197, 160, 89);
                                                        doc.text('* Unit layouts included at end of report', 14, 63);
                                                    }

                                                    autoTable(doc, {
                                                        styles: { font: 'Amiri' },
                                                        margin: { top: 50, bottom: 35 },
                                                        startY: includeLayouts ? 68 : 65,
                                                        head: [[t('reports.unitId'), t('reports.area'), t('reports.floor'), t('reports.view'), t('reports.price'), t('reports.finishedPrice'), t('reports.plan')]],
                                                        body: availableUnits.map(u => [
                                                            u.unitId || '-',
                                                            u.area || '-',
                                                            u.floor || '-',
                                                            u.view || '-',
                                                            u.price ? formatCurrency(u.price) : '-',
                                                            u.finishedPrice ? formatCurrency(u.finishedPrice) : '-',
                                                            u.plan || '-'
                                                        ]),
                                                        theme: 'striped',
                                                        headStyles: { font: 'Amiri', fillColor: [197, 160, 89] }
                                                    });

                                                    // --- APPEND LAYOUT IMAGES (8 per page, 2x4 grid) ---
                                                    if (includeLayouts && window.electronAPI) {
                                                        setLayoutProgress('Loading layouts...');
                                                        let loadedCount = 0;
                                                        const pageW = doc.internal.pageSize.getWidth();
                                                        const pageH = doc.internal.pageSize.getHeight();

                                                        // Collect all loaded layouts first
                                                        const layoutItems = [];
                                                        for (const unit of availableUnits) {
                                                            try {
                                                                setLayoutProgress(`Loading layout ${++loadedCount}/${availableUnits.length}: ${unit.unitId}`);
                                                                const imgUrl = await window.electronAPI.getUnitLayout(unit.unitId);
                                                                if (!imgUrl) continue;

                                                                const result = await new Promise((resolve, reject) => {
                                                                    const img = new Image();
                                                                    img.crossOrigin = 'anonymous';
                                                                    img.onload = () => {
                                                                        const cvs = document.createElement('canvas');
                                                                        cvs.width = img.naturalWidth;
                                                                        cvs.height = img.naturalHeight;
                                                                        const ctx = cvs.getContext('2d');
                                                                        ctx.drawImage(img, 0, 0);

                                                                        // Auto-crop: find bounding box of non-white pixels
                                                                        const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
                                                                        const w = cvs.width, h = cvs.height;
                                                                        const threshold = 245;
                                                                        let top = h, left = w, bottom = 0, right = 0;
                                                                        for (let y = 0; y < h; y++) {
                                                                            for (let x = 0; x < w; x++) {
                                                                                const idx = (y * w + x) * 4;
                                                                                if (data[idx] < threshold || data[idx+1] < threshold || data[idx+2] < threshold) {
                                                                                    if (y < top) top = y;
                                                                                    if (y > bottom) bottom = y;
                                                                                    if (x < left) left = x;
                                                                                    if (x > right) right = x;
                                                                                }
                                                                            }
                                                                        }

                                                                        const padX = Math.round(w * 0.02);
                                                                        const padY = Math.round(h * 0.02);
                                                                        top = Math.max(0, top - padY);
                                                                        left = Math.max(0, left - padX);
                                                                        bottom = Math.min(h - 1, bottom + padY);
                                                                        right = Math.min(w - 1, right + padX);

                                                                        const cropW = right - left + 1;
                                                                        const cropH = bottom - top + 1;

                                                                        if (cropW < w * 0.9 || cropH < h * 0.9) {
                                                                            const cropped = document.createElement('canvas');
                                                                            cropped.width = cropW;
                                                                            cropped.height = cropH;
                                                                            const cCtx = cropped.getContext('2d');
                                                                            cCtx.drawImage(cvs, left, top, cropW, cropH, 0, 0, cropW, cropH);
                                                                            resolve({ imgData: cropped.toDataURL('image/jpeg', 0.85), imgW: cropW, imgH: cropH });
                                                                        } else {
                                                                            resolve({ imgData: cvs.toDataURL('image/jpeg', 0.85), imgW: w, imgH: h });
                                                                        }
                                                                    };
                                                                    img.onerror = () => reject(new Error('Failed to load'));
                                                                    img.src = imgUrl;
                                                                });
                                                                layoutItems.push({ unit, imgData: result.imgData, imgW: result.imgW, imgH: result.imgH });
                                                            } catch (err) {
                                                                console.warn(`Skipping layout for ${unit.unitId}:`, err.message);
                                                            }
                                                        }

                                                        // Detect if images are mostly landscape
                                                        const avgRatio = layoutItems.reduce((sum, li) => sum + (li.imgW / li.imgH), 0) / (layoutItems.length || 1);
                                                        const isLandscape = avgRatio > 1.2;

                                                        // Dynamic grid: landscape uses 1-col stacks, portrait uses 2-col
                                                        const gridMapLandscape = { 1:[1,1], 2:[1,2], 3:[1,3], 4:[2,2], 5:[1,5], 6:[2,3], 8:[2,4], 9:[2,5], 10:[2,5], 12:[2,6] };
                                                        const gridMapPortrait  = { 1:[1,1], 2:[2,1], 3:[3,1], 4:[2,2], 5:[5,1], 6:[2,3], 8:[2,4], 9:[3,3], 10:[2,5], 12:[3,4] };
                                                        const gridMap = isLandscape ? gridMapLandscape : gridMapPortrait;
                                                        const [COLS, ROWS] = gridMap[layoutsPerPage] || [2,4];
                                                        const PER_PAGE = COLS * ROWS;
                                                        const margin = 8;
                                                        const brandingHeaderH = 40; // branding header image
                                                        const titleBarH = 14;
                                                        const footerH = 32; // branding footer
                                                        const cellGap = 4;
                                                        const labelH = 10;
                                                        const contentStartY = brandingHeaderH + titleBarH;
                                                        const totalW = pageW - margin * 2;
                                                        const totalH = pageH - contentStartY - margin - footerH;
                                                        const cellW = (totalW - cellGap * (COLS - 1)) / COLS;
                                                        const cellH = (totalH - cellGap * (ROWS - 1)) / ROWS;

                                                        const pageCount = Math.ceil(layoutItems.length / PER_PAGE);
                                                        for (let pg = 0; pg < pageCount; pg++) {
                                                            doc.addPage();
                                                            const chunk = layoutItems.slice(pg * PER_PAGE, (pg + 1) * PER_PAGE);

                                                            // Page title bar (below branding header)
                                                            doc.setFillColor(30, 41, 59);
                                                            doc.rect(0, brandingHeaderH, pageW, titleBarH, 'F');
                                                            doc.setFontSize(9);
                                                            doc.setFont('Amiri', 'normal');
                                                            doc.setTextColor(197, 160, 89);
                                                            doc.text(`${srcBuilding.name} — Unit Layouts (${pg + 1}/${pageCount})`, margin, brandingHeaderH + 9);
                                                            doc.setFontSize(7);
                                                            doc.setTextColor(180, 180, 180);
                                                            doc.text(today, pageW - margin, brandingHeaderH + 9, { align: 'right' });

                                                            for (let i = 0; i < chunk.length; i++) {
                                                                const { unit, imgData } = chunk[i];
                                                                const col = i % COLS;
                                                                const row = Math.floor(i / COLS);
                                                                const cellX = margin + col * (cellW + cellGap);
                                                                const cellY = contentStartY + margin + row * (cellH + cellGap);

                                                                // Cell border
                                                                doc.setDrawColor(200, 200, 200);
                                                                doc.setLineWidth(0.3);
                                                                doc.rect(cellX, cellY, cellW, cellH);

                                                                // Unit label background
                                                                doc.setFillColor(245, 240, 228);
                                                                doc.rect(cellX, cellY, cellW, labelH, 'F');
                                                                doc.setFontSize(7);
                                                                doc.setFont('Amiri', 'normal');
                                                                doc.setTextColor(30, 41, 59);
                                                                doc.text(`Unit ${unit.unitId}`, cellX + 3, cellY + 4);
                                                                doc.setFontSize(5);
                                                                doc.setTextColor(100, 100, 100);
                                                                doc.text(`${unit.area || '-'}m² | F${unit.floor || '-'} | ${unit.view || '-'}`, cellX + 3, cellY + 8);
                                                                doc.setFontSize(5);
                                                                doc.setTextColor(45, 130, 80);
                                                                const baseP = unit.price ? formatCurrency(unit.price) : '-';
                                                                const finP = unit.finishedPrice ? formatCurrency(unit.finishedPrice) : '-';
                                                                const planTxt = unit.plan ? ` | Plan: ${unit.plan}` : '';
                                                                doc.text(`Base: ${baseP} | Fin: ${finP}${planTxt}`, cellX + cellW - 3, cellY + 6, { align: 'right' });

                                                                // Separator line
                                                                doc.setDrawColor(197, 160, 89);
                                                                doc.setLineWidth(0.5);
                                                                doc.line(cellX, cellY + labelH, cellX + cellW, cellY + labelH);

                                                                // Image area
                                                                const imgAreaW = cellW - 4;
                                                                const imgAreaH = cellH - labelH - 4;
                                                                const tmpImg = new Image();
                                                                tmpImg.src = imgData;
                                                                await new Promise(r => { tmpImg.onload = r; });
                                                                const ratio = Math.min(imgAreaW / tmpImg.naturalWidth, imgAreaH / tmpImg.naturalHeight);
                                                                const drawW = tmpImg.naturalWidth * ratio;
                                                                const drawH = tmpImg.naturalHeight * ratio;
                                                                const imgX = cellX + 2 + (imgAreaW - drawW) / 2;
                                                                const imgY = cellY + labelH + 2 + (imgAreaH - drawH) / 2;

                                                                doc.addImage(imgData, 'JPEG', imgX, imgY, drawW, drawH);
                                                            }
                                                        }
                                                        setLayoutProgress('');
                                                    }

                                                    await applyBranding(doc);
                                                    handlePreview(doc, `Inventory_${srcBuilding.name}_${today}.pdf`);
                                                } catch (err) {
                                                    console.error(err);
                                                    setLayoutProgress('');
                                                    alert("Error generating PDF: " + err.message);
                                                }
                                            }}
                                            style={{ '--background': '#c5a059', '--color': '#000', borderRadius: '8px' }}
                                        >
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            {t('reports.saveReport')}
                                        </IonButton>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedBuilding ? (
                                <div id="inventory-report-container" className="animate-fade-in" style={{ background: 'transparent', padding: '0' }}>
                                    {isMobile ? (
                                        <div className="pro-grid pro-grid-auto" style={{ gap: '12px' }}>
                                            {(selectedBuilding.units || [])
                                                .filter(u => (u.status || '').toLowerCase() === 'available')
                                                .sort((a, b) => String(a.unitId || '').localeCompare(String(b.unitId || ''), undefined, { numeric: true }))
                                                .map(unit => (
                                                    <div key={unit.id} className="pro-glass-card" style={{ padding: '15px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#c5a059' }}>{unit.unitId}</span>
                                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                                <IonButton fill="clear" size="small" onClick={() => handleViewLayout(unit.unitId)} style={{ margin: 0 }}>
                                                                    <IonIcon icon={mapOutline} style={{ fontSize: '20px', color: '#c5a059' }} />
                                                                </IonButton>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', color: '#888' }}>
                                                            <div>Area: <span style={{ color: '#fff' }}>{unit.area} m²</span></div>
                                                            <div>Floor: <span style={{ color: '#fff' }}>{unit.floor}</span></div>
                                                            <div style={{ gridColumn: 'span 2' }}>View: <span style={{ color: '#fff' }}>{unit.view}</span></div>
                                                            <div style={{ gridColumn: 'span 2', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                    <span>{t('reports.standard')}:</span>
                                                                    <span style={{ color: '#2dd36f', fontWeight: 'bold' }}>{formatCurrency(unit.price || 0)}</span>
                                                                </div>
                                                                {unit.finishedPrice > 0 && (
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span>{t('reports.finished')}:</span>
                                                                        <span style={{ color: '#3880ff', fontWeight: 'bold' }}>{formatCurrency(unit.finishedPrice)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
                                                            <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', display: 'block' }}>{t('reports.paymentPlan')}</label>
                                                            <div onClick={() => { setEditingUnitPlan(unit.id); setEditPlanValue(unit.plan || ''); }} style={{ fontSize: '0.9rem', color: '#c5a059', fontWeight: 'bold' }}>
                                                                {unit.plan || t('reports.tapToSet')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="chrono-table-container" style={{ background: '#fff', color: '#000', padding: '10px', borderRadius: '12px' }}>
                                            <table className="chrono-table">
                                                <thead>
                                                    <tr>
                                                        <th>{t('reports.unitId')}</th>
                                                        <th>{t('reports.area')}</th>
                                                        <th>{t('reports.floor')}</th>
                                                        <th>{t('reports.view')}</th>
                                                        <th>{t('reports.price')}</th>
                                                        <th>{t('reports.finishedPrice')}</th>
                                                        <th>{t('reports.plan')}</th>
                                                        <th>{t('reports.layout')}</th>
                                                        <th>{t('reports.edit')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(selectedBuilding.units || [])
                                                        .filter(u => (u.status || '').toLowerCase() === 'available')
                                                        .sort((a, b) => String(a.unitId || '').localeCompare(String(b.unitId || ''), undefined, { numeric: true }))
                                                        .map(unit => (
                                                            <tr key={unit.id}>
                                                                <td style={{ fontWeight: 'bold', color: '#c5a059' }}>{unit.unitId}</td>
                                                                <td>{unit.area}</td>
                                                                <td>{unit.floor}</td>
                                                                <td>{unit.view}</td>
                                                                <td>{formatCurrency(unit.price || 0)}</td>
                                                                <td>{unit.finishedPrice ? formatCurrency(unit.finishedPrice) : '-'}</td>
                                                                <td>
                                                                    {editingUnitPlan === unit.id ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editPlanValue}
                                                                            onChange={e => setEditPlanValue(e.target.value)}
                                                                            onBlur={async () => {
                                                                                const allBuildings = await getBuildings();
                                                                                const bIdx = allBuildings.findIndex(b => String(b.id) === String(selectedBuilding.id));
                                                                                if (bIdx !== -1) {
                                                                                    const uIdx = allBuildings[bIdx].units.findIndex(u => u.id === unit.id);
                                                                                    if (uIdx !== -1) {
                                                                                        allBuildings[bIdx].units[uIdx].plan = editPlanValue;
                                                                                        await saveBuildings(allBuildings);
                                                                                        setBuildings(allBuildings);
                                                                                        const updatedBuilding = allBuildings[bIdx];
                                                                                        setSelectedBuilding(updatedBuilding);
                                                                                    }
                                                                                }
                                                                                setEditingUnitPlan(null);
                                                                            }}
                                                                            onKeyDown={async (e) => {
                                                                                if (e.key === 'Enter') e.target.blur();
                                                                            }}
                                                                            autoFocus
                                                                            style={{ background: '#333', color: '#fff', border: 'none', padding: '5px' }}
                                                                        />
                                                                    ) : (
                                                                        <span onClick={() => { setEditingUnitPlan(unit.id); setEditPlanValue(unit.plan || ''); }}>
                                                                            {unit.plan || <em style={{ opacity: 0.5 }}>{t('reports.setPlan')}</em>}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <IonButton fill="clear" size="small" onClick={() => handleViewLayout(unit.unitId)} style={{ margin: 0 }}>
                                                                        <IonIcon icon={mapOutline} slot="icon-only" style={{ color: '#c5a059' }} />
                                                                    </IonButton>
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <IonButton fill="clear" size="small" onClick={() => { setEditingUnitPlan(unit.id); setEditPlanValue(unit.plan || ''); }} style={{ margin: 0 }}>
                                                                        <IonIcon icon={create} slot="icon-only" />
                                                                    </IonButton>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>{t('reports.selectProjectAbove')}</div>
                            )}
                        </>
                    )}

                    {/* Unit Layout Modal */}
                    <IonModal isOpen={showLayoutModal} onDidDismiss={() => setShowLayoutModal(false)} style={{ '--width': '95%', '--height': '95%', '--max-width': '1400px' }}>
                        <IonHeader>
                            <IonToolbar>
                                <IonTitle>{t('reports.unitLayout')}: {layoutUnitId}</IonTitle>
                                <IonButtons slot="end">
                                    <IonButton
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = layoutImageUrl;
                                            link.download = `Layout-${layoutUnitId}.png`;
                                            link.click();
                                        }}
                                        color="warning"
                                    >
                                        <IonIcon icon={downloadOutline} slot="start" /> Download
                                    </IonButton>
                                    <IonButton onClick={() => setShowLayoutModal(false)}>
                                        <IonIcon icon={close} />
                                    </IonButton>
                                </IonButtons>
                            </IonToolbar>
                        </IonHeader>
                        <IonContent className="ion-padding" style={{ '--background': '#0b0b0b' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', padding: '10px' }}>
                                {layoutImageUrl ? (
                                    <img
                                        src={layoutImageUrl}
                                        alt={`Layout for Unit ${layoutUnitId}`}
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderRadius: '8px' }}
                                    />
                                ) : (
                                    <div style={{ color: '#fff' }}>Loading layout...</div>
                                )}
                            </div>
                        </IonContent>
                    </IonModal>

                    {/* --- TAB: INSTALLMENTS REMOVED --- */}

                    {/* --- TAB: OVERDUE --- */}
                    {reportTab === 'overdue' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
                                <div style={{ background: 'rgba(235, 68, 90, 0.1)', borderLeft: '4px solid #eb445a', padding: '12px 20px', borderRadius: '12px', flex: 1 }}>
                                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.3rem', color: '#eb445a', fontWeight: '900' }}>{t('reports.overdueTitle').toUpperCase()}</h2>
                                    {!isMobile && <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#aaa' }}>{t('reports.trackingPayments')}</p>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <span style={{ color: '#888', fontSize: '0.7rem', fontWeight: 'bold' }}>{t('reports.wallet')}:</span>
                                        <IonSelect
                                            value={overdueWalletFilter}
                                            onIonChange={e => setOverdueWalletFilter(e.detail.value)}
                                            interface="popover"
                                            style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '0.85rem' }}
                                        >
                                            <IonSelectOption value="all">{t('reports.allWallets')}</IonSelectOption>
                                            <IonSelectOption value="none">Standard Cashes</IonSelectOption>
                                            {(wallets || []).map(w => (
                                                <IonSelectOption key={w.id} value={w.id}>{w.bankAddress}</IonSelectOption>
                                            ))}
                                        </IonSelect>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <span style={{ color: '#888', fontSize: '0.7rem', fontWeight: 'bold' }}>{t('reports.scope')}:</span>
                                        <IonSelect
                                            value={overduePrintScope}
                                            onIonChange={e => setOverduePrintScope(e.detail.value)}
                                            interface="popover"
                                            style={{ color: '#eb445a', fontWeight: 'bold', fontSize: '0.85rem' }}
                                        >
                                            <IonSelectOption value="all">{t('reports.recordAll')}</IonSelectOption>
                                            <IonSelectOption value="rejected">Rejected Only</IonSelectOption>
                                            <IonSelectOption value="no_rejected">Exclude Rejected</IonSelectOption>
                                        </IonSelect>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <IonButton
                                            color="medium"
                                            fill="clear"
                                            size="small"
                                            onClick={async () => {
                                                const element = document.getElementById('overdue-report-container');
                                                if (element) {
                                                    try {
                                                        element.classList.add('pdf-render-zone');
                                                        const canvas = await html2canvas(element, { scale: 2 });
                                                        element.classList.remove('pdf-render-zone');
                                                        const imgData = canvas.toDataURL('image/jpeg', 0.7);
                                                        const pdf = new jsPDF('p', 'mm', 'a4', true);
                                                        setupArabicFont(pdf);
                                                        pdf.setFont('Amiri');

                                                        setupArabicFont(pdf);
                                                        pdf.setFont('Amiri');
                                                        const { HEADER_HEIGHT, FOOTER_HEIGHT, PAGE_HEIGHT } = getPDFDimensions();
                                                        const pageWidth = pdf.internal.pageSize.getWidth();
                                                        const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
                                                        let contentWidth = pageWidth;
                                                        let contentHeight = (canvas.height * pageWidth) / canvas.width;

                                                        if (contentHeight > availableHeight) {
                                                            const scaleFactor = availableHeight / contentHeight;
                                                            contentHeight = availableHeight;
                                                            contentWidth = pageWidth * scaleFactor;
                                                        }

                                                        const xOffset = (pageWidth - contentWidth) / 2;
                                                        pdf.addImage(imgData, 'JPEG', xOffset, HEADER_HEIGHT, contentWidth, contentHeight, undefined, 'FAST');
                                                        await applyBranding(pdf);
                                                        handlePreview(pdf, 'Overdue_Report_Visual.pdf');
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error: " + err.message);
                                                    }
                                                }
                                            }}
                                            style={{ '--color': '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', flex: 1 }}
                                        >
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            {t('reports.visualBtn')}
                                        </IonButton>
                                        <IonButton
                                            color="danger"
                                            size="small"
                                            onClick={async () => {
                                                try {
                                                    const todayStr = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear(); })();
                                                    const todayDate = new Date();
                                                    todayDate.setHours(0, 0, 0, 0);

                                                    const overdue = (installments || []).filter(ins => {
                                                        const remaining = Math.max(0, Number(ins.amount) - Number(ins.paidAmount || 0));
                                                        if (remaining <= 0) return false;

                                                        let dueDate;
                                                        if (!isNaN(ins.dueDate) && Number(ins.dueDate) > 20000) {
                                                            dueDate = new Date((Number(ins.dueDate) - 25569) * 86400 * 1000);
                                                        } else {
                                                            dueDate = new Date(ins.dueDate);
                                                        }
                                                        if (!dueDate || isNaN(dueDate.getTime())) return false;

                                                        dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                                                        const isPastDue = dueDate <= todayDate;
                                                        const isRejected = (ins.status === 'Rejected' || ins.chequeStatus === 'Rejected');

                                                        // Filter by Print Scope
                                                        if (overduePrintScope === 'rejected' && !isRejected) return false;
                                                        if (overduePrintScope === 'no_rejected' && isRejected) return false;

                                                        return isPastDue && (ins.status !== 'Cancelled');
                                                    }).sort((a, b) => parseSafe(a.dueDate) - parseSafe(b.dueDate));

                                                    if (overdue.length === 0) {
                                                        alert("No overdue payments to export.");
                                                        return;
                                                    }

                                                    const pdf = new jsPDF('p', 'mm', 'a4');
                                                    setupArabicFont(pdf);
                                                    pdf.setFont('Amiri');


                                                    setupArabicFont(pdf);
                                                    pdf.setFont('Amiri');
                                                    setupArabicFont(pdf);
                                                    pdf.setFont('Amiri');
                                                    const { HEADER_HEIGHT, FOOTER_HEIGHT, PAGE_HEIGHT, PAGE_WIDTH } = getPDFDimensions();

                                                    let totalRemainingAll = 0;
                                                    overdue.forEach(i => {
                                                        totalRemainingAll += (Number(i.amount) - Number(i.paidAmount || 0));
                                                    });

                                                    const ROWS_PER_PAGE = 10;
                                                    const pageCount = Math.ceil(overdue.length / ROWS_PER_PAGE);

                                                    for (let p = 0; p < pageCount; p++) {
                                                        if (p > 0) pdf.addPage();

                                                        const start = p * ROWS_PER_PAGE;
                                                        const end = Math.min(start + ROWS_PER_PAGE, overdue.length);
                                                        const chunk = overdue.slice(start, end);
                                                        const isLastPage = p === pageCount - 1;

                                                        const container = document.createElement('div');
                                                        container.className = 'pdf-render-zone';
                                                        container.style.position = 'fixed';
                                                        container.style.left = '-9999px';
                                                        container.style.top = '0';
                                                        container.style.width = '1000px';
                                                        container.style.background = '#fff';
                                                        container.style.padding = '10px';
                                                        container.style.color = '#000';
                                                        container.style.fontFamily = isRTL() ? 'Amiri, serif' : 'Arial, sans-serif';
                                                        container.dir = isRTL() ? 'rtl' : 'ltr';

                                                        const rowsHtml = chunk.map(i => {
                                                            const remaining = Number(i.amount) - Number(i.paidAmount || 0);
                                                            const feedbacks = (i.feedbacks || []).slice().reverse();
                                                            let displayName = i.customerName;
                                                            if (/^\d+$/.test(displayName)) {
                                                                const found = customers.find(c => c.id === displayName || c.nationalId === displayName);
                                                                if (found) displayName = found.name;
                                                            }

                                                            // Enrich with Contact Details
                                                            const linkedContract = (contracts || []).find(c => c.id === i.contractId) || (contracts || []).find(c => c.unitId === i.unitId);
                                                            let owner = customers.find(c => c.id === linkedContract?.customerId);
                                                            if (!owner && displayName) {
                                                                owner = customers.find(c => (c.name || '').toLowerCase() === (displayName || '').toLowerCase());
                                                            }
                                                            const ownerPhone = owner?.phone || linkedContract?.phone || 'N/A';

                                                            // Resolve Sales Agent for PDF
                                                            let sName = 'N/A';
                                                            const sidPDF = i.salesId || linkedContract?.salesId;
                                                            if (sidPDF) {
                                                                const agent = sales.find(s => s.id === sidPDF);
                                                                sName = agent ? agent.name : sidPDF;
                                                            }

                                                            const jointNames = (linkedContract?.jointPurchasers || []).map(jp => {
                                                                const c = customers.find(cust => cust.id === jp.id);
                                                                return c ? c.name : (jp.name || jp.id);
                                                            }).join(', ');

                                                            const gData = linkedContract?.guarantor;
                                                            const gName = gData ? (customers.find(c => c.id === gData.id)?.name || gData.name) : null;

                                                            const linkedWallet = (wallets || []).find(w => (w.checkIds || []).includes(i.id));
                                                            const walletName = linkedWallet ? linkedWallet.bankAddress : '-';

                                                            // Aggregate Cheque Numbers for PDF
                                                            const mainNo = i.chequeNumber;
                                                            const allNos = (i.payments || []).map(p => p.ref || p.chequeNumber).filter(n => n && n !== '-');
                                                            if (mainNo && mainNo !== '-' && mainNo !== 'Offer Credits' && !allNos.includes(mainNo)) { allNos.unshift(mainNo); }
                                                            const displayChequeNo = allNos.length > 0 ? allNos.join(' / ') : (mainNo || '-');

                                                            const feedbacksHtml = feedbacks.map(fb => `
                                                            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #eee;">
                                                                <div style="color: #666; font-size: 0.7rem; margin-bottom: 2px;">${formatExcelDate(fb.date).replace(/\//g, '-')}</div>
                                                                <div style="line-height: 1.3;">${fb.text}</div>
                                                            </div>
                                                        `).join('') || '-';

                                                            return `
                                                            <tr style="border-bottom: 1px solid #eee;">
                                                                <td style="padding: 4px 6px; border: 1px solid #eee; white-space: nowrap;">${formatExcelDate(i.dueDate)}</td>
                                                                <td style="padding: 4px 6px; border: 1px solid #eee;">
                                                                    <div style="font-weight: bold; margin-bottom: 2px;">${displayName}</div>
                                                                    <div style="font-size: 0.7rem; color: #666;">${ownerPhone}</div>
                                                                    <div style="font-size: 0.65rem; color: #000; margin-top: 1px;">Reason: ${sName}</div>
                                                                    <div style="font-size: 0.65rem; color: #1E293B; margin-top: 1px; font-weight: bold;">Chq: ${displayChequeNo}</div>
                                                                    ${jointNames ? `<div style="font-size: 0.6rem; color: #000; margin-top: 2px;">Joint: ${jointNames}</div>` : ''}
                                                                    ${gName ? `<div style="font-size: 0.6rem; color: #000; margin-top: 1px;">Guarantor: ${gName}</div>` : ''}
                                                                </td>
                                                                <td style="padding: 4px 6px; border: 1px solid #eee;">${i.unitId}</td>
                                                                <td style="padding: 4px 6px; border: 1px solid #eee;">${walletName}</td>
                                                                <td style="padding: 4px 6px; border: 1px solid #eee;">${formatCurrency(i.amount)}</td>
                                                                <td style="padding: 4px 6px; border: 1px solid #eee; color: #eb445a; font-weight: bold;">${formatCurrency(remaining)}</td>
                                                                <td style="padding: 4px 6px; border: 1px solid #eee; font-size: 0.7rem; max-width: 300px; word-wrap: break-word;">
                                                                    ${feedbacksHtml}
                                                                </td>
                                                            </tr>
                                                        `;
                                                        }).join('');

                                                        container.innerHTML = `
                                                        <div style="margin-bottom: 15px; border-bottom: 2px solid #eb445a; padding-bottom: 10px;">
                                                            <h1 style="margin: 0; color: #eb445a; font-size: 22px;">${t('reports.overdueTitle')}</h1>
                                                            <p style="margin: 5px 0 0; color: #666; font-size: 11px;">Page ${p + 1} of ${pageCount} - Collections status as of ${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()}</p>
                                                        </div>

                                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px;">
                                                            <thead>
                                                                <tr style="background: #eb445a; color: #fff;">
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a; white-space: nowrap;">Due Date</th>
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a;">Customer</th>
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a;">Unit</th>
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a;">Wallet</th>
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a;">Total</th>
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a;">Rest Amount</th>
                                                                    <th style="padding: 6px 8px; text-align: start; border: 1px solid #eb445a;">Follow-up History</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${rowsHtml}
                                                                ${isLastPage ? `
                                                                    <tr style="background: #fdfdfd; font-weight: bold; font-size: 1rem;">
                                                                        <td colspan="5" style="padding: 8px; text-align: end; border: 1px solid #eee;">TOTAL BALANCE OVERDUE:</td>
                                                                        <td style="padding: 8px; border: 1px solid #eee; color: #eb445a;">${formatCurrency(totalRemainingAll)}</td>
                                                                        <td style="padding: 8px; border: 1px solid #eee;"></td>
                                                                    </tr>
                                                                ` : ''}
                                                            </tbody>
                                                        </table>

                                                        <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 8px; color: #888; font-size: 9px; display: flex; justify-content: space-between;">
                                                            <span>System Generated Report - DYR ERP</span>
                                                            <span>Print Date: ${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()}</span>
                                                        </div>
                                                    `;

                                                        document.body.appendChild(container);
                                                        const canvas = await html2canvas(container, { scale: 2 });
                                                        const imgData = canvas.toDataURL('image/jpeg', 0.7);

                                                        const imgProps = pdf.getImageProperties(imgData);
                                                        let pW = PAGE_WIDTH - 8;
                                                        let pH = (imgProps.height * pW) / imgProps.width;

                                                        const sH = PAGE_HEIGHT - 8;
                                                        if (pH > sH) {
                                                            const r = sH / pH;
                                                            pH = sH;
                                                            pW = pW * r;
                                                        }

                                                        const xC = (PAGE_WIDTH - pW) / 2;
                                                        pdf.addImage(imgData, 'JPEG', xC, 4, pW, pH, undefined, 'FAST');
                                                        document.body.removeChild(container);
                                                    }

                                                    handlePreview(pdf, `Overdue_Report_${todayStr}.pdf`);
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Error generating Overdue PDF: " + err.message);
                                                }
                                            }}
                                            style={{ '--background': '#eb445a', '--color': '#fff', borderRadius: '8px', flex: 1.5 }}
                                        >
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            Save Report
                                        </IonButton>
                                    </div>
                                </div>
                            </div>

                            <div id="overdue-report-container" className="animate-fade-in" style={{ background: 'transparent', padding: '0' }}>
                                {(() => {
                                    const filtered = (installments || []).filter(ins => {
                                        const remaining = Math.max(0, Number(ins.amount) - Number(ins.paidAmount || 0));
                                        if (remaining <= 0) return false;

                                        const todayDate = new Date();
                                        todayDate.setHours(0, 0, 0, 0);

                                        const dueDate = parseSafe(ins.dueDate);
                                        if (!dueDate || isNaN(dueDate.getTime())) return false;
                                        dueDate.setHours(0, 0, 0, 0);

                                        const isPastDue = dueDate <= todayDate;
                                        const isRejected = (ins.status === 'Rejected' || ins.chequeStatus === 'Rejected');

                                        if (overduePrintScope === 'rejected' && !isRejected) return false;
                                        if (overduePrintScope === 'no_rejected' && isRejected) return false;

                                        // Wallet filter
                                        if (overdueWalletFilter !== 'all') {
                                            const linkedWallet = (wallets || []).find(w => (w.checkIds || []).includes(ins.id));
                                            if (overdueWalletFilter === 'none') {
                                                if (linkedWallet) return false;
                                            } else {
                                                if (!linkedWallet || linkedWallet.id !== overdueWalletFilter) return false;
                                            }
                                        }

                                        return isPastDue && (ins.status !== 'Cancelled');
                                    }).sort((a, b) => parseSafe(a.dueDate) - parseSafe(b.dueDate));

                                    if (filtered.length === 0) {
                                        return (
                                            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                                                <IonIcon icon={close} style={{ fontSize: '48px', opacity: 0.2 }} />
                                                <p>No overdue payments found. All collections are up to date.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {filtered.map((ins, index) => {
                                                const remaining = Number(ins.amount) - Number(ins.paidAmount || 0);

                                                // Map customer name if it's an ID
                                                let displayName = ins.customerName;
                                                if (/^\d+$/.test(displayName)) {
                                                    const found = customers.find(c => c.id === displayName || c.nationalId === displayName);
                                                    if (found) displayName = found.name;
                                                }

                                                // Contract & Relations Info
                                                const linkedContract = (contracts || []).find(c => c.id === ins.contractId) || (contracts || []).find(c => c.unitId === ins.unitId);
                                                let owner = customers.find(c => c.id === linkedContract?.customerId);
                                                if (!owner && displayName) {
                                                    owner = customers.find(c => (c.name || '').toLowerCase() === (displayName || '').toLowerCase());
                                                }

                                                const ownerPhone = owner?.phone || linkedContract?.phone || 'N/A';
                                                const jointPurchasers = (linkedContract?.jointPurchasers || []).map(jp => {
                                                    const cust = customers.find(c => c.id === jp.id);
                                                    return cust || jp;
                                                });
                                                const guarantorData = linkedContract?.guarantor;
                                                const guarantor = guarantorData ? (customers.find(c => c.id === guarantorData.id) || guarantorData) : null;

                                                // Sales Agent (Reason) Resolution
                                                let salesName = 'N/A';
                                                const sid = ins.salesId || linkedContract?.salesId;
                                                if (sid) {
                                                    const agent = sales.find(s => s.id === sid);
                                                    salesName = agent ? agent.name : sid;
                                                }

                                                return (
                                                    <div key={ins.id} className="pro-glass-card animate-slide-in" style={{
                                                        overflow: 'hidden',
                                                        borderLeft: '4px solid #eb445a',
                                                        padding: '0',
                                                        marginBottom: '15px'
                                                    }}>
                                                        {/* Header */}
                                                        <div style={{ padding: isMobile ? '12px 15px' : '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                    <span style={{ color: '#eb445a', fontWeight: '900', fontSize: '0.9rem' }}>{formatExcelDate(ins.dueDate)}</span>
                                                                    <span className="pro-badge pro-badge-danger" style={{ fontSize: '0.6rem' }}>{t('reports.overdue')}</span>
                                                                    {(() => {
                                                                        const linkedWallet = (wallets || []).find(w => (w.checkIds || []).includes(ins.id));
                                                                        if (linkedWallet) {
                                                                            return (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                    background: 'rgba(197, 160, 89, 0.1)',
                                                                                    color: '#c5a059',
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.6rem',
                                                                                    fontWeight: '800',
                                                                                    border: '1px solid rgba(197, 160, 89, 0.2)',
                                                                                    textTransform: 'uppercase'
                                                                                }}>
                                                                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#c5a059' }} />
                                                                                    {linkedWallet.bankAddress}
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                                <div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: '800', color: '#1E293B' }}>{displayName}</div>
                                                                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{ownerPhone}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#000', fontWeight: '700', marginTop: '2px' }}>Reason: {salesName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#1E293B', fontWeight: '800', marginTop: '2px' }}>
                                                                    {t('reports.chequeLabel')}: {(() => {
                                                                        const mainNo = ins.chequeNumber;
                                                                        const allNos = (ins.payments || []).map(p => p.ref || p.chequeNumber).filter(n => n && n !== '-');
                                                                        if (mainNo && mainNo !== '-' && mainNo !== 'Offer Credits' && !allNos.includes(mainNo)) { allNos.unshift(mainNo); }
                                                                        return allNos.length > 0 ? allNos.join(' / ') : (mainNo || '-');
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '0.75rem', color: '#888' }}>{t('reports.unit')} <strong style={{ color: '#c5a059' }}>{ins.unitId}</strong></div>
                                                                <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '900', color: '#eb445a', marginTop: '4px' }}>{formatCurrency(remaining)}</div>
                                                                <div style={{ fontSize: '0.65rem', color: '#555' }}>{t('reports.total')}: {formatCurrency(ins.amount)}</div>
                                                            </div>
                                                        </div>

                                                        {/* Relations Summary */}
                                                        {(jointPurchasers.length > 0 || guarantor) && (
                                                            <div style={{ padding: '10px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontSize: '0.8rem', color: '#666', display: 'flex', gap: '20px' }}>
                                                                {jointPurchasers.length > 0 && (
                                                                    <div>
                                                                        <strong style={{ color: '#000' }}>Joint:</strong> {jointPurchasers.map(jp => jp.name).join(', ')}
                                                                    </div>
                                                                )}
                                                                {guarantor && (
                                                                    <div>
                                                                        <strong style={{ color: '#000' }}>Guarantor:</strong> {guarantor.name} ({guarantor.phone || 'N/A'})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Feedbacks / Follow-ups */}
                                                        <div style={{ padding: '15px 20px', background: '#fff' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span>{t('reports.followUpHistory')}</span>
                                                                <div style={{ flex: 1, height: '1px', background: '#f0f0f0' }}></div>
                                                            </div>

                                                            {(!ins.feedbacks || ins.feedbacks.length === 0) ? (
                                                                <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ddd', textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>
                                                                    {t('reports.noFollowUps')}
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                    {ins.feedbacks.slice().reverse().map((fb, idx) => (
                                                                        <div key={fb.id || idx} style={{
                                                                            padding: '12px',
                                                                            background: idx === 0 ? 'rgba(197, 160, 89, 0.05)' : '#fcfcfc',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid',
                                                                            borderColor: idx === 0 ? 'rgba(197, 160, 89, 0.2)' : '#eee',
                                                                            position: 'relative'
                                                                        }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                                <span style={{ fontSize: '0.75rem', color: '#888' }}>{(() => { const d = fb.date; if (!d) return ''; const str = String(d); const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/); if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`; const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (slashMatch) return `${slashMatch[1].padStart(2,'0')}-${slashMatch[2].padStart(2,'0')}-${slashMatch[3]}`; const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/); if (dashMatch) return str; try { const dt = new Date(str); if (!isNaN(dt)) return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`; } catch(e){} return str; })()}</span>
                                                                                {idx === 0 && <span style={{ fontSize: '0.65rem', color: '#c5a059', fontWeight: 'bold', background: 'rgba(197, 160, 89, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>LATEST</span>}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.9rem', color: '#444', lineHeight: '1.4' }}>{fb.text}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </>
                    )}

                    {/* --- TAB: CUSTOMERS --- */}
                    {reportTab === 'customers' && (
                        <>
                            {!viewingCustomer ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', gap: '10px' }}>
                                        <IonButton
                                            color="medium"
                                            fill="outline"
                                            onClick={async () => {
                                                const element = document.getElementById('customers-report-table');
                                                if (element) {
                                                    try {
                                                        element.classList.add('pdf-render-zone');
                                                        const canvas = await html2canvas(element, { scale: 2 });
                                                        element.classList.remove('pdf-render-zone');
                                                        const imgData = canvas.toDataURL('image/jpeg', 0.7);
                                                        const pdf = new jsPDF('p', 'mm', 'a4', true);
                                                        setupArabicFont(pdf);
                                                        pdf.setFont('Amiri');

                                                        setupArabicFont(pdf);
                                                        pdf.setFont('Amiri');
                                                        const { HEADER_HEIGHT, FOOTER_HEIGHT, PAGE_HEIGHT } = getPDFDimensions();
                                                        const pageWidth = pdf.internal.pageSize.getWidth();
                                                        const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
                                                        let contentWidth = pageWidth;
                                                        let contentHeight = (canvas.height * pageWidth) / canvas.width;

                                                        if (contentHeight > availableHeight) {
                                                            const scaleFactor = availableHeight / contentHeight;
                                                            contentHeight = availableHeight;
                                                            contentWidth = pageWidth * scaleFactor;
                                                        }

                                                        const xOffset = (pageWidth - contentWidth) / 2;
                                                        pdf.addImage(imgData, 'PNG', xOffset, HEADER_HEIGHT, contentWidth, contentHeight);
                                                        await applyBranding(pdf);
                                                        handlePreview(pdf, 'Customers_List_Visual.pdf');
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error: " + err.message);
                                                    }
                                                }
                                            }}
                                        >
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            {t('reports.exportVisualPdf')}
                                        </IonButton>
                                        <IonButton
                                            color="primary"
                                            onClick={async () => {
                                                try {
                                                    const doc = new jsPDF();
                                                    setupArabicFont(doc);
                                                    doc.setFont('Amiri');

                                                    setupArabicFont(doc);
                                                    doc.setFont('Amiri');
                                                    doc.setFontSize(18);
                                                    doc.setTextColor(56, 128, 255);
                                                    doc.text(t('reports.customersTitle'), 14, 50);

                                                    autoTable(doc, {
                                                        styles: { font: 'Amiri' },
                                                        margin: { top: 50, bottom: 35 },
                                                        startY: 60,
                                                        head: [[t('customers.name'), t('customers.phone'), t('customers.id')]],
                                                        body: (customers || []).map(c => [
                                                            c.name,
                                                            c.phone,
                                                            c.nationalId
                                                        ]),
                                                        headStyles: { font: 'Amiri', fillColor: [56, 128, 255] }
                                                    });
                                                    await applyBranding(doc);
                                                    handlePreview(doc, 'Customers_Database.pdf');
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Error generating Customer PDF: " + err.message);
                                                }
                                            }}
                                        >
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            {t('reports.dataPdf')}
                                        </IonButton>
                                    </div>
                                    <div className="animate-fade-in" id="customers-report-table" style={{ background: 'transparent', padding: '0' }}>
                                        {isMobile ? (
                                            <div className="pro-grid pro-grid-auto" style={{ gap: '12px' }}>
                                                {(customers || []).map(c => (
                                                    <div key={c.id} className="pro-glass-card" onClick={() => setViewingCustomer(c)} style={{ padding: '15px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#3880ff' }}>{c.name}</h3>
                                                            <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: '800' }}>#{c.id}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '5px' }}>
                                                            Phone: <span style={{ fontWeight: 'bold' }}>{c.phone}</span>
                                                        </div>
                                                        {c.phone2 && (
                                                            <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                                                Secondary: {c.phone2}
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                                                            <span style={{ fontSize: '0.7rem', color: '#3880ff', fontWeight: 'bold' }}>VIEW DETAILS →</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="chrono-table-container" style={{ background: 'var(--app-card-bg, rgba(30,41,59,0.95))', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: '#c5a059', fontWeight: '900' }}>{t('reports.customerList')}</h3>
                                                <table className="chrono-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(197,160,89,0.15)', borderBottom: '2px solid #c5a059' }}>
                                                            <th style={{ padding: '8px', textAlign: 'left', color: '#c5a059', fontWeight: '800', fontSize: '0.85rem' }}>{t('reports.name')}</th>
                                                            <th style={{ padding: '8px', textAlign: 'left', color: '#c5a059', fontWeight: '800', fontSize: '0.85rem' }}>{t('customers.phone')}</th>
                                                            <th style={{ padding: '8px', textAlign: 'left', color: '#c5a059', fontWeight: '800', fontSize: '0.85rem' }}>{t('reports.secPhone')}</th>
                                                            <th style={{ padding: '8px', textAlign: 'left', color: '#c5a059', fontWeight: '800', fontSize: '0.85rem' }}>{t('reports.customerId')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(customers || []).map(c => (
                                                            <tr key={c.id} onClick={() => setViewingCustomer(c)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <td style={{ padding: '8px', fontWeight: 'bold', color: '#3880ff' }}>{c.name}</td>
                                                                <td style={{ padding: '8px', color: '#E2E8F0' }}>{c.phone}</td>
                                                                <td style={{ padding: '8px', color: '#94A3B8' }}>{c.phone2 || '-'}</td>
                                                                <td style={{ padding: '8px', color: '#E2E8F0' }}>{c.id}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <p style={{ textAlign: 'center', color: '#64748B', marginTop: '10px', fontSize: '0.8rem' }}>Click on a customer to view history.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="customer-detail-view">
                                    <IonButton fill="clear" onClick={() => setViewingCustomer(null)} color="light" style={{ marginBottom: '10px' }}>
                                        &lt; Back to List
                                    </IonButton>

                                    <div style={{ background: 'var(--app-card-bg, #ffffff)', border: '1px solid var(--app-border, #e2e8f0)', borderLeftWidth: '4px', padding: '20px', borderRadius: '12px', marginBottom: '20px', borderLeft: '4px solid #3880ff' }}>
                                        <h2 style={{ color: 'var(--app-text, #1E293B)', marginTop: 0 }}>{viewingCustomer.name}</h2>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: 'var(--app-text-secondary, #64748B)' }}>
                                            <div><strong>Phone:</strong> {viewingCustomer.phone}</div>
                                            <div><strong>ID:</strong> {viewingCustomer.id}</div>
                                            <div><strong>Secondary:</strong> {viewingCustomer.phone2 || 'N/A'}</div>
                                            <div><strong>Joined:</strong> {viewingCustomer.created_at ? (() => { const d = new Date(viewingCustomer.created_at); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear(); })() : '-'}</div>
                                        </div>
                                    </div>

                                    {/* History Sections */}
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
                                        {/* Offers History */}
                                        <div className="pro-glass-card" style={{ flex: 1 }}>
                                            <h3 style={{ color: '#3880ff', marginTop: 0, fontSize: '1.1rem', fontWeight: '900' }}>OFFERS HISTORY</h3>
                                            {(offers || []).filter(o => o.customerId === viewingCustomer.id).length === 0 ? (
                                                <p style={{ color: '#666' }}>No offers found.</p>
                                            ) : (
                                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                    {(offers || []).filter(o => o.customerId === viewingCustomer.id).map(o => (
                                                        <div key={o.id} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '5px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ fontWeight: 'bold', color: 'var(--app-text, #1E293B)' }}>Unit {o.unitId}</span>
                                                                <span style={{
                                                                    color: o.status === 'contracted' ? '#2dd36f' : o.status === 'cancelled' ? '#eb445a' : '#ffc409',
                                                                    fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                                                }}>{o.status || 'Active'}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>
                                                                {formatExcelDate(o.date)} • {o.years} Years • {o.downPayment}% Down
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Contracts History */}
                                        <div className="pro-glass-card" style={{ flex: 1 }}>
                                            <h3 style={{ color: '#2dd36f', marginTop: 0, fontSize: '1.1rem', fontWeight: '900' }}>CONTRACTS HISTORY</h3>
                                            {(contracts || []).filter(c => c.customerId === viewingCustomer.id).length === 0 ? (
                                                <p style={{ color: '#666' }}>No contracts found.</p>
                                            ) : (
                                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                    {(contracts || []).filter(c => c.customerId === viewingCustomer.id).map(c => (
                                                        <div key={c.id} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '5px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ fontWeight: 'bold', color: '#1E293B' }}>Unit {c.unitId}</span>
                                                                <span style={{ color: '#2dd36f', fontWeight: 'bold' }}>{formatCurrency(c.totalPrice || c.finalPrice)}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>
                                                                {formatExcelDate(c.date)} • {c.id}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- TAB: TERMINATED --- */}
                    {reportTab === 'terminated' && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                                    <IonButton
                                        color="medium"
                                        fill="clear"
                                        size="small"
                                        onClick={async () => {
                                            const element = document.getElementById('terminated-report-container');
                                            if (element) {
                                                try {
                                                    element.classList.add('pdf-render-zone');
                                                    const canvas = await html2canvas(element, { scale: 2 });
                                                    element.classList.remove('pdf-render-zone');
                                                    const imgData = canvas.toDataURL('image/jpeg', 0.7);
                                                    const pdf = new jsPDF('p', 'mm', 'a4', true);
                                                    setupArabicFont(pdf);
                                                    pdf.setFont('Amiri');

                                                    setupArabicFont(pdf);
                                                    pdf.setFont('Amiri');
                                                    setupArabicFont(pdf);
                                                    pdf.setFont('Amiri');
                                                    const { HEADER_HEIGHT, FOOTER_HEIGHT, PAGE_HEIGHT } = getPDFDimensions();
                                                    const pageWidth = pdf.internal.pageSize.getWidth();
                                                    const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
                                                    let contentWidth = pageWidth;
                                                    let contentHeight = (canvas.height * pageWidth) / canvas.width;

                                                    if (contentHeight > availableHeight) {
                                                        const scaleFactor = availableHeight / contentHeight;
                                                        contentHeight = availableHeight;
                                                        contentWidth = pageWidth * scaleFactor;
                                                    }

                                                    const xOffset = (pageWidth - contentWidth) / 2;
                                                    pdf.addImage(imgData, 'JPEG', xOffset, HEADER_HEIGHT, contentWidth, contentHeight, undefined, 'FAST');
                                                    await applyBranding(pdf);
                                                    handlePreview(pdf, 'Terminated_Report_Visual.pdf');
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Error: " + err.message);
                                                }
                                            }
                                        }}
                                        style={{ '--color': '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', flex: 1 }}
                                    >
                                        <IonIcon icon={downloadOutline} slot="start" />
                                        Visual
                                    </IonButton>
                                    <IonButton
                                        color="danger"
                                        size="small"
                                        onClick={async () => {
                                            try {
                                                const today = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear(); })();
                                                const doc = new jsPDF();
                                                setupArabicFont(doc);
                                                doc.setFont('Amiri');

                                                setupArabicFont(doc);
                                                doc.setFont('Amiri');
                                                doc.setFontSize(18);
                                                doc.setTextColor(235, 68, 90);
                                                doc.text(t('reports.terminatedTitle'), 14, 50);

                                                autoTable(doc, {
                                                    styles: { font: 'Amiri' },
                                                    margin: { top: 50, bottom: 35 },
                                                    startY: 60,
                                                    head: [[t('reports.customer'), t('reports.unitId'), t('reports.price'), t('contracts.date')]],
                                                    body: (terminatedContracts || []).map(tc => {
                                                        const custName = customers.find(c => c.id === tc.customerId)?.name || tc.customerName || tc.customerId || '';
                                                        return [
                                                            custName,
                                                            tc.unitId,
                                                            formatCurrency(tc.totalPrice || 0),
                                                            formatExcelDate(tc.terminationDate || tc.date)
                                                        ];
                                                    }),
                                                    headStyles: { font: 'Amiri', fillColor: [235, 68, 90] }
                                                });
                                                await applyBranding(doc);
                                                handlePreview(doc, `Terminated_Report_${today}.pdf`);
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error generating Terminated PDF: " + err.message);
                                            }
                                        }}
                                        style={{ '--background': '#ff4d4d', '--color': '#fff', borderRadius: '8px', flex: 1.5 }}
                                    >
                                        <IonIcon icon={downloadOutline} slot="start" />
                                        Save Report
                                    </IonButton>
                                </div>
                            </div>

                            <div id="terminated-report-container" className="animate-fade-in" style={{ background: 'transparent', padding: '0' }}>
                                <div className="pro-glass-card" style={{ borderLeft: '4px solid #eb445a', marginBottom: '20px' }}>
                                    <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>ARCHIVED CONTRACTS HISTORY</h2>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <IonSearchbar
                                        value={searchTermTerminated}
                                        onIonChange={e => setSearchTermTerminated(e.detail.value)}
                                        placeholder="Search Unit, Customer, or Cheque..."
                                        style={{ '--background': '#f0f0f0', '--color': '#000', padding: 0 }}
                                    />
                                </div>
                                {(terminatedContracts || []).filter(tc => {
                                    const query = searchTermTerminated.toLowerCase();
                                    const unitMatch = (tc.unitId || '').toLowerCase().includes(query);
                                    const custName = customers.find(c => c.id === tc.customerId)?.name || tc.customerName || tc.customerId || '';
                                    const nameMatch = custName.toLowerCase().includes(query);

                                    const linkedIns = (terminatedInstallments || []).filter(ti =>
                                        ti.contractId === (tc.contractId || tc.id) ||
                                        (ti.unitId === tc.unitId && ti.customerName === tc.customerName)
                                    );
                                    const chequeMatch = linkedIns.some(ti => (ti.chequeNumber || '').toLowerCase().includes(query));

                                    return unitMatch || nameMatch || chequeMatch;
                                }).length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No matching terminated contracts found.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {terminatedContracts
                                            .filter(tc => {
                                                const query = searchTermTerminated.toLowerCase();
                                                const unitMatch = (tc.unitId || '').toLowerCase().includes(query);
                                                const custName = customers.find(c => c.id === tc.customerId)?.name || tc.customerName || tc.customerId || '';
                                                const nameMatch = custName.toLowerCase().includes(query);

                                                const linkedIns = (terminatedInstallments || []).filter(ti =>
                                                    ti.contractId === (tc.contractId || tc.id) ||
                                                    (ti.unitId === tc.unitId && ti.customerName === tc.customerName)
                                                );
                                                const chequeMatch = linkedIns.some(ti => (ti.chequeNumber || '').toLowerCase().includes(query));

                                                return unitMatch || nameMatch || chequeMatch;
                                            })
                                            .map(tc => {
                                                const linkedIns = (terminatedInstallments || [])
                                                    .filter(ti =>
                                                        ti.contractId === (tc.contractId || tc.id) ||
                                                        (ti.unitId === tc.unitId && ti.customerName === tc.customerName)
                                                    )
                                                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                                                const custName = customers.find(c => c.id === tc.customerId)?.name || tc.customerName || tc.customerId;

                                                return (
                                                    <div key={tc.id} className="pro-glass-card animate-slide-in" style={{ padding: '0', overflow: 'hidden', marginBottom: '15px' }}>
                                                        <div style={{ padding: '15px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#eb445a' }}>Unit {tc.unitId}</span>
                                                                    <span style={{ color: '#555', fontSize: '0.7rem', fontWeight: '700' }}>#{tc.contractId || tc.id}</span>
                                                                </div>
                                                                <div style={{ color: '#1E293B', marginTop: '4px', fontWeight: '800' }}>{custName}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ color: '#eb445a', fontWeight: '900', fontSize: '0.9rem' }}>{formatExcelDate(tc.terminationDate)}</div>
                                                                <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tc.terminationReason || 'Cancelled'}</div>
                                                                <div style={{ color: '#c5a059', fontSize: '0.85rem', fontWeight: 'bold' }}>{formatCurrency(tc.totalPrice || 0)}</div>
                                                            </div>
                                                        </div>

                                                        {linkedIns.length > 0 && (
                                                            <div style={{ padding: '12px 15px' }}>
                                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: '900' }}>ARCHIVED INSTALLMENTS ({linkedIns.length})</div>
                                                                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                            <th style={{ padding: '8px 5px', textAlign: 'left', color: '#888' }}>Due Date</th>
                                                                            <th style={{ padding: '8px 5px', textAlign: 'left', color: '#888' }}>Amount</th>
                                                                            <th style={{ padding: '8px 5px', textAlign: 'left', color: '#888' }}>Cheque #</th>
                                                                            {!isMobile && <th style={{ padding: '8px 5px', textAlign: 'left', color: '#888' }}>Bank</th>}
                                                                            <th style={{ padding: '8px 5px', textAlign: 'left', color: '#888' }}>Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {linkedIns.map(ins => (
                                                                            <tr key={ins.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                                <td style={{ padding: '10px 5px', color: '#1E293B', fontWeight: '700' }}>{formatExcelDate(ins.dueDate)}</td>
                                                                                <td style={{ padding: '10px 5px', color: '#2dd36f', fontWeight: '800' }}>{formatCurrency(ins.amount)}</td>
                                                                                <td style={{ padding: '10px 5px', color: '#888' }}>{ins.chequeNumber || '-'}</td>
                                                                                {!isMobile && <td style={{ padding: '10px 5px', color: '#888' }}>{ins.bank || '-'}</td>}
                                                                                <td style={{ padding: '10px 5px' }}>
                                                                                    <span className={ins.status === 'Paid' ? 'pro-badge pro-badge-success' : 'pro-badge pro-badge-danger'} style={{ fontSize: '0.6rem' }}>
                                                                                        {ins.status}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    </div>
                </div>
            </IonContent>
            <PDFPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                pdfDoc={previewPdf}
                filename={previewFilename}
            />
        </IonModal >
    );
};

export default ReportsHub;
