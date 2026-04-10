import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonContent, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonBadge
} from '@ionic/react';
import {
  add, cashOutline, settingsOutline, searchOutline, chevronBack,
  businessOutline, personAddOutline, checkmarkCircleOutline, timeOutline,
  trashOutline, walletOutline, createOutline, closeCircleOutline, printOutline, documentAttach
} from 'ionicons/icons';
import {
  getBrokers, addBroker, updateBroker, deleteBroker, getNextBrokerCode, getNextAgentCode,
  getCommissions, addCommission, deleteCommission, updateCommission, addCommissionPayment, deleteCommissionPayment, updateCommissionPayment, checkAndActivateCommission,
  getCommissionSettings, saveCommissionSettings,
  getSales, addSales, updateSales, deleteSales, formatCurrency
} from '../services/DataService';
import { generateCommissionReceiptPDF } from '../helpers/CommissionReceiptGenerator';
import PDFPreviewModal from './PDFPreviewModal';

const CommissionsView = ({ sales, setSales, contracts, offers, customers, buildings, t, onBack, navigateToView }) => {
  const [commissions, setCommissions] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [settings, setSettings] = useState({ defaultRate: 3, activationThreshold: 8, brokerStartCode: 90000, brokerCodeStep: 1000 });
  const [activeTab, setActiveTab] = useState('commissions'); // 'commissions' | 'brokers'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCommission, setViewingCommission] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddBrokerModal, setShowAddBrokerModal] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: '', paymentMethod: 'CASH', notes: '', bank: '', chequeNumber: '', chequeDate: '' });
  const [previewPdf, setPreviewPdf] = useState(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAttachFile, setSelectedAttachFile] = useState(null);
  const commAttachRef = useRef(null);
  const paymentAttachInputRef = useRef(null);
  const [brokerForm, setBrokerForm] = useState({ id: '', name: '', phone: '', email: '', address: '', commissionRate: 3 });
  const [agentForm, setAgentForm] = useState({ id: '', name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [expandedBroker, setExpandedBroker] = useState(null);
  const [editingBroker, setEditingBroker] = useState(null); // broker being edited
  const [showEditBrokerModal, setShowEditBrokerModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null); // agent being edited
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [editAgentForm, setEditAgentForm] = useState({ id: '', name: '', phone: '', email: '', commissionRate: '' });
  const [showAddCommissionModal, setShowAddCommissionModal] = useState(false);
  const [manualCommForm, setManualCommForm] = useState({ contractId: '', salesId: '', commissionRate: '', commissionAmount: '' });
  const [commContractSearch, setCommContractSearch] = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [showEditCommModal, setShowEditCommModal] = useState(false);
  const [editCommForm, setEditCommForm] = useState({ commissionRate: '', commissionAmount: '', salesId: '' });
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [c, b, s] = await Promise.all([getCommissions(), getBrokers(), getCommissionSettings()]);
      setCommissions(c);
      setBrokers(b);
      setSettings(s);
    } catch (e) { console.error('Failed to load commissions data:', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ESC key handler - close modals first, then go back to list
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      // If any modal is open, close it and stop propagation
      if (showPaymentModal) {
        e.stopPropagation(); e.preventDefault();
        setShowPaymentModal(false); setEditingPayment(null);
        return;
      }
      if (showEditCommModal) {
        e.stopPropagation(); e.preventDefault();
        setShowEditCommModal(false);
        return;
      }
      if (showPreviewModal) {
        e.stopPropagation(); e.preventDefault();
        setShowPreviewModal(false);
        return;
      }
      // If viewing commission detail, go back to list
      if (viewingCommission) {
        e.stopPropagation(); e.preventDefault();
        setViewingCommission(null);
        return;
      }
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [viewingCommission, showPaymentModal, showEditCommModal, showPreviewModal]);

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || !viewingCommission) return;
    setLoading(true);
    try {
      let updated;
      const pendingFiles = paymentForm.pendingFiles || [];

      if (editingPayment) {
        updated = await updateCommissionPayment(viewingCommission.id, editingPayment.id, {
          amount: Number(paymentForm.amount),
          date: paymentForm.date,
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          bank: paymentForm.bank || '',
          chequeNumber: paymentForm.chequeNumber || '',
          chequeDate: paymentForm.chequeDate || ''
        });

        // Upload new attachments
        if (pendingFiles.length > 0 && window.electronAPI) {
          const existing = editingPayment.attachments || (editingPayment.attachment ? [editingPayment.attachment] : []);
          const newNames = [...existing];
          for (const pf of pendingFiles) {
            const fname = `comm_attach_${viewingCommission.id}_${editingPayment.id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}.${pf.name.split('.').pop()}`;
            const buffer = await pf.file.arrayBuffer();
            await window.electronAPI.uploadAttachment(fname, buffer);
            newNames.push(fname);
          }
          updated = await updateCommissionPayment(viewingCommission.id, editingPayment.id, { attachments: newNames });
        }

        setEditingPayment(null);
      } else {
        updated = await addCommissionPayment(viewingCommission.id, paymentForm);

        // Upload attachments for newly created payment
        if (pendingFiles.length > 0 && window.electronAPI && updated) {
          const newPayment = (updated.payments || []).slice(-1)[0];
          if (newPayment) {
            const newNames = [];
            for (const pf of pendingFiles) {
              const fname = `comm_attach_${viewingCommission.id}_${newPayment.id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}.${pf.name.split('.').pop()}`;
              const buffer = await pf.file.arrayBuffer();
              await window.electronAPI.uploadAttachment(fname, buffer);
              newNames.push(fname);
            }
            updated = await updateCommissionPayment(viewingCommission.id, newPayment.id, { attachments: newNames });
          }
        }
      }
      setViewingCommission(updated);
      setCommissions(await getCommissions());
      setPaymentForm({ amount: '', date: '', paymentMethod: 'CASH', notes: '', bank: '', chequeNumber: '', chequeDate: '', pendingFiles: [] });
      setShowPaymentModal(false);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!viewingCommission) return;
    try {
      const updated = await deleteCommissionPayment(viewingCommission.id, paymentId);
      setViewingCommission(updated);
      setCommissions(await getCommissions());
    } catch (e) { alert(e.message); }
  };

  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const generateCommissionReceipt = async (payment, commissionOverride) => {
    const comm = commissionOverride || viewingCommission;
    if (!comm || generatingReceipt) return;
    setGeneratingReceipt(true);
    try {
      // Look up the linked contract - try contractId first, then match by unitId
      const contract = (comm.contractId ? contracts.find(c => String(c.id).trim() === String(comm.contractId).trim()) : null)
        || contracts.find(c => comm.unitId && String(c.unitId).trim() === String(comm.unitId).trim() && c.status !== 'Terminated');
      // Look up the linked offer
      const offer = comm.unitId ? offers.find(o => 
        o.unitId && String(o.unitId).trim() === String(comm.unitId).trim()
      ) : null;
      // Look up the sales agent
      const agent = comm.salesId ? sales.find(s => String(s.id) === String(comm.salesId)) : null;
      // Look up the broker
      const broker = agent?.brokerId ? brokers.find(b => String(b.id) === String(agent.brokerId)) : null;

      // Resolve joint purchasers names
      const jpNames = (contract?.jointPurchasers || []).map(jp => {
        if (typeof jp === 'string') return jp;
        const jpId = jp.id || jp;
        const jpCustomer = (customers || []).find(c => String(c.id) === String(jpId));
        return jpCustomer?.name || jp.name || jpId || '-';
      });

      // Resolve guarantor name
      let guarantorName = '';
      if (contract?.guarantor) {
        const gId = typeof contract.guarantor === 'string' ? contract.guarantor : contract.guarantor.id;
        const gCustomer = (customers || []).find(c => String(c.id) === String(gId));
        guarantorName = gCustomer?.name || contract.guarantor.name || gId || '';
      }

      const receiptData = {
        // Broker / Agent
        brokerName: broker?.name || '-',
        salesName: comm.salesName || agent?.name || '-',
        commissionRate: comm.commissionRate,
        // Unit & Contract
        unitId: comm.unitId || '-',
        customerName: (() => {
          const cId = contract?.customerId || comm.customerId;
          if (cId) {
            const cust = (customers || []).find(c => String(c.id) === String(cId));
            if (cust?.name) return cust.name;
          }
          return contract?.customerName || comm.customerName || '-';
        })(),
        jointPurchasers: jpNames,
        guarantor: guarantorName,
        contractTotal: comm.totalContractPrice || contract?.totalPrice || 0,
        offerDate: offer?.date || offer?.createdAt?.split('T')[0] || '',
        contractDate: contract?.contractDate || contract?.date || contract?.createdAt?.split('T')[0] || '-',
        // Commission financials
        commissionAmount: comm.commissionAmount || 0,
        totalPaid: comm.totalPaid || 0,
        currentPayoutAmount: payment.amount || 0,
        payoutDate: payment.date,
        paymentMethod: payment.paymentMethod || 'CASH',
        bank: payment.bank || '',
        chequeNumber: payment.chequeNumber || '',
        chequeDate: payment.chequeDate || '',
        payments: comm.payments || [],
        receiptSerial: `COM-${comm.unitId || 'X'}-${payment.id}`
      };

      // Small delay to let UI update with loading state
      await new Promise(r => setTimeout(r, 50));
      const doc = await generateCommissionReceiptPDF(receiptData);
      setPreviewPdf(doc);
      setPreviewFilename(`Commission_Receipt_${comm.salesName}_${payment.date}.pdf`);
      setShowPreviewModal(true);
    } catch (e) {
      console.error('Receipt error:', e);
      alert('Failed to generate receipt: ' + e.message);
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveCommissionSettings(settings);
      setShowSettingsModal(false);
    } catch (e) { alert(e.message); }
  };

  const handleAddBroker = async () => {
    if (!brokerForm.name) return;
    setLoading(true);
    try {
      await addBroker(brokerForm);
      setBrokers(await getBrokers());
      setShowAddBrokerModal(false);
      setBrokerForm({ id: '', name: '', phone: '', email: '', address: '', commissionRate: settings.defaultRate });
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleEditBroker = async () => {
    if (!brokerForm.name || !editingBroker) return;
    setLoading(true);
    try {
      // If ID changed, we need to delete old and create new
      if (String(brokerForm.id) !== String(editingBroker.id)) {
        // Update all agents under old broker to new broker id
        const agentsUnder = sales.filter(s => String(s.brokerId) === String(editingBroker.id));
        for (const a of agentsUnder) {
          await updateSales(a.id, { brokerId: brokerForm.id });
        }
        await deleteBroker(editingBroker.id).catch(() => {});
        await addBroker({ ...brokerForm, createdAt: editingBroker.createdAt });
      } else {
        await updateBroker(editingBroker.id, { name: brokerForm.name, phone: brokerForm.phone, email: brokerForm.email, address: brokerForm.address, commissionRate: brokerForm.commissionRate });
      }
      setBrokers(await getBrokers());
      setSales(await getSales());
      setShowEditBrokerModal(false);
      setEditingBroker(null);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleDeleteBroker = async (broker) => {
    const agents = sales.filter(s => String(s.brokerId) === String(broker.id));
    const msg = agents.length > 0
      ? `Delete "${broker.name}" and its ${agents.length} agent(s)?\n\nAgents will become independent (unlinked from broker).`
      : `Delete broker "${broker.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      // Unlink agents first
      for (const a of agents) {
        await updateSales(a.id, { brokerId: '' });
      }
      await deleteBroker(broker.id).catch(() => {});
      // Force delete from brokers list if deleteBroker threw because of agents check
      setBrokers(await getBrokers());
      setSales(await getSales());
    } catch (e) { alert(e.message); }
  };

  const handleAddAgentUnderBroker = async () => {
    if (!agentForm.name || !selectedBroker) return;
    setLoading(true);
    try {
      await addSales({ ...agentForm, brokerId: selectedBroker.id, commissionRate: selectedBroker.commissionRate });
      setSales(await getSales());
      setShowAddAgentModal(false);
      setAgentForm({ id: '', name: '', phone: '', email: '' });
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleEditAgent = async () => {
    if (!editAgentForm.name || !editingAgent) return;
    setLoading(true);
    try {
      if (String(editAgentForm.id) !== String(editingAgent.id)) {
        // ID changed: delete old, create new with same data
        await deleteSales(editingAgent.id);
        await addSales({ ...editAgentForm, brokerId: editingAgent.brokerId, createdAt: editingAgent.createdAt });
      } else {
        await updateSales(editingAgent.id, { name: editAgentForm.name, phone: editAgentForm.phone, email: editAgentForm.email, commissionRate: editAgentForm.commissionRate ? Number(editAgentForm.commissionRate) : null });
      }
      setSales(await getSales());
      setShowEditAgentModal(false);
      setEditingAgent(null);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleDeleteAgent = async (agent) => {
    if (!window.confirm(`Delete agent "${agent.name}" (#${agent.id})?`)) return;
    try {
      await deleteSales(agent.id);
      setSales(await getSales());
    } catch (e) { alert(e.message); }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'paid': return '#2dd36f';
      case 'partial': return '#ffc409';
      default: return '#94A3B8';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'paid': return 'PAID';
      case 'partial': return 'PARTIAL';
      default: return 'PENDING';
    }
  };

  // Build a set of unitIds per building for fast lookup
  const buildingUnitMap = useMemo(() => {
    const map = {};
    (buildings || []).forEach(b => {
      const unitIds = new Set((b.units || []).map(u => String(u.unitId)));
      map[b.id] = { name: b.name, unitIds };
    });
    return map;
  }, [buildings]);

  const filteredCommissions = commissions.filter(c => {
    // Text search
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (c.salesName || '').toLowerCase().includes(q) ||
      (c.unitId || '').toLowerCase().includes(q) ||
      (c.contractId || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // Building filter
    if (buildingFilter !== 'all') {
      const bData = buildingUnitMap[buildingFilter];
      if (bData && !bData.unitIds.has(String(c.unitId))) return false;
    }

    // Date range filter (by offer start date)
    if (dateFrom || dateTo) {
      const offer = offers.find(o => o.unitId && String(o.unitId).trim() === String(c.unitId).trim());
      const offerDateStr = offer?.date || offer?.createdAt;
      if (!offerDateStr) return false;
      const offerDate = new Date(offerDateStr);
      if (isNaN(offerDate.getTime())) return false;
      offerDate.setHours(0, 0, 0, 0);
      if (dateFrom) {
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        if (offerDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        if (offerDate > to) return false;
      }
    }

    return true;
  });

  // Group agents by broker
  const independentAgents = sales.filter(s => !s.brokerId);
  const brokerAgentMap = {};
  brokers.forEach(b => { brokerAgentMap[b.id] = sales.filter(s => String(s.brokerId) === String(b.id)); });

  const hasActiveFilters = buildingFilter !== 'all' || dateFrom || dateTo || searchQuery;
  const statsSource = hasActiveFilters ? filteredCommissions : commissions;
  const totalCommission = statsSource.reduce((s, c) => s + c.commissionAmount, 0);
  const totalPaid = statsSource.reduce((s, c) => s + c.totalPaid, 0);
  const totalPending = totalCommission - totalPaid;

  // Commission detail view
  if (viewingCommission) {
    const progress = viewingCommission.commissionAmount > 0 ? (viewingCommission.totalPaid / viewingCommission.commissionAmount * 100) : 0;
    return (
      <div className="pro-container animate-fade-in" style={{ paddingBottom: '40px' }}>
        <div className="pro-back-button" onClick={() => setViewingCommission(null)} style={{ marginBottom: '15px' }}>
          <IonIcon icon={chevronBack} /> Back to Commissions
        </div>

        {/* Header Card */}
        <div className="pro-glass-card" style={{ padding: '24px', marginBottom: '20px', borderLeft: `4px solid ${statusColor(viewingCommission.status)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'var(--app-text)' }}>{viewingCommission.salesName}</h2>
              <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: '0.85rem' }}>Unit {viewingCommission.unitId} • {viewingCommission.customerName}</p>
              <p style={{ color: '#64748B', margin: '2px 0 0', fontSize: '0.8rem' }}>Contract: {viewingCommission.contractId}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
                background: `${statusColor(viewingCommission.status)}22`, color: statusColor(viewingCommission.status)
              }}>{statusLabel(viewingCommission.status)}</span>
              <IonButton fill="clear" size="small" style={{ '--color': '#c5a059' }} onClick={() => {
                setEditCommForm({
                  commissionRate: String(viewingCommission.commissionRate || ''),
                  commissionAmount: String(viewingCommission.commissionAmount || ''),
                  salesId: viewingCommission.salesId || ''
                });
                setShowEditCommModal(true);
              }}>
                <IonIcon icon={createOutline} />
              </IonButton>
              <IonButton fill="clear" size="small" color="danger" onClick={async () => {
                if (!window.confirm('Delete this commission? This cannot be undone.')) return;
                try {
                  await deleteCommission(viewingCommission.id);
                  setViewingCommission(null);
                  setCommissions(await getCommissions());
                } catch (e) { alert(e.message); }
              }}>
                <IonIcon icon={trashOutline} />
              </IonButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginTop: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', marginBottom: '4px' }}>CONTRACT PRICE</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--app-text)' }}>{formatCurrency(viewingCommission.totalContractPrice)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', marginBottom: '4px' }}>RATE</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: '#c5a059' }}>{viewingCommission.commissionRate}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', marginBottom: '4px' }}>COMMISSION</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: '#2dd36f' }}>{formatCurrency(viewingCommission.commissionAmount)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', marginBottom: '4px' }}>REMAINING</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: '#eb445a' }}>{formatCurrency(viewingCommission.commissionAmount - viewingCommission.totalPaid)}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginBottom: '6px' }}>
              <span>Paid: {formatCurrency(viewingCommission.totalPaid)}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? '#2dd36f' : 'linear-gradient(90deg, #c5a059, #d4af37)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        {/* Record Payment Button */}
        <IonButton
          expand="block"
          style={{ marginBottom: '20px', '--background': 'linear-gradient(135deg, #2dd36f, #10B981)', '--border-radius': '12px', height: '48px', fontWeight: '800' }}
          onClick={() => { setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'CASH', notes: '', bank: '', chequeNumber: '', chequeDate: '' }); setShowPaymentModal(true); }}
        >
          <IonIcon icon={cashOutline} slot="start" /> Record Payment
        </IonButton>

        {/* Print Full Commission Receipt */}
        {viewingCommission.payments.length > 0 && (
          <IonButton
            expand="block"
            style={{ marginBottom: '20px', '--background': 'linear-gradient(135deg, #6c5ce7, #4834d4)', '--border-radius': '12px', height: '48px', fontWeight: '800' }}
            onClick={() => generateCommissionReceipt({ amount: viewingCommission.totalPaid, date: new Date().toISOString().split('T')[0], paymentMethod: 'Summary', id: 'FULL' })}
          >
            <IonIcon icon={printOutline} slot="start" /> Print Full Commission Receipt
          </IonButton>
        )}

        {/* Payments History */}
        <div className="pro-glass-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px', color: 'var(--app-text)', fontWeight: '900', fontSize: '1rem' }}>Payment History</h3>
          {viewingCommission.payments.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', fontSize: '0.85rem' }}>No payments recorded yet.</p>
          ) : (
            viewingCommission.payments.map((p, idx) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < viewingCommission.payments.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#2dd36f', fontSize: '1rem' }}>{formatCurrency(p.amount)}</span>
                    {p.paymentMethod && <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: p.paymentMethod === 'CASH' ? 'rgba(45,211,111,0.1)' : p.paymentMethod === 'Cheque' ? 'rgba(197,160,89,0.1)' : 'rgba(56,128,255,0.1)', color: p.paymentMethod === 'CASH' ? '#2dd36f' : p.paymentMethod === 'Cheque' ? '#c5a059' : '#3880ff' }}>{p.paymentMethod}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    {p.date}
                    {p.notes && ` • ${p.notes}`}
                  </div>
                  {p.paymentMethod === 'Cheque' && (p.bank || p.chequeNumber) && (
                    <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '2px' }}>
                      {p.bank && `🏦 ${p.bank}`}{p.bank && p.chequeNumber && ' • '}{p.chequeNumber && `#${p.chequeNumber}`}{p.chequeDate && ` • ${p.chequeDate}`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <IonButton fill="clear" size="small" style={{ '--color': '#c5a059' }} onClick={() => {
                    setEditingPayment(p);
                    setPaymentForm({ amount: String(p.amount), date: p.date || '', paymentMethod: p.paymentMethod || 'CASH', notes: p.notes || '', bank: p.bank || '', chequeNumber: p.chequeNumber || '', chequeDate: p.chequeDate || '' });
                    setShowPaymentModal(true);
                  }}>
                    <IonIcon icon={createOutline} />
                  </IonButton>
                  <IonButton fill="clear" size="small" color="danger" onClick={() => handleDeletePayment(p.id)}>
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                  <IonButton fill="clear" size="small" style={{ '--color': '#6c5ce7' }} onClick={() => generateCommissionReceipt(p)}>
                    <IonIcon icon={printOutline} />
                  </IonButton>
                  {p.attachment ? (
                    <IonButton fill="clear" size="small" style={{ '--color': '#2563EB' }} onClick={async () => {
                      if (window.electronAPI) {
                        const url = await window.electronAPI.getAttachment(p.attachment);
                        if (url) window.open(url, '_blank');
                        else alert('Attachment file not found.');
                      }
                    }}>
                      <IonIcon icon={documentAttach} />
                    </IonButton>
                  ) : (
                    <IonButton fill="clear" size="small" style={{ '--color': '#94A3B8', fontSize: '0.7rem' }} onClick={() => {
                      commAttachRef.current?.setAttribute('data-payment-id', p.id);
                      commAttachRef.current?.click();
                    }}>
                      <IonIcon icon={documentAttach} />
                    </IonButton>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Hidden attachment file input */}
        <input type="file" ref={commAttachRef} accept="image/*,.pdf" style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            const paymentId = commAttachRef.current?.getAttribute('data-payment-id');
            if (!file || !paymentId || !viewingCommission) return;
            try {
              if (window.electronAPI) {
                const ext = file.name.split('.').pop();
                const fname = `ComPay_${viewingCommission.unitId}_${Date.now()}.${ext}`;
                const buffer = await file.arrayBuffer();
                await window.electronAPI.uploadAttachment(fname, buffer);
                const updated = await updateCommissionPayment(viewingCommission.id, paymentId, { attachment: fname });
                setViewingCommission(updated);
                setCommissions(await getCommissions());
              }
            } catch (err) {
              console.error('Attachment error:', err);
              alert('Failed to upload attachment.');
            }
            e.target.value = '';
          }}
        />

        {/* Payment Modal */}
        <IonModal isOpen={showPaymentModal} onDidDismiss={() => { setShowPaymentModal(false); setEditingPayment(null); }}>
          <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
            <IonTitle>{editingPayment ? 'Edit Commission Payment' : 'Record Commission Payment'}</IonTitle>
            <IonButtons slot="end"><IonButton onClick={() => { setShowPaymentModal(false); setEditingPayment(null); }} color="light">Close</IonButton></IonButtons>
          </IonToolbar></IonHeader>
          <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '20px' }}
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
                      setPaymentForm(prev => ({ ...prev, pendingFiles: [...(prev.pendingFiles || []), ...newPending] }));
                    }
                  };
                  reader.readAsDataURL(file);
                });
              }}>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Amount *</label>
                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} placeholder="0" />
              </div>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Date</label>
                <input type="text" placeholder="DD/MM/YYYY" maxLength={10}
                  value={(() => { const v = paymentForm.date; if (v && v.includes('-') && v.length === 10) { const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`; } return v || ''; })()}
                  onChange={e => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > 8) raw = raw.slice(0,8); let f = raw; if (raw.length > 2) f = raw.slice(0,2)+'/'+raw.slice(2); if (raw.length > 4) f = f.slice(0,5)+'/'+raw.slice(4); if (raw.length === 8) { const y=raw.slice(4,8),m=raw.slice(2,4),d=raw.slice(0,2); if(parseInt(y)>1900&&parseInt(y)<2100) setPaymentForm(prev=>({...prev, date:`${y}-${m}-${d}`})); } else { setPaymentForm(prev=>({...prev, date: f})); } }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }} />
              </div>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Payment Method</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['CASH', 'Cheque', 'Bank Transfer'].map(method => (
                    <div key={method} onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: method }))}
                      style={{
                        flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                        background: paymentForm.paymentMethod === method ? 'rgba(197,160,89,0.2)' : 'rgba(255,255,255,0.05)',
                        border: paymentForm.paymentMethod === method ? '2px solid #c5a059' : '1px solid rgba(255,255,255,0.1)',
                        color: paymentForm.paymentMethod === method ? '#c5a059' : '#94A3B8',
                        fontWeight: '800', fontSize: '0.8rem', transition: 'all 0.2s ease'
                      }}>
                      {method === 'CASH' ? '💵' : method === 'Cheque' ? '📝' : '🏦'} {method}
                    </div>
                  ))}
                </div>
              </div>
              {paymentForm.paymentMethod === 'Cheque' && (
                <div className="pro-glass-card" style={{ padding: '16px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '10px' }}>Cheque Details</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Bank Name</label>
                      <input value={paymentForm.bank} onChange={e => setPaymentForm(prev => ({ ...prev, bank: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'var(--app-text)', fontSize: '0.9rem' }} placeholder="Bank name" />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Cheque Number</label>
                      <input value={paymentForm.chequeNumber} onChange={e => setPaymentForm(prev => ({ ...prev, chequeNumber: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'var(--app-text)', fontSize: '0.9rem' }} placeholder="Cheque #" />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Cheque Date</label>
                      <input type="text" placeholder="DD/MM/YYYY" maxLength={10}
                        value={(() => { const v = paymentForm.chequeDate || paymentForm.date; if (v && v.includes('-') && v.length === 10) { const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`; } return v || ''; })()}
                        onChange={e => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > 8) raw = raw.slice(0,8); let f = raw; if (raw.length > 2) f = raw.slice(0,2)+'/'+raw.slice(2); if (raw.length > 4) f = f.slice(0,5)+'/'+raw.slice(4); if (raw.length === 8) { const y=raw.slice(4,8),m=raw.slice(2,4),d=raw.slice(0,2); if(parseInt(y)>1900&&parseInt(y)<2100) setPaymentForm(prev=>({...prev, chequeDate:`${y}-${m}-${d}`})); } else { setPaymentForm(prev=>({...prev, chequeDate: f})); } }}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'var(--app-text)', fontSize: '0.9rem' }} />
                    </div>
                  </div>
                </div>
              )}
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Notes</label>
                <input value={paymentForm.notes} onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }} placeholder="Optional note..." />
              </div>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Attachments</label>

                {/* Existing attachments (from saved payment) */}
                {(() => {
                  const existing = editingPayment?.attachments || (editingPayment?.attachment ? [editingPayment.attachment] : []);
                  if (existing.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      {existing.map((att, i) => (
                        <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(37,99,235,0.3)', background: '#0a0a0a', cursor: 'pointer' }}
                          onClick={async () => {
                            if (window.electronAPI) {
                              const url = await window.electronAPI.getAttachment(att);
                              if (url) window.open(url, '_blank');
                              else alert('File not found.');
                            }
                          }}>
                          {att.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IonIcon icon={documentAttach} style={{ fontSize: '28px', color: '#2563EB' }} />
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px' }}>
                              <IonIcon icon={documentAttach} style={{ fontSize: '24px', color: '#c5a059' }} />
                              <span style={{ fontSize: '0.5rem', color: '#94A3B8' }}>PDF</span>
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(37,99,235,0.9)', padding: '2px', textAlign: 'center', fontSize: '0.5rem', color: '#fff', fontWeight: '700' }}>VIEW</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Pending new files (previews) */}
                {(paymentForm.pendingFiles || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {paymentForm.pendingFiles.map((pf, i) => (
                      <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(197,160,89,0.3)', background: '#0a0a0a' }}>
                        {pf.preview ? (
                          <img src={pf.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px' }}>
                            <IonIcon icon={documentAttach} style={{ fontSize: '24px', color: '#c5a059' }} />
                            <span style={{ fontSize: '0.5rem', color: '#94A3B8', padding: '0 4px', textAlign: 'center', wordBreak: 'break-all' }}>{pf.name?.split('.').pop()?.toUpperCase()}</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(235,68,90,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', color: '#fff', fontWeight: '900' }}
                          onClick={() => setPaymentForm(prev => ({ ...prev, pendingFiles: prev.pendingFiles.filter((_, idx) => idx !== i) }))}>✕</div>
                      </div>
                    ))}
                  </div>
                )}

                <div onClick={() => paymentAttachInputRef.current?.click()}
                  style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#c5a059'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                  <IonIcon icon={documentAttach} style={{ fontSize: '22px', color: '#64748B', marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>Click to add images or PDFs</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '2px' }}>Multiple files accepted</div>
                </div>
                <input type="file" ref={paymentAttachInputRef} accept="image/*,.pdf" multiple style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const newPending = [];
                    let processed = 0;
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        newPending.push({ file, preview: file.type.startsWith('image/') ? reader.result : null, name: file.name });
                        processed++;
                        if (processed === files.length) {
                          setPaymentForm(prev => ({ ...prev, pendingFiles: [...(prev.pendingFiles || []), ...newPending] }));
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }} />
              </div>
              <IonButton expand="block" onClick={handleRecordPayment} disabled={!paymentForm.amount || loading}
                style={{ '--background': 'linear-gradient(135deg, #2dd36f, #10B981)', '--border-radius': '12px', height: '48px', fontWeight: '800' }}>
                {loading ? 'Saving...' : editingPayment ? 'Update Payment' : 'Confirm Payment'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Edit Commission Modal */}
        <IonModal isOpen={showEditCommModal} onDidDismiss={() => setShowEditCommModal(false)}>
          <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
            <IonTitle>Edit Commission</IonTitle>
            <IonButtons slot="end"><IonButton onClick={() => setShowEditCommModal(false)} color="light">Close</IonButton></IonButtons>
          </IonToolbar></IonHeader>
          <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '20px' }}>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Sales Agent</label>
                <select value={editCommForm.salesId} onChange={e => setEditCommForm(prev => ({ ...prev, salesId: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '0.9rem' }}>
                  <option value="">Select Agent</option>
                  {sales.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                </select>
              </div>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Rate (%)</label>
                <input type="number" value={editCommForm.commissionRate} onChange={e => {
                  const rate = e.target.value;
                  setEditCommForm(prev => ({
                    ...prev,
                    commissionRate: rate,
                    commissionAmount: String(Math.round((viewingCommission?.totalContractPrice || 0) * Number(rate) / 100))
                  }));
                }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '0.9rem' }} />
              </div>
              <div className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Amount</label>
                <input type="number" value={editCommForm.commissionAmount} onChange={e => setEditCommForm(prev => ({ ...prev, commissionAmount: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '0.9rem' }} />
              </div>
              <IonButton expand="block" disabled={loading} onClick={async () => {
                setLoading(true);
                try {
                  const agent = sales.find(s => String(s.id) === String(editCommForm.salesId));
                  const updated = await updateCommission(viewingCommission.id, {
                    commissionRate: Number(editCommForm.commissionRate),
                    commissionAmount: Number(editCommForm.commissionAmount),
                    salesId: editCommForm.salesId,
                    salesName: agent?.name || editCommForm.salesId
                  });
                  setViewingCommission(updated);
                  setCommissions(await getCommissions());
                  setShowEditCommModal(false);
                } catch (e) { alert(e.message); }
                setLoading(false);
              }}
                style={{ '--background': 'linear-gradient(135deg, #c5a059, #d4af37)', '--border-radius': '12px', height: '48px', fontWeight: '800', '--color': '#000' }}>
                {loading ? 'Saving...' : 'Update Commission'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <PDFPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          pdfDoc={previewPdf}
          filename={previewFilename}
        />
      </div>
    );
  }

  return (
    <div className="pro-container animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="pro-section-header" style={{ marginBottom: '25px' }}>
        <div className="pro-back-button" onClick={onBack} style={{ marginBottom: '10px' }}>
          <IonIcon icon={chevronBack} /> {t('common.back')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ background: 'linear-gradient(90deg, #c5a059, #d4af37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Commissions</h1>
            <p style={{ color: '#64748B', margin: '4px 0 0' }}>Track sales commissions & broker companies</p>
          </div>
          <IonButton fill="clear" onClick={() => setShowSettingsModal(true)} style={{ '--color': '#c5a059' }}>
            <IonIcon icon={settingsOutline} slot="start" /> Settings
          </IonButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div className="pro-glass-card" style={{ padding: '18px', borderTop: '3px solid #c5a059' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>TOTAL COMMISSION</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#c5a059', marginTop: '5px' }}>{formatCurrency(totalCommission)}</div>
        </div>
        <div className="pro-glass-card" style={{ padding: '18px', borderTop: '3px solid #2dd36f' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>PAID OUT</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#2dd36f', marginTop: '5px' }}>{formatCurrency(totalPaid)}</div>
        </div>
        <div className="pro-glass-card" style={{ padding: '18px', borderTop: '3px solid #eb445a' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>REMAINING</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#eb445a', marginTop: '5px' }}>{formatCurrency(totalPending)}</div>
        </div>
        <div className="pro-glass-card" style={{ padding: '18px', borderTop: '3px solid #6c5ce7' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>BROKERS</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#6c5ce7', marginTop: '5px' }}>{brokers.length}</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px' }}>
        {['commissions', 'brokers'].map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, textAlign: 'center', padding: '10px', borderRadius: '10px', cursor: 'pointer',
            background: activeTab === tab ? 'rgba(197,160,89,0.2)' : 'transparent',
            color: activeTab === tab ? '#c5a059' : '#64748B',
            fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.3s ease'
          }}>{tab === 'commissions' ? '💰 Commissions' : '🏢 Brokers'}</div>
        ))}
      </div>

      {/* COMMISSIONS TAB */}
      {activeTab === 'commissions' && (
        <>
          {/* Search + Add */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            <div className="pro-glass-card" style={{ padding: '10px 14px', flex: 1, display: 'flex', alignItems: 'center' }}>
              <IonIcon icon={searchOutline} style={{ fontSize: '18px', color: '#64748B', marginRight: '10px' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by agent, unit, contract..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--app-text)', fontSize: '0.9rem', outline: 'none' }} />
            </div>
            <IonButton onClick={() => {
              setManualCommForm({ contractId: '', salesId: '', commissionRate: settings.defaultRate, commissionAmount: '' });
              setCommContractSearch('');
              setShowAddCommissionModal(true);
            }} style={{ '--background': 'linear-gradient(135deg, #c5a059, #d4af37)', '--border-radius': '10px', height: '42px', '--color': '#000', flexShrink: 0 }}>
              <IonIcon icon={add} slot="start" /> Add
            </IonButton>
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Building</label>
              <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 12px', color: 'var(--app-text)', fontSize: '0.85rem' }}>
                <option value="all">All Buildings</option>
                {(buildings || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 150px', minWidth: '130px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>From Date</label>
              <input type="text" placeholder="DD/MM/YYYY" maxLength={10} value={(() => { const v = dateFrom; if (v && v.includes('-') && v.length === 10) { const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`; } return v || ''; })()}
                onChange={e => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > 8) raw = raw.slice(0,8); let f = raw; if (raw.length > 2) f = raw.slice(0,2)+'/'+raw.slice(2); if (raw.length > 4) f = f.slice(0,5)+'/'+raw.slice(4); if (raw.length === 8) { const y=raw.slice(4,8),m=raw.slice(2,4),d=raw.slice(0,2); if(parseInt(y)>1900&&parseInt(y)<2100) setDateFrom(`${y}-${m}-${d}`); } else if (raw.length === 0) { setDateFrom(''); } }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 12px', color: 'var(--app-text)', fontSize: '0.85rem' }} />
            </div>
            <div style={{ flex: '1 1 150px', minWidth: '130px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>To Date</label>
              <input type="text" placeholder="DD/MM/YYYY" maxLength={10} value={(() => { const v = dateTo; if (v && v.includes('-') && v.length === 10) { const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`; } return v || ''; })()}
                onChange={e => { let raw = e.target.value.replace(/\D/g, ''); if (raw.length > 8) raw = raw.slice(0,8); let f = raw; if (raw.length > 2) f = raw.slice(0,2)+'/'+raw.slice(2); if (raw.length > 4) f = f.slice(0,5)+'/'+raw.slice(4); if (raw.length === 8) { const y=raw.slice(4,8),m=raw.slice(2,4),d=raw.slice(0,2); if(parseInt(y)>1900&&parseInt(y)<2100) setDateTo(`${y}-${m}-${d}`); } else if (raw.length === 0) { setDateTo(''); } }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 12px', color: 'var(--app-text)', fontSize: '0.85rem' }} />
            </div>
            {(buildingFilter !== 'all' || dateFrom || dateTo) && (
              <IonButton fill="clear" size="small" style={{ '--color': '#eb445a', marginBottom: '2px' }}
                onClick={() => { setBuildingFilter('all'); setDateFrom(''); setDateTo(''); }}>
                Clear Filters
              </IonButton>
            )}
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="pro-glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💰</div>
              <h3 style={{ color: 'var(--app-text)', margin: 0 }}>No Commissions Yet</h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '8px 0 0' }}>
                Commissions are auto-activated when {settings.activationThreshold}% of a contract is paid.
              </p>
            </div>
          ) : (() => {
            // Group by broker
            const grouped = {};
            filteredCommissions.forEach(c => {
              const agent = sales.find(s => String(s.id) === String(c.salesId));
              const brokerId = agent?.brokerId || c.brokerId || 'NO_BROKER';
              if (!grouped[brokerId]) grouped[brokerId] = [];
              grouped[brokerId].push(c);
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(grouped).map(([brokerId, comms]) => {
                  const broker = brokers.find(b => String(b.id) === String(brokerId));
                  return (
                    <div key={brokerId}>
                      {/* Broker Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid rgba(197,160,89,0.3)' }}>
                        <IonIcon icon={businessOutline} style={{ fontSize: '18px', color: '#c5a059' }} />
                        <span style={{ fontWeight: '900', fontSize: '0.9rem', color: '#c5a059' }}>{broker?.name || 'Unassigned'}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B', marginLeft: '4px' }}>({comms.length} commission{comms.length !== 1 ? 's' : ''})</span>
                      </div>

                      {/* Commission Cards under Broker */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {comms.map(c => {
                          const progress = c.commissionAmount > 0 ? (c.totalPaid / c.commissionAmount * 100) : 0;
                          return (
                            <div key={c.id} className="pro-glass-card animate-slide-in"
                              style={{ padding: '16px', borderLeft: `4px solid ${statusColor(c.status)}`, transition: 'transform 0.2s' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setViewingCommission(c)}>
                                  <div style={{ fontWeight: '900', color: 'var(--app-text)', fontSize: '0.95rem' }}>{c.salesName}</div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Unit {c.unitId} • {c.customerName}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <IonButton fill="clear" size="small" disabled={generatingReceipt}
                                    style={{ '--color': '#6c5ce7', '--padding-start': '4px', '--padding-end': '4px' }}
                                    onClick={(e) => { e.stopPropagation(); generateCommissionReceipt({ amount: c.totalPaid, date: new Date().toISOString().split('T')[0], paymentMethod: 'Summary', id: 'FULL' }, c); }}>
                                    <IonIcon icon={printOutline} style={generatingReceipt ? { animation: 'spin 1s linear infinite' } : {}} />
                                  </IonButton>
                                  <span style={{
                                    padding: '3px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800',
                                    background: `${statusColor(c.status)}22`, color: statusColor(c.status)
                                  }}>{statusLabel(c.status)}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', cursor: 'pointer' }} onClick={() => setViewingCommission(c)}>
                                <span style={{ color: '#c5a059', fontWeight: '700' }}>{formatCurrency(c.commissionAmount)}</span>
                                <span style={{ color: '#2dd36f', fontWeight: '700' }}>Paid: {formatCurrency(c.totalPaid)}</span>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setViewingCommission(c)}>
                                <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? '#2dd36f' : '#c5a059', borderRadius: '2px' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* BROKERS TAB */}
      {activeTab === 'brokers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
            <IonButton onClick={async () => {
              const code = await getNextBrokerCode();
              setBrokerForm({ id: code, name: '', phone: '', email: '', address: '', commissionRate: settings.defaultRate });
              setShowAddBrokerModal(true);
            }} style={{ '--background': 'linear-gradient(135deg, #6c5ce7, #4834d4)', '--border-radius': '10px', height: '40px' }}>
              <IonIcon icon={businessOutline} slot="start" /> Add Broker Company
            </IonButton>
          </div>

          {/* Broker Companies */}
          {brokers.map(b => {
            const agents = brokerAgentMap[b.id] || [];
            const isExpanded = expandedBroker === b.id;
            const brokerCommissions = commissions.filter(c => c.brokerId === b.id);
            const brokerTotal = brokerCommissions.reduce((s, c) => s + c.commissionAmount, 0);

            return (
              <div key={b.id} className="pro-glass-card" style={{ marginBottom: '12px', overflow: 'hidden' }}>
                <div onClick={() => setExpandedBroker(isExpanded ? null : b.id)}
                  style={{ padding: '18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #6c5ce7' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--app-text)' }}>{b.name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#6c5ce7', fontWeight: '800', background: 'rgba(108,92,231,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Code: {b.id}</span>
                      <span style={{ fontSize: '0.65rem', color: '#c5a059', fontWeight: '800', background: 'rgba(197,160,89,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{b.commissionRate}%</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                      {agents.length} agents • {b.phone || 'No phone'} • Total Commission: {formatCurrency(brokerTotal)}
                    </div>
                  </div>
                  <span style={{ color: '#64748B', fontSize: '1.2rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Broker Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px 0', fontSize: '0.82rem', color: '#94A3B8' }}>
                      {b.email && <div>📧 {b.email}</div>}
                      {b.address && <div>📍 {b.address}</div>}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <IonButton fill="outline" size="small" onClick={async () => {
                        const code = await getNextAgentCode(b.id);
                        setAgentForm({ id: code, name: '', phone: '', email: '' });
                        setSelectedBroker(b);
                        setShowAddAgentModal(true);
                      }} style={{ '--border-color': '#6c5ce7', '--color': '#6c5ce7', '--border-radius': '8px' }}>
                        <IonIcon icon={personAddOutline} slot="start" /> Add Agent
                      </IonButton>
                      <IonButton fill="outline" size="small" onClick={(e) => {
                        e.stopPropagation();
                        setBrokerForm({ id: b.id, name: b.name, phone: b.phone || '', email: b.email || '', address: b.address || '', commissionRate: b.commissionRate });
                        setEditingBroker(b);
                        setShowEditBrokerModal(true);
                      }} style={{ '--border-color': '#c5a059', '--color': '#c5a059', '--border-radius': '8px' }}>
                        <IonIcon icon={createOutline} slot="start" /> Edit Broker
                      </IonButton>
                      <IonButton fill="outline" size="small" color="danger" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBroker(b);
                      }} style={{ '--border-radius': '8px' }}>
                        <IonIcon icon={trashOutline} slot="start" /> Delete
                      </IonButton>
                    </div>

                    {/* Agents List */}
                    {agents.length === 0 ? (
                      <p style={{ color: '#64748B', fontSize: '0.8rem', textAlign: 'center' }}>No agents under this broker yet.</p>
                    ) : (
                      agents.map(a => {
                        const agentComm = commissions.filter(c => c.salesId === a.id);
                        const agentTotal = agentComm.reduce((s, c) => s + c.commissionAmount, 0);
                        return (
                          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '4px', background: 'rgba(255,255,255,0.02)' }}>
                            <div>
                              <span style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.9rem' }}>{a.name}</span>
                              <span style={{ fontSize: '0.7rem', color: '#6c5ce7', marginLeft: '8px' }}>#{a.id}</span>
                              {a.phone && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{a.phone}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059' }}>{formatCurrency(agentTotal)}</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B' }}>{agentComm.length} commissions</div>
                              </div>
                              <IonButton fill="clear" size="small" onClick={(e) => {
                                e.stopPropagation();
                                setEditAgentForm({ id: a.id, name: a.name, phone: a.phone || '', email: a.email || '', commissionRate: a.commissionRate || '' });
                                setEditingAgent(a);
                                setShowEditAgentModal(true);
                              }} style={{ '--color': '#c5a059' }}>
                                <IonIcon icon={createOutline} />
                              </IonButton>
                              <IonButton fill="clear" size="small" color="danger" onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAgent(a);
                              }}>
                                <IonIcon icon={trashOutline} />
                              </IonButton>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {brokers.length === 0 && (
            <div className="pro-glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏢</div>
              <h3 style={{ color: 'var(--app-text)', margin: 0 }}>No Broker Companies</h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '8px 0 0' }}>Add broker companies and assign agents to track commissions.</p>
            </div>
          )}
        </>
      )}

      {/* SETTINGS MODAL */}
      <IonModal isOpen={showSettingsModal} onDidDismiss={() => setShowSettingsModal(false)}>
        <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
          <IonTitle>Commission Settings</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => setShowSettingsModal(false)} color="light">Close</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '20px' }}>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Default Commission Rate (%)</label>
              <input type="number" value={settings.defaultRate} onChange={e => setSettings(prev => ({ ...prev, defaultRate: Number(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
            </div>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Activation Threshold (%)</label>
              <input type="number" value={settings.activationThreshold} onChange={e => setSettings(prev => ({ ...prev, activationThreshold: Number(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '6px 0 0' }}>Commission activates when this % of contract price is paid.</p>
            </div>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Broker Start Code</label>
              <input type="number" value={settings.brokerStartCode} onChange={e => setSettings(prev => ({ ...prev, brokerStartCode: Number(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
            </div>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Code Step Between Brokers</label>
              <input type="number" value={settings.brokerCodeStep} onChange={e => setSettings(prev => ({ ...prev, brokerCodeStep: Number(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '6px 0 0' }}>E.g., 1000 means brokers get codes 90000, 91000, 92000...</p>
            </div>
            <IonButton expand="block" onClick={handleSaveSettings}
              style={{ '--background': 'linear-gradient(135deg, #c5a059, #d4af37)', '--border-radius': '12px', height: '48px', fontWeight: '800', '--color': '#000' }}>
              Save Settings
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* ADD BROKER MODAL */}
      <IonModal isOpen={showAddBrokerModal} onDidDismiss={() => setShowAddBrokerModal(false)}>
        <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
          <IonTitle>Add Broker Company</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => setShowAddBrokerModal(false)} color="light">Close</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px' }}>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6c5ce7', display: 'block', marginBottom: '6px' }}>Broker Code</label>
              <input value={brokerForm.id} onChange={e => setBrokerForm(prev => ({ ...prev, id: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
              <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '4px 0 0' }}>Auto-generated. You can change it.</p>
            </div>
            {[
              { key: 'name', label: 'Company Name *', placeholder: 'Alpha Real Estate' },
              { key: 'phone', label: 'Phone', placeholder: '01234567890' },
              { key: 'email', label: 'Email', placeholder: 'info@company.com' },
              { key: 'address', label: 'Address', placeholder: 'Cairo, Egypt' }
            ].map(f => (
              <div key={f.key} className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input value={brokerForm[f.key]} onChange={e => setBrokerForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Rate (%)</label>
              <input type="number" value={brokerForm.commissionRate} onChange={e => setBrokerForm(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
            </div>
            <IonButton expand="block" onClick={handleAddBroker} disabled={!brokerForm.name || loading}
              style={{ '--background': 'linear-gradient(135deg, #6c5ce7, #4834d4)', '--border-radius': '12px', height: '48px', fontWeight: '800' }}>
              {loading ? 'Adding...' : 'Add Broker Company'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* ADD AGENT UNDER BROKER MODAL */}
      <IonModal isOpen={showAddAgentModal} onDidDismiss={() => setShowAddAgentModal(false)}>
        <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
          <IonTitle>Add Agent to {selectedBroker?.name}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => setShowAddAgentModal(false)} color="light">Close</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px' }}>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6c5ce7', display: 'block', marginBottom: '6px' }}>Agent Code</label>
              <input value={agentForm.id} onChange={e => setAgentForm(prev => ({ ...prev, id: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
              <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '4px 0 0' }}>Auto-generated based on broker code ({selectedBroker?.id}).</p>
            </div>
            {[
              { key: 'name', label: 'Agent Name *', placeholder: 'Ahmed Hassan' },
              { key: 'phone', label: 'Phone', placeholder: '01234567890' },
              { key: 'email', label: 'Email', placeholder: 'agent@email.com' }
            ].map(f => (
              <div key={f.key} className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input value={agentForm[f.key]} onChange={e => setAgentForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }} placeholder={f.placeholder} />
              </div>
            ))}
            <IonButton expand="block" onClick={handleAddAgentUnderBroker} disabled={!agentForm.name || loading}
              style={{ '--background': 'linear-gradient(135deg, #6c5ce7, #4834d4)', '--border-radius': '12px', height: '48px', fontWeight: '800' }}>
              {loading ? 'Adding...' : 'Add Agent'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* EDIT BROKER MODAL */}
      <IonModal isOpen={showEditBrokerModal} onDidDismiss={() => { setShowEditBrokerModal(false); setEditingBroker(null); }}>
        <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
          <IonTitle>Edit Broker: {editingBroker?.name}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => { setShowEditBrokerModal(false); setEditingBroker(null); }} color="light">Close</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px' }}>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6c5ce7', display: 'block', marginBottom: '6px' }}>Broker Code</label>
              <input value={brokerForm.id} onChange={e => setBrokerForm(prev => ({ ...prev, id: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
              {String(brokerForm.id) !== String(editingBroker?.id) && <p style={{ fontSize: '0.7rem', color: '#ffc409', margin: '4px 0 0' }}>⚠️ Changing code will re-create the broker record.</p>}
            </div>
            {[
              { key: 'name', label: 'Company Name *', placeholder: 'Alpha Real Estate' },
              { key: 'phone', label: 'Phone', placeholder: '01234567890' },
              { key: 'email', label: 'Email', placeholder: 'info@company.com' },
              { key: 'address', label: 'Address', placeholder: 'Cairo, Egypt' }
            ].map(f => (
              <div key={f.key} className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input value={brokerForm[f.key]} onChange={e => setBrokerForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Rate (%)</label>
              <input type="number" value={brokerForm.commissionRate} onChange={e => setBrokerForm(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
            </div>
            <IonButton expand="block" onClick={handleEditBroker} disabled={!brokerForm.name || loading}
              style={{ '--background': 'linear-gradient(135deg, #c5a059, #d4af37)', '--border-radius': '12px', height: '48px', fontWeight: '800', '--color': '#000' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* EDIT AGENT MODAL */}
      <IonModal isOpen={showEditAgentModal} onDidDismiss={() => { setShowEditAgentModal(false); setEditingAgent(null); }}>
        <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
          <IonTitle>Edit Agent: {editingAgent?.name}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => { setShowEditAgentModal(false); setEditingAgent(null); }} color="light">Close</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px' }}>
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6c5ce7', display: 'block', marginBottom: '6px' }}>Agent Code</label>
              <input value={editAgentForm.id} onChange={e => setEditAgentForm(prev => ({ ...prev, id: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
              {String(editAgentForm.id) !== String(editingAgent?.id) && <p style={{ fontSize: '0.7rem', color: '#ffc409', margin: '4px 0 0' }}>⚠️ Changing code will re-create the agent record.</p>}
            </div>
            {[
              { key: 'name', label: 'Agent Name *', placeholder: 'Ahmed Hassan' },
              { key: 'phone', label: 'Phone', placeholder: '01234567890' },
              { key: 'email', label: 'Email', placeholder: 'agent@email.com' }
            ].map(f => (
              <div key={f.key} className="pro-glass-card" style={{ padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input value={editAgentForm[f.key]} onChange={e => setEditAgentForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Rate (%) — Leave empty to use broker rate</label>
              <input type="number" value={editAgentForm.commissionRate} onChange={e => setEditAgentForm(prev => ({ ...prev, commissionRate: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} placeholder="e.g. 3" />
            </div>
            <IonButton expand="block" onClick={handleEditAgent} disabled={!editAgentForm.name || loading}
              style={{ '--background': 'linear-gradient(135deg, #c5a059, #d4af37)', '--border-radius': '12px', height: '48px', fontWeight: '800', '--color': '#000' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      {/* ADD COMMISSION MANUALLY MODAL */}
      <IonModal isOpen={showAddCommissionModal} onDidDismiss={() => setShowAddCommissionModal(false)}>
        <IonHeader><IonToolbar style={{ '--background': '#1E293B', color: '#fff' }}>
          <IonTitle>Add Commission Manually</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => setShowAddCommissionModal(false)} color="light">Close</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px' }}>

            {/* Contract Picker */}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Contract *</label>
              {manualCommForm.contractId ? (() => {
                const con = contracts.find(c => c.id === manualCommForm.contractId);
                return con ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(197,160,89,0.1)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.9rem' }}>Unit {con.unitId}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{con.customerName} • {formatCurrency(Number(con.totalPrice) || 0)}</div>
                    </div>
                    <span onClick={() => setManualCommForm(prev => ({ ...prev, contractId: '', salesId: '' }))}
                      style={{ color: '#eb445a', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>✕ Clear</span>
                  </div>
                ) : <span style={{ color: '#64748B' }}>Contract not found</span>;
              })() : (
                <div>
                  <input value={commContractSearch} onChange={e => setCommContractSearch(e.target.value)}
                    placeholder="Search by unit ID, customer, contract ID..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'var(--app-text)', marginBottom: '8px' }} />
                  {commContractSearch && (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {contracts
                        .filter(c => c.status !== 'terminated' &&
                          !commissions.some(com => com.contractId === c.id) &&
                          ((c.unitId || '').toLowerCase().includes(commContractSearch.toLowerCase()) ||
                          (c.customerName || '').toLowerCase().includes(commContractSearch.toLowerCase()) ||
                          (c.id || '').toLowerCase().includes(commContractSearch.toLowerCase())))
                        .slice(0, 10)
                        .map(c => (
                          <div key={c.id} onClick={() => {
                            const agent = sales.find(s => String(s.id) === String(c.salesId));
                            const rate = manualCommForm.commissionRate || settings.defaultRate;
                            const totalPrice = Number(c.totalPrice) || 0;
                            setManualCommForm({
                              contractId: c.id,
                              unitId: c.unitId,
                              buildingId: c.buildingId || '',
                              customerName: c.customerName || '',
                              salesId: c.salesId || '',
                              salesName: agent?.name || c.salesId || '',
                              brokerId: agent?.brokerId || '',
                              totalContractPrice: totalPrice,
                              commissionRate: rate,
                              commissionAmount: Math.round(totalPrice * rate / 100)
                            });
                            setCommContractSearch('');
                          }} style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--app-text)', fontSize: '0.85rem' }}>Unit {c.unitId}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{c.customerName}</div>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#c5a059', fontWeight: '700' }}>{formatCurrency(Number(c.totalPrice) || 0)}</span>
                          </div>
                        ))}
                      {contracts.filter(c => c.status !== 'terminated' && !commissions.some(com => com.contractId === c.id) &&
                        ((c.unitId || '').toLowerCase().includes(commContractSearch.toLowerCase()) ||
                        (c.customerName || '').toLowerCase().includes(commContractSearch.toLowerCase()))).length === 0 && (
                        <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.8rem', padding: '15px' }}>No matching contracts without commissions.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sales Agent Picker */}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Sales Agent *</label>
              <select value={manualCommForm.salesId || ''} onChange={e => {
                const agent = sales.find(s => String(s.id) === String(e.target.value));
                setManualCommForm(prev => ({
                  ...prev,
                  salesId: e.target.value,
                  salesName: agent?.name || '',
                  brokerId: agent?.brokerId || ''
                }));
              }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)' }}>
                <option value="">-- Select Agent --</option>
                {sales.map(s => <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>)}
              </select>
            </div>

            {/* Commission Rate */}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Rate (%)</label>
              <input type="number" value={manualCommForm.commissionRate || ''} onChange={e => {
                const rate = Number(e.target.value) || 0;
                const total = Number(manualCommForm.totalContractPrice) || 0;
                setManualCommForm(prev => ({ ...prev, commissionRate: rate, commissionAmount: Math.round(total * rate / 100) }));
              }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--app-text)', fontSize: '1.1rem', fontWeight: '700' }} />
            </div>

            {/* Commission Amount (auto-calculated, editable) */}
            <div className="pro-glass-card" style={{ padding: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', display: 'block', marginBottom: '6px' }}>Commission Amount (editable)</label>
              <input type="number" value={manualCommForm.commissionAmount || ''} onChange={e => setManualCommForm(prev => ({ ...prev, commissionAmount: Number(e.target.value) || 0 }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: '#2dd36f', fontSize: '1.2rem', fontWeight: '900' }} />
              {manualCommForm.totalContractPrice > 0 && (
                <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '4px 0 0' }}>
                  {manualCommForm.commissionRate}% of {formatCurrency(manualCommForm.totalContractPrice)} = {formatCurrency(Math.round(manualCommForm.totalContractPrice * manualCommForm.commissionRate / 100))}
                </p>
              )}
            </div>

            <IonButton expand="block" onClick={async () => {
              if (!manualCommForm.contractId || !manualCommForm.salesId) { alert('Please select a contract and agent.'); return; }
              setLoading(true);
              try {
                await addCommission({
                  contractId: manualCommForm.contractId,
                  unitId: manualCommForm.unitId || '',
                  buildingId: manualCommForm.buildingId || '',
                  customerName: manualCommForm.customerName || '',
                  salesId: manualCommForm.salesId,
                  salesName: manualCommForm.salesName || '',
                  brokerId: manualCommForm.brokerId || '',
                  totalContractPrice: Number(manualCommForm.totalContractPrice) || 0,
                  commissionRate: Number(manualCommForm.commissionRate) || settings.defaultRate,
                  commissionAmount: Number(manualCommForm.commissionAmount) || 0
                });
                setCommissions(await getCommissions());
                setShowAddCommissionModal(false);
              } catch (e) { alert(e.message); }
              setLoading(false);
            }} disabled={!manualCommForm.contractId || !manualCommForm.salesId || loading}
              style={{ '--background': 'linear-gradient(135deg, #c5a059, #d4af37)', '--border-radius': '12px', height: '48px', fontWeight: '800', '--color': '#000' }}>
              {loading ? 'Creating...' : 'Create Commission'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      <PDFPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        pdfDoc={previewPdf}
        filename={previewFilename}
      />
    </div>
  );
};

export default CommissionsView;
