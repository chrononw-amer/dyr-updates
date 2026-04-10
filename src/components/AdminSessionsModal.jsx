import React, { useState, useEffect, useMemo } from 'react';
import {
    IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonItem, IonLabel, IonInput, IonList, IonBadge, IonSearchbar, IonGrid, IonRow, IonCol, IonButtons
} from '@ionic/react';
import { close, warning, refresh, person, desktop, time, server, lockClosed, lockOpen, cloudDownload, cloudUpload, timerOutline, trash, keyOutline, shieldCheckmarkOutline, create, informationCircleOutline, people, personAdd, business, eye, lockClosedOutline, chevronForward, settingsOutline, addCircleOutline, chatbubblesOutline, downloadOutline, calendarOutline, funnelOutline } from 'ionicons/icons';
import { getActiveSessions, pushUpdate, setUserAccessDuration, updateSessionStatus, kickOtherSessions } from '../services/SessionService';
import { getUsers, addUser, updateUser, deleteUser } from '../services/UserService';
import ChatOverlay from './ChatOverlay';
import { supabase } from '../services/supabase';
import { getAppSecurity, setAppSecurity, getAppLogs } from '../services/DataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyBranding, getPDFDimensions, setupArabicFont } from '../services/PDFService';
import { Capacitor } from '@capacitor/core';
import PDFPreviewModal from './PDFPreviewModal';

