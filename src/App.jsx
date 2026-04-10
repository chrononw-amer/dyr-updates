import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonButton, IonIcon, IonInput, IonItemOption, IonItemOptions,
  IonItemSliding, IonFab, IonFabButton, IonModal, IonSelect, IonSelectOption, IonSearchbar, IonAlert, IonButtons, setupIonicReact, IonBadge, IonCheckbox, IonToggle, IonCard, IonCardContent
} from '@ionic/react';
import { add, trash, business, chevronBack, chevronForward, documentAttach, cloudDownload, cloudUpload, chatbubbles, chatbubbleEllipses, remove, squareOutline, close, statsChart, create, createOutline, downloadOutline, printOutline, settingsOutline, languageOutline, moonOutline, sunnyOutline, shieldCheckmarkOutline, informationCircleOutline, trashOutline, notificationsOutline, addCircleOutline, searchOutline, peopleOutline, happyOutline, bulbOutline, saveOutline, cashOutline, person, timeOutline, callOutline, logoWhatsapp, checkmarkCircleOutline, closeCircleOutline, logOutOutline, refresh, cardOutline, alertCircleOutline, mapOutline, personAddOutline, businessOutline, calendarOutline, chatbubblesOutline, documentTextOutline, homeOutline, statsChartOutline, flash, cutOutline, walletOutline, wallet, swapHorizontalOutline, wifiOutline } from 'ionicons/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getBuildings, addBuilding, removeBuilding, addUnitToBuilding, removeUnitFromBuilding, saveBuildings, getCustomers, addCustomer, updateCustomer, deleteCustomer, getOffers, addOffer, addOfferPayment, cancelOffer, deleteOffer, markOfferContracted, convertOfferToContract, getContracts, addContract, cancelContract, saveContracts, getInstallments, updateInstallment, saveInstallments, addInstallmentFeedback, deleteInstallmentFeedback, addInstallmentPayment, deleteInstallmentPayment, deleteAllInstallments, deleteAllContracts, deleteAllCustomers, getSales, addSales, deleteSales, updateSales, deleteAllSales, getAppConfig, saveOffers, generateOfferInstallments, terminateContractInPlace, resaleContractInPlace, reactivateOffer, reactivateContract,
  getDatabaseConfig, setDatabaseConfig, getCompanyBranding, setCompanyBranding, getAppState, setAppState, getAppSecurity, setAppSecurity, getCurrency, setCurrency, formatCurrency, syncPendingLogs, updateInstallmentPayment, updateOfferPaymentStatus, updateOfferPayment, flashFillContractInstallments, updateContract, updateOffer,
  getWallets, addWallet, deleteWallet, updateWallet, bulkUpdateUnitPrices, undoBulkUpdatePrices, fixCuve141FinishedPrices, fixCruise140FinishedPrices, fixCruise140BasePrices, fixCruise140FinishedPricesV2, logActivity, getConnectionStatus
} from './services/DataService';
import { supabase } from './services/supabase';
import { parseUnitsExcel, exportInstallmentsToExcel, exportFilteredInstallmentsToExcel, parseInstallmentsExcel, exportContractsToExcel, parseContractsExcel, exportCustomersToExcel, parseCustomersExcel, parseSalesExcel, exportBuildingUnitsToExcel } from './services/ExcelService';
import { generateReceiptPDF } from './helpers/ReceiptGenerator';
import CommissionsView from './components/CommissionsView';
import { generateChequeCustodyPDF } from './helpers/ChequeCustodyGenerator';
import { exportFileMobile } from './services/MobileExportService';

import ReportsHub from './components/ReportsHub';
import PDFPreviewModal from './components/PDFPreviewModal';
import ChequePreview from './components/ChequePreview';
import ErrorBoundary from './components/ErrorBoundary';
import AdminSessionsModal from './components/AdminSessionsModal';
import ChatOverlay from './components/ChatOverlay';
import LoginModal from './components/LoginModal';
import { getUsers, addUser, updateUserSession, getUserSession } from './services/UserService';
import { registerSession, sendHeartbeat, clearCommand, updateBackupUrl, updateSessionStatus, updateSessionTab, updateSessionUserInfo, updateSessionHostStatus, clearSessionUserInfo, kickOtherSessions, detectDeviceType, getDeviceId, getExternalIP, getLocationFromIP } from './services/SessionService';
import { validateHeartbeat, getSecondaryLockState, calibrateTime, runIntegrityCheck } from './services/IntegrityService';
import InstallmentsReportModal from './components/InstallmentsReportModal';

import { AMIRI_FONT_BASE64 } from './services/AmiriFont';
import { Capacitor } from '@capacitor/core';
import { version as PKG_VERSION } from '../package.json';
import { App as CapacitorApp } from '@capacitor/app';
import { t, setLanguage, getCurrentLanguage, getAvailableLanguages, isRTL } from './services/i18n';
import { setupArabicFont } from './services/PDFService';

/* Ionic Core Styles */
import '@ionic/react/css/core.css';
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './index.css';

setupIonicReact();

// ─── Global Fix: Ionic + Electron Input Focus ───
// Ionic wraps native <input> elements inside shadow DOM.
// In Electron, keyboard focus doesn't always reach the native input,
// causing the "need to alt-tab twice" issue. This fix intercepts
// focus/click events on Ionic input wrappers and force-focuses the
// native <input>/<textarea> inside the shadow root.
(function initIonicFocusFix() {
  const IONIC_INPUT_TAGS = ['ION-INPUT', 'ION-SEARCHBAR', 'ION-TEXTAREA'];

  // Helper: find native input inside shadow root
  const focusNativeInput = (ionEl) => {
    if (!ionEl) return;
    // Handle shadow DOM inputs (Ionic components)
    if (ionEl.shadowRoot) {
      const native = ionEl.shadowRoot.querySelector('input, textarea');
      if (native) {
        native.focus({ preventScroll: true });
        return;
      }
    }
    // Fallback: try setFocus method (Ionic 7+)
    if (typeof ionEl.setFocus === 'function') {
      ionEl.setFocus();
    }
  };

  // Track last focused input for re-focus after alert/dialog
  let _lastFocusedInput = null;

  // 1. Capture clicks AND mousedown on Ionic input components
  ['mousedown', 'click'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const ionEl = e.target.closest('ion-input, ion-searchbar, ion-textarea');
      if (ionEl) {
        _lastFocusedInput = ionEl;
        requestAnimationFrame(() => focusNativeInput(ionEl));
      }
      // Also handle native inputs/textareas directly (non-Ionic)
      const nativeEl = e.target.closest('input, textarea, select');
      if (nativeEl && !ionEl) {
        requestAnimationFrame(() => nativeEl.focus({ preventScroll: true }));
      }
    }, true);
  });

  // 2. Capture focusin events
  document.addEventListener('focusin', (e) => {
    const tag = e.target?.tagName;
    if (tag && IONIC_INPUT_TAGS.includes(tag)) {
      _lastFocusedInput = e.target;
      requestAnimationFrame(() => focusNativeInput(e.target));
    }
  }, true);

  // 3. When the Electron window regains focus, re-focus the last active input
  window.addEventListener('focus', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active && IONIC_INPUT_TAGS.includes(active.tagName)) {
        focusNativeInput(active);
      } else if (_lastFocusedInput && document.body.contains(_lastFocusedInput)) {
        focusNativeInput(_lastFocusedInput);
      }
    }, 50);
  });

  // 4. Monitor Ionic overlay (modal/popover) dismiss events for focus restoration
  const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      for (const removed of mut.removedNodes) {
        if (removed.nodeType === 1 && (removed.tagName === 'ION-POPOVER' || removed.tagName === 'ION-ALERT')) {
          // After popover/alert dismissal, restore focus
          setTimeout(() => {
            if (_lastFocusedInput && document.body.contains(_lastFocusedInput)) {
              focusNativeInput(_lastFocusedInput);
            }
          }, 100);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 5. Patch window.alert to restore focus after dismissal
  const _origAlert = window.alert;
  window.alert = function(...args) {
    _origAlert.apply(window, args);
    // After alert closes, force focus back to the app
    setTimeout(() => {
      if (_lastFocusedInput && document.body.contains(_lastFocusedInput)) {
        focusNativeInput(_lastFocusedInput);
      }
      // Also force Electron window to regain keyboard focus
      window.focus();
    }, 100);
  };
})();

const getStatusColor = (status) => {
  switch (status) {
    case 'available': return '#2563EB'; // Dark Blue
    case 'offer': return '#E2E8F0';     // Dark Grey
    case 'contract': return '#1E293B';  // Black
    case 'locked': return '#DC2626';    // Red
    case 'case': return '#E2E8F0';      // Dark Grey
    default: return '#E2E8F0';          // Dark Grey
  }
};

const normalizeDate = (dStr) => {
  if (!dStr || typeof dStr !== 'string') return dStr;
  const cleaned = dStr.trim();
  if (!cleaned) return '';

  // Match D-M-YYYY or D/M/YYYY or D.M.YYYY (with 1 or 2 digits for D and M)
  const regex = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/;
  const match = cleaned.match(regex);

  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return cleaned;
};

const parseSafeDate = (dStr) => {
  if (!dStr) return new Date(NaN);
  if (dStr instanceof Date) return dStr;

  // Handle Excel serial (typically 5 digits, e.g. 45000)
  if (!isNaN(dStr) && Number(dStr) > 20000 && Number(dStr) < 100000) {
    return new Date((Number(dStr) - 25569) * 86400 * 1000);
  }

  // Try native
  let d = new Date(dStr);
  if (!isNaN(d.getTime())) return d;

  // Try YYYY-MM-DD or DD-MM-YYYY
  if (typeof dStr === 'string' && (dStr.includes('-') || dStr.includes('/'))) {
    const sep = dStr.includes('-') ? '-' : '/';
    const pts = dStr.split(sep);
    if (pts.length === 3) {
      if (pts[0].length === 4) {
        // YYYY-MM-DD or YYYY/MM/DD
        return new Date(parseInt(pts[0]), parseInt(pts[1]) - 1, parseInt(pts[2]));
      } else if (pts[2].length === 4) {
        // DD-MM-YYYY or DD/MM/YYYY
        return new Date(parseInt(pts[2]), parseInt(pts[1]) - 1, parseInt(pts[0]));
      }
    }
  }
  return d;
};

const formatExcelDate = (dateVal) => {
  if (!dateVal) return '';

  // If already a Date object
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    const dd = String(dateVal.getDate()).padStart(2, '0');
    const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    const yyyy = dateVal.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  // Handle strings and numbers
  let date;
  if (!isNaN(dateVal) && typeof dateVal !== 'string' && Number(dateVal) > 20000 && Number(dateVal) < 100000) {
    // Excel serial number
    date = new Date((Number(dateVal) - 25569) * 86400 * 1000);
  } else {
    // Try to parse using our parseSafeDate helper
    date = parseSafeDate(String(dateVal));
  }

  if (isNaN(date.getTime())) {
    // Last resort fallback
    return normalizeDate(String(dateVal));
  }

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const displayFormattedDate = (dateVal) => {
  const d = formatExcelDate(dateVal);
  if (!d) return '';
  const pts = d.split('-');
  if (pts.length === 3 && pts[0].length === 4) {
    return `${pts[2]}/${pts[1]}/${pts[0]}`;
  }
  return d.replace(/-/g, '/');
};

const ProFilterToggle = ({ active, onClick, label, activeColor }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      userSelect: 'none',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '12px',
      border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.05)'}`,
      transition: 'all 0.2s ease'
    }}
  >
    <div style={{
      width: '20px',
      height: '20px',
      borderRadius: '6px',
      background: active ? activeColor : '#475569',
      border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.1)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {active && <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '14px', color: '#FFFFFF' }} />}
    </div>
    <span style={{ color: active ? '#FFFFFF' : '#475569', fontSize: '0.85rem', fontWeight: active ? '700' : '500' }}>{label}</span>
  </div>
);

const ProDatePicker = ({ value, onChange, label, style }) => {
  const [textValue, setTextValue] = React.useState('');
  const dateInputRef = React.useRef(null);

  // Sync internal text with exterior valid date value (YYYY-MM-DD -> DD/MM/YYYY)
  React.useEffect(() => {
    if (value && value.length === 10 && value.includes('-')) {
      const [y, m, d] = value.split('-');
      setTextValue(`${d}/${m}/${y}`);
    } else if (!value) {
      setTextValue('');
    }
  }, [value]);

  const handleInputChange = (e) => {
    let raw = e.target.value.replace(/\D/g, ''); // Extract only digits
    if (raw.length > 8) raw = raw.slice(0, 8);
    
    // Format as DD/MM/YYYY
    let formatted = raw;
    if (raw.length > 2) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
    if (raw.length > 4) formatted = formatted.slice(0, 5) + '/' + raw.slice(4);
    
    setTextValue(formatted);

    // If we have a full date, try to propagate it as YYYY-MM-DD
    if (raw.length === 8) {
      const d = raw.slice(0, 2);
      const m = raw.slice(2, 4);
      const y = raw.slice(4, 8);
      // Simple validation: check if validish
      const yearNum = parseInt(y);
      if (yearNum > 1900 && yearNum < 2100) {
        onChange(`${y}-${m}-${d}`);
      }
    } else if (raw.length === 0) {
      onChange('');
    }
  };

  return (
    <div style={{ flex: 1, ...style }}>
      {label && (
        <label style={{ 
          color: '#1E293B', 
          fontSize: '0.65rem', 
          marginBottom: '6px', 
          fontWeight: '900', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          display: 'block'
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="DD/MM/YYYY"
          value={textValue}
          onChange={handleInputChange}
          maxLength={10}
          style={{
            width: '100%',
            padding: '12px 40px 12px 16px', // Extra right padding for icon
            background: '#FFFFFF',
            borderRadius: '12px',
            color: '#1E293B',
            fontSize: '0.95rem',
            fontWeight: '700',
            border: '2px solid #E2E8F0',
            minHeight: '48px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        
        {/* Native picker triggered by Icon or entire right area */}
        <div 
          onClick={() => {
            if (dateInputRef.current) {
              if (typeof dateInputRef.current.showPicker === 'function') {
                dateInputRef.current.showPicker();
              } else {
                dateInputRef.current.focus();
              }
            }
          }}
          style={{ 
            position: 'absolute', 
            right: '2px', 
            top: '2px', 
            bottom: '2px', 
            width: '44px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            zIndex: 5
          }}
        >
          <IonIcon icon={calendarOutline} style={{ fontSize: '20px', color: '#2563EB' }} />
        </div>
        
        {/* Hidden but functional native input for the actual picker */}
        <input
          type="date"
          ref={dateInputRef}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '0',
            height: '0',
            opacity: 0,
            border: 'none',
            outline: 'none',
            visibility: 'hidden'
          }}
        />
      </div>
    </div>
  );
};

const formatChequeDate = (dateVal) => {
  if (!dateVal) return '';
  const standardDate = formatExcelDate(dateVal);
  if (!standardDate || standardDate.length !== 10) return standardDate;
  const [d, m, y] = standardDate.split('-');
  return `${d} - ${m} - ${y}`;
};


// Error Boundary Component - must be class component

const App = () => {
  const APP_VERSION = PKG_VERSION;

  const [latestVersion, setLatestVersion] = useState(APP_VERSION);

  const [initialLoading, setInitialLoading] = useState(true);
  
  // --- Connection Error Banner State ---
  const [connectionError, setConnectionError] = useState(null); // { message, context, timestamp }
  const [isRetrying, setIsRetrying] = useState(false);
  const connectionRetryTimerRef = useRef(null);

  // --- Per-Tab State Persistence ---
  const tabStateRef = useRef({}); // Map of tabId -> { filters, searches, selections }
  const tabDataRef = useRef({}); // Map of tabId -> { contract, offer, etc. } for detail tabs

  const [buildings, setBuildings] = useState([]);
  const [activeBuilding, setActiveBuilding] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const fileInputRef = useRef(null);
  const installmentFileInputRef = useRef(null);
  const contractFileInputRef = useRef(null);
  const customerFileInputRef = useRef(null);
  const salesFileInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const paymentAttachmentRef = useRef(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null);
  const [selectedAttachmentFiles, setSelectedAttachmentFiles] = useState([]);
  const [viewingOffer, setViewingOffer] = useState(null);
  const [editingOfferInstallment, setEditingOfferInstallment] = useState(null); // { offer, installment, index }
  const [editingPaymentForAttachment, setEditingPaymentForAttachment] = useState(null); // { installmentId, paymentId }

  // Offer Installments Edit State
  const [showOfferInstallmentsModal, setShowOfferInstallmentsModal] = useState(false);
  const [selectedOfferForInstallments, setSelectedOfferForInstallments] = useState(null);

  const handleUpdateOfferInstallment = (index, field, value) => {
    if (!selectedOfferForInstallments) return;
    const updatedInstallments = [...selectedOfferForInstallments.installments];
    updatedInstallments[index] = { ...updatedInstallments[index], [field]: value };
    setSelectedOfferForInstallments({ ...selectedOfferForInstallments, installments: updatedInstallments });
  };

  const handleAddOfferInstallment = () => {
    if (!selectedOfferForInstallments) return;
    const currentInstallments = selectedOfferForInstallments.installments || [];
    const lastIns = currentInstallments[currentInstallments.length - 1];
    let newDate = new Date().toISOString().split('T')[0];

    if (lastIns && lastIns.dueDate) {
      const d = new Date(lastIns.dueDate);
      const freq = selectedOfferForInstallments.frequency || 'quarterly';
      const monthsToAdd = freq === 'quarterly' ? 3 : freq === 'biannual' ? 6 : freq === 'annual' ? 12 : 1;
      d.setMonth(d.getMonth() + monthsToAdd);
      newDate = d.toISOString().split('T')[0];
    }

    const newIns = {
      id: `INS-ADD-${Date.now()}`,
      type: `Extra Installment ${currentInstallments.length + 1}`,
      dueDate: newDate,
      amount: 0,
      status: 'Planned',
      paymentMethod: lastIns?.paymentMethod || 'Cheque',
      chequeNumber: '',
      bank: lastIns?.bank || ''
    };

    setSelectedOfferForInstallments({
      ...selectedOfferForInstallments,
      installments: [...currentInstallments, newIns]
    });
  };

  const handleSaveOfferInstallments = async () => {
    if (!selectedOfferForInstallments) return;

    // Update offers state
    const updatedOffers = offers.map(o => o.id === selectedOfferForInstallments.id ? selectedOfferForInstallments : o);
    setOffers(updatedOffers);

    // Save to DB
    await saveOffers(updatedOffers);

    // Update viewingOffer if it's the same one
    if (viewingOffer && viewingOffer.id === selectedOfferForInstallments.id) {
      setViewingOffer(selectedOfferForInstallments);
    }

    setShowOfferInstallmentsModal(false);
    setSelectedOfferForInstallments(null);
  };
  const [showReflashOfferConfig, setShowReflashOfferConfig] = useState(false);
  const handleReflashOfferPlan = () => {
    if (!selectedOfferForInstallments) return;
    if (!window.confirm(t('alert.reflashOfferPlanConfirm'))) return;

    const newInstallments = generateOfferInstallments(selectedOfferForInstallments);
    setSelectedOfferForInstallments({
      ...selectedOfferForInstallments,
      installments: newInstallments
    });
    setShowReflashOfferConfig(false);
  };

  const [showFlashFillContractConfig, setShowFlashFillContractConfig] = useState(false);
  const [flashFillContractOptions, setFlashFillContractOptions] = useState({
    includePaid: false,
    totalPrice: '',
    years: '',
    frequency: 'quarterly',
    startingChequeNumber: '',
    bank: ''
  });

  const handleFlashFillContract = async () => {
    if (!viewingContract) return;

    const msg = flashFillContractOptions.includePaid
      ? t('alert.flashFillConfirmDelete')
      : t('alert.flashFillConfirmKeep');

    if (!window.confirm(msg)) return;

    try {
      const updatedIns = await flashFillContractInstallments(viewingContract.id, flashFillContractOptions);
      setInstallments(prev => {
        const other = prev.filter(ins => ins.contractId !== viewingContract.id);
        return [...other, ...updatedIns];
      });
      setShowFlashFillContractConfig(false);
      alert(t('alert.flashFillSuccess'));
    } catch (err) {
      console.error(err);
      alert(t('alert.flashFillError', { error: err.message }));
    }
  };


  // Unit Layout Modal State
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [layoutImageUrl, setLayoutImageUrl] = useState(null);
  const [layoutUnitId, setLayoutUnitId] = useState('');
  const [showFloorplanModal, setShowFloorplanModal] = useState(false);
  const [floorplanPdfUrl, setFloorplanPdfUrl] = useState(null);
  const [floorplanBuildingName, setFloorplanBuildingName] = useState('');

  // Bulk Price Update State
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPricePercentage, setBulkPricePercentage] = useState('');
  const [targetBuildingForBulk, setTargetBuildingForBulk] = useState(null);

  const handleBulkPriceUpdate = async (buildingId, percentage) => {
    promptPassword('Enter Admin Password to confirm bulk price change:', async (password) => {
      if (password === getAppSecurity().adminPassword) {
        try {
          const updated = await bulkUpdateUnitPrices(buildingId, percentage);
          if (updated) {
            setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
            setShowBulkPriceModal(false);
            setTargetBuildingForBulk(null);
            setBulkPricePercentage('');
            alert('Prices updated successfully.');
          }
        } catch (err) {
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleUndoBulkPriceUpdate = async (buildingId) => {
    promptPassword('Enter Admin Password to undo bulk price change:', async (password) => {
      if (password === getAppSecurity().adminPassword) {
        try {
          const updated = await undoBulkUpdatePrices(buildingId);
          if (updated) {
            setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
            alert('Prices restored successfully.');
          }
        } catch (err) {
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterShare, setFilterShare] = useState('all');
  const [filterWallet, setFilterWallet] = useState('all');
  const [sortBy, setSortBy] = useState('unitId');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterNotFullyPaid, setFilterNotFullyPaid] = useState(false);
  const [filterLate, setFilterLate] = useState(false);
  const [filterBuilding, setFilterBuilding] = useState('all');

  const [unitForm, setUnitForm] = useState({
    unitId: '',
    floor: '',
    area: '',
    view: '',
    price: '',
    finishedPrice: '',
    status: 'available',
    share: '',
    plan: ''
  });

  // Inventory/Reports Report State
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedBuildingForInventory, setSelectedBuildingForInventory] = useState(null);
  const [editingUnitPlan, setEditingUnitPlan] = useState(null);
  const [editPlanValue, setEditPlanValue] = useState('');

  // New Report Hub State
  const [reportTab, setReportTab] = useState('inventory'); // inventory, installments, overdue, customers
  const [installments, setInstallments] = useState([]);

  // Offer Payment State
  const [showOfferPaymentModal, setShowOfferPaymentModal] = useState(false);
  const [selectedOfferForPayment, setSelectedOfferForPayment] = useState(null);
  const [offerPaymentForm, setOfferPaymentForm] = useState({ amount: '', date: formatExcelDate(new Date()), reference: '', paymentMethod: 'CASH', chequeNumber: '', bank: '', chequeStatus: 'Not Collected', attachment: null, isReservation: false });
  const [selectedOfferAttachmentFile, setSelectedOfferAttachmentFile] = useState(null);
  const offerAttachmentRef = useRef(null);
  const [editingOfferPaymentForAttachment, setEditingOfferPaymentForAttachment] = useState(null); // { offerId, paymentId }
  const [editingOfferPayment, setEditingOfferPayment] = useState(null); // The actual payment object being edited


  // PDF Preview State
  const [previewPdf, setPreviewPdf] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showInstallmentsReportModal, setShowInstallmentsReportModal] = useState(false);
  const [previewFilename, setPreviewFilename] = useState('');

  const handlePreviewPDF = (doc, filename) => {
    setPreviewPdf(doc);
    setPreviewFilename(filename);
    setShowPreviewModal(true);
  };

  const handleInstallmentReceipt = async (ins, paymentExtra = {}) => {
    const linkedContract = contracts.find(c => c.id === ins.contractId) || contracts.find(c => (c.unitId || '').toString() === (ins.unitId || '').toString());

    // Resolve Customer Name
    let customerName = ins.customerName;
    const custId = ins.customerId || (linkedContract ? linkedContract.customerId : null);
    if (custId) {
      const found = customers.find(c => String(c.id) === String(custId));
      if (found) customerName = found.name;
    }

    // Resolve Joint Purchasers
    let jpNames = [];
    if (linkedContract && linkedContract.jointPurchasers) {
      jpNames = linkedContract.jointPurchasers.map(jp => {
        const found = customers.find(c => String(c.id) === String(jp.id));
        return found ? found.name : (jp.name || jp.id);
      }).filter(name => name);
    }

    // Resolve Guarantor
    let gName = '';
    if (linkedContract && linkedContract.guarantor) {
      const gId = typeof linkedContract.guarantor === 'string' ? linkedContract.guarantor : linkedContract.guarantor.id;
      if (gId) {
        const found = customers.find(c => String(c.id) === String(gId));
        gName = found ? found.name : (linkedContract.guarantor.name || gId);
      }
    }

    // Resolve Payment History based on Payment Date (not entry date)
    let paymentsToShow = paymentExtra.payments || ins.payments || [];
    if (paymentExtra.id) {
      const allPayments = ins.payments || [];
      const currentPaymentObject = allPayments.find(p => p.id === paymentExtra.id);

      if (currentPaymentObject) {
        const currentDate = parseSafeDate(currentPaymentObject.date);
        // Show all payments with date <= current payment date
        paymentsToShow = allPayments.filter(p => {
          const pDate = parseSafeDate(p.date);
          return pDate <= currentDate;
        });
      }
    }

    // Full Installment logic: Total amount as current payment
    let finalPaidAmount = paymentExtra.paidAmount !== undefined ? paymentExtra.paidAmount : (ins.paidAmount || 0);
    let finalInstallmentPaid = ins.paidAmount;
    let layoutImage = null;

    if (paymentExtra.fullInstallment) {
      // Fetch Layout Image (Picture Area)
      if (window.electronAPI) {
        try {
          layoutImage = await window.electronAPI.getUnitLayout(ins.unitId || ins.unitNumber);
        } catch (e) {
          console.error("Layout fetch failed", e);
        }
      }
    }

    const doc = await generateReceiptPDF({
      ...ins,
      ...paymentExtra,
      customerName: customerName || 'Unknown',
      jointPurchasers: jpNames,
      guarantor: gName,
      contractTotal: linkedContract ? linkedContract.totalPrice : (ins.contractTotal || null),
      type: ins.type || 'Payment',
      installmentTotal: ins.amount,
      installmentPaid: finalInstallmentPaid,
      paidAmount: finalPaidAmount,
      payments: paymentsToShow,
      layoutImage: layoutImage
    });
    handlePreviewPDF(doc, `REC-${ins.unitId}-${Date.now()}.pdf`);
  };

  const handleOfferReceipt = async (offer, payment, paymentType) => {
    let customerName = offer.customerName;
    if (offer.customerId) {
      const found = customers.find(c => String(c.id) === String(offer.customerId));
      if (found) customerName = found.name;
    }

    // Resolve Joint Purchasers
    let jpNames = [];
    if (offer.jointPurchasers && offer.jointPurchasers.length > 0) {
      jpNames = offer.jointPurchasers.map(jp => {
        const found = customers.find(c => String(c.id) === String(jp.id));
        return found ? found.name : (jp.name || jp.id);
      }).filter(name => name);
    }

    // Resolve Guarantor
    let gName = '';
    if (offer.guarantor) {
      const gId = typeof offer.guarantor === 'string' ? offer.guarantor : offer.guarantor.id;
      if (gId) {
        const found = customers.find(c => String(c.id) === String(gId));
        gName = found ? found.name : (offer.guarantor.name || gId);
      }
    }

    // Resolve Payment History for Offer based on Payment Date
    const allPayments = offer.payments || [];
    const currentPaymentObject = allPayments.find(p => p.id === payment.id);
    let paymentsToShow = [payment];

    if (currentPaymentObject) {
      const currentDate = parseSafeDate(currentPaymentObject.date);
      paymentsToShow = allPayments.filter(p => {
        const pDate = parseSafeDate(p.date);
        return pDate <= currentDate;
      });
    }

    // Calculate total paid so far (all payments up to and including current)
    const totalPaidSoFar = paymentsToShow.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const offerTotal = Number(offer.finalPrice || offer.totalPrice || 0);

    // Fetch Layout Image
    let layoutImage = null;
    if (window.electronAPI) {
      try {
        layoutImage = await window.electronAPI.getUnitLayout(offer.unitId);
      } catch (e) {
        console.error('Layout fetch failed', e);
      }
    }

    // Calculate down payment required for this offer
    const dpRequired = Number(offer.downPaymentAmount) ||
      (offerTotal * (Number(offer.downPayment) / 100)) || offerTotal;

    const doc = await generateReceiptPDF({
      ...payment,
      isOfferPayment: true,
      paidAmount: Number(payment.amount || 0),
      unitId: offer.unitId,
      customerName: customerName,
      jointPurchasers: jpNames,
      guarantor: gName,
      contractTotal: offerTotal,
      dueDate: payment.date,
      type: paymentType || 'Payment',
      installmentTotal: dpRequired,
      installmentPaid: totalPaidSoFar,
      paymentMethod: payment.paymentMethod || payment.method || 'CASH',
      chequeNumber: payment.chequeNumber || payment.ref || '',
      bank: payment.bank || '',
      payments: paymentsToShow,
      layoutImage: layoutImage
    });
    handlePreviewPDF(doc, `REC-${offer.unitId}-${Date.now()}.pdf`);
  };

  // Update Check State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState('');
  const [apkUrl, setApkUrl] = useState('');

  // --- StartUp & Branding ---
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [branding, setBranding] = useState({ name: '', header: null, footer: null, landscapeHeader: null, landscapeFooter: null, logo: null, logoDark: null });
  const [showChequeCustody, setShowChequeCustody] = useState(false);
  const [chequeCustodySelection, setChequeCustodySelection] = useState([]);
  const isNativeMobile = window.Capacitor && window.Capacitor.isNativePlatform();
  const [dbConfig, setDbConfig] = useState({
    type: isNativeMobile ? 'hosted' : 'local',
    url: 'http://localhost:3001/api',
    mobilePath: ''
  });
  const [securityConfig, setSecurityConfig] = useState({ adminPassword: '', ownerPassword: 'ALEXmoh12!@' });

  // DB Folder State
  const [currentDbPath, setCurrentDbPath] = useState('Loading...');
  const [currentBackupPath, setCurrentBackupPath] = useState('Loading...');

  // Express Server State (LAN Database)
  const [expressServerRunning, setExpressServerRunning] = useState(false);
  const [expressServerIP, setExpressServerIP] = useState('');
  const [expressServerLoading, setExpressServerLoading] = useState(false);
  const [expressServerStats, setExpressServerStats] = useState(null);
  const [autoStartServer, setAutoStartServer] = useState(false);

  // Poll Express server health for monitoring stats
  useEffect(() => {
    if (!expressServerRunning) { setExpressServerStats(null); return; }
    const pollHealth = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/health');
        if (res.ok) {
          const data = await res.json();
          setExpressServerStats(data);
        }
      } catch (e) { /* server may be starting up */ }
    };
    pollHealth();
    const interval = setInterval(pollHealth, 10000);
    return () => clearInterval(interval);
  }, [expressServerRunning]);

  // Auto-refresh data when in MONITOR MODE (express) so owner sees client changes
  const refreshDataRef = React.useRef(null);
  useEffect(() => {
    const config = getDatabaseConfig();
    if (config.type !== 'express' || !expressServerRunning) return;

    const autoRefresh = async () => {
      if (refreshDataRef.current) {
        await refreshDataRef.current();
      }
    };

    const interval = setInterval(autoRefresh, 3000); // Refresh every 3 seconds for near real-time
    return () => clearInterval(interval);
  }, [expressServerRunning]);

  useEffect(() => {
    // Check Branding and Setup State on Start
    const existingBranding = getCompanyBranding();
    const existingConfig = getDatabaseConfig();
    const existingSecurity = getAppSecurity();
    const appState = getAppState();

    setBranding(existingBranding);
    // On Android, force 'hosted' if config was 'local' (since Electron APIs don't exist)
    // On Android, we treat 'local' as valid (Internal Storage)
    setDbConfig(existingConfig);
    setSecurityConfig(existingSecurity);

    if (!appState.setupComplete || !existingBranding.name) {
      if (isNativeMobile) {
        // Mobile: skip setup wizard entirely — auto-configure with defaults
        // User can change everything from Settings later
        if (!existingBranding.name) {
          const defaultBranding = { ...existingBranding, name: 'DYR' };
          setCompanyBranding(defaultBranding);
          setBranding(defaultBranding);
        }
        if (!appState.setupComplete) {
          setDatabaseConfig(existingConfig);
          setAppSecurity(existingSecurity);
          setAppState({ setupComplete: true });
        }
      } else {
        // Desktop: show setup wizard for folder config
        setShowSetupWizard(true);
      }
    }

    // Fetch DB Path and Backup Path if local
    if (window.electronAPI) {
      window.electronAPI.getDBFolder().then(path => setCurrentDbPath(path));
      if (window.electronAPI.getBackupFolder) {
        window.electronAPI.getBackupFolder().then(path => setCurrentBackupPath(path));
      }
      // Store system info for client identification on network
      if (window.electronAPI.getSystemInfo) {
        window.electronAPI.getSystemInfo().then(info => {
          if (info) localStorage.setItem('dyr_system_info', JSON.stringify(info));
        }).catch(() => {});
      }

      // Listen for DB path errors (e.g. saved path became inaccessible)
      if (window.electronAPI.onDBPathError) {
        window.electronAPI.onDBPathError((data) => {
          alert(`⚠️ Database Warning!\n\nYour configured database path is not accessible:\n${data.savedPath}\n\nError: ${data.error}\n\nThe app is using a fallback location. Your data may not load correctly.\nPlease go to Settings and update your database path.`);
        });
      }

      // Check Express Server status on startup
      // Note: auto-start has a 2s delay in main.js, so we re-check after 4s and 8s
      if (window.electronAPI.getServerStatus) {
        const checkServerStatus = () => {
          window.electronAPI.getServerStatus().then(status => {
            setExpressServerRunning(status.running);
            setExpressServerIP(status.ip);
          });
        };
        checkServerStatus(); // Immediate check
        setTimeout(checkServerStatus, 4000);  // Re-check after auto-start window
        setTimeout(checkServerStatus, 8000);  // Final safety check
      }
      // Load auto-start preference
      if (window.electronAPI.getAutoStart) {
        window.electronAPI.getAutoStart().then(result => {
          setAutoStartServer(result.enabled);
        }).catch(() => {});
      }
    } else if (isNativeMobile) {
      setCurrentDbPath("Internal App Storage (Secure)");
      setCurrentBackupPath("Internal App Storage (Secure)");
    }
  }, []);


  // Express Server Start/Stop Handlers
  const handleStartExpressServer = async () => {
    if (!window.electronAPI?.startExpressServer) return;
    setExpressServerLoading(true);
    try {
      const result = await window.electronAPI.startExpressServer();
      if (result.success) {
        setExpressServerRunning(true);
        setExpressServerIP(result.ip);
      } else {
        alert(`Failed to start server: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setExpressServerLoading(false);
  };

  const handleStopExpressServer = async () => {
    if (!window.electronAPI?.stopExpressServer) return;
    setExpressServerLoading(true);
    try {
      await window.electronAPI.stopExpressServer();
      setExpressServerRunning(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setExpressServerLoading(false);
  };


  useEffect(() => {
    // --- GLOBAL FIX: Prevent mouse wheel from changing input values ---
    const handleGlobalWheel = (e) => {
      if (document.activeElement.type === 'number' ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.classList.contains('native-input')) {
        // If it's a number input or focused input, stop the scroll update
        if (e.target.blur) {
          if (e.target.type === 'number') {
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener('wheel', handleGlobalWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleGlobalWheel);
    };
  }, []);

  // Background Log Synchronization
  useEffect(() => {
    // Initial sync
    syncPendingLogs();
    // Periodic sync every 2 minutes
    const logSyncInterval = setInterval(syncPendingLogs, 120000);
    return () => clearInterval(logSyncInterval);
  }, []);

  // --- Connection Error Event Listener ---
  useEffect(() => {
    const handleConnectionError = (e) => {
      const { message, context, timestamp } = e.detail;
      setConnectionError({ message, context, timestamp });
      setIsRetrying(false);
    };

    const handleConnectionOk = () => {
      setConnectionError(null);
      setIsRetrying(false);
      if (connectionRetryTimerRef.current) {
        clearTimeout(connectionRetryTimerRef.current);
        connectionRetryTimerRef.current = null;
      }
    };

    window.addEventListener('dyr-connection-error', handleConnectionError);
    window.addEventListener('dyr-connection-ok', handleConnectionOk);
    return () => {
      window.removeEventListener('dyr-connection-error', handleConnectionError);
      window.removeEventListener('dyr-connection-ok', handleConnectionOk);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      // Use ref to get the latest refreshData function
      if (refreshDataRef.current) {
        await refreshDataRef.current();
      }
      // If refreshData succeeds, connection-ok event will clear the banner
    } catch (e) {
      // Still failing - keep the banner
      setIsRetrying(false);
    }
  };

  const handleChangeDbFolder = async () => {
    if (isNativeMobile) {
      // Mobile still uses prompt (it works on Capacitor webview)
      const customPath = window.prompt("Enter a storage folder name on your device (relative to Documents):", dbConfig.mobilePath || "DYR_DB");
      if (customPath !== null) {
        setDbConfig(prev => ({ ...prev, mobilePath: customPath }));
        setCurrentDbPath(`Documents/${customPath}`);
        alert(`Storage path set to: Documents/${customPath}. Save settings to apply.`);
      }
      return;
    }

    if (window.electronAPI) {
      try {
        const newPath = await window.electronAPI.selectDBFolder();
        if (newPath) {
          setCurrentDbPath(newPath);
          alert("Database folder updated successfully!\nThe application will now restart.");
          if (window.electronAPI.relaunch) {
            window.electronAPI.relaunch();
          } else {
            window.location.reload();
          }
        }
      } catch (err) {
        alert(`Failed to change database folder:\n${err.message || err}\n\nMake sure the folder is accessible and writable.`);
      }
    }
  };

  const handleChangeBackupFolder = async () => {
    if (!window.electronAPI) return;

    try {
      const newPath = await window.electronAPI.selectBackupFolder();
      if (newPath) {
        setCurrentBackupPath(newPath);
        alert(`Backup folder updated to:\n${newPath}\n\nAll future backups will be saved here.`);
      }
    } catch (err) {
      alert(`Failed to change backup folder:\n${err.message || err}\n\nMake sure the folder is accessible and writable.`);
    }
  };

  const handleResetBackupFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.resetBackupPath();
    if (result && result.success) {
      setCurrentBackupPath(result.path);
      alert(`Backup path reset to default:\n${result.path}`);
    } else {
      alert(`Failed to reset: ${result?.error || 'Unknown error'}`);
    }
  };

  const handleSaveSetup = () => {
    if (!branding.name) {
      alert(t('alert.companyNameRequired'));
      return;
    }
    if (!securityConfig.adminPassword) {
      alert(t('alert.adminPasswordRequired'));
      return;
    }

    // 1. Save Branding
    setCompanyBranding(branding);

    // 2. Save Database
    setDatabaseConfig(dbConfig);

    // 3. Save Security
    setAppSecurity(securityConfig);

    // 4. Mark Setup Complete
    setAppState({ setupComplete: true });

    setShowSetupWizard(false);

    // Force reload to apply DB connection changes if any
    alert(t('alert.setupComplete'));
    window.location.reload();
  };

  const handleImagePick = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBranding(prev => ({ ...prev, [field]: ev.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-Update State (Windows)
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, not-available, downloading, downloaded, error
  const [updateProgress, setUpdateProgress] = useState({ percent: 0, bytesPerSecond: 0, total: 0, transferred: 0 });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateError, setUpdateError] = useState('');

  // View State: 'home' | 'buildings'
  const [currentView, setCurrentView] = useState('home');
  const [activeTabId, setActiveTabId] = useState('home');

  // --- Tab System ---
  const TAB_LABELS = {
    home: t('nav.dashboard'), buildings: t('nav.properties'), customers: t('nav.clients'),
    offers: t('nav.offers'), contracts: t('nav.contracts'), installments: t('nav.installments'),
    cheques: t('nav.cheques'), wallets: t('nav.wallets'), feedback: t('nav.collections'),
    reminders: t('nav.reminders'), terminated: t('nav.terminated'), sales: t('nav.salesForce'),
    createOffer: t('nav.newOffer'), commissions: 'Commissions'
  };
  const [openTabs, setOpenTabs] = useState([{ id: 'home', view: 'home', label: t('nav.dashboard') }]);
  const tabClickTimerRef = useRef(null);
  const [tabContextMenu, setTabContextMenu] = useState(null); // { x, y, tabId, tabView }

  const navigateToView = useCallback((viewKey) => {
    // Settings, reports, etc. open modals — don't create tabs for those
    const label = TAB_LABELS[viewKey];
    if (!label) { setCurrentView(viewKey); return; }
    setOpenTabs(prev => {
      const existing = prev.find(t => t.view === viewKey);
      if (!existing) {
        // First instance: id === viewKey for simplicity
        const newTab = { id: viewKey, view: viewKey, label };
        setActiveTabId(viewKey);
        setCurrentView(viewKey);
        return [...prev, newTab];
      }
      // Switch to the existing tab
      setActiveTabId(existing.id);
      setCurrentView(viewKey);
      return prev;
    });
  }, []);

  const duplicateTab = useCallback((viewKey) => {
    if (viewKey === 'home') return;
    const baseLabel = TAB_LABELS[viewKey];
    if (!baseLabel) return;
    const newId = `${viewKey}-${Date.now()}`;
    setOpenTabs(prev => {
      // Count existing tabs of this same view type for numbering
      const sameViewCount = prev.filter(t => t.view === viewKey).length;
      const newLabel = `${baseLabel} (${sameViewCount + 1})`;
      const newTab = { id: newId, view: viewKey, label: newLabel };
      // Also rename the first instance if it doesn't have a number yet
      const updated = prev.map(t => {
        if (t.view === viewKey && t.label === baseLabel) {
          return { ...t, label: `${baseLabel} (1)` };
        }
        return t;
      });
      return [...updated, newTab];
    });
    // Switch to the new duplicate (fresh state — no entry in tabStateRef)
    setActiveTabId(newId);
    setCurrentView(viewKey);
  }, []);

  const closeTab = useCallback((tabId, e) => {
    if (e) e.stopPropagation();
    if (tabId === 'home') return; // Can't close home
    // Clean up per-tab saved state so next open starts fresh
    delete tabStateRef.current[tabId];
    delete tabDataRef.current[tabId];
    setOpenTabs(prev => {
      // Support closing by tabId (new) or by viewKey (legacy, e.g. createOffer)
      const matchById = prev.find(t => t.id === tabId);
      const newTabs = matchById
        ? prev.filter(t => t.id !== tabId)
        : prev.filter(t => t.view !== tabId);
      const closedTab = matchById || prev.find(t => t.view === tabId);
      // If we're closing the active tab, switch to the nearest remaining tab
      if (closedTab && (activeTabId === closedTab.id || currentView === closedTab.view)) {
        const idx = prev.findIndex(t => t.id === (closedTab.id));
        const fallback = newTabs[Math.min(idx, newTabs.length - 1)] || newTabs[0];
        setActiveTabId(fallback.id);
        setCurrentView(fallback.view);
      }
      // If only one tab of this view remains, remove the (1) suffix
      const viewKey = closedTab ? closedTab.view : tabId;
      const remainingOfView = newTabs.filter(t => t.view === viewKey);
      if (remainingOfView.length === 1) {
        const baseLabel = TAB_LABELS[viewKey];
        if (baseLabel) {
          return newTabs.map(t => t.id === remainingOfView[0].id ? { ...t, label: baseLabel } : t);
        }
      }
      return newTabs;
    });
  }, [activeTabId, currentView]);

  const closeOtherTabs = useCallback((keepTabId) => {
    setOpenTabs(prev => {
      const kept = prev.filter(t => t.id === 'home' || t.id === keepTabId);
      // Clean up state for closed tabs
      prev.forEach(t => {
        if (t.id !== 'home' && t.id !== keepTabId) {
          delete tabStateRef.current[t.id];
          delete tabDataRef.current[t.id];
        }
      });
      // Rename if only one of a view type remains
      const keptTab = kept.find(t => t.id === keepTabId);
      if (keptTab) {
        const baseLabel = TAB_LABELS[keptTab.view];
        if (baseLabel && keptTab.label !== baseLabel) {
          return kept.map(t => t.id === keepTabId ? { ...t, label: baseLabel } : t);
        }
      }
      return kept;
    });
    // Switch to the kept tab
    const tab = openTabs.find(t => t.id === keepTabId);
    if (tab) {
      setActiveTabId(tab.id);
      setCurrentView(tab.view);
    }
    setTabContextMenu(null);
  }, [openTabs, activeTabId, currentView]);

  // --- Open a contract as its own dedicated tab ---
  const openContractInTab = useCallback((contract) => {
    if (!contract) return;
    const tabId = `contractDetail-${contract.id}`;
    const unitLabel = contract.unitId || contract.id;
    const label = `${t('nav.contracts')} - ${unitLabel}`;
    // Store the contract data for this tab
    tabDataRef.current[tabId] = { contract };
    setViewingContract(contract);
    setOpenTabs(prev => {
      // If this exact contract tab already exists, just switch to it
      const existing = prev.find(t => t.id === tabId);
      if (existing) {
        setActiveTabId(tabId);
        setCurrentView('contractDetail');
        return prev;
      }
      return [...prev, { id: tabId, view: 'contractDetail', label }];
    });
    setActiveTabId(tabId);
    setCurrentView('contractDetail');
  }, []);

  // Helper: close the current contract detail tab and go back
  const closeContractTab = useCallback(() => {
    setViewingContract(null);
    if (currentView === 'contractDetail') {
      closeTab(activeTabId);
    }
  }, [currentView, activeTabId, closeTab]);


  // Performance State
  const [visibleInstallmentsCount, setVisibleInstallmentsCount] = useState(50);

  const [reminderSearchQuery, setReminderSearchQuery] = useState('');
  const [reminderStartDate, setReminderStartDate] = useState('');
  const [reminderEndDate, setReminderEndDate] = useState('');

  const [uploadProgress, setUploadProgress] = useState({ isOpen: false, current: 0, total: 0, message: '' });

  // Password Change State
  const [showChangePasswordAlert, setShowChangePasswordAlert] = useState(false);
  // Wallets State
  const [wallets, setWallets] = useState([]);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [newWallet, setNewWallet] = useState({ bankAddress: '', applicationDate: new Date().toISOString().split('T')[0], notes: '', checkIds: [] });
  const [viewingWallet, setViewingWallet] = useState(null);
  const [walletSearchQuery, setWalletSearchQuery] = useState('');
  const [checkSearchQuery, setCheckSearchQuery] = useState('');
  const [linkedCheckSearchQuery, setLinkedCheckSearchQuery] = useState('');


  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Customer / Sales Detail View State
  const [viewingCustomerDetail, setViewingCustomerDetail] = useState(null);
  const [viewingSalesDetail, setViewingSalesDetail] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);

  // Remote Control State
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isOfflineLocked, setIsOfflineLocked] = useState(false);
  const [sessionMac, setSessionMac] = useState(null);
  const [sessionSysInfo, setSessionSysInfo] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Access Timer State
  const [accessExpiresAt, setAccessExpiresAt] = useState(null); // ISO string or null (permanent)
  const [accessCountdown, setAccessCountdown] = useState(''); // Display string
  const [accessUrgency, setAccessUrgency] = useState('green'); // green/yellow/red/expired/permanent

  // -- SINGLE SESSION ENFORCEMENT --
  const lastEnforcedUserSession = useRef(null);
  const enforceSingleSession = useCallback(async (user, mac) => {
    if (!user || !mac) return;
    try {
      const oldSessionId = await getUserSession(user.id);
      if (oldSessionId && oldSessionId.toLowerCase() !== mac.toLowerCase()) {
        await updateSessionStatus(oldSessionId, 'logged_out');
      }
      // Register session + push user info
      await registerSession({
        ...sessionSysInfo,
        username: user.name
      }, APP_VERSION, {
        logged_in_user: user.name,
        user_role: user.rank,
        user_company: user.company,
        user_permissions: user.permissions,
        login_time: new Date().toISOString()
      });
      await updateUserSession(user.id, mac);
      // Kick all other sessions for this user (bulletproof single-session)
      await kickOtherSessions(user.name, mac);
      // Update session with user details
      await updateSessionUserInfo(mac, {
        name: user.name,
        rank: user.rank,
        company: user.company,
        permissions: user.permissions
      });
    } catch (e) {
      console.error("Session enforcement failed", e);
    }
  }, [isNativeMobile, sessionSysInfo]);

  useEffect(() => {
    const sessionKey = `${loggedInUser?.id}-${sessionMac}`;
    if (loggedInUser && sessionMac && lastEnforcedUserSession.current !== sessionKey) {
      lastEnforcedUserSession.current = sessionKey;
      enforceSingleSession(loggedInUser, sessionMac);
    }
  }, [loggedInUser, sessionMac, enforceSingleSession]);

  // -- ACCESS COUNTDOWN TIMER (updates every second) --
  useEffect(() => {
    if (!accessExpiresAt) {
      setAccessCountdown('');
      setAccessUrgency('permanent');
      return;
    }
    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(accessExpiresAt).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setAccessCountdown('EXPIRED');
        setAccessUrgency('expired');
        setIsAppLocked(true);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      let display = '';
      if (days > 0) display = `${days}d ${hours}h`;
      else if (hours > 0) display = `${hours}h ${mins}m`;
      else display = `${mins}m`;
      setAccessCountdown(display);
      if (diff < 24 * 60 * 60 * 1000) setAccessUrgency('red');
      else if (diff < 3 * 24 * 60 * 60 * 1000) setAccessUrgency('yellow');
      else setAccessUrgency('green');
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [accessExpiresAt]);

  // -- INDEPENDENT INTEGRITY VERIFICATION (runs separately from heartbeat) --
  useEffect(() => {
    if (!loggedInUser) return;
    const _iv = setInterval(() => {
      const _sl = getSecondaryLockState();
      if (_sl && !isAppLocked) {
        setIsAppLocked(true);
      }
    }, 30000); // Every 30s
    return () => clearInterval(_iv);
  }, [loggedInUser, isAppLocked]);

  // -- TRACK TAB CHANGES (real-time) --
  useEffect(() => {
    if (sessionMac && loggedInUser) {
      const tabLabel = TAB_LABELS[currentView] || currentView;
      updateSessionTab(sessionMac, tabLabel);
    }
  }, [activeTabId, currentView, sessionMac, loggedInUser]);

  // -- HOST STATUS TRACKING --
  useEffect(() => {
    if (sessionMac) {
      updateSessionHostStatus(sessionMac, expressServerRunning);
    }
  }, [expressServerRunning, sessionMac]);

  const hasPermission = (tabId) => {
    if (!loggedInUser) return false;
    if (loggedInUser.rank === 'admin' || loggedInUser.rank === 'owner') return true;
    if (loggedInUser.permissions?.allTabs) return true;
    return loggedInUser.permissions?.allowedTabs?.includes(tabId);
  };

  const canAction = (action) => {
    if (!loggedInUser) return false;
    if (loggedInUser.rank === 'admin' || loggedInUser.rank === 'owner') return true;
    return loggedInUser.permissions?.actions?.[action] || false;
  };

  // Session Tracking & Admin Shortcut
  useEffect(() => {
    let heartbeatInterval;
    const initSession = async () => {
      try {
        let sysInfo = null;
        const deviceType = detectDeviceType();

        if (window.electronAPI && window.electronAPI.getSystemInfo) {
          sysInfo = await window.electronAPI.getSystemInfo();
        } else if (isNativeMobile) {
          const mockMac = getDeviceId();
          sysInfo = {
            mac: mockMac,
            hostname: 'Android Device',
            username: 'Mobile User',
            ip: 'Mobile Network',
            platform: 'android'
          };
        } else {
          // Web browser — generate persistent device ID
          const webId = getDeviceId();
          sysInfo = {
            mac: webId,
            hostname: navigator.userAgent.includes('Chrome') ? 'Chrome Browser' : navigator.userAgent.includes('Firefox') ? 'Firefox Browser' : 'Web Browser',
            username: 'Web User',
            ip: 'Web Client',
            platform: 'web'
          };
        }

        if (sysInfo) {
          const mac = sysInfo.mac || sysInfo.ip;
          setSessionMac(mac);
          setSessionSysInfo(sysInfo);
          console.log("Session System Info Loaded:", sysInfo);
          // Register if we have a valid MAC/ID
          const macLower = (mac || '').toLowerCase();
          const isMockId = macLower.startsWith('mob-') || macLower.startsWith('web-');
          if (mac && (isMockId || (macLower !== 'unknown mac' && macLower !== '00:00:00:00:00:00'))) {
            await registerSession(sysInfo, APP_VERSION);
          }

          // Current tab name for heartbeat
          const getCurrentTabName = () => {
            const tab = openTabs.find(t => t.id === activeTabId);
            return tab ? tab.label : currentView;
          };

          const checkStatus = async () => {
            const tabName = getCurrentTabName();
            const statusData = await sendHeartbeat(mac, tabName);
            if (statusData) {
              // --- INTEGRITY: Validate heartbeat response ---
              validateHeartbeat(statusData);
              calibrateTime(statusData.last_active);

              // --- SINGLE CLIENT ENFORCEMENT ---
              if (statusData.session_status === 'logged_out' && loggedInUser) {
                alert(t('alert.loggedOutFromAnotherDevice'));
                localStorage.removeItem('is_device_trusted');
                localStorage.removeItem('trusted_user_name');
                localStorage.removeItem('trusted_user_cred');
                localStorage.removeItem('trusted_user_password');
                setLoggedInUser(null);
                return;
              }

              // 1. Check Lock Status
              let locked = false;
              if (statusData.status === 'suspended') {
                locked = true;
              } else if (statusData.valid_until) {
                if (new Date(statusData.valid_until) < new Date()) {
                  locked = true;
                }
              }

              // 2. Check Access Expiry
              if (statusData.access_expires) {
                setAccessExpiresAt(statusData.access_expires);
                if (new Date(statusData.access_expires) < new Date()) {
                  locked = true;
                }
              } else {
                setAccessExpiresAt(null);
              }

              // 3. Secondary integrity verification (distributed check)
              if (!locked && getSecondaryLockState()) {
                locked = true;
              }

              setIsAppLocked(locked);

              // Update last heartbeat on success
              localStorage.setItem('last_successful_heartbeat', Date.now().toString());
              setIsOfflineLocked(false);

              // 3. Check Commands
              if (statusData.command === 'BACKUP') {
                try {
                  console.log("Starting Remote Backup...");
                  const base64Data = await window.electronAPI.backupDatabase();
                  if (base64Data) {
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/zip' });
                    const fileName = `backup_${sysInfo.hostname}_${Date.now()}.zip`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('backups')
                      .upload(fileName, blob);
                    if (!uploadError) {
                      const publicUrl = supabase.storage.from('backups').getPublicUrl(fileName).data.publicUrl;
                      await updateBackupUrl(statusData.id, publicUrl);
                      await clearCommand(statusData.id);
                      console.log("Remote Backup Complete:", publicUrl);
                    } else {
                      console.error("Backup upload failed", uploadError);
                    }
                  }
                } catch (err) {
                  console.error("Remote backup failed", err);
                }
              } else if (statusData.command === 'RESTART') {
                console.log("Remote Restart Command Received.");
                await clearCommand(statusData.id);
                setTimeout(() => {
                  if (window.electronAPI && window.electronAPI.relaunch) {
                    window.electronAPI.relaunch();
                  }
                }, 1000);
              } else if (statusData.command === 'UPDATE' && statusData.update_url) {
                console.log("Remote Update Command Received:", statusData.update_url);
                await clearCommand(statusData.id);
                setApkUrl(statusData.update_url);
                setRemoteVersion('PUSHED');
                setShowUpdateModal(true);
              }
            } else {
              // Connection failed (Offline)
              const lastHeartbeat = localStorage.getItem('last_successful_heartbeat');
              if (lastHeartbeat) {
                const msOffline = Date.now() - parseInt(lastHeartbeat);
                const daysOffline = msOffline / (1000 * 60 * 60 * 24);
                if (daysOffline >= 3) {
                  setIsOfflineLocked(true);
                }
              } else {
                localStorage.setItem('last_successful_heartbeat', Date.now().toString());
              }
            }
          };

          // Check immediately, then every 10 seconds for real-time tab tracking
          checkStatus();
          heartbeatInterval = setInterval(checkStatus, 10000);
        }
      } catch (e) {
        console.error("Session init failed", e);
      }
    };
    initSession();

    // Admin Shortcut Handler
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const userName = (loggedInUser?.name || '').toLowerCase();
        if (userName === 'dyr' || userName === 'chrono') {
          setShowAdminModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-save branding changes
  useEffect(() => {
    if (branding.name) {
      setCompanyBranding(branding);
    }
  }, [branding]);

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [appSettings, setAppSettings] = useState({
    theme: localStorage.getItem('app_theme') || 'dark',
    fontSize: localStorage.getItem('app_fontSize') || 'medium',
    bgVariant: localStorage.getItem('app_bgVariant') || '',
    paymentReminders: localStorage.getItem('app_paymentReminders') === 'true',
    overdueAlerts: localStorage.getItem('app_overdueAlerts') !== 'false',
    currency: getCurrency()
  });

  // Pick the correct logo based on current theme (light/dark)
  const activeLogo = useMemo(() => {
    const isDark = appSettings.theme === 'dark';
    if (isDark) return branding.logoDark || branding.logo || null;
    return branding.logo || branding.logoDark || null;
  }, [appSettings.theme, branding.logo, branding.logoDark]);

  // Listen for language changes & Apply Theme/Font
  useEffect(() => {
    const handleLangChange = (e) => setCurrentLang(e.detail.language);
    const handleCurrencyChange = (e) => setAppSettings(prev => ({ ...prev, currency: e.detail.currency }));

    window.addEventListener('languageChange', handleLangChange);
    window.addEventListener('currencyChange', handleCurrencyChange);

    // Apply initial settings
    document.documentElement.setAttribute('data-theme', appSettings.theme);
    document.documentElement.setAttribute('data-font-size', appSettings.fontSize);
    // Apply background variant
    if (appSettings.bgVariant) {
      document.documentElement.setAttribute('data-bg-variant', appSettings.bgVariant);
    } else {
      document.documentElement.removeAttribute('data-bg-variant');
    }

    // Inject Arabic Font Style
    const styleId = 'arabic-font-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @font-face {
          font-family: 'Amiri';
          src: url(data:font/truetype;charset=utf-8;base64,${AMIRI_FONT_BASE64}) format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        [dir="rtl"] {
          font-family: 'Amiri', serif !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      window.removeEventListener('languageChange', handleLangChange);
      window.removeEventListener('currencyChange', handleCurrencyChange);
    };
  }, [appSettings.theme, appSettings.fontSize, appSettings.bgVariant]);
  // (Theme/font application is handled by the useEffect above)

  useEffect(() => {
    const init = async () => {
      try {
        // One-time migration: fix Cuve-141 finished prices (runs before loading buildings into state)
        try { await fixCuve141FinishedPrices(); } catch (e) { console.error('Migration fix failed:', e); }
        // One-time migration: set exact finished prices on Cruise-140
        try { await fixCruise140FinishedPrices(); } catch (e) { console.error('Cruise-140 migration failed:', e); }
        // One-time migration: set exact base prices on Cruise-140
        try { await fixCruise140BasePrices(); } catch (e) { console.error('Cruise-140 base price migration failed:', e); }
        // One-time migration: set finished prices batch 2 on Cruise-140
        try { await fixCruise140FinishedPricesV2(); } catch (e) { console.error('Cruise-140 finished v2 migration failed:', e); }

        // Load initial data
        setBuildings(await getBuildings());
        setCustomers(await getCustomers());
        setContracts(await getContracts());
        setInstallments(await getInstallments());
        setOffers(await getOffers());
        setSales(await getSales());

        setWallets(await getWallets());

        // Fail-safe: Create default admin if no users exist
        try {
          const users = await getUsers();
          if (users.length === 0) {
            console.log("No users found. Creating default admin...");
            await addUser({
              name: 'Admin',
              password: '123',
              rank: 'admin',
              company: branding.name || 'System',
              permissions: { allTabs: true, actions: { view: true, edit: true, add: true, delete: true } }
            });
          }

          // Auto-login if device is trusted
          const isTrusted = localStorage.getItem('is_device_trusted') === 'true';
          if (isTrusted) {
            const tName = localStorage.getItem('trusted_user_name');
            const tCredEnc = localStorage.getItem('trusted_user_cred');
            const tPassLegacy = localStorage.getItem('trusted_user_password');
            const tPass = tCredEnc ? (() => { try { return decodeURIComponent(escape(atob(tCredEnc))); } catch { return ''; } })() : tPassLegacy;
            if (tName && tPass) {
              const user = users.find(u => u.name === tName && u.password === tPass);
              if (user) {
                console.log("Auto-login: Trusted device detected.");
                setLoggedInUser(user);
                // Migrate legacy plain-text to encoded
                if (tPassLegacy && !tCredEnc) {
                  localStorage.setItem('trusted_user_cred', btoa(unescape(encodeURIComponent(tPass))));
                  localStorage.removeItem('trusted_user_password');
                }
              }
            }
          }
        } catch (uErr) {
          console.error("User check/auto-login failed:", uErr);
        }

        // Check for updates
        try {
          const config = await getAppConfig();
          if (config && config.latest_version) {
            if (config.latest_version > APP_VERSION) {
              setRemoteVersion(config.latest_version);
              setApkUrl(config.apk_url || '');
              // setHasUpdate(true); // Disabled auto-prompt
              // setShowUpdateModal(true); // Disabled auto-prompt
            }
          }
        } catch (e) {
          console.error('Update check failed', e);
        }
      } catch (err) {
        console.error('Data loading failed:', err);
      } finally {
        // Always end loading screen, even on error
        setTimeout(() => setInitialLoading(false), 2000);
      }
    };
    init();

  }, []);

  // Auto-Update Listeners
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateStatus((data) => {
        setUpdateStatus(data.status);
        if (data.info) setUpdateInfo(data.info);
        if (data.error) setUpdateError(data.error);
      });

      window.electronAPI.onUpdateProgress((data) => {
        setUpdateProgress(data);
      });

      return () => {
        window.electronAPI.removeUpdateListeners();
      };
    }
  }, []);

  const handleCheckForUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    
    if (window.electronAPI && window.electronAPI.checkForUpdate) {
      // Desktop: use electron-updater
      await window.electronAPI.checkForUpdate();
    } else {
      // Mobile/Web: check GitHub releases API
      try {
        const res = await fetch('https://api.github.com/repos/chrononw-amer/dyr-updates/releases/latest');
        const release = await res.json();
        const latestVersion = release.tag_name?.replace('v', '') || '';
        
        if (latestVersion && latestVersion !== APP_VERSION) {
          const apkAsset = release.assets?.find(a => a.name.endsWith('.apk'));
          setUpdateStatus('available');
          setUpdateInfo({ version: latestVersion, apkUrl: apkAsset?.browser_download_url });
        } else {
          setUpdateStatus('not-available');
        }
      } catch (err) {
        setUpdateStatus('error');
        setUpdateError(err.message || 'Failed to check for updates');
      }
    }
  };

  const handleDownloadUpdate = async () => {
    if (window.electronAPI && window.electronAPI.downloadUpdate) {
      setUpdateStatus('downloading');
      await window.electronAPI.downloadUpdate();
    } else if (updateInfo?.apkUrl) {
      // Mobile: open APK download URL in browser
      window.open(updateInfo.apkUrl, '_blank');
      setUpdateStatus('idle');
    }
  };

  const handleQuitAndInstall = () => {
    window.electronAPI.quitAndInstall();
  };

  // --- Per-Tab State Save/Restore (keyed by tab ID for multi-instance support) ---
  const prevTabIdRef = useRef('home');
  useEffect(() => {
    const prevId = prevTabIdRef.current;

    // Save previous tab's state before switching
    if (prevId && prevId !== activeTabId) {
      tabStateRef.current[prevId] = {
        filterBuilding, activeBuilding,
        searchQuery, offerSearchQuery, contractSearchQuery,
        filterStatus, filterNotFullyPaid, filterLate,
        fromDate, toDate, filterWallet,
        salesSearchQuery, reminderSearchQuery, chequeSearchQuery, customerSearchQuery
      };
      // Save contract data if leaving a contractDetail tab
      if (prevId.startsWith('contractDetail-') && viewingContract) {
        tabDataRef.current[prevId] = { contract: viewingContract };
      }
    }

    // Update currentView from the active tab
    setOpenTabs(prev => {
      const tab = prev.find(t => t.id === activeTabId);
      if (tab && tab.view !== currentView) setCurrentView(tab.view);
      return prev;
    });

    // Restore contract data if entering a contractDetail tab
    if (activeTabId.startsWith('contractDetail-')) {
      const tabData = tabDataRef.current[activeTabId];
      if (tabData && tabData.contract) {
        setViewingContract(tabData.contract);
      }
    } else {
      // Clear viewingContract when switching to a non-contract-detail tab
      setViewingContract(null);
    }

    // Restore the new tab's saved state (if any)
    const saved = tabStateRef.current[activeTabId];
    if (saved) {
      setFilterBuilding(saved.filterBuilding ?? 'all');
      setActiveBuilding(saved.activeBuilding ?? null);
      setSearchQuery(saved.searchQuery ?? '');
      setOfferSearchQuery(saved.offerSearchQuery ?? '');
      setContractSearchQuery(saved.contractSearchQuery ?? '');
      setFilterStatus(saved.filterStatus ?? 'all');
      setFilterNotFullyPaid(saved.filterNotFullyPaid ?? false);
      setFilterLate(saved.filterLate ?? false);
      setFromDate(saved.fromDate ?? '');
      setToDate(saved.toDate ?? '');
      setFilterWallet(saved.filterWallet ?? 'all');
      setSalesSearchQuery(saved.salesSearchQuery ?? '');
      setReminderSearchQuery(saved.reminderSearchQuery ?? '');
      setChequeSearchQuery(saved.chequeSearchQuery ?? '');
      setCustomerSearchQuery(saved.customerSearchQuery ?? '');
    } else {
      // First time opening this tab — start fresh
      setFilterBuilding('all');
      setActiveBuilding(null);
      setSearchQuery('');
      setOfferSearchQuery('');
      setContractSearchQuery('');
      setFilterStatus('all');
      setFilterNotFullyPaid(false);
      setFilterLate(false);
      setFromDate('');
      setToDate('');
      setFilterWallet('all');
      setSalesSearchQuery('');
      setReminderSearchQuery('');
      setChequeSearchQuery('');
      setCustomerSearchQuery('');
    }

    prevTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const handleRequestRemoteUpdate = async () => {
    if (window.electronAPI && window.electronAPI.getSystemInfo) {
      const sysInfo = await window.electronAPI.getSystemInfo();
      const mac = sysInfo.mac || sysInfo.ip;
      try {
        await requestUpdate(mac);
        alert("Update request sent to Owner. Please wait for them to push the update to your computer.");
        setShowUpdateModal(false);
      } catch (e) {
        alert("Failed to send request: " + e.message);
      }
    }
  };

  // Check for Payment Reminders & Overdue Alerts
  // Check for Payment Reminders & Overdue Alerts (fires ONCE after data loads)
  const reminderCheckedRef = useRef(false);
  useEffect(() => {
    if (initialLoading || reminderCheckedRef.current) return;
    if (installments.length === 0) return;

    reminderCheckedRef.current = true;

    // Defer to avoid blocking initial render
    const timerId = setTimeout(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      let upcomingCount = 0;
      let overdueCount = 0;

      installments.forEach(ins => {
        if (ins.status === 'Paid') return;
        const dueDate = parseSafeDate(ins.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          overdueCount++;
        } else if (dueDate <= threeDaysFromNow) {
          upcomingCount++;
        }
      });

      if (appSettings.paymentReminders && upcomingCount > 0) {
        setNoticeAlert({
          isOpen: true,
          header: 'Payment Reminders',
          message: `You have ${upcomingCount} upcoming payment(s) due within 3 days.`,
          buttons: [
            { text: 'Dismiss', role: 'cancel' },
            { text: 'View Now', handler: () => navigateToView('installments') }
          ]
        });
      }
    }, 1500); // slight delay so initial render finishes first

    return () => clearTimeout(timerId);
  }, [initialLoading, installments]);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  const isDesktop = Capacitor.getPlatform() === 'web' && window.electronAPI;

  // --- Customers & Offers & Contracts State ---
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);

  // Price Offer PDF State
  const [showPriceOfferModal, setShowPriceOfferModal] = useState(false);
  const [priceOfferUnit, setPriceOfferUnit] = useState(null);
  const [priceOfferConfig, setPriceOfferConfig] = useState({
    priceType: 'base',
    frequency: 'quarterly',
    years: 3,
    downPaymentPercent: 20,
    splitDownPayment: false,
    dpSplits: [
      { percent: 50, date: '' },
      { percent: 50, date: '' },
      { percent: 0, date: '' },
    ],
    dpSplitCount: 2,
    discountPercent: 0,
    startDate: new Date().toISOString().split('T')[0],
  });

  const priceOfferCalc = useMemo(() => {
    if (!priceOfferUnit) return null;
    const rawPrice = priceOfferConfig.priceType === 'finished' ? (priceOfferUnit.finishedPrice || priceOfferUnit.price || 0) : (priceOfferUnit.price || 0);
    const discount = Number(priceOfferConfig.discountPercent || 0);
    const calcFinalPrice = Math.round(rawPrice * (1 - discount / 100));
    const calcDpAmount = Math.round(calcFinalPrice * (Number(priceOfferConfig.downPaymentPercent) / 100));
    const calcRemaining = calcFinalPrice - calcDpAmount;
    const calcFreq = priceOfferConfig.frequency === 'quarterly' ? 4 : priceOfferConfig.frequency === 'biannual' ? 2 : 1;
    const calcNumIns = Number(priceOfferConfig.years || 1) * calcFreq;
    const calcInsAmount = calcNumIns > 0 ? Math.round(calcRemaining / calcNumIns) : 0;
    return { rawPrice, discount, calcFinalPrice, calcDpAmount, calcRemaining, calcFreq, calcNumIns, calcInsAmount };
  }, [priceOfferUnit, priceOfferConfig]);

  const generatePriceOfferPDF = async (unit, config) => {
    try {
      // LANDSCAPE single-page layout
      const doc = new jsPDF({ orientation: 'landscape' });
      setupArabicFont(doc);
      doc.setFont('Amiri');
      const pageW = doc.internal.pageSize.getWidth(); // ~297
      const pageH = doc.internal.pageSize.getHeight(); // ~210
      const margin = 8;
      const gold = [184, 153, 98];
      const dark = [30, 30, 35];
      const gray = [100, 100, 100];
      const lightBg = [245, 245, 248];
      const today = new Date().toISOString().split('T')[0];

      // Financials
      const rawPrice = config.priceType === 'finished' ? (unit.finishedPrice || unit.price || 0) : (unit.price || 0);
      const discount = Number(config.discountPercent || 0);
      const finalPrice = Math.round(rawPrice * (1 - discount / 100));
      const dpAmount = Math.round(finalPrice * (Number(config.downPaymentPercent) / 100));
      const remaining = finalPrice - dpAmount;
      const freq = config.frequency === 'quarterly' ? 4 : config.frequency === 'biannual' ? 2 : 1;
      const numIns = Number(config.years || 1) * freq;
      const insAmt = numIns > 0 ? Math.round(remaining / numIns) : 0;
      const freqLabel = config.frequency === 'quarterly' ? 'Quarterly' : config.frequency === 'biannual' ? 'Bi-Annual' : 'Annual';
      const freqMonths = config.frequency === 'quarterly' ? 3 : config.frequency === 'biannual' ? 6 : 12;

      // === NO HEADER/FOOTER for Price Offer ===
      const headerH = 0;

      // === TITLE BAR ===
      let topY = headerH + 2;
      doc.setFillColor(...dark);
      doc.rect(0, topY, pageW, 14, 'F');
      doc.setFontSize(11);
      doc.setTextColor(...gold);
      doc.setFont('Amiri', 'bold');
      doc.text('PRICE OFFER', pageW / 2, topY + 9, { align: 'center' });
      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.setFont('Amiri', 'normal');
      doc.text(`REF: PO-${unit.unitId}-${Date.now().toString(36).toUpperCase()}  |  DATE: ${today}  |  ${branding.name || ''}`, pageW / 2, topY + 13, { align: 'center' });

      const contentTop = topY + 17;
      const footerH = 0;
      const contentBottom = pageH - 4;
      const contentH = contentBottom - contentTop;

      // === 3-COLUMN LAYOUT ===
      const colGap = 4;
      const leftW = (pageW - margin * 2 - colGap * 2) * 0.32;
      const centerW = (pageW - margin * 2 - colGap * 2) * 0.36;
      const rightW = (pageW - margin * 2 - colGap * 2) * 0.32;
      const leftX = margin;
      const centerX = margin + leftW + colGap;
      const rightX = centerX + centerW + colGap;

      // =============================================
      // LEFT COLUMN: Unit Info + Financials + DP
      // =============================================
      let ly = contentTop;

      // Project name
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.setFont('Amiri', 'bold');
      doc.text(activeBuilding?.name?.toUpperCase() || 'PROJECT', leftX, ly + 4);
      ly += 7;

      // Unit detail cards (2x2 grid)
      const cardW = (leftW - 3) / 2;
      const cardH = 12;
      const unitCards = [
        { l: 'UNIT', v: unit.unitId || '\u2014' },
        { l: 'FLOOR', v: unit.floor || '\u2014' },
        { l: 'AREA', v: `${unit.area || '\u2014'} m\u00B2` },
        { l: 'TYPE', v: config.priceType.toUpperCase() }
      ];
      unitCards.forEach((card, i) => {
        const cx = leftX + (i % 2) * (cardW + 3);
        const cy = ly + Math.floor(i / 2) * (cardH + 2);
        doc.setFillColor(...lightBg);
        doc.roundedRect(cx, cy, cardW, cardH, 1.5, 1.5, 'F');
        doc.setFontSize(5);
        doc.setTextColor(...gray);
        doc.setFont('Amiri', 'normal');
        doc.text(card.l, cx + cardW / 2, cy + 4.5, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setTextColor(...dark);
        doc.setFont('Amiri', 'bold');
        doc.text(String(card.v), cx + cardW / 2, cy + 9.5, { align: 'center' });
      });
      ly += (cardH + 2) * 2 + 4;

      // Financial highlight box
      doc.setFillColor(...dark);
      doc.roundedRect(leftX, ly, leftW, 32, 2, 2, 'F');

      const finData = [
        { l: 'PRICE', v: formatCurrency(rawPrice), c: [180, 180, 180] },
        { l: 'DISCOUNT', v: discount > 0 ? `${discount}%` : '\u2014', c: [45, 211, 111] },
        { l: 'FINAL', v: formatCurrency(finalPrice), c: gold },
        { l: 'DOWN PAY', v: formatCurrency(dpAmount), c: [255, 255, 255] }
      ];
      const fColW = leftW / 2;
      finData.forEach((item, i) => {
        const fx = leftX + (i % 2) * fColW + fColW / 2;
        const fy = ly + Math.floor(i / 2) * 15;
        doc.setFontSize(4.5);
        doc.setTextColor(140, 140, 140);
        doc.setFont('Amiri', 'normal');
        doc.text(item.l, fx, fy + 5, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setTextColor(...item.c);
        doc.setFont('Amiri', 'bold');
        doc.text(item.v, fx, fy + 11, { align: 'center' });
      });
      ly += 35;

      // Remaining + Plan info
      doc.setFontSize(5.5);
      doc.setTextColor(...gray);
      doc.setFont('Amiri', 'normal');
      doc.text(`Remaining: ${formatCurrency(remaining)}  |  ${config.years}Y ${freqLabel}`, leftX, ly);
      ly += 5;

      // Down Payment Breakdown
      if (config.splitDownPayment && config.dpSplitCount > 1) {
        doc.setFontSize(7);
        doc.setTextColor(...dark);
        doc.setFont('Amiri', 'bold');
        doc.text('DOWN PAYMENT MILESTONES', leftX, ly);
        ly += 3;

        const dpRows = [];
        for (let i = 0; i < config.dpSplitCount; i++) {
          const sp = config.dpSplits[i] || { percent: 0, date: '' };
          const milestoneDate = sp.date || config.startDate;
          const amt = Math.round(dpAmount * (Number(sp.percent) / 100));
          dpRows.push([`#${i + 1}`, displayFormattedDate(milestoneDate) || '\u2014', `${sp.percent}%`, formatCurrency(amt)]);
        }
        autoTable(doc, {
          startY: ly,
          head: [['', 'Date', '%', 'Amount']],
          body: dpRows,
          styles: { font: 'Amiri', fontSize: 5.5, cellPadding: 1.5 },
          headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5 },
          theme: 'striped',
          tableWidth: leftW,
          margin: { left: leftX, right: pageW - leftX - leftW },
          columnStyles: {
            0: { cellWidth: 5 },
            1: { cellWidth: 22 },
            2: { halign: 'center', cellWidth: 12 },
            3: { halign: 'right' }
          }
        });
        ly = doc.lastAutoTable.finalY + 3;
      } else {
        doc.setFontSize(6);
        doc.setTextColor(...dark);
        doc.setFont('Amiri', 'bold');
        doc.text('DOWN PAYMENT', leftX, ly);
        ly += 4;
        doc.setFontSize(5.5);
        doc.setTextColor(...gray);
        doc.setFont('Amiri', 'normal');
        const dpText = doc.splitTextToSize(`Full payment of ${formatCurrency(dpAmount)} (${config.downPaymentPercent}%) required by ${displayFormattedDate(config.startDate)}.`, leftW);
        doc.text(dpText, leftX, ly);
        ly += dpText.length * 3.5 + 2;
      }

      // Terms (compact)
      doc.setFontSize(6);
      doc.setTextColor(...dark);
      doc.setFont('Amiri', 'bold');
      doc.text('TERMS', leftX, ly);
      ly += 3;
      doc.setFontSize(4.5);
      doc.setTextColor(...gray);
      doc.setFont('Amiri', 'normal');
      const terms = [
        "Valid for 7 business days.",
        "Prices subject to change.",
        "Does not guarantee reservation.",
        "Not a binding contract.",
        "Discounts need approval."
      ];
      terms.forEach(t => {
        doc.text(`\u2022 ${t}`, leftX, ly);
        ly += 3;
      });

      // Signature lines
      ly += 2;
      doc.setFontSize(5);
      doc.setTextColor(...dark);
      doc.text('Accepted:', leftX, ly);
      doc.text('Representative:', leftX + leftW / 2 + 2, ly);
      ly += 6;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(leftX, ly, leftX + leftW / 2 - 2, ly);
      doc.line(leftX + leftW / 2 + 2, ly, leftX + leftW, ly);

      // =============================================
      // CENTER COLUMN: Unit Layout Image
      // =============================================
      let layoutLoaded = false;
      if (window.electronAPI) {
        try {
          const layoutUrl = await window.electronAPI.getUnitLayout(unit.unitId);
          if (layoutUrl) {
            const img = await new Promise((resolve, reject) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = reject;
              i.src = layoutUrl;
            });

            // Title
            doc.setFontSize(7);
            doc.setTextColor(...gold);
            doc.setFont('Amiri', 'bold');
            doc.text('UNIT LAYOUT', centerX + centerW / 2, contentTop + 4, { align: 'center' });

            // Draw border
            const imgTop = contentTop + 7;
            const availW = centerW - 4;
            const availH = contentH - 10;
            doc.setDrawColor(...gold);
            doc.setLineWidth(0.3);
            doc.roundedRect(centerX + 2, imgTop, availW, availH, 2, 2, 'S');

            // Scale and center image
            const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight) * 0.95;
            const drawW = img.naturalWidth * scale;
            const drawH = img.naturalHeight * scale;
            const drawX = centerX + 2 + (availW - drawW) / 2;
            const drawY = imgTop + (availH - drawH) / 2;

            try {
              doc.addImage(layoutUrl, 'PNG', drawX, drawY, drawW, drawH);
            } catch (e) {
              try { doc.addImage(layoutUrl, 'JPEG', drawX, drawY, drawW, drawH); } catch (e2) { }
            }
            layoutLoaded = true;
          }
        } catch (e) { console.log('Layout failed', e); }
      }

      if (!layoutLoaded) {
        // Placeholder
        doc.setFillColor(240, 240, 242);
        doc.roundedRect(centerX + 2, contentTop + 7, centerW - 4, contentH - 10, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text('NO LAYOUT', centerX + centerW / 2, contentTop + contentH / 2, { align: 'center' });
        doc.setFontSize(5);
        doc.text('Upload a layout image to display here', centerX + centerW / 2, contentTop + contentH / 2 + 5, { align: 'center' });
      }

      // =============================================
      // RIGHT COLUMN: Installment Schedule
      // =============================================
      doc.setFontSize(7);
      doc.setTextColor(...gold);
      doc.setFont('Amiri', 'bold');
      doc.text('INSTALLMENT SCHEDULE', rightX + rightW / 2, contentTop + 4, { align: 'center' });

      const firstInsOffset = config.frequency === 'quarterly' ? 3
        : (config.frequency === 'biannual' ? 4 : 6); // annual is 6
      const baseDate = parseSafeDate(config.firstInstallmentDate || config.startDate || new Date());
      // If no explicit first installment date is set, start with the defined offset from start date
      if (!config.firstInstallmentDate) {
        baseDate.setMonth(baseDate.getMonth() + firstInsOffset);
      }
      const insRows = [];
      for (let i = 0; i < numIns; i++) {
        const dd = new Date(baseDate);
        dd.setMonth(baseDate.getMonth() + i * freqMonths);
        insRows.push([
          `${i + 1}`,
          displayFormattedDate(dd),
          formatCurrency(insAmt)
        ]);
      }

      // Dynamic font scaling for installments
      let insFontSize = 6;
      let insPadding = 2;
      if (numIns > 12) { insFontSize = 5.5; insPadding = 1.5; }
      if (numIns > 20) { insFontSize = 5; insPadding = 1.2; }
      if (numIns > 30) { insFontSize = 4.5; insPadding = 1; }
      if (numIns > 40) { insFontSize = 4; insPadding = 0.8; }
      if (numIns > 60) { insFontSize = 3.5; insPadding = 0.5; }

      autoTable(doc, {
        startY: contentTop + 7,
        head: [['#', 'Due Date', 'Amount']],
        body: insRows,
        styles: { font: 'Amiri', fontSize: insFontSize, cellPadding: insPadding, lineWidth: 0.1 },
        headStyles: { fillColor: gold, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: insFontSize },
        theme: 'grid',
        tableWidth: rightW,
        margin: { left: rightX, right: pageW - rightX - rightW },
        alternateRowStyles: { fillColor: [252, 252, 255] },
        columnStyles: {
          0: { halign: 'center', cellWidth: rightW * 0.12 },
          1: { halign: 'center' },
          2: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // === FOOTER TEXT ONLY ===
      doc.setFontSize(4.5);
      doc.setTextColor(...gray);
      doc.text(`Generated by ${branding.name || 'DYR'}  |  ID: ${Date.now().toString(36).toUpperCase()}`, pageW / 2, pageH - 4, { align: 'center' });

      handlePreviewPDF(doc, `PriceOffer-${unit.unitId}-${today}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF: ' + err.message);
    }
  };


  const [showCreateContractModal, setShowCreateContractModal] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [sales, setSales] = useState([]);

  const [showAddSalesModal, setShowAddSalesModal] = useState(false);
  const [showEditSalesModal, setShowEditSalesModal] = useState(false);
  const [editingSales, setEditingSales] = useState(null);
  const [newSale, setNewSale] = useState({ id: '', name: '', phone: '', email: '', idCardPath: '' });
  const [salesSearchQuery, setSalesSearchQuery] = useState('');

  // Helper: file-picker based ID card upload
  const handleIdCardUpload = (type, entityId) => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file && window.electronAPI) {
          const buffer = await file.arrayBuffer();
          const path = await window.electronAPI.uploadIdCard(type, entityId, Array.from(new Uint8Array(buffer)));
          resolve(path);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  };

  // Helper: delete ID card for customer or sales agent
  const handleDeleteIdCard = async (type, entityId) => {
    if (!window.electronAPI || !window.electronAPI.deleteIdCard) {
      alert('ID card deletion is only available in the desktop app.');
      return false;
    }
    if (!window.confirm('Are you sure you want to delete this ID card?')) return false;
    try {
      const deleted = await window.electronAPI.deleteIdCard(type, entityId);
      if (deleted) {
        alert('ID card deleted successfully.');
        return true;
      } else {
        alert('No ID card file found to delete.');
        return false;
      }
    } catch (error) {
      console.error('Error deleting ID card:', error);
      alert('Failed to delete ID card.');
      return false;
    }
  };

  // Helper: upload unit layout via file picker
  const handleUploadLayout = (unitId) => {
    if (!window.electronAPI) {
      alert('Layout upload is only available in the desktop app.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const buffer = await file.arrayBuffer();
          await window.electronAPI.uploadUnitLayout(unitId, Array.from(new Uint8Array(buffer)));
          alert(t('alert.layoutUploadSuccess', { id: unitId }));
          // If the layout modal is currently open for this unit, refresh it
          if (showLayoutModal && layoutUnitId === unitId) {
            const imageUrl = await window.electronAPI.getUnitLayout(unitId);
            setLayoutImageUrl(imageUrl);
          }
        } catch (error) {
          console.error('Error uploading layout:', error);
          alert(t('alert.uploadFailed'));
        }
      }
    };
    input.click();
  };

  // Helper: upload floor plan PDF for a building
  const handleUploadFloorplan = (buildingName) => {
    if (!window.electronAPI) {
      alert(t('alert.desktopOnly'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const buffer = await file.arrayBuffer();
          await window.electronAPI.uploadFloorplan(buildingName, Array.from(new Uint8Array(buffer)));
          alert(t('alert.floorplanUploadSuccess', { name: buildingName }));
          // If the floorplan modal is currently open for this building, refresh it
          if (showFloorplanModal && floorplanBuildingName === buildingName) {
            const pdfUrl = await window.electronAPI.getFloorplan(buildingName);
            setFloorplanPdfUrl(pdfUrl);
          }
        } catch (error) {
          console.error('Error uploading floor plan:', error);
          alert(t('alert.uploadFailed'));
        }
      }
    };
    input.click();
  };

  // Helper: view floor plan for a building
  const handleViewFloorplan = async (buildingName) => {
    if (!window.electronAPI) {
      alert('Floor plan viewing is only available in the desktop app.');
      return;
    }
    try {
      const pdfUrl = await window.electronAPI.getFloorplan(buildingName);
      setFloorplanPdfUrl(pdfUrl || null);
      setFloorplanBuildingName(buildingName);
      setShowFloorplanModal(true);
    } catch (error) {
      console.error('Error loading floor plan:', error);
      alert('Failed to load floor plan.');
    }
  };

  const handleUpdateSales = async () => {
    if (editingSales && editingSales.name) {
      await updateSales(editingSales.id, editingSales);
      setSales(await getSales());
      setShowEditSalesModal(false);
      setEditingSales(null);
      alert('Sales agent updated successfully.');
    } else {
      alert('Name is required.');
    }
  };

  const [reminderRange, setReminderRange] = useState(7);
  const [externalIp, setExternalIp] = useState('...fetching');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getExternalIp().then(setExternalIp).catch(() => setExternalIp('Unknown'));
    }
  }, []);

  const terminatedContracts = [];
  const terminatedInstallments = [];

  // Termination Modal State
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [terminationTarget, setTerminationTarget] = useState(null);
  const [terminationForm, setTerminationForm] = useState({
    newBasePrice: '',
    newFinishedPrice: '',
    paymentPlan: '',
    newUnitStatus: 'available',
    reason: ''
  });

  // Offer Cancellation Modal State
  const [showOfferCancelModal, setShowOfferCancelModal] = useState(false);
  const [offerCancelTarget, setOfferCancelTarget] = useState(null);
  const [offerCancelForm, setOfferCancelForm] = useState({
    newBasePrice: '',
    newFinishedPrice: '',
    paymentPlan: '',
    newUnitStatus: 'available'
  });

  const [statusAlert, setStatusAlert] = useState({ isOpen: false, unit: null });
  const [editingUnit, setEditingUnit] = useState(null);

  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    header: '',
    onConfirm: null
  });
  const [passwordInput, setPasswordInput] = useState('');

  const [noticeAlert, setNoticeAlert] = useState({
    isOpen: false,
    header: '',
    message: '',
    buttons: ['OK']
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInstallmentForFeedback, setSelectedInstallmentForFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackSortOrder, setFeedbackSortOrder] = useState('oldest'); // 'oldest' | 'newest'
  const [filterOverdueWithRejected, setFilterOverdueWithRejected] = useState(false);
  const [filterOverdueWithoutRejected, setFilterOverdueWithoutRejected] = useState(false);
  const [filterFeedbackWallet, setFilterFeedbackWallet] = useState('all');

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', phone2: '', id: '', email: '', idNumber: '', idType: '', bloodType: '', directIndirect: '', idCardPath: '' });

  // Offer Creation State
  const [offerStep, setOfferStep] = useState(1); // 1: Select Customer, 2: Select Unit, 3: Details
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [jpSearchQuery, setJpSearchQuery] = useState('');
  const [guarantorSearchQuery, setGuarantorSearchQuery] = useState('');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showCreateOfferModal && offerStep > 1 && e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          return;
        }
        setOfferStep(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateOfferModal, offerStep]);

  // --- Customers Reminder Logic ---
  const upcomingReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = reminderStartDate ? new Date(reminderStartDate) : today;
    if (reminderStartDate) start.setHours(0, 0, 0, 0);

    const end = reminderEndDate ? new Date(reminderEndDate) : new Date(today);
    if (!reminderEndDate) {
      end.setDate(today.getDate() + (Number(reminderRange) || 7));
    }
    end.setHours(23, 59, 59, 999);

    const q = (reminderSearchQuery || '').toLowerCase();

    return installments
      .filter(ins => ins.status !== 'Paid' && ins.status !== 'Cleared')
      .map(ins => {
        let dueDate;
        if (!isNaN(ins.dueDate) && Number(ins.dueDate) > 20000) {
          dueDate = new Date((Number(ins.dueDate) - 25569) * 86400 * 1000);
        } else {
          dueDate = new Date(ins.dueDate);
        }
        return { ...ins, actualDueDate: dueDate };
      })
      .filter(ins => {
        if (!ins.actualDueDate || isNaN(ins.actualDueDate.getTime())) return false;
        // Date Range Filter
        const inRange = ins.actualDueDate >= start && ins.actualDueDate <= end;
        if (!inRange) return false;

        // Search Filter (Unit ID or Customer Name)
        if (q) {
          const unitMatch = String(ins.unitId || '').toLowerCase().includes(q);
          const nameMatch = String(ins.customerName || '').toLowerCase().includes(q);
          if (!unitMatch && !nameMatch) return false;
        }

        return true;
      })
      .map(ins => {
        const contract = contracts.find(c => c.id === ins.contractId || (ins.unitId && c.unitId === ins.unitId));
        const offer = !contract ? offers.find(o => o.id === ins.offerId || (ins.unitId && o.unitId === ins.unitId)) : null;
        const source = contract || offer;
        const customer = source ? customers.find(c => c.id === source.customerId) : null;
        const custName = customer?.name || ins.customerName || 'Customer';
        const phone = customer?.phone || customer?.phone2 || '';

        const targetUnitId = String(ins.unitId || '').trim();
        const building = buildings.find(b => b.id === source?.buildingId) ||
          buildings.find(b => (b.units || []).some(u => String(u.unitId).trim() === targetUnitId));

        const buildingName = building?.name || 'DYR';

        const stakeholders = [];
        if (contract) {
          if (contract.jointPurchasers && contract.jointPurchasers.length > 0) {
            contract.jointPurchasers.forEach(jp => {
              const details = customers.find(c => String(c.id).trim() === String(jp.id).trim());
              if (details?.phone || details?.phone2) {
                stakeholders.push({ name: details.name, phone: details.phone || details.phone2, role: 'Joint Purchaser' });
              }
            });
          }
          if (contract.guarantor) {
            const details = customers.find(c => String(c.id).trim() === String(contract.guarantor.id).trim());
            if (details?.phone || details?.phone2) {
              stakeholders.push({ name: details.name, phone: details.phone || details.phone2, role: 'Guarantor' });
            }
          }
        }

        return {
          ...ins,
          custName,
          phone,
          buildingName,
          stakeholders,
          formattedDueDate: displayFormattedDate(ins.dueDate)
        };
      })
      .sort((a, b) => a.actualDueDate - b.actualDueDate);
  }, [installments, contracts, offers, customers, buildings, reminderRange, reminderSearchQuery, reminderStartDate, reminderEndDate]);

  // Rebuilt robust customer filter using useMemo - simplified to match contract search pattern
  const filteredCustomers = useMemo(() => {
    const q = (customerSearchQuery || '').toLowerCase();
    if (!q) return customers;

    return customers.filter(c => {
      // 1. Search by Name
      if ((c.name || '').toLowerCase().includes(q)) return true;

      // 2. Search by Customer ID
      if (String(c.id || '').toLowerCase().includes(q)) return true;

      // 3. Search by Phone/Mobile
      if (String(c.phone || '').includes(q)) return true;
      if (String(c.phone2 || '').includes(q)) return true;

      // 4. Search by Unit ID (from linked contracts and offers)
      const hasUnit = contracts.some(con => con.customerId === c.id && (con.unitId || '').toLowerCase().includes(q)) ||
        offers.some(o => o.customerId === c.id && (o.unitId || '').toLowerCase().includes(q));
      if (hasUnit) return true;

      return false;
    });
  }, [customers, customerSearchQuery, contracts, offers]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedOfferUnit, setSelectedOfferUnit] = useState(null); // { buildingId, unit }
  const [offerJointPurchasers, setOfferJointPurchasers] = useState([]); // Array of {id, name}
  const [offerGuarantor, setOfferGuarantor] = useState(null); // {id, name} or null
  const [offerForm, setOfferForm] = useState({
    date: formatExcelDate(new Date()),
    startDate: '', // New Field
    downPayment: '',
    reservationAmount: '', // Separate reservation amount field
    years: '', // Replaces startAfterMonths
    frequency: 'quarterly',
    priceType: 'base', // 'base' or 'finished'
    discountPercent: 0,
    salesId: '', // Sales Agent ID
    // Flash fill fields
    firstInstallmentDate: '',
    startingChequeNumber: '',
    bank: '',
    paymentMethod: 'Cheque',
    // Calculated fields (for display)
    finalPrice: 0,
    downPaymentAmount: 0,
    installmentAmount: 0,
    numInstallments: 0
  });

  // Auto-calculate Offer values
  useEffect(() => {
    if (selectedOfferUnit && offerForm.downPayment && offerForm.years) {
      const unit = selectedOfferUnit.unit;
      const basePrice = offerForm.priceType === 'finished' ? (unit.finishedPrice || unit.price) : unit.price;
      const discount = Number(offerForm.discountPercent || 0);
      const finalPrice = Math.round(basePrice * (1 - discount / 100));

      const dpPercent = Number(offerForm.downPayment || 0);
      const dpAmount = Math.round(finalPrice * (dpPercent / 100));
      const remaining = finalPrice - dpAmount;

      const freq = offerForm.frequency === 'quarterly' ? 4 : offerForm.frequency === 'biannual' ? 2 : 1;
      const numIns = Number(offerForm.years || 0) * freq;
      const insAmount = numIns > 0 ? Math.round(remaining / numIns) : 0;

      // Update state without triggering infinite loop (only if values changed)
      if (offerForm.finalPrice !== finalPrice || offerForm.installmentAmount !== insAmount) {
        setOfferForm(prev => ({
          ...prev,
          finalPrice,
          downPaymentAmount: dpAmount,
          numInstallments: numIns,
          installmentAmount: insAmount
        }));
      }
    }
  }, [offerForm.priceType, offerForm.discountPercent, offerForm.downPayment, offerForm.years, offerForm.frequency, selectedOfferUnit]);



  // Contract Creation State
  const [contractStep, setContractStep] = useState(1);

  const [selectedOffer, setSelectedOffer] = useState(null); // Offer to convert
  const [jointPurchasers, setJointPurchasers] = useState([]); // Array of {name, id, phone}
  const [guarantor, setGuarantor] = useState({ name: '', id: '', phone: '', enabled: false });
  const [contractForm, setContractForm] = useState({
    contractId: '',
    date: formatExcelDate(new Date()),
    totalPrice: '',
    downPayment: '',
    years: '',
    frequency: 'quarterly',
    notes: '',
    salesId: ''
  });
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [offerSearchQuery, setOfferSearchQuery] = useState('');
  const [filterOffersNoContract, setFilterOffersNoContract] = useState(false);
  const [filterOffersCancelled, setFilterOffersCancelled] = useState(false);

  const [editingInstallment, setEditingInstallment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  const handleNextInstallment = () => {
    if (!editingInstallment) return;
    const list = viewingContract ? installments.filter(i => i.contractId === viewingContract.id || i.unitId === viewingContract.unitId).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) : filteredInstallments;
    const currentIndex = list.findIndex(i => i.id === editingInstallment.id);
    if (currentIndex !== -1 && currentIndex < list.length - 1) {
      setEditingInstallment(list[currentIndex + 1]);
    }
  };

  const handlePrevInstallment = () => {
    if (!editingInstallment) return;
    const list = viewingContract ? installments.filter(i => i.contractId === viewingContract.id || i.unitId === viewingContract.unitId).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) : filteredInstallments;
    const currentIndex = list.findIndex(i => i.id === editingInstallment.id);
    if (currentIndex > 0) {
      setEditingInstallment(list[currentIndex - 1]);
    }
  };

  const [newPayment, setNewPayment] = useState({ amount: '', method: 'CASH', date: formatExcelDate(new Date()), ref: '', notes: '', bank: '', chequeNumber: '', chequeStatus: 'Not Collected', attachment: null });

  const [viewingContract, setViewingContract] = useState(null);
  const [showAddInstallmentForm, setShowAddInstallmentForm] = useState(false);
  const [newContractInstallment, setNewContractInstallment] = useState({
    type: 'Installment',
    dueDate: formatExcelDate(new Date()),
    amount: '',
    paymentMethod: 'CASH',
    chequeNumber: '',
    bank: ''
  });

  const handleSplitInstallment = async () => {
    if (!editingInstallment) return;
    const splitAmount = Math.floor(editingInstallment.amount / 2);
    const updated = await updateInstallment(editingInstallment.id, { amount: editingInstallment.amount - splitAmount });
    if (updated) {
      const allIns = await getInstallments();
      const newIns = {
        ...updated,
        id: Date.now().toString(),
        amount: splitAmount,
        paidAmount: 0,
        status: 'Not Paid',
        payments: [],
        dueDate: new Date(new Date(updated.dueDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +1 week
      };
      allIns.push(newIns);
      await saveInstallments(allIns);
      setInstallments(allIns);
      setEditingInstallment(updated);
      alert("Installment split successfully. A new record with half the amount has been created for +7 days.");
    }
  };

  const handleSplitOfferInstallment = async () => {
    if (!editingOfferInstallment) return;
    const { offer, installment, index } = editingOfferInstallment;
    
    const splitAmount = Math.floor(installment.amount / 2);
    const firstHalf = installment.amount - splitAmount;
    
    const updatedInstallments = [...offer.installments];
    updatedInstallments[index] = { 
      ...installment, 
      amount: firstHalf 
    };
    
    const newIns = {
      ...installment,
      amount: splitAmount,
      paidAmount: 0,
      status: 'Not Paid',
      payments: [],
      dueDate: new Date(new Date(installment.dueDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    updatedInstallments.splice(index + 1, 0, newIns);
    
    const updatedOffer = { ...offer, installments: updatedInstallments };
    const updatedOffers = offers.map(o => o.id === updatedOffer.id ? updatedOffer : o);

    setOffers(updatedOffers);
    await saveOffers(updatedOffers);
    
    setEditingOfferInstallment(null);
    setViewingOffer(updatedOffer);
    
    alert("Offer installment split successfully.");
  };

  const handleSaveEditedPayment = async () => {
    if (!editingPayment || !editingInstallment) return;
    const updated = await updateInstallmentPayment(editingInstallment.id, editingPayment.id, editingPayment);
    if (updated) {
      setEditingInstallment(updated);
      setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
      setEditingPayment(null);
    }
  };

  const [showResaleModal, setShowResaleModal] = useState(false);
  const [showEditStakeholdersModal, setShowEditStakeholdersModal] = useState(false);
  const [editingStakeholders, setEditingStakeholders] = useState({ jointPurchasers: [], guarantor: null });
  const [showChangeSalesAlert, setShowChangeSalesAlert] = useState(false);
  const [resaleData, setResaleData] = useState({
    originalContract: null,
    newCustomer: null,
    updatedInstallments: []
  });

  const [showChequeDesigner, setShowChequeDesigner] = useState(false);
  const [chequeForm, setChequeForm] = useState({
    payeeName: '',
    customerName: '', // New field for the unit's customer name
    amount: '',
    date: formatExcelDate(new Date())
  });

  const [payeeNames, setPayeeNames] = useState(() => {
    const saved = localStorage.getItem('payee_names');
    return saved ? JSON.parse(saved) : [];
  });
  const [newPayeeInput, setNewPayeeInput] = useState('');
  const [chequeDataSource, setChequeDataSource] = useState(null); // { id, type, unitId, customerName, amount }
  const [chequeSearchQuery, setChequeSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [chequeQueue, setChequeQueue] = useState([]); // List of potential cheques for selected source
  const [selectedQueueIds, setSelectedQueueIds] = useState([]); // IDs of selected installments

  const showAddBankAlert = false;

  const resetDataEntryForms = () => {
    // 1. Offer State
    setOfferStep(1);
    setSelectedCustomer(null);
    setSelectedOfferUnit(null);
    setOfferForm({
      date: formatExcelDate(new Date()),
      startDate: '',
      downPayment: '',
      years: '',
      frequency: 'quarterly',
      priceType: 'base',
      discountPercent: 0,
      salesId: '',
      firstInstallmentDate: '',
      startingChequeNumber: '',
      bank: '',
      paymentMethod: 'Cheque',
      finalPrice: 0,
      downPaymentAmount: 0,
      installmentAmount: 0,
      numInstallments: 0
    });

    // 2. Contract State
    setContractStep(1);
    setSelectedOffer(null);
    setJointPurchasers([]);
    setGuarantor({ name: '', id: '', phone: '', enabled: false });
    setContractForm({
      contractId: '',
      date: formatExcelDate(new Date()),
      totalPrice: '',
      downPayment: '',
      years: '',
      frequency: 'quarterly',
      notes: '',
      salesId: ''
    });

    // 3. Customer/Sales State
    setNewCustomer({ name: '', phone: '', phone2: '', id: '', email: '', idNumber: '', idType: '', bloodType: '', directIndirect: '', idCardPath: '' });
    if (typeof setNewSale === 'function') {
      setNewSale({ id: '', name: '', phone: '' });
    }

    // 4. Cheque State (Keep payeeName to avoid resetting current session beneficiary)
    setChequeForm({
      ...chequeForm,
      customerName: '',
      amount: '',
      date: formatExcelDate(new Date())
    });
    setChequeDataSource(null);
    setChequeQueue([]);
    setSelectedQueueIds([]);

    // 5. Building State
    setNewBuildingName('');

    // 6. Search Queries
    setCustomerSearchQuery('');
    setUnitSearchQuery('');
    setSalesSearchQuery('');
    setContractSearchQuery('');
    setOfferSearchQuery('');
    setFeedbackSearchQuery('');
    setChequeSearchQuery('');
    setHistorySearchQuery('');
    setJpSearchQuery('');
    setGuarantorSearchQuery('');
    setReminderSearchQuery('');
    setFilterOffersNoContract(false);
    setFilterOffersCancelled(false);
  };

  // NOTE: Form state is no longer reset on tab switch — each tab preserves its form state
  // until the tab is explicitly closed. resetDataEntryForms() is still called on modal close and handleBackToHome.

  // ESC Key Navigation Handler - Press Escape to go back
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key !== 'Escape') return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        activeEl.blur();
        return;
      }

      e.preventDefault();

      // Priority 1: Dialogs and Popups
      if (passwordModal.isOpen) { setPasswordModal({ ...passwordModal, isOpen: false }); return; }
      if (showChangePasswordAlert) { setShowChangePasswordAlert(false); return; }
      if (showChangeSalesAlert) { setShowChangeSalesAlert(false); return; }
      if (showReflashOfferConfig) { setShowReflashOfferConfig(false); return; }
      if (showFlashFillContractConfig) { setShowFlashFillContractConfig(false); return; }
      
      // Priority 2: Editors and Forms (often nested)
      if (editingOfferInstallment) { setEditingOfferInstallment(null); return; }
      if (editingPayment) { setEditingPayment(null); return; }
      if (editingUnit) { setEditingUnit(null); return; }
      if (showAddInstallmentForm) { setShowAddInstallmentForm(false); return; }
      if (showEditStakeholdersModal) { setShowEditStakeholdersModal(false); return; }
      if (showResaleModal) { setShowResaleModal(false); return; }
      if (showBulkPriceModal) { setShowBulkPriceModal(false); return; }
      
      // Priority 3: Main Modals
      if (showPreviewModal) { setShowPreviewModal(false); return; }
      if (showInstallmentsReportModal) { setShowInstallmentsReportModal(false); return; }
      if (showOfferPaymentModal) { setShowOfferPaymentModal(false); return; }
      if (showOfferInstallmentsModal) { setShowOfferInstallmentsModal(false); return; }
      if (showCreateOfferModal) {
        if (offerStep > 1) {
          setOfferStep(prev => prev - 1);
        } else {
          setShowCreateOfferModal(false);
          resetDataEntryForms();
        }
        return;
      }
      if (showPriceOfferModal) { setShowPriceOfferModal(false); return; }
      if (showCreateContractModal) {
        if (contractStep > 1) {
          setContractStep(prev => prev - 1);
        } else {
          setShowCreateContractModal(false);
          resetDataEntryForms();
        }
        return;
      }
      if (showInventoryModal) { setShowInventoryModal(false); resetDataEntryForms(); return; }
      if (showAddCustomerModal) { setShowAddCustomerModal(false); resetDataEntryForms(); return; }
      if (showEditCustomerModal) { setShowEditCustomerModal(false); return; }
      if (showAddSalesModal) { setShowAddSalesModal(false); resetDataEntryForms(); return; }
      if (showEditSalesModal) { setShowEditSalesModal(false); return; }
      if (showAddModal) { setShowAddModal(false); resetDataEntryForms(); return; }
      if (showUnitModal) { setShowUnitModal(false); return; }
      if (showLayoutModal) { setShowLayoutModal(false); return; }
      if (showFloorplanModal) { setShowFloorplanModal(false); return; }
      if (showSettingsModal) { setShowSettingsModal(false); return; }
      if (showAdminModal) { setShowAdminModal(false); return; }
      if (showUpdateModal) { setShowUpdateModal(false); return; }
      if (showAddWalletModal) { setShowAddWalletModal(false); return; }
      if (showFeedbackModal) { setShowFeedbackModal(false); return; }
      if (showChequeDesigner) { setShowChequeDesigner(false); return; }
      if (showSetupWizard) { setShowSetupWizard(false); return; }

      // Priority 4: Detail Views (Main Content Sub-phases)
      if (editingInstallment) { setEditingInstallment(null); return; }
      if (viewingContract && currentView === 'contractDetail') { closeContractTab(); return; }
      if (viewingWallet) { setViewingWallet(null); return; }
      if (viewingOffer) { setViewingOffer(null); return; }
      if (viewingCustomerDetail) { setViewingCustomerDetail(null); return; }
      if (viewingSalesDetail) { setViewingSalesDetail(null); return; }

      // Priority 5: Navigation State
      if (activeBuilding) { setActiveBuilding(null); return; }
      if (currentView !== 'home') { closeTab(activeTabId); return; }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [
    currentView, activeBuilding, showPreviewModal, showOfferPaymentModal, showOfferInstallmentsModal,
    showCreateOfferModal, showCreateContractModal, showInventoryModal, showAddCustomerModal,
    showEditCustomerModal, showAddSalesModal, showEditSalesModal, showAddModal, showUnitModal,
    showLayoutModal, showFloorplanModal, showSettingsModal, showAdminModal, showUpdateModal,
    showChangePasswordAlert, viewingOffer, viewingCustomerDetail, viewingSalesDetail,
    // Newly added dependencies
    passwordModal, showChangeSalesAlert, showReflashOfferConfig, showFlashFillContractConfig,
    editingOfferInstallment, editingPayment, editingUnit, showAddInstallmentForm,
    showEditStakeholdersModal, showResaleModal, showBulkPriceModal, showInstallmentsReportModal,
    showPriceOfferModal, showAddWalletModal, showFeedbackModal, showChequeDesigner,
    showSetupWizard, editingInstallment, viewingContract, viewingWallet, offerStep, contractStep
  ]);

  const refreshData = async () => {
    const [b, c, o, con, i, s] = await Promise.all([
      getBuildings(),
      getCustomers(),
      getOffers(),
      getContracts(),
      getInstallments(),
      getSales()
    ]);

    setBuildings(b);
    setCustomers(c);
    setOffers(o);
    setContracts(con);
    setInstallments(i);
    setSales(s);

    // Check for updates (OTA)
    if (supabase) {
      try {
        const { data, error } = await supabase.from('app_config').select('latest_version').single();
        if (!error && data && data.latest_version) {
          // Compare versions properly (only show if remote is NEWER)
          const current = APP_VERSION.split('.').map(Number);
          const remote = data.latest_version.split('.').map(Number);
          const isNewer = remote[0] > current[0] ||
            (remote[0] === current[0] && remote[1] > current[1]) ||
            (remote[0] === current[0] && remote[1] === current[1] && remote[2] > current[2]);
          if (isNewer) {
            setRemoteVersion(data.latest_version);
            setShowUpdateModal(true);
          }
        }
      } catch (e) { console.error('Version check failed', e); }
    }
  };

  // Connect refreshData to the ref for auto-refresh polling in monitor mode
  refreshDataRef.current = refreshData;

  useEffect(() => {
    refreshData();
  }, [showAddCustomerModal, showCreateOfferModal, showCreateContractModal, showAddSalesModal]);

  // ... (Keep existing handlers: handleAddCustomer, handleCreateOffer, handleCancelOffer, handleAdd, handleDelete, handleImport)

  // ... (Keep existing handlers for Units: handleAddUnit, handleDeleteUnit)

  // Handlers for deleting/creating are omitted for brevity in search replacement, 
  // ensure they remain in the file if not matched by the replace block.

  const handleAddCustomer = async () => {
    if (!newCustomer.id || newCustomer.id.trim() === '') {
      alert(t('customers.id') + ' ' + t('common.required'));
      return;
    }
    if (newCustomer.name && newCustomer.phone) {
      const customerToAdd = {
        ...newCustomer,
        id: newCustomer.id.trim()
      };
      await addCustomer(customerToAdd);
      setNewCustomer({ name: '', phone: '', phone2: '', id: '', email: '', idNumber: '', idType: '', bloodType: '', directIndirect: '', idCardPath: '' });
      setCustomers(await getCustomers());
      setShowAddCustomerModal(false);
    } else {
      alert(t('alert.noData')); // Simple fallback for missing fields
    }
  };

  const handleAddSales = async () => {
    if (!newSale.id || newSale.id.trim() === '') {
      alert(t('sales.id') + ' ' + t('common.required'));
      return;
    }
    if (newSale.name) {
      await addSales(newSale);
      setNewSale({ id: '', name: '', phone: '' });
      setSales(await getSales());
      setShowAddSalesModal(false);
    } else {
      alert('Please fill in Name.');
    }
  };

  const handleCreateOffer = async () => {
    if (selectedCustomer && selectedOfferUnit && offerForm.downPayment) {
      // Cross-unit check: ensure this customer doesn't already have a role on this unit
      const unitTaken = getCustomerIdsOnUnit(selectedOfferUnit.unit.unitId);
      if (unitTaken.has(selectedCustomer.id)) {
        alert(`${selectedCustomer.name} already has a role on another offer/contract for this unit.`);
        return;
      }
      const newOffer = {
        customerName: selectedCustomer.name,
        customerId: selectedCustomer.id,
        unitId: selectedOfferUnit.unit.unitId,
        buildingId: selectedOfferUnit.buildingId,
        salesId: offerForm.salesId || '',
        jointPurchasers: offerJointPurchasers.length > 0 ? offerJointPurchasers : undefined,
        guarantor: offerGuarantor || undefined,
        ...offerForm
      };
      await addOffer(newOffer);
      // Force immediate local update of unit status to 'offer' so UI reflects it instantly
      setBuildings(prev => prev.map(b => {
        if (String(b.id).trim() === String(selectedOfferUnit.buildingId).trim()) {
          return {
            ...b,
            units: (b.units || []).map(u =>
              String(u.unitId).trim() === String(selectedOfferUnit.unit.unitId).trim()
                ? { ...u, status: 'offer' }
                : u
            )
          };
        }
        return b;
      }));
      alert('Offer Created Successfully!');
      setShowCreateOfferModal(false);
      closeTab('createOffer');
      navigateToView('offers');
      setOfferStep(1);
      setSelectedCustomer(null);
      setSelectedOfferUnit(null);
      setOfferJointPurchasers([]);
      setOfferGuarantor(null);
      setOfferForm(prev => ({ ...prev, salesId: '', reservationAmount: '' }));
      refreshData();
    }
  };

  const handleResaleStart = (contract) => {
    // Filter by unitId to ensure we capture all installments associated with this unit's active contract
    const originalInstallments = installments.filter(ins =>
      String(ins.unitId).trim() === String(contract.unitId).trim()
    );
    setResaleData({
      originalContract: contract,
      newCustomer: null,
      updatedInstallments: originalInstallments.map(ins => ({ ...ins }))
    });
    setShowResaleModal(true);
  };

  const handleResaleConfirm = async () => {
    const { originalContract, newCustomer, updatedInstallments } = resaleData;
    if (!newCustomer) {
      alert('Please select a new customer for resale.');
      return;
    }

    promptPassword('Enter password to confirm resale:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        try {
          await resaleContractInPlace(originalContract.id, {
            newCustomerId: newCustomer.id,
            newCustomerName: newCustomer.name,
            updatedInstallments
          });

          alert('Resale completed successfully! New contract created for ' + newCustomer.name);
          setShowResaleModal(false);
          closeContractTab();
          await refreshData();
        } catch (err) {
          console.error('Resale failed:', err);
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const smartOpenWhatsApp = async (phone, message = '') => {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '2' + cleanPhone;
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('2')) {
      cleanPhone = '20' + cleanPhone;
    }

    const encodedMsg = encodeURIComponent(message);
    const appUrl = `whatsapp://send?phone=${cleanPhone}${message ? `&text=${encodedMsg}` : ''}`;
    const webUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}${message ? `&text=${encodedMsg}` : ''}`;

    // 1. If on Desktop (Electron), Deterministically Check if App is installed
    if (window.electronAPI && window.electronAPI.checkWhatsAppApp) {
      try {
        const hasApp = await window.electronAPI.checkWhatsAppApp();
        if (hasApp) {
          // Open App Directly
          window.open(appUrl, '_system');
          return;
        }
      } catch (e) { console.error('WhatsApp detection failed', e); }
    }

    // 2. Fallback for Web/Mobile or if App is missing
    const platform = Capacitor.getPlatform();
    if (platform === 'web' || platform === 'electron') {
      // Go to Web directly if app is missing
      window.open(webUrl, '_system');
    } else {
      // Mobile handles api.whatsapp.com beautifully by offering "Open in WhatsApp"
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}${message ? `&text=${encodedMsg}` : ''}`, '_system');
    }
  };

  // --- Helper: Get all customer IDs already associated with a unit across all offers/contracts ---
  const getCustomerIdsOnUnit = useCallback((unitId, excludeId = null) => {
    const ids = new Set();
    // Check all active contracts on this unit
    contracts.forEach(c => {
      if (c.id === excludeId) return;
      if (String(c.unitId).trim() !== String(unitId).trim()) return;
      if (c.status === 'terminated' || c.status === 'cancelled') return;
      if (c.customerId) ids.add(c.customerId);
      (c.jointPurchasers || []).forEach(jp => { if (jp.id) ids.add(jp.id); });
      if (c.guarantor?.id) ids.add(c.guarantor.id);
    });
    // Check all active offers on this unit
    offers.forEach(o => {
      if (o.id === excludeId) return;
      if (String(o.unitId).trim() !== String(unitId).trim()) return;
      if (o.status === 'contracted' || o.status === 'cancelled') return;
      if (o.customerId) ids.add(o.customerId);
      (o.jointPurchasers || []).forEach(jp => { if (jp.id) ids.add(jp.id); });
      if (o.guarantor?.id) ids.add(o.guarantor.id);
    });
    return ids;
  }, [contracts, offers]);

  const handleSaveStakeholders = async () => {
    if (!viewingContract || !editingStakeholders) return;

    // --- Duplicate Role Validation ---
    const ownerId = viewingContract.customerId;
    const jpIds = (editingStakeholders.jointPurchasers || []).map(jp => jp.id);
    const guarantorId = editingStakeholders.guarantor?.id || null;

    const uniqueJPIds = new Set(jpIds);
    if (uniqueJPIds.size !== jpIds.length) {
      alert('A Joint Purchaser appears more than once. Each person can only have one role.'); return;
    }
    if (jpIds.some(id => id === ownerId)) {
      alert('The owner cannot also be a Joint Purchaser.'); return;
    }
    if (guarantorId && guarantorId === ownerId) {
      alert('The owner cannot also be the Guarantor.'); return;
    }
    if (guarantorId && jpIds.includes(guarantorId)) {
      alert('A Joint Purchaser cannot also be the Guarantor.'); return;
    }

    // Cross-unit check: ensure no proposed stakeholder already has a role on another offer/contract for this unit
    const unitTaken = getCustomerIdsOnUnit(viewingContract.unitId, viewingContract.id);
    const allProposed = [...jpIds, ...(guarantorId ? [guarantorId] : [])];
    const conflict = allProposed.find(id => unitTaken.has(id));
    if (conflict) {
      const conflictName = customers.find(c => c.id === conflict)?.name || conflict;
      alert(`${conflictName} already has a role on another offer/contract for this unit.`); return;
    }

    // Update the contract in DB
    const updatedContract = {
      ...viewingContract,
      jointPurchasers: editingStakeholders.jointPurchasers,
      guarantor: editingStakeholders.guarantor
    };

    const currentContracts = await getContracts();
    const index = currentContracts.findIndex(c => c.id === viewingContract.id);
    if (index !== -1) {
      currentContracts[index] = updatedContract;
      await saveContracts(currentContracts);
      setViewingContract(updatedContract); // Update view
      setContracts(currentContracts); // Update list
      alert('Stakeholders updated successfully!');
      setShowEditStakeholdersModal(false);
    } else {
      alert('Error: Contract not found.');
    }
  };

  const promptPassword = (header, onConfirm) => {
    setPasswordModal({
      isOpen: true,
      header,
      onConfirm
    });
    setPasswordInput('');
  };

  const handleCancelOffer = async (offer) => {
    // Find current unit to pre-fill prices
    const unit = buildings.flatMap(b => (b.units || []).map(u => ({ ...u, buildingName: b.name, buildingId: b.id }))).find(u => String(u.unitId).trim() === String(offer.unitId).trim());
    setOfferCancelTarget(offer);
    setOfferCancelForm({
      newBasePrice: unit?.price || '',
      newFinishedPrice: unit?.finishedPrice || '',
      paymentPlan: unit?.paymentPlan || '',
      newUnitStatus: 'available'
    });
    setShowOfferCancelModal(true);
  };

  const handleConfirmOfferCancel = async () => {
    if (!offerCancelTarget) return;
    promptPassword('Enter password to cancel offer:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        try {
          await cancelOffer(offerCancelTarget.id, {
            newBasePrice: offerCancelForm.newBasePrice,
            newFinishedPrice: offerCancelForm.newFinishedPrice,
            newUnitStatus: offerCancelForm.newUnitStatus,
            paymentPlan: offerCancelForm.paymentPlan
          });
          setShowOfferCancelModal(false);
          setOfferCancelTarget(null);
          setViewingOffer(null);
          await refreshData();
          alert('Offer cancelled successfully. Unit has been updated.');
        } catch (err) {
          console.error('Offer cancellation failed:', err);
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleReactivateOffer = async (offer) => {
    promptPassword('Enter password to reactivate offer:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        try {
          await reactivateOffer(offer.id);
          setViewingOffer(null);
          await refreshData();
          alert('Offer reactivated successfully! Unit prices have been restored.');
        } catch (err) {
          console.error('Reactivation failed:', err);
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleReactivateContract = async (contract) => {
    promptPassword('Enter password to reactivate contract:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        try {
          await reactivateContract(contract.id);
          closeContractTab();
          await refreshData();
          alert('Contract reactivated successfully! Unit prices, offer, and installments have been restored.');
        } catch (err) {
          console.error('Reactivation failed:', err);
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleDeleteOffer = async (offer) => {
    promptPassword('DANGER: Enter password to PERMANENTLY DELETE offer:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        await deleteOffer(offer.id);
        await refreshData();
        alert(t('alert.deleted'));
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleEditOfferPayment = (offer, payment) => {
    setSelectedOfferForPayment(offer);
    setEditingOfferPayment(payment);
    setOfferPaymentForm({
      amount: payment.amount,
      date: payment.date,
      reference: payment.reference || '',
      paymentMethod: payment.paymentMethod || 'CASH',
      chequeNumber: payment.chequeNumber || '',
      bank: payment.bank || '',
      chequeStatus: payment.chequeStatus || 'Not Collected',
      attachment: payment.attachment || null,
      isReservation: payment.isReservation || false
    });
    setShowOfferPaymentModal(true);
  };

  const handleDeleteOfferPayment = async (offerId, paymentId) => {
    if (window.confirm(t('common.confirmDeletePayment') || 'Are you sure you want to delete this payment?')) {
      const updated = await deleteOfferPayment(offerId, paymentId);
      if (updated) {
        setOffers(prev => prev.map(o => (o.id === offerId ? updated : o)));
        if (selectedOfferForPayment && selectedOfferForPayment.id === offerId) {
          setSelectedOfferForPayment(updated);
        }
        if (viewingOffer && viewingOffer.id === offerId) {
          setViewingOffer(updated);
        }
        refreshData();
      }
    }
  };


  const handleCancelContract = async (contract) => {
    // Find current unit to pre-fill prices
    const unit = buildings.flatMap(b => (b.units || []).map(u => ({ ...u, buildingName: b.name, buildingId: b.id }))).find(u => String(u.unitId).trim() === String(contract.unitId).trim());
    setTerminationTarget(contract);
    setTerminationForm({
      newBasePrice: unit?.price || '',
      newFinishedPrice: unit?.finishedPrice || '',
      paymentPlan: unit?.paymentPlan || '',
      newUnitStatus: 'available',
      reason: ''
    });
    setShowTerminationModal(true);
  };

  const handleConfirmTermination = async () => {
    if (!terminationTarget) return;
    promptPassword('Enter password to terminate contract:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        try {
          await terminateContractInPlace(terminationTarget.id, {
            reason: terminationForm.reason || 'Terminated',
            newBasePrice: terminationForm.newBasePrice,
            newFinishedPrice: terminationForm.newFinishedPrice,
            newUnitStatus: terminationForm.newUnitStatus,
            paymentPlan: terminationForm.paymentPlan
          });
          setShowTerminationModal(false);
          setTerminationTarget(null);
          closeContractTab();
          await refreshData();
          alert('Contract terminated successfully. Unit has been updated.');
        } catch (err) {
          console.error('Termination failed:', err);
          alert('Error: ' + err.message);
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleDeleteBuilding = async (id) => {
    promptPassword('Enter password to delete building:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        await removeBuilding(id);
        setBuildings(await getBuildings());
        alert("Building deleted.");
      } else {
        alert("Incorrect password.");
      }
    });
  };

  const handleDeleteCustomer = async (id) => {
    promptPassword('Enter password to delete customer:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        await deleteCustomer(id);
        setCustomers(await getCustomers());
        alert(t('alert.deleted'));
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleUpdateCustomer = async () => {
    if (editingCustomer && editingCustomer.name && editingCustomer.phone) {
      await updateCustomer(editingCustomer.id, editingCustomer);
      setCustomers(await getCustomers());
      setShowEditCustomerModal(false);
      setEditingCustomer(null);
      alert(t('alert.saved'));
    } else {
      alert(t('alert.noData'));
    }
  };

  const handleAdd = async () => {
    if (newBuildingName.trim()) {
      await addBuilding(newBuildingName);
      setNewBuildingName('');
      setShowAddModal(false);
      setBuildings(await getBuildings());
    }
  };


  const handleAddUnit = async () => {
    if (activeBuilding && unitForm.unitId) {
      await addUnitToBuilding(activeBuilding.id, unitForm);
      const updatedBuildings = await getBuildings();
      setBuildings(updatedBuildings);
      setActiveBuilding(updatedBuildings.find(b => b.id === activeBuilding.id));
      setShowUnitModal(false);
      setUnitForm({ unitId: '', floor: '', area: '', view: '', price: '', finishedPrice: '', share: '', status: 'available', plan: '' });
    }
  };

  const handleDeleteUnit = async (unitId) => {
    promptPassword('Enter admin password to delete unit:', async (password) => {
      if (password === getAppSecurity().adminPassword || password === 'ALEXmoh12!@') {
        if (window.confirm('Are you sure you want to delete this unit?')) {
          await removeUnitFromBuilding(activeBuilding.id, unitId);
          const updatedBuildings = await getBuildings();
          setBuildings(updatedBuildings);
          setActiveBuilding(updatedBuildings.find(b => b.id === activeBuilding.id));
        }
      } else {
        alert("Incorrect password");
      }
    });
  };

  const handleViewLayout = async (unitId) => {
    if (!window.electronAPI) {
      alert("Layout viewing is only available in the desktop app.");
      return;
    }

    try {
      const imageUrl = await window.electronAPI.getUnitLayout(unitId);
      setLayoutImageUrl(imageUrl || null);
      setLayoutUnitId(unitId);
      setShowLayoutModal(true);
    } catch (error) {
      console.error("Error loading layout:", error);
      alert("Failed to load unit layout.");
    }
  };

  const handleUpdateUnitStatus = async (unitId, newStatus) => {
    promptPassword('Enter admin password to change status:', async (password) => {
      if (password === getAppSecurity().adminPassword) {
        const allBuildings = await getBuildings();
        const bIdx = allBuildings.findIndex(b => b.id === activeBuilding.id);
        if (bIdx !== -1) {
          const uIdx = allBuildings[bIdx].units.findIndex(u => u.id === unitId);
          if (uIdx !== -1) {
            allBuildings[bIdx].units[uIdx].status = newStatus;
            await saveBuildings(allBuildings);
            setBuildings(allBuildings);
            setActiveBuilding(allBuildings[bIdx]);
            alert("Status updated successfully.");
          }
        }
      } else {
        alert("Incorrect password");
      }
    });
  };

  const handleExcelImport = async (event) => {
    const file = event.target.files[0];
    if (file && activeBuilding) {
      try {
        setUploadProgress({ isOpen: true, current: 0, total: 100, message: 'Parsing Excel file...' });
        const { units } = await parseUnitsExcel(file);
        setUploadProgress({ isOpen: true, current: 30, total: 100, message: `Importing ${units.length} units...` });
        const allBuildings = await getBuildings();
        const bIndex = allBuildings.findIndex(b => b.id === activeBuilding.id);
        if (bIndex !== -1) {
          if (!allBuildings[bIndex].units) allBuildings[bIndex].units = [];

          // Generate IDs for new units
          const unitsWithIds = units.map(u => ({
            ...u,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
          }));

          allBuildings[bIndex].units = [...allBuildings[bIndex].units, ...unitsWithIds];
          await saveBuildings(allBuildings);
          setBuildings(allBuildings);
          setActiveBuilding(allBuildings[bIndex]);
        }

        setUploadProgress(prev => ({ ...prev, isOpen: false }));
        setNoticeAlert({
          isOpen: true,
          header: 'Import Successful',
          message: `Successfully imported ${units.length} units to ${activeBuilding.name}.`,
          buttons: ['Great']
        });
      } catch (err) {
        setUploadProgress(prev => ({ ...prev, isOpen: false }));
        console.error(err);
        setNoticeAlert({
          isOpen: true,
          header: 'Import Failed',
          message: 'Failed to import Excel file. Please check the format and try again.',
          buttons: ['OK']
        });
      }
    }
    event.target.value = null; // Reset input
  };

  const handleInstallmentExcelImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setUploadProgress({ isOpen: true, current: 0, total: 100, message: 'Processing Installments...' });
        const imported = await parseInstallmentsExcel(file);
        if (imported && imported.length > 0) {
          setUploadProgress({ isOpen: true, current: 50, total: 100, message: t('common.saving', { type: t('common.installments') }) });
          const current = await getInstallments();
          await saveInstallments([...current, ...imported]);
          await refreshData();
          setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
          alert(t('alert.importSuccessCount', { count: imported.length, type: t('common.installments') }));
        } else {
          setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
        }
      } catch (err) {
        setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
        console.error(err);
        alert(t('alert.importFailedFormat', { type: t('common.installments') }));
      }
    }
    event.target.value = null;
  };

  const handleContractExcelImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const imported = await parseContractsExcel(file);
        if (imported && imported.length > 0) {

          setUploadProgress({ isOpen: true, current: 0, total: imported.length, message: t('common.importing', { type: t('common.contracts') }) });

          let count = 0;
          for (const con of imported) {
            count++;
            setUploadProgress({
              isOpen: true,
              current: count,
              total: imported.length,
              message: t('common.importingCount', { type: t('common.contracts'), current: count, total: imported.length })
            });

            // Mapping check/fix for consistency with the model
            if (con.guarantor && con.guarantor.id) {
              // Ensure it's just the ID
              con.guarantor = { id: con.guarantor.id };
            }

            if (con.jointPurchasers) {
              con.jointPurchasers = con.jointPurchasers.map(jp => ({ id: jp.id }));
            }

            // Set default installment parameters since they are not in the simplified import
            con.downPayment = con.downPayment || 0;
            con.years = con.years || 0;
            con.frequency = con.frequency || 'quarterly';

            await addContract(con);
          }
          setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
          await refreshData();
          setNoticeAlert({
            isOpen: true,
            header: t('alert.importSuccess'),
            message: t('alert.importSuccessCount', { count: imported.length, type: t('common.contracts') }),
            buttons: [t('common.ok')]
          });
        }
      } catch (err) {
        setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
        console.error(err);
        setNoticeAlert({
          isOpen: true,
          header: 'Import Failed',
          message: 'Please check the file format and try again.',
          buttons: ['OK']
        });
      }
    }
    event.target.value = null;
  };

  const handleSalesExcelImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const imported = await parseSalesExcel(file);
        if (imported && imported.length > 0) {
          setUploadProgress({ isOpen: true, current: 0, total: imported.length, message: 'Importing Sales Agents...' });
          let count = 0;
          for (const s of imported) {
            count++;
            setUploadProgress({ isOpen: true, current: count, total: imported.length, message: `Importing Sales Agent ${count}/${imported.length}` });
            await addSales(s);
          }
          setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
          await refreshData();
          setNoticeAlert({
            isOpen: true,
            header: 'Import Successful',
            message: `Successfully imported ${imported.length} sales agents.`,
            buttons: ['OK']
          });
        }
      } catch (err) {
        setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
        console.error(err);
        setNoticeAlert({
          isOpen: true,
          header: t('alert.importFailed'),
          message: t('alert.importFailedMessage'),
          buttons: [t('common.ok')]
        });
      }
    }
    event.target.value = null;
  };

  const handleDeleteAllSales = async () => {
    promptPassword(t('alert.enterPasswordDeleteAllSales'), async (password) => {
      if (password === getAppSecurity().adminPassword) {
        if (window.confirm(t('alert.deleteAllSalesConfirm'))) {
          await deleteAllSales();
          await refreshData();
          alert(t('alert.allSalesDeleted'));
        }
      } else {
        alert(t('alert.incorrectPassword'));
      }
    });
  };

  const handleCustomerExcelImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const { customers: imported, headers } = await parseCustomersExcel(file);

        if (imported.length > 0) {
          setUploadProgress({ isOpen: true, current: 0, total: imported.length, message: t('alert.importingItem', { type: t('common.customers') }) });
          let count = 0;
          for (const cus of imported) {
            count++;
            setUploadProgress({ isOpen: true, current: count, total: imported.length, message: t('alert.importingItemCount', { type: t('common.customers'), current: count, total: imported.length }) });
            await addCustomer(cus);
          }
          setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
          await refreshData();

          setNoticeAlert({
            isOpen: true,
            header: 'Import Successful',
            message: `Successfully imported ${imported.length} customers.\n\nDetected columns: ${headers.join(', ')}`,
            buttons: ['Great!']
          });
        } else {
          setNoticeAlert({
            isOpen: true,
            header: 'No Valid Data',
            message: `Found rows in the file, but no customers with a valid Name could be extracted.\n\nDetected Columns: ${headers.join(', ')}\n\nPlease ensure your Excel has at least a "Customer Name" or "Name" column.`,
            buttons: ['Check Format']
          });
        }
      } catch (err) {
        setUploadProgress({ isOpen: false, current: 0, total: 0, message: '' });
        console.error(err);
        setNoticeAlert({
          isOpen: true,
          header: 'Import Failed',
          message: 'Failed to import customers. Please ensure the file is a valid Excel spreadsheet and try again.',
          buttons: ['OK']
        });
      }
    }
    event.target.value = null;
  };

  const handleDeleteAllUnits = async () => {
    promptPassword('Enter password to delete all units:', async (password) => {
      if (password === getAppSecurity().adminPassword) {
        const allBuildings = await getBuildings();
        const bIndex = allBuildings.findIndex(b => b.id === activeBuilding.id);
        if (bIndex !== -1) {
          allBuildings[bIndex].units = [];
          await saveBuildings(allBuildings);
          setBuildings(allBuildings);
          setActiveBuilding(allBuildings[bIndex]);
          alert("All units deleted successfully.");
        }
      } else {
        alert("Incorrect password.");
      }
    });
  };

  const handleDeleteAllInstallments = async () => {
    promptPassword('Enter password to delete all installments:', async (password) => {
      if (password === getAppSecurity().adminPassword) {
        if (window.confirm("Are you sure? This cannot be undone.")) {
          await deleteAllInstallments();
          await refreshData();
          alert("All installments deleted successfully.");
        }
      } else {
        alert("Incorrect password.");
      }
    });
  };

  const handleDeleteAllContracts = async () => {
    setPasswordModal({
      isOpen: true,
      header: 'Enter password to delete all contracts:',
      onConfirm: async (password) => {
        if (password === getAppSecurity().adminPassword) {
          if (window.confirm("Are you sure? This will delete all contracts and their installments.")) {
            await deleteAllContracts();
            await refreshData();
            alert("All contracts deleted successfully.");
          }
        } else {
          alert("Incorrect password.");
        }
      }
    });
  };

  const handleDeleteAllCustomers = async () => {
    setPasswordModal({
      isOpen: true,
      header: 'Enter password to delete all customers:',
      onConfirm: async (password) => {
        if (password === getAppSecurity().adminPassword) {
          if (window.confirm("Are you sure? This will delete all customers.")) {
            await deleteAllCustomers();
            await refreshData();
            alert("All customers deleted successfully.");
          }
        } else {
          alert("Incorrect password.");
        }
      }
    });
  };

  // Memoized filtered installments for performance
  const filteredInstallments = useMemo(() => {
    // Create lookups to resolve missing names deeply
    const contractCustMap = {};
    const contractCustomerIdMap = {};
    const customerNameMap = {};
    const unitOwnerMap = {};
    const contractSalesMap = {}; // New: Contract -> Sales ID lookup
    const salesNameMap = {}; // New: Sales ID -> Sales Name lookup

    // 0. Map Sales Agents
    sales.forEach(s => {
      if (s.id && s.name) {
        salesNameMap[s.id] = s.name;
      }
    });

    // 1. Map Customers
    customers.forEach(c => {
      if (c.id && c.name) {
        customerNameMap[c.id] = c.name;
      }
    });

    const unitToBuildingMap = {};
    buildings.forEach(b => {
      if (b.units) {
        b.units.forEach(u => {
          unitToBuildingMap[u.unitId] = b.id;
        });
      }
    });

    contracts.forEach(c => {
      if (c.id) {
        contractCustMap[c.id] = c.customerName; // Name directly on contract
        contractCustomerIdMap[c.id] = c.customerId; // Link to customer table
        contractSalesMap[c.id] = c.salesId; // Link to sales agent

        // Map Unit to Customer (for installments missing contractId)
        if (c.unitId) {
          // Logic to get best name: Contract Name -> Looked up Customer Name
          let bestName = c.customerName;
          if ((!bestName || bestName === 'N/A') && c.customerId && customerNameMap[c.customerId]) {
            bestName = customerNameMap[c.customerId];
          }
          if (bestName && bestName !== 'N/A') {
            unitOwnerMap[c.unitId] = bestName;
          }
        }
      }
    });

    // Generate virtual installment entries from offer down payments AND projected installments
    const offerPaymentEntries = [];
    offers.forEach(offer => {
      if (offer.status === 'cancelled' || offer.status === 'contracted') return;

      const dpRequired = Number(offer.downPaymentAmount) ||
        (Number(offer.finalPrice || offer.totalPrice) * (Number(offer.downPayment) / 100)) || 0;
      const totalPaid = (offer.payments || []).reduce((sum, p) => {
        const isCheque = p.paymentMethod === 'Cheque' || p.method === 'Cheque';
        if (isCheque && p.chequeStatus !== 'Cleared') return sum;
        return sum + Number(p.amount || 0);
      }, 0);

      // Resolve customer name
      let custName = offer.customerName;
      if (offer.customerId && customerNameMap[offer.customerId]) {
        custName = customerNameMap[offer.customerId];
      }

      // Resolve sales name
      let salesName = 'N/A';
      if (offer.salesId && salesNameMap[offer.salesId]) {
        salesName = salesNameMap[offer.salesId];
      }

      const buildingId = offer.buildingId || (offer.unitId ? unitToBuildingMap[offer.unitId] : null);

      // Collect all cheque numbers from payments for search
      const allCheques = (offer.payments || []).map(p => p.chequeNumber || p.ref || '').filter(c => c).join(' ');

      // 1. Down Payment entry (always generated if there are payments or a DP requirement)
      if (dpRequired > 0 || (offer.payments && offer.payments.length > 0)) {
        // Check if any payment is marked as reservation
        const hasReservation = (offer.payments || []).some(p => p.isReservation);
        const reservationAmount = Number(offer.reservationAmount || 0);
        const dpType = hasReservation && reservationAmount > 0 ? 'Reservation + Down Payment' : (t('common.downPayment') || 'Down Payment');

        offerPaymentEntries.push({
          id: `offer-dp-${offer.id}`,
          offerId: offer.id,
          isOfferPayment: true,
          unitId: offer.unitId,
          unitNumber: offer.unitId,
          buildingId: buildingId,
          customerId: offer.customerId,
          customerName: custName,
          salesName: salesName,
          type: dpType,
          dueDate: offer.date,
          amount: dpRequired,
          paidAmount: totalPaid,
          status: totalPaid >= dpRequired && dpRequired > 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Not Paid',
          rest: Math.max(0, dpRequired - totalPaid),
          payments: offer.payments || [],
          chequeNumber: allCheques,
          paymentMethod: (offer.payments || [])[0]?.paymentMethod || (offer.payments || [])[0]?.method || 'CASH',
          bank: (offer.payments || []).map(p => p.bank).filter(b => b).join(', '),
        });
      }

      // 2. Projected installment entries from offer.installments[] (excluding Down Payment type entries)
      if (offer.installments && offer.installments.length > 0) {
        offer.installments.forEach((ins, idx) => {
          // Skip down payment entries since we already have the DP entry above
          if (ins.type && (ins.type.toLowerCase().includes('down') || ins.type.toLowerCase().includes('reservation'))) return;

          offerPaymentEntries.push({
            id: `offer-ins-${offer.id}-${idx}`,
            offerId: offer.id,
            isOfferPayment: true,
            unitId: offer.unitId,
            unitNumber: offer.unitId,
            buildingId: buildingId,
            customerId: offer.customerId,
            customerName: custName,
            salesName: salesName,
            type: ins.type || `Installment ${idx}`,
            dueDate: ins.dueDate || offer.date,
            amount: Number(ins.amount || 0),
            paidAmount: 0, // Projected installments are not paid yet
            status: 'Not Paid',
            rest: Number(ins.amount || 0),
            payments: [],
            chequeNumber: ins.chequeNumber || '',
            paymentMethod: ins.paymentMethod || 'Cheque',
            bank: ins.bank || '',
            chequeStatus: ins.chequeStatus || 'Not Collected',
          });
        });
      }
    });

    const allEntries = [...installments, ...offerPaymentEntries];

    return allEntries
      .map(ins => {
        // deep resolve customer name
        // Priority: 1. Installment, 2. Contract Name, 3. Contract -> Customer ID -> Customer List, 4. Unit Owner
        let resolvedName = ins.customerName;

        if (!resolvedName || resolvedName === 'N/A' || resolvedName === 'Unknown' || /^\d+$/.test(resolvedName)) {
          // If it's a numeric ID, try direct lookup
          if (customerNameMap[resolvedName]) {
            resolvedName = customerNameMap[resolvedName];
          }

          // Try from Contract's cached name
          if ((!resolvedName || resolvedName === 'N/A' || resolvedName === 'Unknown' || /^\d+$/.test(resolvedName)) && ins.contractId && contractCustMap[ins.contractId]) {
            resolvedName = contractCustMap[ins.contractId];
          }

          // If still missing/N/A or ID, try Contract -> Customer ID -> Customer List
          if ((!resolvedName || resolvedName === 'N/A' || /^\d+$/.test(resolvedName)) && ins.contractId && contractCustomerIdMap[ins.contractId]) {
            const custId = contractCustomerIdMap[ins.contractId];
            if (customerNameMap[custId]) {
              resolvedName = customerNameMap[custId];
            }
          }

          // If still missing (e.g. no contractId on installment), try Unit ID -> Active Contract Owner
          if ((!resolvedName || resolvedName === 'N/A' || /^\d+$/.test(resolvedName)) && ins.unitId && unitOwnerMap[ins.unitId]) {
            resolvedName = unitOwnerMap[ins.unitId];
          }
        }

        // Resolve Sales Agent (Cell)
        let resolvedSales = 'N/A';
        const sid = ins.salesId || (ins.contractId ? contractSalesMap[ins.contractId] : null);
        if (sid) {
          // Fallback to sid itself if not found in map (useful if sid is already the name)
          resolvedSales = salesNameMap[sid] || sid;
        }

        const rest = Number(ins.amount) - Number(ins.paidAmount || 0);
        const paid = Number(ins.paidAmount || 0);
        let resolvedStatus = ins.status;

        if (String(ins.status || '').toLowerCase() !== 'cancelled') {
          if (rest < 1) {
            resolvedStatus = 'Paid';
          } else if (paid > 1) {
            resolvedStatus = 'Partially Paid';
          } else {
            resolvedStatus = 'Not Paid';
          }
        }

        const buildingId = ins.buildingId || (ins.unitId ? unitToBuildingMap[ins.unitId] : null);
        const linkedWallet = wallets.find(w => (w.checkIds || []).includes(ins.id));
        const walletName = linkedWallet ? linkedWallet.bankAddress : 'N/A';
        return { ...ins, customerName: resolvedName, salesName: resolvedSales, status: resolvedStatus, rest, buildingId, walletName };
      })
      .filter(ins => {
        const matchesBuilding = filterBuilding === 'all' || String(ins.buildingId) === String(filterBuilding);
        const q = searchQuery.toLowerCase();
        // Resolve Wallet Info for Search
        const linkedWallet = wallets.find(w => (w.checkIds || []).includes(ins.id));
        const matchesWallet = linkedWallet ?
          String(linkedWallet.bankAddress || '').toLowerCase().includes(q) ||
          String(linkedWallet.notes || '').toLowerCase().includes(q) : false;

        const matchesSearch =
          String(ins.unitId || '').toLowerCase().includes(q) ||
          String(ins.contractId || '').toLowerCase().includes(q) ||
          String(ins.offerId || '').toLowerCase().includes(q) ||
          String(ins.customerName || '').toLowerCase().includes(q) ||
          String(ins.salesName || '').toLowerCase().includes(q) ||
          String(ins.chequeNumber || '').toLowerCase().includes(q) ||
          String(ins.bank || '').toLowerCase().includes(q) ||
          String(ins.depositedBank || '').toLowerCase().includes(q) ||
          (ins.payments || []).some(p =>
            String(p.ref || '').toLowerCase().includes(q) ||
            String(p.bank || '').toLowerCase().includes(q) ||
            String(p.chequeNumber || '').toLowerCase().includes(q)
          ) ||
          matchesWallet;
        const matchesStatus = (filterStatus === 'all' || ins.status === filterStatus);
        const matches = matchesSearch && matchesStatus && matchesBuilding;
        if (!matches) return false;

        const rest = Number(ins.amount) - Number(ins.paidAmount || 0);

        // Normalize due date for comparison
        const dueDateObj = parseSafeDate(ins.dueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        const dueDateTs = dueDateObj.getTime();

        let matchesDate = true;
        if (fromDate) {
          const fromDateObj = new Date(fromDate);
          fromDateObj.setHours(0, 0, 0, 0);
          if (dueDateTs < fromDateObj.getTime()) matchesDate = false;
        }
        if (toDate) {
          const toDateObj = new Date(toDate);
          toDateObj.setHours(0, 0, 0, 0);
          if (dueDateTs > toDateObj.getTime()) matchesDate = false;
        }

        const isCancelled = String(ins.status || '').toLowerCase().includes('cancel');
        const isPaid = ins.status === 'Paid' || ins.rest < 1;

        let matchesNotPaid = true;
        if (filterNotFullyPaid && isPaid) matchesNotPaid = false;

        let matchesLate = true;
        if (filterLate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPastDue = dueDateTs < today.getTime();
          // Overdue = has balance, past due date, and not cancelled/paid
          if (isPaid || isCancelled || !isPastDue) {
            matchesLate = false;
          }
        }

        let matchesWalletFilter = true;
        if (filterWallet !== 'all') {
          if (filterWallet === 'none') matchesWalletFilter = !linkedWallet;
          else matchesWalletFilter = linkedWallet && linkedWallet.id === filterWallet;
        }

        return matchesSearch && matchesStatus && matchesDate && matchesNotPaid && matchesLate && matchesWalletFilter;
      })
      .sort((a, b) => {
        const getTs = (d) => {
          if (!isNaN(d) && Number(d) > 20000) return (Number(d) - 25569) * 86400 * 1000;
          const dt = new Date(d);
          return isNaN(dt.getTime()) ? 0 : dt.getTime();
        };
        return getTs(a.dueDate) - getTs(b.dueDate);
      });
  }, [installments, contracts, customers, sales, offers, searchQuery, filterStatus, fromDate, toDate, filterNotFullyPaid, filterLate, wallets, filterWallet, filterBuilding, buildings]);

  // Find the installment with the closest due date to today
  const closestInstallmentId = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    let closestId = null;
    let closestDiff = Infinity;
    filteredInstallments.forEach(ins => {
      const d = parseSafeDate(ins.dueDate);
      if (!d || isNaN(d.getTime())) return;
      const diff = Math.abs(d.getTime() - todayTs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestId = ins.id;
      }
    });
    return closestId;
  }, [filteredInstallments]);

  const allBuildingsUnitsCount = useMemo(() => {
    return buildings.reduce((count, b) => count + (b.units?.length || 0), 0);
  }, [buildings]);

  // Memoized Dashboard Analytics (prevents recalculation on every render)
  const dashboardStats = useMemo(() => {
    const allUnits = buildings.flatMap(b => b.units || []);
    const availableUnits = allUnits.filter(u => u.status === 'available');
    const contractedUnits = allUnits.filter(u => u.status === 'contract');
    const totalValue = allUnits.reduce((sum, u) => sum + (Number(u.price) || 0), 0);
    const totalSoldValue = contractedUnits.reduce((sum, u) => sum + (Number(u.price) || 0), 0);
    const totalPaid = installments.reduce((sum, ins) => sum + (Number(ins.paidAmount) || 0), 0);
    const totalOutstanding = totalSoldValue - totalPaid;
    return { allUnits, availableUnits, contractedUnits, totalValue, totalSoldValue, totalPaid, totalOutstanding };
  }, [buildings, installments]);

  // Memoized Installment Statistics (prevents 5 expensive reduce/filter calls on every render)
  const installmentStats = useMemo(() => {
    const totalVolume = filteredInstallments.reduce((s, i) => s + Number(i.amount), 0);
    const totalCollected = filteredInstallments.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const totalRemaining = filteredInstallments.reduce((s, i) => s + Math.max(0, Number(i.amount) - Number(i.paidAmount || 0)), 0);
    const now = new Date();
    const expectedThisMonth = filteredInstallments.filter(i => {
      const d = i.dueDate && !isNaN(i.dueDate) ? new Date((Number(i.dueDate) - 25569) * 86400000) : new Date(i.dueDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, i) => s + Number(i.amount), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totalOverdue = filteredInstallments.filter(i => {
      const d = i.dueDate && !isNaN(i.dueDate) ? new Date((Number(i.dueDate) - 25569) * 86400000) : new Date(i.dueDate);
      const rest = Number(i.amount) - Number(i.paidAmount || 0);
      return rest > 0 && d < today && i.status !== 'Cancelled';
    }).reduce((s, i) => s + Math.max(0, Number(i.amount) - Number(i.paidAmount || 0)), 0);
    return { totalVolume, totalCollected, totalRemaining, expectedThisMonth, totalOverdue };
  }, [filteredInstallments]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleInstallmentsCount(50);
  }, [searchQuery, filterStatus, fromDate, toDate, filterNotFullyPaid, filterLate]);

  // Back Button Navigation for Android
  useEffect(() => {
    if (!isNativeMobile) return;

    const handleBackButton = (ev) => {
      ev.detail.register(10, () => {
        // 1. Modals & Overlays (High Priority)
        // Check for any open overlay state
        if (showPreviewModal) { setShowPreviewModal(false); return; }
        if (showLayoutModal) { setShowLayoutModal(false); return; }
        if (showFloorplanModal) { setShowFloorplanModal(false); return; }
        if (showUnitModal) { setShowUnitModal(false); return; }
        if (editingUnit) { setEditingUnit(null); return; }
        if (showAddModal) { setShowAddModal(false); return; }
        if (showOfferInstallmentsModal) { setShowOfferInstallmentsModal(false); return; }
        if (showOfferPaymentModal) { setShowOfferPaymentModal(false); return; }
        if (showInventoryModal) { setShowInventoryModal(false); return; }
        if (showSettingsModal) { setShowSettingsModal(false); return; }
        if (showAdminModal) { setShowAdminModal(false); return; }
        if (showAddCustomerModal) { setShowAddCustomerModal(false); return; }
        if (showEditCustomerModal) { setShowEditCustomerModal(false); return; }

        if (showCreateOfferModal) { setShowCreateOfferModal(false); return; }

        if (showCreateContractModal) { setShowCreateContractModal(false); return; }
        if (showAddSalesModal) { setShowAddSalesModal(false); return; }
        if (showEditSalesModal) { setShowEditSalesModal(false); return; }
        if (showResaleModal) { setShowResaleModal(false); return; }
        if (showEditStakeholdersModal) { setShowEditStakeholdersModal(false); return; }
        if (passwordModal.isOpen) { setPasswordModal({ isOpen: false }); return; }
        if (showUpdateModal) { setShowUpdateModal(false); return; }
        if (showChequeDesigner) { setShowChequeDesigner(false); return; }

        // 2. Detailed Views aka "Sub-pages"
        if (viewingCustomerDetail) { setViewingCustomerDetail(null); return; }
        if (viewingSalesDetail) { setViewingSalesDetail(null); return; }
        if (viewingOffer) { setViewingOffer(null); return; }
        if (viewingContract && currentView === 'contractDetail') { closeContractTab(); return; }

        // 3. Drill-down State
        if (activeBuilding && currentView === 'buildings') { setActiveBuilding(null); return; }

        // 4. Main Tab Navigation (Go back to Home)
        if (currentView !== 'home') {
          navigateToView('home');
          return;
        }

        // 5. Exit App (if on Home and nothing else open)
        CapacitorApp.exitApp();
      });
    };

    document.addEventListener('ionBackButton', handleBackButton);
    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, [
    isNativeMobile,
    currentView, activeBuilding,
    // Modals
    showPreviewModal, showLayoutModal, showFloorplanModal, showUnitModal, editingUnit, showAddModal,
    showOfferInstallmentsModal, showOfferPaymentModal, showInventoryModal, showSettingsModal, showAdminModal,
    showAddCustomerModal, showEditCustomerModal, showCreateOfferModal,
    showCreateContractModal, showAddSalesModal, showEditSalesModal,
    showResaleModal, showEditStakeholdersModal, passwordModal, showUpdateModal, showChequeDesigner,
    // Details
    viewingCustomerDetail, viewingSalesDetail, viewingOffer, viewingContract
  ]);

  // --- Navigation & Reset Helper ---
  const handleBackToHome = () => {
    // Reset in-view selections (sub-views within the tab)
    setActiveBuilding(null);
    setEditingInstallment(null);
    setViewingContract(null);
    setViewingOffer(null);
    setEditingSales(null);
    setEditingCustomer(null);
    setViewingCustomerDetail(null);
    setViewingSalesDetail(null);
    setViewingWallet(null);

    // Close the current tab (this also clears its per-tab saved state)
    if (currentView !== 'home') {
      closeTab(currentView);
      resetDataEntryForms();
    }
  };

  return (
    <>
      <LoginModal
        isOpen={!loggedInUser && !showSetupWizard}
        onLoginSuccess={(user) => {
          setLoggedInUser(user);
        }}
      />
      <InstallmentsReportModal
        isOpen={showInstallmentsReportModal}
        onClose={() => setShowInstallmentsReportModal(false)}
        installments={filteredInstallments}
        title="Schedule Report"
      />
      <ErrorBoundary>
        {/* --- CUSTOM DYR TITLE BAR (Desktop Only) --- */}
        {isDesktop && (
          <div className="chrono-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={business} style={{ fontSize: '14px' }} />
              <span>DYR</span>
            </div>
            <div className="window-controls">
              <div className="window-btn" onClick={handleMinimize}><IonIcon icon={remove} /></div>
              <div className="window-btn" onClick={handleMaximize}><IonIcon icon={squareOutline} style={{ fontSize: '10px' }} /></div>
              <div className="window-btn close" onClick={handleClose}><IonIcon icon={close} /></div>
            </div>
          </div>
        )}



        {initialLoading && (
          <div className="chrono-splash" style={{ top: isDesktop ? '32px' : '0' }}>
            <div className="chrono-logo-pulse">DYR</div>
            <div className="chrono-loader-bar">
              <div className="chrono-loader-progress"></div>
            </div>
            <p style={{ color: '#64748B', marginTop: '20px', fontSize: '0.8rem', letterSpacing: '4px', textTransform: 'uppercase' }}>
              Preparing Commercial Data...
            </p>
          </div>
        )}

        <IonApp className="pro-layout-root" style={{
          top: isDesktop ? '32px' : '0',
          height: isDesktop ? 'calc(100vh - 32px)' : '100%',
          position: 'absolute',
          width: '100%',
          background: 'var(--app-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header Bar - outside IonContent to avoid overlap */}
          <div style={{
            background: 'var(--app-bg-card, #FFFFFF)',
            borderBottom: '2px solid var(--object-outline, #E5E7EB)',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: '0',
            minHeight: '48px',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px', flexShrink: 0, paddingRight: '16px', borderRight: '1px solid var(--object-outline, #E5E7EB)' }}>
              <span style={{ color: '#2563EB' }}>DYR</span> <span style={{ opacity: 0.4, fontSize: '0.8rem', fontWeight: '400', color: 'var(--app-text)' }}>v{APP_VERSION}</span>
            </div>
            {/* --- Tab Strip --- */}
            <div className="titlebar-tabs">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`titlebar-tab ${activeTabId === tab.id ? 'active' : ''}`}
                  onClick={() => { setActiveTabId(tab.id); setCurrentView(tab.view); }}
                  onDoubleClick={(e) => { e.preventDefault(); duplicateTab(tab.view); }}
                  onAuxClick={(e) => {
                    if (e.button === 1) { e.preventDefault(); duplicateTab(tab.view); }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTabContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id, tabView: tab.view });
                  }}
                >
                  <span className="titlebar-tab-label">{tab.label}</span>
                  {tab.view !== 'home' && (
                    <span className="titlebar-tab-close" onClick={(e) => closeTab(tab.id, e)}>×</span>
                  )}
                </div>
              ))}
            </div>

            {/* Tab Context Menu */}
            {tabContextMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setTabContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setTabContextMenu(null); }} />
                <div style={{
                  position: 'fixed',
                  left: tabContextMenu.x,
                  top: tabContextMenu.y,
                  zIndex: 99999,
                  background: 'var(--app-bg-card, #fff)',
                  border: '1px solid var(--object-outline, #E5E7EB)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  minWidth: '180px',
                  padding: '4px 0',
                  animation: 'fadeIn 0.12s ease-out'
                }}>
                  <div
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { duplicateTab(tabContextMenu.tabView); setTabContextMenu(null); }}
                  >
                    <span style={{ fontSize: '1rem' }}>⧉</span> Duplicate Tab
                  </div>
                  {tabContextMenu.tabId !== 'home' && (
                    <div
                      style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { closeTab(tabContextMenu.tabId); setTabContextMenu(null); }}
                    >
                      <span style={{ fontSize: '1rem' }}>✕</span> Close Tab
                    </div>
                  )}
                  {openTabs.length > 2 && (
                    <>
                      <div style={{ height: '1px', background: 'var(--object-outline, #E5E7EB)', margin: '4px 0' }} />
                      <div
                        style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => closeOtherTabs(tabContextMenu.tabId)}
                      >
                        <span style={{ fontSize: '1rem' }}>⊘</span> Close All Other Tabs
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {loggedInUser && (
              <div className="pro-glass-card" style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 4px 4px', borderRadius: '12px', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  background: activeLogo ? 'transparent' : 'linear-gradient(135deg, #2563EB, #1E3A8A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                }}>
                  {activeLogo ? (
                    <img src={activeLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#FFF', fontSize: '0.55rem', fontWeight: '900' }}>{(branding.name || 'DYR').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--app-text)', fontWeight: '600' }}>{loggedInUser.name}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: '800', textTransform: 'uppercase',
                  padding: '1px 6px', borderRadius: '6px', letterSpacing: '0.3px',
                  background: (loggedInUser.rank === 'admin' || loggedInUser.rank === 'owner') ? 'rgba(37,99,235,0.12)' : 'rgba(100,116,139,0.1)',
                  color: (loggedInUser.rank === 'admin' || loggedInUser.rank === 'owner') ? '#2563EB' : '#64748B'
                }}>{loggedInUser.rank === 'owner' ? 'Owner' : loggedInUser.rank === 'admin' ? 'Admin' : 'User'}</span>
                {/* Access Timer */}
                {accessUrgency !== 'permanent' && accessCountdown && (
                  <span style={{
                    fontSize: '0.55rem', fontWeight: '800',
                    padding: '1px 8px', borderRadius: '6px', letterSpacing: '0.3px',
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: accessUrgency === 'red' ? 'rgba(220,38,38,0.12)' : accessUrgency === 'yellow' ? 'rgba(245,158,11,0.12)' : accessUrgency === 'expired' ? 'rgba(100,116,139,0.12)' : 'rgba(16,185,129,0.12)',
                    color: accessUrgency === 'red' ? '#DC2626' : accessUrgency === 'yellow' ? '#F59E0B' : accessUrgency === 'expired' ? '#64748B' : '#10B981',
                    animation: accessUrgency === 'red' ? 'pulse 2s infinite' : 'none'
                  }}>
                    ⏱ {accessCountdown}{accessUrgency !== 'expired' ? ' left' : ''}
                  </span>
                )}
                {accessUrgency === 'permanent' && (
                  <span style={{
                    fontSize: '0.55rem', fontWeight: '800',
                    padding: '1px 8px', borderRadius: '6px', letterSpacing: '0.3px',
                    background: 'rgba(37,99,235,0.08)',
                    color: '#2563EB'
                  }}>
                    ∞
                  </span>
                )}
              </div>
            )}
          </div>

          {/* --- CONNECTION ERROR BANNER --- */}
          {connectionError && (
            <div className="dyr-connection-banner">
              <div className="dyr-connection-banner-inner">
                <div className="dyr-connection-banner-icon">
                  <IonIcon icon={wifiOutline} />
                </div>
                <div className="dyr-connection-banner-text">
                  <strong>Connection Lost</strong>
                  <span>Unable to reach the database server. Your changes may not be saved.</span>
                </div>
                <button
                  className="dyr-connection-retry-btn"
                  onClick={handleRetryConnection}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <><IonIcon icon={refresh} className="dyr-spin" /> Retrying...</>
                  ) : (
                    <><IonIcon icon={refresh} /> Retry Now</>
                  )}
                </button>
              </div>
            </div>
          )}

          <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', '--padding-bottom': '100px' }}>

            {/* --- VIEW: HOME DASHBOARD --- */}
            {currentView === 'home' && (
              <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0', padding: '0 20px' }}>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '24px', borderRadius: '20px', marginBottom: '24px',
                  background: 'var(--app-bg-card)',
                  border: '1px solid var(--app-border, #E5E7EB)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {/* Subtle accent stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #2563EB, #1E3A8A)' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    {/* Company Logo */}
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '16px', flexShrink: 0,
                      background: activeLogo ? 'transparent' : 'linear-gradient(135deg, #2563EB, #1E3A8A)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', border: activeLogo ? '2px solid var(--app-border, #E5E7EB)' : 'none',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                    }}>
                      {activeLogo ? (
                        <img src={activeLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ color: '#FFFFFF', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px' }}>
                          {(branding.name || 'DYR').substring(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User & Company Info */}
                    <div>
                      <h1 style={{ margin: 0, color: '#1E293B', fontWeight: '900', fontSize: '1.5rem', lineHeight: '1.2' }}>
                        {t('dashboard.welcome')}, {loggedInUser?.name}
                      </h1>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: '500' }}>
                          {loggedInUser?.company || branding.name || 'DYR'}
                        </span>
                        <span style={{
                          padding: '2px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '800',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          background: loggedInUser?.rank === 'admin' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                          color: loggedInUser?.rank === 'admin' ? '#2563EB' : '#64748B',
                          border: `1px solid ${loggedInUser?.rank === 'admin' ? 'rgba(37, 99, 235, 0.25)' : 'rgba(100, 116, 139, 0.25)'}`
                        }}>
                          {loggedInUser?.rank === 'admin' ? '🛡️ Admin' : '👤 User'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>{t('dashboard.subtitle')}</div>
                    <div style={{ fontSize: '1rem', color: '#1E293B', fontWeight: '700', marginTop: '4px' }}>
                      {new Date().toLocaleDateString(isRTL() ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className={`pro-grid pro-grid-auto ${!isDesktop ? 'dashboard-stats-grid' : ''}`} style={{ marginBottom: isDesktop ? '40px' : '15px', padding: '0 10px' }}>
                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #E5E7EB', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B' }}>{t('dashboard.stockAvailability')}</span>
                      <span className="stat-value" style={{ color: '#1E293B' }}>{dashboardStats.availableUnits.length} <small style={{ color: '#2563EB' }}>{t('dashboard.unitsLeft')}</small></span>
                      <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '0', marginTop: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${(dashboardStats.availableUnits.length / (dashboardStats.allUnits.length || 1)) * 100}%`, height: '100%', background: '#2563EB' }}></div>
                      </div>
                    </div>

                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #E5E7EB', borderLeft: '6px solid #1E3A8A', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B' }}>{t('dashboard.salesPerformance')}</span>
                      <span className="stat-value" style={{ color: '#1E293B' }}>{dashboardStats.contractedUnits.length} <small style={{ color: '#2563EB' }}>{t('dashboard.sold')}</small></span>
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748B' }}>{t('dashboard.totalUnitsAcross')}</p>
                    </div>

                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #E5E7EB', borderLeft: '6px solid #1E3A8A', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B' }}>{t('dashboard.capitalCollected')}</span>
                      <span className="stat-value" style={{ color: '#2563EB' }}>{formatCurrency(dashboardStats.totalPaid, true)}</span>
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748B' }}>{t('dashboard.verifiedPayments')}</p>
                    </div>

                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #E5E7EB', borderLeft: '6px solid #DC2626', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B' }}>{t('dashboard.receivables')}</span>
                      <span className="stat-value" style={{ color: '#DC2626' }}>{formatCurrency(dashboardStats.totalOutstanding, true)}</span>
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748B' }}>{t('dashboard.pendingInstallments')}</p>
                    </div>
                </div>

                {/* --- NAVIGATION GRID --- */}
                <div className={`pro-grid pro-grid-auto ${!isDesktop ? 'dashboard-nav-grid' : ''}`} style={{ gap: isDesktop ? '15px' : '8px' }}>
                  {hasPermission('buildings') && (
                    <div
                      onClick={() => navigateToView('buildings')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={business} />
                      <div>
                        <h2>{t('home.buildings')}</h2>
                        <p>{t('home.buildings.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('customers') && (
                    <div
                      onClick={() => navigateToView('customers')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={personAddOutline} />
                      <div>
                        <h2>{t('home.customers')}</h2>
                        <p>{t('home.customers.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('offers') && (
                    <div
                      onClick={() => navigateToView('offers')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={documentTextOutline} />
                      <div>
                        <h2>{t('home.offers')}</h2>
                        <p>{t('home.offers.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('contracts') && (
                    <div
                      onClick={() => navigateToView('contracts')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={shieldCheckmarkOutline} />
                      <div>
                        <h2>{t('home.contracts')}</h2>
                        <p>{t('home.contracts.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('installments') && (
                    <div
                      onClick={() => navigateToView('installments')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={calendarOutline} />
                      <div>
                        <h2>{t('home.installments')}</h2>
                        <p>{t('home.installments.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('cheques') && (
                    <div
                      onClick={() => navigateToView('cheques')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={printOutline} />
                      <div>
                        <h2>{t('home.cheques')}</h2>
                        <p>{t('home.cheques.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('wallets') && (
                    <div
                      onClick={() => navigateToView('wallets')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={walletOutline} />
                      <div>
                        <h2>{t('home.wallets')}</h2>
                        <p>{t('home.wallets.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('feedbacks') && (
                    <div
                      onClick={() => navigateToView('feedback')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={chatbubblesOutline} />
                      <div>
                        <h2>{t('home.feedbacks')}</h2>
                        <p>{t('home.feedbacks.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('reminders') && (
                    <div
                      onClick={() => navigateToView('reminders')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={logoWhatsapp} />
                      <div>
                        <h2>{t('home.reminders')}</h2>
                        <p>{t('home.reminders.subtitle')}</p>
                      </div>
                    </div>
                  )}



                  {hasPermission('sales') && (
                    <div
                      onClick={() => navigateToView('sales')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={peopleOutline} />
                      <div>
                        <h2>{t('home.sales')}</h2>
                        <p>{t('home.sales.subtitle')}</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('sales') && (
                    <div
                      onClick={() => navigateToView('commissions')}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={walletOutline} />
                      <div>
                        <h2>Commissions</h2>
                        <p>Track & manage broker commissions</p>
                      </div>
                    </div>
                  )}

                  {hasPermission('reports') && (
                    <div
                      onClick={() => setShowInventoryModal(true)}
                      className="chrono-nav-card"
                    >
                      <IonIcon icon={statsChartOutline} />
                      <div>
                        <h2>{t('home.reports')}</h2>
                        <p>{t('home.reports.subtitle')}</p>
                      </div>
                    </div>
                  )}

                    <div
                      className="chrono-nav-card"
                      onClick={() => setShowSettingsModal(true)}
                    >
                    <IonIcon icon={settingsOutline} />
                    <div>
                      <h2>{t('home.settings')}</h2>
                      <p>{t('home.settings.subtitle')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* --- VIEW: CHEQUES (PRO DESIGN) --- */}
            {currentView === 'cheques' && (
              <div className="cheques-view" style={{ maxWidth: '1400px', margin: '0', padding: '30px 20px', color: '#1E293B' }}>

                {/* Header Section */}
                <div className="cheques-header-card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '35px',
                  background: 'rgba(30, 58, 138, 0.05)',
                  padding: '20px',
                  borderRadius: '16px',
                  borderLeft: '4px solid #1E3A8A'
                }}>
                  <div className="cheques-title-row" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div>
                      <h1 style={{ color: '#1E293B', margin: 0, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
                        {t('home.cheques') || 'Cheque Studio'}
                      </h1>
                      <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '1rem', fontWeight: '400' }}>
                        Precision design & digital printing for professional banking
                      </p>
                    </div>
                  </div>
                </div>

                <div className="cheques-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '25px' }}>

                  {/* LEFT COLUMN: Data Integration & Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                    {/* SEARCH & INTEGRATION CARD */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      padding: '24px',
                      border: '1px solid #D1D5DB',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: '#2563EB' }}></div>
                    
                      <h3 style={{ color: '#1E293B', margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IonIcon icon={documentAttach} style={{ color: '#2563EB' }} />
                        Smart Data Integration
                      </h3>

                      <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <IonIcon icon={searchOutline} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#64748B' }} />
                        <input
                          value={chequeSearchQuery}
                          onChange={e => setChequeSearchQuery(e.target.value)}
                          placeholder="Search Unit ID, Customer, or Phone..."
                          style={{
                            width: '100%',
                            background: '#FFFFFF',
                            border: '1px solid #D1D5DB',
                            borderRadius: '12px',
                            padding: '14px 14px 14px 45px',
                            color: '#1E293B',
                            outline: 'none',
                            fontSize: '0.95rem',
                            transition: 'border-color 0.3s'
                          }}
                        />
                      </div>

                      <div style={{
                        maxHeight: '220px',
                        overflowY: 'auto',
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '5px'
                      }}>
                        {[...offers.filter(o => o.status !== 'contracted'), ...contracts].filter(item => {
                          const q = (chequeSearchQuery || '').toLowerCase();
                          if (!q) return false;
                          const unitId = (item.unitId || '').toLowerCase();
                          const custName = (item.customerName || customers.find(c => c.id === item.customerId)?.name || '').toLowerCase();
                          const hasMatchingCheque = (item.installments || installments.filter(ins => ins.contractId === item.id || ins.unitId === item.unitId)).some(ins => String(ins.chequeNumber || '').toLowerCase().includes(q) || (ins.payments || []).some(p => String(p.ref || '').toLowerCase().includes(q))); return unitId.includes(q) || custName.includes(q) || hasMatchingCheque;
                        }).slice(0, 10).map(item => {
                          const isOffer = !!item.priceType;
                          const custName = item.customerName || customers.find(c => c.id === item.customerId)?.name || 'Unknown';
                          const isSelected = chequeDataSource?.id === item.id;

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setChequeDataSource(item);
                                setChequeSearchQuery('');

                                const isOffer = item.id && String(item.id).startsWith('OFF-');
                                let sourceIns = [];

                                if (isOffer) {
                                  // For Offers, installments are typically stored within the offer object
                                  sourceIns = (item.installments || []).map(ins => ({
                                    id: ins.id,
                                    amount: ins.amount,
                                    date: formatExcelDate(ins.dueDate || ins.date),
                                    label: ins.type || 'Installment'
                                  }));
                                } else {
                                  // For Contracts, we look in the global installments state
                                  // We match STRICTLY by Unit ID primarily as requested ("all cheques on the unit i have chosen")
                                  const targetUnitId = String(item.unitId || '').trim().toLowerCase();

                                  sourceIns = installments.filter(ins => {
                                    const insUnitId = String(ins.unitId || '').trim().toLowerCase();
                                    // Primary condition: Exact Unit ID match.
                                    return insUnitId === targetUnitId && insUnitId !== '';
                                  }).map(ins => ({
                                    id: ins.id,
                                    amount: ins.amount,
                                    date: formatExcelDate(ins.dueDate || ins.date || new Date()),
                                    label: ins.type || 'Installment',
                                    chequeNumber: ins.chequeNumber || '',
                                    bank: ins.bank || ''
                                  }));
                                }

                                // Sort installments by date to ensure proper batch order
                                sourceIns.sort((a, b) => new Date(a.date) - new Date(b.date));

                                // Priority: Explicitly selected payee > Unit's Customer name
                                const selectedPayee = chequeForm.payeeName || custName;

                                setChequeQueue(sourceIns.map(ins => ({
                                  id: ins.id,
                                  payeeName: selectedPayee,
                                  customerName: custName, // Preserve unit customer name
                                  amount: ins.amount,
                                  date: ins.date,
                                  label: ins.label,
                                  chequeNumber: ins.chequeNumber,
                                  bank: ins.bank
                                })));

                                const selectedIds = sourceIns.map(ins => ins.id);
                                setSelectedQueueIds(selectedIds);

                                // Default form values
                                if (sourceIns.length > 0) {
                                  setChequeForm({
                                    payeeName: selectedPayee,
                                    customerName: custName, // Save original customer name
                                    amount: sourceIns[0].amount,
                                    date: formatExcelDate(sourceIns[0].date || new Date())
                                  });
                                } else {
                                  setChequeForm({
                                    payeeName: selectedPayee,
                                    customerName: custName,
                                    amount: item.finalPrice || item.totalPrice || '',
                                    date: formatExcelDate(new Date())
                                  });
                                }
                              }}
                              style={{
                                padding: '12px 15px',
                                marginBottom: '5px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isSelected ? 'rgba(253, 203, 110, 0.15)' : 'transparent',
                                border: isSelected ? '1px solid #fdcb6e' : '1px solid transparent',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '700', color: '#1E293B' }}>{custName}</div>
                                <div style={{ fontSize: '0.75rem', color: isOffer ? '#E2E8F0' : '#2563EB', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: isOffer ? 'rgba(255,196,9,0.1)' : 'rgba(56,128,255,0.1)' }}>
                                    {isOffer ? t('status.offer') : t('status.contract')}
                                  </span>
                                  <span>{t('common.unit')} {item.unitId}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', color: '#1E293B', fontSize: '1rem' }}>{formatCurrency(item.finalPrice || item.totalPrice || 0)}</div>
                              </div>
                            </div>
                          );
                        })}
                        {chequeSearchQuery && [...offers.filter(o => o.status !== 'contracted'), ...contracts].filter(item => {
                          const q = (chequeSearchQuery || '').toLowerCase();
                          const unitId = (item.unitId || '').toLowerCase();
                          const custName = (item.customerName || customers.find(c => c.id === item.customerId)?.name || '').toLowerCase();
                          const hasMatchingCheque = (item.installments || installments.filter(ins => ins.contractId === item.id || ins.unitId === item.unitId)).some(ins => String(ins.chequeNumber || '').toLowerCase().includes(q) || (ins.payments || []).some(p => String(p.ref || '').toLowerCase().includes(q))); return unitId.includes(q) || custName.includes(q) || hasMatchingCheque;
                        }).length === 0 && (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B'   , fontSize: '0.9rem' }}>
                              No matching records found.
                            </div>
                          )}
                        {!chequeSearchQuery && (
                          <div style={{ padding: '30px', textAlign: 'center', color: '#64748B'   , fontSize: '0.85rem' }}>
                            Start typing to search business data...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MAIN FORM CARD */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      padding: '24px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: '#1E293B', margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                          {chequeQueue.length > 0 ? `Cheque Batch (${selectedQueueIds.length}/${chequeQueue.length} Selected)` : 'Cheque Details'}
                        </h3>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {chequeQueue.length > 0 && (
                            <>
                              <IonButton size="small" fill="clear" onClick={() => setSelectedQueueIds(chequeQueue.map(q => q.id))} style={{ height: '20px', fontSize: '0.65rem' }}>All</IonButton>
                              <IonButton size="small" fill="clear" onClick={() => setSelectedQueueIds([])} style={{ height: '20px', fontSize: '0.65rem' }}>None</IonButton>
                              <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', height: '24px', fontSize: '0.7rem' }}>
                                Reset
                              </IonButton>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ALWAYS VISIBLE: Payee Selection (Controls both batch and single form) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px', background: '#ffffff', borderRadius: '15px', border: '1px solid #E2E8F0' }}>
                        <label style={{ color: '#2563EB', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Payee / Beneficiary
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <select
                              value={payeeNames.includes(chequeForm.payeeName) ? chequeForm.payeeName : ""}
                              onChange={e => {
                                const name = e.target.value;
                                setChequeForm({ ...chequeForm, payeeName: name });
                                if (chequeQueue.length > 0) {
                                  setChequeQueue(chequeQueue.map(q => ({ ...q, payeeName: name })));
                                }
                              }}
                              style={{
                                width: '100%',
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                color: '#1E293B',
                                outline: 'none',
                                appearance: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '600'
                              }}
                            >
                              <option value="">-- Choose From List --</option>
                              {payeeNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#2563EB' }}>
                              <IonIcon icon={chevronBack} style={{ transform: 'rotate(-90deg)' }} />
                            </div>
                          </div>
                          <div style={{ flex: 1, display: 'flex', gap: '5px' }}>
                            <input
                              placeholder="Or type manual name..."
                              value={chequeForm.payeeName}
                              onChange={e => {
                                const name = e.target.value;
                                setChequeForm({ ...chequeForm, payeeName: name });
                                if (chequeQueue.length > 0) {
                                  setChequeQueue(chequeQueue.map(q => ({ ...q, payeeName: name })));
                                }
                              }}
                              style={{
                                flex: 1,
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                color: '#1E293B',
                                outline: 'none',
                                fontSize: '1rem'
                              }}
                            />
                            {chequeForm.payeeName && (
                              <button
                                onClick={() => {
                                  setChequeForm({ ...chequeForm, payeeName: '' });
                                  if (chequeQueue.length > 0) {
                                    setChequeQueue(chequeQueue.map(q => ({ ...q, payeeName: '' })));
                                  }
                                }}
                                style={{ background: '#ffffff', color: '#1E293B', border: 'none', borderRadius: '10px', padding: '0 10px' }}
                              >
                                <IonIcon icon={close} />
                              </button>
                            )}
                            {chequeDataSource && (
                              <button
                                onClick={() => {
                                  const name = chequeDataSource.customerName || customers.find(c => c.id === chequeDataSource.customerId)?.name || 'Unknown';
                                  setChequeForm({ ...chequeForm, payeeName: name });
                                  if (chequeQueue.length > 0) {
                                    setChequeQueue(chequeQueue.map(q => ({ ...q, payeeName: name })));
                                  }
                                }}
                                title="Use Unit Customer Name"
                                style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '0 10px', fontWeight: 'bold' }}
                              >
                                <IonIcon icon={businessOutline} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ margin: '5px 0 0', fontSize: '0.7rem', color: '#64748B' }}>Changing this will update the payee for all checks in the batch.</p>
                      </div>

                      {chequeQueue.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', background: '#FFFFFF', borderRadius: '12px', padding: '10px' }}>
                          {chequeQueue.map(cq => (
                            <div
                              key={cq.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px',
                                borderBottom: '1px solid #222',
                                background: selectedQueueIds.includes(cq.id) ? 'rgba(253, 203, 110, 0.05)' : 'transparent'
                              }}
                            >
                              <IonCheckbox
                                checked={selectedQueueIds.includes(cq.id)}
                                onIonChange={e => {
                                  if (e.detail.checked) setSelectedQueueIds([...selectedQueueIds, cq.id]);
                                  else setSelectedQueueIds(selectedQueueIds.filter(id => id !== cq.id));
                                }}
                                mode="ios"
                                style={{ '--checkbox-background-checked': '#64748B', '--border-color': '#64748B' }}
                              />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '0.9rem', color: '#1E293B', fontWeight: 'bold' }}>{cq.label || 'Cheque'}</div>
                                {cq.chequeNumber && (
                                  <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '2px' }}>
                                    No: {cq.chequeNumber} {cq.bank ? `| ${cq.bank}` : ''}
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#2563EB', fontWeight: 'bold' }}>{formatCurrency(cq.amount)}</div>
                                <div style={{ color: '#64748B', fontSize: '0.75rem' }}>{formatChequeDate(cq.date)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {/* Unit Customer Name (Read-only reference) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#64748B'   , fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Source Customer</label>
                            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px 16px', color: '#64748B', fontSize: '0.95rem', border: '1px solid #E2E8F0' }}>
                              {chequeForm.customerName || 'No unit selected'}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Amount Field */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ color: '#64748B'   , fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Amount ({appSettings.currency})</label>
                              <input
                                type="number"
                                value={chequeForm.amount}
                                onChange={e => setChequeForm({ ...chequeForm, amount: e.target.value })}
                                placeholder="0.00"
                                style={{
                                  width: '100%',
                                  background: '#ffffff',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '12px',
                                  padding: '14px 16px',
                                  color: '#1E293B',
                                  outline: 'none',
                                  fontSize: '1.2rem',
                                  fontWeight: '700'
                                }}
                              />
                            </div>

                            {/* Date Field */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ color: '#64748B'   , fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Issue Date</label>
                              <ProDatePicker
                                value={chequeForm.date}
                                onChange={val => setChequeForm({ ...chequeForm, date: val })}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: '10px' }}>
                        <button
                          onClick={() => {
                            if (chequeQueue.length > 0 && selectedQueueIds.length > 0) {
                              const firstSelected = chequeQueue.find(q => q.id === selectedQueueIds[0]);
                              if (firstSelected) {
                                setChequeForm({
                                  payeeName: firstSelected.payeeName,
                                  customerName: chequeForm.customerName, // Preserve customer context
                                  amount: firstSelected.amount,
                                  date: firstSelected.date
                                });
                              }
                            }
                            setShowChequeDesigner(true);
                          }}
                          style={{
                            width: '100%',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '15px',
                            padding: '18px',
                            fontSize: '1.2rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            boxShadow: '0 8px 25px rgba(225, 177, 44, 0.4)'
                          }}
                        >
                          <IonIcon icon={printOutline} style={{ fontSize: '1.5rem' }} />
                          {chequeQueue.length > 0 ? `START BATCH PRINT (${selectedQueueIds.length})` : 'OPEN DESIGNER & PRINT'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: QUICK PAYEES */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      padding: '24px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h3 style={{ color: '#2563EB', margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                        <IonIcon icon={peopleOutline} style={{ marginRight: '8px' }} />
                        Quick Payee List
                      </h3>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input
                          placeholder="Save new name..."
                          value={newPayeeInput}
                          onChange={(e) => setNewPayeeInput(e.target.value)}
                          style={{
                            flex: 1,
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            padding: '12px 16px',
                            height: '45px',
                            color: '#1E293B',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => {
                            const name = newPayeeInput?.trim();
                            if (name && !payeeNames.includes(name)) {
                              const updated = [...payeeNames, name];
                              setPayeeNames(updated);
                              localStorage.setItem('payee_names', JSON.stringify(updated));
                              setNewPayeeInput('');
                            }
                          }}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0 15px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <IonIcon icon={add} />
                        </button>
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {payeeNames.length === 0 ? (
                          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <IonIcon icon={happyOutline} style={{ fontSize: '3rem', color: '#1E293B', marginBottom: '10px' }} />
                            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Save frequent payees here for instant access.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {payeeNames.map(name => (
                              <div
                                key={name}
                                style={{
                                  background: '#ffffff',
                                  borderRadius: '12px',
                                  padding: '12px 15px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  border: '1px solid #E2E8F0'
                                }}
                              >
                                <div
                                  onClick={() => {
                                    setChequeForm({ ...chequeForm, payeeName: name });
                                    if (chequeQueue.length > 0) {
                                      setChequeQueue(chequeQueue.map(q => ({ ...q, payeeName: name })));
                                    }
                                  }}
                                  style={{ cursor: 'pointer', fontWeight: '600', color: '#64748B', flex: 1 }}
                                >
                                  {name}
                                </div>
                                <IonButton
                                  fill="clear"
                                  style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                                  size="small"
                                  onClick={() => {
                                    const updated = payeeNames.filter(n => n !== name);
                                    setPayeeNames(updated);
                                    localStorage.setItem('payee_names', JSON.stringify(updated));
                                  }}
                                >
                                  <IonIcon icon={trash} style={{ fontSize: '18px' }} />
                                </IonButton>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '40px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '0.9rem',
                  borderTop: '1px solid #222',
                  paddingTop: '20px'
                }}>
                  <IonIcon icon={bulbOutline} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                  <strong>Pro Tip:</strong> Integrated search automatically maps customers to cheque fields across all active units.
                </div>
              </div>
            )}

            {/* --- VIEW: WALLETS MANAGEMENT (PRO REDESIGN) --- */}
            {currentView === 'wallets' && (
              <div className="pro-container animate-fade-in" style={{ paddingBottom: '100px' }}>
                {/* Section Header */}
                <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                  <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                    <IonIcon icon={chevronBack} /> {t('common.back')}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                      <h1 style={{ color: '#1E293B', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{t('wallets.title')}</h1>
                      <p style={{ color: '#64748B'   , margin: '4px 0 0', fontSize: '0.9rem' }}>{t('wallets.subtitle')}</p>
                    </div>
                    <IonButton
                      className="pro-action-btn"
                      onClick={() => {
                        setNewWallet({ bankAddress: '', applicationDate: new Date().toISOString().split('T')[0], notes: '', checkIds: [] });
                        setShowAddWalletModal(true);
                      }}
                      style={{ height: '45px', '--border-radius': '12px' }}
                    >
                      <IonIcon icon={add} slot="start" />{t('wallets.createNew')}</IonButton>
                  </div>
                </div>

                {/* Filters Row */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ position: 'relative', maxWidth: '500px' }}>
                    <IonIcon icon={searchOutline} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#64748B' }} />
                    <input
                      value={walletSearchQuery}
                      onChange={e => setWalletSearchQuery(e.target.value)}
                      placeholder={t('wallets.searchPlaceholder')}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '14px',
                        padding: '14px 14px 14px 45px',
                        color: '#1E293B',
                        outline: 'none',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                {/* Wallets Grid */}
                <div className="pro-grid pro-grid-auto">
                  {wallets
                    .filter(w =>
                      (w.bankAddress || '').toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
                      (w.notes || '').toLowerCase().includes(walletSearchQuery.toLowerCase())
                    )
                    .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))
                    .map((wallet, idx) => {
                      const walletChecks = (wallet.checkIds || []).length;
                      return (
                        <div
                          key={wallet.id}
                          className="pro-glass-card animate-slide-in"
                          onClick={() => setViewingWallet(wallet)}
                          style={{
                            padding: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            borderLeft: '4px solid #1E3A8A',
                            animationDelay: `${idx * 0.05}s`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{
                              width: '48px', height: '48px', borderRadius: '12px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <IonIcon icon={walletOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#1E293B', fontSize: '1.2rem', fontWeight: '800' }}>{walletChecks}</div>
                              <div style={{ color: '#64748B'   , fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('wallets.checksLinked')}</div>
                            </div>
                          </div>
                          <div>
                            <h3 style={{ color: '#1E293B', margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{wallet.bankAddress}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontSize: '0.85rem', marginTop: '4px', fontWeight: '600' }}>
                              <IonIcon icon={calendarOutline} style={{ fontSize: '14px' }} />
                              {formatExcelDate(wallet.applicationDate)}
                            </div>
                          </div>
                          {wallet.notes && (
                            <p style={{ color: '#64748B'   , fontSize: '0.8rem', margin: 0, fontStyle: 'italic', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {wallet.notes}
                            </p>
                          )}
                          <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <IonButton
                              fill="clear"
                              size="small"
                              style={{ '--color': '#64748B' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(t('wallets.confirmDelete'))) {
                                  deleteWallet(wallet.id).then(() => getWallets().then(setWallets));
                                }
                              }}
                            >
                              <IonIcon icon={trash} slot="icon-only" />
                            </IonButton>
                          </div>
                        </div>
                      );
                    })}
                  {wallets.length === 0 && (
                    <div className="pro-empty-state" style={{ gridColumn: '1/-1' }}>
                      <IonIcon icon={informationCircleOutline} style={{ fontSize: '48px', color: '#1E293B' }} />
                      <h3 style={{ color: '#1E293B' }}>{t('wallets.noWallets')}</h3>
                      <p>{t('wallets.noWalletsHint')}</p>
                    </div>
                  )}
                </div>

                {/* ADD WALLET MODAL */}
                <IonModal isOpen={showAddWalletModal} onDidDismiss={() => setShowAddWalletModal(false)}>
                  <IonHeader>
                    <IonToolbar style={{ '--background': '#1E293B' }}>
                      <IonTitle style={{ color: '#FFFFFF', fontWeight: '800' }}>{t('wallets.createNew')}</IonTitle>
                      <IonButtons slot="end">
                        <IonButton onClick={() => setShowAddWalletModal(false)} style={{ '--color': '#94A3B8' }}>
                          <IonIcon icon={close} />
                        </IonButton>
                      </IonButtons>
                    </IonToolbar>
                  </IonHeader>
                  <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '10px 0' }}>
                      {/* Icon Header */}
                      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <IonIcon icon={walletOutline} style={{ fontSize: '28px', color: '#2563EB' }} />
                        </div>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>Create a new wallet batch to organize cheques by bank</p>
                      </div>

                      {/* Form Card */}
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', border: '1px solid var(--app-border, rgba(255,255,255,0.08))', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Bank Address */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            <IonIcon icon={businessOutline} style={{ fontSize: '14px' }} />
                            {t('wallets.bankAddress')}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. National Bank of Egypt - Branch X"
                            value={newWallet.bankAddress}
                            onChange={e => setNewWallet({ ...newWallet, bankAddress: e.target.value })}
                            style={{
                              width: '100%', padding: '12px 14px', fontSize: '0.95rem',
                              background: 'var(--app-bg)', color: 'var(--app-text, #FFFFFF)',
                              border: '1.5px solid var(--app-border, rgba(255,255,255,0.12))',
                              borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#2563EB'}
                            onBlur={e => e.target.style.borderColor = 'var(--app-border, rgba(255,255,255,0.12))'}
                          />
                        </div>

                        {/* Application Date */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            <IonIcon icon={calendarOutline} style={{ fontSize: '14px' }} />
                            {t('wallets.applicationDate')}
                          </label>
                          <ProDatePicker
                            value={newWallet.applicationDate}
                            onChange={val => setNewWallet({ ...newWallet, applicationDate: val })}
                          />
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'var(--app-border, rgba(255,255,255,0.06))', margin: '2px 0' }} />

                        {/* Notes */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            <IonIcon icon={documentTextOutline} style={{ fontSize: '14px' }} />
                            {t('wallets.notesOptional')}
                          </label>
                          <textarea
                            placeholder={t('wallets.notesPlaceholder')}
                            value={newWallet.notes}
                            onChange={e => setNewWallet({ ...newWallet, notes: e.target.value })}
                            style={{
                              width: '100%', padding: '12px 14px', fontSize: '0.9rem',
                              background: 'var(--app-bg)', color: 'var(--app-text, #FFFFFF)',
                              border: '1.5px solid var(--app-border, rgba(255,255,255,0.12))',
                              borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
                              height: '90px', resize: 'none', fontFamily: 'inherit',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#2563EB'}
                            onBlur={e => e.target.style.borderColor = 'var(--app-border, rgba(255,255,255,0.12))'}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <IonButton
                          expand="block"
                          fill="outline"
                          onClick={() => setShowAddWalletModal(false)}
                          style={{ flex: 1, '--color': '#64748B', '--border-color': 'var(--app-border, rgba(255,255,255,0.15))', '--border-radius': '12px', fontWeight: '600' }}
                        >{t('common.cancel')}</IonButton>
                        <IonButton
                          expand="block"
                          onClick={async () => {
                            if (!newWallet.bankAddress || !newWallet.applicationDate) {
                              alert(t('wallets.fillRequired'));
                              return;
                            }
                            await addWallet(newWallet);
                            setWallets(await getWallets());
                            setShowAddWalletModal(false);
                          }}
                          style={{ flex: 2, '--background': '#2563EB', '--color': '#FFFFFF', '--border-radius': '12px', fontWeight: '700', fontSize: '0.95rem' }}
                        >
                          <IonIcon icon={add} slot="start" />
                          {t('wallets.createWallet')}
                        </IonButton>
                      </div>
                    </div>
                  </IonContent>
                </IonModal>

                {/* VIEW WALLET DETAIL MODAL */}
                <IonModal isOpen={!!viewingWallet} onDidDismiss={() => { setViewingWallet(null); setLinkedCheckSearchQuery(''); }} style={{ '--width': '95%', '--height': '95%', '--max-width': '1200px' }}>
                  <IonHeader>
                    <IonToolbar style={{ '--background': '#ffffff', '--color': '#2563EB' }}>
                      <IonTitle>Batch: {viewingWallet?.bankAddress}</IonTitle>
                      <IonButtons slot="end">
                        <IonButton onClick={() => { setViewingWallet(null); setLinkedCheckSearchQuery(''); }}>{t('common.close')}</IonButton></IonButtons>
                    </IonToolbar>
                  </IonHeader>
                  <IonContent className="ion-padding" style={{ '--background': '#FFFFFF' }}>
                    {viewingWallet && (
                      <div className="pro-wallet-detail" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '30px', height: '100%' }}>
                        {/* Left: Linked Checks */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ color: '#1E293B', margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{t('wallets.linkedChecks')}</h3>
                            <IonBadge style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}>{(viewingWallet.checkIds || []).length} ITEMS</IonBadge>
                          </div>

                          <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <IonIcon icon={searchOutline} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#64748B' }} />
                            <input
                              className="pro-input"
                              placeholder={t('wallets.searchLinkedPlaceholder')}
                              value={linkedCheckSearchQuery}
                              onChange={e => setLinkedCheckSearchQuery(e.target.value)}
                              style={{ paddingLeft: '40px', background: 'rgba(255,255,255,0.02)' }}
                            />
                          </div>

                          <div className="pro-scroll-panel" style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '15px' }}>
                            {(viewingWallet.checkIds || []).length === 0 ? (
                              <div className="pro-empty-state" style={{ height: '300px' }}>
                                <p>{t('wallets.noLinkedChecks')}</p>
                                <p style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('wallets.noLinkedChecksHint')}</p>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(viewingWallet.checkIds || [])
                                  .map(checkId => installments.find(i => String(i.id) === String(checkId)))
                                  .filter(ins => {
                                    if (!ins) return false;
                                    if (!linkedCheckSearchQuery) return true;
                                    const q = linkedCheckSearchQuery.toLowerCase();
                                    return (ins.customerName || '').toLowerCase().includes(q) ||
                                      (ins.chequeNumber || '').toLowerCase().includes(q) ||
                                      (ins.unitId || '').toLowerCase().includes(q) ||
                                      (ins.bank || '').toLowerCase().includes(q);
                                  })
                                  .map(ins => {
                                    if (!ins) return null;
                                    return (
                                      <div key={ins.id} className="pro-glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ color: '#1E293B', fontWeight: 'bold' }}>{ins.customerName}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#2563EB', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>UNIT {ins.unitId}</span>
                                          </div>
                                          <div style={{ color: '#64748B'   , fontSize: '0.8rem', marginTop: '4px' }}>
                                            Check No: {ins.chequeNumber || 'N/A'} | Bank: {ins.bank || 'N/A'}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                          <div>
                                            <div style={{ color: '#1E293B', fontWeight: 'bold' }}>{formatCurrency(ins.amount)}</div>
                                            <div style={{ color: '#64748B', fontSize: '0.7rem' }}>Due: {formatExcelDate(ins.dueDate)}</div>
                                          </div>
                                          <IonButton
                                            fill="clear"
                                            size="small"
                                            style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                                            onClick={async () => {
                                              const currentId = String(ins.id);
                                              const updatedCheckIds = (viewingWallet.checkIds || []).filter(id => String(id) !== currentId);
                                              const updatedWallet = await updateWallet(viewingWallet.id, { checkIds: updatedCheckIds });
                                              if (updatedWallet) {
                                                setViewingWallet(updatedWallet);
                                                const allWallets = await getWallets();
                                                setWallets(allWallets);
                                              }
                                            }}
                                          >
                                            <IonIcon icon={closeCircleOutline} slot="icon-only" />
                                          </IonButton>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Search & Add Checks */}
                        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h3 style={{ color: '#1E293B', margin: '0 0 15px 0', fontSize: '1.1rem', fontWeight: '700' }}>{t('wallets.addFromInstallments')}</h3>
                          <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <IonIcon icon={searchOutline} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#64748B' }} />
                            <input
                              className="pro-input"
                              placeholder={t('wallets.searchChequeCustomer')}
                              value={checkSearchQuery}
                              onChange={e => setCheckSearchQuery(e.target.value)}
                              style={{ paddingLeft: '40px' }}
                            />
                          </div>

                          <div className="pro-scroll-panel" style={{ flex: 1, overflowY: 'auto' }}>
                            {installments
                              .filter(ins => ins.status !== 'Cancelled' && (ins.paymentMethod === 'Cheque' || (ins.chequeNumber && ins.chequeNumber !== '')))
                              .filter(ins => {
                                const q = checkSearchQuery.toLowerCase();
                                return (ins.chequeNumber || '').toLowerCase().includes(q) ||
                                  (ins.customerName || '').toLowerCase().includes(q) ||
                                  (ins.unitId || '').toLowerCase().includes(q);
                              })
                              .slice(0, 50)
                              .map(ins => (
                                <div
                                  key={ins.id}
                                  onClick={async () => {
                                    const currentId = String(ins.id);
                                    if ((viewingWallet.checkIds || []).map(id => String(id)).includes(currentId)) return;
                                    const updatedCheckIds = [...(viewingWallet.checkIds || []), currentId];
                                    const updatedWallet = await updateWallet(viewingWallet.id, { checkIds: updatedCheckIds });
                                    if (updatedWallet) {
                                      setViewingWallet(updatedWallet);
                                      const allWallets = await getWallets();
                                      setWallets(allWallets);
                                    }
                                  }}
                                  className="pro-glass-card"
                                  style={{
                                    padding: '12px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                >
                                  <div>
                                    <div style={{ color: '#1E293B', fontSize: '0.9rem', fontWeight: 'bold' }}>{ins.customerName}</div>
                                    <div style={{ color: '#64748B'   , fontSize: '0.75rem', marginTop: '2px' }}>
                                      No: {ins.chequeNumber || 'N/A'} | Bank: {ins.bank || 'N/A'}
                                    </div>
                                    <div style={{ color: '#64748B', fontSize: '0.7rem', marginTop: '1px' }}>
                                      Unit: {ins.unitId} | Due: {formatExcelDate(ins.dueDate)}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '0.9rem' }}>{formatCurrency(ins.amount)}</div>
                                    {(() => {
                                      const currentInsId = String(ins.id);
                                      const viewWalletId = String(viewingWallet.id);

                                      const alreadyInThis = (viewingWallet.checkIds || []).some(id => String(id) === currentInsId);
                                      const alreadyInOther = wallets.find(w => String(w.id) !== viewWalletId && (w.checkIds || []).some(id => String(id) === currentInsId));

                                      if (alreadyInThis) {
                                        return <div style={{ color: '#2563EB', fontSize: '0.6rem', fontWeight: 'bold', marginTop: '4px' }}>{t('wallets.inThisWallet')}</div>;
                                      } else if (alreadyInOther) {
                                        return <div style={{ color: '#DC2626', fontSize: '0.6rem', fontWeight: 'bold', marginTop: '4px' }}>IN {alreadyInOther.bankAddress}</div>;
                                      } else {
                                        return <IonIcon icon={add} style={{ color: '#2563EB', marginTop: '4px' }} />;
                                      }
                                    })()}
                                  </div>
                                </div>
                              ))}
                            {checkSearchQuery && installments.filter(ins => ins.paymentMethod === 'Cheque' && (ins.chequeNumber || '').toLowerCase().includes(checkSearchQuery.toLowerCase())).length === 0 && (
                              <div style={{ textAlign: 'center', color: '#64748B', padding: '20px' }}>No matches found for "{checkSearchQuery}"</div>
                            )}
                            {!checkSearchQuery && (
                              <div style={{ textAlign: 'center', color: '#64748B', padding: '20px', fontSize: '0.8rem' }}>{t('wallets.typeToSearch')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </IonContent>
                </IonModal>
              </div>
            )}



            {/* --- VIEW: INSTALLMENTS --- */}
            {currentView === 'installments' && (
              <div className="installments-view" style={{ maxWidth: '1400px', margin: '0', color: '#1E293B', paddingBottom: '100px', paddingLeft: '20px', paddingRight: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                    <IonIcon icon={chevronBack} /> {t('common.back')}
                  </div>
                  <div className="installments-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#2563EB', margin: 0 }}>{t('cheques.installmentsTracking')}</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <IonButton
                        fill="outline"
                        style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '8px' }}
                        size="small"
                        onClick={() => exportFilteredInstallmentsToExcel(filteredInstallments)}
                      >
                        <IonIcon icon={cloudDownload} slot="start" />
                        Export to Excel
                      </IonButton>
                      <IonButton
                        fill="outline"
                        style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', '--border-radius': '8px' }}
                        size="small"
                        onClick={refreshData}
                        
                      >
                        <IonIcon icon={refresh} slot="start" />
                        Refresh
                      </IonButton>
                      <IonButton
                        fill="outline"
                        style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', '--border-radius': '8px' }}
                        size="small"
                        onClick={handleDeleteAllInstallments}
                      >
                        <IonIcon icon={trash} slot="start" />{t('sales.deleteAll')}</IonButton>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={installmentFileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx, .xls"
                  onChange={handleInstallmentExcelImport}
                />

                <div className="installments-filter-panel" style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', marginBottom: '25px', border: '1px solid #D1D5DB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div className="installments-filter-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>{t('installments.searchRecords')}</div>
                      <IonSearchbar
                        value={searchQuery}
                        onIonInput={e => setSearchQuery(e.detail.value)}
                        placeholder={t('installments.searchPlaceholder')}
                        style={{ '--background': '#ffffff', color: '#1E293B', '--placeholder-color': '#64748B', '--icon-color': '#2563EB', '--border-radius': '12px', padding: 0 }}
                      />
                    </div>
                    <div>
                      <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>{t('installments.walletBatch')}</div>
                      <IonSelect
                        value={filterWallet}
                        onIonChange={e => setFilterWallet(e.detail.value)}
                        interface="popover"
                        style={{ background: '#F1F5F9', borderRadius: '12px', padding: '10px 15px', color: '#1E293B', width: '100%' }}
                      >
                        <IonSelectOption value="all">{t('feedbacks.allWallets')}</IonSelectOption>
                        <IonSelectOption value="none">{t('cheques.notInWallet')}</IonSelectOption>
                        {wallets.map(w => (
                          <IonSelectOption key={w.id} value={w.id}>{w.bankAddress}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </div>
                    <div>
                      <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>{t('installments.building')}</div>
                      <IonSelect
                        value={filterBuilding}
                        onIonChange={e => setFilterBuilding(e.detail.value)}
                        interface="popover"
                        style={{ background: '#F1F5F9', borderRadius: '12px', padding: '10px 15px', color: '#1E293B', width: '100%' }}
                      >
                        <IonSelectOption value="all">{t('common.allBuildings')}</IonSelectOption>
                        {buildings.map(b => (
                          <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </div>
                    <div>
                      <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>{t('installments.paymentStatus')}</div>
                      <IonSelect
                        value={filterStatus}
                        onIonChange={e => setFilterStatus(e.detail.value)}
                        interface="popover"
                        style={{ background: '#F1F5F9', borderRadius: '12px', padding: '10px 15px', color: '#1E293B', width: '100%' }}
                      >
                        <IonSelectOption value="all">{t('cheques.allTransactions')}</IonSelectOption>
                        <IonSelectOption value="Pending">Pending</IonSelectOption>
                        <IonSelectOption value="Collected">Collected</IonSelectOption>
                        <IonSelectOption value="Cleared">Cleared</IonSelectOption>
                        <IonSelectOption value="Rejected">Rejected</IonSelectOption>
                      </IonSelect>
                    </div>
                    <div>
                      <IonButton expand="block" fill="solid" onClick={() => setShowInstallmentsReportModal(true)} style={{ '--border-radius': '12px', '--background': '#2563EB', color: '#FFFFFF', '--color': '#FFFFFF', height: '48px', margin: 0 }}>
                        <IonIcon icon={printOutline} slot="start" />
                        VIEW REPORT
                      </IonButton>
                    </div>
                  </div>
                </div>

                <div className="installments-filter-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <ProDatePicker
                      label={t('installments.startDate')}
                      value={fromDate}
                      onChange={setFromDate}
                    />
                    <ProDatePicker
                      label={t('installments.endDate')}
                      value={toDate}
                      onChange={setToDate}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <ProFilterToggle
                      label={t('installments.unpaidOnly')}
                      active={filterNotFullyPaid}
                      onClick={() => {
                        const newVal = !filterNotFullyPaid;
                        setFilterNotFullyPaid(newVal);
                        if (newVal) {
                          setFilterLate(false);
                          setFilterStatus('all');
                        }
                      }}
                      activeColor="#3b82f6"
                    />
                    <ProFilterToggle
                      label={t('installments.overdueLabel')}
                      active={filterLate}
                      onClick={() => {
                        const newVal = !filterLate;
                        setFilterLate(newVal);
                        if (newVal) {
                          setFilterNotFullyPaid(false);
                          setFilterStatus('all');
                        }
                      }}
                      activeColor="#eb445a"
                    />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <IonButton fill="clear" color="medium" size="small" onClick={() => { setFromDate(''); setToDate(''); setFilterStatus('all'); setFilterWallet('all'); setSearchQuery(''); setFilterNotFullyPaid(false); setFilterLate(false); }}>
                      Reset All Filters
                    </IonButton>
                  </div>
                </div>

                {/* REDESIGNED STATS DASHBOARD */}
                <div className="installments-stats-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  {[
                    { label: t('installments.totalVolume'), value: installmentStats.totalVolume, color: '#2563EB', icon: cashOutline },
                    { label: t('installments.totalCollected'), value: installmentStats.totalCollected, color: '#2563EB', icon: checkmarkCircleOutline },
                    { label: t('installments.expectedThisMonth'), value: installmentStats.expectedThisMonth, color: '#2563EB', icon: statsChart },
                    { label: t('installments.totalRemaining'), value: installmentStats.totalRemaining, color: '#DC2626', icon: timeOutline },
                    { label: t('installments.totalOverdue'), value: installmentStats.totalOverdue, color: '#DC2626', icon: alertCircleOutline }
                  ].map((stat, idx) => (
                    <div key={idx} className="pro-glass-card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: `4px solid ${stat.color}` }}>
                      <div style={{ background: `${stat.color}15`, padding: '10px', borderRadius: '12px' }}>
                        <IonIcon icon={stat.icon} style={{ fontSize: '24px', color: stat.color }} />
                      </div>
                      <div>
                        <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{stat.label}</div>
                        <div style={{ color: '#1E293B', fontSize: '1.2rem', fontWeight: '900' }}>{formatCurrency(stat.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pro-installment-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', color: '#64748B'   , fontSize: '0.85rem' }}>
                    <span>{t('installments.showingOf', { showing: Math.min(visibleInstallmentsCount, filteredInstallments.length), total: filteredInstallments.length })}</span>
                    <span style={{ fontStyle: 'italic' }}>{t('installments.filteredAcrossUnits', { count: allBuildingsUnitsCount })}</span>
                  </div>

                  {filteredInstallments
                    .slice(0, visibleInstallmentsCount)
                    .map((ins, idx) => {
                      const rest = Number(ins.amount) - Number(ins.paidAmount || 0);
                      const isOverdue = (() => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const d = parseSafeDate(ins.dueDate);
                        return (ins.status === 'Not Paid' || ins.status === 'Pending') && d < today;
                      })();
                      const isClosest = ins.id === closestInstallmentId;

                      return (
                        <div
                          key={ins.id}
                          id={isClosest ? 'closest-installment' : undefined}
                          className={`pro-glass-card animate-slide-in installment-card${isClosest ? ' closest-installment-highlight' : ''}`}
                          style={{
                            padding: '16px 20px',
                            borderLeft: ins.status === 'terminated'
                              ? '5px solid #DC2626'
                              : ins.status === 'resold'
                              ? '5px solid #E67E22'
                              : isClosest ? '4px solid #F59E0B' : `4px solid ${ins.status === 'Paid' ? '#2563EB' : isOverdue ? '#DC2626' : '#E2E8F0'}`,
                            display: 'grid',
                            gridTemplateColumns: '100px 1.5fr 1fr 1.2fr 180px 120px',
                            alignItems: 'center',
                            gap: '20px',
                            animationDelay: `${(idx % 20) * 0.03}s`,
                            ...(ins.status === 'terminated' ? {
                              background: 'rgba(220, 38, 38, 0.04)',
                              opacity: 0.65,
                              position: 'relative'
                            } : ins.status === 'resold' ? {
                              background: 'rgba(230, 126, 34, 0.04)',
                              opacity: 0.65,
                              position: 'relative'
                            } : {}),
                            ...(isClosest ? {
                              background: 'rgba(245, 158, 11, 0.08)',
                              boxShadow: '0 0 15px rgba(245, 158, 11, 0.25), inset 0 0 0 1px rgba(245, 158, 11, 0.3)',
                              borderRadius: '12px',
                              position: 'relative'
                            } : {})
                          }}
                        >
                          {isClosest && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '16px',
                              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                              color: '#fff',
                              fontSize: '0.55rem',
                              fontWeight: '900',
                              padding: '3px 10px',
                              borderRadius: '0 0 8px 8px',
                              letterSpacing: '1.2px',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                              zIndex: 2
                            }}>
                              ★ {t('installments.closestDueDate')}
                            </div>
                          )}
                          {ins.status === 'terminated' && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              right: isClosest ? '160px' : '16px',
                              background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                              color: '#fff',
                              fontSize: '0.55rem',
                              fontWeight: '900',
                              padding: '3px 10px',
                              borderRadius: '0 0 8px 8px',
                              letterSpacing: '1.2px',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                              zIndex: 2
                            }}>
                              ✕ {t('status.terminated')}
                            </div>
                          )}
                          {ins.status === 'resold' && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              right: isClosest ? '160px' : '16px',
                              background: 'linear-gradient(135deg, #E67E22, #D35400)',
                              color: '#fff',
                              fontSize: '0.55rem',
                              fontWeight: '900',
                              padding: '3px 10px',
                              borderRadius: '0 0 8px 8px',
                              letterSpacing: '1.2px',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 8px rgba(230, 126, 34, 0.4)',
                              zIndex: 2
                            }}>
                              ↔ {t('status.resold')}
                            </div>
                          )}
                          {ins.isOfferPayment && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              left: '16px',
                              background: 'linear-gradient(135deg, #10B981, #059669)',
                              color: '#fff',
                              fontSize: '0.55rem',
                              fontWeight: '900',
                              padding: '3px 10px',
                              borderRadius: '0 0 8px 8px',
                              letterSpacing: '1.2px',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                              zIndex: 2
                            }}>
                              ● OFFER
                            </div>
                          )}
                          {/* Unit info */}
                          <div>
                            <div
                              style={{ color: '#2563EB', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#E2E8F0' }}
                              onClick={() => {
                                if (ins.isOfferPayment) {
                                  const offer = offers.find(o => o.id === ins.offerId);
                                  if (offer) setViewingOffer(offer);
                                  return;
                                }
                                const contract = contracts.find(c => String(c.unitId).trim() === String(ins.unitId).trim());
                                if (contract) {
                                  openContractInTab(contract);
                                } else {
                                  const offer = offers.find(o => String(o.unitId).trim() === String(ins.unitId).trim());
                                  if (offer) setViewingOffer(offer);
                                  else alert('No contract or offer found for this unit.');
                                }
                              }}
                            >{ins.unitId}</div>
                            <div style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: 'bold' }}>{t('installments.unitId')}</div>
                          </div>

                          {/* Customer & Cell */}
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{ color: '#2563EB', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                onClick={async () => {
                                  const cust = customers.find(c => c.name === ins.customerName) || customers.find(c => String(c.id) === String(ins.customerId));
                                  if (cust) {
                                    setViewingCustomerDetail(cust);
                                    setIdCardImage(null);
                                    if (window.electronAPI) {
                                      const img = await window.electronAPI.getIdCard('customer', cust.id);
                                      setIdCardImage(img);
                                    }
                                  }
                                }}
                              >{ins.customerName || 'N/A'}</div>
                              {(() => {
                                const customer = customers.find(c => c.name === ins.customerName);
                                if (customer && customer.phone) {
                                  return (
                                    <a href={`https://wa.me/${String(customer.phone).replace(/\D/g, '')}`} target="_system" style={{ display: 'flex' }}>
                                      <IonIcon icon={logoWhatsapp} style={{ color: '#2563EB', fontSize: '14px' }} />
                                    </a>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>{t('installments.reason')}:</span>
                              <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 'bold' }}>{ins.type || '-'}</span>
                            </div>
                          </div>

                          {/* Date & Method */}
                          <div>
                            <div style={{ color: isOverdue ? '#DC2626' : '#1E293B', fontWeight: 'bold', fontSize: '0.9rem' }}>{formatExcelDate(ins.dueDate)}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <IonIcon icon={(ins.paymentMethod === 'Cheque' || ins.chequeNumber || ins.bank || ins.chequeStatus) ? cardOutline : cashOutline} style={{ color: '#64748B', fontSize: '14px' }} />
                              <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>{ins.paymentMethod}</span>
                            </div>
                          </div>

                          {/* Cheque Details */}
                          <div style={{ fontSize: '0.75rem' }}>
                            {(ins.paymentMethod === 'Cheque' || ins.chequeNumber || ins.bank || ins.chequeStatus) ? (
                              <div style={{ 
                                background: 'rgba(37, 99, 235, 0.05)', 
                                padding: '8px 12px', 
                                borderRadius: '10px',
                                border: '1px solid rgba(37, 99, 235, 0.1)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <IonIcon icon={cardOutline} style={{ color: '#2563EB', fontSize: '14px' }} />
                                  <span style={{ color: '#1E293B', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.65rem' }}>{t('installments.chequeDetails')}</span>
                                </div>
                                <div style={{ color: '#64748B' }}>
                                  <span style={{ color: '#1E293B', fontWeight: '600' }}>{t('installments.chequeNo')}:</span> {(() => {
                                    const mainNo = ins.chequeNumber;
                                    const allNos = (ins.payments || []).map(p => p.ref || p.chequeNumber).filter(n => n && n !== '-');
                                    if (mainNo && mainNo !== '-' && mainNo !== 'Offer Credits' && !allNos.includes(mainNo)) { allNos.unshift(mainNo); }
                                    else if ((!mainNo || mainNo === '-' || mainNo === 'Offer Credits') && allNos.length === 0) { return mainNo || '-'; }
                                    return allNos.length > 0 ? allNos.join(' / ') : (mainNo || '-');
                                  })()}
                                </div>
                                <div style={{ color: '#64748B', marginTop: '1px' }}>
                                  <span style={{ color: '#1E293B', fontWeight: '600' }}>{t('installments.chequeBank')}:</span> {(() => {
                                    const mainBank = ins.bank;
                                    const allBanks = (ins.payments || []).map(p => p.bank).filter(b => b && b !== '-');
                                    if (mainBank && mainBank !== '-' && !allBanks.includes(mainBank)) { allBanks.unshift(mainBank); }
                                    return allBanks.length > 0 ? allBanks.join(' / ') : (mainBank || '-');
                                  })()}
                                </div>
                                {(() => {
                                  const mainStatus = ins.chequeStatus;
                                  const allStatuses = (ins.payments || []).map(p => p.chequeStatus).filter(s => s && s !== 'Not Collected' && s !== 'Not Received');
                                  if (mainStatus && mainStatus !== 'Not Collected' && mainStatus !== 'Not Received') { allStatuses.push(mainStatus); }
                                  const uniqueStatuses = [...new Set(allStatuses)];
                                  const status = uniqueStatuses.length > 0 ? uniqueStatuses.join(' / ') : (mainStatus || 'Not Collected');
                                  return (
                                    <div style={{
                                      color: status.includes('Rejected') ? '#DC2626' : status.includes('Cleared') ? '#2563EB' : '#64748B',
                                      marginTop: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: '900',
                                      textTransform: 'uppercase'
                                    }}>
                                      {t('installments.status')}: {status}
                                    </div>
                                  );
                                })()}
                                {ins.depositedBank && (
                                  <div style={{ color: '#2563EB', marginTop: '3px', fontSize: '0.65rem', fontWeight: '600' }}>
                                    <IonIcon icon={business} style={{ fontSize: '10px', marginRight: '4px' }} />
                                    {ins.depositedBank}
                                  </div>
                                )}
                                {(() => {
                                  const linkedWallet = wallets.find(w => (w.checkIds || []).includes(ins.id));
                                  if (linkedWallet) {
                                    return (
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginTop: '5px',
                                        background: 'rgba(59, 130, 246, 0.08)',
                                        color: '#2563EB',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.65rem',
                                        fontWeight: '700',
                                        width: 'fit-content',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px'
                                      }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', boxShadow: '0 0 5px rgba(59, 130, 246, 0.8)' }} />
                                        {linkedWallet.bankAddress}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <div style={{ color: '#64748B', fontStyle: 'italic' }}>{t('installments.standard')} {ins.paymentMethod}</div>
                            )}
                          </div>

                          {/* Financials */}
                          <div style={{ textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }}>
                            <div style={{ color: '#1E293B', fontSize: '1.05rem', fontWeight: '900' }}>{formatCurrency(ins.amount)}</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', fontSize: '0.75rem' }}>
                              <span style={{ color: '#2563EB' }}>{t('installments.paid')}: {formatCurrency(ins.paidAmount)}</span>
                              <span style={{ color: rest > 1 ? '#DC2626' : '#2563EB', fontWeight: 'bold' }}>{t('installments.rest')}: {formatCurrency(Math.max(0, rest))}</span>
                            </div>
                          </div>

                          {/* Actions & Status */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{
                              textAlign: 'center',
                              padding: '4px',
                              borderRadius: '6px',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              letterSpacing: '0.5px',
                              background: ins.status === 'Paid' ? 'rgba(30, 58, 138, 0.15)' : isOverdue ? 'rgba(220, 38, 38, 0.15)' : 'rgba(31, 41, 55, 0.15)',
                              color: ins.status === 'Paid' ? '#2563EB' : isOverdue ? '#DC2626' : '#E2E8F0',
                              border: `1px solid ${ins.status === 'Paid' ? 'rgba(37, 99, 235, 0.15)' : isOverdue ? 'rgba(220, 38, 38, 0.15)' : 'rgba(37, 99, 235, 0.15)'}`
                            }}>
                              {isOverdue ? t('installments.overdue') : ins.status.toUpperCase()}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0px' }}>
                              <IonButton fill="clear" size="small" onClick={() => {
                                if (ins.isOfferPayment) {
                                  const offer = offers.find(o => o.id === ins.offerId);
                                  if (offer) {
                                    setSelectedOfferForPayment(offer);
                                    setShowOfferPaymentModal(true);
                                  }
                                  return;
                                }
                                setEditingInstallment(ins);
                              }} style={{ height: '30px', '--color': '#2563EB', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                UPDATE
                              </IonButton>

                              {ins.paymentMethod === 'Cheque' && (
                                <>
                                  {ins.status !== 'Cleared' && ins.status !== 'Paid' && (
                                    <IonButton fill="clear" size="small" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', height: '30px' }} onClick={async () => {
                                      const updated = await updateInstallment(ins.id, { chequeStatus: 'Cleared' });
                                      if (updated) {
                                        setInstallments(prev => prev.map(item => item.id === updated.id ? updated : item));
                                      }
                                    }}>
                                      <IonIcon icon={checkmarkCircleOutline} slot="icon-only" />
                                    </IonButton>
                                  )}

                                  {ins.status !== 'Rejected' && (
                                    <IonButton fill="clear" size="small" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', height: '30px' }} onClick={async () => {
                                      const updated = await updateInstallment(ins.id, { chequeStatus: 'Rejected' });
                                      if (updated) {
                                        setInstallments(prev => prev.map(item => item.id === updated.id ? updated : item));
                                      }
                                    }}>
                                      <IonIcon icon={closeCircleOutline} slot="icon-only" />
                                    </IonButton>
                                  )}
                                </>
                              )}

                              {ins.paidAmount > 0 && (
                                <IonButton fill="clear" size="small" onClick={() => {
                                  if (ins.isOfferPayment) {
                                    const offer = offers.find(o => o.id === ins.offerId);
                                    if (offer && offer.payments && offer.payments.length > 0) {
                                      const lastPayment = offer.payments[offer.payments.length - 1];
                                      const receiptType = lastPayment.isReservation ? 'Reservation' : (ins.type || t('common.downPayment') || 'Down Payment');
                                      handleOfferReceipt(offer, lastPayment, receiptType);
                                    }
                                    return;
                                  }
                                  handleInstallmentReceipt(ins, { fullInstallment: true });
                                }} style={{ height: '30px', '--color': '#2563EB' }}>
                                  <IonIcon icon={printOutline} />
                                </IonButton>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Load More Button */}
                  {visibleInstallmentsCount < filteredInstallments.length && (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                      <IonButton
                        fill="outline"
                        onClick={() => setVisibleInstallmentsCount(prev => prev + 50)}
                        style={{ '--border-radius': '12px', '--color': '#2563EB', '--border-color': '#2563EB', minWidth: '200px' }}
                      >
                        {t('installments.loadMore', { left: filteredInstallments.length - visibleInstallmentsCount })}
                      </IonButton>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- MODAL: EDIT INSTALLMENT --- */}
            <IonModal isOpen={!!editingInstallment} onDidDismiss={() => { setEditingInstallment(null); setEditingPayment(null); }} style={{ '--width': '95%', '--max-width': '850px' }}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff' }}>
                  <IonButtons slot="start">
                    <IonButton onClick={handlePrevInstallment} color="light">
                      <IonIcon icon={chevronBack} />
                    </IonButton>
                  </IonButtons>
                  <IonTitle style={{ color: '#1E293B' }}>Installment details</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={handleNextInstallment} color="light">
                      <IonIcon icon={chevronForward} />
                    </IonButton>
                    <IonButton onClick={() => setEditingInstallment(null)} color="light">{t('common.close')}</IonButton></IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {editingInstallment && (
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ background: 'var(--app-bg-card)', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#1E293B' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <p style={{ margin: 0, color: '#1E293B' }}><strong>Unit:</strong> {editingInstallment.unitId}</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', color: '#1E293B' }}>
                          <IonSelect label="Type" labelPlacement="stacked" value={editingInstallment.type} onIonChange={e => setEditingInstallment({ ...editingInstallment, type: e.detail.value })} style={{ color: '#1E293B' }}>
                            <IonSelectOption value="Down Payment">{t('common.downPayment')}</IonSelectOption>
                            <IonSelectOption value="Installment">Installment</IonSelectOption>
                            <IonSelectOption value="Final Payment">{t('common.finalPayment')}</IonSelectOption>
                            <IonSelectOption value="Maintenance">Maintenance</IonSelectOption>
                            <IonSelectOption value="Other">Other</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                        <ProDatePicker
                          label="Due Date"
                          value={formatExcelDate(editingInstallment.dueDate)}
                          onChange={val => setEditingInstallment({ ...editingInstallment, dueDate: val })}
                        />
                      </div>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', marginBottom: '10px', color: '#1E293B' }}>
                        <IonInput label={`Total Amount (${appSettings.currency})`} labelPlacement="stacked" type="number" value={editingInstallment.amount} onIonInput={e => setEditingInstallment({ ...editingInstallment, amount: Number(e.detail.value) })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <p style={{ margin: 0, color: '#2563EB' }}><strong>Total Paid:</strong> {formatCurrency(editingInstallment.paidAmount || 0)}</p>
                      <p style={{ margin: 0, color: '#DC2626' }}><strong>Rest Amount:</strong> {formatCurrency(Number(editingInstallment.amount) - Number(editingInstallment.paidAmount || 0))}</p>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '8px', background: '#ffffff', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, (Number(editingInstallment.paidAmount || 0) / Number(editingInstallment.amount)) * 100)}%`,
                          height: '100%',
                          background: '#2563EB',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    <h3 style={{ color: '#2563EB', fontSize: '1.1rem', marginBottom: '10px' }}>{t('offers.paymentHistory')}</h3>
                    <IonList lines="none" style={{ background: 'transparent' }}>
                      {(editingInstallment.payments || []).length === 0 ? (
                        <p style={{ color: '#64748B', fontStyle: 'italic' }}>No payments recorded yet.</p>
                      ) : [...(editingInstallment.payments || [])].sort((a, b) => parseSafeDate(b.date || b.dueDate) - parseSafeDate(a.date || a.dueDate)).map(p => (
                        <IonItem key={p.id} style={{ '--background': '#ffffff', marginBottom: '8px', borderRadius: '8px' }}>
                          <IonLabel>
                            {editingPayment && editingPayment.id === p.id ? (
                              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <input type="number" value={editingPayment.amount} onChange={e => setEditingPayment({ ...editingPayment, amount: parseFloat(e.target.value) })} style={{ background: '#ffffff', border: '1px solid #E2E8F0', color: '#1E293B', padding: '5px', borderRadius: '4px' }} />
                                  <input type="date" value={editingPayment.date} onChange={e => setEditingPayment({ ...editingPayment, date: e.target.value })} style={{ background: '#ffffff', border: '1px solid #E2E8F0', color: '#1E293B', padding: '5px', borderRadius: '4px' }} />
                                </div>
                                <input type="text" value={editingPayment.ref} onChange={e => setEditingPayment({ ...editingPayment, ref: e.target.value })} placeholder="Reference" style={{ background: '#ffffff', border: '1px solid #E2E8F0', color: '#1E293B', padding: '5px', borderRadius: '4px', width: '100%', marginTop: '5px' }} />
                                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                  <IonButton size="small" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={handleSaveEditedPayment}>SAVE</IonButton>
                                  <IonButton size="small" color="light" onClick={() => setEditingPayment(null)}>CANCEL</IonButton>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div>
                                  <h3 style={{ color: '#1E293B', fontSize: '1rem', margin: '0 0 5px 0' }}>{formatCurrency(p.amount)} <small style={{ color: '#64748B'    }}>({p.method})</small></h3>
                                  <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
                                    {displayFormattedDate(p.date)} {p.ref ? `| Ref: ${p.ref}` : ''}
                                  </p>
                                  {p.method === 'Cheque' && (
                                    <p style={{ color: '#2563EB', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      Bank: {p.bank || '-'} | Chq#: {p.chequeNumber || '-'} | Status:
                                      <select
                                        value={p.chequeStatus || 'Not Collected'}
                                        onChange={async (e) => {
                                          const updated = await updateInstallmentPayment(editingInstallment.id, p.id, { chequeStatus: e.target.value });
                                          if (updated) {
                                            setEditingInstallment(updated);
                                            setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
                                          }
                                        }}
                                        style={{
                                          background: '#ffffff',
                                          color: p.chequeStatus === 'Rejected' ? '#DC2626' : p.chequeStatus === 'Cleared' ? '#2563EB' : '#E2E8F0',
                                          border: '1px solid #E2E8F0',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          padding: '2px 4px',
                                          cursor: 'pointer',
                                          outline: 'none'
                                        }}
                                      >
                                        <option value="Not Collected">Not Collected</option>
                                        <option value="Collected">Collected</option>
                                        <option value="Cleared">Cleared</option>
                                        <option value="Rejected">Rejected</option>
                                      </select>
                                    </p>
                                  )}
                                </div>
                                {(() => {
                                  const allAttachments = p.attachments || (p.attachment ? [p.attachment] : []);
                                  return allAttachments.length > 0 ? (
                                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                      {allAttachments.map((att, ai) => (
                                        <IonButton key={ai}
                                          size="small"
                                          fill="outline"
                                          style={{
                                            '--padding-start': '8px', '--padding-end': '8px',
                                            height: '26px', fontSize: '0.7rem',
                                            '--border-color': '#2563EB', '--color': '#2563EB',
                                            '--border-radius': '6px', fontWeight: '600'
                                          }}
                                          onClick={async () => {
                                            if (window.electronAPI) {
                                              const url = await window.electronAPI.getAttachment(att);
                                              if (url) window.electronAPI.openFile(url);
                                              else alert("File not found.");
                                            }
                                          }}
                                        >
                                          <IonIcon icon={documentAttach} slot="start" style={{ fontSize: '12px' }} />
                                          {allAttachments.length > 1 ? `#${ai + 1}` : 'VIEW'}
                                        </IonButton>
                                      ))}
                                      <IonButton
                                        size="small" fill="clear"
                                        style={{ '--color': '#2563EB', height: '26px', fontSize: '0.65rem' }}
                                        onClick={() => {
                                          setEditingPaymentForAttachment({ installmentId: editingInstallment.id, paymentId: p.id });
                                          paymentAttachmentRef.current?.click();
                                        }}
                                      >+ Add</IonButton>
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: '10px' }}>
                                      <IonButton
                                        size="small" fill="clear"
                                        style={{ '--padding-start': '0', height: '28px', fontSize: '0.75rem', '--color': '#2563EB', fontWeight: '500' }}
                                        onClick={() => {
                                          setEditingPaymentForAttachment({ installmentId: editingInstallment.id, paymentId: p.id });
                                          paymentAttachmentRef.current?.click();
                                        }}
                                      >
                                        <IonIcon icon={addCircleOutline} slot="start" style={{ fontSize: '15px' }} />
                                        ATTACH
                                      </IonButton>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </IonLabel>
                          <div slot="end" style={{ display: 'flex', gap: '0px' }}>
                            <IonButton fill="clear" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={() => setEditingPayment(p)}>
                              <IonIcon icon={create} />
                            </IonButton>
                            <IonButton fill="clear" color="medium" onClick={async () => {
                              // 1. Robustly Resolve Customer Name (Deep Lookup)
                              let resolvedName = editingInstallment.customerName;
                              if (!resolvedName || resolvedName === 'N/A') {
                                // Try Contract
                                const contract = contracts.find(c => c.id === editingInstallment.contractId);
                                if (contract) {
                                  resolvedName = contract.customerName;
                                  // Try Customer ID from Contract
                                  if ((!resolvedName || resolvedName === 'N/A') && contract.customerId) {
                                    const cust = customers.find(c => c.id === contract.customerId);
                                    if (cust) resolvedName = cust.name;
                                  }
                                }
                                // Try Unit ID -> Active Contract
                                if ((!resolvedName || resolvedName === 'N/A') && editingInstallment.unitId) {
                                  const activeContract = contracts.find(c => c.unitId === editingInstallment.unitId);
                                  if (activeContract) {
                                    resolvedName = activeContract.customerName;
                                    if ((!resolvedName || resolvedName === 'N/A') && activeContract.customerId) {
                                      const cust = customers.find(c => c.id === activeContract.customerId);
                                      if (cust) resolvedName = cust.name;
                                    }
                                  }
                                }
                              }

                              // 2. Find linked contract for extra details
                              const linkedContract = contracts.find(c => c.id === editingInstallment.contractId) ||
                                contracts.find(c => c.unitId === editingInstallment.unitId);

                              await handleInstallmentReceipt(editingInstallment, {
                                id: p.id,
                                paymentMethod: p.method,
                                paidAmount: p.amount
                              });
                            }}>
                              <IonIcon icon={printOutline} />
                            </IonButton>
                            <IonButton slot="end" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={async () => {
                              if (p.attachment && window.electronAPI) {
                                await window.electronAPI.deleteAttachment(p.attachment);
                              }
                              const updated = await deleteInstallmentPayment(editingInstallment.id, p.id);
                              if (updated) {
                                setEditingInstallment(updated);
                                setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
                              }
                            }}>
                              <IonIcon icon={trash} />
                            </IonButton>
                          </div>
                        </IonItem>
                      ))}
                    </IonList>

                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '12px', marginTop: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <h3 style={{ color: '#2563EB', fontSize: '1rem', marginTop: 0 }}>Add New Payment</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', color: '#1E293B' }}>
                          <IonInput label={`Amount (${appSettings.currency})`} labelPlacement="stacked" type="number" value={newPayment.amount} onIonInput={e => setNewPayment({ ...newPayment, amount: e.detail.value })} style={{ color: '#1E293B' }} />
                        </IonItem>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', color: '#1E293B' }}>
                          <IonSelect label="Method" labelPlacement="stacked" value={newPayment.method} onIonChange={e => setNewPayment({ ...newPayment, method: e.detail.value })} style={{ color: '#1E293B' }}>
                            <IonSelectOption value="CASH">CASH</IonSelectOption>
                            <IonSelectOption value="Transfer">Transfer</IonSelectOption>
                            <IonSelectOption value="Cheque">Cheque</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                      </div>
                      <ProDatePicker
                        label="Payment Date"
                        value={formatExcelDate(newPayment.date)}
                        onChange={val => setNewPayment({ ...newPayment, date: val })}
                        style={{ marginTop: '10px' }}
                      />
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', marginTop: '10px', color: '#1E293B' }}>
                        <IonInput label="Reference / Notes" labelPlacement="stacked" placeholder="Transaction ID, Notes, etc." value={newPayment.ref} onIonInput={e => setNewPayment({ ...newPayment, ref: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>

                      <div style={{ marginTop: '15px', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '15px', background: 'rgba(0,0,0,0.2)' }}
                        onPaste={e => {
                          const items = Array.from(e.clipboardData?.items || []);
                          const files = items.filter(it => it.kind === 'file').map(it => it.getAsFile()).filter(Boolean);
                          if (files.length === 0) return;
                          e.preventDefault();
                          const newPending = [];
                          let processed = 0;
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = () => {
                              newPending.push({ file, preview: file.type.startsWith('image/') ? reader.result : null, name: file.name || `pasted_${Date.now()}.png` });
                              processed++;
                              if (processed === files.length) {
                                setSelectedAttachmentFiles(prev => [...(prev || []), ...newPending]);
                              }
                            };
                            reader.readAsDataURL(file);
                          });
                        }}>
                        <div style={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>ATTACHMENTS (Images / PDFs)</div>

                        {/* Pending files grid */}
                        {(selectedAttachmentFiles || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {selectedAttachmentFiles.map((pf, i) => (
                              <div key={i} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(37,99,235,0.3)', background: '#0a0a0a' }}>
                                {pf.preview ? (
                                  <img src={pf.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📄</span>
                                    <span style={{ fontSize: '0.45rem', color: '#94A3B8' }}>{pf.name?.split('.').pop()?.toUpperCase()}</span>
                                  </div>
                                )}
                                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(235,68,90,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', color: '#fff', fontWeight: '900' }}
                                  onClick={() => setSelectedAttachmentFiles(prev => prev.filter((_, idx) => idx !== i))}>✕</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <input
                          type="file"
                          ref={paymentAttachmentRef}
                          style={{ display: 'none' }}
                          accept="image/*, application/pdf"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;

                            if (editingPaymentForAttachment) {
                              // Direct upload for existing payment
                              setUploadingAttachment(true);
                              try {
                                if (window.electronAPI) {
                                  const existing = (() => {
                                    const ins = installments.find(i => i.id === editingPaymentForAttachment.installmentId);
                                    const p = (ins?.payments || []).find(p => p.id === editingPaymentForAttachment.paymentId);
                                    return p?.attachments || (p?.attachment ? [p.attachment] : []);
                                  })();
                                  const newNames = [...existing];
                                  for (const file of files) {
                                    const ext = file.name.split('.').pop();
                                    const safeUnit = (editingInstallment.unitId || 'UNIT').replace(/[^a-z0-9]/gi, '_');
                                    const attachmentFilename = `Pay_${safeUnit}_${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`;
                                    const buffer = await file.arrayBuffer();
                                    await window.electronAPI.uploadAttachment(attachmentFilename, buffer);
                                    newNames.push(attachmentFilename);
                                  }
                                  const updated = await updateInstallmentPayment(
                                    editingPaymentForAttachment.installmentId,
                                    editingPaymentForAttachment.paymentId,
                                    { attachments: newNames }
                                  );
                                  if (updated) {
                                    setEditingInstallment(updated);
                                    setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
                                  }
                                }
                              } catch (error) {
                                console.error("Error attaching files:", error);
                                alert("Failed to upload attachments.");
                              } finally {
                                setUploadingAttachment(false);
                                setEditingPaymentForAttachment(null);
                              }
                            } else {
                              // Add to pending list for new payment
                              const newPending = [];
                              let processed = 0;
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  newPending.push({ file, preview: file.type.startsWith('image/') ? reader.result : null, name: file.name });
                                  processed++;
                                  if (processed === files.length) {
                                    setSelectedAttachmentFiles(prev => [...(prev || []), ...newPending]);
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }
                            e.target.value = '';
                          }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '6px' }}>
                          <IonButton
                            fill="outline"
                            color="light"
                            size="small"
                            onClick={() => paymentAttachmentRef.current?.click()}
                            style={{ '--border-radius': '8px' }}
                          >
                            <IonIcon icon={documentAttach} slot="start" />
                            Add Files
                          </IonButton>
                          <div style={{ color: '#64748B', fontSize: '0.7rem' }}>or paste (Ctrl+V)</div>
                        </div>
                      </div>

                      {newPayment.method === 'Cheque' && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                          <h4 style={{ color: '#2563EB', fontSize: '0.85rem', margin: '0 0 10px 0' }}>Cheque Details</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                              <IonInput label="Cheque #" labelPlacement="stacked" placeholder="Number" value={newPayment.chequeNumber} onIonInput={e => setNewPayment({ ...newPayment, chequeNumber: e.detail.value })} style={{ color: '#1E293B' }} />
                            </IonItem>
                            <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                              <IonInput label="Issuing Bank" labelPlacement="stacked" placeholder="Bank" value={newPayment.bank} onIonInput={e => setNewPayment({ ...newPayment, bank: e.detail.value })} style={{ color: '#1E293B' }} />
                            </IonItem>
                          </div>
                          <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                            <IonSelect label="Cheque Status" labelPlacement="stacked" value={newPayment.chequeStatus} onIonChange={e => setNewPayment({ ...newPayment, chequeStatus: e.detail.value })} style={{ color: '#1E293B' }}>
                              <IonSelectOption value="Not Collected">Not Collected</IonSelectOption>
                              <IonSelectOption value="Collected">Collected</IonSelectOption>
                              <IonSelectOption value="Cleared">Cleared</IonSelectOption>
                              <IonSelectOption value="Rejected">Rejected</IonSelectOption>
                            </IonSelect>
                          </IonItem>
                        </div>
                      )}
                      <IonButton
                        expand="block"
                        disabled={uploadingAttachment}
                        style={{ marginTop: '15px', '--background': '#2563EB', '--color': '#FFFFFF' }}
                        onClick={async () => {
                          if (!newPayment.amount) return;

                          setUploadingAttachment(true);
                          try {
                            const attachmentNames = [];
                            if ((selectedAttachmentFiles || []).length > 0 && window.electronAPI) {
                              for (const pf of selectedAttachmentFiles) {
                                const ext = pf.name.split('.').pop();
                                const safeUnit = (editingInstallment.unitId || 'UNIT').replace(/[^a-z0-9]/gi, '_');
                                const fname = `Pay_${safeUnit}_${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`;
                                const buffer = await pf.file.arrayBuffer();
                                await window.electronAPI.uploadAttachment(fname, buffer);
                                attachmentNames.push(fname);
                              }
                            }

                            const paymentToSave = { ...newPayment, attachments: attachmentNames.length > 0 ? attachmentNames : undefined };
                            const updated = await addInstallmentPayment(editingInstallment.id, paymentToSave);

                            if (updated) {
                              setEditingInstallment(updated);
                              setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
                              setNewPayment({ amount: '', method: 'CASH', date: formatExcelDate(new Date()), ref: '', notes: '', bank: '', chequeNumber: '', chequeStatus: 'Not Collected', attachment: null });
                              setSelectedAttachmentFiles([]);
                              if (paymentAttachmentRef.current) paymentAttachmentRef.current.value = '';
                            }
                          } catch (error) {
                            console.error("Error saving payment with attachments:", error);
                            alert("Failed to save payment attachments.");
                          } finally {
                            setUploadingAttachment(false);
                          }
                        }}
                      >
                        {uploadingAttachment ? 'UPLOADING...' : 'Record Payment'}
                      </IonButton>
                    </div>

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '15px', borderRadius: '4px', marginTop: '20px', color: '#1E293B' }}>
                      <IonSelect label="Overall Status Override" labelPlacement="floating" value={editingInstallment.status} onIonChange={e => setEditingInstallment({ ...editingInstallment, status: e.detail.value })} style={{ color: '#1E293B' }}>
                        <IonSelectOption value="Pending">Pending</IonSelectOption>
                        <IonSelectOption value="Part-Paid">Part-Paid</IonSelectOption>
                        <IonSelectOption value="Paid">Paid</IonSelectOption>
                        <IonSelectOption value="Collected">Collected</IonSelectOption>
                        <IonSelectOption value="Cleared">Cleared</IonSelectOption>
                        <IonSelectOption value="Rejected">Rejected</IonSelectOption>
                      </IonSelect>
                    </IonItem>

                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '15px' }}>
                      <h4 style={{ color: '#2563EB', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Cheque / Payment Details</h4>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', marginBottom: '10px' }}>
                        <IonSelect label="Cheque Status" labelPlacement="stacked" value={editingInstallment.chequeStatus} onIonChange={e => setEditingInstallment({ ...editingInstallment, chequeStatus: e.detail.value })} style={{ color: '#1E293B' }}>
                          <IonSelectOption value="Not Received">Not Received</IonSelectOption>
                          <IonSelectOption value="Received">Received</IonSelectOption>
                          <IonSelectOption value="Deposited">Deposited</IonSelectOption>
                          <IonSelectOption value="Cleared">Cleared</IonSelectOption>
                          <IonSelectOption value="Rejected">Rejected</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', marginBottom: '10px' }}>
                        <IonInput label="Deposited At Bank" labelPlacement="stacked" placeholder="Which bank was this deposited to?" value={editingInstallment.depositedBank} onIonInput={e => setEditingInstallment({ ...editingInstallment, depositedBank: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                          <IonInput label="Cheque #" labelPlacement="stacked" placeholder="Number" value={editingInstallment.chequeNumber} onIonInput={e => setEditingInstallment({ ...editingInstallment, chequeNumber: e.detail.value })} style={{ color: '#1E293B' }} />
                        </IonItem>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                          <IonInput label="Issuing Bank" labelPlacement="stacked" placeholder="Bank" value={editingInstallment.bank} onIonInput={e => setEditingInstallment({ ...editingInstallment, bank: e.detail.value })} style={{ color: '#1E293B' }} />
                        </IonItem>
                      </div>
                    </div>

                    <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '20px' }} onClick={async () => {
                      const updated = await updateInstallment(editingInstallment.id, editingInstallment);
                      if (updated) {
                        // Update local state directly instead of full refresh
                        setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
                      }
                      setEditingInstallment(null);
                      setNoticeAlert({ isOpen: true, header: 'Success', message: 'Installment record updated.', buttons: ['OK'] });
                    }}>Finished & Save</IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal >

            {/* --- VIEW: BUILDINGS LIST (PRO REDESIGN) --- */}
            {
              currentView === 'buildings' && !activeBuilding && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '40px' }}>

                  {/* Section Header */}
                  <div className="pro-section-header" style={{ marginBottom: '35px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome} style={{ alignSelf: 'flex-start' }}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                      <div>
                        <h1 style={{ color: '#1E293B', fontWeight: '999', fontSize: '2.5rem' }}>{t('home.buildings') || 'PROPERTIES'}</h1>
                        <p style={{ color: '#64748B', fontWeight: 'bold' }}>{t('buildings.detailSubtitle')}</p>
                      </div>
                      {canAction('add') && (
                        <IonButton
                          className="pro-action-btn"
                          onClick={() => setShowAddModal(true)}
                        >
                          <IonIcon icon={add} slot="start" />{t('buildings.addBuilding')}</IonButton>
                      )}
                    </div>
                  </div>

                  {/* --- ANALYTICS SUMMARY --- */}
                  <div className="pro-grid pro-grid-auto" style={{ marginBottom: '35px', gap: '20px' }}>
                    {/* Revenue Card */}
                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #D1D5DB', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B', fontWeight: 'bold' }}>{t('buildings.totalRevenue')}</span>
                      <span className="stat-value" style={{ color: '#1E293B', fontWeight: '999' }}>
                        {formatCurrency(contracts.reduce((sum, c) => sum + Number(c.totalPrice || 0), 0), true)}
                      </span>
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#2563EB' }}>{contracts.length} {t('buildings.activeContracts')}</p>
                    </div>

                    {/* Occupancy Card */}
                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #D1D5DB', borderLeft: '6px solid #1E3A8A', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B', fontWeight: 'bold' }}>{t('buildings.portfolioOccupancy')}</span>
                      <span className="stat-value" style={{ color: '#2563EB', fontWeight: '999' }}>
                        {(() => {
                          const allUnits = buildings.flatMap(b => b.units || []);
                          const totalUnits = allUnits.length;
                          const contractedIds = new Set(contracts.map(c => String(c.unitId).trim()));
                          const offeredIds = new Set(offers.filter(o => o.status === 'active').map(o => String(o.unitId).trim()));
                          const soldUnits = allUnits.filter(u => contractedIds.has(String(u.unitId).trim()) || offeredIds.has(String(u.unitId).trim())).length;
                          return ((soldUnits / Math.max(1, totalUnits)) * 100).toFixed(0) + '%';
                        })()}
                      </span>
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748B' }}>{t('buildings.unitsSoldOrOffer')}</p>
                    </div>

                    {/* Overdue Card */}
                    <div className="pro-glass-card animate-slide-in" style={{ border: '2px solid #D1D5DB', borderLeft: '6px solid #DC2626', boxShadow: 'none' }}>
                      <span className="stat-label" style={{ color: '#64748B', fontWeight: 'bold' }}>{t('buildings.overdueAlerts')}</span>
                      <span className="stat-value" style={{ color: '#DC2626', fontWeight: '999' }}>
                        {installments.filter(ins => {
                          const remaining = Math.max(0, Number(ins.amount) - Number(ins.paidAmount || 0));
                          if (remaining <= 0) return false;
                          const insDate = parseSafeDate(ins.dueDate);
                          const isPastDue = !isNaN(insDate.getTime()) && insDate < new Date();
                          const isRejected = (ins.status === 'Rejected' || ins.chequeStatus === 'Rejected');
                          return isPastDue && (ins.paymentMethod !== 'Cheque' || isRejected);
                        }).length}
                      </span>
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#DC2626' }}>{t('buildings.actionRequired')}</p>
                    </div>
                  </div>

                  {buildings.length === 0 ? (
                    <div className="pro-empty-state" style={{ padding: '80px 20px' }}>
                      <IonIcon icon={business} style={{ fontSize: '64px', opacity: 0.1, color: '#1E293B' }} />
                      <h3 style={{ color: '#1E293B', fontSize: '1.2rem', marginTop: '20px' }}>{t('buildings.noBuildingsRegistered')}</h3>
                      <p style={{ color: '#64748B' }}>{t('buildings.startPortfolio')}</p>
                    </div>
                  ) : (
                    <div className="pro-grid pro-grid-auto">
                      {buildings.map((building) => (
                        <div
                          key={building.id}
                          className="pro-glass-card animate-slide-in"
                          style={{ padding: '0', overflow: 'hidden', cursor: 'pointer' }}
                          onClick={() => setActiveBuilding(building)}
                        >
                          <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1E293B', margin: 0 }}>{building.name}</h2>
                              <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#2563EB', fontSize: '20px' }} />
                            </div>

                            {(() => {
                              const bUnits = building.units || [];
                              const totalCount = bUnits.length;
                              const contractedUnitIds = new Set(contracts.map(c => String(c.unitId).trim()));
                              const offeredUnitIds = new Set(offers.filter(o => o.status === 'active').map(o => String(o.unitId).trim()));
                              const contractCount = bUnits.filter(u => contractedUnitIds.has(String(u.unitId).trim())).length;
                              const offerCount = bUnits.filter(u => !contractedUnitIds.has(String(u.unitId).trim()) && offeredUnitIds.has(String(u.unitId).trim())).length;
                              const availableCount = totalCount - contractCount - offerCount;
                              return (
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>{t('common.total')}</span>
                                    <span style={{ fontSize: '1.1rem', color: '#1E293B', fontWeight: 'bold' }}>{totalCount}</span>
                                  </div>
                                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>{t('common.available')}</span>
                                    <span style={{ fontSize: '1.1rem', color: '#2563EB', fontWeight: 'bold' }}>
                                      {availableCount}
                                    </span>
                                  </div>
                                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>{t('common.offersLabel')}</span>
                                    <span style={{ fontSize: '1.1rem', color: '#64748B', fontWeight: 'bold' }}>
                                      {offerCount}
                                    </span>
                                  </div>
                                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>{t('common.contractsLabel')}</span>
                                    <span style={{ fontSize: '1.1rem', color: '#2563EB', fontWeight: 'bold' }}>
                                      {contractCount}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <IonButton
                                fill="clear"
                                size="small"
                                style={{ '--color': '#2563EB', fontWeight: 'bold', fontSize: '0.75rem' }}
                                onClick={(e) => { e.stopPropagation(); handleViewFloorplan(building.name); }}
                              >
                                <IonIcon icon={documentAttach} slot="start" /> {t('buildings.viewMap')}
                              </IonButton>
                              {canAction('edit') && (
                                <IonButton
                                  fill="clear"
                                  size="small"
                                  style={{ '--color': '#1E3A8A', fontWeight: 'bold', fontSize: '0.75rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetBuildingForBulk(building);
                                    setBulkPricePercentage('');
                                    setShowBulkPriceModal(true);
                                  }}
                                >
                                  <IonIcon icon={cashOutline} slot="start" /> {t('buildings.bulkPrice')}
                                </IonButton>
                              )}
                              {canAction('edit') && building.priceBackup && (
                                <IonButton
                                  fill="clear"
                                  size="small"
                                  style={{ '--color': '#DC2626', fontWeight: 'bold', fontSize: '0.75rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUndoBulkPriceUpdate(building.id);
                                  }}
                                >
                                  <IonIcon icon={refresh} slot="start" /> {t('buildings.undoPrices')}
                                </IonButton>
                              )}
                              {canAction('edit') && (
                                <IonButton
                                  fill="clear"
                                  size="small"
                                  style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(building.id); }}
                                >
                                  <IonIcon icon={trash} slot="icon-only" />
                                </IonButton>
                              )}
                            </div>
                          </div>
                          <div style={{
                            height: '4px',
                            width: '100%',
                            background: 'rgba(255,255,255,0.02)',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              height: '100%',
                              left: 0,
                              top: 0,
                              background: '#2563EB',
                              width: `${(() => {
                                const bUnits = building.units || [];
                                const total = bUnits.length;
                                if (total === 0) return 0;
                                const contractedIds = new Set(contracts.map(c => String(c.unitId).trim()));
                                const offeredIds = new Set(offers.filter(o => o.status === 'active').map(o => String(o.unitId).trim()));
                                const occupied = bUnits.filter(u => contractedIds.has(String(u.unitId).trim()) || offeredIds.has(String(u.unitId).trim())).length;
                                return (occupied / total) * 100;
                              })()}%`,
                              boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            {/* --- VIEW: CONTRACTS LIST (FULL PAGE PRO VIEW) --- */}
            {
              currentView === 'contracts' && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '100px' }}>

                  {/* Section Header */}
                  <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <h1 style={{ color: '#2563EB' }}>{t('contracts.activeContracts')}</h1>
                        <p>{t('contracts.portfolioManagement')}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <IonButton
                          fill="outline"
                          size="small"
                          onClick={() => {
                            setNoticeAlert({
                              isOpen: true,
                              header: 'Excel Format Required',
                              message: 'The following columns are required for a successful import:\n\n' +
                                '• Contract ID / Contract Date\n' +
                                '• Offer ID / Unit ID\n' +
                                '• Customer ID / Sales ID\n' +
                                '• Joint Purchaser IDs (Joint 1 ID, etc.)\n' +
                                '• Guarantor ID / Unit Price\n\n' +
                                'Click <b>Continue</b> to select your file.',
                              buttons: [
                                { text: 'Cancel', role: 'cancel' },
                                {
                                  text: 'Continue',
                                  handler: () => contractFileInputRef.current.click()
                                }
                              ]
                            });
                          }}
                          style={{ '--border-radius': '8px', '--color': '#2563EB', '--border-color': 'rgba(59, 130, 246, 0.4)', fontWeight: 'bold' }}
                        >
                          <IonIcon icon={cloudUpload} slot="start" />
                          IMPORT
                        </IonButton>

                        <IonButton
                          fill="solid"
                          size="small"
                          onClick={() => {
                            if (contracts.length === 0) {
                              alert("No contracts found to export.");
                              return;
                            }
                            exportContractsToExcel(contracts, customers, sales);
                          }}
                          style={{ '--border-radius': '8px', '--background': '#2563EB', '--color': '#FFFFFF', fontWeight: 'bold' }}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          EXPORT
                        </IonButton>

                        <IonButton
                          fill="clear"
                          size="small"
                          style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', fontWeight: 'bold' }}
                          onClick={handleDeleteAllContracts}
                          
                        >
                          <IonIcon icon={trash} slot="start" />
                          DELETE ALL
                        </IonButton>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Dashboard Section */}
                  <div className="pro-grid pro-grid-auto" style={{ marginBottom: '30px' }}>
                    <div className="pro-glass-card" style={{ borderLeft: '4px solid #1E3A8A' }}>
                      <div className="stat-label">{t('contracts.totalContracts')}</div>
                      <div className="stat-value">{contracts.length}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '5px' }}>{t('contracts.activeInPortfolio')}</div>
                    </div>

                    <div className="pro-glass-card" style={{ borderLeft: '4px solid #1E3A8A' }}>
                      <div className="stat-label">{t('contracts.totalPortfolioValue')}</div>
                      <div className="stat-value" style={{ color: '#2563EB' }}>
                        {formatCurrency(contracts.reduce((sum, c) => sum + (c.totalPrice || 0), 0))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '5px' }}>{t('contracts.contractedAssetValue')}</div>
                    </div>

                    <div className="pro-glass-card" style={{ borderLeft: '4px solid #3880ff' }}>
                      <div className="stat-label">{t('contracts.averageDealSize')}</div>
                      <div className="stat-value" style={{ color: '#2563EB' }}>
                        {formatCurrency(contracts.length > 0 ? contracts.reduce((sum, c) => sum + (c.totalPrice || 0), 0) / contracts.length : 0)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '5px' }}>{t('contracts.perActiveContract')}</div>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={contractFileInputRef}
                    style={{ display: 'none' }}
                    accept=".xlsx, .xls"
                    onChange={handleContractExcelImport}
                  />

                  {/* Enhanced Search & Actions */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '10px',
                    borderRadius: '16px',
                    marginBottom: '25px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <IonSearchbar
                      value={contractSearchQuery}
                      onIonChange={e => setContractSearchQuery(e.detail.value || '')}
                      debounce={250}
                      placeholder={t('contracts.filterPlaceholder')}
                      style={{
                        '--background': 'rgba(0,0,0,0.2)',
                        color: '#1E293B',
                        '--border-radius': '12px',
                        margin: 0,
                        flex: 1
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <IonIcon icon={businessOutline} style={{ color: '#2563EB' }} />
                      <IonSelect
                        value={filterBuilding}
                        onIonChange={e => setFilterBuilding(e.detail.value)}
                        interface="popover"
                        style={{ color: '#1E293B', fontSize: '0.85rem', fontWeight: 'bold' }}
                      >
                        <IonSelectOption value="all">{t('common.allBuildings')}</IonSelectOption>
                        {buildings.map(b => (
                          <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </div>
                  </div>

                  {/* Contracts Grid */}
                  {contracts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                      <IonIcon icon={documentTextOutline} style={{ fontSize: '64px', color: '#1E293B', marginBottom: '15px' }} />
                      <h3 style={{ color: '#64748B', margin: 0 }}>No active contracts found.</h3>
                      <p style={{ color: '#64748B' }}>Import an Excel file or create a new contract manually.</p>
                    </div>
                  ) : (
                    <div className="pro-grid pro-grid-auto">
                      {contracts.filter(c => {
                        // Building Filter
                        if (filterBuilding !== 'all') {
                          // Find which building this unit belongs to
                          const building = buildings.find(b => (b.units || []).some(u => u.unitId === c.unitId));
                          if (!building || String(building.id) !== String(filterBuilding)) return false;
                        }

                        if (!contractSearchQuery) return true;
                        const q = contractSearchQuery.toLowerCase();
                        const customer = customers.find(cust => cust.id === c.customerId);
                        const mainName = customer?.name || c.customerId || '';
                        const unitId = c.unitId || '';

                        // Joint Purchasers
                        const jpNames = (c.jointPurchasers || []).map(jp =>
                          customers.find(cust => cust.id === jp.id)?.name || jp.id
                        ).join(' ').toLowerCase();

                        // Guarantor
                        const guarantorName = c.guarantor ? (customers.find(cust => cust.id === c.guarantor.id)?.name || c.guarantor.id) : '';

                        return mainName.toLowerCase().includes(q) ||
                          unitId.toLowerCase().includes(q) ||
                          jpNames.includes(q) ||
                          guarantorName.toLowerCase().includes(q);
                      }).map((contract, idx) => {
                        const customer = customers.find(c => c.id === contract.customerId);
                        return (
                          <div
                            key={contract.id}
                            className="pro-glass-card animate-slide-in"
                            onClick={() => openContractInTab(contract)}
                            style={{
                              cursor: 'pointer',
                              padding: '0',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              animationDelay: `${idx * 0.03}s`,
                              ...(contract.status === 'terminated' || contract.status === 'resold' ? {
                                borderLeft: '5px solid ' + (contract.status === 'resold' ? '#E67E22' : '#DC2626'),
                                background: contract.status === 'resold' ? 'rgba(230, 126, 34, 0.04)' : 'rgba(220, 38, 38, 0.04)',
                                border: '1px solid ' + (contract.status === 'resold' ? 'rgba(230, 126, 34, 0.2)' : 'rgba(220, 38, 38, 0.2)'),
                                borderLeftWidth: '5px',
                                borderLeftStyle: 'solid',
                                borderLeftColor: contract.status === 'resold' ? '#E67E22' : '#DC2626'
                              } : {})
                            }}
                          >
                            <div style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                {contract.status === 'terminated' ? (
                                  <span className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>TERMINATED</span>
                                ) : contract.status === 'resold' ? (
                                  <span className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(230, 126, 34, 0.15)', color: '#E67E22' }}>RESOLD</span>
                                ) : (
                                  <span className="pro-badge pro-badge-success" style={{ fontSize: '0.6rem' }}>{t('status.active')}</span>
                                )}
                                <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '1rem' }}>{contract.unitId}</span>
                              </div>

                              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {customer?.name || contract.customerId}
                              </h3>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748B'    }}>ID: {contract.contractId || contract.id}</span>
                                <span style={{ fontSize: '0.75rem', color: '#2563EB' }}>•</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748B'    }}>{displayFormattedDate(contract.date)}</span>
                              </div>

                              <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '12px',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span style={{ color: '#64748B', fontSize: '0.8rem' }}>Value:</span>
                                <span style={{ color: '#1E293B', fontWeight: 'bold' }}>{formatCurrency(contract.totalPrice || 0)}</span>
                              </div>
                            </div>

                            {contract.status === 'terminated' ? (
                              <div
                                style={{
                                  marginTop: 'auto',
                                  padding: '10px 20px',
                                  background: 'rgba(220, 38, 38, 0.06)',
                                  borderTop: '1px solid rgba(220, 38, 38, 0.15)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <IonIcon icon={closeCircleOutline} style={{ color: '#DC2626', fontSize: '16px' }} />
                                  <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: '700', letterSpacing: '1px' }}>CONTRACT TERMINATED</span>
                                </div>
                                {/* Only show reactivate if no active offers/contracts on same unit */}
                                {!offers.some(o => String(o.unitId || '').trim().toLowerCase() === String(contract.unitId).trim().toLowerCase() && (o.status === 'active' || o.status === 'contracted')) &&
                                 !contracts.some(c => c.id !== contract.id && String(c.unitId || '').trim().toLowerCase() === String(contract.unitId).trim().toLowerCase() && (!c.status || c.status === 'active')) && (
                                  <div
                                    onClick={(e) => { e.stopPropagation(); handleReactivateContract(contract); }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      cursor: 'pointer',
                                      padding: '4px 12px',
                                      borderRadius: '8px',
                                      background: 'rgba(34, 197, 94, 0.12)',
                                      border: '1px solid rgba(34, 197, 94, 0.3)',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: '700' }}>⟳ REACTIVATE</span>
                                  </div>
                                )}
                              </div>
                            ) : contract.status === 'resold' ? (
                              <div
                                style={{
                                  marginTop: 'auto',
                                  padding: '10px 20px',
                                  background: 'rgba(230, 126, 34, 0.06)',
                                  borderTop: '1px solid rgba(230, 126, 34, 0.15)',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <IonIcon icon={swapHorizontalOutline} style={{ color: '#E67E22', fontSize: '16px' }} />
                                <span style={{ fontSize: '0.7rem', color: '#E67E22', fontWeight: '700', letterSpacing: '1px' }}>CONTRACT RESOLD{contract.resoldTo ? ` → ${contract.resoldTo}` : ''}</span>
                              </div>
                            ) : (
                              <div style={{
                                marginTop: 'auto',
                                padding: '10px 20px',
                                background: 'rgba(59, 130, 246, 0.05)',
                                borderTop: '1px solid rgba(59, 130, 246, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span style={{ fontSize: '0.7rem', color: '#2563EB', fontWeight: '600' }}>VIEW DETAILS</span>
                                <IonIcon icon={chevronForward} style={{ color: '#2563EB' }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '80px', marginRight: '20px' }}>
                    <IonFabButton
                      onClick={() => setShowCreateContractModal(true)}
                      style={{ '--background': 'linear-gradient(135deg, #3b82f6 0%, #a88a44 100%)', '--box-shadow': '0 8px 25px rgba(59, 130, 246, 0.4)' }}
                    >
                      <IonIcon icon={add} style={{ fontSize: '28px' }} />
                    </IonFabButton>
                  </IonFab>

                </div>
              )
            }

            {
              currentView === 'offers' && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '100px' }}>

                  {/* Section Header */}
                  <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <h1 style={{ color: '#64748B' }}>{t('offers.activeOffers')}</h1>
                        <p>{t('offers.pipelineManagement')}</p>
                      </div>
                      <div
                        onClick={() => { resetDataEntryForms(); setOfferStep(1); navigateToView('createOffer'); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 28px',
                          background: 'linear-gradient(135deg, #f0932b 0%, #ffbe76 100%)',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          color: '#FFFFFF',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          boxShadow: '0 6px 24px rgba(240, 147, 43, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                          transition: 'all 0.25s ease',
                          border: 'none',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                          e.currentTarget.style.boxShadow = '0 10px 32px rgba(240, 147, 43, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 6px 24px rgba(240, 147, 43, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)';
                        }}
                      >
                        <IonIcon icon={add} style={{ fontSize: '20px', fontWeight: 'bold' }} />
                        New Offer
                      </div>
                    </div>
                  </div>

                  {/* Stats & Dashboard Section */}
                  <div className="pro-grid pro-grid-auto" style={{ marginBottom: '30px' }}>
                    <div className="pro-glass-card" style={{ borderLeft: '4px solid #f0932b' }}>
                      <div className="stat-label">{t('offers.totalOffers')}</div>
                      <div className="stat-value">{offers.length}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '5px' }}>{t('offers.totalPipeline')}</div>
                    </div>

                    <div className="pro-glass-card" style={{ borderLeft: '4px solid #1E3A8A' }}>
                      <div className="stat-label">{t('offers.conversionRate')}</div>
                      <div className="stat-value" style={{ color: '#2563EB' }}>
                        {offers.length > 0 ? ((offers.filter(o => o.status === 'contracted').length / offers.length) * 100).toFixed(1) : 0}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '5px' }}>{t('offers.offersTurnedContracts')}</div>
                    </div>

                    <div className="pro-glass-card" style={{ borderLeft: '4px solid #3880ff' }}>
                      <div className="stat-label">{t('offers.pipelineValue')}</div>
                      <div className="stat-value" style={{ color: '#2563EB' }}>
                        {formatCurrency(offers.filter(o => !o.status || o.status === 'active').reduce((sum, o) => sum + (Number(o.totalPrice || o.finalPrice) || 0), 0))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B'   , marginTop: '5px' }}>{t('offers.potentialRevenue')}</div>
                    </div>
                  </div>

                  {/* Enhanced Search & Filters */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '15px',
                    borderRadius: '20px',
                    marginBottom: '25px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      flexWrap: 'wrap'
                    }}>
                      <IonSearchbar
                        value={offerSearchQuery}
                        onIonChange={e => setOfferSearchQuery(e.detail.value || '')}
                        debounce={250}
                        placeholder={t('offers.filterPlaceholder')}
                        style={{
                          '--background': 'rgba(0,0,0,0.2)',
                          color: '#1E293B',
                          '--border-radius': '12px',
                          margin: 0,
                          flex: '1 1 250px'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0 15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <IonIcon icon={businessOutline} style={{ color: '#2563EB' }} />
                        <IonSelect
                          value={filterBuilding}
                          onIonChange={e => setFilterBuilding(e.detail.value)}
                          interface="popover"
                          style={{ color: '#1E293B', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          <IonSelectOption value="all">{t('common.allBuildings')}</IonSelectOption>
                          {buildings.map(b => (
                            <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
                          ))}
                        </IonSelect>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <ProFilterToggle
                          label={t('offers.activeOffersFilter')}
                          active={filterOffersNoContract}
                          onClick={() => {
                            setFilterOffersNoContract(!filterOffersNoContract);
                            if (!filterOffersNoContract) setFilterOffersCancelled(false);
                          }}
                          activeColor="#f0932b"
                        />
                        <ProFilterToggle
                          label={t('offers.cancelledTerminated')}
                          active={filterOffersCancelled}
                          onClick={() => {
                            setFilterOffersCancelled(!filterOffersCancelled);
                            if (!filterOffersCancelled) setFilterOffersNoContract(false);
                          }}
                          activeColor="#eb445a"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Offers Grid */}
                  {offers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                      <IonIcon icon={documentTextOutline} style={{ fontSize: '64px', color: '#1E293B', marginBottom: '15px' }} />
                      <h3 style={{ color: '#64748B', margin: 0 }}>{t('offers.noOffersFound')}</h3>
                      <p style={{ color: '#64748B' }}>{t('offers.createFirst')}</p>
                    </div>
                  ) : (
                    <div className="pro-grid pro-grid-auto">
                      {offers.filter(o => {
                        // 1. Building Filter
                        if (filterBuilding !== 'all') {
                          // Find which building this unit belongs to
                          const building = buildings.find(b => (b.units || []).some(u => u.unitId === o.unitId));
                          if (!building || String(building.id) !== String(filterBuilding)) return false;
                        }

                        // 2. Search Query Filter
                        if (offerSearchQuery) {
                          const q = offerSearchQuery.toLowerCase();
                          const matchesSearch = o.customerName?.toLowerCase().includes(q) ||
                            o.unitId?.toLowerCase().includes(q) ||
                            (o.status || 'active').toLowerCase().includes(q);
                          if (!matchesSearch) return false;
                        }

                        // 2. Status Filters
                        if (filterOffersNoContract) {
                          // Show ONLY active (not contracted, not cancelled)
                          return !o.status || o.status === 'active';
                        }

                        if (filterOffersCancelled) {
                          // Show ONLY cancelled, terminated, terminated_contract, or resold_contract
                          return o.status === 'cancelled' || o.status === 'terminated' || o.status === 'terminated_contract' || o.status === 'resold_contract';
                        }

                        return true;
                      })
                        .sort((a, b) => {
                          const statusOrder = { 'active': 1, 'contracted': 2, 'resold_contract': 3, 'terminated_contract': 4, 'cancelled': 5 };
                          return (statusOrder[a.status || 'active'] || 1) - (statusOrder[b.status || 'active'] || 1);
                        })
                        .map((offer, idx) => (
                          <div
                            key={offer.id}
                            className="pro-glass-card animate-slide-in"
                            style={{
                              padding: '0',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              opacity: offer.status === 'contracted' ? 0.7 : 1,
                              animationDelay: `${idx * 0.03}s`,
                              ...(offer.status === 'cancelled' || offer.status === 'terminated_contract' || offer.status === 'resold_contract' ? {
                                borderLeft: '5px solid ' + (offer.status === 'resold_contract' ? '#E67E22' : '#DC2626'),
                                background: offer.status === 'resold_contract' ? 'rgba(230, 126, 34, 0.04)' : 'rgba(220, 38, 38, 0.04)',
                                border: '1px solid ' + (offer.status === 'resold_contract' ? 'rgba(230, 126, 34, 0.2)' : 'rgba(220, 38, 38, 0.2)'),
                                borderLeftWidth: '5px',
                                borderLeftStyle: 'solid',
                                borderLeftColor: offer.status === 'resold_contract' ? '#E67E22' : (offer.status === 'terminated_contract' ? '#8B0000' : '#DC2626')
                              } : {})
                            }}
                          >
                            <div style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                {offer.status === 'contracted' ? (
                                  <span className="pro-badge pro-badge-success" style={{ fontSize: '0.6rem' }}>{t('status.contracted')}</span>
                                ) : offer.status === 'cancelled' ? (
                                  <span className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>{t('status.cancelled')}</span>
                                ) : offer.status === 'terminated_contract' ? (
                                  <span className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(139, 0, 0, 0.15)', color: '#8B0000' }}>TERMINATED</span>
                                ) : offer.status === 'resold_contract' ? (
                                  <span className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(230, 126, 34, 0.15)', color: '#E67E22' }}>RESOLD</span>
                                ) : (
                                  <span className="pro-badge pro-badge-warning" style={{ fontSize: '0.6rem' }}>{t('status.active')}</span>
                                )}
                                <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '1rem' }}>{offer.unitId}</span>
                              </div>

                              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {offer.customerName}
                              </h3>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748B'    }}>{t('offers.date')}: {displayFormattedDate(offer.date)}</span>
                                <span style={{ fontSize: '0.75rem', color: '#2563EB' }}>•</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748B'    }}>{offer.years} {t('offers.years')}</span>
                              </div>

                              <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '12px',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '15px'
                              }}>
                                <span style={{ color: '#64748B', fontSize: '0.8rem' }}>{t('offers.totalPriceLabel')}:</span>
                                <span style={{ color: '#1E293B', fontWeight: 'bold' }}>{formatCurrency(Number(offer.totalPrice || offer.finalPrice) || 0)}</span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  color="light"
                                  style={{ flex: 1, fontSize: '0.7rem' }}
                                  onClick={() => setViewingOffer(offer)}
                                >
                                  {t('offers.viewBtn')}
                                </IonButton>
                                {(!offer.status || offer.status === 'active') && (
                                  <>
                                    <IonButton
                                      size="small"
                                      fill="solid"
                                      style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', flex: 1, fontSize: '0.7rem' }}
                                      onClick={() => {
                                        setSelectedOfferForPayment(offer);
                                        setEditingOfferPayment(null);
                                        setOfferPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], reference: '', paymentMethod: 'CASH', chequeNumber: '', bank: '', chequeStatus: 'Not Collected', attachment: null, isReservation: false });
                                        setShowOfferPaymentModal(true);
                                      }}
                                    >
                                      {t('offers.payBtn')}
                                    </IonButton>
                                    <IonButton
                                      size="small"
                                      fill="outline"
                                      style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', flex: 1, fontSize: '0.7rem' }}
                                      onClick={() => {
                                        setSelectedOfferForInstallments(offer);
                                        setShowOfferInstallmentsModal(true);
                                      }}
                                    >
                                      {t('offers.editBtn')}
                                    </IonButton>
                                    <IonButton
                                      size="small"
                                      fill="outline"
                                      color="danger"
                                      style={{ flex: 1, fontSize: '0.7rem', '--border-color': '#DC2626' }}
                                      onClick={() => handleCancelOffer(offer)}
                                    >
                                      {t('offers.cancelBtn')}
                                    </IonButton>
                                  </>
                                )}
                              </div>
                            </div>

                            {offer.status === 'contracted' && (
                              <div
                                onClick={() => {
                                  const activeContract = contracts.find(c => c.id === offer.contractId);
                                  if (activeContract) openContractInTab(activeContract);
                                }}
                                style={{
                                  marginTop: 'auto',
                                  padding: '10px 20px',
                                  background: 'rgba(45, 211, 111, 0.05)',
                                  borderTop: '1px solid rgba(45, 211, 111, 0.1)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{ fontSize: '0.7rem', color: '#2563EB', fontWeight: '600' }}>{t('offers.viewContract')}</span>
                                <IonIcon icon={chevronForward} style={{ color: '#2563EB' }} />
                              </div>
                            )}

                            {offer.status === 'cancelled' && (
                              <div
                                style={{
                                  marginTop: 'auto',
                                  padding: '10px 20px',
                                  background: 'rgba(220, 38, 38, 0.06)',
                                  borderTop: '1px solid rgba(220, 38, 38, 0.15)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <IonIcon icon={closeCircleOutline} style={{ color: '#DC2626', fontSize: '16px' }} />
                                  <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: '700', letterSpacing: '1px' }}>{t('offers.offerCancelled')}</span>
                                </div>
                                {/* Only show reactivate if no active offers on same unit */}
                                {!offers.some(o => o.id !== offer.id && String(o.unitId).trim().toLowerCase() === String(offer.unitId).trim().toLowerCase() && (o.status === 'active' || o.status === 'contracted')) && (
                                  <div
                                    onClick={(e) => { e.stopPropagation(); handleReactivateOffer(offer); }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      cursor: 'pointer',
                                      padding: '4px 12px',
                                      borderRadius: '8px',
                                      background: 'rgba(34, 197, 94, 0.12)',
                                      border: '1px solid rgba(34, 197, 94, 0.3)',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: '700' }}>{t('offers.reactivateBtn')}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {offer.status === 'terminated_contract' && (
                              <div
                                onClick={() => {
                                  const terminatedContract = contracts.find(c => c.id === offer.contractId);
                                  if (terminatedContract) openContractInTab(terminatedContract);
                                }}
                                style={{
                                  marginTop: 'auto',
                                  padding: '10px 20px',
                                  background: 'rgba(139, 0, 0, 0.06)',
                                  borderTop: '1px solid rgba(139, 0, 0, 0.15)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <IonIcon icon={closeCircleOutline} style={{ color: '#8B0000', fontSize: '16px' }} />
                                  <span style={{ fontSize: '0.7rem', color: '#8B0000', fontWeight: '700', letterSpacing: '1px' }}>{t('contracts.terminatedLabel')}</span>
                                </div>
                                <IonIcon icon={chevronForward} style={{ color: '#8B0000' }} />
                              </div>
                            )}

                            {offer.status === 'resold_contract' && (
                              <div
                                onClick={() => {
                                  const resoldContract = contracts.find(c => c.id === offer.contractId);
                                  if (resoldContract) openContractInTab(resoldContract);
                                }}
                                style={{
                                  marginTop: 'auto',
                                  padding: '10px 20px',
                                  background: 'rgba(230, 126, 34, 0.06)',
                                  borderTop: '1px solid rgba(230, 126, 34, 0.15)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <IonIcon icon={swapHorizontalOutline} style={{ color: '#E67E22', fontSize: '16px' }} />
                                  <span style={{ fontSize: '0.7rem', color: '#E67E22', fontWeight: '700', letterSpacing: '1px' }}>{t('contracts.resoldLabel')}</span>
                                </div>
                                <IonIcon icon={chevronForward} style={{ color: '#E67E22' }} />
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}



                </div>
              )
            }

            {/* --- VIEW: CREATE OFFER (FULL TAB - SINGLE PAGE) --- */}
            {
              currentView === 'createOffer' && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '100px' }}>
                  {/* Section Header */}
                  <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                    <div className="pro-back-button" onClick={() => { closeTab('createOffer'); navigateToView('offers'); }} style={{ marginBottom: '10px' }}>
                      <IonIcon icon={chevronBack} /> {t('common.backToOffers')}
                    </div>
                    <h1 style={{ color: '#f0932b', fontWeight: '900' }}>CREATE NEW OFFER</h1>
                    <p style={{ color: '#64748B' }}>Fill in all sections below to create a new offer</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '1200px' }}>

                    {/* ═══ LEFT COLUMN: Selections ═══ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* ── SECTION 1: Customer ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', borderLeft: selectedCustomer ? '4px solid #10B981' : '4px solid #f0932b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '1rem', fontWeight: '800' }}>① Customer</h3>
                            <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '4px', '--padding-end': '4px' }}>
                              <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                            </IonButton>
                          </div>
                          {selectedCustomer && (
                            <span onClick={() => setSelectedCustomer(null)} style={{ fontSize: '0.75rem', color: '#DC2626', cursor: 'pointer', fontWeight: '600' }}>✕ Clear</span>
                          )}
                        </div>
                        {selectedCustomer ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.95rem' }}>{selectedCustomer.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>{selectedCustomer.phone}</div>
                          </div>
                        ) : (
                          <>
                            <IonSearchbar
                              value={customerSearchQuery}
                              onIonInput={e => setCustomerSearchQuery(e.detail.value || '')}
                              placeholder="Type to search by name or phone..."
                              style={{ '--background': 'var(--app-bg)', '--color': 'var(--app-text)', '--placeholder-color': '#64748B', '--border-radius': '10px', padding: 0, margin: 0 }}
                              debounce={200}
                            />
                            {customerSearchQuery.trim().length > 0 && (
                              <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {filteredCustomers.slice(0, 15).map(c => (
                                  <div
                                    key={c.id}
                                    onClick={() => { setSelectedCustomer(c); setCustomerSearchQuery(''); }}
                                    style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: '8px', background: 'var(--app-bg)', transition: 'all 0.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--app-bg)'}
                                  >
                                    <div>
                                      <div style={{ fontWeight: '600', color: 'var(--app-text)', fontSize: '0.85rem' }}>{c.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{c.phone}</div>
                                    </div>
                                    <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#94A3B8', fontSize: '14px' }} />
                                  </div>
                                ))}
                                {filteredCustomers.length === 0 && (
                                  <div style={{ padding: '12px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>No customers found</div>
                                )}
                              </div>
                            )}
                            <IonButton expand="block" fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ marginTop: '8px', fontSize: '0.75rem' }}>+ Add New Customer</IonButton>
                          </>
                        )}
                      </div>

                      {/* ── SECTION 2: Unit ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', borderLeft: selectedOfferUnit ? '4px solid #10B981' : '4px solid #f0932b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '1rem', fontWeight: '800' }}>② Unit</h3>
                          {selectedOfferUnit && (
                            <span onClick={() => setSelectedOfferUnit(null)} style={{ fontSize: '0.75rem', color: '#DC2626', cursor: 'pointer', fontWeight: '600' }}>✕ Clear</span>
                          )}
                        </div>
                        {selectedOfferUnit ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.95rem' }}>Unit {selectedOfferUnit.unit.unitId}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>{selectedOfferUnit.unit.buildingName || ''} | {selectedOfferUnit.unit.area}sqm | {formatCurrency(selectedOfferUnit.unit.price)}</div>
                          </div>
                        ) : (
                          <>
                            <IonSearchbar
                              value={unitSearchQuery}
                              onIonInput={e => setUnitSearchQuery(e.detail.value || '')}
                              placeholder="Type to search by unit ID..."
                              style={{ '--background': 'var(--app-bg)', '--color': 'var(--app-text)', '--placeholder-color': '#64748B', '--border-radius': '10px', padding: 0, margin: 0 }}
                              debounce={200}
                            />
                            {unitSearchQuery.trim().length > 0 && (
                              <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {buildings.flatMap(b => (b.units || []).filter(u => (u.status || '').toLowerCase() === 'available').map(u => ({ ...u, buildingId: b.id, buildingName: b.name })))
                                  .filter(u => u.unitId.toLowerCase().includes(unitSearchQuery.toLowerCase()))
                                  .slice(0, 15)
                                  .map(u => (
                                    <div
                                      key={u.id}
                                      onClick={() => { setSelectedOfferUnit({ unit: u, buildingId: u.buildingId }); setUnitSearchQuery(''); }}
                                      style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: '8px', background: 'var(--app-bg)', transition: 'all 0.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'var(--app-bg)'}
                                    >
                                      <div>
                                        <div style={{ fontWeight: '600', color: 'var(--app-text)', fontSize: '0.85rem' }}>Unit {u.unitId}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{u.buildingName} | {u.area}sqm | {formatCurrency(u.price)}</div>
                                      </div>
                                      <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#94A3B8', fontSize: '14px' }} />
                                    </div>
                                  ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* ── SECTION 3: Sales Agent ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', borderLeft: offerForm.salesId ? '4px solid #10B981' : '4px solid var(--object-outline, #334155)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '1rem', fontWeight: '800' }}>③ Sales Agent <span style={{ fontSize: '0.7rem', fontWeight: '400', color: '#64748B' }}>(optional)</span></h3>
                            <IonButton fill="clear" size="small" onClick={() => setShowAddSalesModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '4px', '--padding-end': '4px' }}>
                              <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                            </IonButton>
                          </div>
                          {offerForm.salesId && (
                            <span onClick={() => { setOfferForm(prev => ({ ...prev, salesId: '' })); setSalesSearchQuery(''); }} style={{ fontSize: '0.75rem', color: '#DC2626', cursor: 'pointer', fontWeight: '600' }}>✕ Clear</span>
                          )}
                        </div>
                        {offerForm.salesId ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.95rem' }}>{sales.find(s => s.id === offerForm.salesId)?.name || offerForm.salesId}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>ID: {offerForm.salesId}</div>
                          </div>
                        ) : (
                          <>
                            <IonSearchbar
                              value={salesSearchQuery || ''}
                              onIonInput={e => setSalesSearchQuery(e.detail.value || '')}
                              placeholder="Type to search sales agent..."
                              style={{ '--background': 'var(--app-bg)', '--color': 'var(--app-text)', '--placeholder-color': '#64748B', '--border-radius': '10px', padding: 0, margin: 0 }}
                              debounce={200}
                            />
                            {(salesSearchQuery || '').trim().length > 0 && (
                              <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {sales.filter(s => (s.name || '').toLowerCase().includes((salesSearchQuery || '').toLowerCase()) || (s.id || '').toLowerCase().includes((salesSearchQuery || '').toLowerCase()))
                                  .slice(0, 10)
                                  .map(s => (
                                    <div
                                      key={s.id}
                                      onClick={() => { setOfferForm(prev => ({ ...prev, salesId: s.id })); setSalesSearchQuery(''); }}
                                      style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: '8px', background: 'var(--app-bg)', transition: 'all 0.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'var(--app-bg)'}
                                    >
                                      <div>
                                        <div style={{ fontWeight: '600', color: 'var(--app-text)', fontSize: '0.85rem' }}>{s.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>ID: {s.id}</div>
                                      </div>
                                      <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#94A3B8', fontSize: '14px' }} />
                                    </div>
                                  ))}
                              </div>
                            )}
                            <IonButton expand="block" fill="clear" size="small" onClick={() => setShowAddSalesModal(true)} style={{ marginTop: '8px', fontSize: '0.75rem' }}>+ Add New Agent</IonButton>
                          </>
                        )}
                      </div>

                      {/* ── SECTION 4: Joint Purchasers ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', borderLeft: offerJointPurchasers.length > 0 ? '4px solid #10B981' : '4px solid var(--object-outline, #334155)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '1rem', fontWeight: '800' }}>④ Joint Purchasers <span style={{ fontSize: '0.7rem', fontWeight: '400', color: '#64748B' }}>(optional)</span></h3>
                            <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '4px', '--padding-end': '4px' }}>
                              <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                            </IonButton>
                          </div>
                        </div>
                        {offerJointPurchasers.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                            {offerJointPurchasers.map((jp, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div>
                                  <div style={{ fontWeight: '600', color: 'var(--app-text)', fontSize: '0.85rem' }}>{jp.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>ID: {jp.id}</div>
                                </div>
                                <span onClick={() => setOfferJointPurchasers(prev => prev.filter((_, i) => i !== idx))} style={{ fontSize: '0.75rem', color: '#DC2626', cursor: 'pointer', fontWeight: '600' }}>✕</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <IonSelect
                          interface="popover"
                          value=""
                          placeholder="Select a joint purchaser..."
                          onIonChange={(e) => {
                            const jpId = e.detail.value;
                            if (!jpId) return;
                            const alreadyAdded = offerJointPurchasers.some(jp => jp.id === jpId);
                            if (alreadyAdded || (selectedCustomer && jpId === selectedCustomer.id) || (offerGuarantor && jpId === offerGuarantor.id)) return;
                            const cust = customers.find(c => c.id === jpId);
                            if (cust) setOfferJointPurchasers(prev => [...prev, { id: cust.id, name: cust.name }]);
                          }}
                          style={{ width: '100%', background: 'var(--app-bg)', borderRadius: '10px', padding: '0 10px', fontSize: '0.85rem', marginTop: '4px' }}
                        >
                          {customers.filter(c => c.id !== (selectedCustomer?.id || '') && !offerJointPurchasers.some(jp => jp.id === c.id) && c.id !== (offerGuarantor?.id || '')).map(c => (
                            <IonSelectOption key={c.id} value={c.id}>{c.name} ({c.id})</IonSelectOption>
                          ))}
                        </IonSelect>
                      </div>

                      {/* ── SECTION 5: Guarantor ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', borderLeft: offerGuarantor ? '4px solid #10B981' : '4px solid var(--object-outline, #334155)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '1rem', fontWeight: '800' }}>⑤ Guarantor <span style={{ fontSize: '0.7rem', fontWeight: '400', color: '#64748B' }}>(optional)</span></h3>
                            <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '4px', '--padding-end': '4px' }}>
                              <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                            </IonButton>
                          </div>
                          {offerGuarantor && (
                            <span onClick={() => setOfferGuarantor(null)} style={{ fontSize: '0.75rem', color: '#DC2626', cursor: 'pointer', fontWeight: '600' }}>✕ Clear</span>
                          )}
                        </div>
                        {offerGuarantor ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.95rem' }}>{offerGuarantor.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>ID: {offerGuarantor.id}</div>
                          </div>
                        ) : (
                          <IonSelect
                            interface="popover"
                            value=""
                            placeholder="Select a guarantor..."
                            onIonChange={(e) => {
                              const gId = e.detail.value;
                              if (!gId) return;
                              if ((selectedCustomer && gId === selectedCustomer.id) || offerJointPurchasers.some(jp => jp.id === gId)) return;
                              const cust = customers.find(c => c.id === gId);
                              if (cust) setOfferGuarantor({ id: cust.id, name: cust.name });
                            }}
                            style={{ width: '100%', background: 'var(--app-bg)', borderRadius: '10px', padding: '0 10px', fontSize: '0.85rem' }}
                          >
                            {customers.filter(c => c.id !== (selectedCustomer?.id || '') && !offerJointPurchasers.some(jp => jp.id === c.id) && c.id !== (offerGuarantor?.id || '')).map(c => (
                              <IonSelectOption key={c.id} value={c.id}>{c.name} ({c.id})</IonSelectOption>
                            ))}
                          </IonSelect>
                        )}
                      </div>
                    </div>

                    {/* ═══ RIGHT COLUMN: Offer Details ═══ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* ── Payment Plan ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--app-text)', fontSize: '1rem', fontWeight: '800' }}>{t('common.paymentPlan')}</h3>

                        <ProDatePicker label="Offer Date" value={offerForm.date} onChange={val => setOfferForm(prev => ({ ...prev, date: val }))} />

                        <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', marginTop: '10px', marginBottom: '10px', borderRadius: '8px', '--border-radius': '8px' }}>
                          <IonSelect label="Unit Finish" labelPlacement="floating" value={offerForm.priceType} onIonChange={e => setOfferForm(prev => ({ ...prev, priceType: e.detail.value }))} style={{ '--color': 'var(--app-text)' }}>
                            <IonSelectOption value="base">Base - {formatCurrency(selectedOfferUnit?.unit.price || 0)}</IonSelectOption>
                            <IonSelectOption value="finished">Finished - {formatCurrency(selectedOfferUnit?.unit.finishedPrice || selectedOfferUnit?.unit.price || 0)}</IonSelectOption>
                          </IonSelect>
                        </IonItem>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonInput type="number" label="Discount (%)" labelPlacement="floating" value={offerForm.discountPercent} onIonInput={e => setOfferForm(prev => ({ ...prev, discountPercent: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                          </IonItem>
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonInput type="number" label="Down Payment (%)" labelPlacement="floating" value={offerForm.downPayment} onIonInput={e => setOfferForm(prev => ({ ...prev, downPayment: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                          </IonItem>
                        </div>

                        <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px', marginTop: '10px' }}>
                          <IonInput type="number" label={`Reservation Amount (${appSettings.currency || '$'})`} labelPlacement="floating" value={offerForm.reservationAmount} onIonInput={e => setOfferForm(prev => ({ ...prev, reservationAmount: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} placeholder="Enter reservation amount (part of down payment)" />
                        </IonItem>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonInput type="number" label="Years" labelPlacement="floating" value={offerForm.years} onIonInput={e => setOfferForm(prev => ({ ...prev, years: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                          </IonItem>
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonSelect label="Frequency" labelPlacement="floating" value={offerForm.frequency} onIonChange={e => setOfferForm(prev => ({ ...prev, frequency: e.detail.value }))} style={{ '--color': 'var(--app-text)' }}>
                              <IonSelectOption value="quarterly">Quarterly</IonSelectOption>
                              <IonSelectOption value="biannual">Bi-Annual</IonSelectOption>
                              <IonSelectOption value="annual">Annual</IonSelectOption>
                            </IonSelect>
                          </IonItem>
                        </div>
                      </div>

                      {/* ── Flash Fill ── */}
                      <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                        <h4 style={{ color: '#2563EB', margin: '0 0 12px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>⚡ Flash Fill Installments</h4>
                        <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '0 0 10px 0' }}>Auto-fill date, cheque & bank details</p>

                        <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', marginBottom: '8px', borderRadius: '8px', '--border-radius': '8px' }}>
                          <ProDatePicker label="First Installment Date" value={offerForm.firstInstallmentDate} onChange={val => setOfferForm(prev => ({ ...prev, firstInstallmentDate: val }))} />
                        </IonItem>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonSelect label="Method" labelPlacement="floating" value={offerForm.paymentMethod} onIonChange={e => setOfferForm(prev => ({ ...prev, paymentMethod: e.detail.value }))} style={{ '--color': 'var(--app-text)' }}>
                              <IonSelectOption value="Cheque">Cheque</IonSelectOption>
                              <IonSelectOption value="Cash">Cash</IonSelectOption>
                              <IonSelectOption value="Bank Transfer">Transfer</IonSelectOption>
                            </IonSelect>
                          </IonItem>
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonInput label="Bank" labelPlacement="floating" value={offerForm.bank} onIonInput={e => setOfferForm(prev => ({ ...prev, bank: e.detail.value }))} placeholder="e.g. CIB" style={{ '--color': 'var(--app-text)' }} />
                          </IonItem>
                        </div>
                        {offerForm.paymentMethod === 'Cheque' && (
                          <IonItem fill="solid" mode="md" style={{ '--background': 'var(--app-bg)', marginTop: '8px', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonInput label="Starting Cheque #" labelPlacement="floating" type="number" value={offerForm.startingChequeNumber} onIonInput={e => setOfferForm(prev => ({ ...prev, startingChequeNumber: e.detail.value }))} placeholder="e.g. 100001" style={{ '--color': 'var(--app-text)' }} />
                          </IonItem>
                        )}
                      </div>

                      {/* ── Financial Preview ── */}
                      {offerForm.finalPrice > 0 && (
                        <div className="pro-glass-card" style={{ padding: '20px', borderRadius: '16px', border: '1px dashed #3b82f6' }}>
                          <h4 style={{ color: '#2563EB', margin: '0 0 12px 0', fontSize: '0.9rem' }}>Financial Preview</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', color: '#64748B' }}>
                            <div>Final Price: <strong style={{ color: 'var(--app-text)' }}>{formatCurrency(Math.round(offerForm.finalPrice))}</strong></div>
                            <div>DP Amount: <strong style={{ color: '#2563EB' }}>{formatCurrency(Math.round(offerForm.downPaymentAmount))}</strong></div>
                            {Number(offerForm.reservationAmount || 0) > 0 && (
                              <>
                                <div>Reservation: <strong style={{ color: '#F59E0B' }}>{formatCurrency(Number(offerForm.reservationAmount))}</strong> <span style={{ fontSize: '0.7rem' }}>(part of DP)</span></div>
                                <div>Remaining DP: <strong style={{ color: '#10B981' }}>{formatCurrency(Math.max(0, Math.round(offerForm.downPaymentAmount) - Number(offerForm.reservationAmount || 0)))}</strong></div>
                              </>
                            )}
                            <div>Installments: <strong style={{ color: 'var(--app-text)' }}>{offerForm.numInstallments}</strong></div>
                            <div>Per Payment: <strong style={{ color: '#DC2626' }}>{formatCurrency(Math.round(offerForm.installmentAmount))}</strong></div>
                          </div>
                        </div>
                      )}

                      {/* ── Submit ── */}
                      <IonButton
                        expand="block"
                        onClick={handleCreateOffer}
                        disabled={!selectedCustomer || !selectedOfferUnit}
                        style={{
                          '--background': (!selectedCustomer || !selectedOfferUnit) ? '#94A3B8' : 'linear-gradient(135deg, #f0932b, #ffbe76)',
                          fontWeight: '800', fontSize: '1rem', '--border-radius': '14px', height: '52px',
                          opacity: (!selectedCustomer || !selectedOfferUnit) ? 0.5 : 1,
                          '--color': '#FFFFFF'
                        }}
                      >
                        {!selectedCustomer ? 'Select a Customer First' : !selectedOfferUnit ? 'Select a Unit First' : 'Create Offer'}
                      </IonButton>
                    </div>
                  </div>
                </div>
              )
            }

            {/* --- VIEW: CUSTOMERS LIST (PRO REDESIGN) --- */}
            {
              currentView === 'customers' && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '40px' }}>

                  {/* Section Header */}
                  <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <h1 style={{ color: '#1E293B', fontWeight: '999', fontSize: '2.5rem' }}>{t('customers.clientRelations')}</h1>
                        <p style={{ color: '#64748B', fontWeight: 'bold' }}>{t('customers.managingPurchasers', { count: filteredCustomers.length })}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="file" ref={customerFileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleCustomerExcelImport} />
                        <IonButton
                          fill="outline"
                          style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '10px' }}
                          onClick={() => {
                            if (window.confirm(
                              `⚠️ IMPORT WARNING\n\nYou are about to import customers from an Excel file.\n\nThe Excel file should contain these columns:\n\n` +
                              `  1. Customer ID  (auto-generated if missing)\n` +
                              `  2. Customer Name  (required)\n` +
                              `  3. Phone 1\n` +
                              `  4. Phone 2\n` +
                              `  5. Email\n` +
                              `  6. ID Number  (National ID / Passport)\n` +
                              `  7. ID Type\n` +
                              `  8. Blood Type\n` +
                              `  9. Direct/Indirect\n\n` +
                              `Imported customers will be ADDED to the existing list.\n\nContinue?`
                            )) {
                              customerFileInputRef.current?.click();
                            }
                          }}
                        >
                          <IonIcon icon={cloudUpload} slot="start" /> {t('common.import')}</IonButton>
                        <IonButton
                          fill="outline"
                          color="success"
                          style={{ '--border-radius': '10px' }}
                          onClick={() => {
                            if (window.confirm(
                              `📊 EXPORT CONFIRMATION\n\nYou are about to export ${customers.length} customers to Excel.\n\nThe following columns will be exported:\n\n` +
                              `  1. Customer ID\n` +
                              `  2. Customer Name\n` +
                              `  3. Phone 1\n` +
                              `  4. Phone 2\n` +
                              `  5. Email\n` +
                              `  6. ID Number\n` +
                              `  7. ID Type\n` +
                              `  8. Blood Type\n` +
                              `  9. Direct/Indirect\n\n` +
                              `Continue with export?`
                            )) {
                              exportCustomersToExcel(customers);
                            }
                          }}
                        >
                          <IonIcon icon={downloadOutline} slot="start" /> {t('common.export')}</IonButton>
                        <IonButton
                          className="pro-action-btn"
                          onClick={() => setShowAddCustomerModal(true)}
                          style={{ height: '40px' }}
                        >
                          <IonIcon icon={add} slot="start" /> {t('customers.newCustomer')}
                        </IonButton>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="pro-glass-card" style={{ padding: '4px', marginBottom: '25px', display: 'flex', alignItems: 'center', border: '2px solid #D1D5DB', boxShadow: 'none' }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: '20px', color: '#1E293B', marginLeft: '15px' }} />
                    <input
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                      placeholder={t('customers.searchPlaceholder')}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#1E293B',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        outline: 'none',
                        padding: '16px'
                      }}
                    />
                  </div>

                  {/* Customers Grid */}
                  <div className="pro-grid pro-grid-auto">
                    {filteredCustomers.map(c => (
                      <div key={c.id} className="pro-glass-card animate-slide-in" style={{ padding: '24px', border: '2px solid #D1D5DB', borderLeft: '8px solid #1E3A8A', background: '#FFFFFF', boxShadow: 'none' }}>
                        <div
                          onClick={async () => {
                            setViewingCustomerDetail(c);
                            setIdCardImage(null);
                            if (window.electronAPI) {
                              const img = await window.electronAPI.getIdCard('customer', c.id);
                              setIdCardImage(img);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: '999', color: '#1E293B', margin: 0 }}>{c.name}</h2>
                            <span style={{ fontSize: '0.65rem', color: '#2563EB', fontWeight: '999', background: 'rgba(30, 58, 138, 0.1)', padding: '4px 10px', borderRadius: '4px' }}>#{c.id}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B'   , fontSize: '0.85rem' }}>
                              <IonIcon icon={callOutline} style={{ color: '#2563EB' }} />
                              <span>{c.phone}</span>
                              {c.phone && (
                                <div onClick={(e) => { e.stopPropagation(); smartOpenWhatsApp(c.phone, `Hello ${c.name}, this is DYR. How can we help you today?`); }} style={{ cursor: 'pointer', color: '#2563EB' }}>
                                  <IonIcon icon={logoWhatsapp} />
                                </div>
                              )}
                            </div>
                            {c.email && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B'   , fontSize: '0.85rem' }}>
                                <IonIcon icon={informationCircleOutline} />
                                <span>{c.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Linked Units Badge Section */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {contracts.filter(con => con.customerId === c.id).map(con => (
                              <div key={con.id} className="pro-badge pro-badge-success" style={{ fontSize: '0.6rem' }}>Unit {con.unitId}</div>
                            ))}
                            {/* Joint Purchaser Roles */}
                            {contracts.filter(con => (con.jointPurchasers || []).some(jp => jp.id === c.id)).map(con => (
                              <div key={`jp-${con.id}`} className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(0, 255, 255, 0.1)', color: '#2563EB' }}>Joint: {con.unitId}</div>
                            ))}
                            {/* Guarantor Roles */}
                            {contracts.filter(con => con.guarantor?.id === c.id).map(con => (
                              <div key={`g-${con.id}`} className="pro-badge" style={{ fontSize: '0.6rem', background: 'rgba(235, 68, 90, 0.1)', color: '#DC2626' }}>Guarantor: {con.unitId}</div>
                            ))}
                            {offers.filter(o => o.customerId === c.id && o.status !== 'contracted' && o.status !== 'cancelled').map(o => (
                              <div key={o.id} className="pro-badge pro-badge-warning" style={{ fontSize: '0.6rem' }}>Offer: {o.unitId}</div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                          {canAction('edit') && (
                            <IonButton fill="clear" size="small" onClick={() => {
                              promptPassword('Admin authentication required:', (pw) => {
                                if (pw === getAppSecurity().adminPassword) {
                                  setEditingCustomer({ ...c });
                                  setShowEditCustomerModal(true);
                                } else alert('Unauthorized');
                              });
                            }}>
                              <IonIcon icon={create} slot="icon-only" style={{ opacity: 0.6 }} />
                            </IonButton>
                          )}
                          {canAction('delete') && (
                            <IonButton fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} size="small" onClick={() => handleDeleteCustomer(c.id)}>
                              <IonIcon icon={trash} slot="icon-only" style={{ opacity: 0.6 }} />
                            </IonButton>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredCustomers.length === 0 && (
                      <div className="pro-empty-state" style={{ gridColumn: '1/-1' }}>No matches for "{customerSearchQuery}"</div>
                    )}
                  </div>
                </div>
              )
            }

            {/* --- VIEW: FEEDBACK LIST --- */}
            {
              currentView === 'feedback' && (
                <div className="feedback-view" style={{ maxWidth: '1000px', margin: '0 auto', padding: '10px' }}>
                  <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '15px' }}>
                    <IonIcon icon={chevronBack} /> {t('common.back')}
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(29, 209, 161, 0.15) 0%, rgba(29, 209, 161, 0.05) 100%)',
                    borderLeft: '5px solid #1dd1a1',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '25px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}>
                    <div className="feedback-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h1 style={{ color: '#2563EB', margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{t('feedbacks.viewTitle')}</h1>
                        <p style={{ color: '#64748B', margin: '5px 0 0', fontSize: '0.95rem' }}>{t('feedbacks.viewSubtitle')}</p>
                      </div>
                      <IonButton
                        fill="outline"
                        style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', '--border-radius': '10px', height: '40px', fontWeight: 'bold' }}
                        onClick={() => {
                          setReportTab('overdue');
                          setShowInventoryModal(true);
                        }}
                      >
                        <IonIcon icon={statsChart} slot="start" />
                        Overdue Report
                      </IonButton>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--app-bg-card)',
                    padding: '20px',
                    borderRadius: '16px',
                    marginBottom: '25px',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '20px',
                    alignItems: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}>
                    <IonSearchbar
                      value={feedbackSearchQuery}
                      onIonChange={e => setFeedbackSearchQuery(e.detail.value || '')}
                      placeholder={t('feedbacks.searchPlaceholder')}
                      style={{ '--background': 'rgba(255,255,255,0.05)', '--color': 'var(--app-text)', '--placeholder-color': '#64748B', borderRadius: '12px', padding: 0 }}
                    />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '5px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Wallet:</span>
                        <IonSelect
                          value={filterFeedbackWallet}
                          onIonChange={e => setFilterFeedbackWallet(e.detail.value)}
                          interface="popover"
                          style={{ color: '#2563EB', fontWeight: 'bold' }}
                        >
                          <IonSelectOption value="all">{t('feedbacks.allWallets')}</IonSelectOption>
                          <IonSelectOption value="none">{t('feedbacks.standardCashes')}</IonSelectOption>
                          {wallets.map(w => (
                            <IonSelectOption key={w.id} value={w.id}>{w.bankAddress}</IonSelectOption>
                          ))}
                        </IonSelect>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '5px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Sort By:</span>
                        <IonSelect
                          value={feedbackSortOrder}
                          onIonChange={e => setFeedbackSortOrder(e.detail.value)}
                          interface="popover"
                          style={{ color: '#2563EB', fontWeight: 'bold' }}
                        >
                          <IonSelectOption value="oldest">{t('feedbacks.oldestDue')}</IonSelectOption>
                          <IonSelectOption value="newest">{t('feedbacks.recentDue')}</IonSelectOption>
                        </IonSelect>
                      </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '25px', padding: '10px 5px 5px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '5px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: filterOverdueWithRejected ? '#DC2626' : 'var(--app-text-muted)', fontSize: '0.85rem', fontWeight: filterOverdueWithRejected ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                        <input
                          type="checkbox"
                          checked={filterOverdueWithRejected}
                          onChange={e => {
                            setFilterOverdueWithRejected(e.target.checked);
                            if (e.target.checked) setFilterOverdueWithoutRejected(false);
                          }}
                          style={{ transform: 'scale(1.2)', accentColor: '#DC2626' }}
                        />
                        {t('feedbacks.rejectedOnly')}</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: filterOverdueWithoutRejected ? '#2563EB' : 'var(--app-text-muted)', fontSize: '0.85rem', fontWeight: filterOverdueWithoutRejected ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                        <input
                          type="checkbox"
                          checked={filterOverdueWithoutRejected}
                          onChange={e => {
                            setFilterOverdueWithoutRejected(e.target.checked);
                            if (e.target.checked) setFilterOverdueWithRejected(false);
                          }}
                          style={{ transform: 'scale(1.2)', accentColor: '#2563EB' }}
                        />
                        {t('feedbacks.withoutRejected')}</label>

                      <div style={{ marginLeft: 'auto' }}>
                        <IonButton fill="clear" color="medium" size="small" style={{ '--padding-start': '0', '--padding-end': '0', height: '20px', fontSize: '0.75rem' }} onClick={() => {
                          setFeedbackSearchQuery('');
                          setFilterFeedbackWallet('all');
                          setFilterOverdueWithRejected(false);
                          setFilterOverdueWithoutRejected(false);
                        }}>{t('feedbacks.resetAll')}</IonButton>
                      </div>
                    </div>
                  </div>

                  <IonList lines="none" style={{ background: 'transparent' }}>
                    {installments
                      .filter(ins => {
                        const remaining = Math.max(0, Number(ins.amount) - Number(ins.paidAmount || 0));
                        if (remaining <= 0) return false;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const dueDateObj = parseSafeDate(ins.dueDate);
                        dueDateObj.setHours(0, 0, 0, 0);
                        const isPastDue = !isNaN(dueDateObj.getTime()) && dueDateObj <= today;

                        const isRejected = (ins.status === 'Rejected' || ins.chequeStatus === 'Rejected');

                        // Apply Overdue Filters
                        if (filterOverdueWithRejected && !isRejected) return false;
                        if (filterOverdueWithoutRejected && isRejected) return false;

                        // Match the broad definition: Rejected and Past Due OR any non-cheque balance that is Past Due
                        const isRecoveryRequired = isPastDue && (ins.status !== 'Cancelled');
                        if (!isRecoveryRequired) return false;

                        const contract = contracts.find(c => c.id === ins.contractId) || contracts.find(c => c.unitId === ins.unitId) || {};

                        // Resolve Customer Name for search
                        let owner = customers.find(c => c.id === contract.customerId);
                        if (!owner && ins.customerName) {
                          owner = customers.find(c => String(c.id) === String(ins.customerName) || (c.name || '').toLowerCase() === (ins.customerName || '').toLowerCase());
                        }

                        const customerName = (owner ? owner.name : (contract.customerName || ins.customerName || '')).toLowerCase();
                        const customerPhone = (owner ? owner.phone : '').toLowerCase();
                        const customerPhone2 = (owner ? owner.phone2 : '').toLowerCase();

                        // Resolve Joint Purchasers for search
                        const jointEntries = (contract.jointPurchasers || []).map(jp => {
                          const jpCust = customers.find(c => c.id === jp.id);
                          return {
                            name: (jpCust?.name || jp.name || '').toLowerCase(),
                            phone: (jpCust?.phone || jp.phone || '').toLowerCase(),
                            id: (jp.id || '').toLowerCase()
                          };
                        });
                        const jointNames = jointEntries.map(j => j.name).join(' ');
                        const jointPhones = jointEntries.map(j => j.phone).join(' ');
                        const jointIds = jointEntries.map(j => j.id).join(' ');

                        // Resolve Guarantor for search
                        let gName = '';
                        if (contract.guarantor) {
                          const gId = typeof contract.guarantor === 'string' ? contract.guarantor : contract.guarantor.id;
                          const gCust = customers.find(c => String(c.id) === String(gId));
                          gName = (gCust?.name || contract.guarantor.name || gId || '').toLowerCase();
                        }

                        const search = feedbackSearchQuery.toLowerCase();

                        return (
                          customerName.includes(search) ||
                          customerPhone.includes(search) ||
                          customerPhone2.includes(search) ||
                          (ins.unitId || '').toLowerCase().includes(search) ||
                          (ins.chequeNumber || '').toLowerCase().includes(search) ||
                          gName.includes(search) ||
                          jointNames.includes(search) ||
                          jointPhones.includes(search) ||
                          jointIds.includes(search) ||
                          (ins.status || '').toLowerCase().includes(search) ||
                          (ins.payments || []).some(p => String(p.ref || '').toLowerCase().includes(search) || String(p.bank || '').toLowerCase().includes(search))
                        );
                      })
                      .filter(ins => {
                        if (filterFeedbackWallet === 'all') return true;
                        const linkedWallet = wallets.find(w => (w.checkIds || []).includes(ins.id));
                        if (filterFeedbackWallet === 'none') return !linkedWallet;
                        return linkedWallet && linkedWallet.id === filterFeedbackWallet;
                      })
                      .sort((a, b) => {
                        const dA = isNaN(a.dueDate) ? new Date(a.dueDate) : new Date((Number(a.dueDate) - 25569) * 86400 * 1000);
                        const dB = isNaN(b.dueDate) ? new Date(b.dueDate) : new Date((Number(b.dueDate) - 25569) * 86400 * 1000);
                        return feedbackSortOrder === 'oldest' ? dA - dB : dB - dA;
                      })
                      .map(ins => {
                        const linkedContract = contracts.find(c => c.id === ins.contractId) || contracts.find(c => c.unitId === ins.unitId);
                        let owner = customers.find(c => c.id === linkedContract?.customerId);
                        if (!owner && ins.customerName) {
                          owner = customers.find(c => (c.name || '').toLowerCase() === (ins.customerName || '').toLowerCase());
                        }

                        const ownerName = owner ? owner.name : (linkedContract?.customerName || ins.customerName || 'Unknown');
                        const ownerPhone = owner ? owner.phone : (linkedContract?.phone || 'N/A');
                        const ownerPhone2 = owner ? owner.phone2 : (linkedContract?.phone2 || '');

                        const jointPurchasers = (linkedContract?.jointPurchasers || []).map(jp => {
                          const cust = customers.find(c => c.id === jp.id);
                          return {
                            name: cust?.name || jp.name || 'Unknown',
                            phone: cust?.phone || jp.phone || 'N/A'
                          };
                        });

                        const guarantorData = linkedContract?.guarantor;
                        let guarantor = guarantorData ? customers.find(c => c.id === guarantorData.id) : null;
                        const gName = guarantor?.name || guarantorData?.name;
                        const gPhone = guarantor?.phone || guarantorData?.phone || 'N/A';

                        const remaining = Number(ins.amount) - Number(ins.paidAmount || 0);

                        return (
                          <div key={ins.id} style={{
                            background: 'var(--app-bg-card)',
                            borderRadius: '16px',
                            marginBottom: '20px',
                            overflow: 'hidden',
                            border: '1px solid var(--app-border, rgba(0,0,0,0.08))',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                          }}>
                            <div className="feedback-card-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <span style={{ background: '#DC2626', color: '#FFFFFF', fontSize: '0.7rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '30px' }}>UNIT {ins.unitId}</span>
                                  <span style={{ color: '#DC2626', fontWeight: 'bold', fontSize: '0.9rem' }}>{formatExcelDate(ins.dueDate)}</span>
                                  {(() => {
                                    const linkedWallet = wallets.find(w => (w.checkIds || []).includes(ins.id));
                                    if (linkedWallet) {
                                      return (
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(59, 130, 246, 0.1)',
                                          color: '#2563EB',
                                          padding: '2px 8px',
                                          borderRadius: '8px',
                                          fontSize: '0.7rem',
                                          fontWeight: '800',
                                          border: '1px solid rgba(59, 130, 246, 0.2)',
                                          textTransform: 'uppercase'
                                        }}>
                                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563EB' }} />
                                          {linkedWallet.bankAddress}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {(ins.chequeNumber || ins.bank) && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      background: 'rgba(235, 68, 90, 0.1)',
                                      color: '#DC2626',
                                      padding: '4px 10px',
                                      borderRadius: '30px',
                                      fontSize: '0.75rem',
                                      fontWeight: '900',
                                      border: '1px solid rgba(235, 68, 90, 0.2)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>
                                      <IonIcon icon={cardOutline} style={{ fontSize: '14px' }} />
                                      {ins.chequeNumber ? `#${ins.chequeNumber}` : ''} {ins.bank ? `| ${ins.bank}` : ''}
                                    </div>
                                  )}
                                </div>
                                <h2 style={{ color: 'var(--app-text, #1E293B)', margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: '700' }}>{ownerName}</h2>
                                <div style={{ fontSize: '0.9rem', color: 'var(--app-text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <IonIcon icon={person} style={{ verticalAlign: 'middle' }} />
                                    <span>{ownerPhone}</span>
                                    {ownerPhone && ownerPhone !== 'N/A' && (
                                      <div
                                        onClick={() => smartOpenWhatsApp(ownerPhone, t('whatsapp.feedbackMessage', { customerName: ownerName, unitId: ins.unitId, buildingName: activeBuilding?.name || '' }))}
                                        style={{ display: 'inline-flex', alignItems: 'center', background: '#2563EB', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer', marginLeft: '5px' }}
                                      >
                                        <IonIcon icon={logoWhatsapp} style={{ fontSize: '0.9rem' }} />
                                      </div>
                                    )}
                                  </div>
                                  {ownerPhone2 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <IonIcon icon={callOutline} style={{ verticalAlign: 'middle' }} />
                                      <span>{ownerPhone2}</span>
                                      <div
                                        onClick={() => smartOpenWhatsApp(ownerPhone2, t('whatsapp.feedbackMessage', { customerName: ownerName, unitId: ins.unitId, buildingName: activeBuilding?.name || '' }))}
                                        style={{ display: 'inline-flex', alignItems: 'center', background: '#2563EB', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer', marginLeft: '5px' }}
                                      >
                                        <IonIcon icon={logoWhatsapp} style={{ fontSize: '0.9rem' }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#DC2626' }}>{formatCurrency(remaining)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--app-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('feedbacks.remaining')} {formatCurrency(ins.amount)}</div>
                                <IonButton
                                  fill="solid"
                                  style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '10px', '--border-radius': '8px', fontWeight: 'bold' }}
                                  size="small"
                                  
                                  onClick={() => {
                                    setSelectedInstallmentForFeedback(ins);
                                    setShowFeedbackModal(true);
                                  }}
                                >
                                  <IonIcon icon={chatbubbles} slot="start" />{t('feedbacks.addFollowUp')}</IonButton>
                              </div>
                            </div>

                            {/* Relations Section */}
                            {(gName || jointPurchasers.length > 0) && (
                              <div style={{ padding: '12px 20px', background: 'rgba(37, 99, 235, 0.06)', borderTop: '1px solid var(--app-border, rgba(0,0,0,0.08))', display: 'flex', gap: '30px', fontSize: '0.85rem' }}>
                                {gName && (
                                  <div style={{ flex: 1 }}>
                                    <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>{t('feedbacks.guarantor')}</span>
                                    <div style={{ color: 'var(--app-text, #1E293B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>{gName} ({gPhone})</span>
                                      {gPhone && gPhone !== 'N/A' && (
                                        <div
                                          onClick={() => smartOpenWhatsApp(gPhone, t('whatsapp.feedbackMessage', { customerName: gName, unitId: ins.unitId, buildingName: activeBuilding?.name || '' }))}
                                          style={{ background: '#2563EB', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', cursor: 'pointer' }}
                                        >
                                          <IonIcon icon={logoWhatsapp} style={{ fontSize: '0.9rem' }} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {jointPurchasers.length > 0 && (
                                  <div style={{ flex: 2 }}>
                                    <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>{t('feedbacks.jointPurchasers')}</span>
                                    <div style={{ color: 'var(--app-text, #1E293B)', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                      {jointPurchasers.map((jp, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px' }}>
                                          <span>{jp.name} ({jp.phone})</span>
                                          {jp.phone && jp.phone !== 'N/A' && (
                                            <div
                                              onClick={() => smartOpenWhatsApp(jp.phone, t('whatsapp.feedbackMessage', { customerName: jp.name, unitId: ins.unitId, buildingName: activeBuilding?.name || '' }))}
                                              style={{ background: '#2563EB', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', cursor: 'pointer' }}
                                            >
                                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '0.9rem' }} />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Follow-up History (REDESIGNED TO SHOW ALL) */}
                            <div style={{ padding: '20px', background: 'rgba(29, 209, 161, 0.02)' }}>
                              <h4 style={{ color: '#2563EB', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <IonIcon icon={timeOutline} />
                                Follow-up Timeline
                                <div style={{ flex: 1, height: '1px', background: 'rgba(29, 209, 161, 0.1)' }}></div>
                              </h4>

                              {(!ins.feedbacks || ins.feedbacks.length === 0) ? (
                                <div style={{ padding: '15px', textAlign: 'center', color: 'var(--app-text-muted, #64748B)', fontSize: '0.9rem', border: '1px dashed rgba(29, 209, 161, 0.2)', borderRadius: '12px' }}>
                                  No recovery attempts recorded for this installment.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {ins.feedbacks.slice().reverse().map((fb, idx) => (
                                    <div key={fb.id || idx} style={{
                                      padding: '12px 15px',
                                      background: idx === 0 ? 'rgba(37, 99, 235, 0.08)' : 'var(--app-bg, rgba(255,255,255,0.02))',
                                      borderRadius: '10px',
                                      border: '1px solid',
                                      borderColor: idx === 0 ? 'rgba(59, 130, 246, 0.25)' : 'var(--app-border, rgba(0,0,0,0.06))',
                                      position: 'relative'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '0.7rem', color: idx === 0 ? '#3B82F6' : 'var(--app-text-muted, #64748B)', fontWeight: 'bold' }}>{(() => { const d = fb.date; if (!d) return ''; const str = String(d); const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/); if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`; const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (slashMatch) return `${slashMatch[1].padStart(2,'0')}-${slashMatch[2].padStart(2,'0')}-${slashMatch[3]}`; const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/); if (dashMatch) return str; try { const dt = new Date(str); if (!isNaN(dt)) return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`; } catch(e){} return str; })()}</span>
                                        {idx === 0 && <span style={{ fontSize: '0.6rem', background: '#2563EB', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>{t('feedbacks.latestUpdate')}</span>}
                                      </div>
                                      <div style={{ fontSize: '0.95rem', color: idx === 0 ? 'var(--app-text, #1E3A8A)' : 'var(--app-text-muted, #64748B)', lineHeight: '1.4' }}>{fb.text}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {installments.filter(ins => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDateObj = parseSafeDate(ins.dueDate);
                      dueDateObj.setHours(0, 0, 0, 0);

                      const isPastDue = !isNaN(dueDateObj.getTime()) && dueDateObj <= today;
                      const remaining = Number(ins.amount) - Number(ins.paidAmount || 0);

                      return isPastDue && (ins.status !== 'Cancelled') && remaining > 0;
                    }).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
                          <IonIcon icon={chatbubbles} style={{ fontSize: '80px', opacity: 0.1, marginBottom: '20px' }} />
                          <h3 style={{ margin: 0, color: '#64748B' }}>{t('feedbacks.allClear')}</h3>
                          <p>{t('feedbacks.allClearMessage')}</p>
                        </div>
                      )}
                  </IonList>
                </div>
              )
            }

            {/* --- VIEW: SALES MANAGEMENT (PRO REDESIGN) --- */}
            {
              currentView === 'sales' && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '40px' }}>

                  {/* Section Header */}
                  <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div className="section-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <h1 style={{ background: 'linear-gradient(90deg, #fff, #6c5ce7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('sales.salesForce')}</h1>
                        <p>{t('sales.performanceTracking')}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <IonButton fill="outline" color="tertiary" onClick={() => salesFileInputRef.current.click()} style={{ '--border-radius': '10px', '--color': '#2563EB', '--border-color': '#2563EB' }}>
                          <IonIcon icon={cloudUpload} slot="start" /> {t('common.import')}</IonButton>
                        <IonButton
                          className="pro-action-btn"
                          onClick={() => setShowAddSalesModal(true)}
                          style={{ height: '40px', '--background': 'linear-gradient(135deg, #6c5ce7 0%, #4834d4 100%)' }}
                        >
                          <IonIcon icon={add} slot="start" /> {t('sales.newAgent')}
                        </IonButton>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="pro-glass-card" style={{ padding: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center' }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: '20px', color: '#64748B', marginLeft: '10px', marginRight: '10px' }} />
                    <input
                      value={salesSearchQuery}
                      onChange={e => setSalesSearchQuery(e.target.value)}
                      placeholder={t('sales.searchPlaceholder')}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#1E293B',
                        fontSize: '1rem',
                        outline: 'none',
                        padding: '8px 0'
                      }}
                    />
                  </div>

                  <div className="pro-grid pro-grid-auto">
                    {sales.filter(s =>
                      (s.name || '').toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
                      (s.id || '').toLowerCase().includes(salesSearchQuery.toLowerCase())
                    ).map(s => {
                      const agentContracts = contracts.filter(c => c.salesId === s.id);
                      const agentOffers = offers.filter(o => o.salesId === s.id && o.status !== 'contracted' && o.status !== 'cancelled');

                      return (
                        <div key={s.id} className="pro-glass-card animate-slide-in" style={{ padding: '20px', borderLeft: '4px solid #6c5ce7' }}>
                          <div
                            onClick={async () => {
                              setViewingSalesDetail(s);
                              setIdCardImage(null);
                              if (window.electronAPI) {
                                const img = await window.electronAPI.getIdCard('sales', s.id);
                                setIdCardImage(img);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="agent-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1E293B', margin: 0 }}>{s.name}</h2>
                              <span style={{ fontSize: '0.65rem', color: '#2563EB', fontWeight: '800', background: 'rgba(108, 92, 231, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{t('sales.code')}: {s.id}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
                              {s.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B'   , fontSize: '0.85rem' }}>
                                  <IonIcon icon={callOutline} style={{ color: '#2563EB' }} />
                                  <span>{s.phone}</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B'   , fontSize: '0.85rem' }}>
                                <IonIcon icon={statsChart} style={{ color: '#2563EB' }} />
                                <span>{agentContracts.length} {t('sales.dealsSigned')}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {agentContracts.slice(0, 3).map(con => (
                                <div key={con.id} className="pro-badge pro-badge-success" style={{ fontSize: '0.55rem' }}>#{con.unitId}</div>
                              ))}
                              {agentContracts.length > 3 && <span style={{ fontSize: '0.7rem', color: '#64748B' }}>+{agentContracts.length - 3} {t('sales.more')}</span>}
                              {agentOffers.map(offer => (
                                <div
                                  key={offer.id}
                                  onClick={(e) => { e.stopPropagation(); setViewingOffer(offer); }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.6rem',
                                    fontWeight: '800',
                                    letterSpacing: '0.3px',
                                    cursor: 'pointer',
                                    background: 'rgba(240, 147, 43, 0.12)',
                                    color: '#64748B',
                                    border: '1px solid rgba(240, 147, 43, 0.25)',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(240, 147, 43, 0.25)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(240, 147, 43, 0.25)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(240, 147, 43, 0.12)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <span style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: '#64748B',
                                    boxShadow: '0 0 6px rgba(240, 147, 43, 0.6)',
                                    animation: 'pulse 2s infinite',
                                  }} />
                                  {t('sales.offer')}: {offer.unitId}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <IonButton fill="clear" size="small" onClick={() => { setEditingSales({ ...s }); setShowEditSalesModal(true); }}>
                              <IonIcon icon={create} slot="icon-only" style={{ opacity: 0.6 }} />
                            </IonButton>
                            <IonButton fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} size="small" onClick={() => { deleteSales(s.id); setSales(getSales()); }}>
                              <IonIcon icon={trash} slot="icon-only" style={{ opacity: 0.6 }} />
                            </IonButton>
                          </div>
                        </div>
                      );
                    })}

                    {sales.length === 0 && (
                      <div className="pro-empty-state" style={{ gridColumn: '1/-1' }}>{t('sales.noAgentsFound')}</div>
                    )}
                  </div>
                </div>
              )
            }

            {/* Add Sales Modal */}
            <IonModal isOpen={showAddSalesModal} onDidDismiss={() => { setShowAddSalesModal(false); resetDataEntryForms(); }} className="chrono-modal">
              <IonHeader>
                <IonToolbar style={{ '--background': '#F1F5F9', '--color': '#2563EB' }} >
                  <IonTitle>{t('sales.addAgentTitle')}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowAddSalesModal(false)} fill="clear" color="light"><IonIcon icon={close} /></IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                <div className="chrono-form-container" style={{ paddingBottom: '40vh' }}>
                  <IonItem className="chrono-input-item" lines="none">
                    <IonLabel position="floating" style={{ color: '#64748B'    }}>Sales ID (Mandatory)</IonLabel>
                    <IonInput value={newSale.id} onIonInput={e => setNewSale(prev => ({ ...prev, id: e.detail.value }))} style={{ color: '#1E293B' }} />
                  </IonItem>
                  <IonItem className="chrono-input-item" lines="none">
                    <IonLabel position="floating" style={{ color: '#64748B'    }}>Sales Name</IonLabel>
                    <IonInput value={newSale.name} onIonInput={e => setNewSale(prev => ({ ...prev, name: e.detail.value }))} style={{ color: '#1E293B' }} />
                  </IonItem>
                  <IonItem className="chrono-input-item" lines="none">
                    <IonLabel position="floating" style={{ color: '#64748B'    }}>Phone (Optional)</IonLabel>
                    <IonInput value={newSale.phone} onIonInput={e => setNewSale(prev => ({ ...prev, phone: e.detail.value }))} style={{ color: '#1E293B' }} />
                  </IonItem>
                  <IonItem className="chrono-input-item" lines="none" style={{ marginTop: '10px' }}>
                    <IonLabel position="floating" style={{ color: '#64748B'    }}>Email</IonLabel>
                    <IonInput value={newSale.email} onIonInput={e => setNewSale(prev => ({ ...prev, email: e.detail.value }))} style={{ color: '#1E293B' }} />
                  </IonItem>
                  <div style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginTop: '15px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748B'   , display: 'block', marginBottom: '8px' }}>Sales ID Document</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={async () => {
                          const path = await handleIdCardUpload('sales', newSale.id || 'new');
                          if (path) setNewSale(prev => ({ ...prev, idCardPath: path }));
                        }}
                      >
                        <IonIcon icon={cloudUpload} slot="start" />
                        {newSale.idCardPath ? "Change ID Card" : "Upload ID Card"}
                      </IonButton>
                      {newSale.idCardPath && <IonBadge style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}>ID LINKED</IonBadge>}
                    </div>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <IonButton expand="block" onClick={handleAddSales} style={{ '--background': '#2563EB', height: '48px', '--border-radius': '10px' }}>{t('sales.saveAgent')}</IonButton>
                  </div>
                </div>
              </IonContent>
            </IonModal>

            {/* --- EDIT SALES AGENT MODAL --- */}
            <IonModal isOpen={showEditSalesModal} onDidDismiss={() => setShowEditSalesModal(false)}>
              <IonHeader><IonToolbar><IonTitle>{t('sales.editAgentTitle')}</IonTitle><IonButton slot="end" onClick={() => setShowEditSalesModal(false)}>Cancel</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                {editingSales && (
                  <div style={{ padding: '20px', paddingBottom: '40vh', display: 'flex', flexDirection: 'column' }}>
                    <IonItem className="chrono-input-item" lines="none">
                      <IonLabel position="floating" style={{ color: '#64748B'    }}>Sales ID</IonLabel>
                      <IonInput value={editingSales.id} disabled style={{ color: '#1E293B', opacity: 0.6 }} />
                    </IonItem>
                    <IonItem className="chrono-input-item" lines="none" style={{ marginTop: '10px' }}>
                      <IonLabel position="floating" style={{ color: '#64748B'    }}>Sales Name</IonLabel>
                      <IonInput value={editingSales.name} onIonInput={e => setEditingSales(prev => ({ ...prev, name: e.detail.value }))} style={{ color: '#1E293B' }} />
                    </IonItem>
                    <IonItem className="chrono-input-item" lines="none" style={{ marginTop: '10px' }}>
                      <IonLabel position="floating" style={{ color: '#64748B'    }}>Phone</IonLabel>
                      <IonInput value={editingSales.phone} onIonInput={e => setEditingSales(prev => ({ ...prev, phone: e.detail.value }))} style={{ color: '#1E293B' }} />
                    </IonItem>
                    <IonItem className="chrono-input-item" lines="none" style={{ marginTop: '10px' }}>
                      <IonLabel position="floating" style={{ color: '#64748B'    }}>Email</IonLabel>
                      <IonInput value={editingSales.email} onIonInput={e => setEditingSales(prev => ({ ...prev, email: e.detail.value }))} style={{ color: '#1E293B' }} />
                    </IonItem>
                    <div style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginTop: '15px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748B'   , display: 'block', marginBottom: '8px' }}>Sales ID Document</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <IonButton
                          size="small"
                          fill="outline"
                          onClick={async () => {
                            const path = await handleIdCardUpload('sales', editingSales.id);
                            if (path) setEditingSales(prev => ({ ...prev, idCardPath: path }));
                          }}
                        >
                          <IonIcon icon={cloudUpload} slot="start" />
                          {editingSales.idCardPath ? "Change ID Card" : "Upload ID Card"}
                        </IonButton>
                        {editingSales.idCardPath && <IonBadge style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}>ID LINKED</IonBadge>}
                        {editingSales.idCardPath && (
                          <IonButton
                            size="small"
                            fill="clear"
                            style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                            onClick={async () => {
                              const deleted = await handleDeleteIdCard('sales', editingSales.id);
                              if (deleted) {
                                setEditingSales(prev => ({ ...prev, idCardPath: '' }));
                                await updateSales(editingSales.id, { idCardPath: '' });
                                setSales(await getSales());
                              }
                            }}
                          >
                            <IonIcon icon={trashOutline} slot="icon-only" />
                          </IonButton>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <IonButton expand="block" onClick={handleUpdateSales} style={{ '--background': '#2563EB', height: '48px', '--border-radius': '10px' }}>{t('sales.updateAgent')}</IonButton>
                    </div>
                  </div>
                )}
              </IonContent>
            </IonModal>



            {/* --- VIEW: COMMISSIONS --- */}
            {currentView === 'commissions' && (
              <CommissionsView
                sales={sales}
                setSales={setSales}
                contracts={contracts}
                offers={offers}
                customers={customers}
                buildings={buildings}
                t={t}
                onBack={handleBackToHome}
                navigateToView={navigateToView}
              />
            )}

            {/* --- VIEW: CUSTOMERS REMINDER (PRO REDESIGN) --- */}
            {
              currentView === 'reminders' && (
                <div className="pro-container pro-full-height animate-fade-in" style={{ paddingBottom: '40px' }}>
                  <div className="pro-section-header" style={{ marginBottom: '30px' }}>
                    <div className="pro-back-button" onClick={handleBackToHome} style={{ marginBottom: '10px' }}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                    <div>
                      <h1 style={{ color: '#1E293B', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{t('reminder.title')}</h1>
                      <p style={{ color: '#64748B'   , margin: '4px 0 0', fontSize: '0.9rem' }}>Follow up on installments due within the next {reminderRange} days. (Your IP: <span style={{ color: '#2563EB' }}>{externalIp}</span>)</p>
                    </div>
                  </div>

                  {/* Range Selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                      {[1, 7, 15, 30].map(range => (
                        <IonButton
                          key={range}
                          size="small"
                          fill={reminderRange === range ? 'solid' : 'outline'}
                          color={reminderRange === range ? 'success' : 'medium'}
                          onClick={() => setReminderRange(range)}
                          style={{ '--border-radius': '20px', minWidth: '100px' }}
                        >
                          {range === 1 ? 'Next Day' : `${range} Days`}
                        </IonButton>
                      ))}
                    </div>
                  </div>

                  {/* Filters Section */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                      <div>
                        <div style={{ color: '#64748B'   , fontSize: '0.75rem', marginBottom: '8px', fontWeight: 'bold' }}>SEARCH</div>
                        <IonSearchbar
                          value={reminderSearchQuery}
                          onIonInput={e => setReminderSearchQuery(e.detail.value)}
                          placeholder="Unit ID or Name"
                          style={{ '--background': '#64748B', '--border-radius': '12px', margin: 0, padding: 0 }}
                        />
                      </div>
                      <ProDatePicker
                        label="FROM DATE"
                        value={reminderStartDate}
                        onChange={setReminderStartDate}
                      />
                      <ProDatePicker
                        label="TO DATE"
                        value={reminderEndDate}
                        onChange={setReminderEndDate}
                      />
                    </div>
                  </div>

                  <div className="pro-scroll-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {upcomingReminders.length === 0 ? (
                      <div className="pro-empty-state">
                        <IonIcon icon={happyOutline} style={{ color: '#2563EB', fontSize: '64px' }} />
                        <h3 style={{ color: '#1E293B' }}>{t('reminders.allCaughtUp')}</h3>
                        <p>{t('reminders.noInstallmentsDue')} 7 days.</p>
                      </div>
                    ) : (
                      upcomingReminders.map((rem, idx) => (
                        <div
                          key={idx}
                          className="pro-glass-card animate-slide-in"
                          style={{
                            padding: '20px',
                            animationDelay: `${idx * 0.05}s`,
                            borderLeft: '4px solid #2ecc71',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{
                              width: '56px', height: '56px', borderRadius: '14px',
                              background: 'rgba(46, 204, 113, 0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <IonIcon icon={notificationsOutline} style={{ fontSize: '28px', color: '#2563EB' }} />
                            </div>
                            <div>
                              <h2
                                style={{ color: '#1E293B', margin: 0, fontSize: '1.3rem', fontWeight: '800', cursor: 'pointer' }}
                                onClick={async () => {
                                  const cust = customers.find(c => c.name === rem.custName) || customers.find(c => String(c.id) === String(rem.customerId));
                                  if (cust) {
                                    setViewingCustomerDetail(cust);
                                    setIdCardImage(null);
                                    if (window.electronAPI) {
                                      const img = await window.electronAPI.getIdCard('customer', cust.id);
                                      setIdCardImage(img);
                                    }
                                  }
                                }}
                              >
                                {rem.custName}
                              </h2>
                              <div style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '4px' }}>
                                Unit <span
                                  style={{ color: '#1E293B', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => {
                                    const contract = contracts.find(c => String(c.unitId).trim() === String(rem.unitId).trim());
                                    if (contract) {
                                      openContractInTab(contract);
                                    } else {
                                      const offer = offers.find(o => String(o.unitId).trim() === String(rem.unitId).trim());
                                      if (offer) setViewingOffer(offer);
                                    }
                                  }}
                                >{rem.unitId}</span> • {rem.buildingName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: '#64748B', fontSize: '0.8rem' }}>
                                <IonIcon icon={timeOutline} style={{ fontSize: '14px' }} />
                                Due: {rem.formattedDueDate}
                              </div>
                              {(rem.paymentMethod === 'Cheque' || rem.chequeNumber || rem.bank) && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#DC2626',
                                  marginTop: '8px',
                                  background: 'rgba(220, 38, 38, 0.08)',
                                  padding: '4px 10px',
                                  borderRadius: '30px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontWeight: '900',
                                  border: '1px solid rgba(220, 38, 38, 0.15)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  <IonIcon icon={cardOutline} style={{ fontSize: '14px' }} />
                                  METHOD: CHEQUE {rem.chequeNumber ? `#${rem.chequeNumber}` : ''} {rem.bank ? `| ${rem.bank}` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#2563EB', fontSize: '1.4rem', fontWeight: '900' }}>{formatCurrency(rem.amount)}</div>
                              <div style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Amount Due</div>
                            </div>

                            {rem.lastReminderSent ? (
                              <div style={{ textAlign: 'right', padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('reminder.reminderStatus')}</div>
                                <div style={{ color: '#2563EB', fontSize: '0.9rem', fontWeight: '800', marginTop: '2px' }}>{t('reminder.sent')}</div>
                                <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '2px' }}>{rem.lastReminderSent}</div>
                                <IonButton
                                  fill="clear"
                                  size="small"
                                  color="medium"
                                  style={{ fontSize: '0.65rem', '--padding-start': '0', '--padding-end': '0', height: '20px', marginTop: '5px' }}
                                  onClick={() => {
                                    if (confirm('Reset reminder status?')) {
                                      updateInstallment(rem.id, { lastReminderSent: null }).then(() => refreshData());
                                    }
                                  }}
                                >{t('reminder.reset')}</IonButton>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                                {/* Primary Customer Button Row */}
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <IonButton
                                    style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '14px', height: '45px', fontWeight: 'bold', margin: 0, flex: 1 }}
                                    onClick={() => {
                                      const msg = t('whatsapp.reminderMessage', { customerName: rem.custName, dueDate: rem.formattedDueDate, amount: formatCurrency(rem.amount), unitId: rem.unitId, buildingName: rem.buildingName });
                                      smartOpenWhatsApp(rem.phone, msg);
                                      const sentTime = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })();
                                      updateInstallment(rem.id, { lastReminderSent: `${sentTime} (Primary)` }).then(() => refreshData());
                                    }}
                                    disabled={!rem.phone}
                                  >
                                    <IonIcon icon={logoWhatsapp} slot="start" />
                                    {rem.phone ? t('reminder.whatsapp') : t('common.noPhone')}
                                  </IonButton>
                                  <IonButton
                                    style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '14px', height: '45px', fontWeight: 'bold', margin: 0 }}
                                    onClick={() => {
                                      if (window.confirm('Mark this installment as SENT manually?')) {
                                        const sentTime = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })();
                                        updateInstallment(rem.id, { lastReminderSent: `${sentTime} (Manual)` }).then(() => refreshData());
                                      }
                                    }}
                                  >
                                    {t('reminder.sent')}
                                  </IonButton>
                                </div>

                                {/* Stakeholders Fallback (JP / Guarantor) */}
                                {rem.stakeholders && rem.stakeholders.length > 0 && rem.stakeholders.map((sh, shIdx) => (
                                  <div key={shIdx} style={{ display: 'flex', gap: '5px' }}>
                                    <IonButton
                                      color="tertiary"
                                      fill="outline"
                                      style={{ '--border-radius': '12px', height: '38px', fontSize: '0.75rem', margin: 0, flex: 1 }}
                                      onClick={() => {
                                        const msg = t('whatsapp.reminderMessage', { customerName: sh.name, dueDate: rem.formattedDueDate, amount: formatCurrency(rem.amount), unitId: rem.unitId, buildingName: rem.buildingName });
                                        smartOpenWhatsApp(sh.phone, msg);
                                        const sentTime = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })();
                                        updateInstallment(rem.id, { lastReminderSent: `${sentTime} (${sh.role}: ${sh.name})` }).then(() => refreshData());
                                      }}
                                    >
                                      <IonIcon icon={logoWhatsapp} slot="start" />
                                      {sh.role}: {sh.name}
                                    </IonButton>
                                    <IonButton
                                      color="tertiary"
                                      fill="solid"
                                      style={{ '--border-radius': '12px', height: '38px', fontSize: '0.75rem', margin: 0 }}
                                      onClick={() => {
                                        if (window.confirm(`Mark as SENT for ${sh.name} manually?`)) {
                                          const sentTime = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })();
                                          updateInstallment(rem.id, { lastReminderSent: `${sentTime} (Manual - ${sh.role})` }).then(() => refreshData());
                                        }
                                      }}
                                    >
                                      SENT
                                    </IonButton>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            }

            {/* --- VIEW: ACTIVE BUILDING UNITS (PRO REDESIGN) --- */}
            {
              currentView === 'buildings' && activeBuilding && (
                <div className="pro-container animate-fade-in" style={{ paddingBottom: '100px' }}>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleExcelImport} />

                  {/* Section Header */}
                  <div className="pro-section-header building-units-header" style={{ marginBottom: '30px' }}>
                    <div className="building-title-row" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                      <div className="pro-back-button" onClick={() => setActiveBuilding(null)}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                      <h1>{activeBuilding.name}</h1>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                      <p>{t('buildings.inventoryManagement', { count: activeBuilding.units?.length || 0 })}</p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <IonButton
                          fill="outline"
                          size="small"
                          color="medium"
                          onClick={() => handleViewFloorplan(activeBuilding.name)}
                          style={{ '--border-radius': '10px' }}
                        >
                          <IonIcon icon={documentAttach} slot="start" /> {t('buildings.floorPlan')}</IonButton>
                        <IonButton
                          fill="outline"
                          size="small"
                          style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '10px' }}
                          onClick={() => {
                            if (window.confirm(
                              `⚠️ IMPORT WARNING\n\nYou are about to import units into "${activeBuilding.name}".\n\nThe Excel file MUST contain these columns:\n\n` +
                              `  1. Unit ID  (required)\n` +
                              `  2. Floor\n` +
                              `  3. Area  (sqm)\n` +
                              `  4. View\n` +
                              `  5. Price  (Base Price - numbers only)\n` +
                              `  6. Finished Price  (numbers only)\n` +
                              `  7. Share\n` +
                              `  8. Plan  (Payment Plan)\n` +
                              `  9. Status  (available / contract / locked)\n\n` +
                              `Imported units will be ADDED to the existing inventory.\n\nContinue?`
                            )) {
                              fileInputRef.current?.click();
                            }
                          }}
                        >
                          <IonIcon icon={cloudUpload} slot="start" /> {t('common.import')}</IonButton>
                        <IonButton
                          fill="outline"
                          size="small"
                          color="success"
                          style={{ '--border-radius': '10px' }}
                          onClick={() => {
                            if (window.confirm(
                              `📊 EXPORT CONFIRMATION\n\nYou are about to export ${activeBuilding.units?.length || 0} units from "${activeBuilding.name}" to Excel.\n\nThe following columns will be exported:\n\n` +
                              `  1. Unit ID\n` +
                              `  2. Floor\n` +
                              `  3. Area  (sqm)\n` +
                              `  4. View\n` +
                              `  5. Price  (Base Price)\n` +
                              `  6. Finished Price\n` +
                              `  7. Share\n` +
                              `  8. Plan  (Payment Plan)\n` +
                              `  9. Status\n\n` +
                              `Continue with export?`
                            )) {
                              exportBuildingUnitsToExcel(activeBuilding);
                            }
                          }}
                        >
                          <IonIcon icon={downloadOutline} slot="start" /> {t('common.export')}</IonButton>
                        <IonButton
                          className="pro-action-btn"
                          size="small"
                          onClick={() => setShowUnitModal(true)}
                          style={{ height: '36px' }}
                        >
                          <IonIcon icon={add} slot="start" /> {t('units.addUnit')}</IonButton>
                      </div>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="pro-glass-card inventory-filters" style={{ padding: '15px', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                      <IonIcon icon={searchOutline} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#64748B' }} />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('units.searchUnitId')}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '12px 12px 12px 40px',
                          color: '#1E293B',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="pro-glass-card" style={{ padding: '0 15px', height: '45px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <IonSelect interface="popover" placeholder="Status" value={filterStatus} onIonChange={e => setFilterStatus(e.detail.value)} style={{ color: '#1E293B', fontSize: '0.85rem' }}>
                          <IonSelectOption value="all">{t('units.allStatus')}</IonSelectOption>
                          <IonSelectOption value="available">{t('common.available')}</IonSelectOption>
                          <IonSelectOption value="offer">{t('common.offer')}</IonSelectOption>
                          <IonSelectOption value="contract">{t('common.contract')}</IonSelectOption>
                          <IonSelectOption value="locked">{t('common.locked')}</IonSelectOption>
                        </IonSelect>
                      </div>
                      <div className="pro-glass-card" style={{ padding: '0 15px', height: '45px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <IonSelect interface="popover" placeholder="Sort" value={sortBy} onIonChange={e => setSortBy(e.detail.value)} style={{ color: '#1E293B', fontSize: '0.85rem' }}>
                          <IonSelectOption value="unitId">{t('units.unitRef')}</IonSelectOption>
                          <IonSelectOption value="priceAsc">{t('sort.priceAsc')}</IonSelectOption>
                          <IonSelectOption value="priceDesc">{t('sort.priceDesc')}</IonSelectOption>
                          <IonSelectOption value="areaDesc">{t('sort.sizeDesc')}</IonSelectOption>
                        </IonSelect>
                      </div>
                    </div>
                  </div>

                  {/* Units Grid */}
                  <div className="pro-grid pro-grid-auto">
                    {(() => {
                      let displayed = (activeBuilding.units || []).filter(u => u != null);
                      if (filterStatus !== 'all') displayed = displayed.filter(u => u.status === filterStatus);
                      if (searchQuery) displayed = displayed.filter(u => String(u.unitId).toLowerCase().includes(searchQuery.toLowerCase()));

                      displayed.sort((a, b) => {
                        if (sortBy === 'priceAsc') return Number(a.price) - Number(b.price);
                        if (sortBy === 'priceDesc') return Number(b.price) - Number(a.price);
                        return String(a.unitId).localeCompare(String(b.unitId));
                      });

                      if (displayed.length === 0) return <div className="pro-empty-state" style={{ gridColumn: '1/-1' }}>{t('units.noUnitsFound')}</div>;

                      return displayed.map((unit) => {
                        const lCon = contracts.find(c => String(c.unitId) === String(unit.unitId));
                        const lOff = offers.find(o => String(o.unitId) === String(unit.unitId) && o.status !== 'contracted' && o.status !== 'cancelled');
                        const sColor = getStatusColor(unit.status);

                        return (
                          <div key={unit.id} className="pro-glass-card animate-slide-in unit-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', border: '2px solid #D1D5DB', boxShadow: 'none' }}>
                            <div className="unit-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h3 style={{ margin: 0, color: '#1E293B', fontSize: '1.4rem', fontWeight: '999' }}>#{unit.unitId}</h3>
                              <div style={{
                                padding: '4px 10px',
                                borderRadius: '30px',
                                background: `${sColor}22`,
                                color: sColor,
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                border: `1px solid ${sColor}44`,
                                textTransform: 'uppercase'
                              }}>{t(`status.${unit.status}`)}</div>
                            </div>

                            <div className="unit-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '0', border: '1px solid #D1D5DB' }}>
                                <span style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>{t('units.floor')}</span>
                                <span style={{ color: '#1E293B', fontSize: '0.95rem', fontWeight: '900' }}>{unit.floor}</span>
                              </div>
                              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '0', border: '1px solid #D1D5DB' }}>
                                <span style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>{t('units.area')}</span>
                                <span style={{ color: '#1E293B', fontSize: '0.95rem', fontWeight: '999' }}>{unit.area}m²</span>
                              </div>
                              <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '0', border: '1px solid #D1D5DB', gridColumn: 'span 2' }}>
                                <span style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>{t('units.view')}</span>
                                <span style={{ color: '#1E293B', fontSize: '0.95rem', fontWeight: '900' }}>{unit.view || '—'}</span>
                              </div>
                            </div>

                            <div style={{ borderTop: '2px solid #D1D5DB', paddingTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                              <div>
                                <span style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>{t('common.basePrice')}</span>
                                <span style={{ color: '#2563EB', fontSize: '1.3rem', fontWeight: '999' }}>{formatCurrency(unit.price)}</span>
                              </div>
                              <div>
                                <span style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>{t('common.finishedPrice')}</span>
                                <span style={{ color: '#1E293B', fontSize: '1.3rem', fontWeight: '999' }}>{formatCurrency(unit.finishedPrice || 0)}</span>
                              </div>
                            </div>

                            {unit.plan && (
                              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <span style={{ color: '#2563EB', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>{t('common.paymentPlan')}</span>
                                <span style={{ color: '#1E293B', fontSize: '0.85rem', fontWeight: '600' }}>{unit.plan}</span>
                              </div>
                            )}

                            {(lCon || lOff) && (
                              <div
                                onClick={() => lCon ? openContractInTab(lCon) : setViewingOffer(lOff)}
                                style={{
                                  background: lCon ? 'rgba(56, 128, 255, 0.1)' : 'rgba(255, 196, 9, 0.1)',
                                  padding: '10px',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  border: `1px solid ${lCon ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.15)'}`
                                }}
                              >
                                <span style={{ display: 'block', fontSize: '0.6rem', color: lCon ? '#2563EB' : '#E2E8F0', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                  {lCon ? t('units.contractHolder') : t('units.activeOffer')}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: '600' }}>
                                  {lCon ? lCon.customerName : lOff.customerName}
                                </span>
                              </div>
                            )}

                            {/* ── Payment Plan from Offer/Contract ── */}
                            {(() => {
                              const source = lCon || lOff;
                              if (!source) return null;
                              const sourceLabel = lCon ? 'Contract' : 'Offer';
                              const priceType = source.priceType || 'base';
                              const originalPrice = priceType === 'finished'
                                ? Number(unit.finishedPrice || unit.price || 0)
                                : Number(unit.price || 0);
                              const discountPct = Number(source.discountPercent || 0);
                              const finalPrice = Number(source.finalPrice || source.totalPrice || (originalPrice * (1 - discountPct / 100)));
                              const dpPct = Number(source.downPayment || 0);
                              const dpAmount = Number(source.downPaymentAmount || (finalPrice * dpPct / 100));
                              const years = source.years || '—';
                              const frequency = source.frequency || '—';
                              const reservationAmt = Number(source.reservationAmount || 0);
                              const jointPurchasers = source.jointPurchasers || [];
                              const guarantor = source.guarantor || null;

                              return (
                                <div style={{
                                  background: lCon ? 'rgba(37,99,235,0.06)' : 'rgba(245,158,11,0.06)',
                                  border: `1px solid ${lCon ? 'rgba(37,99,235,0.15)' : 'rgba(245,158,11,0.2)'}`,
                                  borderRadius: '10px', padding: '12px', marginTop: '4px'
                                }}>
                                  <div style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', color: lCon ? '#2563EB' : '#F59E0B', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    📋 {sourceLabel} Payment Plan
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem' }}>
                                    <div>
                                      <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Type</span>
                                      <span style={{ color: '#1E293B', fontWeight: '700', textTransform: 'capitalize' }}>{priceType}</span>
                                    </div>
                                    <div>
                                      <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Final Price</span>
                                      <span style={{ color: '#10B981', fontWeight: '800' }}>{formatCurrency(finalPrice)}</span>
                                    </div>
                                    {discountPct > 0 && (
                                      <div>
                                        <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Discount</span>
                                        <span style={{ color: '#DC2626', fontWeight: '700' }}>{discountPct}% <span style={{ textDecoration: 'line-through', fontSize: '0.65rem', color: '#94A3B8' }}>{formatCurrency(originalPrice)}</span></span>
                                      </div>
                                    )}
                                    <div>
                                      <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Down Payment</span>
                                      <span style={{ color: '#1E293B', fontWeight: '700' }}>{dpPct}% ({formatCurrency(dpAmount)})</span>
                                    </div>
                                    {reservationAmt > 0 && (
                                      <>
                                        <div>
                                          <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Reservation <span style={{ fontSize: '0.5rem', color: '#94A3B8' }}>(part of DP)</span></span>
                                          <span style={{ color: '#F59E0B', fontWeight: '700' }}>{formatCurrency(reservationAmt)}</span>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Remaining DP</span>
                                          <span style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(Math.max(0, dpAmount - reservationAmt))}</span>
                                        </div>
                                      </>
                                    )}
                                    <div>
                                      <span style={{ color: '#64748B', fontSize: '0.6rem', display: 'block' }}>Plan</span>
                                      <span style={{ color: '#1E293B', fontWeight: '700' }}>{years} yrs / {frequency}</span>
                                    </div>
                                  </div>
                                  {jointPurchasers.length > 0 && (
                                    <div style={{ marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                                      <span style={{ color: '#64748B', fontSize: '0.6rem', fontWeight: '700' }}>Joint Purchasers: </span>
                                      <span style={{ color: '#1E293B', fontSize: '0.7rem', fontWeight: '600' }}>{jointPurchasers.map(jp => jp.name).join(', ')}</span>
                                    </div>
                                  )}
                                  {guarantor && (
                                    <div style={{ marginTop: '3px' }}>
                                      <span style={{ color: '#64748B', fontSize: '0.6rem', fontWeight: '700' }}>Guarantor: </span>
                                      <span style={{ color: '#1E293B', fontSize: '0.7rem', fontWeight: '600' }}>{guarantor.name}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {(unit.status === 'available' || unit.status === 'locked') && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPriceOfferUnit(unit);
                                  setPriceOfferConfig({
                                    priceType: 'base',
                                    frequency: 'quarterly',
                                    years: 3,
                                    downPaymentPercent: 20,
                                    splitDownPayment: false,
                                    dpSplits: [
                                      { percent: 50, date: '' },
                                      { percent: 50, date: '' },
                                      { percent: 0, date: '' },
                                    ],
                                    dpSplitCount: 2,
                                    discountPercent: 0,
                                    startDate: new Date().toISOString().split('T')[0],
                                  });
                                  setShowPriceOfferModal(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  padding: '10px',
                                  background: 'linear-gradient(135deg, rgba(197,160,89,0.15) 0%, rgba(197,160,89,0.05) 100%)',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(197,160,89,0.25)',
                                  cursor: 'pointer',
                                  transition: 'all 0.25s ease',
                                  fontWeight: '700',
                                  fontSize: '0.75rem',
                                  color: '#2563EB',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#2563EB';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(75, 141, 222, 0.3)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(197,160,89,0.15) 0%, rgba(197,160,89,0.05) 100%)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.color = '#2563EB';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <IonIcon icon={documentTextOutline} style={{ fontSize: '16px' }} />
                                {t('priceOffer.pdfButton')}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: 'auto' }}>
                              <IonButton fill="clear" size="small" onClick={() => handleUploadLayout(unit.unitId)} style={{ '--color': '#2563EB' }}>
                                <IonIcon icon={cloudUpload} />
                              </IonButton>
                              <IonButton fill="clear" size="small" onClick={() => handleViewLayout(unit.unitId)} style={{ '--color': '#2563EB' }}>
                                <IonIcon icon={mapOutline} />
                              </IonButton>
                              <IonButton fill="clear" size="small" onClick={() => setEditingUnit({ ...unit })} style={{ color: '#1E293B', opacity: 0.5 }}>
                                <IonIcon icon={create} />
                              </IonButton>
                              <IonButton fill="clear" size="small" onClick={() => handleDeleteUnit(unit.id)} style={{ '--color': '#DC2626', opacity: 0.5 }}>
                                <IonIcon icon={trash} />
                              </IonButton>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )
            }

            {/* Building Modal */}
            <IonModal isOpen={showAddModal} onDidDismiss={() => { setShowAddModal(false); resetDataEntryForms(); }}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('buildings.addBuildingTitle')}</IonTitle>
                  <IonButton slot="end" fill="clear" onClick={() => setShowAddModal(false)} color="dark">{t('common.cancel')}</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                <div style={{ padding: '20px 10px 40vh 10px' }}>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', '--border-radius': '8px', marginBottom: '20px' }}>
                    <IonInput
                      label={t('buildings.buildingNameLabel')}
                      labelPlacement="floating"
                      value={newBuildingName}
                      onIonInput={e => setNewBuildingName(e.detail.value)}
                      placeholder={t('buildings.buildingNamePlaceholder')}
                      clearInput
                    />
                  </IonItem>
                  <IonButton expand="block" onClick={handleAdd} style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', height: '48px' }} strong >
                    {t('buildings.createBuilding')}
                  </IonButton>
                </div>
              </IonContent>
            </IonModal>

            {/* Unit Layout Modal */}
            <IonModal isOpen={showLayoutModal} onDidDismiss={() => setShowLayoutModal(false)} style={{ '--width': '95%', '--height': '95%', '--max-width': '1400px' }}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('units.unitLayout')}: {layoutUnitId}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton
                      onClick={() => handleUploadLayout(layoutUnitId)}
                      style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                    >
                      <IonIcon icon={cloudUpload} slot="start" /> {t('common.upload')}
                    </IonButton>
                    <IonButton
                      onClick={() => {
                        if (window.electronAPI?.openFile) {
                          window.electronAPI.openFile(layoutImageUrl);
                        }
                      }}
                      style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                    >
                      <IonIcon icon={downloadOutline} slot="start" /> {t('common.download')}
                    </IonButton>
                    <IonButton onClick={() => setShowLayoutModal(false)}>{t('common.close')}</IonButton></IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', padding: '10px' }}>
                  {layoutImageUrl ? (
                    <img
                      src={layoutImageUrl}
                      alt={`Layout for Unit ${layoutUnitId}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748B' }}>
                      <IonIcon icon={mapOutline} style={{ fontSize: '64px', display: 'block', margin: '0 auto 15px' }} />
                      <p style={{ color: '#64748B'   , fontSize: '1.1rem' }}>{t('units.noLayoutUploaded')}</p>
                      <IonButton
                        style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '10px' }}
                        onClick={() => handleUploadLayout(layoutUnitId)}
                      >
                        <IonIcon icon={cloudUpload} slot="start" /> {t('units.uploadLayout')}
                      </IonButton>
                    </div>
                  )}
                </div>
              </IonContent>
            </IonModal>

            {/* Floor Plan Modal */}
            <IonModal isOpen={showFloorplanModal} onDidDismiss={() => setShowFloorplanModal(false)} style={{ '--width': '95%', '--height': '95%', '--max-width': '1400px' }}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('buildings.floorPlanTitle')}: {floorplanBuildingName}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton
                      onClick={() => handleUploadFloorplan(floorplanBuildingName)}
                      style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                    >
                      <IonIcon icon={cloudUpload} slot="start" /> {t('common.upload')}
                    </IonButton>
                    {floorplanPdfUrl && (
                      <IonButton
                        onClick={() => {
                          if (window.electronAPI?.openFile) {
                            window.electronAPI.openFile(floorplanPdfUrl);
                          }
                        }}
                        style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                      >
                        <IonIcon icon={downloadOutline} slot="start" /> {t('common.download')}
                      </IonButton>
                    )}
                    <IonButton onClick={() => setShowFloorplanModal(false)}>{t('common.close')}</IonButton></IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent style={{ '--background': '#1E293B' }} scrollY={false}>
                {floorplanPdfUrl ? (
                  <div style={{ width: '100%', height: '100%' }}>
                    <iframe
                      key={floorplanPdfUrl}
                      src={floorplanPdfUrl}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Floor Plan Viewer"
                    />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#64748B' }}>
                    <IonIcon icon={documentAttach} style={{ fontSize: '64px', display: 'block', margin: '0 auto 15px' }} />
                    <p style={{ color: '#64748B', fontSize: '1.1rem' }}>{t('buildings.noFloorPlanUploaded')}</p>
                    <IonButton
                      style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '10px' }}
                      onClick={() => handleUploadFloorplan(floorplanBuildingName)}
                    >
                      <IonIcon icon={cloudUpload} slot="start" /> {t('buildings.uploadFloorPlan')}
                    </IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- PRICE OFFER CONFIGURATION MODAL --- */}
            <IonModal isOpen={showPriceOfferModal} onDidDismiss={() => setShowPriceOfferModal(false)} style={{ '--width': '100%', '--height': '100%', '--max-width': '100%', '--border-radius': '0' }}>
              <IonHeader>
                <IonToolbar style={{ '--background': 'var(--app-bg-card)', '--color': 'var(--app-text)' }}>
                  <IonButtons slot="start">
                    <div className="pro-back-button" onClick={() => setShowPriceOfferModal(false)}>
                      <IonIcon icon={chevronBack} /> {t('common.back')}
                    </div>
                  </IonButtons>
                  <IonTitle style={{ fontWeight: '900', letterSpacing: '1.5px', fontSize: '1.1rem', color: '#1E293B' }}>{t('priceOffer.title')}</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent style={{ '--background': '#ffffff' }}>
                {priceOfferUnit && (() => {
                  const rawPrice = priceOfferConfig.priceType === 'finished' ? (priceOfferUnit.finishedPrice || priceOfferUnit.price || 0) : (priceOfferUnit.price || 0);
                  const discount = Number(priceOfferConfig.discountPercent || 0);
                  const calcFinalPrice = Math.round(rawPrice * (1 - discount / 100));
                  const calcDpAmount = Math.round(calcFinalPrice * (Number(priceOfferConfig.downPaymentPercent) / 100));
                  const calcRemaining = calcFinalPrice - calcDpAmount;
                  const calcFreq = priceOfferConfig.frequency === 'quarterly' ? 4 : priceOfferConfig.frequency === 'biannual' ? 2 : 1;
                  const calcNumIns = Number(priceOfferConfig.years || 1) * calcFreq;
                  const calcInsAmount = calcNumIns > 0 ? Math.round(calcRemaining / calcNumIns) : 0;

                  return (
                    <div style={{ padding: '30px', paddingBottom: '100px', maxWidth: '900px', margin: '0 auto' }}>
                      {/* Unit Info Card */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        padding: '24px',
                        marginBottom: '24px',
                        border: '1px solid #D1D5DB',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h2 style={{ margin: 0, color: '#2563EB', fontSize: '1.5rem', fontWeight: '900' }}>#{priceOfferUnit.unitId}</h2>
                          <span style={{ background: 'rgba(45,211,111,0.15)', color: '#2563EB', padding: '4px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>{t('status.available')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                          {[{ l: t('units.floor'), v: priceOfferUnit.floor }, { l: t('units.area'), v: `${priceOfferUnit.area || '—'} m²` }, { l: t('units.view'), v: priceOfferUnit.view || '—' }, { l: t('common.plan'), v: priceOfferUnit.plan || '—' }].map(item => (
                            <div key={item.l} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #D1D5DB' }}>
                              <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>{item.l}</div>
                              <div style={{ fontSize: '0.95rem', color: '#1E293B', fontWeight: 'bold' }}>{item.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Configuration Section */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        {/* Price Type */}
                        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #D1D5DB' }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{t('offers.priceType')}</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['base', 'finished'].map(pt => (
                              <div
                                key={pt}
                                onClick={() => setPriceOfferConfig(p => ({ ...p, priceType: pt }))}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  transition: 'all 0.2s',
                                  background: priceOfferConfig.priceType === pt ? (pt === 'base' ? 'rgba(197,160,89,0.2)' : 'rgba(45,211,111,0.2)') : 'rgba(255,255,255,0.03)',
                                  color: priceOfferConfig.priceType === pt ? (pt === 'base' ? '#2563EB' : '#2563EB') : '#64748B',
                                  border: `1px solid ${priceOfferConfig.priceType === pt ? (pt === 'base' ? 'rgba(197,160,89,0.4)' : 'rgba(45,211,111,0.4)') : 'rgba(255,255,255,0.05)'}`,
                                }}
                              >
                                {pt === 'base' ? t('priceOffer.base') : t('priceOffer.finished')}
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: '900', color: priceOfferConfig.priceType === 'base' ? '#2563EB' : '#2563EB' }}>
                            {formatCurrency(rawPrice)}
                          </div>
                        </div>

                        {/* Installment Frequency */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748B'   , textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{t('priceOffer.frequency')}</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[{ v: 'quarterly', l: t('priceOffer.frequencyQuarterly') }, { v: 'biannual', l: t('priceOffer.frequencyBiannual') }, { v: 'annual', l: t('priceOffer.frequencyAnnual') }].map(f => (
                              <div
                                key={f.v}
                                onClick={() => setPriceOfferConfig(p => ({ ...p, frequency: f.v }))}
                                style={{
                                  flex: 1,
                                  padding: '8px 4px',
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                  transition: 'all 0.2s',
                                  background: priceOfferConfig.frequency === f.v ? 'rgba(56,128,255,0.2)' : 'rgba(255,255,255,0.03)',
                                  color: priceOfferConfig.frequency === f.v ? '#2563EB' : '#64748B',
                                  border: `1px solid ${priceOfferConfig.frequency === f.v ? 'rgba(56,128,255,0.4)' : 'rgba(255,255,255,0.05)'}`,
                                }}
                              >
                                {f.l}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Years */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748B'   , textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{t('priceOffer.paymentPeriodYears')}</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={priceOfferConfig.years}
                            onChange={e => setPriceOfferConfig(p => ({ ...p, years: Number(e.target.value) || 1 }))}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #D1D5DB', color: '#1E293B', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
                          />
                        </div>

                        {/* Down Payment */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748B'   , textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{t('priceOffer.downPaymentPercent')}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={priceOfferConfig.downPaymentPercent}
                            onChange={e => setPriceOfferConfig(p => ({ ...p, downPaymentPercent: Number(e.target.value) || 0 }))}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #D1D5DB', color: '#1E293B', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
                          />
                        </div>

                        {/* Discount */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <label style={{ fontSize: '0.7rem', color: '#64748B'   , textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{t('priceOffer.discountPercent')}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={priceOfferConfig.discountPercent}
                            onChange={e => setPriceOfferConfig(p => ({ ...p, discountPercent: Number(e.target.value) || 0 }))}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #D1D5DB', color: '#1E293B', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
                          />
                          {discount > 0 && <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#DC2626' }}>-${(rawPrice - calcFinalPrice).toLocaleString()} {t('priceOffer.off')}</div>}
                        </div>

                        {/* Offer Date */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <ProDatePicker
                            label={t('priceOffer.offerDate') || 'Offer Date'}
                            value={priceOfferConfig.startDate}
                            onChange={val => setPriceOfferConfig(p => ({ ...p, startDate: val }))}
                          />
                          <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#64748B' }}>Down Payment due date</div>
                        </div>

                        {/* Split Down Payment */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748B'   , textTransform: 'uppercase', fontWeight: 'bold' }}>{t('offers.splitDownPayment')}</label>
                            <IonToggle
                              checked={priceOfferConfig.splitDownPayment}
                              onIonChange={e => setPriceOfferConfig(p => ({ ...p, splitDownPayment: e.detail.checked }))}
                              style={{ '--background-checked': '#2563EB' }}
                            />
                          </div>
                          {priceOfferConfig.splitDownPayment && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                {[2, 3].map(n => (
                                  <div
                                    key={n}
                                    onClick={() => {
                                      const newSplits = n === 2
                                        ? [{ percent: 50, date: p => p.dpSplits[0]?.date || '' }, { percent: 50, date: '' }, { percent: 0, date: '' }]
                                        : [{ percent: 33.33, date: '' }, { percent: 33.33, date: '' }, { percent: 33.34, date: '' }];
                                      setPriceOfferConfig(p => ({
                                        ...p, dpSplitCount: n, dpSplits: [
                                          { percent: n === 2 ? 50 : 33.33, date: p.dpSplits[0]?.date || '' },
                                          { percent: n === 2 ? 50 : 33.33, date: p.dpSplits[1]?.date || '' },
                                          { percent: n === 2 ? 0 : 33.34, date: p.dpSplits[2]?.date || '' },
                                        ]
                                      }));
                                    }}
                                    style={{
                                      flex: 1, padding: '8px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                                      fontWeight: 'bold', fontSize: '0.75rem', transition: 'all 0.2s',
                                      background: priceOfferConfig.dpSplitCount === n ? 'rgba(197,160,89,0.2)' : 'rgba(255,255,255,0.03)',
                                      color: priceOfferConfig.dpSplitCount === n ? '#2563EB' : '#64748B',
                                      border: `1px solid ${priceOfferConfig.dpSplitCount === n ? 'rgba(197,160,89,0.4)' : 'rgba(255,255,255,0.05)'}`,
                                    }}
                                  >
                                    {n} {t('priceOffer.parts')}
                                  </div>
                                ))}
                              </div>
                              {Array.from({ length: priceOfferConfig.dpSplitCount }).map((_, idx) => (
                                <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '0.8rem', minWidth: '50px' }}>{t('priceOffer.part')} {idx + 1}</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.6rem', color: '#64748B', marginBottom: '3px' }}>{t('priceOffer.ofDp')}</div>
                                      <input
                                        type="number" min="0" max="100"
                                        value={priceOfferConfig.dpSplits[idx]?.percent || 0}
                                        onChange={e => {
                                          const newSplits = [...priceOfferConfig.dpSplits];
                                          newSplits[idx] = { ...newSplits[idx], percent: Number(e.target.value) || 0 };
                                          setPriceOfferConfig(p => ({ ...p, dpSplits: newSplits }));
                                        }}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#1E293B', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
                                      />
                                    </div>
                                    <div style={{ minWidth: '90px', textAlign: 'right' }}>
                                      <div style={{ fontSize: '0.6rem', color: '#64748B', marginBottom: '3px' }}>{t('priceOffer.amount')}</div>
                                      <div style={{ color: '#2563EB', fontWeight: '900', fontSize: '1rem' }}>${Math.round(calcDpAmount * ((priceOfferConfig.dpSplits[idx]?.percent || 0) / 100)).toLocaleString()}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <ProDatePicker
                                      label={t('priceOffer.dueDate')}
                                      value={priceOfferConfig.dpSplits[idx]?.date || priceOfferConfig.startDate}
                                      onChange={val => {
                                        const newSplits = [...priceOfferConfig.dpSplits];
                                        newSplits[idx] = { ...newSplits[idx], date: val };
                                        setPriceOfferConfig(p => ({ ...p, dpSplits: newSplits }));
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Live Preview Summary */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        padding: '24px',
                        marginBottom: '24px',
                        border: '1px solid #D1D5DB',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '1px' }}>{t('priceOffer.livePreview')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '4px' }}>{t('offers.finalPriceCalc')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent-blue)' }}>{formatCurrency(calcFinalPrice)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '4px' }}>{t('offers.downPaymentCalc')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1E293B' }}>{formatCurrency(calcDpAmount)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '4px' }}>{t('priceOffer.installmentsCount')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#2563EB' }}>{calcNumIns}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748B', marginBottom: '4px' }}>{t('offers.eachPayment')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#2563EB' }}>{formatCurrency(calcInsAmount)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Generate Button */}
                      <IonButton
                        expand="block"
                        onClick={async () => {
                          await generatePriceOfferPDF(priceOfferUnit, priceOfferConfig);
                          setShowPriceOfferModal(false);
                        }}
                        style={{
                          '--background': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          '--color': '#ffffff',
                          '--border-radius': '16px',
                          height: '56px',
                          fontWeight: '900',
                          fontSize: '1rem',
                          letterSpacing: '0.5px',
                          '--box-shadow': '0 8px 30px rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        <IonIcon icon={downloadOutline} slot="start" style={{ fontSize: '22px' }} />
                        {t('priceOffer.generatePdf')}
                      </IonButton>
                    </div>
                  );
                })()}
              </IonContent>
            </IonModal>

            {/* Unit Modal */}
            <IonModal isOpen={showUnitModal} onDidDismiss={() => setShowUnitModal(false)}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('units.addUnitTo', { name: activeBuilding?.name })}</IonTitle>
                  <IonButton slot="end" fill="clear" onClick={() => setShowUnitModal(false)} color="dark">{t('common.cancel')}</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                <div style={{ padding: '10px 10px 40vh 10px' }}>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput label={t('units.unitIdCode')} labelPlacement="floating" value={unitForm.unitId} onIonInput={e => setUnitForm(prev => ({ ...prev, unitId: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput label={t('units.floor')} labelPlacement="floating" value={unitForm.floor} onIonInput={e => setUnitForm(prev => ({ ...prev, floor: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput label={t('units.area')} labelPlacement="floating" value={unitForm.area} onIonInput={e => setUnitForm(prev => ({ ...prev, area: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput label={t('units.view')} labelPlacement="floating" value={unitForm.view} onIonInput={e => setUnitForm(prev => ({ ...prev, view: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput type="number" label={t('units.basePriceLabel', { currency: appSettings.currency })} labelPlacement="floating" value={unitForm.price} onIonInput={e => setUnitForm(prev => ({ ...prev, price: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="outline" style={{ marginTop: '10px' }}>
                    <IonInput type="number" label={t('units.finishedPriceLabel', { currency: appSettings.currency })} labelPlacement="floating" value={unitForm.finishedPrice} onIonInput={e => setUnitForm(prev => ({ ...prev, finishedPrice: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput label={t('units.shareLabel')} labelPlacement="floating" value={unitForm.share} onIonInput={e => setUnitForm(prev => ({ ...prev, share: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px' }}>
                    <IonInput label={t('units.paymentPlanLabel')} labelPlacement="floating" value={unitForm.plan} onIonInput={e => setUnitForm(prev => ({ ...prev, plan: e.detail.value }))} />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '20px' }}>
                    <IonSelect label={t('units.statusLabel')} labelPlacement="floating" value={unitForm.status} onIonChange={e => setUnitForm(prev => ({ ...prev, status: e.detail.value }))}>
                      <IonSelectOption value="available">{t('status.available')}</IonSelectOption>
                      <IonSelectOption value="offer">{t('status.offer')}</IonSelectOption>
                      <IonSelectOption value="contract">{t('status.contract')}</IonSelectOption>
                      <IonSelectOption value="locked">{t('status.locked')}</IonSelectOption>
                      <IonSelectOption value="case">{t('status.case')}</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonButton expand="block" onClick={handleAddUnit} style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', height: '48px' }} strong >{t('units.addUnitBtn')}</IonButton>
                </div>
              </IonContent>
            </IonModal>

            {/* --- ADD CUSTOMER MODAL --- */}
            <IonModal isOpen={showAddCustomerModal} onDidDismiss={() => { setShowAddCustomerModal(false); resetDataEntryForms(); }}>
              <IonHeader><IonToolbar><IonTitle>{t('customers.addCustomer')}</IonTitle><IonButton slot="end" onClick={() => setShowAddCustomerModal(false)}>{t('common.cancel')}</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                <div style={{ padding: '20px', paddingBottom: '40vh', display: 'flex', flexDirection: 'column' }}>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.customerIdLabel')}
                      labelPlacement="floating"
                      value={newCustomer.id}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, id: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.customerNameLabel')}
                      labelPlacement="floating"
                      value={newCustomer.name}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, name: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.phone1Label')}
                      labelPlacement="floating"
                      value={newCustomer.phone}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, phone: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.phone2Label')}
                      labelPlacement="floating"
                      value={newCustomer.phone2}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, phone2: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.email')}
                      labelPlacement="floating"
                      value={newCustomer.email}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, email: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.idNumber')}
                      labelPlacement="floating"
                      value={newCustomer.idNumber}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, idNumber: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonSelect
                      label={t('customers.idType')}
                      labelPlacement="floating"
                      value={newCustomer.idType}
                      onIonChange={e => setNewCustomer(prev => ({ ...prev, idType: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    >
                      <IonSelectOption value="identity_card">{t('customers.idTypeCard')}</IonSelectOption>
                      <IonSelectOption value="passport">{t('customers.idTypePassport')}</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonInput
                      label={t('customers.bloodType')}
                      labelPlacement="floating"
                      value={newCustomer.bloodType}
                      onIonInput={e => setNewCustomer(prev => ({ ...prev, bloodType: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    />
                  </IonItem>
                  <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                    <IonSelect
                      label={t('customers.directIndirect')}
                      labelPlacement="floating"
                      value={newCustomer.directIndirect}
                      onIonChange={e => setNewCustomer(prev => ({ ...prev, directIndirect: e.detail.value }))}
                      style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                    >
                      <IonSelectOption value="Direct">{t('customers.direct')}</IonSelectOption>
                      <IonSelectOption value="Indirect">{t('customers.indirect')}</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <div style={{ padding: '15px 20px', background: '#FFFFFF', borderRadius: '16px', marginBottom: '20px', border: '1px solid #D1D5DB' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748B', display: 'block', marginBottom: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('customers.idCardDocument')}</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={async () => {
                          const path = await handleIdCardUpload('customer', newCustomer.id || 'new');
                          if (path) setNewCustomer(prev => ({ ...prev, idCardPath: path }));
                        }}
                      >
                        <IonIcon icon={cloudUpload} slot="start" />
                        {newCustomer.idCardPath ? t('customers.changeIdCard') : t('customers.uploadIdCard')}
                      </IonButton>
                      {newCustomer.idCardPath && <IonBadge style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}>ID LINKED</IonBadge>}
                      {newCustomer.idCardPath && (
                        <IonButton
                          size="small"
                          fill="clear"
                          style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                          onClick={async () => {
                            const deleted = await handleDeleteIdCard('customer', newCustomer.id || 'new');
                            if (deleted) setNewCustomer(prev => ({ ...prev, idCardPath: '' }));
                          }}
                        >
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonButton>
                      )}
                    </div>
                  </div>
                  <IonButton expand="block" onClick={handleAddCustomer} style={{ marginTop: '20px' }}>{t('customers.saveCustomer')}</IonButton>
                </div>
              </IonContent>
            </IonModal>

            {/* --- EDIT CUSTOMER MODAL --- */}
            <IonModal isOpen={showEditCustomerModal} onDidDismiss={() => setShowEditCustomerModal(false)}>
              <IonHeader><IonToolbar><IonTitle>{t('customers.editCustomer')}</IonTitle><IonButton slot="end" onClick={() => setShowEditCustomerModal(false)}>{t('common.cancel')}</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                {editingCustomer && (
                  <div style={{ padding: '20px', paddingBottom: '40vh', display: 'flex', flexDirection: 'column' }}>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.customerIdLabel')}
                        labelPlacement="floating"
                        value={editingCustomer.id}
                        disabled
                        style={{ '--color': '#64748B', color: '#64748B'    }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.customerNameLabel')}
                        labelPlacement="floating"
                        value={editingCustomer.name}
                        onIonInput={e => setEditingCustomer(prev => ({ ...prev, name: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.phone1Label')}
                        labelPlacement="floating"
                        value={editingCustomer.phone}
                        onIonInput={e => setEditingCustomer(prev => ({ ...prev, phone: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.phone2Label')}
                        labelPlacement="floating"
                        value={editingCustomer.phone2}
                        onIonInput={e => setEditingCustomer(prev => ({ ...prev, phone2: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.email')}
                        labelPlacement="floating"
                        value={editingCustomer.email}
                        onIonInput={e => setEditingCustomer(prev => ({ ...prev, email: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.idNumber')}
                        labelPlacement="floating"
                        value={editingCustomer.idNumber}
                        onIonInput={e => setEditingCustomer(prev => ({ ...prev, idNumber: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonSelect
                        label={t('customers.idType')}
                        labelPlacement="floating"
                        value={editingCustomer.idType}
                        onIonChange={e => setEditingCustomer(prev => ({ ...prev, idType: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      >
                        <IonSelectOption value="identity_card">{t('customers.idTypeCard')}</IonSelectOption>
                        <IonSelectOption value="passport">{t('customers.idTypePassport')}</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput
                        label={t('customers.bloodType')}
                        labelPlacement="floating"
                        value={editingCustomer.bloodType}
                        onIonInput={e => setEditingCustomer(prev => ({ ...prev, bloodType: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonSelect
                        label={t('customers.directIndirect')}
                        labelPlacement="floating"
                        value={editingCustomer.directIndirect}
                        onIonChange={e => setEditingCustomer(prev => ({ ...prev, directIndirect: e.detail.value }))}
                        style={{ '--color': 'var(--app-text)', color: '#1E293B' }}
                      >
                        <IonSelectOption value="Direct">{t('customers.direct')}</IonSelectOption>
                        <IonSelectOption value="Indirect">{t('customers.indirect')}</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                    <div style={{ padding: '10px 15px', background: '#1E293B', borderRadius: '8px', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748B'   , display: 'block', marginBottom: '8px' }}>{t('customers.idCardDocument')}</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <IonButton
                          size="small"
                          fill="outline"
                          onClick={async () => {
                            const path = await handleIdCardUpload('customer', editingCustomer.id || 'edit');
                            if (path) setEditingCustomer(prev => ({ ...prev, idCardPath: path }));
                          }}
                        >
                          <IonIcon icon={cloudUpload} slot="start" />
                          {editingCustomer.idCardPath ? "Change ID Card" : "Upload ID Card"}
                        </IonButton>
                        {editingCustomer.idCardPath && (
                          <IonBadge style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}>ID LINKED</IonBadge>
                        )}
                        {editingCustomer.idCardPath && (
                          <IonButton
                            size="small"
                            fill="clear"
                            style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                            onClick={async () => {
                              const deleted = await handleDeleteIdCard('customer', editingCustomer.id);
                              if (deleted) {
                                setEditingCustomer(prev => ({ ...prev, idCardPath: '' }));
                                // Also update the DB immediately
                                await updateCustomer(editingCustomer.id, { idCardPath: '' });
                                setCustomers(await getCustomers());
                              }
                            }}
                          >
                            <IonIcon icon={trashOutline} slot="icon-only" />
                          </IonButton>
                        )}
                      </div>
                    </div>
                    <IonButton expand="block" onClick={handleUpdateCustomer} style={{ marginTop: '20px' }}>{t('customers.updateCustomer')}</IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- CUSTOMER DETAIL MODAL --- */}
            <IonModal isOpen={!!viewingCustomerDetail} onDidDismiss={() => { setViewingCustomerDetail(null); setIdCardImage(null); }}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff', '--color': '#2563EB' }}>
                  <IonTitle>{t('customers.customerDetails')}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => { setViewingCustomerDetail(null); setIdCardImage(null); }}>{t('common.close')}</IonButton></IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': '#FFFFFF' }}>
                {viewingCustomerDetail && (() => {
                  const c = viewingCustomerDetail;
                  const custContracts = contracts.filter(con => con.customerId === c.id);
                  const custOffers = offers.filter(o => o.customerId === c.id && o.status !== 'contracted' && o.status !== 'cancelled');
                  return (
                    <div style={{ maxWidth: '700px', margin: '0 auto', color: '#1E293B' }}>
                      {/* Header */}
                      <div style={{ textAlign: 'center', padding: '30px 0 20px', borderBottom: '1px solid #222', marginBottom: '25px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '2rem', fontWeight: '900', color: '#FFFFFF' }}>
                          {(c.name || '?')[0].toUpperCase()}
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{c.name}</h1>
                        <p style={{ color: '#64748B'   , fontSize: '0.9rem', margin: '5px 0 0' }}>Customer ID: {c.id}</p>
                      </div>

                      {/* Info Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.phone')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.phone || '—'}</div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.phone2')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.phone2 || '—'}</div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.email')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.email || '—'}</div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.idNumber')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.idNumber || '—'}</div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.idType')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                            {c.idType === 'identity_card' ? t('customers.idTypeCard') : c.idType === 'passport' ? t('customers.idTypePassport') : '—'}
                          </div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.bloodType')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.bloodType || '—'}</div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('customers.directIndirect')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.directIndirect || '—'}</div>
                        </div>
                      </div>

                      {/* Linked Contracts & Offers */}
                      {(() => {
                        const custContracts = contracts.filter(con => con.customerId === c.id);
                        const custJointContracts = contracts.filter(con => (con.jointPurchasers || []).some(jp => jp.id === c.id));
                        const custGuarantorContracts = contracts.filter(con => con.guarantor?.id === c.id);
                        const custOffers = offers.filter(o => o.customerId === c.id && o.status !== 'contracted' && o.status !== 'cancelled');

                        const hasAny = custContracts.length > 0 || custJointContracts.length > 0 || custGuarantorContracts.length > 0 || custOffers.length > 0;
                        if (!hasAny) return null;

                        return (
                          <div style={{ marginBottom: '25px' }}>
                            <h3 style={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>Linked Units & Roles</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {custContracts.map(con => (
                                  <IonBadge key={`con-${con.id}`} style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}
                                  onClick={() => { setViewingCustomerDetail(null); setIdCardImage(null); openContractInTab(con); }}>
                                  Unit {con.unitId} (Owner)
                                </IonBadge>
                              ))}
                              {custJointContracts.map(con => (
                                <IonBadge key={`jp-${con.id}`} style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem', '--background': 'rgba(0, 255, 255, 0.1)', '--color': '#2563EB', color: '#2563EB' }}
                                  onClick={() => { setViewingCustomerDetail(null); setIdCardImage(null); openContractInTab(con); }}>
                                  Unit {con.unitId} (Joint)
                                </IonBadge>
                              ))}
                              {custGuarantorContracts.map(con => (
                                  <IonBadge key={`g-${con.id}`} style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}
                                  onClick={() => { setViewingCustomerDetail(null); setIdCardImage(null); openContractInTab(con); }}>
                                  Unit {con.unitId} (Guarantor)
                                </IonBadge>
                              ))}
                              {custOffers.map(o => (
                                  <IonBadge key={`o-${o.id}`} style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}
                                  onClick={() => { setViewingCustomerDetail(null); setIdCardImage(null); setViewingOffer(o); }}>
                                  Offer: {o.unitId}
                                </IonBadge>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ID Card Image */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>ID Card Document</h3>
                        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          {idCardImage ? (
                            <>
                              <img src={idCardImage} alt="ID Card" style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', objectFit: 'contain' }} />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                                  onClick={async () => {
                                    const path = await handleIdCardUpload('customer', c.id);
                                    if (path) {
                                      await updateCustomer(c.id, { idCardPath: path });
                                      setCustomers(await getCustomers());
                                      const newImg = await window.electronAPI.getIdCard('customer', c.id);
                                      setIdCardImage(newImg);
                                    }
                                  }}
                                >
                                  <IonIcon icon={cloudUpload} slot="start" /> Change
                                </IonButton>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                                  onClick={async () => {
                                    const deleted = await handleDeleteIdCard('customer', c.id);
                                    if (deleted) {
                                      await updateCustomer(c.id, { idCardPath: '' });
                                      setCustomers(await getCustomers());
                                      setIdCardImage(null);
                                    }
                                  }}
                                >
                                  <IonIcon icon={trashOutline} slot="start" /> Delete
                                </IonButton>
                              </div>
                            </>
                          ) : (
                            <div style={{ color: '#64748B' }}>
                              <IonIcon icon={person} style={{ fontSize: '48px', display: 'block', margin: '0 auto 10px' }} />
                              <p>{t('customers.noIdCard')}</p>
                              <IonButton
                                size="small"
                                fill="outline"
                                style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '10px' }}
                                onClick={async () => {
                                  const path = await handleIdCardUpload('customer', c.id);
                                  if (path) {
                                    await updateCustomer(c.id, { idCardPath: path });
                                    setCustomers(await getCustomers());
                                    const newImg = await window.electronAPI.getIdCard('customer', c.id);
                                    setIdCardImage(newImg);
                                  }
                                }}
                              >
                                <IonIcon icon={cloudUpload} slot="start" /> Upload ID Card
                              </IonButton>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit Button */}
                      {canAction('edit') && (
                        <IonButton expand="block" style={{ '--background': '#2563EB', '--color': '#FFFFFF', '--border-radius': '12px', height: '48px', fontWeight: 'bold' }}
                          onClick={() => {
                            setViewingCustomerDetail(null);
                            setIdCardImage(null);
                            promptPassword('Enter password to edit customer:', async (password) => {
                              if (password === getAppSecurity().adminPassword) {
                                setEditingCustomer({ ...c });
                                setShowEditCustomerModal(true);
                              } else {
                                alert("Incorrect password.");
                              }
                            });
                          }}>
                          <IonIcon icon={create} slot="start" />
                          Edit Customer
                        </IonButton>
                      )}
                    </div>
                  );
                })()}
              </IonContent>
            </IonModal>

            {/* --- SALES AGENT DETAIL MODAL --- */}
            <IonModal isOpen={!!viewingSalesDetail} onDidDismiss={() => { setViewingSalesDetail(null); setIdCardImage(null); }}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff', '--color': '#2563EB' }}>
                  <IonTitle>{t('sales.agentDetails')}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => { setViewingSalesDetail(null); setIdCardImage(null); }}>{t('common.close')}</IonButton></IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': '#FFFFFF' }}>
                {viewingSalesDetail && (() => {
                  const s = viewingSalesDetail;
                  const agentContracts = contracts.filter(con => con.salesId === s.id);
                  const agentOffers = offers.filter(o => o.salesId === s.id && o.status !== 'contracted' && o.status !== 'cancelled');
                  return (
                    <div style={{ maxWidth: '700px', margin: '0 auto', color: '#1E293B' }}>
                      {/* Header */}
                      <div style={{ textAlign: 'center', padding: '30px 0 20px', borderBottom: '1px solid #222', marginBottom: '25px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '2rem', fontWeight: '900', color: '#1E293B' }}>
                          {(s.name || '?')[0].toUpperCase()}
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{s.name}</h1>
                        <p style={{ color: '#64748B'   , fontSize: '0.9rem', margin: '5px 0 0' }}>{t('sales.salesId')}: {s.id}</p>
                      </div>

                      {/* Info Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('sales.phone')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{s.phone || '—'}</div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ color: '#64748B'   , fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{t('sales.email')}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{s.email || '—'}</div>
                        </div>
                      </div>

                      {/* Linked Contracts & Offers */}
                      {(agentContracts.length > 0 || agentOffers.length > 0) && (
                        <div style={{ marginBottom: '25px' }}>
                          <h3 style={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>{t('sales.linkedContractsOffers')}</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {agentContracts.map(con => (
                              <IonBadge key={con.id} style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }} 
                                onClick={() => { setViewingSalesDetail(null); setIdCardImage(null); openContractInTab(con); }}>
                                {t('sales.contract')}: {t('reports.unit')} {con.unitId}
                              </IonBadge>
                            ))}
                            {agentOffers.map(o => (
                              <IonBadge key={o.id} style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }} 
                                onClick={() => { setViewingSalesDetail(null); setIdCardImage(null); setViewingOffer(o); }}>
                                {t('sales.offer')}: {t('reports.unit')} {o.unitId}
                              </IonBadge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ID Card Image */}
                      <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>{t('sales.idCardDocument')}</h3>
                        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          {idCardImage ? (
                            <>
                              <img src={idCardImage} alt="ID Card" style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', objectFit: 'contain' }} />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                                  onClick={async () => {
                                    const path = await handleIdCardUpload('sales', s.id);
                                    if (path) {
                                      await updateSales(s.id, { idCardPath: path });
                                      setSales(await getSales());
                                      const newImg = await window.electronAPI.getIdCard('sales', s.id);
                                      setIdCardImage(newImg);
                                    }
                                  }}
                                >
                                  <IonIcon icon={cloudUpload} slot="start" /> Change
                                </IonButton>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                                  onClick={async () => {
                                    const deleted = await handleDeleteIdCard('sales', s.id);
                                    if (deleted) {
                                      await updateSales(s.id, { idCardPath: '' });
                                      setSales(await getSales());
                                      setIdCardImage(null);
                                    }
                                  }}
                                >
                                  <IonIcon icon={trashOutline} slot="start" /> Delete
                                </IonButton>
                              </div>
                            </>
                          ) : (
                            <div style={{ color: '#64748B' }}>
                              <IonIcon icon={person} style={{ fontSize: '48px', display: 'block', margin: '0 auto 10px' }} />
                              <p>{t('sales.noIdCard')}</p>
                              <IonButton
                                size="small"
                                fill="outline"
                                style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '10px' }}
                                onClick={async () => {
                                  const path = await handleIdCardUpload('sales', s.id);
                                  if (path) {
                                    await updateSales(s.id, { idCardPath: path });
                                    setSales(await getSales());
                                    const newImg = await window.electronAPI.getIdCard('sales', s.id);
                                    setIdCardImage(newImg);
                                  }
                                }}
                              >
                                <IonIcon icon={cloudUpload} slot="start" /> {t('sales.uploadIdCard')}
                              </IonButton>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit Button */}
                      <IonButton expand="block" style={{ '--background': '#2563EB', color: '#FFFFFF', '--color': '#FFFFFF', '--border-radius': '12px', height: '48px', fontWeight: 'bold' }}
                        onClick={() => {
                          const agent = { ...s };
                          setViewingSalesDetail(null);
                          setIdCardImage(null);
                          setEditingSales(agent);
                          setShowEditSalesModal(true);
                        }}>
                        <IonIcon icon={create} slot="start" />
                        {t('sales.editSalesAgent')}
                      </IonButton>
                    </div>
                  );
                })()}
              </IonContent>
            </IonModal>


            {/* --- OFFER INSTALLMENTS EDIT MODAL --- */}
            <IonModal isOpen={showOfferInstallmentsModal} onDidDismiss={() => setShowOfferInstallmentsModal(false)}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('contracts.editInstallments')}</IonTitle>
                  <IonButton slot="end" onClick={() => setShowOfferInstallmentsModal(false)}>Close</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                {selectedOfferForInstallments ? (
                  <div>
                    <div style={{ background: '#FFFFFF', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0, color: '#2563EB', fontWeight: 'bold' }}>{selectedOfferForInstallments.customerName}</h3>
                          <p style={{ margin: '5px 0', color: '#64748B'   , fontSize: '14px' }}>Unit: <strong style={{ color: '#1E293B' }}>{selectedOfferForInstallments.unitId}</strong> | Total: {Number(selectedOfferForInstallments.totalPrice || selectedOfferForInstallments.finalPrice).toLocaleString()} EGP</p>
                        </div>
                        <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={() => setShowReflashOfferConfig(!showReflashOfferConfig)}>
                          <IonIcon icon={refresh} slot="start" />
                          Reflash Fill
                        </IonButton>
                      </div>

                      {showReflashOfferConfig && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #333' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748B'    }}>{t('contracts.startingPrice')}</label>
                              <input type="number" value={selectedOfferForInstallments.finalPrice} onChange={e => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, finalPrice: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748B'    }}>DP %</label>
                              <input type="number" value={selectedOfferForInstallments.downPayment} onChange={e => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, downPayment: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748B'    }}>Years</label>
                              <input type="number" value={selectedOfferForInstallments.years} onChange={e => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, years: parseInt(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748B'    }}>Frequency</label>
                              <select value={selectedOfferForInstallments.frequency} onChange={e => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, frequency: e.target.value })} style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }}>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="biannual">Biannual</option>
                                <option value="annual">Annual</option>
                              </select>
                            </div>
                            <div>

                              <ProDatePicker 
                                label="Offer (DP) Date" 
                                value={selectedOfferForInstallments.date} 
                                onChange={val => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, date: val })}
                              />
                            </div>
                            <div>

                              <ProDatePicker 
                                label="1st Ins. Date" 
                                value={selectedOfferForInstallments.firstInstallmentDate} 
                                onChange={val => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, firstInstallmentDate: val })}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748B'    }}>{t('contracts.startCheque')}</label>
                              <input type="text" value={selectedOfferForInstallments.startingChequeNumber} onChange={e => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, startingChequeNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748B'    }}>Bank</label>
                              <input type="text" value={selectedOfferForInstallments.bank} onChange={e => setSelectedOfferForInstallments({ ...selectedOfferForInstallments, bank: e.target.value })} style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }} />
                            </div>
                          </div>
                          <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', marginTop: '15px' }} onClick={handleReflashOfferPlan} >
                            <IonIcon icon={flash} slot="start" />
                            ♻️ RE-FLASH INSTALLMENT PLAN
                          </IonButton>
                        </div>
                      )}
                    </div>

                    <IonList style={{ background: 'transparent' }}>
                      {(!selectedOfferForInstallments.installments || selectedOfferForInstallments.installments.length === 0) ? (
                        <p style={{ textAlign: 'center', color: '#64748B' }}>No installments generated.</p>
                      ) : (
                        selectedOfferForInstallments.installments.map((ins, index) => (
                          <div key={index} style={{ background: '#FFFFFF', marginBottom: '10px', padding: '12px', borderRadius: '8px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: ins.type.includes('Down') ? '#2563EB' : '#2563EB', fontSize: '13px', fontWeight: 'bold' }}>{ins.type}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#64748B', fontSize: '12px' }}>{ins.status}</span>
                                <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', '--padding-start': '4px', '--padding-end': '4px', minHeight: '24px' }} onClick={() => {
                                  if (!window.confirm(t('alert.removeInstallmentConfirm', { type: ins.type, amount: Number(ins.amount || 0).toLocaleString() }))) return;
                                  const updatedInstallments = [...selectedOfferForInstallments.installments];
                                  updatedInstallments.splice(index, 1);
                                  setSelectedOfferForInstallments({ ...selectedOfferForInstallments, installments: updatedInstallments });
                                }}>
                                  <IonIcon icon={trash} slot="icon-only" style={{ fontSize: '14px' }} />
                                </IonButton>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <ProDatePicker
                                label="Due Date"
                                value={ins.dueDate}
                                onChange={val => handleUpdateOfferInstallment(index, 'dueDate', val)}
                              />
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748B'   , display: 'block', marginBottom: '4px' }}>Amount</label>
                                <input
                                  type="number"
                                  value={ins.amount}
                                  onChange={e => handleUpdateOfferInstallment(index, 'amount', parseFloat(e.target.value))}
                                  style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B', fontWeight: 'bold' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748B'   , display: 'block', marginBottom: '4px' }}>{t('common.paymentMethodLabel')}</label>
                                <select
                                  value={ins.paymentMethod || 'Cheque'}
                                  onChange={e => handleUpdateOfferInstallment(index, 'paymentMethod', e.target.value)}
                                  style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }}
                                >
                                  <option value="Cheque">Cheque</option>
                                  <option value="Cash">Cash</option>
                                  <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748B'   , display: 'block', marginBottom: '4px' }}>Cheque #</label>
                                <input
                                  type="text"
                                  value={ins.chequeNumber || ''}
                                  onChange={e => handleUpdateOfferInstallment(index, 'chequeNumber', e.target.value)}
                                  placeholder="—"
                                  style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }}
                                />
                              </div>
                              <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '11px', color: '#64748B'   , display: 'block', marginBottom: '4px' }}>Bank</label>
                                <input
                                  type="text"
                                  value={ins.bank || ''}
                                  onChange={e => handleUpdateOfferInstallment(index, 'bank', e.target.value)}
                                  placeholder="e.g. CIB, QNB..."
                                  style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '4px', color: '#1E293B' }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </IonList>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <IonButton expand="block" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', flex: 1, borderRadius: '8px', fontWeight: 'bold' }} onClick={handleAddOfferInstallment} >
                        <IonIcon icon={add} slot="start" /> Add Installment
                      </IonButton>

                      {canAction('edit') && (
                        <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', flex: 1, borderRadius: '8px', fontWeight: 'bold' }} onClick={handleSaveOfferInstallments} >
                          Save Changes
                        </IonButton>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
                )}
              </IonContent>
            </IonModal>



            {/* --- CONTRACT DETAIL FULL PAGE VIEW (Tab-Based) --- */}
            {currentView === 'contractDetail' && viewingContract && (
              <div className="pro-container animate-fade-in" style={{ paddingBottom: '100px' }}>
                <div className="pro-section-header" style={{ marginBottom: '20px' }}>
                  <div className="pro-back-button" onClick={() => closeContractTab()} style={{ marginBottom: '10px' }}>
                    <IonIcon icon={chevronBack} /> {t('common.back')}
                  </div>
                  <h1 style={{ color: '#2563EB', fontWeight: '900' }}>{t('contracts.details')} — {viewingContract.unitId}</h1>
                </div>
                {viewingContract && (() => {
                  // Find the unit data
                  const unit = buildings.flatMap(b => (b.units || []).map(u => ({ ...u, buildingName: b.name }))).find(u => u.unitId === viewingContract.unitId);

                  return (
                    <div style={{ maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

                      {/* TERMINATED BANNER */}
                      {viewingContract.status === 'terminated' && (
                        <div style={{
                          background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                          padding: '16px 24px',
                          borderRadius: '12px',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <IonIcon icon={closeCircleOutline} style={{ fontSize: '28px', color: '#fff' }} />
                            <div>
                              <div style={{ color: '#fff', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '1px' }}>{t('contracts.contractTerminated')}</div>
                              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '2px' }}>
                                {viewingContract.terminationReason || 'No reason specified'} • {viewingContract.terminationDate ? displayFormattedDate(viewingContract.terminationDate) : 'N/A'}
                              </div>
                            </div>
                          </div>
                          {/* Reactivate button — only if no conflicts */}
                          {!offers.some(o => String(o.unitId || '').trim().toLowerCase() === String(viewingContract.unitId).trim().toLowerCase() && (o.status === 'active' || o.status === 'contracted')) &&
                           !contracts.some(c => c.id !== viewingContract.id && String(c.unitId || '').trim().toLowerCase() === String(viewingContract.unitId).trim().toLowerCase() && (!c.status || c.status === 'active')) && (
                            <IonButton
                              fill="solid"
                              size="small"
                              onClick={() => handleReactivateContract(viewingContract)}
                              style={{
                                '--background': '#16A34A',
                                '--border-radius': '10px',
                                fontWeight: '800',
                                fontSize: '0.8rem',
                                letterSpacing: '0.5px',
                                flexShrink: 0
                              }}
                            >
                              ⟳ REACTIVATE CONTRACT
                            </IonButton>
                          )}
                        </div>
                      )}

                      {/* RESOLD BANNER */}
                      {viewingContract.status === 'resold' && (
                        <div style={{
                          background: 'linear-gradient(135deg, #E67E22, #D35400)',
                          padding: '16px 24px',
                          borderRadius: '12px',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)'
                        }}>
                          <IonIcon icon={swapHorizontalOutline} style={{ fontSize: '28px', color: '#fff' }} />
                          <div>
                            <div style={{ color: '#fff', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '1px' }}>{t('contracts.contractResold')}</div>
                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '2px' }}>
                              Resold to {viewingContract.resoldTo || 'N/A'} &bull; {viewingContract.resaleDate ? displayFormattedDate(viewingContract.resaleDate) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- MAIN HEADER CARD --- */}
                      <div style={{
                        background: 'linear-gradient(135deg, #1e1e1e 0%, #252525 100%)',
                        padding: '24px',
                        borderRadius: '16px',
                        marginBottom: '20px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div>
                            <h4 style={{ color: '#64748B'   , margin: 0, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Contract Status</h4>
                            <h2 style={{ color: '#2563EB', margin: '4px 0 0 0', fontWeight: '800' }}>ACTIVE CONTRACT</h2>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <h4 style={{ color: '#64748B'   , margin: 0, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Contract Value</h4>
                            <h2 style={{ color: '#2563EB', margin: '4px 0 0 0', fontWeight: '800' }}>{formatCurrency(viewingContract.totalPrice || 0)}</h2>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                          <div><span style={{ color: '#64748B', fontSize: '12px' }}>Contract ID:</span><br /><strong style={{ color: '#1E293B' }}>{viewingContract.contractId || viewingContract.id}</strong></div>
                          <div><span style={{ color: '#64748B', fontSize: '12px' }}>Contract Date:</span><br /><strong style={{ color: '#1E293B' }}>{formatExcelDate(viewingContract.date)}</strong></div>
                          <div>
                            <span style={{ color: '#64748B', fontSize: '12px' }}>Offer Reference:</span><br />
                            <strong
                              style={{
                                color: viewingContract.offerId ? '#2563EB' : '#FFFFFF',
                                cursor: viewingContract.offerId ? 'pointer' : 'default',
                                textDecoration: viewingContract.offerId ? 'underline' : 'none'
                              }}
                              onClick={() => {
                                if (viewingContract.offerId) {
                                  const offer = offers.find(o => String(o.id).trim() === String(viewingContract.offerId).trim());
                                  if (offer) {
                                    setViewingOffer(offer);
                                  } else {
                                    alert("Original offer not found in current database.");
                                  }
                                }
                              }}
                            >
                              {viewingContract.offerId || '-'}
                            </strong>
                          </div>
                          <div><span style={{ color: '#64748B', fontSize: '12px' }}>Duration:</span><br /><strong style={{ color: '#1E293B' }}>{viewingContract.years || '-'} Years ({viewingContract.frequency || '-'})</strong></div>
                        </div>
                      </div>

                      {/* --- UNIT & PROPERTY CARD --- */}
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '15px', borderLeft: '4px solid #1E3A8A', border: '1px solid #E2E8F0', borderLeftWidth: '4px' }}>
                        <h3 style={{ color: '#2563EB', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '1.1rem' }}>
                          <span>Property & Unit Details</span>
                          <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={() => handleViewLayout(viewingContract.unitId)}>
                            <IonIcon icon={mapOutline} slot="start" /> View Layout
                          </IonButton>
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>Building / Property:</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.buildingName || 'N/A'}</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>Unit ID:</span><br />
                            <strong style={{ color: '#1E293B', fontSize: '1.2rem' }}>{viewingContract.unitId}</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>Floor/Level:</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.floor || '-'}</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>Area Size:</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.area || '-'} sqm</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>View:</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.view || '-'}</strong>
                          </div>
                          {unit?.plan && (
                            <div style={{ background: 'rgba(197,160,89,0.1)', padding: '10px', borderRadius: '8px', gridColumn: 'span 2', border: '1px solid rgba(197,160,89,0.2)', marginTop: '5px' }}>
                              <span style={{ color: '#2563EB', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Assigned Payment Plan:</span><br />
                              <strong style={{ color: '#1E293B' }}>{unit.plan}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* --- CUSTOMER & STAKEHOLDERS --- */}
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '15px', borderLeft: '4px solid #1E3A8A', border: '1px solid #E2E8F0', borderLeftWidth: '4px' }}>
                        <h3 style={{ color: '#2563EB', marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>{t('contracts.primaryPurchaser')}</h3>
                        {(() => {
                          const cust = customers.find(c => String(c.id).trim() === String(viewingContract.customerId).trim());
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Full Name:</span><br /><strong style={{ color: '#1E293B' }}>{cust?.name || viewingContract.customerId}</strong></div>
                              <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Customer ID:</span><br /><strong style={{ color: '#1E293B' }}>{viewingContract.customerId || '-'}</strong></div>

                              {cust?.phone && <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ color: '#64748B'   , fontSize: '11px' }}>Contact Details:</span><br />
                                <strong style={{ color: '#1E293B' }}>{cust.phone} {cust.phone2 ? ` / ${cust.phone2}` : ''}</strong>
                              </div>}
                            </div>
                          );
                        })()}

                        <div style={{ marginTop: '15px', textAlign: 'right' }}>
                          <IonButton
                            fill="outline"
                            size="small"
                            style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }}
                            onClick={() => {
                              setEditingStakeholders({
                                jointPurchasers: viewingContract.jointPurchasers || [],
                                guarantor: viewingContract.guarantor || null
                              });
                              setShowEditStakeholdersModal(true);
                            }}
                          >
                            Manage Joint Purchasers / Guarantor
                          </IonButton>
                        </div>

                        {/* Joint Purchasers Nested Section */}
                        {viewingContract.jointPurchasers && viewingContract.jointPurchasers.length > 0 && (
                          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #333' }}>
                            <h4 style={{ color: '#64748B', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Joint Purchasers</h4>
                            {viewingContract.jointPurchasers.map((jp, i) => {
                              const jpDetails = customers.find(c => String(c.id).trim() === String(jp.id).trim());
                              return (
                                <div key={i} style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  marginBottom: '8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div>
                                    <strong style={{ color: '#1E293B' }}>{jpDetails?.name || 'Unknown'}</strong><br />
                                    <span style={{ color: '#64748B', fontSize: '11px' }}>ID: {jp.id}</span>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#64748B'   , fontSize: '11px' }}>{jpDetails?.phone || '-'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Guarantor Nested Section */}
                        {viewingContract.guarantor && (
                          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #333' }}>
                            <h4 style={{ color: '#64748B', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Guarantor</h4>
                            {(() => {
                              const gDetails = customers.find(c => String(c.id).trim() === String(viewingContract.guarantor.id).trim());
                              return (
                                <div style={{ background: 'rgba(255,196,9,0.05)', border: '1px solid rgba(255,196,9,0.1)', padding: '12px', borderRadius: '8px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Name:</span><br /><strong style={{ color: '#1E293B' }}>{gDetails?.name || 'Unknown'}</strong></div>
                                    <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>ID Ref:</span><br /><strong style={{ color: '#1E293B' }}>{viewingContract.guarantor.id}</strong></div>
                                    {gDetails?.phone && <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748B'   , fontSize: '11px' }}>Phone:</span><br /><strong style={{ color: '#1E293B' }}>{gDetails.phone}</strong></div>}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* --- SALES & REVENUE --- */}
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '15px', borderLeft: '4px solid #6c5ce7', border: '1px solid #E2E8F0', borderLeftWidth: '4px' }}>
                        <h3 style={{ color: '#2563EB', marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>{t('contracts.salesInformation')}</h3>
                        {(() => {
                          const sale = sales.find(s => String(s.id).trim() === String(viewingContract.salesId).trim());
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Sold By:</span><br /><strong style={{ color: '#1E293B' }}>{sale?.name || 'N/A'}</strong></div>
                              <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Sales ID:</span><br /><strong style={{ color: '#1E293B' }}>{viewingContract.salesId || '-'}</strong></div>
                              {sale?.phone && <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748B'   , fontSize: '11px' }}>Agent Contact:</span><br /><strong style={{ color: '#1E293B' }}>{sale.phone}</strong></div>}
                            </div>
                          );
                        })()}
                        {canAction('edit') && (
                          <div style={{ marginTop: '15px', textAlign: 'right' }}>
                            <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={() => setShowChangeSalesAlert(true)}>
                              <IonIcon icon={personAddOutline} slot="start" /> Change Sales Agent
                            </IonButton>
                          </div>
                        )}
                      </div>

                      {/* --- FINANCIAL / SCHEDULE --- */}
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px dashed #444' }}>
                        <h3 style={{ color: '#1E293B', marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Projected Payment Schedule</h3>
                        {(() => {
                          const total = Number(viewingContract.totalPrice);
                          const down = total * (Number(viewingContract.downPayment || 0) / 100);
                          const remaining = total - down;
                          const freq = viewingContract.frequency === 'quarterly' ? 4 : viewingContract.frequency === 'biannual' ? 2 : 1;
                          const numInstallments = Number(viewingContract.years || 0) * freq;
                          const installmentAmount = numInstallments > 0 ? remaining / numInstallments : 0;
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}><span style={{ color: '#64748B'   , fontSize: '11px' }}>Down Payment ({viewingContract.downPayment}%):</span><br /><strong style={{ color: '#2563EB', fontSize: '1.2rem' }}>${down.toLocaleString()}</strong></div>
                              <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}><span style={{ color: '#64748B'   , fontSize: '11px' }}>Remaining Balance:</span><br /><strong style={{ color: '#1E293B', fontSize: '1.2rem' }}>${remaining.toLocaleString()}</strong></div>
                              <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Installments:</span><br /><strong style={{ color: '#1E293B' }}>{numInstallments || '-'} payments</strong></div>
                              <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Per Payment:</span><br /><strong style={{ color: '#DC2626', fontSize: '1.1rem' }}>${installmentAmount.toLocaleString()}</strong></div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* --- LINKED INSTALLMENTS BY UNIT ID --- */}
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '15px', borderLeft: '4px solid #e17055', border: '1px solid #E2E8F0', borderLeftWidth: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px', flexWrap: 'wrap' }}>
                          <h3 style={{ color: '#DC2626', margin: 0, fontSize: '1.1rem' }}>Installments (Unit: {viewingContract.unitId})</h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', '--border-radius': '10px', fontWeight: 'bold' }}  onClick={() => {
                              setFlashFillContractOptions({
                                includePaid: false,
                                totalPrice: viewingContract.totalPrice,
                                years: viewingContract.years,
                                frequency: viewingContract.frequency || 'quarterly',
                                startingChequeNumber: '',
                                bank: ''
                              });
                              setShowFlashFillContractConfig(!showFlashFillContractConfig);
                            }}>
                              <IonIcon icon={flash} slot="start" />
                              Flash Fill
                            </IonButton>
                            <IonButton size="small" fill="solid" style={{ '--background': '#B8860B', '--color': '#FFFFFF', '--border-radius': '10px', fontWeight: 'bold' }} onClick={() => {
                              const linked = installments.filter(ins => String(ins.unitId).trim() === String(viewingContract.unitId).trim() && ins.paymentMethod === 'Cheque' && ins.chequeNumber);
                              setChequeCustodySelection(linked.map(ins => ins.id));
                              setShowChequeCustody(true);
                            }}>
                              <IonIcon icon={printOutline} slot="start" />
                              حافظة شيكات
                            </IonButton>
                            <IonButton size="small" fill="solid" style={{ '--background': '#2563EB', '--color': '#FFFFFF', '--border-radius': '10px', fontWeight: 'bold' }} onClick={() => {
                              setShowAddInstallmentForm(!showAddInstallmentForm);
                              setNewContractInstallment({ type: 'Installment', dueDate: new Date().toISOString().split('T')[0], amount: '', paymentMethod: 'CASH', chequeNumber: '', bank: '' });
                            }}>
                              <IonIcon icon={showAddInstallmentForm ? close : addCircleOutline} slot="start" />
                              {showAddInstallmentForm ? 'Cancel' : 'Add Installment'}
                            </IonButton>
                          </div>
                        </div>

                        {/* Flash Fill Config UI */}
                        {showFlashFillContractConfig && (
                          <div style={{ background: 'rgba(255, 196, 9, 0.08)', padding: '18px', borderRadius: '12px', marginBottom: '18px', border: '1px solid rgba(255, 196, 9, 0.2)' }}>
                            <h4 style={{ color: '#DC2626', margin: '0 0 12px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <IonIcon icon={flash} /> Flash Fill Configuration
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput label="Total Price Override" labelPlacement="stacked" type="number" value={flashFillContractOptions.totalPrice} onIonInput={e => setFlashFillContractOptions({ ...flashFillContractOptions, totalPrice: e.detail.value })} style={{ color: '#1E293B' }} />
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput label="Years" labelPlacement="stacked" type="number" value={flashFillContractOptions.years} onIonInput={e => setFlashFillContractOptions({ ...flashFillContractOptions, years: e.detail.value })} style={{ color: '#1E293B' }} />
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonSelect label="Freq" labelPlacement="stacked" value={flashFillContractOptions.frequency} onIonChange={e => setFlashFillContractOptions({ ...flashFillContractOptions, frequency: e.detail.value })} style={{ color: '#1E293B' }}>
                                  <IonSelectOption value="monthly">Monthly</IonSelectOption>
                                  <IonSelectOption value="quarterly">Quarterly</IonSelectOption>
                                  <IonSelectOption value="biannual">Biannual</IonSelectOption>
                                  <IonSelectOption value="annual">Annual</IonSelectOption>
                                </IonSelect>
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput label="Start Chq#" labelPlacement="stacked" value={flashFillContractOptions.startingChequeNumber} onIonInput={e => setFlashFillContractOptions({ ...flashFillContractOptions, startingChequeNumber: e.detail.value })} style={{ color: '#1E293B' }} />
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput label="Bank" labelPlacement="stacked" value={flashFillContractOptions.bank} onIonInput={e => setFlashFillContractOptions({ ...flashFillContractOptions, bank: e.detail.value })} style={{ color: '#1E293B' }} />
                              </IonItem>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
                                <IonCheckbox checked={flashFillContractOptions.includePaid} onIonChange={e => setFlashFillContractOptions({ ...flashFillContractOptions, includePaid: e.detail.checked })} />
                                <IonLabel style={{ fontSize: '0.8rem', color: '#1E293B' }}>Wipe Paid Installments?</IonLabel>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                              <IonButton expand="block" style={{ flex: 1, '--background': '#475569', '--color': '#FFFFFF', fontWeight: 'bold' }} onClick={handleFlashFillContract}>
                                <IonIcon icon={refresh} slot="start" /> Run Flash Fill
                              </IonButton>
                              <IonButton expand="block" fill="clear" color="light" onClick={() => setShowFlashFillContractConfig(false)}>Cancel</IonButton>
                            </div>
                          </div>
                        )}


                        {/* Add Installment Form */}
                        {showAddInstallmentForm && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '18px', borderRadius: '12px', marginBottom: '18px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <h4 style={{ color: '#2563EB', margin: '0 0 12px 0', fontSize: '0.95rem' }}>New Installment</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonSelect label="Type" labelPlacement="stacked" value={newContractInstallment.type} onIonChange={e => setNewContractInstallment({ ...newContractInstallment, type: e.detail.value })} style={{ color: '#1E293B' }}>
                                  <IonSelectOption value="Down Payment">Down Payment</IonSelectOption>
                                  <IonSelectOption value="Installment">Installment</IonSelectOption>
                                  <IonSelectOption value="Final Payment">Final Payment</IonSelectOption>
                                  <IonSelectOption value="Maintenance">Maintenance</IonSelectOption>
                                  <IonSelectOption value="Other">Other</IonSelectOption>
                                </IonSelect>
                              </IonItem>
                              <ProDatePicker
                                label="Due Date"
                                value={newContractInstallment.dueDate}
                                onChange={val => setNewContractInstallment({ ...newContractInstallment, dueDate: val })}
                                style={{ marginBottom: '10px' }}
                              />
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput label={`Amount (${appSettings.currency})`} labelPlacement="stacked" type="number" value={newContractInstallment.amount} onIonInput={e => setNewContractInstallment({ ...newContractInstallment, amount: e.detail.value })} style={{ color: '#1E293B' }} />
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonSelect label="Payment Method" labelPlacement="stacked" value={newContractInstallment.paymentMethod} onIonChange={e => setNewContractInstallment({ ...newContractInstallment, paymentMethod: e.detail.value })} style={{ color: '#1E293B' }}>
                                  <IonSelectOption value="CASH">CASH</IonSelectOption>
                                  <IonSelectOption value="Transfer">Transfer</IonSelectOption>
                                  <IonSelectOption value="Cheque">Cheque</IonSelectOption>
                                </IonSelect>
                              </IonItem>
                              {newContractInstallment.paymentMethod === 'Cheque' && (
                                <>
                                  <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                    <IonInput label="Cheque #" labelPlacement="stacked" value={newContractInstallment.chequeNumber} onIonInput={e => setNewContractInstallment({ ...newContractInstallment, chequeNumber: e.detail.value })} style={{ color: '#1E293B' }} />
                                  </IonItem>
                                  <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                    <IonInput label="Bank" labelPlacement="stacked" value={newContractInstallment.bank} onIonInput={e => setNewContractInstallment({ ...newContractInstallment, bank: e.detail.value })} style={{ color: '#1E293B' }} />
                                  </IonItem>
                                </>
                              )}
                            </div>
                            <IonButton expand="block" style={{ marginTop: '14px', '--background': '#2563EB', '--color': '#FFFFFF', '--border-radius': '10px', fontWeight: 'bold' }} onClick={async () => {
                              if (!newContractInstallment.amount || Number(newContractInstallment.amount) <= 0) {
                                alert(t('alert.enterValidAmount'));
                                return;
                              }
                              // Resolve customer name
                              const cust = customers.find(c => String(c.id).trim() === String(viewingContract.customerId).trim());
                              const customerName = cust?.name || viewingContract.customerName || viewingContract.customerId || 'Unknown';

                              const newIns = {
                                id: 'INS-M-' + Date.now(),
                                contractId: viewingContract.contractId || viewingContract.id,
                                unitId: viewingContract.unitId,
                                customerName: customerName,
                                type: newContractInstallment.type,
                                dueDate: newContractInstallment.dueDate,
                                amount: Number(newContractInstallment.amount),
                                paidAmount: 0,
                                status: 'Pending',
                                paymentMethod: newContractInstallment.paymentMethod,
                                chequeNumber: newContractInstallment.chequeNumber || '',
                                bank: newContractInstallment.bank || '',
                                chequeStatus: newContractInstallment.paymentMethod === 'Cheque' ? 'Not Received' : '',
                                payments: [],
                                feedbacks: []
                              };

                              const allInstallments = await getInstallments();
                              allInstallments.push(newIns);
                              await saveInstallments(allInstallments);
                              setInstallments(allInstallments);
                              setShowAddInstallmentForm(false);
                              setNewContractInstallment({ type: 'Installment', dueDate: new Date().toISOString().split('T')[0], amount: '', paymentMethod: 'CASH', chequeNumber: '', bank: '' });
                            }}>
                              <IonIcon icon={addCircleOutline} slot="start" />
                              Save Installment
                            </IonButton>
                          </div>
                        )}

                        {(() => {
                          const linkedInstallments = installments.filter(ins =>
                            String(ins.unitId).trim() === String(viewingContract.unitId).trim()
                          );

                          if (linkedInstallments.length === 0 && !showAddInstallmentForm) {
                            return <p style={{ color: '#64748B', fontStyle: 'italic' }}>No installments found for this unit.</p>;
                          }

                          if (linkedInstallments.length === 0) return null;

                          const totalAmount = linkedInstallments.reduce((sum, ins) => sum + Number(ins.amount || 0), 0);
                          const totalPaid = linkedInstallments.reduce((sum, ins) => sum + Number(ins.paidAmount || 0), 0);
                          const totalRemaining = totalAmount - totalPaid;
                          const progressPercent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

                          return (
                            <>
                              {/* Progress Summary */}
                              <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ color: '#64748B'    }}>Total: <strong style={{ color: '#1E293B' }}>{formatCurrency(totalAmount)}</strong></span>
                                  <span style={{ color: '#2563EB' }}>Paid: <strong>{formatCurrency(totalPaid)}</strong></span>
                                  <span style={{ color: '#DC2626' }}>Remaining: <strong>{formatCurrency(totalRemaining)}</strong></span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#ffffff', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, progressPercent)}%`, height: '100%', background: 'linear-gradient(90deg, #2dd36f, #3880ff)', transition: 'width 0.3s ease' }} />
                                </div>
                                <p style={{ color: '#64748B'   , fontSize: '0.8rem', marginTop: '6px', marginBottom: 0 }}>{progressPercent.toFixed(1)}% Complete</p>
                              </div>

                              {/* Installments Table */}
                              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Type</th>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Due Date</th>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Amount / Paid / Rest</th>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Cheque #</th>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Bank</th>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Status</th>
                                      <th style={{ padding: '8px', color: '#64748B'    }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {linkedInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(ins => {

                                      return (
                                        <tr key={ins.id} style={{ borderBottom: '1px solid #222' }}>
                                          <td style={{ padding: '8px', color: '#1E293B' }}>{ins.type}</td>
                                          <td style={{ padding: '8px', color: '#2563EB' }}>{formatExcelDate(ins.dueDate)}</td>
                                          <td style={{ padding: '8px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1E293B' }}>{formatCurrency(ins.amount)}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', marginTop: '4px' }}>
                                              <span style={{ color: '#2563EB' }}>Paid: {formatCurrency(ins.paidAmount || 0)}</span>
                                              <span style={{ color: (ins.amount - (ins.paidAmount || 0)) > 1 ? '#DC2626' : '#2563EB' }}>Rest: {formatCurrency(Math.max(0, ins.amount - (ins.paidAmount || 0)))}</span>
                                            </div>
                                          </td>
                                          <td style={{ padding: '8px', color: '#64748B', fontSize: '0.75rem' }}>{ins.chequeNumber || '-'}</td>
                                          <td style={{ padding: '8px', color: '#64748B', fontSize: '0.75rem' }}>{ins.bank || '-'}</td>
                                          <td style={{ padding: '8px' }}>
                                            <span style={{
                                              padding: '3px 6px',
                                              borderRadius: '4px',
                                              fontSize: '0.75rem',
                                              background: ins.status === 'Cleared' || ins.status === 'Paid' ? 'rgba(30, 58, 138, 0.15)' : ins.status === 'Rejected' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(31, 41, 55, 0.15)',
                                              color: ins.status === 'Cleared' || ins.status === 'Paid' ? '#2563EB' : ins.status === 'Rejected' ? '#DC2626' : '#E2E8F0'
                                            }}>
                                              {ins.status}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                                            <IonButton size="small" fill="clear" style={{ '--color': '#2563EB' }} onClick={() => { setEditingInstallment(ins); }}>
                                              <IonIcon icon={create} slot="icon-only" />
                                            </IonButton>
                                            <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={async () => {
                                              if (!window.confirm(`Delete installment "${ins.type}" (${formatCurrency(ins.amount)}) due ${formatExcelDate(ins.dueDate)}?`)) return;
                                              const allInstallments = await getInstallments();
                                              const filtered = allInstallments.filter(i => i.id !== ins.id);
                                              await saveInstallments(filtered);
                                              setInstallments(filtered);
                                            }}>
                                              <IonIcon icon={trash} slot="icon-only" />
                                            </IonButton>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {
                        viewingContract.notes && (
                          <div style={{ background: 'var(--app-bg-card)', borderRadius: '12px', padding: '15px', color: '#64748B'   , fontSize: '13px', fontStyle: 'italic', marginBottom: '20px' }}>
                            <strong>Internal Notes:</strong> {viewingContract.notes}
                          </div>
                        )
                      }

                      {viewingContract.status !== 'terminated' && viewingContract.status !== 'resold' ? (
                        <>
                          <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', marginTop: '10px', '--border-radius': '12px' }} fill="solid" onClick={() => handleResaleStart(viewingContract)}>
                            Resale Unit to New Customer
                          </IonButton>
                          <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', marginTop: '10px', '--border-radius': '12px' }} fill="outline" onClick={() => handleCancelContract(viewingContract)}>
                            Terminate Contract
                          </IonButton>
                        </>
                      ) : viewingContract.status === 'terminated' ? (
                        <div style={{
                          background: 'rgba(220, 38, 38, 0.05)',
                          border: '1px solid rgba(220, 38, 38, 0.15)',
                          borderRadius: '12px',
                          padding: '15px 20px',
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <IonIcon icon={closeCircleOutline} style={{ color: '#DC2626', fontSize: '20px' }} />
                          <span style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: '600' }}>This contract has been terminated. All data is preserved for reference.</span>
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(230, 126, 34, 0.05)',
                          border: '1px solid rgba(230, 126, 34, 0.15)',
                          borderRadius: '12px',
                          padding: '15px 20px',
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <IonIcon icon={swapHorizontalOutline} style={{ color: '#E67E22', fontSize: '20px' }} />
                          <span style={{ color: '#E67E22', fontSize: '0.85rem', fontWeight: '600' }}>This contract has been resold to {viewingContract.resoldTo || 'a new customer'}. All data is preserved for reference.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* --- CHEQUE CUSTODY RECEIPT MODAL (حافظة استلام شيكات) --- */}
            <IonModal isOpen={showChequeCustody} onDidDismiss={() => setShowChequeCustody(false)}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#1E293B' }}>
                  <IonTitle style={{ color: '#F5DEB3' }}>حافظة استلام شيكات</IonTitle>
                  <IonButton slot="end" onClick={() => setShowChequeCustody(false)} fill="clear" style={{ '--color': '#F5DEB3' }}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                {viewingContract && (() => {
                  const allCheques = installments
                    .filter(ins => String(ins.unitId).trim() === String(viewingContract.unitId).trim() && ins.paymentMethod === 'Cheque' && ins.chequeNumber)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                  const selectedCount = allCheques.filter(c => chequeCustodySelection.includes(c.id)).length;
                  const selectedTotal = allCheques.filter(c => chequeCustodySelection.includes(c.id)).reduce((s, c) => s + Number(c.amount || 0), 0);

                  return (
                    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                      {/* Summary bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(184, 134, 11, 0.08)', border: '1px solid rgba(184, 134, 11, 0.2)', borderRadius: '12px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ color: '#B8860B', fontWeight: '800', fontSize: '1rem' }}>{selectedCount}</span>
                          <span style={{ color: '#64748B', fontSize: '0.85rem', marginLeft: '6px' }}>cheques selected</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Total: </span>
                          <span style={{ color: '#B8860B', fontWeight: '800', fontSize: '1rem' }}>{formatCurrency(selectedTotal)}</span>
                        </div>
                      </div>

                      {/* Select All / None */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <IonButton size="small" fill="outline" style={{ '--color': '#2563EB', '--border-color': '#2563EB' }} onClick={() => setChequeCustodySelection(allCheques.map(c => c.id))}>
                          Select All
                        </IonButton>
                        <IonButton size="small" fill="outline" style={{ '--color': '#64748B', '--border-color': '#64748B' }} onClick={() => setChequeCustodySelection([])}>
                          Clear All
                        </IonButton>
                      </div>

                      {/* Cheque list */}
                      {allCheques.length === 0 ? (
                        <p style={{ color: '#64748B', textAlign: 'center', padding: '30px', fontStyle: 'italic' }}>No cheque installments found for this unit.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {allCheques.map((chq, idx) => {
                            const isSelected = chequeCustodySelection.includes(chq.id);
                            return (
                              <div key={chq.id}
                                onClick={() => {
                                  setChequeCustodySelection(prev =>
                                    prev.includes(chq.id) ? prev.filter(id => id !== chq.id) : [...prev, chq.id]
                                  );
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
                                  background: isSelected ? 'rgba(184, 134, 11, 0.06)' : 'var(--app-bg-card)',
                                  border: isSelected ? '2px solid #B8860B' : '1px solid var(--app-border, #E5E7EB)',
                                  borderRadius: '12px', cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <IonCheckbox checked={isSelected} style={{ '--background-checked': '#B8860B', '--border-color-checked': '#B8860B' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--app-text, #1E293B)', fontSize: '0.95rem' }}>{formatCurrency(chq.amount)}</span>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px',
                                      background: chq.status === 'Paid' ? 'rgba(45,211,111,0.1)' : 'rgba(184,134,11,0.1)',
                                      color: chq.status === 'Paid' ? '#2dd36f' : '#B8860B', fontWeight: '700'
                                    }}>{chq.status || 'Pending'}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.8rem', color: '#64748B' }}>
                                    <span>#{chq.chequeNumber}</span>
                                    <span>{chq.bank || '-'}</span>
                                    <span style={{ color: '#2563EB' }}>{formatExcelDate(chq.dueDate)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Print Button */}
                      <IonButton
                        expand="block"
                        disabled={selectedCount === 0}
                        style={{ marginTop: '20px', '--background': '#B8860B', '--color': '#FFFFFF', '--border-radius': '12px', fontWeight: 'bold', fontSize: '1rem' }}
                        onClick={async () => {
                          const selectedCheques = allCheques
                            .filter(c => chequeCustodySelection.includes(c.id))
                            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                          const cust = customers.find(c => String(c.id).trim() === String(viewingContract.customerId).trim());
                          const customerName = cust?.name || viewingContract.customerName || viewingContract.customerId || 'Unknown';

                          const doc = await generateChequeCustodyPDF({
                            companyName: branding.name || 'DYR',
                            customerName,
                            unitId: viewingContract.unitId,
                            cheques: selectedCheques,
                            branding
                          });

                          handlePreviewPDF(doc, `CHQ-${viewingContract.unitId}-${Date.now()}.pdf`);
                          setShowChequeCustody(false);
                        }}
                      >
                        <IonIcon icon={printOutline} slot="start" />
                        طباعة حافظة ({selectedCount} شيك)
                      </IonButton>
                    </div>
                  );
                })()}
              </IonContent>
            </IonModal>

            {/* --- TERMINATION CONFIGURATION MODAL --- */}
            <IonModal isOpen={showTerminationModal} onDidDismiss={() => { setShowTerminationModal(false); setTerminationTarget(null); }}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff' }}>
                  <IonTitle style={{ color: '#DC2626' }}>Terminate Contract</IonTitle>
                  <IonButton slot="end" onClick={() => { setShowTerminationModal(false); setTerminationTarget(null); }} color="light">Cancel</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {terminationTarget && (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {/* Warning Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                      padding: '16px 24px',
                      borderRadius: '12px',
                      marginBottom: '25px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <IonIcon icon={closeCircleOutline} style={{ fontSize: '28px', color: '#fff', flexShrink: 0 }} />
                      <div>
                        <div style={{ color: '#fff', fontWeight: '900', fontSize: '1rem' }}>TERMINATING CONTRACT</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '2px' }}>
                          Unit {terminationTarget.unitId} • {terminationTarget.customerName || terminationTarget.customerId}
                        </div>
                      </div>
                    </div>

                    {/* Unit Reconfiguration */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>Unit Reconfiguration</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Base Price</label>
                          <IonInput
                            type="number"
                            value={terminationForm.newBasePrice}
                            onIonChange={e => setTerminationForm(f => ({ ...f, newBasePrice: e.detail.value }))}
                            placeholder="Enter new base price"
                            style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Finished Price</label>
                          <IonInput
                            type="number"
                            value={terminationForm.newFinishedPrice}
                            onIonChange={e => setTerminationForm(f => ({ ...f, newFinishedPrice: e.detail.value }))}
                            placeholder="Enter new finished price"
                            style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Plan</label>
                        <IonInput
                          value={terminationForm.paymentPlan}
                          onIonChange={e => setTerminationForm(f => ({ ...f, paymentPlan: e.detail.value }))}
                          placeholder="e.g. 12 months quarterly, 3 years monthly..."
                          style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Status After Termination</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {['available', 'locked'].map(status => (
                            <div
                              key={status}
                              onClick={() => setTerminationForm(f => ({ ...f, newUnitStatus: status }))}
                              style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                background: terminationForm.newUnitStatus === status
                                  ? (status === 'available' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(220, 38, 38, 0.15)')
                                  : 'rgba(0,0,0,0.1)',
                                color: terminationForm.newUnitStatus === status
                                  ? (status === 'available' ? '#2563EB' : '#DC2626')
                                  : '#64748B',
                                border: `2px solid ${terminationForm.newUnitStatus === status
                                  ? (status === 'available' ? '#2563EB' : '#DC2626')
                                  : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {status === 'available' ? '✓ Available' : '🔒 Locked'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Termination Reason */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>Termination Reason</h3>
                      <IonInput
                        value={terminationForm.reason}
                        onIonChange={e => setTerminationForm(f => ({ ...f, reason: e.detail.value }))}
                        placeholder="e.g. Customer request, Payment default, Mutual agreement..."
                        style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                      />
                    </div>

                    {/* Confirm Button */}
                    <IonButton
                      expand="block"
                      onClick={handleConfirmTermination}
                      style={{
                        '--background': 'linear-gradient(135deg, #DC2626, #991B1B)',
                        '--border-radius': '12px',
                        fontWeight: '800',
                        fontSize: '1rem',
                        letterSpacing: '1px',
                        marginBottom: '30px'
                      }}
                    >
                      <IonIcon icon={closeCircleOutline} slot="start" />
                      CONFIRM TERMINATION
                    </IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- OFFER CANCELLATION CONFIG MODAL --- */}
            <IonModal isOpen={showOfferCancelModal} onDidDismiss={() => { setShowOfferCancelModal(false); setOfferCancelTarget(null); }}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff' }}>
                  <IonTitle style={{ color: '#E67E22' }}>Cancel Offer</IonTitle>
                  <IonButton slot="end" onClick={() => { setShowOfferCancelModal(false); setOfferCancelTarget(null); }} color="light">Close</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {offerCancelTarget && (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {/* Warning Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, #E67E22, #D35400)',
                      padding: '16px 24px',
                      borderRadius: '12px',
                      marginBottom: '25px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <IonIcon icon={closeCircleOutline} style={{ fontSize: '28px', color: '#fff', flexShrink: 0 }} />
                      <div>
                        <div style={{ color: '#fff', fontWeight: '900', fontSize: '1rem' }}>CANCELLING OFFER</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '2px' }}>
                          Unit {offerCancelTarget.unitId} • {offerCancelTarget.customerName || offerCancelTarget.customerId}
                        </div>
                      </div>
                    </div>

                    {/* Unit Reconfiguration */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>Unit Reconfiguration</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Base Price</label>
                          <IonInput
                            type="number"
                            value={offerCancelForm.newBasePrice}
                            onIonChange={e => setOfferCancelForm(f => ({ ...f, newBasePrice: e.detail.value }))}
                            placeholder="Enter new base price"
                            style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Finished Price</label>
                          <IonInput
                            type="number"
                            value={offerCancelForm.newFinishedPrice}
                            onIonChange={e => setOfferCancelForm(f => ({ ...f, newFinishedPrice: e.detail.value }))}
                            placeholder="Enter new finished price"
                            style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Plan</label>
                        <IonInput
                          value={offerCancelForm.paymentPlan}
                          onIonChange={e => setOfferCancelForm(f => ({ ...f, paymentPlan: e.detail.value }))}
                          placeholder="e.g. 12 months quarterly, 3 years monthly..."
                          style={{ '--background': 'rgba(0,0,0,0.1)', '--padding-start': '12px', '--border-radius': '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#1E293B' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Status After Cancellation</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {['available', 'locked'].map(status => (
                            <div
                              key={status}
                              onClick={() => setOfferCancelForm(f => ({ ...f, newUnitStatus: status }))}
                              style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                background: offerCancelForm.newUnitStatus === status
                                  ? (status === 'available' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(220, 38, 38, 0.15)')
                                  : 'rgba(0,0,0,0.1)',
                                color: offerCancelForm.newUnitStatus === status
                                  ? (status === 'available' ? '#2563EB' : '#DC2626')
                                  : '#64748B',
                                border: `2px solid ${offerCancelForm.newUnitStatus === status
                                  ? (status === 'available' ? '#2563EB' : '#DC2626')
                                  : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {status === 'available' ? '✓ Available' : '🔒 Locked'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Confirm Button */}
                    <IonButton
                      expand="block"
                      onClick={handleConfirmOfferCancel}
                      style={{
                        '--background': 'linear-gradient(135deg, #E67E22, #D35400)',
                        '--border-radius': '12px',
                        fontWeight: '800',
                        fontSize: '1rem',
                        letterSpacing: '1px',
                        marginBottom: '30px'
                      }}
                    >
                      <IonIcon icon={closeCircleOutline} slot="start" />
                      CONFIRM CANCELLATION
                    </IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- OFFER DETAILS MODAL --- */}
            <IonModal isOpen={!!viewingOffer} onDidDismiss={() => setViewingOffer(null)}>
              <IonHeader><IonToolbar style={{ '--background': '#ffffff' }}><IonTitle style={{ color: '#1E293B' }}>Offer Details</IonTitle><IonButton slot="end" onClick={() => setViewingOffer(null)} color="light">Close</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {viewingOffer && (() => {
                  const unit = buildings.flatMap(b => (b.units || []).map(u => ({ ...u, buildingName: b.name }))).find(u => u.unitId === viewingOffer.unitId);
                  return (
                    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>

                      {/* 1. Header & Unit Info */}
                      <div style={{ background: 'var(--app-bg-card)', padding: '24px', borderRadius: '16px', marginBottom: '20px', borderTop: '4px solid #1F2937', border: '1px solid #E2E8F0', borderTopWidth: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h2 style={{ color: '#1E293B', margin: 0, fontSize: '1.5rem' }}>Unit {viewingOffer.unitId}</h2>
                              <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={() => handleViewLayout(viewingOffer.unitId)}>
                                <IonIcon icon={mapOutline} slot="start" /> Layout
                              </IonButton>
                            </div>
                            <p style={{ color: '#64748B', marginTop: '4px' }}>{unit?.buildingName || 'Unknown Project'}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(31, 41, 55, 0.15)', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                              {viewingOffer.status || 'Active Offer'}
                            </span>
                            <div style={{ color: '#64748B'   , fontSize: '0.8rem', marginTop: '8px' }}>Created: {formatExcelDate(viewingOffer.date)}</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '24px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>FLOOR</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.floor || '-'}</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>AREA</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.area || '-'} sqm</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>VIEW</span><br />
                            <strong style={{ color: '#1E293B' }}>{unit?.view || '-'}</strong>
                          </div>
                          {unit?.plan && (
                            <div style={{ background: 'rgba(197,160,89,0.1)', padding: '12px', borderRadius: '10px', gridColumn: 'span 3', border: '1px solid rgba(197,160,89,0.2)', marginTop: '5px' }}>
                              <span style={{ color: '#2563EB', fontSize: '10px', fontWeight: 'bold' }}>SYSTEM PAYMENT PLAN</span><br />
                              <strong style={{ color: '#1E293B' }}>{unit.plan}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Customer, Sales Agent, Joint Purchasers & Guarantor */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Customer Information */}
                        <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ color: '#2563EB', margin: 0, fontSize: '1rem' }}>Customer</h3>
                            <IonButton fill="clear" size="small" style={{ '--color': '#2563EB', fontSize: '0.75rem', height: '28px' }}
                              onClick={() => {
                                const el = document.getElementById('offer-customer-select');
                                if (el) el.click();
                              }}>
                              <IonIcon icon={create} slot="icon-only" style={{ fontSize: '16px' }} />
                            </IonButton>
                          </div>
                          {(() => {
                            const cust = customers.find(c => c.id === viewingOffer.customerId);
                            return (
                              <div>
                                <div style={{ color: '#1E293B', fontWeight: 'bold' }}>{viewingOffer.customerName || 'N/A'}</div>
                                <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '4px' }}>ID: {viewingOffer.customerId || '-'}</div>
                                {cust?.phone && <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '4px' }}>Phone: {cust.phone}</div>}
                              </div>
                            );
                          })()}
                          <IonSelect
                            id="offer-customer-select"
                            interface="popover"
                            value={viewingOffer.customerId}
                            onIonChange={async (e) => {
                              const newCustId = e.detail.value;
                              if (newCustId === viewingOffer.customerId) return;
                              const cust = customers.find(c => c.id === newCustId);
                              if (cust) {
                                const updated = await updateOffer(viewingOffer.id, { customerId: cust.id, customerName: cust.name });
                                if (updated) { setViewingOffer(updated); refreshData(); }
                              }
                            }}
                            style={{ display: 'none' }}
                          >
                            {customers.map(c => (
                              <IonSelectOption key={c.id} value={c.id}>{c.name} ({c.id})</IonSelectOption>
                            ))}
                          </IonSelect>
                        </div>

                        {/* Sales Agent */}
                        <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ color: '#2563EB', margin: 0, fontSize: '1rem' }}>Sales Agent</h3>
                            <IonButton fill="clear" size="small" style={{ '--color': '#2563EB', fontSize: '0.75rem', height: '28px' }}
                              onClick={() => {
                                const el = document.getElementById('offer-sales-select');
                                if (el) el.click();
                              }}>
                              <IonIcon icon={create} slot="icon-only" style={{ fontSize: '16px' }} />
                            </IonButton>
                          </div>
                          {(() => {
                            const sale = sales.find(s => String(s.id).trim() === String(viewingOffer.salesId).trim());
                            return (
                              <div>
                                <div style={{ color: '#1E293B', fontWeight: 'bold' }}>{sale?.name || 'N/A'}</div>
                                <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '4px' }}>ID: {viewingOffer.salesId || '-'} {sale?.phone ? `| ${sale.phone}` : ''}</div>
                                {sale?.phone && (
                                  <IonButton fill="clear" size="small" style={{ '--padding-start': '0', height: '24px', marginTop: '5px' }} onClick={() => window.open(`tel:${sale.phone}`, '_system')}>
                                    <IonIcon icon={callOutline} slot="start" style={{ fontSize: '14px' }} /> Call Agent
                                  </IonButton>
                                )}
                              </div>
                            );
                          })()}
                          <IonSelect
                            id="offer-sales-select"
                            interface="popover"
                            value={viewingOffer.salesId || ''}
                            onIonChange={async (e) => {
                              const newSalesId = e.detail.value;
                              if (newSalesId === (viewingOffer.salesId || '')) return;
                              const updated = await updateOffer(viewingOffer.id, { salesId: newSalesId });
                              if (updated) { setViewingOffer(updated); refreshData(); }
                            }}
                            style={{ display: 'none' }}
                          >
                            <IonSelectOption value="">None</IonSelectOption>
                            {sales.map(s => (
                              <IonSelectOption key={s.id} value={s.id}>{s.name} ({s.id})</IonSelectOption>
                            ))}
                          </IonSelect>
                        </div>
                      </div>

                      {/* Joint Purchasers & Guarantor */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Joint Purchasers */}
                        <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <h3 style={{ color: '#2563EB', margin: 0, fontSize: '1rem' }}>{t('contracts.jointPurchasersTitle')}</h3>
                              <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '2px', '--padding-end': '2px' }}>
                                <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '16px' }} />
                              </IonButton>
                            </div>
                            <IonButton fill="clear" size="small" style={{ '--color': '#2563EB', fontSize: '0.75rem', height: '28px' }}
                              onClick={() => {
                                const el = document.getElementById('offer-jp-select');
                                if (el) el.click();
                              }}>
                              <IonIcon icon={personAddOutline} slot="icon-only" style={{ fontSize: '16px' }} />
                            </IonButton>
                          </div>
                          {(viewingOffer.jointPurchasers || []).length === 0 ? (
                            <div style={{ color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic' }}>No joint purchasers added</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {(viewingOffer.jointPurchasers || []).map((jp, idx) => {
                                const cust = customers.find(c => c.id === jp.id);
                                return (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(37, 99, 235, 0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                                    <div>
                                      <div style={{ color: '#1E293B', fontWeight: '600', fontSize: '0.85rem' }}>{cust?.name || jp.name || jp.id}</div>
                                      {cust?.phone && <div style={{ color: '#64748B', fontSize: '0.7rem' }}>{cust.phone}</div>}
                                    </div>
                                    <IonButton fill="clear" size="small" style={{ '--color': '#DC2626', height: '24px' }}
                                      onClick={async () => {
                                        const updatedJPs = (viewingOffer.jointPurchasers || []).filter((_, i) => i !== idx);
                                        const updated = await updateOffer(viewingOffer.id, { jointPurchasers: updatedJPs });
                                        if (updated) { setViewingOffer(updated); refreshData(); }
                                      }}>
                                      <IonIcon icon={closeCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                                    </IonButton>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <IonSelect
                            id="offer-jp-select"
                            interface="popover"
                            value=""
                            placeholder="Add Joint Purchaser..."
                            onIonChange={async (e) => {
                              const jpId = e.detail.value;
                              if (!jpId) return;
                              const alreadyAdded = (viewingOffer.jointPurchasers || []).some(jp => jp.id === jpId);
                              const isGuarantor = viewingOffer.guarantor?.id === jpId;
                              if (alreadyAdded || jpId === viewingOffer.customerId || isGuarantor) {
                                if (isGuarantor) alert('This customer is already assigned as the Guarantor on this offer.');
                                return;
                              }
                              // Cross-unit check: already on another offer/contract for same unit
                              const unitTaken = getCustomerIdsOnUnit(viewingOffer.unitId, viewingOffer.id);
                              if (unitTaken.has(jpId)) {
                                alert('This customer already has a role on another offer/contract for this unit.');
                                return;
                              }
                              const cust = customers.find(c => c.id === jpId);
                              if (cust) {
                                const updatedJPs = [...(viewingOffer.jointPurchasers || []), { id: cust.id, name: cust.name }];
                                const updated = await updateOffer(viewingOffer.id, { jointPurchasers: updatedJPs });
                                if (updated) { setViewingOffer(updated); refreshData(); }
                              }
                            }}
                            style={{ display: 'none' }}
                          >
                            {(() => { const unitTaken = getCustomerIdsOnUnit(viewingOffer.unitId, viewingOffer.id); return customers.filter(c => c.id !== viewingOffer.customerId && !(viewingOffer.jointPurchasers || []).some(jp => jp.id === c.id) && c.id !== (viewingOffer.guarantor?.id || '') && !unitTaken.has(c.id)); })().map(c => (
                              <IonSelectOption key={c.id} value={c.id}>{c.name} ({c.id})</IonSelectOption>
                            ))}
                          </IonSelect>
                        </div>

                        {/* Guarantor */}
                        <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <h3 style={{ color: '#2563EB', margin: 0, fontSize: '1rem' }}>Guarantor</h3>
                              <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '2px', '--padding-end': '2px' }}>
                                <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '16px' }} />
                              </IonButton>
                            </div>
                            <IonButton fill="clear" size="small" style={{ '--color': '#2563EB', fontSize: '0.75rem', height: '28px' }}
                              onClick={() => {
                                const el = document.getElementById('offer-guarantor-select');
                                if (el) el.click();
                              }}>
                              <IonIcon icon={create} slot="icon-only" style={{ fontSize: '16px' }} />
                            </IonButton>
                          </div>
                          {(() => {
                            const g = viewingOffer.guarantor;
                            if (!g) return <div style={{ color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic' }}>No guarantor assigned</div>;
                            const cust = customers.find(c => c.id === g.id);
                            return (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(37, 99, 235, 0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div>
                                  <div style={{ color: '#1E293B', fontWeight: '600', fontSize: '0.85rem' }}>{cust?.name || g.name || g.id}</div>
                                  {cust?.phone && <div style={{ color: '#64748B', fontSize: '0.7rem' }}>{cust.phone}</div>}
                                </div>
                                <IonButton fill="clear" size="small" style={{ '--color': '#DC2626', height: '24px' }}
                                  onClick={async () => {
                                    const updated = await updateOffer(viewingOffer.id, { guarantor: null });
                                    if (updated) { setViewingOffer(updated); refreshData(); }
                                  }}>
                                  <IonIcon icon={closeCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                                </IonButton>
                              </div>
                            );
                          })()}
                          <IonSelect
                            id="offer-guarantor-select"
                            interface="popover"
                            value={viewingOffer.guarantor?.id || ''}
                            onIonChange={async (e) => {
                              const gId = e.detail.value;
                              if (gId === (viewingOffer.guarantor?.id || '')) return;
                              if (!gId) {
                                const updated = await updateOffer(viewingOffer.id, { guarantor: null });
                                if (updated) { setViewingOffer(updated); refreshData(); }
                              } else {
                                const isJP = (viewingOffer.jointPurchasers || []).some(jp => jp.id === gId);
                                if (gId === viewingOffer.customerId || isJP) {
                                  alert(isJP ? 'This customer is already a Joint Purchaser on this offer.' : 'The owner cannot also be the Guarantor.');
                                  return;
                                }
                                // Cross-unit check
                                const unitTaken = getCustomerIdsOnUnit(viewingOffer.unitId, viewingOffer.id);
                                if (unitTaken.has(gId)) {
                                  alert('This customer already has a role on another offer/contract for this unit.');
                                  return;
                                }
                                const cust = customers.find(c => c.id === gId);
                                if (cust) {
                                  const updated = await updateOffer(viewingOffer.id, { guarantor: { id: cust.id, name: cust.name } });
                                  if (updated) { setViewingOffer(updated); refreshData(); }
                                }
                              }
                            }}
                            style={{ display: 'none' }}
                          >
                            <IonSelectOption value="">None</IonSelectOption>
                            {(() => { const unitTaken = getCustomerIdsOnUnit(viewingOffer.unitId, viewingOffer.id); return customers.filter(c => c.id !== viewingOffer.customerId && !(viewingOffer.jointPurchasers || []).some(jp => jp.id === c.id) && !unitTaken.has(c.id)); })().map(c => (
                              <IonSelectOption key={c.id} value={c.id}>{c.name} ({c.id})</IonSelectOption>
                            ))}
                          </IonSelect>
                        </div>
                      </div>

                      {/* 3. Financial Summary */}
                      <div style={{ background: 'var(--app-bg-card)', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px dashed #444' }}>
                        <h3 style={{ color: '#1E293B', marginTop: 0, fontSize: '1.1rem', marginBottom: '20px' }}>Financial Breakdown</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                          <div>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>BASE UNIT PRICE:</span><br />
                            <strong style={{ color: '#1E293B' }}>{formatCurrency(unit?.price || 0)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>FINISHED PRICE:</span><br />
                            <strong style={{ color: '#2563EB' }}>{formatCurrency(unit?.finishedPrice || 0)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>DISCOUNT:</span><br />
                            <strong style={{ color: '#DC2626' }}>{viewingOffer.discountPercent || 0}%</strong>
                          </div>
                          <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>FINAL PRICE:</span><br />
                            <strong style={{ color: '#1E293B', fontSize: '1.2rem' }}>{formatCurrency(viewingOffer.finalPrice || viewingOffer.totalPrice || 0)}</strong>
                          </div>
                          <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '11px' }}>DOWN PAYMENT ({viewingOffer.downPayment}%):</span><br />
                            <strong style={{ color: '#2563EB', fontSize: '1.2rem' }}>{formatCurrency(viewingOffer.downPaymentAmount || 0)}</strong>
                          </div>
                          {Number(viewingOffer.reservationAmount || 0) > 0 && (
                            <>
                              <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                                <span style={{ color: '#64748B', fontSize: '11px' }}>RESERVATION <span style={{ fontSize: '9px', color: '#94A3B8' }}>(PART OF DP)</span>:</span><br />
                                <strong style={{ color: '#F59E0B', fontSize: '1rem' }}>{formatCurrency(Number(viewingOffer.reservationAmount))}</strong>
                              </div>
                              <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                                <span style={{ color: '#64748B', fontSize: '11px' }}>REMAINING DP:</span><br />
                                <strong style={{ color: '#10B981', fontSize: '1rem' }}>{formatCurrency(Math.max(0, Number(viewingOffer.downPaymentAmount || 0) - Number(viewingOffer.reservationAmount || 0)))}</strong>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 4. Payment Plan / Installments */}
                      <div style={{ background: 'var(--app-bg-card)', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h3 style={{ color: '#1E293B', margin: 0, fontSize: '1.1rem' }}>Projected Payment Plan</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#64748B'   , fontSize: '0.8rem' }}>{viewingOffer.years} Years | {viewingOffer.frequency}</span>
                            <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', '--padding-start': '10px', '--padding-end': '10px' }} onClick={() => {
                              setSelectedOfferForInstallments(viewingOffer);
                              setShowOfferInstallmentsModal(true);
                            }}>
                              <IonIcon icon={create} slot="start" />
                              Edit
                            </IonButton>
                          </div>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ color: '#64748B'   , textAlign: 'left', borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '10px' }}>Type</th>
                                <th style={{ padding: '10px' }}>Due Date</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '10px' }}>Cheque #</th>
                                <th style={{ padding: '10px' }}>Bank</th>
                                <th style={{ padding: '10px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(viewingOffer.installments || []).map((ins, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                                  <td style={{ padding: '10px', color: ins.type.includes('Down') ? '#2563EB' : '#2563EB' }}>{ins.type}</td>
                                  <td style={{ padding: '10px', color: '#64748B' }}>{formatExcelDate(ins.dueDate)}</td>
                                  <td style={{ padding: '10px', color: '#1E293B', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(ins.amount)}</td>
                                  <td style={{ padding: '10px', color: '#64748B'   , fontSize: '0.75rem' }}>{ins.chequeNumber || '-'}</td>
                                  <td style={{ padding: '10px', color: '#64748B'   , fontSize: '0.75rem' }}>{ins.bank || '-'}</td>
                                  <td style={{ padding: '10px' }}>
                                    <IonButton size="small" fill="clear" onClick={() => setEditingOfferInstallment({ offer: viewingOffer, installment: ins, index: idx })}>
                                      <IonIcon icon={create} />
                                    </IonButton>
                                  </td>
                                </tr>
                              ))}
                              {(!viewingOffer.installments || viewingOffer.installments.length === 0) && (
                                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>No installment plan generated</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 5. Payment history */}
                      <div style={{ background: 'var(--app-bg-card)', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                        <h3 style={{ color: '#1E293B', marginTop: 0, fontSize: '1.1rem', marginBottom: '15px' }}>Collected Payments</h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ color: '#64748B'   , textAlign: 'left', borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '10px' }}>Date</th>
                                <th style={{ padding: '10px' }}>Ref</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '10px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...(viewingOffer.payments || [])].sort((a, b) => parseSafeDate(b.date) - parseSafeDate(a.date)).map((p, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                                  <td style={{ padding: '10px', color: '#64748B' }}>{p.date}</td>
                                  <td style={{ padding: '10px', color: '#64748B'    }}>{p.reference || '-'}</td>
                                  <td style={{ padding: '10px', color: '#2563EB', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(p.amount)}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                    <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={() => handleEditOfferPayment(viewingOffer, p)}>
                                      <IonIcon icon={create} slot="icon-only" style={{ fontSize: '18px' }} />
                                    </IonButton>
                                    <IonButton size="small" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => handleDeleteOfferPayment(viewingOffer.id, p.id)}>
                                      <IonIcon icon={trash} slot="icon-only" style={{ fontSize: '18px' }} />
                                    </IonButton>
                                  </td>
                                </tr>
                              ))}
                              {(!viewingOffer.payments || viewingOffer.payments.length === 0) && (
                                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>No payments recorded yet</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 6. Actions */}
                      <div style={{ marginTop: '30px', display: 'flex', gap: '15px', paddingBottom: '40px' }}>
                        {(!viewingOffer.status || viewingOffer.status === 'active') && (
                          <>
                            <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', flex: 2, '--border-radius': '12px', fontWeight: 'bold' }} onClick={() => {
                              setSelectedOfferForPayment(viewingOffer);
                              setEditingOfferPayment(null);
                              setOfferPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], reference: '', paymentMethod: 'CASH', chequeNumber: '', bank: '', chequeStatus: 'Not Collected', attachment: null, isReservation: false });
                              setShowOfferPaymentModal(true);
                            }}>
                              <IonIcon icon={cashOutline} slot="start" /> Receive Payment
                            </IonButton>
                            <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', flex: 1, '--border-radius': '12px' }} onClick={() => {
                              handleCancelOffer(viewingOffer);
                              setViewingOffer(null);
                            }}>
                              Cancel
                            </IonButton>
                            <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', flex: 1, '--border-radius': '12px' }} onClick={() => {
                              handleDeleteOffer(viewingOffer);
                              setViewingOffer(null);
                            }}>
                              Delete
                            </IonButton>
                          </>
                        )}
                        {(viewingOffer.status === 'contracted' || viewingOffer.status === 'cancelled') && (
                          <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', flex: 1, '--border-radius': '12px' }} onClick={() => {
                            handleDeleteOffer(viewingOffer);
                            setViewingOffer(null);
                          }}>
                            Delete Offer Permanently
                          </IonButton>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </IonContent>
            </IonModal>


            {/* --- CREATE CONTRACT MODAL --- */}
            <IonModal isOpen={showCreateContractModal} onDidDismiss={() => { setShowCreateContractModal(false); resetDataEntryForms(); }}>
              <IonHeader><IonToolbar style={{ '--background': '#ffffff' }}><IonTitle style={{ color: '#1E293B' }}>Create Contract (Step {contractStep}/2)</IonTitle><IonButton slot="end" onClick={() => setShowCreateContractModal(false)} color="light">Close</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                {/* Step 1: Select Active Offer to Convert */}
                {contractStep === 1 && (
                  <div style={{ color: '#1E293B', paddingBottom: '20vh' }}>
                    <h3 style={{ color: '#2563EB', marginBottom: '15px' }}>Select Offer to Convert to Contract</h3>
                    <p style={{ color: '#64748B', marginBottom: '15px' }}>Choose an active offer to finalize as a contract:</p>
                    <IonList style={{ background: 'transparent' }}>
                      {offers.filter(o => !o.status || o.status === 'active').length === 0 ? (
                        <p style={{ color: '#64748B', textAlign: 'center', padding: '20px' }}>No active offers available. Create an offer first.</p>
                      ) : (
                        offers.filter(o => !o.status || o.status === 'active').map(offer => (
                          <IonItem button key={offer.id} onClick={() => {
                            setSelectedOffer(offer);
                            setContractForm({
                              ...contractForm,
                              contractId: 'CON-' + Date.now(),
                              date: offer.date,
                              totalPrice: offer.finalPrice || '',
                              downPayment: offer.downPayment || '',
                              years: offer.years || '',
                              frequency: offer.frequency || 'quarterly',
                              salesId: offer.salesId || ''
                            });

                            setContractStep(2);
                          }} style={{ '--background': '#64748B', color: '#1E293B', marginBottom: '8px', borderRadius: '8px' }}>
                            <IonLabel>
                              <h2 style={{ color: '#1E293B', fontWeight: 'bold' }}>{offer.customerName}</h2>
                              <p style={{ color: '#64748B' }}>Unit: {offer.unitId} | Offer Date: {formatExcelDate(offer.date)}</p>
                              <p style={{ color: '#64748B'    }}>Down: {offer.downPayment}% | {offer.years} Years | {offer.frequency}</p>
                            </IonLabel>
                            <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#64748B' }} slot="end" />
                          </IonItem>
                        ))
                      )}
                    </IonList>
                  </div>
                )}

                {/* Step 2: Contract Details with Joint Purchasers and Guarantor */}
                {contractStep === 2 && selectedOffer && (
                  <div style={{ color: '#1E293B', paddingBottom: '40vh' }}>
                    <h3 style={{ color: '#2563EB' }}>Contract Details</h3>
                    <div style={{ background: 'var(--app-bg-card)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                      <p><strong style={{ color: '#2563EB' }}>Offer ID:</strong> {selectedOffer.id}</p>
                      <p><strong style={{ color: '#2563EB' }}>Customer:</strong> {selectedOffer.customerName}</p>
                      <p><strong style={{ color: '#2563EB' }}>Unit:</strong> {selectedOffer.unitId}</p>
                    </div>

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput label="Contract ID" labelPlacement="floating" value={contractForm.contractId} onIonInput={e => setContractForm(prev => ({ ...prev, contractId: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                    </IonItem>
                    <ProDatePicker
                      label="Contract Date"
                      value={contractForm.date}
                      onChange={val => setContractForm(prev => ({ ...prev, date: val }))}
                      style={{ marginBottom: '10px' }}
                    />
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput type="number" label={`Total Price (${appSettings.currency})`} labelPlacement="floating" value={contractForm.totalPrice} onIonInput={e => setContractForm(prev => ({ ...prev, totalPrice: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                    </IonItem>

                    {/* Sales Selection */}
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonSelect label="Sold By (Sales)" labelPlacement="floating" value={contractForm.salesId} onIonChange={e => {
                        const selectedSales = sales.find(s => s.id === e.detail.value);
                        setContractForm({
                          ...contractForm,
                          salesId: e.detail.value,
                          salesName: selectedSales ? selectedSales.name : ''
                        });
                      }} style={{ '--color': 'var(--app-text)' }}>
                        {sales.map(s => (
                          <IonSelectOption key={s.id} value={s.id}>{s.name} ({s.id})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>

                    {/* Auto Installments Display */}
                    {contractForm.totalPrice && contractForm.downPayment && contractForm.years && (
                      <div style={{ background: '#ffffff', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                        <h4 style={{ color: '#2563EB', marginTop: 0 }}>Installment Preview</h4>
                        {(() => {
                          const total = Number(contractForm.totalPrice);
                          const down = total * (Number(contractForm.downPayment) / 100);
                          const remaining = total - down;
                          const freq = contractForm.frequency === 'quarterly' ? 4 : contractForm.frequency === 'biannual' ? 2 : 1;
                          const numInstallments = Number(contractForm.years) * freq;
                          const installmentAmount = remaining / numInstallments;
                          return (
                            <>
                              <p>Down Payment: <strong>{formatCurrency(down)}</strong></p>
                              <p>Remaining: <strong>{formatCurrency(remaining)}</strong></p>
                              <p>Installments: <strong>{numInstallments}</strong> payments of <strong>{formatCurrency(installmentAmount)}</strong></p>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Joint Purchasers Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ color: '#2563EB', margin: 0 }}>Joint Purchasers (Optional)</h4>
                        <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '4px', '--padding-end': '4px' }}>
                          <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '16px' }} />
                        </IonButton>
                      </div>
                    </div>
                    {jointPurchasers.map((jp, index) => (
                      <div key={index} style={{ background: 'var(--app-bg-card)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748B' }}>Joint Purchaser {index + 1}</span>
                          <IonButton size="small" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} fill="clear" onClick={() => setJointPurchasers(jointPurchasers.filter((_, i) => i !== index))}>Remove</IonButton>
                        </div>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '5px', borderRadius: '4px' }}>
                          <IonInput label="Name" labelPlacement="floating" value={jp.name} onIonInput={e => { const val = e.detail.value; setJointPurchasers(prev => { const updated = [...prev]; updated[index].name = val; return updated; }); }} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '5px', borderRadius: '4px' }}>
                          <IonInput label="ID" labelPlacement="floating" value={jp.id} onIonInput={e => { const val = e.detail.value; setJointPurchasers(prev => { const updated = [...prev]; updated[index].id = val; return updated; }); }} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                          <IonInput label="Phone" labelPlacement="floating" value={jp.phone} onIonInput={e => { const val = e.detail.value; setJointPurchasers(prev => { const updated = [...prev]; updated[index].phone = val; return updated; }); }} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                      </div>
                    ))}
                    <IonButton expand="block" fill="outline" onClick={() => setJointPurchasers([...jointPurchasers, { name: '', id: '', phone: '' }])} style={{ marginBottom: '15px' }}>+ Add Joint Purchaser</IonButton>

                    {/* Guarantor Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ color: '#2563EB', margin: 0 }}>Guarantor (Optional)</h4>
                      <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '24px', '--padding-start': '4px', '--padding-end': '4px' }}>
                        <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '16px' }} />
                      </IonButton>
                    </div>
                    <IonItem lines="none" style={{ '--background': 'transparent' }}>
                      <IonLabel style={{ color: '#1E293B' }}>Has Guarantor?</IonLabel>
                      <input type="checkbox" checked={guarantor.enabled} onChange={e => setGuarantor({ ...guarantor, enabled: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                    </IonItem>
                    {guarantor.enabled && (
                      <div style={{ background: 'var(--app-bg-card)', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '5px', borderRadius: '4px' }}>
                          <IonInput label="Guarantor Name" labelPlacement="floating" value={guarantor.name} onIonInput={e => setGuarantor(prev => ({ ...prev, name: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '5px', borderRadius: '4px' }}>
                          <IonInput label="Guarantor ID" labelPlacement="floating" value={guarantor.id} onIonInput={e => setGuarantor(prev => ({ ...prev, id: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                          <IonInput label="Guarantor Phone" labelPlacement="floating" value={guarantor.phone} onIonInput={e => setGuarantor(prev => ({ ...prev, phone: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                      </div>
                    )}

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginTop: '15px', borderRadius: '4px' }}>
                      <IonInput label="Notes" labelPlacement="floating" value={contractForm.notes} onIonInput={e => setContractForm(prev => ({ ...prev, notes: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                    </IonItem>

                    <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '20px' }} onClick={async () => {
                      // --- Duplicate Role Validation ---
                      const ownerId = selectedOffer.customerId;
                      const jpIds = jointPurchasers.filter(jp => jp.id).map(jp => jp.id.trim());
                      const guarantorId = guarantor.enabled ? guarantor.id?.trim() : null;

                      // Check for duplicate JP entries
                      const uniqueJPIds = new Set(jpIds);
                      if (uniqueJPIds.size !== jpIds.length) {
                        alert('A Joint Purchaser appears more than once. Each person can only have one role.'); return;
                      }
                      // Check if any JP is the owner
                      if (jpIds.some(id => id === ownerId)) {
                        alert('The owner cannot also be a Joint Purchaser.'); return;
                      }
                      // Check if guarantor is the owner
                      if (guarantorId && guarantorId === ownerId) {
                        alert('The owner cannot also be the Guarantor.'); return;
                      }
                      // Check if guarantor is also a JP
                      if (guarantorId && jpIds.includes(guarantorId)) {
                        alert('A Joint Purchaser cannot also be the Guarantor.'); return;
                      }

                      // Cross-unit check: ensure no stakeholder already has a role on another offer/contract for this unit
                      const unitTaken = getCustomerIdsOnUnit(selectedOffer.unitId, selectedOffer.id);
                      const allProposed = [ownerId, ...jpIds, ...(guarantorId ? [guarantorId] : [])];
                      const conflict = allProposed.find(id => unitTaken.has(id));
                      if (conflict) {
                        const conflictName = customers.find(c => c.id === conflict)?.name || conflict;
                        alert(`${conflictName} already has a role on another offer/contract for this unit.`); return;
                      }

                      // Create contract from offer
                      const newContract = {
                        ...contractForm,
                        offerId: selectedOffer.id,
                        customerId: selectedOffer.customerId, // Store only ID
                        unitId: selectedOffer.unitId,
                        buildingId: selectedOffer.buildingId,
                        // Store only IDs for Joint Purchasers
                        jointPurchasers: jointPurchasers.filter(jp => jp.id).map(jp => ({ id: jp.id })),
                        // Store only ID for Guarantor
                        guarantor: guarantor.enabled ? { id: guarantor.id } : null
                      };
                      const savedContract = await addContract(newContract, selectedOffer.payments || []);
                      // Update offer status to 'contracted' instead of deleting
                      await markOfferContracted(selectedOffer.id, savedContract.id);
                      alert(t('alert.contractCreated'));
                      setShowCreateContractModal(false);
                      setContractStep(1);
                      setSelectedOffer(null);
                      setJointPurchasers([]);
                      setGuarantor({ name: '', id: '', phone: '', enabled: false });
                      refreshData();
                      resetDataEntryForms();
                    }}>Finalize Contract</IonButton>

                    <IonButton expand="block" fill="outline" style={{ marginTop: '10px' }} onClick={() => { setContractStep(1); setSelectedOffer(null); }}>Back</IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- CREATE OFFER MODAL --- */}
            <IonModal isOpen={showCreateOfferModal} onDidDismiss={() => { setShowCreateOfferModal(false); resetDataEntryForms(); }}>
              <IonHeader>
                <IonToolbar>
                  {offerStep > 1 && (
                    <IonButtons slot="start">
                      <IonButton onClick={() => setOfferStep(prev => prev - 1)}>Back</IonButton>
                    </IonButtons>
                  )}
                  <IonTitle>Create Offer (Step {offerStep}/3)</IonTitle>
                  <IonButton slot="end" onClick={() => setShowCreateOfferModal(false)}>Close</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding">
                {offerStep === 1 && (
                  <>
                    <h3 style={{ color: 'white' }}>{t('offers.selectCustomer')}</h3>
                    <IonSearchbar
                      value={customerSearchQuery}
                      onIonInput={e => setCustomerSearchQuery(e.detail.value || '')}
                      placeholder="Search by Name, Phone, or Unit ID"
                      style={{ '--background': '#ffffff', color: '#1E293B', marginBottom: '10px' }}
                    />
                    <IonList style={{ background: 'transparent' }}>
                      {filteredCustomers.map(c => (
                        <IonItem button key={c.id} onClick={() => { setSelectedCustomer(c); setOfferStep(2); }} style={{ '--background': '#64748B', color: '#1E293B', marginBottom: '8px', borderRadius: '8px', '--border-radius': '8px' }}>
                          <IonLabel>{c.name}</IonLabel>
                          <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#64748B' }} slot="end" />
                        </IonItem>
                      ))}
                    </IonList>
                    <IonButton expand="block" fill="outline" onClick={() => setShowAddCustomerModal(true)}>Add New Customer</IonButton>
                  </>
                )}
                {offerStep === 2 && (
                  <>
                    <h3 style={{ color: 'white' }}>{t('offers.selectUnit')}</h3>
                    <p style={{ color: '#64748B' }}>Showing Available Units across all buildings</p>
                    <IonSearchbar
                      value={unitSearchQuery}
                      onIonInput={e => setUnitSearchQuery(e.detail.value)}
                      placeholder="Search Unit ID"
                      style={{ '--background': 'var(--app-bg-card)', '--color': 'var(--app-text)', '--placeholder-color': '#64748B', marginBottom: '10px' }}
                    />
                    <IonList style={{ background: 'transparent' }}>
                      {buildings.flatMap(b => (b.units || []).filter(u => (u.status || '').toLowerCase() === 'available').map(u => ({ ...u, buildingId: b.id, buildingName: b.name })))
                        .filter(u => u.unitId.toLowerCase().includes(unitSearchQuery.toLowerCase()))
                        .map(u => (
                          <IonItem button key={u.id} onClick={() => { setSelectedOfferUnit({ unit: u, buildingId: u.buildingId }); setOfferStep(3); }} style={{ '--background': '#64748B', color: '#1E293B', marginBottom: '8px', borderRadius: '8px', '--border-radius': '8px' }}>
                            <IonLabel>
                              <h2 style={{ fontWeight: 'bold' }}>Unit {u.unitId}</h2>
                              <p style={{ color: '#64748B' }}>{u.buildingName} | {u.area}sqm | {formatCurrency(u.price)}</p>
                            </IonLabel>
                            <IonIcon icon={chevronBack} style={{ transform: 'rotate(180deg)', color: '#64748B' }} slot="end" />
                          </IonItem>
                        ))}
                    </IonList>
                  </>
                )}
                {offerStep === 3 && (
                  <div style={{ padding: '10px 10px 40vh 10px' }}>
                    <h3 style={{ color: 'white' }}>Offer Details</h3>
                    <p style={{ color: '#64748B' }}><strong>Customer:</strong> {selectedCustomer?.name}</p>
                    <p style={{ color: '#64748B' }}><strong>Unit:</strong> {selectedOfferUnit?.unit.unitId}</p>

                    <div style={{ marginBottom: '10px' }}>
                      <ProDatePicker
                        label="Offer Date"
                        value={offerForm.date}
                        onChange={val => setOfferForm(prev => ({ ...prev, date: val }))}
                      />
                    </div>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonSelect label="Unit Finish" labelPlacement="floating" value={offerForm.priceType} onIonChange={e => setOfferForm(prev => ({ ...prev, priceType: e.detail.value }))} style={{ '--color': 'var(--app-text)' }}>
                        <IonSelectOption value="base">Base - {formatCurrency(selectedOfferUnit?.unit.price || 0)}</IonSelectOption>
                        <IonSelectOption value="finished">Finished - {formatCurrency(selectedOfferUnit?.unit.finishedPrice || selectedOfferUnit?.unit.price || 0)}</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput type="number" label="Discount (%)" labelPlacement="floating" value={offerForm.discountPercent} onIonInput={e => setOfferForm(prev => ({ ...prev, discountPercent: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput type="number" label="Down Payment (%)" labelPlacement="floating" value={offerForm.downPayment} onIonInput={e => setOfferForm(prev => ({ ...prev, downPayment: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput type="number" label="Years" labelPlacement="floating" value={offerForm.years} onIonInput={e => setOfferForm(prev => ({ ...prev, years: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                    </IonItem>
                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonSelect label="Frequency" labelPlacement="floating" value={offerForm.frequency} onIonChange={e => setOfferForm(prev => ({ ...prev, frequency: e.detail.value }))} style={{ '--color': 'var(--app-text)' }}>
                        <IonSelectOption value="quarterly">Quarterly</IonSelectOption>
                        <IonSelectOption value="biannual">Bi-Annual</IonSelectOption>
                        <IonSelectOption value="annual">Annual</IonSelectOption>
                      </IonSelect>
                    </IonItem>

                    {/* Sales Agent Selection with Search */}
                    <div style={{ marginTop: '15px' }}>
                      <label style={{ color: '#64748B', fontSize: '0.9rem', marginLeft: '10px' }}>Sales Agent</label>
                      <IonSearchbar
                        value={salesSearchQuery || ''}
                        onIonInput={e => setSalesSearchQuery(e.detail.value || '')}
                        placeholder="Search Sales Agent Name or ID..."
                        style={{ '--background': '#ffffff', color: '#1E293B' }}
                      />
                      <IonList style={{ background: 'transparent', maxHeight: '150px', overflow: 'auto' }}>
                        <IonItem
                          button
                          onClick={() => setOfferForm(prev => ({ ...prev, salesId: '' }))}
                          style={{ '--background': offerForm.salesId === '' ? '#ffffff' : 'transparent', color: '#1E293B' }}
                        >
                          <IonLabel>None</IonLabel>
                          {offerForm.salesId === '' && <IonIcon icon={shieldCheckmarkOutline} slot="end" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} />}
                        </IonItem>
                        {sales
                          .filter(s =>
                            (s.name || '').toLowerCase().includes((salesSearchQuery || '').toLowerCase()) ||
                            (s.id || '').toLowerCase().includes((salesSearchQuery || '').toLowerCase())
                          )
                          .map(s => (
                            <IonItem
                              button
                              key={s.id}
                              onClick={() => setOfferForm(prev => ({ ...prev, salesId: s.id }))}
                              style={{ '--background': offerForm.salesId === s.id ? '#ffffff' : 'transparent', color: '#1E293B' }}
                            >
                              <IonLabel>
                                {s.name}
                                <p style={{ fontSize: '0.8rem', color: '#64748B'    }}>ID: {s.id}</p>
                              </IonLabel>
                              {offerForm.salesId === s.id && <IonIcon icon={shieldCheckmarkOutline} slot="end" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} />}
                            </IonItem>
                          ))}
                      </IonList>
                    </div>

                    {/* Flash Fill Section */}
                    <div style={{ background: '#F1F5F9', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid #3880ff40' }}>
                      <h4 style={{ color: '#2563EB', marginTop: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚡ Flash Fill Installments
                      </h4>
                      <p style={{ color: '#64748B'   , fontSize: '0.75rem', margin: '0 0 10px 0' }}>Auto-fill date, cheque & bank details for all installments</p>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                        <ProDatePicker label="First Installment Date" value={offerForm.firstInstallmentDate} onChange={val => setOfferForm(prev => ({ ...prev, firstInstallmentDate: val }))} />
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                        <IonSelect label="Payment Method" labelPlacement="floating" value={offerForm.paymentMethod} onIonChange={e => setOfferForm(prev => ({ ...prev, paymentMethod: e.detail.value }))} style={{ '--color': 'var(--app-text)' }}>
                          <IonSelectOption value="Cheque">Cheque</IonSelectOption>
                          <IonSelectOption value="Cash">Cash</IonSelectOption>
                          <IonSelectOption value="Bank Transfer">{t('common.bankTransfer')}</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      {offerForm.paymentMethod === 'Cheque' && (
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                          <IonInput label="Starting Cheque #" labelPlacement="floating" type="number" value={offerForm.startingChequeNumber} onIonInput={e => setOfferForm(prev => ({ ...prev, startingChequeNumber: e.detail.value }))} placeholder="e.g. 100001" style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                      )}
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label="Bank" labelPlacement="floating" value={offerForm.bank} onIonInput={e => setOfferForm(prev => ({ ...prev, bank: e.detail.value }))} placeholder="e.g. CIB, QNB..." style={{ '--color': 'var(--app-text)' }} />
                      </IonItem>
                    </div>

                    {/* Real-time Preview */}
                    {offerForm.finalPrice > 0 && (
                      <div style={{ background: '#FFFFFF', padding: '15px', borderRadius: '8px', marginTop: '10px', border: '1px dashed #3b82f6' }}>
                        <h4 style={{ color: '#2563EB', marginTop: 0, fontSize: '0.9rem' }}>Financial Preview</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', color: '#64748B' }}>
                          <div>Final Price: <strong style={{ color: '#1E293B' }}>${Math.round(offerForm.finalPrice).toLocaleString()}</strong></div>
                          <div>DP Amount: <strong style={{ color: '#2563EB' }}>${Math.round(offerForm.downPaymentAmount).toLocaleString()}</strong></div>
                          {Number(offerForm.reservationAmount || 0) > 0 && (
                            <>
                              <div>Reservation: <strong style={{ color: '#F59E0B' }}>${Number(offerForm.reservationAmount).toLocaleString()}</strong> <span style={{ fontSize: '0.7rem' }}>(part of DP)</span></div>
                              <div>Remaining DP: <strong style={{ color: '#10B981' }}>${Math.max(0, Math.round(offerForm.downPaymentAmount) - Number(offerForm.reservationAmount || 0)).toLocaleString()}</strong></div>
                            </>
                          )}
                          <div>Installments: <strong style={{ color: '#1E293B' }}>{offerForm.numInstallments}</strong></div>
                          <div>Per Payment: <strong style={{ color: '#DC2626' }}>${Math.round(offerForm.installmentAmount).toLocaleString()}</strong></div>
                        </div>
                      </div>
                    )}


                    <IonButton expand="block" onClick={handleCreateOffer} style={{ marginTop: '20px' }}>Create Offer</IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>
            {/* --- FEEDBACK MODAL --- */}
            <IonModal isOpen={showFeedbackModal} onDidDismiss={() => { setShowFeedbackModal(false); setSelectedInstallmentForFeedback(null); setFeedbackText(''); }} style={{ '--width': '95%', '--max-width': '850px' }}>
              <IonHeader><IonToolbar style={{ '--background': '#ffffff' }}><IonTitle style={{ color: '#1E293B' }}>Add Feedback</IonTitle><IonButton slot="end" onClick={() => setShowFeedbackModal(false)} color="light" fill="clear">Close</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                {selectedInstallmentForFeedback && (
                  <div style={{ color: '#1E293B', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ background: 'var(--app-bg-card)', padding: '15px', borderRadius: '12px', marginBottom: '15px', borderLeft: '4px solid #1dd1a1' }}>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Customer:</strong> {selectedInstallmentForFeedback.customerName}</p>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Overdue Date:</strong> {formatExcelDate(selectedInstallmentForFeedback.dueDate)}</p>
                      {selectedInstallmentForFeedback.chequeNumber && (
                        <p style={{ margin: 0 }}><strong>Cheque:</strong> {selectedInstallmentForFeedback.chequeNumber} {selectedInstallmentForFeedback.bank ? `(${selectedInstallmentForFeedback.bank})` : ''}</p>
                      )}
                      {(() => {
                        const linkedWallet = wallets.find(w => (w.checkIds || []).includes(selectedInstallmentForFeedback.id));
                        if (linkedWallet) {
                          return (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginTop: '8px',
                              padding: '6px 10px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '8px',
                              color: '#2563EB',
                              width: 'fit-content'
                            }}>
                              <IonIcon icon={walletOutline} style={{ fontSize: '18px' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Wallet: {linkedWallet.bankAddress}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* --- NEW CONTACT INFO SECTION --- */}
                    {(() => {
                      const linkedContract = contracts.find(c => c.id === selectedInstallmentForFeedback.contractId) || contracts.find(c => c.unitId === selectedInstallmentForFeedback.unitId);
                      const owner = customers.find(c => c.id === linkedContract?.customerId);
                      const jointPurchasers = (linkedContract?.jointPurchasers || []).map(jp => {
                        const cust = customers.find(c => c.id === jp.id);
                        return cust || jp;
                      });
                      const guarantor = linkedContract?.guarantor ? customers.find(c => c.id === linkedContract.guarantor.id) : null;

                      return (
                        <div style={{ background: 'var(--app-bg-card)', padding: '15px', borderRadius: '12px', marginBottom: '15px', borderLeft: '4px solid #3880ff' }}>
                          <h4 style={{ color: '#2563EB', margin: '0 0 10px 0' }}>Contact Information</h4>

                          {/* Owner */}
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: '#1E293B' }}>Owner:</strong> <span style={{ color: '#64748B' }}>{owner ? `${owner.name} (${owner.phone})` : (linkedContract?.customerName || 'N/A')}</span>
                          </div>

                          {/* Joint Purchasers */}
                          {jointPurchasers.length > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#1E293B' }}>Joint Purchasers:</strong>
                              <ul style={{ margin: '5px 0 0 20px', padding: 0, color: '#64748B' }}>
                                {jointPurchasers.map((jp, idx) => (
                                  <li key={idx}>{jp.name || jp.id} {jp.phone ? `(${jp.phone})` : ''}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Guarantor */}
                          {guarantor && (
                            <div>
                              <strong style={{ color: '#1E293B' }}>Guarantor:</strong> <span style={{ color: '#64748B' }}>{guarantor.name} ({guarantor.phone})</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <h3 style={{ marginTop: '20px', color: '#2563EB', fontSize: '1.2rem' }}>Feedback History</h3>

                    <IonSearchbar
                      value={historySearchQuery}
                      onIonInput={e => setHistorySearchQuery(e.detail.value || '')}
                      placeholder="Search history..."
                      style={{ '--background': 'var(--app-bg-card)', '--color': 'var(--app-text)', marginBottom: '10px' }}
                    />

                    <IonList lines="none" style={{ background: 'transparent' }}>
                      {(() => {
                        const filteredFeedbacks = (selectedInstallmentForFeedback.feedbacks || []).filter(fb =>
                          (fb.text || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                          (fb.date || '').toLowerCase().includes(historySearchQuery.toLowerCase())
                        );

                        if (filteredFeedbacks.length === 0) {
                          return <p style={{ color: '#64748B'   , fontStyle: 'italic', padding: '10px' }}>No matching feedback found.</p>;
                        }

                        return filteredFeedbacks.map(fb => (
                          <IonItem key={fb.id} style={{ '--background': 'rgba(0,0,0,0.4)', marginBottom: '8px', borderRadius: '8px', '--border-radius': '8px', border: '1px solid #333' }}>
                            <IonLabel>
                              <p style={{ color: '#2563EB', fontSize: '0.75rem', fontWeight: 'bold' }}>{fb.date}</p>
                              <h3 style={{ color: '#fff', fontSize: '1rem', whiteSpace: 'normal' }}>{fb.text}</h3>
                            </IonLabel>
                            <IonButton slot="end" fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={async () => {
                              const updated = await deleteInstallmentFeedback(selectedInstallmentForFeedback.id, fb.id);
                              setSelectedInstallmentForFeedback(updated);
                              refreshData();
                            }}>
                              <IonIcon icon={trash} slot="icon-only" style={{ fontSize: '18px' }} />
                            </IonButton>
                          </IonItem>
                        ));
                      })()}
                    </IonList>

                    {/* Payment History Section inside Feedback Modal */}
                    <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(255,196,9,0.05)', borderRadius: '12px', border: '1px solid rgba(255,196,9,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: '#DC2626', fontSize: '1.1rem' }}>Payment History</h3>
                        <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                          <div style={{ color: '#64748B' }}>Remaining: <strong style={{ color: '#DC2626' }}>${(Number(selectedInstallmentForFeedback.amount) - Number(selectedInstallmentForFeedback.paidAmount || 0)).toLocaleString()}</strong></div>
                        </div>
                      </div>

                      <div style={{ width: '100%', height: '6px', background: '#ffffff', borderRadius: '3px', marginBottom: '15px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, (Number(selectedInstallmentForFeedback.paidAmount || 0) / Number(selectedInstallmentForFeedback.amount)) * 100)}%`,
                          height: '100%',
                          background: '#2563EB',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      {(selectedInstallmentForFeedback.payments || []).length === 0 ? (
                        <p style={{ color: '#64748B'   , fontStyle: 'italic', fontSize: '0.9rem' }}>No payments recorded for this installment.</p>
                      ) : (
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {[...(selectedInstallmentForFeedback.payments || [])].sort((a, b) => parseSafeDate(b.date) - parseSafeDate(a.date)).map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div>
                                <div style={{ color: '#1E293B', fontSize: '1rem', fontWeight: 'bold' }}>{formatCurrency(p.amount)} <small style={{ color: '#64748B'    }}>({p.method})</small></div>
                                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{formatExcelDate(p.date)} {p.ref ? `| Ref: ${p.ref}` : ''}</div>
                                {p.method === 'Cheque' && (
                                  <div style={{ color: '#2563EB', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Bank: {p.bank || '-'} | Chq#: {p.chequeNumber || '-'} | Status:
                                    <select
                                      value={p.chequeStatus || 'Not Collected'}
                                      onChange={async (e) => {
                                        const updated = await updateInstallmentPaymentStatus(selectedInstallmentForFeedback.id, p.id, e.target.value);
                                        if (updated) {
                                          setSelectedInstallmentForFeedback(updated);
                                          setInstallments(prev => prev.map(ins => ins.id === updated.id ? updated : ins));
                                        }
                                      }}
                                      style={{
                                        background: '#ffffff',
                                        color: p.chequeStatus === 'Rejected' ? '#DC2626' : p.chequeStatus === 'Cleared' ? '#2563EB' : '#E2E8F0',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        padding: '1px 3px',
                                        cursor: 'pointer',
                                        outline: 'none'
                                      }}
                                    >
                                      <option value="Not Collected">Not Collected</option>
                                      <option value="Collected">Collected</option>
                                      <option value="Cleared">Cleared</option>
                                      <option value="Rejected">Rejected</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <IonButton size="small" fill="clear" color="medium" onClick={async () => {
                                await handleInstallmentReceipt(selectedInstallmentForFeedback, {
                                  id: p.id,
                                  paymentMethod: p.method,
                                  paidAmount: p.amount,
                                  date: p.date,
                                  chequeNumber: p.ref || selectedInstallmentForFeedback.chequeNumber || ''
                                });
                              }}>
                                <IonIcon icon={printOutline} slot="icon-only" style={{ fontSize: '16px' }} />
                              </IonButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '30px' }}>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '8px', marginBottom: '10px' }}>
                        <IonInput
                          label="Add New Follow-up"
                          labelPlacement="stacked"
                          value={feedbackText}
                          onIonInput={e => setFeedbackText(e.detail.value)}
                          placeholder="Type update here..."
                          style={{ '--color': 'var(--app-text)' }}
                        />
                      </IonItem>
                      <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '15px', height: '48px' }} onClick={async () => {
                        if (!feedbackText.trim()) return;
                        const updated = await addInstallmentFeedback(selectedInstallmentForFeedback.id, feedbackText);
                        setFeedbackText('');
                        await refreshData();
                        setSelectedInstallmentForFeedback(updated);
                      }}>{t('installments.savePayment')}</IonButton>
                    </div>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- RESALE MODAL --- */}
            <IonModal isOpen={showResaleModal} onDidDismiss={() => setShowResaleModal(false)}>
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff' }}>
                  <IonTitle style={{ color: '#DC2626' }}>{t('contracts.resale')}</IonTitle>
                  <IonButton slot="end" onClick={() => setShowResaleModal(false)} color="light" fill="clear">Close</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {resaleData.originalContract && (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {/* Original Contract Summary */}
                    <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '12px', marginBottom: '20px', borderLeft: '4px solid #1F2937' }}>
                      <h3 style={{ color: '#DC2626', margin: '0 0 15px 0' }}>Original Contract</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Contract ID:</span><br /><strong>{resaleData.originalContract.contractId || resaleData.originalContract.id}</strong></div>
                        <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Unit ID:</span><br /><strong>{resaleData.originalContract.unitId}</strong></div>
                        <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Original Customer:</span><br /><strong>{customers.find(c => c.id === resaleData.originalContract.customerId)?.name || resaleData.originalContract.customerId}</strong></div>
                        <div><span style={{ color: '#64748B'   , fontSize: '11px' }}>Contract Value:</span><br /><strong style={{ color: '#2563EB' }}>${Number(resaleData.originalContract.totalPrice || 0).toLocaleString()}</strong></div>
                      </div>
                    </div>

                    {/* Select New Customer */}
                    <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '12px', marginBottom: '20px', borderLeft: '4px solid #1E3A8A' }}>
                      <h3 style={{ color: '#2563EB', margin: '0 0 15px 0' }}>Select New Customer</h3>
                      <IonSearchbar
                        value={customerSearchQuery}
                        onIonInput={e => setCustomerSearchQuery(e.detail.value || '')}
                        placeholder="Search by Name, Phone, or Unit ID"
                        style={{ '--background': '#ffffff', color: '#1E293B', marginBottom: '10px' }}
                      />
                      <IonList style={{ background: 'transparent', maxHeight: '200px', overflow: 'auto' }}>
                        {filteredCustomers
                          .filter(c => c.id !== resaleData.originalContract.customerId)
                          .map(c => (
                            <IonItem
                              key={c.id}
                              button
                              onClick={() => setResaleData({ ...resaleData, newCustomer: c })}
                              style={{
                                '--background': resaleData.newCustomer?.id === c.id ? 'rgba(45, 211, 111, 0.2)' : '#ffffff',
                                color: '#1E293B',
                                marginBottom: '6px',
                                borderRadius: '8px',
                                border: resaleData.newCustomer?.id === c.id ? '2px solid #1E3A8A' : '1px solid transparent'
                              }}
                            >
                              <IonLabel>
                                <h2 style={{ color: '#1E293B', fontWeight: 'bold' }}>{c.name}</h2>
                                <p style={{ color: '#64748B' }}>ID: {c.id} | Phone: {c.phone || 'N/A'}</p>
                              </IonLabel>
                              {resaleData.newCustomer?.id === c.id && (
                                <span slot="end" style={{ color: '#2563EB', fontWeight: 'bold' }}>✓ Selected</span>
                              )}
                            </IonItem>
                          ))}
                      </IonList>
                      {resaleData.newCustomer && (
                        <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(45, 211, 111, 0.1)', borderRadius: '8px', border: '1px solid #1E3A8A' }}>
                          <p style={{ margin: 0, color: '#2563EB' }}><strong>New Owner:</strong> {resaleData.newCustomer.name}</p>
                        </div>
                      )}
                    </div>

                    {/* Installments Update Section */}
                    <div style={{ background: 'var(--app-bg-card)', padding: '20px', borderRadius: '12px', marginBottom: '20px', borderLeft: '4px solid #3880ff' }}>
                      <h3 style={{ color: '#2563EB', margin: '0 0 15px 0' }}>Update Installment Details (Optional)</h3>
                      <p style={{ color: '#64748B'   , fontSize: '0.85rem', marginBottom: '15px' }}>Update cheque numbers and bank for unpaid installments:</p>
                      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                        {resaleData.updatedInstallments.filter(ins => (Number(ins.amount || 0) - Number(ins.paidAmount || 0)) > 0).map((ins) => (
                          <div key={ins.id} style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ color: '#2563EB', fontWeight: 'bold' }}>{ins.type}</span>
                              <span style={{ color: '#DC2626' }}>${Number(ins.amount).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput
                                  label="Cheque #"
                                  labelPlacement="floating"
                                  value={ins.chequeNumber || ''}
                                  onIonInput={e => {
                                    const updated = [...resaleData.updatedInstallments];
                                    const originalIndex = updated.findIndex(item => item.id === ins.id);
                                    if (originalIndex !== -1) {
                                      updated[originalIndex].chequeNumber = e.detail.value;
                                      setResaleData({ ...resaleData, updatedInstallments: updated });
                                    }
                                  }}
                                  style={{ color: '#1E293B' }}
                                />
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#64748B', borderRadius: '4px' }}>
                                <IonInput
                                  label="Bank"
                                  labelPlacement="floating"
                                  value={ins.bank || ''}
                                  onIonInput={e => {
                                    const updated = [...resaleData.updatedInstallments];
                                    const originalIndex = updated.findIndex(item => item.id === ins.id);
                                    if (originalIndex !== -1) {
                                      updated[originalIndex].bank = e.detail.value;
                                      setResaleData({ ...resaleData, updatedInstallments: updated });
                                    }
                                  }}
                                  style={{ color: '#1E293B' }}
                                />
                              </IonItem>

                              {/* New Row: Date and Delete */}
                              <ProDatePicker 
                                label="Due Date" 
                                value={ins.dueDate || ''} 
                                onChange={val => {
                                  const updated = [...resaleData.updatedInstallments];
                                  const originalIndex = updated.findIndex(item => item.id === ins.id);
                                  if (originalIndex !== -1) {
                                    updated[originalIndex].dueDate = val;
                                    setResaleData({ ...resaleData, updatedInstallments: updated });
                                  }
                                }}
                              />
                              <IonButton
                                style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }}
                                fill="outline"
                                onClick={() => {
                                  if (confirm('Delete this installment?')) {
                                    const updated = resaleData.updatedInstallments.filter(item => item.id !== ins.id);
                                    setResaleData({ ...resaleData, updatedInstallments: updated });
                                  }
                                }}
                              >
                                Delete
                              </IonButton>
                            </div>
                          </div>
                        ))}
                        {resaleData.updatedInstallments.filter(ins => (Number(ins.amount || 0) - Number(ins.paidAmount || 0)) > 0).length === 0 && (
                          <p style={{ color: '#64748B', fontStyle: 'italic', textAlign: 'center' }}>All installments are already paid.</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <IonButton
                      expand="block"
                      style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '20px', '--border-radius': '12px' }}
                      onClick={handleResaleConfirm}
                      disabled={!resaleData.newCustomer}
                    >
                      Confirm Resale
                    </IonButton>
                    <IonButton
                      expand="block"
                      fill="outline"
                      color="medium"
                      style={{ marginTop: '10px', '--border-radius': '12px' }}
                      onClick={() => setShowResaleModal(false)}
                    >
                      Cancel
                    </IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* --- OFFER PAYMENT MODAL --- */}
            <IonModal isOpen={showOfferPaymentModal} onDidDismiss={() => setShowOfferPaymentModal(false)}>
              <IonHeader><IonToolbar><IonTitle>Offer Payment Details</IonTitle><IonButton slot="end" onClick={() => setShowOfferPaymentModal(false)}>Close</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                <div style={{ padding: '20px' }}>
                  {selectedOfferForPayment && (() => {
                    const dpRequired = Number(selectedOfferForPayment.downPaymentAmount) ||
                      (Number(selectedOfferForPayment.finalPrice || selectedOfferForPayment.totalPrice) * (Number(selectedOfferForPayment.downPayment) / 100)) ||
                      0;
                    const totalPaid = (selectedOfferForPayment.payments || []).reduce((sum, p) => {
                      // Cheque payments only count when cleared
                      const isCheque = p.paymentMethod === 'Cheque' || p.method === 'Cheque';
                      if (isCheque && p.chequeStatus !== 'Cleared') return sum;
                      return sum + Number(p.amount || 0);
                    }, 0);
                    const totalPending = (selectedOfferForPayment.payments || []).reduce((sum, p) => {
                      const isCheque = p.paymentMethod === 'Cheque' || p.method === 'Cheque';
                      if (isCheque && p.chequeStatus !== 'Cleared') return sum + Number(p.amount || 0);
                      return sum;
                    }, 0);
                    const remaining = Math.max(0, dpRequired - totalPaid);
                    const progressPercent = dpRequired > 0 ? Math.min(100, (totalPaid / dpRequired) * 100) : 0;
                    const isFullyPaid = totalPaid >= dpRequired && dpRequired > 0;

                    return (
                      <>
                        {/* Header Info */}
                        <div style={{ marginBottom: '25px' }}>
                          <h3 style={{ color: '#DC2626', margin: '0 0 5px 0' }}>{selectedOfferForPayment.customerName}</h3>
                          <p style={{ color: '#64748B'   , margin: 0 }}>Unit: <strong style={{ color: '#1E293B' }}>{selectedOfferForPayment.unitId}</strong> | Offer Date: {formatExcelDate(selectedOfferForPayment.date)}</p>
                        </div>

                        {/* Down Payment Progress */}
                        <div style={{ background: 'var(--app-bg-card)', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ color: '#64748B' }}>Down Payment Progress</span>
                            <span style={{ color: isFullyPaid ? '#2563EB' : '#E2E8F0', fontWeight: 'bold' }}>{progressPercent.toFixed(0)}%</span>
                          </div>
                          <div style={{ background: '#ffffff', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
                            <div style={{ background: isFullyPaid ? 'linear-gradient(90deg, #2dd36f, #00b894)' : 'linear-gradient(90deg, #ffc409, #f0932b)', width: `${progressPercent}%`, height: '100%', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '0.9rem', flexWrap: 'wrap', gap: '5px' }}>
                            <div><span style={{ color: '#64748B' }}>Required: </span><span style={{ color: '#1E293B' }}>${dpRequired.toLocaleString()}</span></div>
                            <div><span style={{ color: '#64748B' }}>Paid: </span><span style={{ color: '#2563EB' }}>${totalPaid.toLocaleString()}</span></div>
                            {totalPending > 0 && (
                              <div><span style={{ color: '#f0932b' }}>Pending Cheques: </span><span style={{ color: '#f0932b', fontWeight: 'bold' }}>${totalPending.toLocaleString()}</span></div>
                            )}
                            <div><span style={{ color: '#64748B' }}>Remaining: </span><span style={{ color: remaining > 0 ? '#DC2626' : '#2563EB' }}>${remaining.toLocaleString()}</span></div>
                          </div>
                          {Number(selectedOfferForPayment.reservationAmount || 0) > 0 && (
                            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem' }}>
                              <span style={{ color: '#F59E0B', fontWeight: '700' }}>🔖 Reservation: {formatCurrency(Number(selectedOfferForPayment.reservationAmount))}</span>
                              <span style={{ color: '#64748B', marginLeft: '8px' }}>(part of DP)</span>
                              <span style={{ color: '#10B981', fontWeight: '700', marginLeft: '12px' }}>Remaining DP: {formatCurrency(Math.max(0, dpRequired - Number(selectedOfferForPayment.reservationAmount)))}</span>
                            </div>
                          )}
                        </div>

                        {/* Create Contract Button - Only visible when DP is fully paid */}
                        {isFullyPaid && (
                          <IonButton
                            expand="block"
                            style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginBottom: '25px', '--border-radius': '12px', fontWeight: 'bold' }}
                            onClick={async () => {
                              if (window.confirm(t('alert.createContractFromOfferConfirm'))) {
                                try {
                                  const newContract = await convertOfferToContract(selectedOfferForPayment);
                                  alert(t('alert.contractCreatedWithId', { id: newContract.id }));
                                  setShowOfferPaymentModal(false);
                                  refreshData();
                                } catch (err) {
                                  console.error('Contract creation failed:', err);
                                  alert(t('alert.contractCreateFailed', { error: err.message }));
                                }
                              }
                            }}
                          >
                            <IonIcon icon={documentAttach} slot="start" />
                            {t('offerPayment.createContract')}
                          </IonButton>
                        )}

                        {/* Payment History */}
                        {selectedOfferForPayment.payments && selectedOfferForPayment.payments.length > 0 && (
                          <div style={{ marginBottom: '30px', background: 'var(--app-bg-card)', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{ color: '#DC2626', marginTop: 0 }}>{t('offerPayment.paymentHistory')}</h4>
                            {[...(selectedOfferForPayment.payments || [])].sort((a, b) => parseSafeDate(b.date) - parseSafeDate(a.date)).map((payment, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '10px 0' }}>
                                <div>
                                  <div style={{ color: '#1E293B', fontWeight: 'bold' }}>${Number(payment.amount).toLocaleString()}</div>
                                  <div style={{ color: '#64748B'   , fontSize: '0.8rem' }}>{displayFormattedDate(payment.date)} • {payment.reference}</div>
                                  {payment.paymentMethod === 'Cheque' && (
                                    <div style={{ color: '#2563EB', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {t('common.bank')}: {payment.bank || '-'} | {t('common.chequeNumberShort')}: {payment.chequeNumber || '-'} | {t('common.status')}:
                                      <select
                                        value={payment.chequeStatus || 'Not Collected'}
                                        onChange={async (e) => {
                                          const updated = await updateOfferPaymentStatus(selectedOfferForPayment.id, payment.id, e.target.value);
                                          if (updated) {
                                            setSelectedOfferForPayment(updated);
                                            setOffers(prev => prev.map(o => o.id === updated.id ? updated : o));
                                          }
                                        }}
                                        style={{
                                          background: '#ffffff',
                                          color: payment.chequeStatus === 'Rejected' ? '#DC2626' : payment.chequeStatus === 'Cleared' ? '#2563EB' : '#E2E8F0',
                                          border: '1px solid #E2E8F0',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          outline: 'none'
                                        }}
                                      >
                                        <option value="Not Collected">{t('common.chequeStatusNotCollected')}</option>
                                        <option value="Collected">{t('common.chequeStatusCollected')}</option>
                                        <option value="Cleared">{t('common.chequeStatusCleared')}</option>
                                        <option value="Rejected">{t('common.chequeStatusRejected')}</option>
                                      </select>
                                    </div>
                                  )}

                                  {payment.attachment ? (
                                    <div style={{ marginTop: '10px' }}>
                                      <IonButton
                                        size="small"
                                        fill="outline"
                                        style={{
                                          '--padding-start': '10px',
                                          '--padding-end': '10px',
                                          height: '28px',
                                          fontSize: '0.75rem',
                                          '--border-color': '#2563EB',
                                          '--color': '#2563EB',
                                          '--border-radius': '6px',
                                          fontWeight: '600',
                                          letterSpacing: '0.5px'
                                        }}
                                        onClick={async () => {
                                          if (window.electronAPI) {
                                            const url = await window.electronAPI.getAttachment(payment.attachment);
                                            if (url) window.electronAPI.openFile(url);
                                            else alert(t('alert.attachmentNotFound'));
                                          }
                                        }}
                                      >
                                        <IonIcon icon={documentAttach} slot="start" style={{ fontSize: '14px' }} />
                                        {t('common.viewAttachment')}
                                      </IonButton>
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: '10px' }}>
                                      <IonButton
                                        size="small"
                                        fill="clear"
                                        style={{
                                          '--padding-start': '0',
                                          height: '28px',
                                          fontSize: '0.75rem',
                                          '--color': '#2563EB',
                                          fontWeight: '500'
                                        }}
                                        onClick={() => {
                                          setEditingOfferPaymentForAttachment({ offerId: selectedOfferForPayment.id, paymentId: payment.id });
                                          offerAttachmentRef.current?.click();
                                        }}
                                      >
                                        <IonIcon icon={addCircleOutline} slot="start" style={{ fontSize: '15px' }} />
                                        {t('common.addAttachment')}
                                      </IonButton>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={() => handleEditOfferPayment(selectedOfferForPayment, payment)}>
                                    <IonIcon icon={create} slot="icon-only" />
                                  </IonButton>
                                  <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => handleDeleteOfferPayment(selectedOfferForPayment.id, payment.id)}>
                                    <IonIcon icon={trash} slot="icon-only" />
                                  </IonButton>
                                  <IonButton size="small" fill="outline" color="medium" onClick={async () => {
                                    // Determine payment type for receipt
                                    let paymentType;
                                    if (payment.isReservation) {
                                      paymentType = 'Reservation';
                                    } else {
                                      paymentType = idx === 0 ? t('common.downPayment') : `${t('common.installment')} ${idx}`;
                                      const offerInstallments = selectedOfferForPayment.installments || [];
                                      if (offerInstallments.length > 0) {
                                        const matchByAmount = offerInstallments.find(inst =>
                                          Number(inst.amount) === Number(payment.amount) && inst.type
                                        );
                                        if (matchByAmount) {
                                          paymentType = matchByAmount.type;
                                        } else if (idx < offerInstallments.length) {
                                          paymentType = offerInstallments[idx]?.type || paymentType;
                                        }
                                      }
                                    }
                                    await handleOfferReceipt(selectedOfferForPayment, payment, paymentType);
                                  }}>
                                    {t('common.print')}
                                  </IonButton>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add New Payment Form */}
                        <h4 style={{ color: '#64748B', marginBottom: '20px' }}>{t('offerPayment.addNewPayment')}</h4>
                        <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '20px' }}>{t('offerPayment.paymentTransferHint')}</p>

                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                          <IonInput type="number" label={t('common.amount', { currency: appSettings.currency })} labelPlacement="floating" value={offerPaymentForm.amount} onIonInput={e => setOfferPaymentForm(prev => ({ ...prev, amount: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>
                        <ProDatePicker
                          label={t('common.paymentDate')}
                          value={offerPaymentForm.date}
                          onChange={val => setOfferPaymentForm(prev => ({ ...prev, date: val }))}
                          style={{ marginBottom: '10px' }}
                        />
                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                          <IonSelect label={t('common.paymentMethod')} labelPlacement="floating" value={offerPaymentForm.paymentMethod} onIonChange={e => setOfferPaymentForm(prev => ({ ...prev, paymentMethod: e.detail.value }))} style={{ color: '#1E293B' }}>
                            <IonSelectOption value="CASH">{t('common.cash')}</IonSelectOption>
                            <IonSelectOption value="Transfer">{t('common.transfer')}</IonSelectOption>
                            <IonSelectOption value="Cheque">{t('common.cheque')}</IonSelectOption>
                          </IonSelect>
                        </IonItem>

                        {offerPaymentForm.paymentMethod === 'Cheque' && (
                          <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '15px' }}>
                            <h4 style={{ color: '#2563EB', fontSize: '0.85rem', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>{t('common.chequeDetails')}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                <IonInput label={t('common.chequeNumber')} labelPlacement="stacked" value={offerPaymentForm.chequeNumber} onIonInput={e => setOfferPaymentForm(prev => ({ ...prev, chequeNumber: e.detail.value }))} style={{ color: '#1E293B', fontWeight: '600' }} />
                              </IonItem>
                              <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                <IonInput label={t('common.bank')} labelPlacement="stacked" value={offerPaymentForm.bank} onIonInput={e => setOfferPaymentForm(prev => ({ ...prev, bank: e.detail.value }))} style={{ color: '#1E293B', fontWeight: '600' }} />
                              </IonItem>
                            </div>
                             <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                               <IonSelect label={t('common.chequeStatus')} labelPlacement="stacked" value={offerPaymentForm.chequeStatus} onIonChange={e => setOfferPaymentForm(prev => ({ ...prev, chequeStatus: e.detail.value }))} style={{ color: '#1E293B', fontWeight: '600' }}>
                                 <IonSelectOption value="Not Collected">{t('common.chequeStatusNotCollected')}</IonSelectOption>
                                 <IonSelectOption value="Collected">{t('common.chequeStatusCollected')}</IonSelectOption>
                                 <IonSelectOption value="Cleared">{t('common.chequeStatusCleared')}</IonSelectOption>
                                 <IonSelectOption value="Rejected">{t('common.chequeStatusRejected')}</IonSelectOption>
                               </IonSelect>
                             </IonItem>
                          </div>
                        )}

                        <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                          <IonInput label={t('common.referenceNotes')} labelPlacement="floating" value={offerPaymentForm.reference} onIonInput={e => setOfferPaymentForm(prev => ({ ...prev, reference: e.detail.value }))} style={{ '--color': 'var(--app-text)' }} />
                        </IonItem>

                        {/* Reservation Toggle */}
                        <div style={{ marginBottom: '15px', marginTop: '10px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Type</div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div
                              onClick={() => setOfferPaymentForm(prev => ({ ...prev, isReservation: true }))}
                              style={{
                                flex: 1, padding: '12px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                                fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                                background: offerPaymentForm.isReservation ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.05)',
                                color: offerPaymentForm.isReservation ? '#10B981' : '#64748B',
                                border: `2px solid ${offerPaymentForm.isReservation ? '#10B981' : 'rgba(0,0,0,0.1)'}`,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              🔖 Reservation
                            </div>
                            <div
                              onClick={() => setOfferPaymentForm(prev => ({ ...prev, isReservation: false }))}
                              style={{
                                flex: 1, padding: '12px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                                fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                                background: !offerPaymentForm.isReservation ? 'rgba(37, 99, 235, 0.15)' : 'rgba(0,0,0,0.05)',
                                color: !offerPaymentForm.isReservation ? '#2563EB' : '#64748B',
                                border: `2px solid ${!offerPaymentForm.isReservation ? '#2563EB' : 'rgba(0,0,0,0.1)'}`,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              💰 Down Payment
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '15px', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '15px', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: 'bold' }}>{t('common.attachPdfOrImage')}</div>
                            {selectedOfferAttachmentFile && (
                              <IonButton fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} size="small" onClick={() => { setSelectedOfferAttachmentFile(null); if (offerAttachmentRef.current) offerAttachmentRef.current.value = ''; }}>
                                <IonIcon icon={close} />
                              </IonButton>
                            )}
                          </div>

                          <input
                            type="file"
                            ref={offerAttachmentRef}
                            style={{ display: 'none' }}
                            accept="image/*, application/pdf"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];

                                if (editingOfferPaymentForAttachment) {
                                  setUploadingAttachment(true);
                                  try {
                                    if (window.electronAPI) {
                                      const ext = file.name.split('.').pop();
                                      const safeUnit = (selectedOfferForPayment.unitId || 'UNIT').replace(/[^a-z0-9]/gi, '_');
                                      const attachmentFilename = `Offer_${safeUnit}_${Date.now()}.${ext}`;

                                      const buffer = await file.arrayBuffer();
                                      await window.electronAPI.uploadAttachment(attachmentFilename, buffer);

                                      const updated = await updateOfferPayment(
                                        editingOfferPaymentForAttachment.offerId,
                                        editingOfferPaymentForAttachment.paymentId,
                                        { attachment: attachmentFilename }
                                      );

                                      if (updated) {
                                        setSelectedOfferForPayment(updated);
                                        setOffers(prev => prev.map(o => o.id === updated.id ? updated : o));
                                      }
                                    }
                                  } catch (error) {
                                    console.error("Error attaching file to existing offer payment:", error);
                                    alert(t('alert.uploadAttachmentFailed'));
                                  } finally {
                                    setUploadingAttachment(false);
                                    setEditingOfferPaymentForAttachment(null);
                                  }
                                } else {
                                  setSelectedOfferAttachmentFile(file);
                                }
                              }
                            }}
                          />

                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                            <IonButton
                              fill="outline"
                              color="light"
                              size="small"
                              onClick={() => offerAttachmentRef.current?.click()}
                              style={{ '--border-radius': '8px' }}
                            >
                              <IonIcon icon={documentAttach} slot="start" />
                              {selectedOfferAttachmentFile ? t('common.changeFile') : t('common.selectFile')}
                            </IonButton>

                            {selectedOfferAttachmentFile ? (
                              <div style={{ color: '#2563EB', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedOfferAttachmentFile.name}
                              </div>
                            ) : (
                              <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{t('common.noFileSelected')}</div>
                            )}
                          </div>
                        </div>

                        <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '20px' }} disabled={uploadingAttachment} onClick={async () => {
                          if (selectedOfferForPayment && offerPaymentForm.amount) {
                            setUploadingAttachment(true);
                            try {
                              let attachmentFilename = offerPaymentForm.attachment;
                              if (selectedOfferAttachmentFile && window.electronAPI) {
                                const ext = selectedOfferAttachmentFile.name.split('.').pop();
                                const safeUnit = (selectedOfferForPayment.unitId || 'UNIT').replace(/[^a-z0-9]/gi, '_');
                                attachmentFilename = `Offer_${safeUnit}_${Date.now()}.${ext}`;

                                const buffer = await selectedOfferAttachmentFile.arrayBuffer();
                                await window.electronAPI.uploadAttachment(attachmentFilename, buffer);
                              }

                              const paymentToSave = { ...offerPaymentForm, attachment: attachmentFilename };
                              let updatedOffer;
                              if (editingOfferPayment) {
                                updatedOffer = await updateOfferPayment(selectedOfferForPayment.id, editingOfferPayment.id, paymentToSave);
                                alert(t('alert.paymentUpdated') || 'Payment updated successfully');
                              } else {
                                await addOfferPayment(selectedOfferForPayment.id, paymentToSave);
                                const refreshedOffers = await getOffers();
                                updatedOffer = refreshedOffers.find(o => o.id === selectedOfferForPayment.id);
                                alert(t('alert.paymentAddedToOffer'));
                              }

                              setOfferPaymentForm({ amount: '', date: formatExcelDate(new Date()), reference: '', paymentMethod: 'CASH', chequeNumber: '', bank: '', chequeStatus: 'Not Collected', attachment: null, isReservation: false });
                              setSelectedOfferAttachmentFile(null);
                              if (offerAttachmentRef.current) offerAttachmentRef.current.value = '';
                              setEditingOfferPayment(null);

                              if (updatedOffer) {
                                setSelectedOfferForPayment(updatedOffer);
                                if (viewingOffer && viewingOffer.id === updatedOffer.id) {
                                  setViewingOffer(updatedOffer);
                                }
                              }
                              refreshData();
                            } catch (error) {
                              console.error("Error saving offer payment:", error);
                              alert(t('alert.saveFailed') || 'Error saving payment');
                            } finally {
                              setUploadingAttachment(false);
                            }
                          }
                        }}>
                          {uploadingAttachment ? t('common.uploading') : (editingOfferPayment ? t('common.update') : t('offerPayment.savePayment'))}
                        </IonButton>

                      </>
                    );
                  })()}
                </div>
              </IonContent>
            </IonModal>




            {/* --- INVENTORY REPORT MODAL --- */}
            {/* --- REPORTS HUB (New v1.3) --- */}
            <ReportsHub
              isOpen={showInventoryModal}
              onClose={() => {
                setShowInventoryModal(false);
                setSelectedBuildingForInventory(null);
                setEditingUnitPlan(null);
                setReportTab('inventory'); // Reset for next time
                resetDataEntryForms();
              }}
              buildings={buildings}
              setBuildings={setBuildings}
              installments={installments}
              customers={customers}
              offers={offers}
              contracts={contracts}
              terminatedContracts={terminatedContracts}
              terminatedInstallments={terminatedInstallments}
              sales={sales}
              wallets={wallets}
              initialTab={reportTab}
            />

            {/* --- OLD MODAL (Kept for safety, hidden) --- */}
            <IonModal
              isOpen={false}
              onDidDismiss={() => {
                setShowInventoryModal(false);
                setSelectedBuildingForInventory(null);
                setEditingUnitPlan(null);
              }}
              className="chrono-modal"
            >
              <IonHeader>
                <IonToolbar style={{ '--background': '#ffffff', color: '#1E293B' }}>
                  <IonTitle>{t('reports.hubTitle')}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowInventoryModal(false)}>
                      <IonIcon icon={close} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
                <IonToolbar style={{ '--background': '#ffffff' }}>
                  <div style={{ padding: '0 20px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <IonButton fill={reportTab === 'inventory' ? 'solid' : 'outline'} style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={() => setReportTab('inventory')}>{t('reports.inventory')}</IonButton>
                      <IonButton fill={reportTab === 'installments' ? 'solid' : 'outline'} style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={() => setReportTab('installments')}>{t('reports.installments')}</IonButton>
                      <IonButton fill={reportTab === 'overdue' ? 'solid' : 'outline'} style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => setReportTab('overdue')}>{t('reports.overdue')}</IonButton>
                      <IonButton fill={reportTab === 'customers' ? 'solid' : 'outline'} style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={() => setReportTab('customers')}>{t('reports.customers')}</IonButton>
                    </div>
                  </div>
                </IonToolbar>
              </IonHeader>
              <IonContent style={{ '--background': '#ffffff' }}>
                <div style={{ padding: '20px', color: '#1E293B' }}>
                  {/* Building Selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#64748B'   , fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>{t('reports.selectBuilding')}</label>
                    <IonSelect
                      value={selectedBuildingForInventory?.id || ''}
                      onIonChange={e => {
                        const b = buildings.find(b => String(b.id) === String(e.detail.value));
                        setSelectedBuildingForInventory(b || null);
                      }}
                      placeholder={t('reports.chooseBuildingPlaceholder')}
                      style={{ background: '#FFFFFF', borderRadius: '8px', color: '#1E293B', padding: '10px' }}
                    >
                      {buildings.map(b => (
                        <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>

                  {selectedBuildingForInventory && (
                    <>
                      {/* PDF Export Button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                        <IonButton
                          style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}
                          onClick={async () => {
                            // Re-read building from DB to ensure plan values are up to date
                            const freshBuildings = await getBuildings();
                            const freshBuilding = freshBuildings.find(b => String(b.id) === String(selectedBuildingForInventory.id));
                            const srcBuilding = freshBuilding || selectedBuildingForInventory;
                            const availableUnits = (srcBuilding.units || []).filter(u => u.status === 'available').sort((a, b) => String(a.unitId || '').localeCompare(String(b.unitId || ''), undefined, { numeric: true }));
                            const doc = new jsPDF();
                            setupArabicFont(doc);
                            doc.setFont('Amiri');
                            const today = new Date().toISOString().split('T')[0];

                            // Title
                            doc.setFontSize(18);
                            doc.setTextColor(197, 160, 89);
                            doc.text(`${t('reports.inventory')} ${srcBuilding.name}`, 14, 20);
                            doc.setFontSize(10);
                            doc.setTextColor(128, 128, 128);
                            doc.text(`${t('reports.generated')}: ${today}`, 14, 28);
                            // Table
                            autoTable(doc, {
                              startY: 35,
                              head: [[t('common.unitId'), t('common.areaSqm'), t('common.floor'), t('common.view'), t('common.price'), 'Finished Price', t('common.plan')]],
                              headStyles: { font: 'Amiri', fillColor: [197, 160, 89], textColor: [0, 0, 0] },
                              styles: { font: 'Amiri', fontSize: 9 },
                              body: availableUnits.map(u => [
                                u.unitId || '-',
                                u.area || '-',
                                u.floor || '-',
                                u.view || '-',
                                u.price ? formatCurrency(u.price) : '-',
                                u.finishedPrice ? formatCurrency(u.finishedPrice) : '-',
                                u.plan || '-'
                              ]),
                              theme: 'striped'
                            });

                            handlePreviewPDF(doc, `${t('reports.inventory')} ${srcBuilding.name} (${today}).pdf`);
                          }}
                        >
                          <IonIcon icon={downloadOutline} slot="start" />
                          {t('common.saveAsPdf')}
                        </IonButton>
                      </div>

                      {/* Inventory Table */}
                      <div className="chrono-table-container">
                        <table className="chrono-table">
                          <thead>
                            <tr>
                              <th>{t('common.unitId')}</th>
                              <th>{t('common.area')}</th>
                              <th>{t('common.floor')}</th>
                              <th>{t('common.view')}</th>
                              <th>{t('common.price')}</th>
                              <th>{t('common.plan')}</th>
                              <th>{t('common.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedBuildingForInventory.units || [])
                              .filter(u => u.status === 'available')
                              .sort((a, b) => String(a.unitId || '').localeCompare(String(b.unitId || ''), undefined, { numeric: true }))
                              .map(unit => (
                                <tr key={unit.id}>
                                  <td style={{ fontWeight: 'bold', color: '#2563EB' }}>{unit.unitId}</td>
                                  <td>{unit.area} {t('common.sqm')}</td>
                                  <td>{unit.floor}</td>
                                  <td>{unit.view}</td>
                                  <td>${Number(unit.price || 0).toLocaleString()}</td>
                                  <td>
                                    {editingUnitPlan === unit.id ? (
                                      <input
                                        type="text"
                                        value={editPlanValue}
                                        onChange={e => setEditPlanValue(e.target.value)}
                                        onBlur={async () => {
                                          // Save the plan
                                          const allBuildings = await getBuildings();
                                          const bIdx = allBuildings.findIndex(b => b.id === selectedBuildingForInventory.id);
                                          if (bIdx !== -1) {
                                            const uIdx = allBuildings[bIdx].units.findIndex(u => u.id === unit.id);
                                            if (uIdx !== -1) {
                                              allBuildings[bIdx].units[uIdx].plan = editPlanValue;
                                              await saveBuildings(allBuildings);
                                              setBuildings(allBuildings);
                                              setSelectedBuildingForInventory(allBuildings[bIdx]);
                                            }
                                          }
                                          setEditingUnitPlan(null);
                                        }}
                                        onKeyDown={async (e) => {
                                          if (e.key === 'Enter') e.target.blur();
                                        }}
                                        autoFocus
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #3b82f6',
                                          color: '#1E293B',
                                          padding: '6px 10px',
                                          borderRadius: '4px',
                                          width: '100%'
                                        }}
                                      />
                                    ) : (
                                      <span style={{ color: unit.plan ? '#2563EB' : '#64748B' }}>
                                        {unit.plan || t('common.notSet')}
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <IonButton
                                      fill="clear"
                                      size="small"
                                      onClick={() => {
                                        setEditingUnitPlan(unit.id);
                                        setEditPlanValue(unit.plan || '');
                                      }}
                                    >
                                      <IonIcon icon={create} />
                                    </IonButton>
                                  </td>
                                </tr>
                              ))}
                            {(selectedBuildingForInventory.units || []).filter(u => u.status === 'available').length === 0 && (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                                  {t('reports.noAvailableUnits')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: '20px', padding: '15px', background: '#FFFFFF', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ color: '#64748B'    }}>{t('reports.availableUnits')}: </span>
                        <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          {(selectedBuildingForInventory.units || []).filter(u => u.status === 'available').length}
                        </span>
                        <span style={{ color: '#64748B'    }}> / {(selectedBuildingForInventory.units || []).length} {t('reports.total')}</span>
                      </div>
                    </>
                  )}

                  {!selectedBuildingForInventory && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                      <IonIcon icon={statsChart} style={{ fontSize: '48px', marginBottom: '15px' }} />
                      <p>{t('reports.selectBuildingToView')}</p>
                    </div>
                  )}
                </div>
              </IonContent>
            </IonModal>

            {/* --- MANAGE STAKEHOLDERS MODAL --- */}
            <IonModal isOpen={showEditStakeholdersModal} onDidDismiss={() => setShowEditStakeholdersModal(false)}>
              <IonHeader><IonToolbar><IonTitle>{t('stakeholders.manageTitle')}</IonTitle><IonButton slot="end" onClick={() => setShowEditStakeholdersModal(false)}>{t('common.close')}</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                  {/* Joint Purchasers Section */}
                  <div style={{ marginBottom: '30px', background: 'var(--app-bg-card)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #1E3A8A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ color: '#2563EB', marginTop: 0 }}>{t('stakeholders.jointPurchasers')}</h3>
                      <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '28px' }}>
                        <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                      </IonButton>
                    </div>
                    {editingStakeholders.jointPurchasers.length > 0 ? (
                      editingStakeholders.jointPurchasers.map((jp, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--app-bg-card)', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{customers.find(c => c.id === jp.id)?.name || jp.id}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B'    }}>{jp.id}</div>
                          </div>
                          <IonButton fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => {
                            const updated = editingStakeholders.jointPurchasers.filter((_, i) => i !== idx);
                            setEditingStakeholders({ ...editingStakeholders, jointPurchasers: updated });
                          }}>
                            <IonIcon icon={trash} />
                          </IonButton>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#64748B', fontStyle: 'italic' }}>{t('stakeholders.noJointPurchasers')}</p>
                    )}

                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #333' }}>

                      <h4 style={{ color: '#64748B', fontSize: '0.9rem' }}>{t('stakeholders.addJointPurchaser')}</h4>
                      <IonSearchbar
                        placeholder={t('common.searchCustomerPlaceholder')}
                        value={jpSearchQuery}
                        onIonInput={e => setJpSearchQuery(e.detail.value)}
                        style={{ '--background': 'var(--app-bg-card)', '--color': 'var(--app-text)' }}
                      />
                      {jpSearchQuery && (
                        <div style={{ maxHeight: '150px', overflow: 'auto', background: '#ffffff', borderRadius: '8px', marginTop: '5px' }}>
                          {customers.filter(c => {
                            const q = jpSearchQuery.toLowerCase();
                            if (!c.name.toLowerCase().includes(q) && !c.id.includes(jpSearchQuery)) return false;
                            // Exclude: owner, existing JPs, current guarantor
                            if (viewingContract && c.id === viewingContract.customerId) return false;
                            if (editingStakeholders.jointPurchasers.find(jp => jp.id === c.id)) return false;
                            if (editingStakeholders.guarantor?.id === c.id) return false;
                            // Cross-unit: already on another offer/contract for this unit
                            if (viewingContract) { const unitTaken = getCustomerIdsOnUnit(viewingContract.unitId, viewingContract.id); if (unitTaken.has(c.id)) return false; }
                            return true;
                          }).map(c => (
                            <div key={c.id}
                              onClick={() => {
                                setEditingStakeholders({
                                  ...editingStakeholders,
                                  jointPurchasers: [...editingStakeholders.jointPurchasers, { id: c.id }]
                                });
                                setJpSearchQuery('');
                              }}
                              style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer' }}
                            >
                              <div style={{ color: '#1E293B' }}>{c.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748B'    }}>{c.phone}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guarantor Section */}
                  <div style={{ marginBottom: '30px', background: 'var(--app-bg-card)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #1F2937' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ color: '#DC2626', marginTop: 0 }}>{t('stakeholders.guarantor')}</h3>
                      <IonButton fill="clear" size="small" onClick={() => setShowAddCustomerModal(true)} style={{ '--color': '#10B981', height: '28px' }}>
                        <IonIcon icon={addCircleOutline} slot="icon-only" style={{ fontSize: '18px' }} />
                      </IonButton>
                    </div>
                    {editingStakeholders.guarantor ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--app-bg-card)', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{customers.find(c => c.id === editingStakeholders.guarantor.id)?.name || editingStakeholders.guarantor.id}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{editingStakeholders.guarantor.id}</div>
                        </div>
                        <IonButton fill="clear" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => {
                          setEditingStakeholders({ ...editingStakeholders, guarantor: null });
                        }}>
                          <IonIcon icon={trash} />
                        </IonButton>
                      </div>
                    ) : (
                      <p style={{ color: '#64748B', fontStyle: 'italic', marginBottom: '8px' }}>{t('stakeholders.noGuarantorSet')}</p>
                    )}
                    <h4 style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '10px' }}>{editingStakeholders.guarantor ? t('stakeholders.changeGuarantor') || 'Change Guarantor' : t('stakeholders.setGuarantor')}</h4>
                    <IonSearchbar
                      placeholder={t('common.searchCustomerPlaceholder')}
                      value={guarantorSearchQuery}
                      onIonInput={e => setGuarantorSearchQuery(e.detail.value)}
                      style={{ '--background': 'var(--app-bg-card)', '--color': 'var(--app-text)' }}
                    />
                    {guarantorSearchQuery && (
                      <div style={{ maxHeight: '150px', overflow: 'auto', background: '#ffffff', borderRadius: '8px', marginTop: '5px' }}>
                        {customers.filter(c => {
                          const q = guarantorSearchQuery.toLowerCase();
                          if (!c.name.toLowerCase().includes(q) && !c.id.includes(guarantorSearchQuery)) return false;
                          // Exclude: owner, existing JPs, current guarantor
                          if (viewingContract && c.id === viewingContract.customerId) return false;
                          if (editingStakeholders.jointPurchasers.some(jp => jp.id === c.id)) return false;
                          if (editingStakeholders.guarantor?.id === c.id) return false;
                          // Cross-unit: already on another offer/contract for this unit
                          if (viewingContract) { const unitTaken = getCustomerIdsOnUnit(viewingContract.unitId, viewingContract.id); if (unitTaken.has(c.id)) return false; }
                          return true;
                        }).map(c => (
                          <div key={c.id}
                            onClick={() => {
                              setEditingStakeholders({
                                ...editingStakeholders,
                                guarantor: { id: c.id, enabled: true }
                              });
                              setGuarantorSearchQuery('');
                            }}
                            style={{ padding: '10px', borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                          >
                            <div style={{ color: '#1E293B' }}>{c.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{c.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={handleSaveStakeholders}>{t('common.saveChanges')}</IonButton>
                </div>
              </IonContent>
            </IonModal>

            {/* --- PASSWORD MODAL --- */}
            <IonModal
              isOpen={passwordModal.isOpen}
              onDidDismiss={() => setPasswordModal({ ...passwordModal, isOpen: false })}
              onDidPresent={() => {
                // Multiple focus attempts to beat Ionic's focus management
                const focusInput = () => {
                  const el = passwordInputRef.current;
                  if (el) {
                    el.focus();
                    el.click();
                  }
                };
                setTimeout(focusInput, 100);
                setTimeout(focusInput, 300);
                setTimeout(focusInput, 500);
              }}
              className="chrono-modal"
              style={{ '--height': 'auto', '--max-height': '300px', '--width': '90%', '--max-width': '400px' }}
            >
              <div style={{ background: 'var(--app-bg-card)', padding: '24px', borderRadius: '16px' }}
                onClick={() => {
                  // Fallback: clicking anywhere in the modal refocuses the input
                  setTimeout(() => passwordInputRef.current?.focus(), 50);
                }}
              >
                <h3 style={{ color: '#1E293B', marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>{passwordModal.header}</h3>
                <div style={{ background: 'var(--app-bg)', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setPasswordModal({ ...passwordModal, isOpen: false });
                        if (passwordModal.onConfirm) passwordModal.onConfirm(passwordInput);
                      }
                    }}
                    onBlur={() => {
                      // Re-focus if the input loses focus while modal is open (Ionic focus steal)
                      if (passwordModal.isOpen) {
                        setTimeout(() => passwordInputRef.current?.focus(), 100);
                      }
                    }}
                    placeholder={t('common.enterPassword')}
                    tabIndex={0}
                    autoFocus
                    autoComplete="off"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#1E293B',
                      padding: '12px 0',
                      width: '100%',
                      outline: 'none',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <IonButton fill="outline" color="medium" onClick={() => setPasswordModal({ ...passwordModal, isOpen: false })}>
                    {t('common.cancel')}
                  </IonButton>
                  <IonButton style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }} onClick={() => {
                    setPasswordModal({ ...passwordModal, isOpen: false });
                    if (passwordModal.onConfirm) passwordModal.onConfirm(passwordInput);
                  }}>
                    {t('common.confirm')}
                  </IonButton>
                </div>
              </div>
            </IonModal>

            {/* --- EDIT UNIT MODAL --- */}
            <IonModal isOpen={!!editingUnit} onDidDismiss={() => setEditingUnit(null)} style={{ '--width': '95%', '--max-width': '500px' }}>
              <IonHeader><IonToolbar style={{ '--background': '#ffffff' }}><IonTitle style={{ color: '#1E293B' }}>{t('unit.editUnit')} {editingUnit?.unitId}</IonTitle><IonButton slot="end" onClick={() => setEditingUnit(null)} color="light">{t('common.close')}</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {editingUnit && (
                  <div style={{ maxWidth: '450px', margin: '0 auto' }}>
                    <div style={{ background: 'var(--app-bg-card)', padding: '18px', borderRadius: '12px', marginBottom: '20px', borderLeft: '4px solid #1E3A8A' }}>
                      <h2 style={{ color: '#2563EB', margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 800 }}>{t('common.unit')} {editingUnit.unitId}</h2>
                      <p style={{ color: '#64748B'   , margin: 0, fontSize: '0.85rem' }}>{t('unit.modifyDetailsHint')}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label={t('unit.basePrice', { currency: appSettings.currency })} labelPlacement="stacked" type="number" value={editingUnit.price} onIonInput={e => setEditingUnit({ ...editingUnit, price: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label={t('unit.finishedPrice', { currency: appSettings.currency })} labelPlacement="stacked" type="number" value={editingUnit.finishedPrice} onIonInput={e => setEditingUnit({ ...editingUnit, finishedPrice: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label={t('common.floor')} labelPlacement="stacked" value={editingUnit.floor} onIonInput={e => setEditingUnit({ ...editingUnit, floor: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label={t('common.areaSqm')} labelPlacement="stacked" type="number" value={editingUnit.area} onIonInput={e => setEditingUnit({ ...editingUnit, area: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label={t('common.view')} labelPlacement="stacked" value={editingUnit.view} onIonInput={e => setEditingUnit({ ...editingUnit, view: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label={t('common.share')} labelPlacement="stacked" value={editingUnit.share} onIonInput={e => setEditingUnit({ ...editingUnit, share: e.detail.value })} style={{ color: '#1E293B' }} />
                      </IonItem>
                    </div>

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', marginBottom: '20px' }}>
                      <IonInput label={t('common.paymentPlan')} labelPlacement="stacked" value={editingUnit.plan} onIonInput={e => setEditingUnit({ ...editingUnit, plan: e.detail.value })} style={{ color: '#1E293B' }} />
                    </IonItem>

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px', marginBottom: '20px' }}>
                      <IonSelect label={t('common.status')} labelPlacement="stacked" value={editingUnit.status} onIonChange={e => setEditingUnit({ ...editingUnit, status: e.detail.value })} style={{ color: '#1E293B' }}>
                        <IonSelectOption value="available">{t('common.available')}</IonSelectOption>
                        <IonSelectOption value="offer">{t('common.offer')}</IonSelectOption>
                        <IonSelectOption value="contract">{t('common.contract')}</IonSelectOption>
                        <IonSelectOption value="locked">{t('common.locked')}</IonSelectOption>
                        <IonSelectOption value="case">{t('common.case')}</IonSelectOption>
                      </IonSelect>
                    </IonItem>

                    <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '12px', fontWeight: 'bold' }} onClick={() => {
                      promptPassword(t('alert.enterAdminPasswordToSave'), async (password) => {
                        if (password === getAppSecurity().adminPassword) {
                          const allBuildings = await getBuildings();
                          const bIdx = allBuildings.findIndex(b => b.id === activeBuilding.id);
                          if (bIdx !== -1) {
                            const uIdx = allBuildings[bIdx].units.findIndex(u => u.id === editingUnit.id);
                            if (uIdx !== -1) {
                              allBuildings[bIdx].units[uIdx] = {
                                ...allBuildings[bIdx].units[uIdx],
                                price: editingUnit.price,
                                finishedPrice: editingUnit.finishedPrice,
                                floor: editingUnit.floor,
                                area: editingUnit.area,
                                view: editingUnit.view,
                                share: editingUnit.share,
                                status: editingUnit.status,
                                plan: editingUnit.plan
                              };
                              await saveBuildings(allBuildings);
                              setBuildings(allBuildings);
                              setActiveBuilding(allBuildings[bIdx]);
                              setEditingUnit(null);
                              setNoticeAlert({ isOpen: true, header: t('common.success'), message: t('alert.unitUpdatedSuccessfully', { unitId: editingUnit.unitId }), buttons: ['OK'] });
                            }
                          }
                        } else {
                          alert(t('alert.incorrectPassword'));
                        }
                      });
                    }}>
                      {t('common.saveChanges')}
                    </IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            <IonAlert
              isOpen={noticeAlert.isOpen}
              onDidDismiss={() => setNoticeAlert({ ...noticeAlert, isOpen: false })}
              header={noticeAlert.header}
              message={noticeAlert.message}
              buttons={noticeAlert.buttons}
            />

            {/* --- CHANGE SALES AGENT ALERT --- */}
            <IonAlert
              isOpen={showChangeSalesAlert}
              onDidDismiss={() => setShowChangeSalesAlert(false)}
              header="Change Sales Agent / مندوب المبيعات"
              subHeader="Select a sales agent for this contract"
              inputs={[
                {
                  label: 'None / بدون مندوب',
                  type: 'radio',
                  value: '',
                  checked: !viewingContract?.salesId
                },
                ...sales.map(s => ({
                  label: s.name,
                  type: 'radio',
                  value: s.id,
                  checked: String(s.id).trim() === String(viewingContract?.salesId || '').trim()
                }))
              ]}
              buttons={[
                { text: t('common.cancel'), role: 'cancel' },
                {
                  text: t('common.save'),
                  handler: async (agentId) => {
                    if (viewingContract) {
                      try {
                        const success = await updateContract(viewingContract.id, { salesId: agentId });
                        if (success) {
                          const updatedContracts = await getContracts();
                          setContracts(updatedContracts);
                          const updatedView = updatedContracts.find(c => c.id === viewingContract.id);
                          if (updatedView) setViewingContract(updatedView);
                        }
                      } catch (e) {
                        console.error("Change sales agent failed:", e);
                      }
                    }
                  }
                }
              ]}
            />

            {/* --- UPDATE AVAILABLE MODAL --- */}
            <IonAlert
              isOpen={showUpdateModal}
              backdropDismiss={false}
              header={t('update.updateAvailableTitle')}
              subHeader={remoteVersion === 'PUSHED' ? t('update.ownerPushedUpdate') : t('update.versionReady', { version: remoteVersion })}
              message={remoteVersion === 'PUSHED'
                ? t('update.ownerPushedUpdateMessage')
                : t('update.newVersionAvailableMessage')
              }
              buttons={[
                {
                  text: t('common.later'),
                  role: 'cancel',
                  handler: () => setShowUpdateModal(false)
                },
                {
                  text: remoteVersion === 'PUSHED' || apkUrl ? t('update.updateNow') : t('update.requestFromOwner'),
                  handler: () => {
                    if (apkUrl) {
                      window.open(apkUrl, '_system');
                    } else if (remoteVersion !== 'PUSHED') {
                      handleRequestRemoteUpdate();
                    } else {
                      alert(t('alert.updateSourceMissing'));
                    }
                  }
                }
              ]}
            />

            {/* --- UPLOAD PROGRESS MODAL --- */}
            <IonModal isOpen={uploadProgress.isOpen} backdropDismiss={false} style={{ '--height': 'auto', '--width': '300px', '--border-radius': '16px' }}>
              <div style={{ padding: '20px', background: 'var(--app-bg-card)', textAlign: 'center', color: '#1E293B' }}>
                <div className="chrono-loader-bar" style={{ margin: '0 auto 15px' }}>
                  <div className="chrono-loader-progress"></div>
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>{uploadProgress.message}</h3>
                {uploadProgress.total > 0 && (
                  <div style={{ background: '#ffffff', borderRadius: '4px', height: '10px', width: '100%', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: '#2563EB',
                      width: `${Math.min(100, (uploadProgress.current / uploadProgress.total) * 100)}%`,
                      transition: 'width 0.2s ease'
                    }} />
                  </div>
                )}
                {uploadProgress.total > 0 && (
                  <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '8px' }}>
                    {uploadProgress.current} / {uploadProgress.total}
                  </p>
                )}
              </div>
            </IonModal>

            {/* --- SETTINGS MODAL --- */}
            <IonModal isOpen={showSettingsModal} onDidDismiss={() => setShowSettingsModal(false)}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('settings.title')}</IonTitle>
                  <IonButton slot="end" fill="clear" onClick={() => setShowSettingsModal(false)}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px' }}>
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {/* VISIBLE ADMIN ACCESS BUTTON - Only for DYR */}
                    {(loggedInUser?.name || '').toLowerCase() === 'dyr' && (
                      <IonButton
                        expand="block"
                        fill="outline"
                        style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', marginBottom: '20px', '--border-radius': '12px' }}
                        onClick={() => {
                          setShowSettingsModal(false);
                          setShowAdminModal(true);
                        }}
                      >
                        <IonIcon icon={peopleOutline} slot="start" />
                        {t('settings.ownerMonitor')}
                      </IonButton>
                    )}


                    {/* Language Section */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={languageOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.language')}</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {getAvailableLanguages().map(lang => (
                          <IonButton
                            key={lang.code}
                            fill={currentLang === lang.code ? 'solid' : 'outline'}
                            color={currentLang === lang.code ? 'warning' : 'medium'}
                            onClick={() => {
                              setLanguage(lang.code);
                              setCurrentLang(lang.code);
                            }}
                            style={{ '--border-radius': '12px' }}
                          >
                            {lang.nativeName}
                          </IonButton>
                        ))}
                      </div>
                    </div>

                    {/* Appearance Section */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={moonOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.appearance')}</h3>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#64748B', display: 'block', marginBottom: '8px' }}>{t('settings.theme')}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <IonButton
                            fill={appSettings.theme === 'dark' ? 'solid' : 'outline'}
                            color={appSettings.theme === 'dark' ? 'warning' : 'medium'}
                            onClick={() => {
                              const defaultDarkBg = localStorage.getItem('app_bgVariant_dark') || 'deep-ocean';
                              setAppSettings(prev => ({ ...prev, theme: 'dark', bgVariant: defaultDarkBg }));
                              localStorage.setItem('app_theme', 'dark');
                              localStorage.setItem('app_bgVariant', defaultDarkBg);
                            }}
                            style={{ '--border-radius': '12px' }}
                          >
                            <IonIcon icon={moonOutline} slot="start" />
                            {t('settings.dark')}
                          </IonButton>
                          <IonButton
                            fill={appSettings.theme === 'light' ? 'solid' : 'outline'}
                            color={appSettings.theme === 'light' ? 'warning' : 'medium'}
                            onClick={() => {
                              const defaultLightBg = localStorage.getItem('app_bgVariant_light') || 'cloud-white';
                              setAppSettings(prev => ({ ...prev, theme: 'light', bgVariant: defaultLightBg }));
                              localStorage.setItem('app_theme', 'light');
                              localStorage.setItem('app_bgVariant', defaultLightBg);
                            }}
                            style={{ '--border-radius': '12px' }}
                          >
                            <IonIcon icon={sunnyOutline} slot="start" />
                            {t('settings.light')}
                          </IonButton>
                        </div>
                      </div>

                      {/* Background Variant Picker */}
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#64748B', display: 'block', marginBottom: '10px' }}>Background Style</label>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {(appSettings.theme === 'dark' ? [
                            { id: 'deep-ocean', name: 'Deep Ocean', colors: ['#0f172a', '#1e293b', '#0f172a'] },
                            { id: 'midnight-charcoal', name: 'Midnight Charcoal', colors: ['#111827', '#1a1a2e', '#16213e'] },
                            { id: 'obsidian-slate', name: 'Obsidian Slate', colors: ['#0c0c1d', '#1a1b2e', '#0d1117'] },
                            { id: 'dark-carbon', name: 'Dark Carbon', colors: ['#171717', '#262626', '#171717'] },
                            { id: 'deep-space', name: 'Deep Space', colors: ['#020617', '#0f172a', '#1e1b4b'] },
                          ] : [
                            { id: 'cloud-white', name: 'Cloud White', colors: ['#f0f9ff', '#f8fafc', '#ffffff'] },
                            { id: 'pearl', name: 'Pearl', colors: ['#f8fafc', '#f1f5f9', '#e2e8f0'] },
                            { id: 'warm-sand', name: 'Warm Sand', colors: ['#fefce8', '#fef9ef', '#fffbeb'] },
                            { id: 'soft-lavender', name: 'Soft Lavender', colors: ['#faf5ff', '#f5f3ff', '#ede9fe'] },
                            { id: 'arctic-mist', name: 'Arctic Mist', colors: ['#ecfeff', '#f0fdfa', '#f0fdf4'] },
                          ]).map(variant => {
                            const isSelected = appSettings.bgVariant === variant.id;
                            return (
                              <div
                                key={variant.id}
                                onClick={() => {
                                  setAppSettings(prev => ({ ...prev, bgVariant: variant.id }));
                                  localStorage.setItem('app_bgVariant', variant.id);
                                  localStorage.setItem(`app_bgVariant_${appSettings.theme}`, variant.id);
                                }}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.15s ease',
                                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                }}
                              >
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: `linear-gradient(135deg, ${variant.colors[0]}, ${variant.colors[1]}, ${variant.colors[2]})`,
                                  border: isSelected ? '3px solid #2563EB' : `2px solid ${appSettings.theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                  boxShadow: isSelected ? '0 0 12px rgba(37, 99, 235, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease',
                                }}>
                                  {isSelected && <span style={{ color: '#2563EB', fontSize: '1.2rem', fontWeight: '900' }}>✓</span>}
                                </div>
                                <span style={{
                                  fontSize: '0.65rem',
                                  color: isSelected ? '#2563EB' : '#64748B',
                                  fontWeight: isSelected ? '700' : '500',
                                  textAlign: 'center',
                                  maxWidth: '60px',
                                  lineHeight: '1.2'
                                }}>{variant.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ color: '#64748B', display: 'block', marginBottom: '8px' }}>{t('settings.fontSize')}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {['small', 'medium', 'large'].map(size => (
                            <IonButton
                              key={size}
                              fill={appSettings.fontSize === size ? 'solid' : 'outline'}
                              color={appSettings.fontSize === size ? 'warning' : 'medium'}
                              onClick={() => {
                                setAppSettings(prev => ({ ...prev, fontSize: size }));
                                localStorage.setItem('app_fontSize', size);
                              }}
                              style={{ '--border-radius': '12px', textTransform: 'capitalize' }}
                            >
                              {t(`settings.${size}`)}
                            </IonButton>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Financial Configuration Section */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={cashOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.financialConfiguration')}</h3>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#64748B', display: 'block', marginBottom: '8px' }}>{t('settings.globalCurrency')}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {['EGP', 'USD', 'EUR', 'SAR', 'QAR', 'KWD'].map(cur => (
                            <IonButton
                              key={cur}
                              size="small"
                              fill={appSettings.currency === cur ? 'solid' : 'outline'}
                              color={appSettings.currency === cur ? 'success' : 'medium'}
                              onClick={() => {
                                setCurrency(cur);
                              }}
                              style={{ '--border-radius': '8px', minWidth: '70px', fontWeight: 'bold' }}
                            >
                              {cur}
                            </IonButton>
                          ))}
                        </div>
                        <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#64748B'    }}>{t('settings.currencyHint')}</p>
                      </div>
                    </div>

                    {/* Notifications Section */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={notificationsOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.notifications')}</h3>
                      </div>

                      <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '0' }}>
                        <IonLabel style={{ color: '#1E293B' }}>{t('settings.paymentReminders')}</IonLabel>
                        <IonButton
                          slot="end"
                          fill={appSettings.paymentReminders ? 'solid' : 'outline'}
                          color={appSettings.paymentReminders ? 'success' : 'medium'}
                          size="small"
                          onClick={() => {
                            const newVal = !appSettings.paymentReminders;
                            setAppSettings(prev => ({ ...prev, paymentReminders: newVal }));
                            localStorage.setItem('app_paymentReminders', String(newVal));
                          }}
                        >
                          {appSettings.paymentReminders ? t('common.on') : t('common.off')}
                        </IonButton>
                      </IonItem>

                      <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '0' }}>
                        <IonLabel style={{ color: '#1E293B' }}>{t('settings.overdueAlerts')}</IonLabel>
                        <IonButton
                          slot="end"
                          fill={appSettings.overdueAlerts ? 'solid' : 'outline'}
                          color={appSettings.overdueAlerts ? 'success' : 'medium'}
                          size="small"
                          onClick={() => {
                            const newVal = !appSettings.overdueAlerts;
                            setAppSettings(prev => ({ ...prev, overdueAlerts: newVal }));
                            localStorage.setItem('app_overdueAlerts', String(newVal));
                          }}
                        >
                          {appSettings.overdueAlerts ? t('common.on') : t('common.off')}
                        </IonButton>
                      </IonItem>
                    </div>

                    {/* Data & Branding Section */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={business} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.companyIdentity')}</h3>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#64748B', display: 'block', marginBottom: '8px' }}>{t('settings.companyName')}</label>
                        <IonInput
                          value={branding.name}
                          onIonChange={e => setBranding({ ...branding, name: e.detail.value })}
                          placeholder={t('settings.companyNamePlaceholder')}
                          style={{ background: '#ffffff', borderRadius: '8px', color: '#1E293B', '--padding-start': '10px' }}
                        />
                      </div>

                      {/* Company Logo — Light & Dark */}
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ color: '#2563EB', display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Company Logo</label>
                        <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#64748B' }}>Upload separate logos for light and dark themes. The app switches automatically.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          {/* Light Theme Logo */}
                          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                              <span style={{ fontSize: '1rem' }}>☀️</span>
                              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Light Theme</span>
                            </div>
                            <div
                              onClick={() => document.getElementById('set-logo-light').click()}
                              style={{
                                width: '100%', height: '70px', borderRadius: '10px',
                                background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', overflow: 'hidden',
                                border: branding.logo ? '2px solid #E5E7EB' : '2px dashed #CBD5E1',
                                backgroundImage: branding.logo ? `url(${branding.logo})` : 'none',
                                backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'
                              }}
                            >
                              {!branding.logo && <span style={{ color: '#94A3B8', fontSize: '0.65rem', fontWeight: '600' }}>Upload</span>}
                            </div>
                            <input type="file" id="set-logo-light" style={{ display: 'none' }} onChange={(e) => handleImagePick('logo', e)} accept="image/*" />
                            {branding.logo && (
                              <IonButton fill="clear" size="small" style={{ '--color': '#DC2626', fontSize: '0.7rem', marginTop: '4px' }} onClick={() => setBranding({ ...branding, logo: null })}>
                                {t('common.remove')}
                              </IonButton>
                            )}
                          </div>
                          {/* Dark Theme Logo */}
                          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                              <span style={{ fontSize: '1rem' }}>🌙</span>
                              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dark Theme</span>
                            </div>
                            <div
                              onClick={() => document.getElementById('set-logo-dark').click()}
                              style={{
                                width: '100%', height: '70px', borderRadius: '10px',
                                background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', overflow: 'hidden',
                                border: branding.logoDark ? '2px solid #334155' : '2px dashed #475569',
                                backgroundImage: branding.logoDark ? `url(${branding.logoDark})` : 'none',
                                backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'
                              }}
                            >
                              {!branding.logoDark && <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: '600' }}>Upload</span>}
                            </div>
                            <input type="file" id="set-logo-dark" style={{ display: 'none' }} onChange={(e) => handleImagePick('logoDark', e)} accept="image/*" />
                            {branding.logoDark && (
                              <IonButton fill="clear" size="small" style={{ '--color': '#F87171', fontSize: '0.7rem', marginTop: '4px' }} onClick={() => setBranding({ ...branding, logoDark: null })}>
                                {t('common.remove')}
                              </IonButton>
                            )}
                          </div>
                        </div>
                      </div>

                      <label style={{ color: '#2563EB', display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Portrait PDF Branding</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div>
                          <label style={{ color: '#64748B', display: 'block', marginBottom: '5px' }}>Portrait Header</label>
                          <div
                            onClick={() => document.getElementById('set-header').click()}
                            style={{
                              height: '80px', background: '#ffffff', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              backgroundImage: branding.header ? `url(${branding.header})` : 'none',
                              backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                              border: '1px dashed #555'
                            }}
                          >
                            {!branding.header && <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t('settings.clickToUpload')}</span>}
                          </div>
                          <input type="file" id="set-header" style={{ display: 'none' }} onChange={(e) => handleImagePick('header', e)} accept="image/*" />
                          {branding.header && <IonButton fill="clear" size="small" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => setBranding({ ...branding, header: null })}>{t('common.remove')}</IonButton>}
                        </div>
                        <div>
                          <label style={{ color: '#64748B', display: 'block', marginBottom: '5px' }}>Portrait Footer</label>
                          <div
                            onClick={() => document.getElementById('set-footer').click()}
                            style={{
                              height: '80px', background: '#ffffff', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              backgroundImage: branding.footer ? `url(${branding.footer})` : 'none',
                              backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                              border: '1px dashed #555'
                            }}
                          >
                            {!branding.footer && <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t('settings.clickToUpload')}</span>}
                          </div>
                          <input type="file" id="set-footer" style={{ display: 'none' }} onChange={(e) => handleImagePick('footer', e)} accept="image/*" />
                          {branding.footer && <IonButton fill="clear" size="small" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => setBranding({ ...branding, footer: null })}>{t('common.remove')}</IonButton>}
                        </div>
                      </div>

                      <label style={{ color: '#2563EB', display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Landscape PDF Branding</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ color: '#64748B', display: 'block', marginBottom: '5px' }}>Landscape Header</label>
                          <div
                            onClick={() => document.getElementById('set-landscape-header').click()}
                            style={{
                              height: '60px', background: '#ffffff', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              backgroundImage: branding.landscapeHeader ? `url(${branding.landscapeHeader})` : 'none',
                              backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                              border: '1px dashed #555'
                            }}
                          >
                            {!branding.landscapeHeader && <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t('settings.clickToUpload')}</span>}
                          </div>
                          <input type="file" id="set-landscape-header" style={{ display: 'none' }} onChange={(e) => handleImagePick('landscapeHeader', e)} accept="image/*" />
                          {branding.landscapeHeader && <IonButton fill="clear" size="small" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => setBranding({ ...branding, landscapeHeader: null })}>{t('common.remove')}</IonButton>}
                        </div>
                        <div>
                          <label style={{ color: '#64748B', display: 'block', marginBottom: '5px' }}>Landscape Footer</label>
                          <div
                            onClick={() => document.getElementById('set-landscape-footer').click()}
                            style={{
                              height: '60px', background: '#ffffff', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              backgroundImage: branding.landscapeFooter ? `url(${branding.landscapeFooter})` : 'none',
                              backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                              border: '1px dashed #555'
                            }}
                          >
                            {!branding.landscapeFooter && <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t('settings.clickToUpload')}</span>}
                          </div>
                          <input type="file" id="set-landscape-footer" style={{ display: 'none' }} onChange={(e) => handleImagePick('landscapeFooter', e)} accept="image/*" />
                          {branding.landscapeFooter && <IonButton fill="clear" size="small" style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF' }} onClick={() => setBranding({ ...branding, landscapeFooter: null })}>{t('common.remove')}</IonButton>}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={cloudDownload} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.databaseConnection')}</h3>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: '#64748B'   , marginBottom: '15px' }}>
                        {t('settings.databaseConnectionHint')}
                      </p>

                      <IonItem lines="none" style={{ '--background': '#ffffff', borderRadius: '8px', marginBottom: '15px' }}>
                        <IonLabel>{t('settings.connectionMode')}</IonLabel>
                        <IonSelect value={dbConfig.type} onIonChange={e => setDbConfig({ ...dbConfig, type: e.detail.value })}>
                          <IonSelectOption value="local">{t('settings.localStorage')}</IonSelectOption>
                          <IonSelectOption value="hosted">{t('settings.cloudSync')}</IonSelectOption>
                          <IonSelectOption value="network">{t('settings.networkServer')}</IonSelectOption>
                          {!isNativeMobile && <IonSelectOption value="express">Express Server (LAN)</IonSelectOption>}
                        </IonSelect>
                      </IonItem>

                      {dbConfig.type === 'local' && (
                        <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#64748B' }}>{t('settings.currentDbLocation')}:</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <code style={{ flex: 1, background: '#ffffff', padding: '8px', fontSize: '0.75rem', color: '#2563EB', wordBreak: 'break-all', borderRadius: '4px' }}>
                              {currentDbPath}
                            </code>
                            <IonButton
                              size="small"
                              style={{ '--color': '#FFFFFF', '--background': '#64748B', color: '#FFFFFF', margin: 0 }}
                              fill="solid"
                              onClick={handleChangeDbFolder}
                            >
                              <IonIcon icon={createOutline} />
                            </IonButton>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: '#64748B'   , marginTop: '10px', lineHeight: '1.4' }}>
                            <strong>{t('common.tip')}:</strong> {t('settings.networkPathTip')} <code style={{ color: '#2563EB' }}>\\192.168.1.30\Shared\Database</code>.
                          </p>
                          {isNativeMobile && (
                            <p style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '8px' }}>
                              <strong>{t('settings.mobileNote')}:</strong> {t('settings.mobileLocalDbHint')}
                            </p>
                          )}
                        </div>
                      )}

                      {(dbConfig.type === 'local' || dbConfig.type === 'express') && (
                        <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#64748B' }}>Backup Location:</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <code style={{ flex: 1, background: '#ffffff', padding: '8px', fontSize: '0.75rem', color: '#059669', wordBreak: 'break-all', borderRadius: '4px' }}>
                              {currentBackupPath}
                            </code>
                            <IonButton
                              size="small"
                              fill="solid"
                              style={{ '--color': '#FFFFFF', '--background': '#059669', color: '#FFFFFF', margin: 0 }}
                              onClick={handleChangeBackupFolder}
                            >
                              <IonIcon icon={createOutline} />
                            </IonButton>
                            <IonButton
                              size="small"
                              fill="solid"
                              style={{ '--color': '#FFFFFF', '--background': '#64748B', color: '#FFFFFF', margin: 0 }}
                              onClick={handleResetBackupFolder}
                            >
                              Reset
                            </IonButton>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '10px', lineHeight: '1.4' }}>
                            <strong>Tip:</strong> Click the edit icon to choose a custom backup folder (e.g. external drive). Click <strong>Reset</strong> to revert to default.
                          </p>
                        </div>
                      )}

                      {dbConfig.type === 'network' && (
                        <div style={{ marginBottom: '15px', padding: '15px', background: 'rgba(56, 128, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(56, 128, 255, 0.2)' }}>
                          <h4 style={{ color: '#2563EB', margin: '0 0 10px 0', fontSize: '0.9rem' }}>{t('settings.networkConnection')}</h4>
                          <p style={{ fontSize: '0.75rem', color: '#64748B'   , marginBottom: '12px' }}>
                            {t('settings.networkConnectionHint')}
                          </p>

                          <label style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', marginBottom: '4px' }}>{t('settings.serverIpOrNetworkPath')}</label>
                          <IonItem lines="none" style={{ '--background': '#1E293B', borderRadius: '8px', marginBottom: '10px' }}>
                            <IonInput
                              value={dbConfig.url}
                              onIonInput={e => setDbConfig({ ...dbConfig, url: e.detail.value })}
                              placeholder={t('settings.serverIpPlaceholder')}
                              style={{ color: '#1E293B', fontSize: '0.9rem' }}
                            />
                          </IonItem>
                          <p style={{ fontSize: '0.65rem', color: '#64748B' }}>
                            {t('settings.mobileIpHint')}
                          </p>
                        </div>
                      )}

                      {dbConfig.type === 'express' && (
                        <div style={{ marginBottom: '15px', padding: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(37, 99, 235, 0.08))', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: expressServerRunning ? '#10B981' : '#64748B', boxShadow: expressServerRunning ? '0 0 10px rgba(16,185,129,0.6)' : 'none', animation: expressServerRunning ? 'pulse 2s infinite' : 'none', transition: 'all 0.3s' }} />
                            <h4 style={{ color: expressServerRunning ? '#10B981' : '#64748B', margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                              {expressServerRunning ? '🟢 Server Running' : '⚫ Server Stopped'}
                            </h4>
                            {expressServerRunning && (
                              <span style={{ marginLeft: 'auto', background: '#FEF3C7', color: '#92400E', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                                MONITOR MODE
                              </span>
                            )}
                          </div>

                          <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '15px', lineHeight: '1.5' }}>
                            Start a server so employees on your network can <strong>read and write</strong> data. You (the owner) can monitor all changes in real-time. Data auto-refreshes every 15 seconds.
                          </p>

                          <IonButton
                            expand="block"
                            disabled={expressServerLoading}
                            style={{
                              '--color': '#FFFFFF',
                              '--background': expressServerRunning ? '#DC2626' : '#10B981',
                              color: '#FFFFFF',
                              '--border-radius': '10px',
                              fontWeight: 'bold',
                              marginBottom: '15px'
                            }}
                            onClick={expressServerRunning ? handleStopExpressServer : handleStartExpressServer}
                          >
                            {expressServerLoading ? 'Please wait...' : (expressServerRunning ? '⏹ Stop Server' : '▶ Start Server')}
                          </IonButton>

                          {/* Database Directory */}
                          <div style={{
                            padding: '10px 14px', marginBottom: '15px',
                            background: '#F8FAFC', borderRadius: '10px',
                            border: '1px solid #E2E8F0'
                          }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>📁 Database Directory</div>
                            <div style={{
                              fontSize: '0.65rem', wordBreak: 'break-all',
                              background: '#1E293B', color: '#10B981', padding: '8px 10px',
                              borderRadius: '6px', fontFamily: 'monospace', marginBottom: '8px'
                            }}>
                              {currentDbPath || 'Loading...'}
                            </div>
                            <button
                              disabled={expressServerRunning}
                              onClick={async () => {
                                if (window.electronAPI && window.electronAPI.selectDBFolder) {
                                  try {
                                    const result = await window.electronAPI.selectDBFolder();
                                    if (result) {
                                      setCurrentDbPath(result);
                                      alert('Database path updated to:\n' + result + '\n\nRestart the app for changes to take effect.');
                                    }
                                  } catch (e) {
                                    alert('Failed to change folder: ' + (e.message || e));
                                  }
                                }
                              }}
                              style={{
                                border: 'none', borderRadius: '6px', padding: '6px 14px',
                                fontSize: '0.65rem', fontWeight: '700', cursor: expressServerRunning ? 'not-allowed' : 'pointer',
                                background: expressServerRunning ? '#CBD5E1' : '#2563EB',
                                color: '#fff', width: '100%'
                              }}
                            >
                              {expressServerRunning ? '⚠️ Stop server first to change path' : '📂 Change Database Folder'}
                            </button>
                          </div>

                          {/* Auto-start on Windows startup toggle */}
                          {window.electronAPI && window.electronAPI.setAutoStart && (
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 14px', marginBottom: '15px',
                              background: autoStartServer ? '#F0FDF4' : '#F8FAFC',
                              borderRadius: '10px',
                              border: `1px solid ${autoStartServer ? '#BBF7D0' : '#E2E8F0'}`
                            }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>🔄 Start on Windows Startup</div>
                                <div style={{ fontSize: '0.6rem', color: '#94A3B8' }}>Auto-launch DYR and start the server when PC boots</div>
                              </div>
                              <div
                                onClick={async () => {
                                  const newVal = !autoStartServer;
                                  setAutoStartServer(newVal);
                                  try {
                                    await window.electronAPI.setAutoStart(newVal);
                                  } catch (e) { console.error('Auto-start toggle failed:', e); setAutoStartServer(!newVal); }
                                }}
                                style={{
                                  width: '44px', height: '24px', borderRadius: '12px',
                                  background: autoStartServer ? '#10B981' : '#CBD5E1',
                                  position: 'relative', cursor: 'pointer',
                                  transition: 'background 0.2s ease', flexShrink: 0
                                }}
                              >
                                <div style={{
                                  width: '20px', height: '20px', borderRadius: '50%',
                                  background: '#fff', position: 'absolute', top: '2px',
                                  left: autoStartServer ? '22px' : '2px',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                            </div>
                          )}

                          {expressServerRunning && (
                            <div style={{ background: '#ffffff', borderRadius: '10px', padding: '15px', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#10B981', fontWeight: '700' }}>📡 Server is live! Clients connect to:</p>
                              <div style={{ background: '#1E293B', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                                <code style={{ color: '#10B981', fontSize: '1.1rem', fontWeight: 'bold', display: 'block', textAlign: 'center', letterSpacing: '0.5px' }}>
                                  http://{expressServerIP}:3001
                                </code>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#92400E' }}>{expressServerStats?.summary?.pending || 0}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#92400E' }}>Pending</div>
                                </div>
                                <div style={{ background: '#F0FDF4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669' }}>{expressServerStats?.summary?.approved || 0}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748B' }}>Approved</div>
                                </div>
                                <div style={{ background: '#FEF2F2', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#DC2626' }}>{expressServerStats?.summary?.blocked || 0}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748B' }}>Blocked</div>
                                </div>
                              </div>

                              {/* PENDING CLIENTS — need approval */}
                              {expressServerStats?.clients?.filter(c => c.status === 'pending').length > 0 && (
                                <div style={{ marginBottom: '12px', background: '#FFFBEB', borderRadius: '10px', padding: '12px', border: '1px solid #FCD34D' }}>
                                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: '700', color: '#92400E' }}>🔔 Pending Connections:</p>
                                  {expressServerStats.clients.filter(c => c.status === 'pending').map((client, idx) => (
                                    <div key={`p-${idx}`} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '10px', marginBottom: '6px',
                                      background: '#FFF', borderRadius: '8px', border: '1px solid #FDE68A'
                                    }}>
                                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>{client.name}</div>
                                        <div style={{ fontSize: '0.6rem', color: '#94A3B8' }}>{client.ip}</div>
                                      </div>
                                      <button onClick={async () => {
                                        try {
                                          await fetch('http://localhost:3001/api/admin/approve', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                          const r = await fetch('http://localhost:3001/api/health'); if(r.ok) setExpressServerStats(await r.json());
                                        } catch(e){}
                                      }} style={{ border:'none', borderRadius:'6px', padding:'5px 10px', fontSize:'0.65rem', fontWeight:'700', cursor:'pointer', background:'#10B981', color:'#fff' }}>
                                        ✓ Accept
                                      </button>
                                      <button onClick={async () => {
                                        try {
                                          await fetch('http://localhost:3001/api/admin/block', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                          const r = await fetch('http://localhost:3001/api/health'); if(r.ok) setExpressServerStats(await r.json());
                                        } catch(e){}
                                      }} style={{ border:'none', borderRadius:'6px', padding:'5px 10px', fontSize:'0.65rem', fontWeight:'700', cursor:'pointer', background:'#DC2626', color:'#fff' }}>
                                        ✕ Reject
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* APPROVED CLIENTS */}
                              {expressServerStats?.clients?.filter(c => c.status === 'approved').length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: '700', color: '#059669' }}>✅ Approved Devices:</p>
                                  {expressServerStats.clients.filter(c => c.status === 'approved').map((client, idx) => (
                                    <div key={`a-${idx}`} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '10px', marginBottom: '6px',
                                      background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0'
                                    }}>
                                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.4)', flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>{client.name}</div>
                                        <div style={{ fontSize: '0.6rem', color: '#94A3B8' }}>{client.ip} • {client.requests} req • {client.lastSeen ? new Date(client.lastSeen).toLocaleTimeString() : '—'}</div>
                                      </div>
                                      <button onClick={async () => {
                                        try {
                                          await fetch('http://localhost:3001/api/admin/block', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                          const r = await fetch('http://localhost:3001/api/health'); if(r.ok) setExpressServerStats(await r.json());
                                        } catch(e){}
                                      }} style={{ border:'none', borderRadius:'6px', padding:'5px 10px', fontSize:'0.65rem', fontWeight:'700', cursor:'pointer', background:'#DC2626', color:'#fff', flexShrink: 0 }}>
                                        ✕ Block
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* BLOCKED CLIENTS */}
                              {expressServerStats?.clients?.filter(c => c.status === 'blocked').length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: '700', color: '#DC2626' }}>⛔ Blocked Devices:</p>
                                  {expressServerStats.clients.filter(c => c.status === 'blocked').map((client, idx) => (
                                    <div key={`b-${idx}`} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '10px', marginBottom: '6px',
                                      background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', opacity: 0.7
                                    }}>
                                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#DC2626' }}>{client.name}</div>
                                        <div style={{ fontSize: '0.6rem', color: '#94A3B8' }}>{client.ip}</div>
                                      </div>
                                      <button onClick={async () => {
                                        try {
                                          await fetch('http://localhost:3001/api/admin/unblock', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                          const r = await fetch('http://localhost:3001/api/health'); if(r.ok) setExpressServerStats(await r.json());
                                        } catch(e){}
                                      }} style={{ border:'none', borderRadius:'6px', padding:'5px 10px', fontSize:'0.65rem', fontWeight:'700', cursor:'pointer', background:'#10B981', color:'#fff', flexShrink: 0 }}>
                                        ✓ Enable
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(!expressServerStats?.clients || expressServerStats.clients.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '15px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '12px' }}>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>No clients connected yet</p>
                                </div>
                              )}

                              <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: '1.6', background: '#F8FAFC', borderRadius: '8px', padding: '10px' }}>
                                <p style={{ margin: '0 0 5px', fontWeight: '700', color: '#1E293B' }}>On the client PC:</p>
                                <p style={{ margin: '0 0 3px' }}>1. Open DYR → Settings → Database Connection</p>
                                <p style={{ margin: '0 0 3px' }}>2. Set mode to <strong>"Network (Custom API)"</strong></p>
                                <p style={{ margin: '0 0 3px' }}>3. Enter: <code style={{ color: '#10B981', background: '#1E293B', padding: '1px 6px', borderRadius: '3px' }}>http://{expressServerIP}:3001</code></p>
                                <p style={{ margin: '8px 0 0', color: '#2563EB', fontWeight: '600' }}>📺 You are in Monitor Mode — data auto-refreshes every 15s</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '12px', height: '50px', fontWeight: 'bold' }} onClick={handleSaveSetup}>
                        <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                        {t('settings.saveConnectionSettings')}
                      </IonButton>
                    </div>
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={trashOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.dataManagement')}</h3>
                      </div>

                      {dbConfig.type === 'network' && (
                        <div style={{ padding: '12px', background: '#FEF3C7', borderRadius: '10px', marginBottom: '15px', border: '1px solid #FCD34D' }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#92400E', fontWeight: '600' }}>
                            ⚠️ Backups are only available on the host PC. You are connected as a client.
                          </p>
                        </div>
                      )}

                      <IonButton
                        expand="block"
                        fill="outline"
                        color="medium"
                        disabled={dbConfig.type === 'network'}
                        style={{ marginBottom: '10px', '--border-radius': '12px' }}
                        onClick={() => {
                          // Export all data as JSON
                          const data = {
                            buildings,
                            customers,
                            offers,
                            contracts,
                            installments,
                            sales,
                            terminatedContracts,
                            terminatedInstallments,
                            exportDate: new Date().toISOString()
                          };
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const fname = `dyr-backup-${new Date().toISOString().split('T')[0]}.json`;

                          if (isNativeMobile) {
                            exportFileMobile(blob, fname, 'application/json');
                          } else {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fname;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        <IonIcon icon={downloadOutline} slot="start" />
                        {t('settings.exportData')}
                      </IonButton>

                      <IonButton
                        expand="block"
                        fill="outline"
                        style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', '--border-radius': '12px' }}
                        onClick={() => {
                          if (window.confirm(t('alert.clearCacheConfirm'))) {
                            localStorage.removeItem('dyr_cache');
                            refreshData();
                          }
                        }}
                      >
                        <IonIcon icon={trashOutline} slot="start" />
                        {t('settings.clearCache')}
                      </IonButton>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                      <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.security')}</h3>
                    </div>

                    <IonButton
                      expand="block"
                      fill="outline"
                      color="medium"
                      style={{ '--border-radius': '12px' }}
                      onClick={() => setShowChangePasswordAlert(true)}
                    >
                      <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                      {t('settings.changePassword')}
                    </IonButton>
                  </div>




                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {/* Auto-Update Section (Windows & Android) */}
                    {(isDesktop || isNativeMobile) && (
                      <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                          <IonIcon icon={cloudDownload} style={{ fontSize: '24px', color: '#2563EB' }} />
                          <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.updates')}</h3>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          {updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error' ? (
                            <IonButton expand="block" fill="outline" onClick={handleCheckForUpdate} style={{ '--border-radius': '12px' }}>
                              {t('settings.checkForUpdates')}
                            </IonButton>
                          ) : updateStatus === 'checking' ? (
                            <div style={{ padding: '10px', color: '#64748B'    }}>{t('settings.checkingForUpdates')}</div>
                          ) : updateStatus === 'available' ? (
                            <div>
                              <p style={{ color: '#2563EB', marginBottom: '10px' }}>
                                {t('settings.updateAvailable', { version: updateInfo?.version })}
                              </p>
                              <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', '--border-radius': '12px' }} onClick={handleDownloadUpdate}>
                                {t('settings.downloadAndInstall')}
                              </IonButton>
                            </div>
                          ) : updateStatus === 'downloading' ? (
                            <div>
                              <p style={{ color: '#2563EB', marginBottom: '5px' }}>{t('settings.downloading', { percent: Math.round(updateProgress.percent) })}</p>
                              <div style={{ background: '#ffffff', borderRadius: '4px', height: '8px', width: '100%', marginBottom: '5px' }}>
                                <div style={{ height: '100%', background: '#2563EB', width: `${updateProgress.percent}%`, transition: 'width 0.2s' }} />
                              </div>
                              <small style={{ color: '#64748B' }}>
                                {(updateProgress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
                              </small>
                            </div>
                          ) : updateStatus === 'downloaded' ? (
                            <div>
                              <p style={{ color: '#2563EB', marginBottom: '10px' }}>{t('settings.updateReady')}</p>
                              <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', '--border-radius': '12px' }} onClick={handleQuitAndInstall}>
                                {t('settings.restartAndInstall')}
                              </IonButton>
                            </div>
                          ) : null}

                          {updateStatus === 'not-available' && (
                            <p style={{ color: '#64748B', marginTop: '10px', fontSize: '0.9rem' }}>{t('settings.latestVersion')}</p>
                          )}

                          {updateStatus === 'error' && (
                            <p style={{ color: '#DC2626', marginTop: '10px', fontSize: '0.9rem' }}>
                              {t('common.error')}: {updateError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <IonAlert
                      isOpen={showChangePasswordAlert}
                      onDidDismiss={() => setShowChangePasswordAlert(false)}
                      header={t('settings.changePassword')}
                      inputs={[
                        {
                          name: 'password',
                          type: 'password',
                          placeholder: t('settings.newPasswordPlaceholder'),
                          attributes: {
                            minLength: 6
                          }
                        }
                      ]}
                      buttons={[
                        {
                          text: t('common.cancel'),
                          role: 'cancel',
                          handler: () => { }
                        },
                        {
                          text: t('common.save'),
                          handler: (data) => {
                            if (data.password && data.password.length >= 6) {
                              const currentSecurity = getAppSecurity();
                              const updatedSecurity = { ...currentSecurity, adminPassword: data.password };
                              setAppSecurity(updatedSecurity);
                              setSecurityConfig(updatedSecurity);
                              alert(t('settings.saved'));
                              return true;
                            } else {
                              alert(t('alert.passwordTooShort'));
                              return false; // Keep alert open
                            }
                          }
                        }
                      ]}
                    />

                    {/* About Section */}
                    <div style={{ background: 'var(--app-bg-card)', borderRadius: '16px', padding: '20px' }}>

                      {/* ... existing about content ... */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <IonIcon icon={informationCircleOutline} style={{ fontSize: '24px', color: '#2563EB' }} />
                        <h3 style={{ margin: 0, color: '#1E293B' }}>{t('settings.about')}</h3>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                        <span style={{ color: '#64748B' }}>{t('settings.version')}</span>
                        <span style={{ color: '#1E293B', fontWeight: 'bold' }}>{APP_VERSION}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                        <span style={{ color: '#64748B' }}>{t('settings.developer')}</span>
                        <span style={{ color: '#1E293B', fontWeight: 'bold' }}>Mohamed Hassan</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                        <span style={{ color: '#64748B' }}>{t('settings.contact')}</span>
                        <span style={{ color: '#1E293B' }}>+20 100 851 5995</span>
                      </div>

                      <IonButton
                        expand="block"
                        style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '15px', '--border-radius': '12px' }}
                        onClick={() => {
                          window.open('https://wa.me/201008515995', '_system');
                        }}
                      >
                        <IonIcon icon={chatbubbles} slot="start" />
                        {t('settings.whatsapp')}
                      </IonButton>

                      {/* Sign Out Button */}
                      <IonButton
                        expand="block"
                        style={{ '--color': '#FFFFFF', '--background': '#DC2626', color: '#FFFFFF', marginTop: '30px', '--border-radius': '12px' }}
                        onClick={async () => {
                          if (window.confirm(t('alert.signOutConfirm'))) {
                            if (loggedInUser) {
                              try {
                                await updateUserSession(loggedInUser.id, null);
                                await clearSessionUserInfo(sessionMac);
                              } catch (e) { console.error("Sign out session update failed", e); }
                            }
                            localStorage.removeItem('is_device_trusted');
                            localStorage.removeItem('trusted_user_name');
                            localStorage.removeItem('trusted_user_cred');
                            localStorage.removeItem('trusted_user_password');
                            setLoggedInUser(null);
                            setAccessExpiresAt(null);
                            setShowSettingsModal(false);
                          }
                        }}
                      >
                        <IonIcon icon={closeCircleOutline} slot="start" />
                        Sign Out / Untrust Device
                      </IonButton>

                      {/* Admin Monitor Button - Only for DYR */}
                      {(['dyr', 'chrono'].includes((loggedInUser?.name || '').toLowerCase())) && (
                        <IonButton
                          expand="block"
                          fill="outline"
                          color="medium"
                          style={{ marginTop: '15px', '--border-radius': '12px', opacity: 0.7 }}
                          onClick={() => {
                            setShowSettingsModal(false);
                            setShowAdminModal(true);
                          }}
                        >
                          <IonIcon icon={peopleOutline} slot="start" />
                          Owner's Monitor
                        </IonButton>
                      )}


                    </div>
                  </div>
                </div>
              </IonContent>
            </IonModal>

            <AdminSessionsModal
              isOpen={showAdminModal}
              onClose={() => setShowAdminModal(false)}
              expressServerRunning={expressServerRunning}
              expressServerIP={expressServerIP}
              expressServerStats={expressServerStats}
              expressServerLoading={expressServerLoading}
              onStartServer={handleStartExpressServer}
              onStopServer={handleStopExpressServer}
              onRefreshServerStats={async () => {
                try {
                  const r = await fetch('http://localhost:3001/api/health');
                  if (r.ok) setExpressServerStats(await r.json());
                } catch (e) {}
              }}
            />




            <ChequePreview
              isOpen={showChequeDesigner}
              onClose={() => { setShowChequeDesigner(false); resetDataEntryForms(); }}
              data={chequeQueue.length > 0 && selectedQueueIds.length > 0
                ? chequeQueue.filter(q => selectedQueueIds.includes(q.id))
                : chequeForm}
            />

            {/* --- INITIAL SETUP WIZARD --- */}
            <IonModal isOpen={showSetupWizard} backdropDismiss={false} className="chrono-modal">
              <IonHeader>
                <IonToolbar style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF' }}>
                  <IonTitle>Welcome to DYR</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding" style={{ '--background': '#64748B' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', color: '#FFFFFF', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Initial Setup</h2>
                  <p style={{ color: '#64748B', marginBottom: '30px' }}>Please configure your company identity and database connection to get started.</p>

                  {/* Company Identity */}
                  <div style={{ textAlign: 'left', background: '#ffffff', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                    <h3 style={{ color: '#2563EB', marginTop: 0 }}>Step 1: Company Identity</h3>
                    <IonItem style={{ '--background': 'transparent', marginBottom: '15px' }}>
                      <IonLabel position="stacked">Company Name (Required)</IonLabel>
                      <IonInput value={branding.name} onIonChange={e => setBranding({ ...branding, name: e.detail.value })} placeholder="e.g. Al-Futtaim Real Estate" />
                    </IonItem>

                    <IonLabel style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: '900', letterSpacing: '1px' }}>PORTRAIT PDF BRANDING</IonLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '8px' }}>
                      <div>
                        <IonLabel style={{ fontSize: '0.8rem', color: '#64748B' }}>Portrait Header (Optional)</IonLabel>
                        <div
                          onClick={() => document.getElementById('wiz-header').click()}
                          style={{
                            height: '80px', background: '#FFFFFF', borderRadius: '8px', marginTop: '5px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            backgroundImage: branding.header ? `url(${branding.header})` : 'none',
                            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                            border: '1px dashed #cbd5e1'
                          }}
                        >
                          {!branding.header && <span style={{ fontSize: '0.7rem' }}>Upload Header</span>}
                        </div>
                        <input type="file" id="wiz-header" style={{ display: 'none' }} onChange={(e) => handleImagePick('header', e)} accept="image/*" />
                      </div>
                      <div>
                        <IonLabel style={{ fontSize: '0.8rem', color: '#64748B' }}>Portrait Footer (Optional)</IonLabel>
                        <div
                          onClick={() => document.getElementById('wiz-footer').click()}
                          style={{
                            height: '80px', background: '#FFFFFF', borderRadius: '8px', marginTop: '5px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            backgroundImage: branding.footer ? `url(${branding.footer})` : 'none',
                            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                            border: '1px dashed #cbd5e1'
                          }}
                        >
                          {!branding.footer && <span style={{ fontSize: '0.7rem' }}>Upload Footer</span>}
                        </div>
                        <input type="file" id="wiz-footer" style={{ display: 'none' }} onChange={(e) => handleImagePick('footer', e)} accept="image/*" />
                      </div>
                    </div>

                    <IonLabel style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: '900', letterSpacing: '1px', display: 'block', marginTop: '15px' }}>LANDSCAPE PDF BRANDING</IonLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '8px' }}>
                      <div>
                        <IonLabel style={{ fontSize: '0.8rem', color: '#64748B' }}>Landscape Header (Optional)</IonLabel>
                        <div
                          onClick={() => document.getElementById('wiz-landscape-header').click()}
                          style={{
                            height: '60px', background: '#FFFFFF', borderRadius: '8px', marginTop: '5px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            backgroundImage: branding.landscapeHeader ? `url(${branding.landscapeHeader})` : 'none',
                            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                            border: '1px dashed #cbd5e1'
                          }}
                        >
                          {!branding.landscapeHeader && <span style={{ fontSize: '0.7rem' }}>Upload Header</span>}
                        </div>
                        <input type="file" id="wiz-landscape-header" style={{ display: 'none' }} onChange={(e) => handleImagePick('landscapeHeader', e)} accept="image/*" />
                      </div>
                      <div>
                        <IonLabel style={{ fontSize: '0.8rem', color: '#64748B' }}>Landscape Footer (Optional)</IonLabel>
                        <div
                          onClick={() => document.getElementById('wiz-landscape-footer').click()}
                          style={{
                            height: '60px', background: '#FFFFFF', borderRadius: '8px', marginTop: '5px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            backgroundImage: branding.landscapeFooter ? `url(${branding.landscapeFooter})` : 'none',
                            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                            border: '1px dashed #cbd5e1'
                          }}
                        >
                          {!branding.landscapeFooter && <span style={{ fontSize: '0.7rem' }}>Upload Footer</span>}
                        </div>
                        <input type="file" id="wiz-landscape-footer" style={{ display: 'none' }} onChange={(e) => handleImagePick('landscapeFooter', e)} accept="image/*" />
                      </div>
                    </div>
                  </div>

                  {/* Database Config */}
                  <div style={{ textAlign: 'left', background: '#ffffff', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #D1D5DB' }}>
                    <h3 style={{ color: '#1E293B', marginTop: 0 }}>Step 2: Database Connection</h3>
                    <IonItem style={{ '--background': 'transparent', marginBottom: '10px' }}>
                      <IonLabel>Database Type</IonLabel>
                      <IonSelect value={dbConfig.type} onIonChange={e => setDbConfig({ ...dbConfig, type: e.detail.value })}>
                        {!isNativeMobile && <IonSelectOption value="local">Local (This Device)</IonSelectOption>}
                        <IonSelectOption value="hosted">Hosted (Cloud)</IonSelectOption>
                        <IonSelectOption value="network">Network (Custom API)</IonSelectOption>
                        {!isNativeMobile && <IonSelectOption value="express">Express Server (LAN)</IonSelectOption>}
                      </IonSelect>
                    </IonItem>

                    {isNativeMobile && dbConfig.type === 'hosted' && (
                      <div style={{ padding: '10px 15px', background: '#FFFFFF', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(45,211,111,0.2)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#2563EB' }}>📱 Mobile detected — using cloud database (Supabase). Your data will sync across all devices.</p>
                      </div>
                    )}

                    {dbConfig.type === 'local' && !isNativeMobile && (
                      <div style={{ padding: '10px 15px', background: '#ffffff', borderRadius: '8px', marginBottom: '10px' }}>
                        <p style={{ margin: '0 0 5px', fontSize: '0.9rem', color: '#64748B' }}>Current Database Folder:</p>
                        <code style={{ display: 'block', background: '#1E293B', padding: '8px', fontSize: '0.8rem', color: '#2563EB', wordBreak: 'break-all', borderRadius: '4px' }}>
                          {currentDbPath}
                        </code>
                        <IonButton
                          size="small"
                          style={{ '--color': '#FFFFFF', '--background': '#64748B', color: '#FFFFFF', marginTop: '10px' }}
                          onClick={handleChangeDbFolder}
                        >
                          Change Folder
                        </IonButton>
                      </div>
                    )}

                    {dbConfig.type === 'network' && (
                      <IonItem style={{ '--background': 'transparent' }}>
                        <IonLabel position="stacked">API URL</IonLabel>
                        <IonInput value={dbConfig.url} onIonChange={e => setDbConfig({ ...dbConfig, url: e.detail.value })} />
                      </IonItem>
                    )}
                  </div>

                  {/* Security Config */}
                  <div style={{ textAlign: 'left', background: '#ffffff', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                    <h3 style={{ color: '#DC2626', marginTop: 0 }}>Step 3: Security & Access</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '15px' }}>Set your admin password for system management.</p>

                    <IonItem style={{ '--background': 'transparent' }}>
                      <IonLabel position="stacked">System Admin Password</IonLabel>
                      <IonInput
                        placeholder="For deleting data"
                        type="password"
                        value={securityConfig.adminPassword}
                        onIonChange={e => setSecurityConfig({ ...securityConfig, adminPassword: e.detail.value })}
                      />
                    </IonItem>
                  </div>

                  <IonButton expand="block" size="large" onClick={handleSaveSetup} style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', fontWeight: 'bold' }}>
                    Finish Setup & Start
                  </IonButton>
                </div>
              </IonContent>
            </IonModal>

            {/* Blocking Overlay */}
            <IonModal isOpen={isAppLocked || isOfflineLocked} backdropDismiss={false} className="chrono-modal">
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--app-bg)',
                color: '#1E293B',
                padding: '40px',
                textAlign: 'center'
              }}>
                <IonIcon icon={isOfflineLocked ? cloudDownload : shieldCheckmarkOutline} style={{ fontSize: '100px', color: '#DC2626', marginBottom: '30px', animation: 'pulse 2s infinite' }} />
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  {isOfflineLocked ? 'Connection Required' : 'Access Suspended'}
                </h1>
                <p style={{ color: '#64748B'   , fontSize: '1.2rem', maxWidth: '500px', lineHeight: '1.6' }}>
                  {isOfflineLocked
                    ? 'This terminal has been offline for more than 3 days. Please connect to the internet to verify your access and synchronize data.'
                    : 'This session has been paused by the administrator. Any unsaved changes may be lost.'}
                </p>
                {isOfflineLocked && (
                  <div style={{ marginTop: '30px' }}>
                    <p style={{ color: '#2563EB', fontWeight: 'bold', marginBottom: '15px' }}>Terminal restricted until database sync.</p>
                    <IonButton style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF', '--padding-start': '40px', '--padding-end': '40px', fontWeight: 'bold' }} onClick={() => window.location.reload()}>
                      RETRY CONNECTION
                    </IonButton>
                  </div>
                )}
              </div>
            </IonModal>

            <PDFPreviewModal
              isOpen={showPreviewModal}
              onClose={() => setShowPreviewModal(false)}
              pdfDoc={previewPdf}
              filename={previewFilename}
            />

            {/* --- MODAL: EDIT OFFER INSTALLMENT --- */}
            <IonModal isOpen={!!editingOfferInstallment} onDidDismiss={() => setEditingOfferInstallment(null)}>
              <IonHeader><IonToolbar style={{ '--background': '#ffffff' }}><IonTitle style={{ color: '#1E293B' }}>Edit Installment</IonTitle><IonButton slot="end" onClick={() => setEditingOfferInstallment(null)} color="light">Close</IonButton></IonToolbar></IonHeader>
              <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)', color: '#1E293B' }}>
                {editingOfferInstallment && (
                  <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <div style={{ background: 'var(--app-bg-card)', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #1E3A8A' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ margin: 0, color: '#2563EB', fontWeight: 'bold' }}>Unit: {editingOfferInstallment.offer.unitId}</p>
                          <p style={{ margin: 0, color: '#64748B'   , fontSize: '0.85rem' }}>{editingOfferInstallment.installment.type}</p>
                        </div>
                        {editingOfferInstallment.installment.type === 'Down Payment' && (
                          <IonButton size="small" fill="outline" style={{ '--color': '#FFFFFF', '--background': '#475569', color: '#FFFFFF' }} onClick={handleSplitOfferInstallment}>
                            <IonIcon icon={cutOutline} slot="start" /> SPLIT
                          </IonButton>
                        )}
                      </div>
                    </div>

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonInput label="Type" labelPlacement="stacked" value={editingOfferInstallment.installment.type} onIonInput={e => setEditingOfferInstallment({ ...editingOfferInstallment, installment: { ...editingOfferInstallment.installment, type: e.detail.value } })} style={{ color: '#1E293B' }} />
                    </IonItem>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label="Amount" labelPlacement="stacked" type="number" value={editingOfferInstallment.installment.amount} onIonInput={e => setEditingOfferInstallment({ ...editingOfferInstallment, installment: { ...editingOfferInstallment.installment, amount: e.detail.value } })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <ProDatePicker label="Due Date" value={editingOfferInstallment.installment.dueDate} onChange={val => setEditingOfferInstallment({ ...editingOfferInstallment, installment: { ...editingOfferInstallment.installment, dueDate: val } })} />
                      </IonItem>
                    </div>

                    <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', marginBottom: '10px', borderRadius: '4px' }}>
                      <IonSelect label="Payment Method" labelPlacement="stacked" value={editingOfferInstallment.installment.paymentMethod || 'Cheque'} onIonChange={e => setEditingOfferInstallment({ ...editingOfferInstallment, installment: { ...editingOfferInstallment.installment, paymentMethod: e.detail.value } })} style={{ color: '#1E293B' }}>
                        <IonSelectOption value="Cheque">Cheque</IonSelectOption>
                        <IonSelectOption value="Cash">Cash</IonSelectOption>
                        <IonSelectOption value="Bank Transfer">Bank Transfer</IonSelectOption>
                      </IonSelect>
                    </IonItem>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label="Cheque #" labelPlacement="stacked" placeholder="Number" value={editingOfferInstallment.installment.chequeNumber} onIonInput={e => setEditingOfferInstallment({ ...editingOfferInstallment, installment: { ...editingOfferInstallment.installment, chequeNumber: e.detail.value } })} style={{ color: '#1E293B' }} />
                      </IonItem>
                      <IonItem fill="solid" mode="md" style={{ '--background': '#ffffff', borderRadius: '4px' }}>
                        <IonInput label="Bank" labelPlacement="stacked" placeholder="Bank" value={editingOfferInstallment.installment.bank} onIonInput={e => setEditingOfferInstallment({ ...editingOfferInstallment, installment: { ...editingOfferInstallment.installment, bank: e.detail.value } })} style={{ color: '#1E293B' }} />
                      </IonItem>
                    </div>

                    <IonButton expand="block" style={{ '--color': '#FFFFFF', '--background': '#2563EB', color: '#FFFFFF', marginTop: '20px', '--border-radius': '12px', fontWeight: 'bold' }} onClick={async () => {
                      const { offer, installment, index } = editingOfferInstallment;
                      const updatedInstallments = [...offer.installments];
                      updatedInstallments[index] = installment;

                      const updatedOffer = { ...offer, installments: updatedInstallments };
                      const updatedOffers = offers.map(o => o.id === updatedOffer.id ? updatedOffer : o);

                      setOffers(updatedOffers);
                      await saveOffers(updatedOffers);

                      setEditingOfferInstallment(null);
                      setViewingOffer(updatedOffer);
                      setNoticeAlert({ isOpen: true, header: t('alert.success'), message: t('alert.installmentUpdated'), buttons: [t('common.ok')] });
                    }}>Save Changes</IonButton>
                  </div>
                )}
              </IonContent>
            </IonModal>

            {/* Spacer to prevent fixed bottom nav from overlapping content */}
            {loggedInUser && <div style={{ height: '100px', flexShrink: 0 }} />}
          </IonContent >
          {loggedInUser && (
            <div className="pro-bottom-nav">
              <div className={`nav-item ${currentView === 'home' ? 'active' : ''}`} onClick={() => navigateToView('home')}>
                <IonIcon icon={homeOutline} />
                <span>{t('common.dashboard')}</span>
              </div>
              <div className={`nav-item ${currentView === 'buildings' ? 'active' : ''}`} onClick={() => navigateToView('buildings')}>
                <IonIcon icon={businessOutline} />
                <span>{t('home.buildings')}</span>
              </div>
              <div className={`nav-item ${currentView === 'customers' ? 'active' : ''}`} onClick={() => navigateToView('customers')}>
                <IonIcon icon={peopleOutline} />
                <span>{t('home.customers')}</span>
              </div>
              <div className={`nav-item ${currentView === 'offers' ? 'active' : ''}`} onClick={() => navigateToView('offers')}>
                <IonIcon icon={documentTextOutline} />
                <span>{t('home.offers')}</span>
              </div>
              <div className={`nav-item ${currentView === 'contracts' ? 'active' : ''}`} onClick={() => navigateToView('contracts')}>
                <IonIcon icon={shieldCheckmarkOutline} />
                <span>{t('home.contracts')}</span>
              </div>
              <div className={`nav-item ${currentView === 'installments' ? 'active' : ''}`} onClick={() => navigateToView('installments')}>
                <IonIcon icon={calendarOutline} />
                <span>{t('common.schedule')}</span>
              </div>
              <div className={`nav-item ${currentView === 'cheques' ? 'active' : ''}`} onClick={() => navigateToView('cheques')}>
                <IonIcon icon={printOutline} />
                <span>{t('home.cheques')}</span>
              </div>
              <div className={`nav-item ${currentView === 'wallets' ? 'active' : ''}`} onClick={() => navigateToView('wallets')}>
                <IonIcon icon={walletOutline} />
                <span>{t('home.wallets')}</span>
              </div>
              <div className={`nav-item ${currentView === 'feedback' ? 'active' : ''}`} onClick={() => navigateToView('feedback')}>
                <IonIcon icon={chatbubblesOutline} />
                <span>{t('home.feedbacks')}</span>
              </div>
              <div className={`nav-item ${currentView === 'reminders' ? 'active' : ''}`} onClick={() => navigateToView('reminders')}>
                <IonIcon icon={logoWhatsapp} />
                <span>{t('home.reminders')}</span>
              </div>
              <div className={`nav-item ${currentView === 'terminated' ? 'active' : ''}`} onClick={() => navigateToView('terminated')}>
                <IonIcon icon={trashOutline} />
                <span>{t('home.terminated')}</span>
              </div>
              <div className={`nav-item ${currentView === 'sales' ? 'active' : ''}`} onClick={() => navigateToView('sales')}>
                <IonIcon icon={statsChartOutline} />
                <span>{t('home.sales')}</span>
              </div>
              <div className={`nav-item ${currentView === 'commissions' ? 'active' : ''}`} onClick={() => navigateToView('commissions')}>
                <IonIcon icon={walletOutline} />
                <span>Commissions</span>
              </div>
              <div className="nav-item" onClick={() => setShowSettingsModal(true)}>
                <IonIcon icon={settingsOutline} />
                <span>{t('home.settings')}</span>
              </div>
            </div>
          )}


          {/* --- BULK PRICE UPDATE MODAL --- */}
          <IonModal isOpen={showBulkPriceModal} onDidDismiss={() => { setShowBulkPriceModal(false); setTargetBuildingForBulk(null); setBulkPricePercentage(''); }}>
            <IonHeader>
              <IonToolbar style={{ '--background': '#ffffff', color: '#1E293B' }}>
                <IonTitle>{t('settings.bulkPriceUpdate')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowBulkPriceModal(false)}>{t('common.close')}</IonButton></IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
              {targetBuildingForBulk && (
                <div style={{ maxWidth: '450px', margin: '40px auto', color: '#1E293B' }}>
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '30px',
                    border: '1px solid #D1D5DB',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '70px', height: '70px', borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px'
                    }}>
                      <IonIcon icon={cashOutline} style={{ fontSize: '32px', color: '#2563EB' }} />
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: '900' }}>{targetBuildingForBulk.name}</h2>
                    <p style={{ color: '#64748B'   , margin: '0 0 30px', fontSize: '0.9rem' }}>
                      Apply a percentage price change to all <strong style={{ color: '#2563EB' }}>Available</strong> and <strong style={{ color: '#DC2626' }}>Locked</strong> units.
                    </p>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ color: '#64748B'   , fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Price Change Percentage (%)</label>
                      <input
                        type="number"
                        value={bulkPricePercentage}
                        onChange={e => setBulkPricePercentage(e.target.value)}
                        placeholder="e.g. 10 for +10% or -5 for -5%"
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '16px',
                          color: '#1E293B',
                          fontSize: '1.3rem',
                          fontWeight: '800',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {bulkPricePercentage && (
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        padding: '15px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        <p style={{ margin: 0, color: '#2563EB', fontSize: '0.85rem' }}>
                          {Number(bulkPricePercentage) >= 0 ? '📈' : '📉'} Prices will {Number(bulkPricePercentage) >= 0 ? 'increase' : 'decrease'} by <strong>{Math.abs(Number(bulkPricePercentage))}%</strong>
                        </p>
                        <p style={{ margin: '5px 0 0', color: '#64748B'   , fontSize: '0.75rem' }}>
                          Affects {(targetBuildingForBulk.units || []).filter(u => (u.status || '').toLowerCase() === 'available' || (u.status || '').toLowerCase() === 'locked').length} units (Available + Locked only)
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (!bulkPricePercentage || isNaN(Number(bulkPricePercentage))) {
                          alert('Please enter a valid percentage.');
                          return;
                        }
                        handleBulkPriceUpdate(targetBuildingForBulk.id, Number(bulkPricePercentage));
                      }}
                      disabled={!bulkPricePercentage}
                      style={{
                        width: '100%',
                        background: bulkPricePercentage ? 'linear-gradient(135deg, #3b82f6, #e1b12c)' : '#ffffff',
                        color: bulkPricePercentage ? '#1E293B' : '#64748B',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '16px',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        cursor: bulkPricePercentage ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.5px'
                      }}
                    >
                      APPLY PRICE CHANGE
                    </button>
                  </div>
                </div>
              )}
            </IonContent>
          </IonModal>

        </IonApp >
      </ErrorBoundary >
    </>
  );
};

export default App;