const AdminSessionsModal = ({ isOpen, onClose, expressServerRunning, expressServerIP, expressServerStats, expressServerLoading, onStartServer, onStopServer, onRefreshServerStats }) => {
    const isMobile = Capacitor.getPlatform() !== 'web' && Capacitor.getPlatform() !== 'electron';
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' or 'users'
    const [loading, setLoading] = useState(false);
    const [appLogs, setAppLogs] = useState([]);

    // Chat State
    const [chatSession, setChatSession] = useState(null);

    // User Management State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        name: '',
        company: '',
        rank: 'user', // 'admin' or 'user'
        password: '',
        permissions: {
            allTabs: true,
            allowedTabs: [],
            actions: {
                view: true,
                edit: false,
                add: false,
                delete: false
            }
        }
    });

    const ALL_APP_TABS = [
        { id: 'buildings', label: 'Buildings' },
        { id: 'customers', label: 'Customers' },
        { id: 'offers', label: 'Offers' },
        { id: 'contracts', label: 'Contracts' },
        { id: 'installments', label: 'Installments' },
        { id: 'reports', label: 'Reports' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'cheques', label: 'Cheque Designer' },
        { id: 'settings', label: 'Settings' },
        { id: 'sales', label: 'Sales' },
        { id: 'terminated', label: 'Terminated' },
        { id: 'feedbacks', label: 'Feedbacks' },
        { id: 'reminders', label: 'Reminders' }
    ];

    // Access Duration Modal
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [selectedSessionForAccess, setSelectedSessionForAccess] = useState(null);

    // Owner Password Change
    const [showChangeOwnerPass, setShowChangeOwnerPass] = useState(false);
    const [currentOwnerPass, setCurrentOwnerPass] = useState('');
    const [newOwnerPass, setNewOwnerPass] = useState('');
    const [confirmOwnerPass, setConfirmOwnerPass] = useState('');
    const [ownerPassError, setOwnerPassError] = useState('');

    // File Input Ref for Updates
    const updateInputRef = React.useRef(null);
    const [selectedSessionForUpdate, setSelectedSessionForUpdate] = useState(null);
    const [pushingUpdate, setPushingUpdate] = useState(false);
    const [pushProgress, setPushProgress] = useState(0);

    // Edit Session State

    // Edit Session State
    const [showEditSessionModal, setShowEditSessionModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isAddingCompany, setIsAddingCompany] = useState(false);

    // Audit Log Filters
    const [logUserFilter, setLogUserFilter] = useState('');
    const [logDateFrom, setLogDateFrom] = useState('');
    const [logDateTo, setLogDateTo] = useState('');

    // PDF Preview
    const [pdfPreviewDoc, setPdfPreviewDoc] = useState(null);
    const [pdfPreviewFilename, setPdfPreviewFilename] = useState('');
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    const companies = Array.from(new Set(users.map(u => u.company).filter(Boolean))).sort();

    // Unique users from logs for filter dropdown
    const uniqueLogUsers = useMemo(() => {
        const names = Array.from(new Set(appLogs.map(l => l.user_name).filter(Boolean))).sort();
        return names;
    }, [appLogs]);

    // Filtered logs based on user and date range
    const filteredLogs = useMemo(() => {
        let logs = [...appLogs];
        if (logUserFilter) {
            logs = logs.filter(l => l.user_name === logUserFilter);
        }
        if (logDateFrom) {
            const from = new Date(logDateFrom);
            from.setHours(0, 0, 0, 0);
            logs = logs.filter(l => new Date(l.created_at) >= from);
        }
        if (logDateTo) {
            const to = new Date(logDateTo);
            to.setHours(23, 59, 59, 999);
            logs = logs.filter(l => new Date(l.created_at) <= to);
        }
        return logs;
    }, [appLogs, logUserFilter, logDateFrom, logDateTo]);

    // Generate PDF for audit logs
    const generateAuditPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4', true); // landscape
        setupArabicFont(doc);
        doc.setFont('Amiri');
        const dims = getPDFDimensions();

        // Title page info
        const title = logUserFilter ? `Audit Logs — ${logUserFilter}` : 'Audit Logs — All Users';
        let subtitle = '';
        if (logDateFrom && logDateTo) subtitle = `Period: ${logDateFrom} to ${logDateTo}`;
        else if (logDateFrom) subtitle = `From: ${logDateFrom}`;
        else if (logDateTo) subtitle = `Until: ${logDateTo}`;
        else subtitle = `All recorded activity (${filteredLogs.length} entries)`;

        doc.setFontSize(18);
        doc.setFont('Amiri', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(title, 14, 20);

        doc.setFontSize(10);
        doc.setFont('Amiri', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(subtitle, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        // Summary stats
        const addCount = filteredLogs.filter(l => l.action === 'ADD').length;
        const editCount = filteredLogs.filter(l => l.action === 'EDIT').length;
        const deleteCount = filteredLogs.filter(l => l.action === 'DELETE').length;
        const otherCount = filteredLogs.length - addCount - editCount - deleteCount;

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Total: ${filteredLogs.length}  |  Additions: ${addCount}  |  Edits: ${editCount}  |  Deletions: ${deleteCount}  |  Other: ${otherCount}`, 14, 41);

        // Table
        const tableData = filteredLogs.map(log => [
            (log.created_at || '').replace('T', ' ').substring(0, 19),
            log.user_name || 'Unknown',
            log.action || '-',
            log.tab_name || log.tab || '-',
            (log.details || '').substring(0, 80),
            log.ip_address || '---'
        ]);

        autoTable(doc, {
            startY: 46,
            head: [['DATE / TIME', 'USER', 'ACTION', 'MODULE', 'DETAILS', 'IP ADDRESS']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                font: 'Amiri',
                fillColor: [197, 160, 89],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 7.5,
                cellPadding: 3,
                textColor: [50, 50, 50]
            },
            alternateRowStyles: {
                fillColor: [248, 248, 248]
            },
            columnStyles: {
                0: { cellWidth: 38 },
                1: { cellWidth: 30 },
                2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
                3: { cellWidth: 28 },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 30, fontStyle: 'italic', textColor: [120, 120, 120] }
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 2) {
                    const val = data.cell.raw;
                    if (val === 'DELETE') data.cell.styles.textColor = [235, 68, 90];
                    else if (val === 'ADD') data.cell.styles.textColor = [45, 170, 90];
                    else if (val === 'EDIT') data.cell.styles.textColor = [197, 160, 89];
                    else data.cell.styles.textColor = [56, 128, 255];
                }
            },
            margin: { top: 46, left: 14, right: 14, bottom: 20 },
            styles: { font: 'Amiri', overflow: 'ellipsize' }
        });

        // Apply branding
        try { await applyBranding(doc); } catch (e) { /* optional */ }

        // Page numbers
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
        }

        const fname = `Audit_Logs${logUserFilter ? '_' + logUserFilter.replace(/\s+/g, '_') : ''}_${new Date().toISOString().slice(0, 10)}.pdf`;
        setPdfPreviewDoc(doc);
        setPdfPreviewFilename(fname);
        setShowPdfPreview(true);
    };

    // Owner password for monitoring
    const OWNER_PASS = getAppSecurity().ownerPassword;

    const handleLogin = () => {
        if (password === OWNER_PASS) {
            setIsAuthenticated(true);
            localStorage.setItem('owner_auth', 'true');
            fetchData();
        } else {
            alert("Incorrect Password");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'sessions') {
            const data = await getActiveSessions();
            setSessions(data);
        } else if (activeTab === 'users') {
            const data = await getUsers();
            setUsers(data);
        } else if (activeTab === 'logs') {
            const data = await getAppLogs();
            setAppLogs(data);
        }
        setLoading(false);
    };

    const fetchSessions = async () => {
        const data = await getActiveSessions();
        setSessions(data);
    };

    useEffect(() => {
        if (isOpen) {
            if (localStorage.getItem('owner_auth') === 'true') {
                setIsAuthenticated(true);
                fetchData();
            } else {
                setIsAuthenticated(false);
                setPassword('');
            }

            // Auto refresh every 5 seconds while open if in sessions tab for real-time tracking
            const interval = setInterval(() => {
                if (isAuthenticated && activeTab === 'sessions') fetchSessions();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, isAuthenticated, activeTab]);

    // Auto-poll server health when HOSTS tab is active
    useEffect(() => {
        if (!isOpen || !isAuthenticated || activeTab !== 'hosts') return;
        // Initial fetch
        if (onRefreshServerStats) onRefreshServerStats();
        const interval = setInterval(() => {
            if (onRefreshServerStats) onRefreshServerStats();
        }, 10000);
        return () => clearInterval(interval);
    }, [isOpen, isAuthenticated, activeTab]);

    const formatTime = (isoString) => {
        if (!isoString) return 'Unknown';
        const d = new Date(isoString);
        return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    };

    // --- ACTIONS ---

    const toggleSuspend = async (session) => {
        const newStatus = session.status === 'suspended' ? 'active' : 'suspended';
        try {
            await supabase
                .from('app_sessions')
                .update({ status: newStatus, valid_until: null }) // Reset validity if manually toggling
                .eq('id', session.id);
            fetchSessions();
        } catch (e) {
            console.error(e);
            alert("Error updating status: " + e.message);
        }
    };

    const requestBackup = async (session) => {
        if (!window.confirm(`Request backup from ${session.pc_name}? This may take a moment.`)) return;
        try {
            await supabase
                .from('app_sessions')
                .update({ command: 'BACKUP' })
                .eq('id', session.id);
            alert("Backup command sent. Waiting for client...");
            fetchSessions();
        } catch (e) {
            console.error(e);
            alert("Error sending command: " + e.message);
        }
    };

    const requestRestart = async (session) => {
        if (!window.confirm(`FORCE RESTART application on ${session.pc_name}? Any unsaved changes on that machine will be lost.`)) return;
        try {
            await supabase
                .from('app_sessions')
                .update({ command: 'RESTART' })
                .eq('id', session.id);
            alert("Restart command sent.");
            fetchSessions();
        } catch (e) {
            console.error(e);
            alert("Error sending restart command: " + e.message);
        }
    };

    const handleGrantAccess = async (minutes) => {
        if (!selectedSessionForAccess) return;

        let accessExpires = null;
        let accessDuration = 'permanent';
        if (minutes > 0) {
            const date = new Date();
            date.setMinutes(date.getMinutes() + minutes);
            accessExpires = date.toISOString();
            // Determine label
            if (minutes <= 1440) accessDuration = '1_day';
            else if (minutes <= 4320) accessDuration = '3_days';
            else if (minutes <= 10080) accessDuration = '7_days';
            else if (minutes <= 21600) accessDuration = '15_days';
            else if (minutes <= 43200) accessDuration = '1_month';
            else if (minutes <= 129600) accessDuration = '3_months';
            else if (minutes <= 259200) accessDuration = '6_months';
            else accessDuration = '1_year';
        }

        try {
            // Update the session
            await supabase
                .from('app_sessions')
                .update({
                    status: 'active',
                    valid_until: null,
                    access_expires: accessExpires,
                    access_duration: accessDuration
                })
                .eq('id', selectedSessionForAccess.id);

            // Also update the user record if we know who's logged in
            const userName = selectedSessionForAccess.logged_in_user;
            if (userName) {
                await supabase
                    .from('app_users')
                    .update({
                        access_expires: accessExpires,
                        access_duration: accessDuration
                    })
                    .eq('name', userName);
            }

            setShowDurationModal(false);
            setSelectedSessionForAccess(null);
            fetchSessions();
        } catch (e) {
            console.error(e);
            alert("Error granting access: " + e.message);
        }
    };

    const handleUpdateSessionInfo = async () => {
        if (!editingSession) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('app_sessions')
                .update({
                    display_name: editDisplayName,
                    notes: editNotes
                })
                .eq('id', editingSession.id);

            if (error) throw error;

            setShowEditSessionModal(false);
            fetchSessions();
        } catch (e) {
            console.error(e);
            alert("Error updating session: " + e.message + "\nNote: Ensure your Supabase 'app_sessions' table has 'display_name' and 'notes' (TEXT) columns.");
        } finally {
            setLoading(false);
        }
    };

    const cleanOfflineSessions = async () => {
        if (!window.confirm("Remove all sessions that haven't been active in the last 5 minutes?")) return;
        try {
            // Cutoff: 5 minutes ago
            const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { error } = await supabase
                .from('app_sessions')
                .delete()
                .lt('last_active', cutoff);

            if (error) throw error;
            alert("Offline sessions cleared.");
            fetchSessions();
        } catch (e) {
            console.error(e);
            alert("Error cleaning sessions: " + e.message);
        }
    };

    const handlePushUpdateFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedSessionForUpdate) return;

        setPushingUpdate(true);
        setPushProgress(10); // Start progress

        try {
            // 1. Upload file to Supabase Storage
            const fileName = `update_${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('updates')
                .upload(fileName, file);

            if (uploadError) throw uploadError;
            setPushProgress(60);

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('updates')
                .getPublicUrl(fileName);

            // 3. Push Command via SessionService
            await pushUpdate(selectedSessionForUpdate.id, publicUrl);
            setPushProgress(100);

            alert(`Update successfully pushed to ${selectedSessionForUpdate.display_name || selectedSessionForUpdate.pc_name}! They will receive it on their next heartbeat.`);
            fetchSessions();
        } catch (error) {
            console.error("Push update failed:", error);
            alert("Failed to push update: " + error.message);
        } finally {
            setPushingUpdate(false);
            setPushProgress(0);
            setSelectedSessionForUpdate(null);
            if (updateInputRef.current) updateInputRef.current.value = "";
        }
    };

    const handleSaveUser = async () => {
        if (!userForm.name || !userForm.password) {
            alert("Name and Password are required");
            return;
        }
        try {
            setLoading(true);
            if (editingUser) {
                await updateUser(editingUser.id, userForm);
            } else {
                await addUser(userForm);
            }
            setShowUserModal(false);
            fetchData();
        } catch (e) {
            alert("Error saving user: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Delete user ${user.name}?`)) return;
        try {
            await deleteUser(user.id);
            fetchData();
        } catch (e) {
            alert("Error deleting user: " + e.message);
        }
    };

    const openUserEditor = (user = null) => {
        setIsAddingCompany(false);
        if (user) {
            setEditingUser(user);
            setUserForm(user);
        } else {
            setEditingUser(null);
            setUserForm({
                name: '',
                company: companies.length > 0 ? companies[0] : '',
                rank: 'user',
                password: '',
                permissions: {
                    allTabs: true,
                    allowedTabs: [],
                    actions: {
                        view: true,
                        edit: false,
                        add: false,
                        delete: false
                    }
                }
            });
            if (companies.length === 0) setIsAddingCompany(true);
        }
        setShowUserModal(true);
    };

    return (
        <IonModal
            isOpen={isOpen}
            onDidDismiss={onClose}
            className="chrono-modal"
            style={{
                '--width': isMobile ? '100%' : '95%',
                '--max-width': isMobile ? '100%' : '1100px',
                '--height': isMobile ? '100%' : '92%',
                '--border-radius': isMobile ? '0' : '24px'
            }}
        >
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': 'linear-gradient(to right, #1a1a1a, #252525)', '--color': '#fff', '--padding-top': isMobile ? '20px' : '10px', '--padding-bottom': '10px' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', padding: isMobile ? '0 15px' : '0 20px', gap: '15px', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <IonIcon icon={server} style={{ fontSize: isMobile ? '20px' : '24px', color: '#c5a059', marginRight: '10px' }} />
                                <IonTitle style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: '900', letterSpacing: '1px', padding: 0 }}>OWNER MONITOR</IonTitle>
                            </div>
                            {isMobile && (
                                <IonButtons>
                                    <IonButton onClick={onClose} style={{ '--color': '#bbb' }}>
                                        <IonIcon icon={close} style={{ fontSize: '24px' }} />
                                    </IonButton>
                                </IonButtons>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            background: '#000',
                            borderRadius: '12px',
                            padding: '4px',
                            overflowX: isMobile ? 'auto' : 'visible',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none'
                        }}>
                            {[
                                { id: 'hosts', label: 'HOSTS' },
                                { id: 'sessions', label: 'SESSIONS' },
                                { id: 'users', label: 'USERS' },
                                { id: 'logs', label: 'APP LOGS' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        background: activeTab === tab.id ? '#c5a059' : 'transparent',
                                        color: activeTab === tab.id ? '#000' : '#bbb',
                                        border: 'none',
                                        padding: isMobile ? '8px 12px' : '8px 20px',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                        fontSize: isMobile ? '0.7rem' : '0.85rem',
                                        flex: isMobile ? 1 : 'none',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {!isMobile && (
                            <IonButtons>
                                <IonButton onClick={onClose} style={{ '--color': '#bbb' }}>
                                    <IonIcon icon={close} style={{ fontSize: '28px' }} />
                                </IonButton>
                            </IonButtons>
                        )}
                    </div>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding" style={{ '--background': '#0f0f0f' }}>

                {!isAuthenticated ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center', maxWidth: '400px', margin: '0 auto',
                        textAlign: 'center', padding: '0 20px'
                    }}>
                        <div style={{
                            width: isMobile ? '80px' : '100px', height: isMobile ? '80px' : '100px', borderRadius: '50%', background: 'rgba(197, 160, 89, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? '20px' : '30px'
                        }}>
                            <IonIcon icon={person} style={{ fontSize: isMobile ? '36px' : '48px', color: '#c5a059' }} />
                        </div>
                        <h2 style={{ color: '#fff', fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: '900', marginBottom: '10px' }}>Authentication Required</h2>
                        <p style={{ color: '#aaa', marginBottom: '30px', fontSize: isMobile ? '0.85rem' : '1rem' }}>Please enter your owner password to access the secure session monitor.</p>

                        <div style={{ width: '100%', background: '#1a1a1a', padding: isMobile ? '20px' : '30px', borderRadius: '24px', border: '1px solid #333' }}>
                            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px', marginBottom: '20px' }}>
                                <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold', fontSize: '0.75rem' }}>OWNER PASSWORD</IonLabel>
                                <IonInput
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onIonChange={e => setPassword(e.detail.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    style={{ '--color': '#fff', marginTop: '10px' }}
                                />
                            </IonItem>
                            <IonButton expand="block" shape="round" color="warning" onClick={handleLogin} style={{ '--padding-top': '20px', '--padding-bottom': '20px', fontWeight: '900', fontSize: isMobile ? '0.8rem' : '1rem' }}>
                                ACCESS SECURE MONITOR
                            </IonButton>
                        </div>
                    </div>
                ) : (
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        {activeTab === 'hosts' && (
                            <>
                                {/* SERVER CONTROL PANEL */}
                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #222', gap: '15px' }}>
                                        <div>
                                            <h1 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '900' }}>LAN Server Hosts</h1>
                                            <p style={{ color: '#aaa', margin: '5px 0 0', fontSize: '0.85rem' }}>Monitor connected devices and manage server service.</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <IonButton
                                                fill="clear"
                                                color="warning"
                                                size="small"
                                                onClick={onRefreshServerStats}
                                                style={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                                            >
                                                <IonIcon icon={refresh} slot="start" />
                                                REFRESH
                                            </IonButton>
                                        </div>
                                    </div>

                                    {/* Server Status Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)',
                                        borderRadius: '20px',
                                        padding: isMobile ? '20px' : '28px',
                                        border: `1.5px solid ${expressServerRunning ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                                        marginBottom: '25px'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '14px', height: '14px', borderRadius: '50%',
                                                    background: expressServerRunning ? '#10B981' : '#64748B',
                                                    boxShadow: expressServerRunning ? '0 0 15px rgba(16, 185, 129, 0.6)' : 'none',
                                                    animation: expressServerRunning ? 'pulse 2s infinite' : 'none'
                                                }} />
                                                <div>
                                                    <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '900' }}>
                                                        {expressServerRunning ? 'Server Running' : 'Server Offline'}
                                                    </div>
                                                    {expressServerRunning && expressServerIP && (
                                                        <div style={{
                                                            color: '#10B981', fontSize: '0.85rem', fontWeight: '600',
                                                            fontFamily: 'monospace', marginTop: '4px'
                                                        }}>
                                                            http://{expressServerIP}:3001
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                {!expressServerRunning ? (
                                                    <button
                                                        onClick={onStartServer}
                                                        disabled={expressServerLoading}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10B981, #059669)',
                                                            color: '#fff', border: 'none', borderRadius: '10px',
                                                            padding: '10px 24px', fontWeight: '800', fontSize: '0.8rem',
                                                            cursor: expressServerLoading ? 'not-allowed' : 'pointer',
                                                            opacity: expressServerLoading ? 0.6 : 1,
                                                            letterSpacing: '0.5px', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {expressServerLoading ? '⏳ Starting...' : '▶ START SERVER'}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                if (onStopServer) await onStopServer();
                                                                setTimeout(() => { if (onStartServer) onStartServer(); }, 500);
                                                            }}
                                                            disabled={expressServerLoading}
                                                            style={{
                                                                background: 'rgba(245, 158, 11, 0.15)',
                                                                color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)',
                                                                borderRadius: '10px', padding: '10px 20px',
                                                                fontWeight: '800', fontSize: '0.75rem',
                                                                cursor: expressServerLoading ? 'not-allowed' : 'pointer',
                                                                opacity: expressServerLoading ? 0.6 : 1,
                                                                letterSpacing: '0.5px', transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            🔄 RESTART
                                                        </button>
                                                        <button
                                                            onClick={onStopServer}
                                                            disabled={expressServerLoading}
                                                            style={{
                                                                background: 'rgba(220, 38, 38, 0.15)',
                                                                color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.3)',
                                                                borderRadius: '10px', padding: '10px 20px',
                                                                fontWeight: '800', fontSize: '0.75rem',
                                                                cursor: expressServerLoading ? 'not-allowed' : 'pointer',
                                                                opacity: expressServerLoading ? 0.6 : 1,
                                                                letterSpacing: '0.5px', transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            ⏹ STOP SERVER
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Summary badges */}
                                        {expressServerRunning && expressServerStats?.summary && (
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '8px 16px', textAlign: 'center', flex: 1, minWidth: '80px' }}>
                                                    <div style={{ color: '#F59E0B', fontSize: '1.3rem', fontWeight: '900' }}>{expressServerStats.summary.pending || 0}</div>
                                                    <div style={{ color: '#92400E', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
                                                </div>
                                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '8px 16px', textAlign: 'center', flex: 1, minWidth: '80px' }}>
                                                    <div style={{ color: '#10B981', fontSize: '1.3rem', fontWeight: '900' }}>{expressServerStats.summary.approved || 0}</div>
                                                    <div style={{ color: '#059669', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved</div>
                                                </div>
                                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: '10px', padding: '8px 16px', textAlign: 'center', flex: 1, minWidth: '80px' }}>
                                                    <div style={{ color: '#DC2626', fontSize: '1.3rem', fontWeight: '900' }}>{expressServerStats.summary.blocked || 0}</div>
                                                    <div style={{ color: '#991B1B', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blocked</div>
                                                </div>
                                                <div style={{ background: 'rgba(197, 160, 89, 0.1)', border: '1px solid rgba(197, 160, 89, 0.2)', borderRadius: '10px', padding: '8px 16px', textAlign: 'center', flex: 1, minWidth: '80px' }}>
                                                    <div style={{ color: '#c5a059', fontSize: '1.3rem', fontWeight: '900' }}>{expressServerStats.totalRequests || 0}</div>
                                                    <div style={{ color: '#8B6914', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requests</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* HOST MACHINE CARD */}
                                    {expressServerRunning && expressServerStats?.host && (
                                        <div style={{ marginBottom: '25px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                <div style={{ width: '4px', height: '20px', background: '#c5a059', borderRadius: '2px' }} />
                                                <span style={{ color: '#c5a059', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Server Host Machine</span>
                                            </div>
                                            <div className="pro-glass-card animate-slide-in" style={{
                                                background: 'linear-gradient(135deg, #1a1a1a 0%, #1f1f1f 100%)',
                                                border: '1.5px solid rgba(197, 160, 89, 0.35)',
                                                padding: isMobile ? '18px' : '25px',
                                                borderLeft: '5px solid #c5a059',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {/* HOST Badge */}
                                                <div style={{
                                                    position: 'absolute', top: isMobile ? '12px' : '18px', right: isMobile ? '12px' : '20px',
                                                    background: 'linear-gradient(135deg, #c5a059, #d4af37)',
                                                    color: '#000', padding: '4px 14px', borderRadius: '20px',
                                                    fontSize: '0.65rem', fontWeight: '900', letterSpacing: '2px',
                                                    boxShadow: '0 2px 8px rgba(197, 160, 89, 0.3)'
                                                }}>
                                                    HOST
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '18px' }}>
                                                    <div style={{
                                                        width: '52px', height: '52px', borderRadius: '14px',
                                                        background: 'rgba(197, 160, 89, 0.1)', border: '1px solid rgba(197, 160, 89, 0.3)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <IonIcon icon={server} style={{ fontSize: '26px', color: '#c5a059' }} />
                                                    </div>
                                                    <div>
                                                        <h2 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '900' }}>
                                                            {expressServerStats.host.hostname || 'Server'}
                                                        </h2>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }} />
                                                            <span style={{ color: '#10B981', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>ACTIVE HOST</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Host Info Grid */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                                                    gap: '1px', background: '#222', borderRadius: '14px',
                                                    overflow: 'hidden', border: '1px solid #222'
                                                }}>
                                                    {[
                                                        { icon: desktop, label: 'PC Name', value: expressServerStats.host.hostname },
                                                        { icon: person, label: 'System User', value: expressServerStats.host.username },
                                                        { icon: business, label: 'Platform', value: (expressServerStats.host.platform || '').replace('win32', 'Windows').replace('darwin', 'macOS') },
                                                        { icon: server, label: 'Internal IP', value: expressServerStats.host.ip },
                                                        { icon: server, label: 'MAC Address', value: expressServerStats.host.mac },
                                                        { icon: time, label: 'Uptime', value: expressServerStats.uptime ? `${Math.floor(expressServerStats.uptime / 3600)}h ${Math.floor((expressServerStats.uptime % 3600) / 60)}m` : '—' }
                                                    ].map((stat, i) => (
                                                        <div key={i} style={{ background: '#1c1c1c', padding: isMobile ? '10px 14px' : '14px 18px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                                                                <IonIcon icon={stat.icon} style={{ fontSize: '10px', color: '#c5a059' }} />
                                                                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.8px', fontWeight: '800' }}>{stat.label}</span>
                                                            </div>
                                                            <div style={{ fontSize: isMobile ? '0.8rem' : '0.88rem', color: '#fff', fontWeight: '700', fontFamily: stat.label.includes('IP') || stat.label.includes('MAC') ? 'monospace' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {stat.value || '—'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* CONNECTED CLIENTS */}
                                    {expressServerRunning && expressServerStats?.clients && expressServerStats.clients.length > 0 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                <div style={{ width: '4px', height: '20px', background: '#3B82F6', borderRadius: '2px' }} />
                                                <span style={{ color: '#3B82F6', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Connected Clients</span>
                                                <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>{expressServerStats.clients.length}</span>
                                            </div>

                                            <div style={{ display: 'grid', gap: '15px' }}>
                                                {expressServerStats.clients.map((client, idx) => {
                                                    const statusColor = client.status === 'approved' ? '#10B981' : client.status === 'pending' ? '#F59E0B' : '#DC2626';
                                                    const statusBg = client.status === 'approved' ? 'rgba(16,185,129,0.1)' : client.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(220,38,38,0.1)';
                                                    const statusLabel = client.status === 'approved' ? 'APPROVED' : client.status === 'pending' ? 'PENDING' : 'BLOCKED';

                                                    return (
                                                        <div key={`host-${idx}`} className="pro-glass-card animate-slide-in" style={{
                                                            background: '#1a1a1a',
                                                            border: '1px solid #333',
                                                            borderLeft: `4px solid ${statusColor}`,
                                                            padding: isMobile ? '15px' : '22px',
                                                            display: 'flex', flexDirection: 'column', gap: '16px'
                                                        }}>
                                                            {/* Client Header */}
                                                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                                    <div style={{
                                                                        width: '48px', height: '48px', borderRadius: '12px', background: '#111',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        border: `1px solid ${statusColor}30`
                                                                    }}>
                                                                        <IonIcon icon={desktop} style={{ fontSize: '24px', color: statusColor }} />
                                                                    </div>
                                                                    <div>
                                                                        <h3 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: '900' }}>
                                                                            {client.name || 'Unknown Device'}
                                                                        </h3>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                                            <span style={{
                                                                                background: statusBg, color: statusColor,
                                                                                padding: '2px 10px', borderRadius: '20px',
                                                                                fontSize: '0.6rem', fontWeight: '800',
                                                                                border: `1px solid ${statusColor}30`,
                                                                                letterSpacing: '0.5px'
                                                                            }}>{statusLabel}</span>
                                                                            <span style={{ color: '#555', fontSize: '0.7rem' }}>{client.requests || 0} requests</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Client Info Grid */}
                                                            <div style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                                                                gap: '1px', background: '#222', borderRadius: '12px',
                                                                overflow: 'hidden', border: '1px solid #222'
                                                            }}>
                                                                {[
                                                                    { icon: desktop, label: 'PC Name', value: client.name },
                                                                    { icon: person, label: 'App User', value: client.username },
                                                                    { icon: business, label: 'Company', value: client.company },
                                                                    { icon: server, label: 'Internal IP', value: client.ip },
                                                                    { icon: server, label: 'External IP', value: client.externalIp },
                                                                    { icon: server, label: 'MAC Address', value: client.mac }
                                                                ].map((stat, i) => (
                                                                    <div key={i} style={{ background: '#1c1c1c', padding: isMobile ? '8px 12px' : '12px 16px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                            <IonIcon icon={stat.icon} style={{ fontSize: '10px', color: '#888' }} />
                                                                            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: '#666', letterSpacing: '0.8px', fontWeight: '800' }}>{stat.label}</span>
                                                                        </div>
                                                                        <div style={{
                                                                            fontSize: isMobile ? '0.75rem' : '0.82rem',
                                                                            color: stat.value ? '#ddd' : '#444',
                                                                            fontWeight: '700',
                                                                            fontFamily: (stat.label.includes('IP') || stat.label.includes('MAC')) ? 'monospace' : 'inherit',
                                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                                        }}>
                                                                            {stat.value || '—'}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Last seen + Actions */}
                                                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '10px' }}>
                                                                <div style={{ fontSize: '0.7rem', color: '#555' }}>
                                                                    <span>First seen: {client.firstSeen ? new Date(client.firstSeen).toLocaleString() : '—'}</span>
                                                                    <span style={{ margin: '0 8px' }}>•</span>
                                                                    <span>Last active: {client.lastSeen ? new Date(client.lastSeen).toLocaleTimeString() : '—'}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                    {client.status === 'pending' && (
                                                                        <button onClick={async () => {
                                                                            try {
                                                                                await fetch('http://localhost:3001/api/admin/approve', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                                                                if (onRefreshServerStats) onRefreshServerStats();
                                                                            } catch(e){}
                                                                        }} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.3px' }}>
                                                                            ✓ APPROVE
                                                                        </button>
                                                                    )}
                                                                    {client.status === 'pending' && (
                                                                        <button onClick={async () => {
                                                                            try {
                                                                                await fetch('http://localhost:3001/api/admin/block', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                                                                if (onRefreshServerStats) onRefreshServerStats();
                                                                            } catch(e){}
                                                                        }} style={{ background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '7px 16px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                                                                            ✕ REJECT
                                                                        </button>
                                                                    )}
                                                                    {client.status === 'approved' && (
                                                                        <button onClick={async () => {
                                                                            try {
                                                                                await fetch('http://localhost:3001/api/admin/block', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                                                                if (onRefreshServerStats) onRefreshServerStats();
                                                                            } catch(e){}
                                                                        }} style={{ background: 'rgba(220,38,38,0.15)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '7px 16px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                                                                            BLOCK
                                                                        </button>
                                                                    )}
                                                                    {client.status === 'blocked' && (
                                                                        <button onClick={async () => {
                                                                            try {
                                                                                await fetch('http://localhost:3001/api/admin/unblock', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                                                                if (onRefreshServerStats) onRefreshServerStats();
                                                                            } catch(e){}
                                                                        }} style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '7px 16px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                                                                            ✓ UNBLOCK
                                                                        </button>
                                                                    )}
                                                                    <button onClick={async () => {
                                                                        if (!window.confirm(`Remove ${client.name} from the client list?`)) return;
                                                                        try {
                                                                            await fetch('http://localhost:3001/api/admin/remove', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ip: client.ip}) });
                                                                            if (onRefreshServerStats) onRefreshServerStats();
                                                                        } catch(e){}
                                                                    }} style={{ background: 'rgba(100,116,139,0.1)', color: '#64748B', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '8px', padding: '7px 16px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                                                                        REMOVE
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* No server running or no clients */}
                                    {!expressServerRunning && (
                                        <div style={{
                                            textAlign: 'center', background: '#1a1a1a', padding: '60px', borderRadius: '24px',
                                            border: '1px dashed #333'
                                        }}>
                                            <IonIcon icon={server} style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }} />
                                            <h3 style={{ color: '#555', margin: 0 }}>Server is not running</h3>
                                            <p style={{ color: '#444', margin: '10px 0 0', fontSize: '0.85rem' }}>Start the LAN server to see connected hosts.</p>
                                        </div>
                                    )}

                                    {expressServerRunning && (!expressServerStats?.clients || expressServerStats.clients.length === 0) && (
                                        <div style={{
                                            textAlign: 'center', background: '#1a1a1a', padding: '40px', borderRadius: '20px',
                                            border: '1px dashed #333'
                                        }}>
                                            <IonIcon icon={desktop} style={{ fontSize: '40px', color: '#333', marginBottom: '15px' }} />
                                            <h3 style={{ color: '#555', margin: 0, fontSize: '1rem' }}>No clients connected yet</h3>
                                            <p style={{ color: '#444', margin: '10px 0 0', fontSize: '0.8rem' }}>Clients will appear here when they connect to the server.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'sessions' && (
                            <>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid #222', gap: '15px' }}>
                                    <div>
                                        <h1 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '900' }}>🖥️ Live Device Monitor</h1>
                                        <p style={{ color: '#aaa', margin: '5px 0 0', fontSize: '0.85rem' }}>Real-time tracking of all connected devices • Auto-refresh every 5s</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <IonButton fill="clear" color="danger" size="small" onClick={cleanOfflineSessions} style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                                            <IonIcon icon={trash} slot="start" />CLEAN
                                        </IonButton>
                                        <IonButton fill="clear" color="warning" size="small" onClick={() => fetchSessions()} disabled={loading} style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                                            <IonIcon icon={refresh} slot="start" className={loading ? 'spinning' : ''} />REFRESH
                                        </IonButton>
                                    </div>
                                </div>

                                {loading && sessions.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#aaa', padding: '100px 0' }}>
                                        <div className="spinning" style={{ fontSize: '40px', marginBottom: '20px' }}>⚙️</div>
                                        <span>Synchronizing with secure server...</span>
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div style={{ textAlign: 'center', background: '#1a1a1a', padding: '60px', borderRadius: '24px', border: '1px dashed #333' }}>
                                        <IonIcon icon={desktop} style={{ fontSize: '48px', color: '#444', marginBottom: '20px' }} />
                                        <h3 style={{ color: '#aaa', margin: 0 }}>No active sessions detected</h3>
                                        <p style={{ color: '#888', margin: '10px 0 0' }}>Launch the application on another device to see it here.</p>
                                    </div>
                                ) : (() => {
                                    // Group sessions by company
                                    const grouped = {};
                                    sessions.forEach(s => {
                                        const comp = s.user_company || 'Unassigned';
                                        if (!grouped[comp]) grouped[comp] = [];
                                        grouped[comp].push(s);
                                    });
                                    const companyNames = Object.keys(grouped).sort((a, b) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b));

                                    const getDeviceIcon = (type) => {
                                        if (type === 'android') return '📱';
                                        if (type === 'web') return '🌐';
                                        return '💻';
                                    };
                                    const getDeviceLabel = (type) => {
                                        if (type === 'android') return 'Android';
                                        if (type === 'web') return 'Web Browser';
                                        return 'Desktop PC';
                                    };
                                    const formatDuration = (isoString) => {
                                        if (!isoString) return '—';
                                        const diff = Date.now() - new Date(isoString).getTime();
                                        if (diff < 0) return '—';
                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                        const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                        if (days > 0) return `${days}d ${hrs}h ${mins}m`;
                                        if (hrs > 0) return `${hrs}h ${mins}m`;
                                        return `${mins}m`;
                                    };
                                    const getAccessCountdown = (expiresAt) => {
                                        if (!expiresAt) return { text: '∞ Permanent', color: '#3880ff', bg: 'rgba(56,128,255,0.1)' };
                                        const diff = new Date(expiresAt).getTime() - Date.now();
                                        if (diff <= 0) return { text: 'EXPIRED', color: '#eb445a', bg: 'rgba(235,68,90,0.1)' };
                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                        const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                        let text = '';
                                        if (days > 0) text = `${days}d ${hrs}h left`;
                                        else text = `${hrs}h left`;
                                        let color = '#2dd36f', bg = 'rgba(45,211,111,0.1)';
                                        if (diff < 24 * 60 * 60 * 1000) { color = '#eb445a'; bg = 'rgba(235,68,90,0.1)'; }
                                        else if (diff < 3 * 24 * 60 * 60 * 1000) { color = '#ffc409'; bg = 'rgba(255,196,9,0.1)'; }
                                        return { text: `⏱ ${text}`, color, bg };
                                    };

                                    return (
                                        <div style={{ display: 'grid', gap: '30px' }}>
                                            {companyNames.map(compName => (
                                                <div key={compName}>
                                                    {/* Company Group Header */}
                                                    <div style={{
                                                        padding: '8px 15px', background: 'rgba(197, 160, 89, 0.08)', borderRadius: '12px',
                                                        marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px',
                                                        borderLeft: '4px solid #c5a059', border: '1px solid rgba(197, 160, 89, 0.1)'
                                                    }}>
                                                        <IonIcon icon={business} style={{ color: '#c5a059', fontSize: '16px' }} />
                                                        <span style={{ color: '#c5a059', fontWeight: '900', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{compName}</span>
                                                        <IonBadge style={{ background: 'rgba(197,160,89,0.15)', color: '#c5a059', fontSize: '0.65rem' }}>{grouped[compName].length}</IonBadge>
                                                    </div>

                                                    <div style={{ display: 'grid', gap: '20px' }}>
                                                        {grouped[compName].map((session, idx) => {
                                                            const isSuspended = session.status === 'suspended';
                                                            const isExpired = session.valid_until && new Date(session.valid_until) < new Date();
                                                            const isAccessExpired = session.access_expires && new Date(session.access_expires) < new Date();
                                                            const isLocked = isSuspended || isExpired || isAccessExpired;
                                                            const accessInfo = getAccessCountdown(session.access_expires);
                                                            const perms = session.user_permissions || {};
                                                            const actions = perms.actions || {};

                                                            return (
                                                                <div key={idx} className="pro-glass-card animate-slide-in" style={{
                                                                    background: '#1a1a1a', border: '1px solid #333',
                                                                    borderLeft: `4px solid ${session.isOnline ? '#2dd36f' : '#eb445a'}`,
                                                                    padding: isMobile ? '15px' : '22px', gap: '16px', display: 'flex', flexDirection: 'column'
                                                                }}>
                                                                    {/* ROW 1: Identity + Status */}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                                            {/* Device Icon */}
                                                                            <div style={{
                                                                                width: '52px', height: '52px', borderRadius: '14px', background: '#111',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                border: '1px solid #333', fontSize: '24px', flexShrink: 0,
                                                                                position: 'relative'
                                                                            }}>
                                                                                {getDeviceIcon(session.device_type)}
                                                                                {/* Online pulse */}
                                                                                {session.isOnline && (
                                                                                    <div style={{
                                                                                        position: 'absolute', bottom: '-2px', right: '-2px',
                                                                                        width: '14px', height: '14px', borderRadius: '50%',
                                                                                        background: '#2dd36f', border: '2px solid #1a1a1a',
                                                                                        animation: 'pulse 2s infinite'
                                                                                    }} />
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                    <h2 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: '900' }}>
                                                                                        {session.logged_in_user || session.display_name || session.pc_name || 'Unknown'}
                                                                                    </h2>
                                                                                    {/* HOST Badge */}
                                                                                    {session.is_host && (
                                                                                        <span style={{
                                                                                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.55rem', fontWeight: '900',
                                                                                            background: 'linear-gradient(135deg, #c5a059, #d4af37)', color: '#000',
                                                                                            textTransform: 'uppercase', letterSpacing: '0.5px'
                                                                                        }}>🏠 HOST</span>
                                                                                    )}
                                                                                    {/* Role Badge */}
                                                                                    <span style={{
                                                                                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.55rem', fontWeight: '800',
                                                                                        textTransform: 'uppercase', letterSpacing: '0.3px',
                                                                                        background: session.user_role === 'admin' ? 'rgba(235,68,90,0.15)' : 'rgba(56,128,255,0.12)',
                                                                                        color: session.user_role === 'admin' ? '#eb445a' : '#3880ff'
                                                                                    }}>{session.user_role === 'admin' ? '🛡️ Admin' : '👤 User'}</span>
                                                                                    {/* Device Type */}
                                                                                    <span style={{
                                                                                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.55rem', fontWeight: '700',
                                                                                        background: 'rgba(255,255,255,0.05)', color: '#bbb'
                                                                                    }}>{getDeviceIcon(session.device_type)} {getDeviceLabel(session.device_type)}</span>
                                                                                    {!isMobile && <IonBadge style={{ background: 'rgba(255,255,255,0.08)', color: '#ddd', borderRadius: '6px', fontSize: '0.6rem' }}>v{session.app_version}</IonBadge>}
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: session.isOnline ? '#2dd36f' : '#bbb', animation: session.isOnline ? 'pulse 2s infinite' : 'none' }} />
                                                                                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: session.isOnline ? '#2dd36f' : '#bbb', textTransform: 'uppercase' }}>
                                                                                            {session.isOnline ? 'ONLINE' : 'OFFLINE'}
                                                                                        </span>
                                                                                    </div>
                                                                                    {session.pc_name && session.logged_in_user && session.pc_name !== session.logged_in_user && (
                                                                                        <span style={{ fontSize: '0.65rem', color: '#888' }}>on {session.pc_name}</span>
                                                                                    )}
                                                                                    {/* Single Session Lock */}
                                                                                    <span style={{ fontSize: '0.55rem', color: '#2dd36f', background: 'rgba(45,211,111,0.08)', padding: '1px 6px', borderRadius: '4px' }}>🔒 Single Session</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {/* Status Badges */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                                                            {session.session_status === 'logged_out' && (
                                                                                <div style={{ background: 'rgba(255,196,9,0.1)', color: '#ffc409', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid rgba(255,196,9,0.2)' }}>
                                                                                    ⚠️ SESSION KICKED
                                                                                </div>
                                                                            )}
                                                                            {isLocked ? (
                                                                                <div style={{ background: 'rgba(235,68,90,0.1)', color: '#eb445a', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid rgba(235,68,90,0.2)' }}>
                                                                                    🔒 LOCKED
                                                                                </div>
                                                                            ) : (
                                                                                <div style={{ background: 'rgba(45,211,111,0.1)', color: '#2dd36f', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid rgba(45,211,111,0.2)' }}>
                                                                                    ✓ ACTIVE
                                                                                </div>
                                                                            )}
                                                                            {/* Access Timer */}
                                                                            <div style={{ background: accessInfo.bg, color: accessInfo.color, padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', border: `1px solid ${accessInfo.color}22` }}>
                                                                                {accessInfo.text}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* ROW 2: Currently Viewing (LIVE) */}
                                                                    {session.current_tab && session.isOnline && (
                                                                        <div style={{
                                                                            background: 'rgba(56,128,255,0.06)', padding: '10px 16px', borderRadius: '12px',
                                                                            border: '1px solid rgba(56,128,255,0.12)', display: 'flex', alignItems: 'center', gap: '10px'
                                                                        }}>
                                                                            <div style={{
                                                                                width: '8px', height: '8px', borderRadius: '50%', background: '#3880ff',
                                                                                animation: 'pulse 1.5s infinite', flexShrink: 0
                                                                            }} />
                                                                            <span style={{ fontSize: '0.7rem', color: '#bbb', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Currently Viewing</span>
                                                                            <span style={{ fontSize: '0.9rem', color: '#3880ff', fontWeight: '900' }}>📍 {session.current_tab}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* ROW 3: Info Grid */}
                                                                    <div style={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
                                                                        gap: '1px', background: '#222', borderRadius: '14px', overflow: 'hidden', border: '1px solid #222'
                                                                    }}>
                                                                        {[
                                                                            { icon: '👤', label: 'Login User', value: session.logged_in_user || '—' },
                                                                            { icon: '🌍', label: 'External IP', value: session.external_ip || '—' },
                                                                            { icon: '🏠', label: 'Internal IP', value: session.ip_address || '—' },
                                                                            { icon: '🔌', label: 'MAC / Device ID', value: isMobile ? (session.mac_address || '').substring(0, 12) + '...' : session.mac_address || '—' },
                                                                            { icon: '📍', label: 'Location', value: session.location || '—' },
                                                                            { icon: '⏱', label: 'Login Duration', value: formatDuration(session.login_time), color: '#2dd36f' },
                                                                            { icon: '🕐', label: 'Last Activity', value: formatTime(session.last_active) },
                                                                            { icon: '🖥️', label: 'PC Name', value: session.pc_name || '—' }
                                                                        ].map((stat, i) => (
                                                                            <div key={i} style={{ background: '#1c1c1c', padding: isMobile ? '8px 12px' : '12px 16px' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                                                                    <span style={{ fontSize: '11px' }}>{stat.icon}</span>
                                                                                    <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#999', letterSpacing: '0.8px', fontWeight: '900' }}>{stat.label}</span>
                                                                                </div>
                                                                                <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: stat.color || '#fff', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                    {stat.value}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* ROW 4: Permissions */}
                                                                    {session.user_permissions && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Permissions:</span>
                                                                            {perms.allTabs ? (
                                                                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: '700', background: 'rgba(45,211,111,0.1)', color: '#2dd36f' }}>All Tabs ✓</span>
                                                                            ) : (
                                                                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: '700', background: 'rgba(255,196,9,0.1)', color: '#ffc409' }}>Limited Tabs</span>
                                                                            )}
                                                                            {['view', 'edit', 'add', 'delete'].map(act => (
                                                                                <span key={act} style={{
                                                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: '800',
                                                                                    textTransform: 'uppercase',
                                                                                    background: actions[act] ? 'rgba(45,211,111,0.08)' : 'rgba(235,68,90,0.08)',
                                                                                    color: actions[act] ? '#2dd36f' : '#eb445a'
                                                                                }}>{act.charAt(0).toUpperCase()} {actions[act] ? '✓' : '✗'}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {/* Notes */}
                                                                    {session.notes && (
                                                                        <div style={{ background: 'rgba(197,160,89,0.05)', padding: '10px 16px', borderRadius: '10px', borderLeft: '3px solid #c5a059', fontSize: '0.8rem', color: '#ccc', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <IonIcon icon={informationCircleOutline} style={{ fontSize: '16px', color: '#c5a059' }} />
                                                                            "{session.notes}"
                                                                        </div>
                                                                    )}

                                                                    {/* ROW 5: Action Buttons */}
                                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                        <IonButton size="small" color={isSuspended ? 'success' : 'danger'} fill={isSuspended ? 'solid' : 'clear'} onClick={() => toggleSuspend(session)}
                                                                            style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.05)', flex: isMobile ? '1' : 'none' }}>
                                                                            <IonIcon icon={isSuspended ? lockOpen : lockClosed} slot="start" />
                                                                            {isSuspended ? 'RESTORE' : 'SUSPEND'}
                                                                        </IonButton>

                                                                        <IonButton size="small" color="warning" fill="clear" onClick={() => { setSelectedSessionForAccess(session); setShowDurationModal(true); }}
                                                                            style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.05)', flex: isMobile ? '1' : 'none' }}>
                                                                            <IonIcon icon={timerOutline} slot="start" />
                                                                            ACCESS
                                                                        </IonButton>

                                                                        <IonButton size="small" color="danger" fill="clear" onClick={() => requestRestart(session)}
                                                                            style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem', flex: isMobile ? '1' : 'none' }}>
                                                                            <IonIcon icon={refresh} slot="start" />
                                                                            RESTART
                                                                        </IonButton>

                                                                        <IonButton size="small" color="secondary" fill="outline" onClick={() => setChatSession(session)}
                                                                            style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem', flex: isMobile ? '1' : 'none' }}>
                                                                            <IonIcon icon={chatbubblesOutline} slot="start" />
                                                                            CHAT
                                                                        </IonButton>

                                                                        {!isMobile && <div style={{ flex: 1 }} />}

                                                                        <IonButton size="small" color="medium" fill="clear" onClick={() => {
                                                                            setEditingSession(session); setEditDisplayName(session.display_name || ''); setEditNotes(session.notes || ''); setShowEditSessionModal(true);
                                                                        }} style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem' }}>
                                                                            <IonIcon icon={create} slot="start" />EDIT
                                                                        </IonButton>

                                                                        <IonButton size="small" color="warning" fill="outline" onClick={() => requestBackup(session)} disabled={session.command === 'BACKUP'}
                                                                            style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem', flex: isMobile ? '1' : 'none' }}>
                                                                            <IonIcon icon={cloudUpload} slot="start" />
                                                                            {session.command === 'BACKUP' ? '...' : 'BACKUP'}
                                                                        </IonButton>

                                                                        {session.backup_url && (
                                                                            <IonButton size="small" color="success" fill="solid" onClick={() => window.open(session.backup_url, '_system')}
                                                                                style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem' }}>
                                                                                <IonIcon icon={cloudDownload} slot="start" />ZIP
                                                                            </IonButton>
                                                                        )}

                                                                        <IonButton size="small" color="primary" fill="solid" onClick={() => { setSelectedSessionForUpdate(session); updateInputRef.current?.click(); }} disabled={pushingUpdate}
                                                                            style={{ '--border-radius': '8px', height: '34px', fontWeight: 'bold', fontSize: '0.65rem', flex: isMobile ? '1' : 'none' }}>
                                                                            <IonIcon icon={pushingUpdate && selectedSessionForUpdate?.id === session.id ? refresh : cloudUpload} slot="start" className={pushingUpdate ? 'spinning' : ''} />
                                                                            {pushingUpdate && selectedSessionForUpdate?.id === session.id ? `${pushProgress}%` : 'UPDATE'}
                                                                        </IonButton>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </>
                        )}

                        {activeTab === 'users' && (
                            <>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid #222', gap: '15px' }}>
                                    <div>
                                        <h1 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '900' }}>User Management</h1>
                                        <p style={{ color: '#aaa', margin: '5px 0 0', fontSize: '0.85rem' }}>Manage system access and rank.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <IonButton
                                            color="warning"
                                            size="small"
                                            style={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                                            onClick={() => openUserEditor()}
                                        >
                                            <IonIcon icon={personAdd} slot="start" />
                                            NEW USER
                                        </IonButton>
                                        <IonButton
                                            fill="clear"
                                            color="warning"
                                            size="small"
                                            onClick={fetchData}
                                            disabled={loading}
                                            style={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                                        >
                                            <IonIcon icon={refresh} slot="start" className={loading ? 'spinning' : ''} />
                                            REFRESH
                                        </IonButton>
                                    </div>
                                </div>

                                {loading && users.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#aaa', padding: '100px 0' }}>
                                        <div className="spinning" style={{ fontSize: '40px', marginBottom: '20px' }}>⚙️</div>
                                        <span>Syncing users...</span>
                                    </div>
                                ) : users.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center', background: '#1a1a1a', padding: '60px', borderRadius: '24px',
                                        border: '1px dashed #333'
                                    }}>
                                        <IonIcon icon={people} style={{ fontSize: '48px', color: '#444', marginBottom: '20px' }} />
                                        <h3 style={{ color: '#aaa', margin: 0 }}>No users found</h3>
                                        <p style={{ color: '#888', margin: '10px 0 0' }}>Create your first user to grant access.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '30px' }}>
                                        {companies.map(company => (
                                            <div key={company}>
                                                <div style={{
                                                    padding: '8px 15px', background: 'rgba(197, 160, 89, 0.08)', borderRadius: '12px',
                                                    marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px',
                                                    borderLeft: '4px solid #c5a059', border: '1px solid rgba(197, 160, 89, 0.1)'
                                                }}>
                                                    <IonIcon icon={business} style={{ color: '#c5a059' }} />
                                                    <span style={{ fontWeight: '900', color: '#c5a059', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem' }}>{company}</span>
                                                    <div style={{ flex: 1 }} />
                                                    <IonBadge color="warning" style={{ borderRadius: '6px', fontSize: '0.6rem' }}>{users.filter(u => u.company === company).length} USERS</IonBadge>
                                                </div>
                                                <div style={{ display: 'grid', gap: '15px' }}>
                                                    {users.filter(u => u.company === company).map((user, idx) => (
                                                        <div key={idx} className="pro-glass-card animate-slide-in" style={{
                                                            background: '#1a1a1a',
                                                            border: '1px solid #333',
                                                            borderLeft: `4px solid ${user.rank === 'admin' ? '#eb445a' : '#c5a059'}`,
                                                            padding: isMobile ? '12px 15px' : '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '15px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{
                                                                    width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', borderRadius: '12px', background: '#111',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333'
                                                                }}>
                                                                    <IonIcon icon={user.rank === 'admin' ? shieldCheckmarkOutline : person} style={{ fontSize: isMobile ? '20px' : '24px', color: user.rank === 'admin' ? '#eb445a' : '#c5a059' }} />
                                                                </div>
                                                                <div>
                                                                    <h3 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900' }}>{user.name}</h3>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                                        <IonBadge style={{ background: 'rgba(255,255,255,0.05)', color: '#888', fontSize: '0.6rem' }}>{user.rank.toUpperCase()}</IonBadge>
                                                                        {isMobile && <span style={{ color: '#444', fontSize: '0.7rem' }}>
                                                                            {user.permissions?.allTabs ? 'All Tabs' : `${user.permissions?.allowedTabs?.length || 0} Tabs`}
                                                                        </span>}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '10px', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                                                                {!isMobile && (
                                                                    <div style={{ textAlign: 'right', marginRight: '20px' }}>
                                                                        <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Permissions</div>
                                                                        <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                                                                            {user.permissions?.allTabs ? 'All Tabs' : `${user.permissions?.allowedTabs?.length || 0} Tabs`}
                                                                            {' • '}
                                                                            {Object.entries(user.permissions?.actions || {})
                                                                                .filter(([_, v]) => v)
                                                                                .map(([k, _]) => k.charAt(0).toUpperCase())
                                                                                .join('/')}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <IonButton fill="clear" color="warning" size="small" onClick={() => openUserEditor(user)}>
                                                                    <IonIcon icon={create} slot="icon-only" />
                                                                </IonButton>
                                                                <IonButton fill="clear" color="danger" size="small" onClick={() => handleDeleteUser(user)}>
                                                                    <IonIcon icon={trash} slot="icon-only" />
                                                                </IonButton>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {users.filter(u => !u.company).length > 0 && (
                                            <div>
                                                <div style={{ padding: '8px 15px', color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Unassigned Company</div>
                                                <div style={{ display: 'grid', gap: '15px', marginTop: '10px' }}>
                                                    {users.filter(u => !u.company).map((user, idx) => (
                                                        <div key={idx} className="pro-glass-card" style={{
                                                            background: '#1a1a1a',
                                                            border: '1px solid #333',
                                                            borderLeft: `4px solid #999`,
                                                            padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333' }}>
                                                                    <IonIcon icon={person} style={{ fontSize: '24px', color: '#999' }} />
                                                                </div>
                                                                <div>
                                                                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{user.name}</h3>
                                                                    <IonBadge style={{ background: 'rgba(255,255,255,0.05)', color: '#aaa' }}>{user.rank.toUpperCase()}</IonBadge>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <IonButton fill="clear" color="warning" onClick={() => openUserEditor(user)}>
                                                                    <IonIcon icon={create} slot="icon-only" />
                                                                </IonButton>
                                                                <IonButton fill="clear" color="danger" onClick={() => handleDeleteUser(user)}>
                                                                    <IonIcon icon={trash} slot="icon-only" />
                                                                </IonButton>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'logs' && (
                            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                                {/* HEADER */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #222' }}>
                                    <div>
                                        <h1 style={{ color: '#fff', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>Application Audit Logs</h1>
                                        <p style={{ color: '#aaa', margin: '5px 0 0', fontSize: '0.9rem' }}>Trace all modifications and system activities. Showing up to 500 operations.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <IonButton fill="outline" color="warning" onClick={generateAuditPDF} disabled={filteredLogs.length === 0}
                                            style={{ '--border-radius': '10px', fontWeight: 'bold' }}>
                                            <IonIcon icon={downloadOutline} slot="start" />
                                            EXPORT PDF
                                        </IonButton>
                                        <IonButton fill="clear" color="warning" onClick={fetchData} disabled={loading}>
                                            <IonIcon icon={refresh} slot="start" className={loading ? 'spinning' : ''} />
                                            REFRESH
                                        </IonButton>
                                    </div>
                                </div>

                                {/* FILTER BAR */}
                                <div style={{
                                    display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap',
                                    marginBottom: '20px', padding: '18px 22px',
                                    background: 'rgba(197, 160, 89, 0.04)', borderRadius: '16px',
                                    border: '1px solid rgba(197, 160, 89, 0.12)'
                                }}>
                                    {/* User Filter */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <IonIcon icon={person} style={{ color: '#c5a059', fontSize: '18px' }} />
                                        <select
                                            value={logUserFilter}
                                            onChange={e => setLogUserFilter(e.target.value)}
                                            style={{
                                                background: '#111', color: '#fff', border: '1px solid #333',
                                                borderRadius: '10px', padding: '9px 16px', fontSize: '0.85rem',
                                                outline: 'none', cursor: 'pointer', minWidth: isMobile ? '120px' : '180px'
                                            }}
                                        >
                                            <option value="" style={{ background: '#111' }}>All Users</option>
                                            {uniqueLogUsers.map(u => (
                                                <option key={u} value={u} style={{ background: '#111' }}>{u}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Separator */}
                                    <div style={{ width: '1px', height: '30px', background: '#333' }} />

                                    {/* Date From */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <IonIcon icon={calendarOutline} style={{ color: '#c5a059', fontSize: '18px' }} />
                                        <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>From</span>
                                        <input
                                            type="date"
                                            value={logDateFrom}
                                            onChange={e => setLogDateFrom(e.target.value)}
                                            style={{
                                                background: '#111', color: '#fff', border: '1px solid #333',
                                                borderRadius: '10px', padding: '8px 14px', fontSize: '0.85rem',
                                                outline: 'none', cursor: 'pointer', colorScheme: 'dark'
                                            }}
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#666', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>To</span>
                                        <input
                                            type="date"
                                            value={logDateTo}
                                            onChange={e => setLogDateTo(e.target.value)}
                                            style={{
                                                background: '#111', color: '#fff', border: '1px solid #333',
                                                borderRadius: '10px', padding: '8px 14px', fontSize: '0.85rem',
                                                outline: 'none', cursor: 'pointer', colorScheme: 'dark'
                                            }}
                                        />
                                    </div>

                                    {/* Clear Filters */}
                                    {(logUserFilter || logDateFrom || logDateTo) && (
                                        <IonButton
                                            size="small" fill="clear" color="danger"
                                            onClick={() => { setLogUserFilter(''); setLogDateFrom(''); setLogDateTo(''); }}
                                            style={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                                        >
                                            CLEAR FILTERS
                                        </IonButton>
                                    )}

                                    <div style={{ flex: 1 }} />

                                    {/* Results count */}
                                    <IonBadge style={{
                                        background: 'rgba(197, 160, 89, 0.12)', color: '#c5a059',
                                        borderRadius: '8px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 'bold'
                                    }}>
                                        {filteredLogs.length} {filteredLogs.length === 1 ? 'RECORD' : 'RECORDS'}
                                    </IonBadge>
                                </div>

                                {/* LOGS TABLE */}
                                <div className="pro-glass-card" style={{ padding: '0', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid #222' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#111', textAlign: 'left' }}>
                                                <th style={{ padding: '15px 20px', color: '#c5a059', fontWeight: '900' }}>TIME</th>
                                                <th style={{ padding: '15px 20px', color: '#c5a059', fontWeight: '900' }}>USER</th>
                                                <th style={{ padding: '15px 20px', color: '#c5a059', fontWeight: '900' }}>ACTION</th>
                                                <th style={{ padding: '15px 20px', color: '#c5a059', fontWeight: '900' }}>MODULE</th>
                                                <th style={{ padding: '15px 20px', color: '#c5a059', fontWeight: '900' }}>DETAILS</th>
                                                <th style={{ padding: '15px 20px', color: '#c5a059', fontWeight: '900' }}>IP ADDRESS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLogs.length === 0 ? (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                                                    <IonIcon icon={funnelOutline} style={{ fontSize: '32px', display: 'block', margin: '0 auto 12px', color: '#444' }} />
                                                    {appLogs.length === 0 ? 'No activity logs found.' : 'No logs match your current filters.'}
                                                </td></tr>
                                            ) : (
                                                filteredLogs.map((log, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                        <td style={{ padding: '12px 20px', color: '#aaa', whiteSpace: 'nowrap' }}>{formatTime(log.created_at)}</td>
                                                        <td style={{ padding: '12px 20px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{
                                                                    width: '26px', height: '26px', borderRadius: '8px', background: '#1a1a1a',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    border: '1px solid #333', flexShrink: 0
                                                                }}>
                                                                    <IonIcon icon={person} style={{ fontSize: '12px', color: '#c5a059' }} />
                                                                </div>
                                                                <span style={{ color: '#ddd', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                                    {log.user_name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 20px' }}>
                                                            <IonBadge color={log.action === 'DELETE' ? 'danger' : log.action === 'ADD' ? 'success' : log.action === 'EDIT' ? 'warning' : log.action === 'CANCEL' ? 'tertiary' : 'primary'} style={{ borderRadius: '4px', fontSize: '0.65rem', padding: '4px 8px' }}>
                                                                {log.action}
                                                            </IonBadge>
                                                        </td>
                                                        <td style={{ padding: '12px 20px', fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', fontSize: '0.75rem' }}>{log.tab_name || log.tab || '-'}</td>
                                                        <td style={{ padding: '12px 20px', color: '#eee', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
                                                        <td style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#444', fontFamily: 'monospace' }}>
                                                            {log.ip_address || '---'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* HIDDEN UPDATE FILE INPUT */}
                        <input
                            type="file"
                            ref={updateInputRef}
                            style={{ display: 'none' }}
                            onChange={handlePushUpdateFile}
                            accept=".exe,.msi,.zip,.apk"
                        />

                        {/* MAINTENANCE SECTION */}
                        <div style={{ marginTop: '50px', padding: '40px 0', borderTop: '1px solid #222' }}>
                            <div style={{
                                background: 'rgba(235, 68, 90, 0.05)', border: '1px solid rgba(235, 68, 90, 0.1)',
                                borderRadius: '24px', padding: '40px', textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(235, 68, 90, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                                }}>
                                    <IonIcon icon={trash} style={{ fontSize: '28px', color: '#eb445a' }} />
                                </div>
                                <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '900', margin: '0 0 10px 0' }}>Factory System Reset</h2>
                                <p style={{ color: '#aaa', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 30px' }}>
                                    Clearing local data will log out all sessions on this device and reset application settings. This is a destructive action for this terminal only.
                                </p>
                                <IonButton
                                    color="danger"
                                    fill="solid"
                                    onClick={() => {
                                        if (window.confirm('CRITICAL: This will DELETE ALL LOCAL DATA. Are you sure?')) {
                                            localStorage.clear();
                                            window.location.reload();
                                        }
                                    }}
                                    style={{ '--padding-start': '40px', '--padding-end': '40px', '--border-radius': '12px', fontWeight: 'bold' }}
                                >
                                    PERFORM SYSTEM RESET
                                </IonButton>
                            </div>
                        </div>

                        {/* CHANGE OWNER PASSWORD SECTION */}
                        <div style={{ marginTop: '30px', padding: '0 0 40px 0' }}>
                            <div style={{
                                background: 'rgba(197, 160, 89, 0.05)', border: '1px solid rgba(197, 160, 89, 0.15)',
                                borderRadius: '24px', padding: '40px', textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(197, 160, 89, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                                }}>
                                    <IonIcon icon={keyOutline} style={{ fontSize: '28px', color: '#c5a059' }} />
                                </div>
                                <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '900', margin: '0 0 10px 0' }}>Change Owner Password</h2>
                                <p style={{ color: '#aaa', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 30px' }}>
                                    Update your secure owner monitor password. You must verify your current password first.
                                </p>

                                {!showChangeOwnerPass ? (
                                    <IonButton
                                        color="warning"
                                        fill="outline"
                                        onClick={() => {
                                            setShowChangeOwnerPass(true);
                                            setCurrentOwnerPass('');
                                            setNewOwnerPass('');
                                            setConfirmOwnerPass('');
                                            setOwnerPassError('');
                                        }}
                                        style={{ '--padding-start': '40px', '--padding-end': '40px', '--border-radius': '12px', fontWeight: 'bold' }}
                                    >
                                        <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                                        CHANGE PASSWORD
                                    </IonButton>
                                ) : (
                                    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                                        <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px', marginBottom: '12px' }}>
                                            <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold' }}>CURRENT PASSWORD</IonLabel>
                                            <IonInput
                                                type="password"
                                                placeholder="••••••••"
                                                value={currentOwnerPass}
                                                onIonChange={e => setCurrentOwnerPass(e.detail.value)}
                                                style={{ '--color': '#fff', marginTop: '10px' }}
                                            />
                                        </IonItem>
                                        <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px', marginBottom: '12px' }}>
                                            <IonLabel position="stacked" style={{ color: '#2dd36f', fontWeight: 'bold' }}>NEW PASSWORD</IonLabel>
                                            <IonInput
                                                type="password"
                                                placeholder="Min 6 characters"
                                                value={newOwnerPass}
                                                onIonChange={e => setNewOwnerPass(e.detail.value)}
                                                style={{ '--color': '#fff', marginTop: '10px' }}
                                            />
                                        </IonItem>
                                        <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px', marginBottom: '12px' }}>
                                            <IonLabel position="stacked" style={{ color: '#2dd36f', fontWeight: 'bold' }}>CONFIRM NEW PASSWORD</IonLabel>
                                            <IonInput
                                                type="password"
                                                placeholder="Re-enter new password"
                                                value={confirmOwnerPass}
                                                onIonChange={e => setConfirmOwnerPass(e.detail.value)}
                                                style={{ '--color': '#fff', marginTop: '10px' }}
                                            />
                                        </IonItem>

                                        {ownerPassError && (
                                            <p style={{ color: '#eb445a', fontSize: '0.85rem', margin: '10px 0', textAlign: 'center' }}>{ownerPassError}</p>
                                        )}

                                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                            <IonButton
                                                expand="block"
                                                fill="outline"
                                                color="medium"
                                                style={{ flex: 1, '--border-radius': '12px' }}
                                                onClick={() => {
                                                    setShowChangeOwnerPass(false);
                                                    setOwnerPassError('');
                                                }}
                                            >
                                                Cancel
                                            </IonButton>
                                            <IonButton
                                                expand="block"
                                                color="success"
                                                style={{ flex: 1, '--border-radius': '12px', fontWeight: 'bold' }}
                                                onClick={() => {
                                                    const security = getAppSecurity();
                                                    if (currentOwnerPass !== security.ownerPassword) {
                                                        setOwnerPassError('Current password is incorrect.');
                                                        return;
                                                    }
                                                    if (!newOwnerPass || newOwnerPass.length < 6) {
                                                        setOwnerPassError('New password must be at least 6 characters.');
                                                        return;
                                                    }
                                                    if (newOwnerPass !== confirmOwnerPass) {
                                                        setOwnerPassError('New passwords do not match.');
                                                        return;
                                                    }
                                                    // Save new owner password
                                                    setAppSecurity({ ...security, ownerPassword: newOwnerPass });
                                                    setShowChangeOwnerPass(false);
                                                    setOwnerPassError('');
                                                    setCurrentOwnerPass('');
                                                    setNewOwnerPass('');
                                                    setConfirmOwnerPass('');
                                                    alert('Owner password updated successfully!');
                                                }}
                                            >
                                                SAVE PASSWORD
                                            </IonButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </IonContent>

            {/* DURATION MODAL */}
            <IonModal isOpen={showDurationModal} onDidDismiss={() => setShowDurationModal(false)} style={{
                '--height': 'auto', '--width': '400px', '--border-radius': '24px'
            }}>
                <div style={{ padding: '30px', background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(56, 128, 255, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                    }}>
                        <IonIcon icon={timerOutline} style={{ fontSize: '32px', color: '#3880ff' }} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 5px 0' }}>Access Duration</h3>
                    {selectedSessionForAccess && (
                        <p style={{ color: '#c5a059', fontSize: '0.8rem', fontWeight: '700', margin: '0 0 5px' }}>
                            {selectedSessionForAccess.logged_in_user || selectedSessionForAccess.pc_name}
                        </p>
                    )}
                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '25px' }}>Set how long this user can access the application.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                            { label: '1 Day', minutes: 1440, color: 'primary' },
                            { label: '3 Days', minutes: 4320, color: 'primary' },
                            { label: '7 Days', minutes: 10080, color: 'primary' },
                            { label: '15 Days', minutes: 21600, color: 'primary' },
                            { label: '1 Month', minutes: 43200, color: 'warning' },
                            { label: '3 Months', minutes: 129600, color: 'warning' },
                            { label: '6 Months', minutes: 259200, color: 'warning' },
                            { label: '1 Year', minutes: 525600, color: 'danger' },
                        ].map(opt => (
                            <IonButton key={opt.label} expand="block" shape="round" color={opt.color} fill="outline" onClick={() => handleGrantAccess(opt.minutes)}
                                style={{ '--border-radius': '12px', fontWeight: '800', fontSize: '0.75rem' }}>
                                {opt.label}
                            </IonButton>
                        ))}
                    </div>
                    <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                        <IonButton expand="block" shape="round" color="success" onClick={() => handleGrantAccess(-1)}
                            style={{ '--border-radius': '12px', fontWeight: '800', fontSize: '0.85rem' }}>
                            ∞ PERMANENT ACCESS
                        </IonButton>
                        <IonButton expand="block" fill="clear" color="medium" onClick={() => setShowDurationModal(false)}>CLOSE</IonButton>
                    </div>
                </div>
            </IonModal>
            {/* SESSION INFO EDIT MODAL */}
            <IonModal isOpen={showEditSessionModal} onDidDismiss={() => setShowEditSessionModal(false)} style={{
                '--height': 'auto', '--width': '450px', '--border-radius': '24px'
            }}>
                <div style={{ padding: '30px', background: '#1a1a1a', color: '#fff' }}>
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(197, 160, 89, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                        }}>
                            <IonIcon icon={create} style={{ fontSize: '32px', color: '#c5a059' }} />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 10px 0' }}>Session Identity</h3>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>Rename this device and add reference notes for your monitor.</p>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px' }}>
                            <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold' }}>DISPLAY NAME</IonLabel>
                            <IonInput
                                placeholder="e.g. Finance Desktop / Store iPad"
                                value={editDisplayName}
                                onIonChange={e => setEditDisplayName(e.detail.value)}
                                style={{ '--color': '#fff', marginTop: '10px' }}
                            />
                        </IonItem>

                        <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px' }}>
                            <IonLabel position="stacked" style={{ color: '#bbb', fontWeight: 'bold' }}>NOTES / DESCRIPTION</IonLabel>
                            <IonInput
                                placeholder="e.g. Located in main office"
                                value={editNotes}
                                onIonChange={e => setEditNotes(e.detail.value)}
                                style={{ '--color': '#fff', marginTop: '10px' }}
                            />
                        </IonItem>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <IonButton
                                expand="block"
                                fill="clear"
                                color="medium"
                                style={{ flex: 1 }}
                                onClick={() => setShowEditSessionModal(false)}
                            >
                                CANCEL
                            </IonButton>
                            <IonButton
                                expand="block"
                                color="warning"
                                style={{ flex: 2, fontWeight: 'bold', '--border-radius': '12px' }}
                                onClick={handleUpdateSessionInfo}
                            >
                                SAVE CHANGES
                            </IonButton>
                        </div>
                    </div>
                </div>
            </IonModal>
            {/* USER EDITOR MODAL */}
            <IonModal
                isOpen={showUserModal}
                onDidDismiss={() => setShowUserModal(false)}
                className="chrono-modal"
                style={{
                    '--width': isMobile ? '100%' : '600px',
                    '--height': isMobile ? '100%' : '90%',
                    '--border-radius': isMobile ? '0' : '24px'
                }}
            >
                <div style={{ padding: '30px', background: '#1a1a1a', color: '#fff', height: '100%', overflowY: 'auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(197, 160, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <IonIcon icon={personAdd} style={{ fontSize: '30px', color: '#c5a059' }} />
                        </div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0 }}>{editingUser ? 'Edit User' : 'New System User'}</h2>
                        <p style={{ color: '#aaa' }}>Configure credentials and granular access control.</p>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px' }}>
                                <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold' }}>USER NAME</IonLabel>
                                <IonInput
                                    placeholder="Full Name"
                                    value={userForm.name}
                                    onIonChange={e => setUserForm({ ...userForm, name: e.detail.value })}
                                />
                            </IonItem>
                            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px' }}>
                                <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold' }}>COMPANY</IonLabel>
                                {!isAddingCompany ? (
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <select
                                            value={userForm.company}
                                            onChange={e => {
                                                if (e.target.value === 'NEW') {
                                                    setIsAddingCompany(true);
                                                    setUserForm({ ...userForm, company: '' });
                                                } else {
                                                    setUserForm({ ...userForm, company: e.target.value });
                                                }
                                            }}
                                            style={{ background: 'transparent', color: '#fff', border: 'none', width: '100%', padding: '10px 0', outline: 'none' }}
                                        >
                                            {companies.map(c => <option key={c} value={c} style={{ background: '#222' }}>{c}</option>)}
                                            <option value="NEW" style={{ background: '#222', color: '#c5a059', fontWeight: 'bold' }}>+ New Company...</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <IonInput
                                            placeholder="Enter New Company"
                                            value={userForm.company}
                                            onIonChange={e => setUserForm({ ...userForm, company: e.detail.value })}
                                            style={{ flex: 1 }}
                                        />
                                        {companies.length > 0 && (
                                            <IonButton fill="clear" size="small" onClick={() => setIsAddingCompany(false)}>
                                                Select Existing
                                            </IonButton>
                                        )}
                                    </div>
                                )}
                            </IonItem>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px' }}>
                                <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold' }}>RANK</IonLabel>
                                <select
                                    value={userForm.rank}
                                    onChange={e => setUserForm({ ...userForm, rank: e.target.value })}
                                    style={{ background: 'transparent', color: '#fff', border: 'none', width: '100%', padding: '10px 0', outline: 'none' }}
                                >
                                    <option value="user" style={{ background: '#222' }}>Standard User</option>
                                    <option value="admin" style={{ background: '#222' }}>Administrator</option>
                                </select>
                            </IonItem>
                            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', '--border-radius': '12px' }}>
                                <IonLabel position="stacked" style={{ color: '#c5a059', fontWeight: 'bold' }}>PASSWORD</IonLabel>
                                <IonInput
                                    type="password"
                                    placeholder="••••••••"
                                    value={userForm.password}
                                    onIonChange={e => setUserForm({ ...userForm, password: e.detail.value })}
                                />
                            </IonItem>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#c5a059' }} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Granular Permissions</h3>
                            </div>

                            <IonItem lines="none" style={{ '--background': 'transparent' }}>
                                <IonLabel style={{ color: '#aaa', fontSize: '0.9rem' }}>Access All Tabs</IonLabel>
                                <input
                                    type="checkbox"
                                    checked={userForm.permissions.allTabs}
                                    onChange={e => setUserForm({
                                        ...userForm,
                                        permissions: { ...userForm.permissions, allTabs: e.target.checked, allowedTabs: e.target.checked ? [] : userForm.permissions.allowedTabs }
                                    })}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                            </IonItem>

                            {!userForm.permissions.allTabs && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px' }}>
                                    {ALL_APP_TABS.map(tab => (
                                        <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111', padding: '8px', borderRadius: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={userForm.permissions.allowedTabs.includes(tab.id)}
                                                onChange={e => {
                                                    const newTabs = e.target.checked
                                                        ? [...userForm.permissions.allowedTabs, tab.id]
                                                        : userForm.permissions.allowedTabs.filter(id => id !== tab.id);
                                                    setUserForm({
                                                        ...userForm,
                                                        permissions: { ...userForm.permissions, allowedTabs: newTabs }
                                                    });
                                                }}
                                            />
                                            <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{tab.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ height: '1px', background: '#333', margin: '15px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                {Object.keys(userForm.permissions.actions).map(action => (
                                    <div key={action} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#aaa', textTransform: 'uppercase', marginBottom: '5px' }}>{action}</div>
                                        <IonButton
                                            size="small"
                                            fill={userForm.permissions.actions[action] ? 'solid' : 'outline'}
                                            color={userForm.permissions.actions[action] ? 'success' : 'medium'}
                                            onClick={() => setUserForm({
                                                ...userForm,
                                                permissions: {
                                                    ...userForm.permissions,
                                                    actions: { ...userForm.permissions.actions, [action]: !userForm.permissions.actions[action] }
                                                }
                                            })}
                                            style={{ width: '100%', '--border-radius': '8px' }}
                                        >
                                            {userForm.permissions.actions[action] ? 'YES' : 'NO'}
                                        </IonButton>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <IonButton expand="block" fill="clear" color="medium" style={{ flex: 1 }} onClick={() => setShowUserModal(false)}>CANCEL</IonButton>
                            <IonButton
                                expand="block"
                                color="warning"
                                style={{ flex: 2, fontWeight: 'bold', '--border-radius': '12px' }}
                                onClick={handleSaveUser}
                                disabled={loading}
                            >
                                {loading ? 'SAVING...' : editingUser ? 'UPDATE USER' : 'CREATE USER'}
                            </IonButton>
                        </div>
                    </div>
                </div>
            </IonModal>
            {/* SESSION CHAT OVERLAY (for Owner) */}
            {chatSession && (
                <ChatOverlay
                    currentUserMac="DYR"
                    receiverId={chatSession.mac_address}
                    title={`Chat: ${chatSession.display_name || chatSession.pc_name}`}
                    isOwner={true}
                    forceOpen={true}
                    onClose={() => setChatSession(null)}
                />
            )}
            {/* AUDIT LOGS PDF PREVIEW */}
            <PDFPreviewModal
                isOpen={showPdfPreview}
                onClose={() => { setShowPdfPreview(false); setPdfPreviewDoc(null); }}
                pdfDoc={pdfPreviewDoc}
                filename={pdfPreviewFilename}
            />
        </IonModal>
    );
};

export default AdminSessionsModal;
