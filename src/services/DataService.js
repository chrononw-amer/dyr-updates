import { t } from './i18n';
import { supabase } from './supabase';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
const isNativeMobile = window && window.Capacitor && window.Capacitor.isNativePlatform();
const API_URL = 'http://localhost:3001/api';

// --- Connection Status Event System ---
// Broadcasts connection health so the UI can show retry banners
let _lastConnectionOk = true;
const emitConnectionError = (error, context = '') => {
    _lastConnectionOk = false;
    window.dispatchEvent(new CustomEvent('dyr-connection-error', {
        detail: {
            message: error?.message || String(error),
            context, // e.g. 'fetch:buildings', 'post:contracts'
            timestamp: Date.now()
        }
    }));
};

const emitConnectionOk = () => {
    if (!_lastConnectionOk) {
        _lastConnectionOk = true;
        window.dispatchEvent(new CustomEvent('dyr-connection-ok', {
            detail: { timestamp: Date.now() }
        }));
    }
};

export const getConnectionStatus = () => _lastConnectionOk;

// Get client metadata headers for network requests
const getClientHeaders = () => {
    const headers = { 'X-Client-Name': 'DYR-Client' };
    try {
        const sysInfo = localStorage.getItem('dyr_system_info');
        if (sysInfo) {
            const info = JSON.parse(sysInfo);
            if (info.hostname) headers['X-Client-Name'] = info.hostname;
            if (info.mac) headers['X-Client-Mac'] = info.mac;
            if (info.ip) headers['X-Client-Internal-Ip'] = info.ip;
        }
    } catch (e) {}
    try {
        const userName = localStorage.getItem('trusted_user_name');
        if (userName) headers['X-Client-Username'] = userName;
    } catch (e) {}
    try {
        const branding = localStorage.getItem('company_branding');
        if (branding) {
            const b = JSON.parse(branding);
            if (b.name) headers['X-Client-Company'] = b.name;
        }
    } catch (e) {}
    try {
        const extIp = localStorage.getItem('dyr_external_ip');
        if (extIp) headers['X-Client-External-Ip'] = extIp;
    } catch (e) {}
    return headers;
};

// Cache external IP once per session
const cacheExternalIp = async () => {
    if (localStorage.getItem('dyr_external_ip')) return;
    if (window.electronAPI && window.electronAPI.getExternalIp) {
        try {
            const ip = await window.electronAPI.getExternalIp();
            if (ip && ip !== '0.0.0.0' && ip !== 'Timeout') {
                localStorage.setItem('dyr_external_ip', ip);
            }
        } catch (e) {}
    }
};
// Fire and forget on load
cacheExternalIp();

// --- Configuration Management ---
export const getDatabaseConfig = () => {
    try {
        const config = localStorage.getItem('db_config');
        return config ? JSON.parse(config) : { type: 'local', url: 'http://localhost:3001/api', mobilePath: '' };
    } catch (error) {
        console.error("Error parsing db_config:", error);
        return { type: 'local', url: 'http://localhost:3001/api', mobilePath: '' };
    }
};

const readFromMobileFile = async (entity, path) => {
    try {
        const file = await Filesystem.readFile({
            path: `${path}/${entity}.json`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        return JSON.parse(file.data);
    } catch (e) {
        console.warn(`Mobile file read failed for ${entity}:`, e);
        return null;
    }
};

const writeToMobileFile = async (entity, data, path) => {
    try {
        await Filesystem.writeFile({
            path: `${path}/${entity}.json`,
            data: JSON.stringify(data, null, 2),
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true
        });
        return { success: true };
    } catch (e) {
        console.error(`Mobile file write failed for ${entity}:`, e);
        return { success: false, error: e.message };
    }
};

export const setDatabaseConfig = (config) => {
    localStorage.setItem('db_config', JSON.stringify(config));
};

export const getCompanyBranding = () => {
    try {
        const branding = localStorage.getItem('company_branding');
        const parsed = branding ? JSON.parse(branding) : { name: '', header: null, footer: null, landscapeHeader: null, landscapeFooter: null };
        // Ensure name property exists to avoid undefined access
        if (!parsed) return { name: '', header: null, footer: null, landscapeHeader: null, landscapeFooter: null };
        return parsed;
    } catch (error) {
        console.error("Error parsing company_branding:", error);
        return { name: '', header: null, footer: null, landscapeHeader: null, landscapeFooter: null };
    }
};

export const setCompanyBranding = (branding) => {
    localStorage.setItem('company_branding', JSON.stringify(branding));
};

// --- App State & Passwords ---
// Default credentials are encoded to prevent plain-text extraction from built bundles
const _dc = (s) => atob(s);
const _DP = 'YWRtaW4='; // encoded default
const _OP = 'QUxFWG1vaDEyIUA='; // encoded default

export const getAppSecurity = () => {
    try {
        const security = localStorage.getItem('app_security');
        return security ? JSON.parse(security) : { adminPassword: _dc(_DP), ownerPassword: _dc(_OP) };
    } catch {
        return { adminPassword: _dc(_DP), ownerPassword: _dc(_OP) };
    }
};

export const setAppSecurity = (security) => {
    localStorage.setItem('app_security', JSON.stringify(security));
};

export const getAppState = () => {
    try {
        const state = localStorage.getItem('app_state');
        return state ? JSON.parse(state) : { setupComplete: false };
    } catch {
        return { setupComplete: false };
    }
};

export const setAppState = (state) => {
    localStorage.setItem('app_state', JSON.stringify(state));
};

// --- Currency Management ---
export const getCurrency = () => {
    return localStorage.getItem('app_currency') || 'EGP';
};

export const setCurrency = (currency) => {
    localStorage.setItem('app_currency', currency);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency } }));
};

export const formatCurrency = (amount, compact = false) => {
    const currency = getCurrency();
    const formatter = new Intl.NumberFormat('en-US', {
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short',
        minimumFractionDigits: 0,
        maximumFractionDigits: compact ? 1 : 0
    });

    const formattedAmount = formatter.format(amount || 0);
    const sym = t(`currency.${currency}`);

    // Pre-symbol for certain currencies if using English sym
    if (currency === 'USD' && sym === '$') return `$${formattedAmount}`;
    if (currency === 'EUR' && sym === '€') return `€${formattedAmount}`;

    return `${formattedAmount} ${sym}`;
};

const fetchData = async (entity) => {
    const config = getDatabaseConfig();
    try {
        // 1. HOSTED (Supabase)
        if (config.type === 'hosted' && supabase) {
            let allData = [];
            let from = 0;
            const limit = 1000;
            let more = true;

            while (more) {
                const { data, error } = await supabase
                    .from(entity)
                    .select('*')
                    .range(from, from + limit - 1);

                if (error) {
                    console.warn(`Supabase fetch error for ${entity}:`, error);
                    break;
                }

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    from += limit;
                    if (data.length < limit) more = false; // End of data
                } else {
                    more = false;
                }
            }
            if (allData.length === 0) {
                // Check if we should fallback or just return empty
                // usually we might want to seed from local storage if empty?
                // For now, let's respect the DB as source of truth.
            }
            return allData;
        }

        // 2. LOCAL or EXPRESS HOST (Electron IPC or Mobile File)
        // 'express' host reads/writes locally — the Express server serves read-only to clients
        if (config.type === 'local' || config.type === 'express') {
            if (window.electronAPI) {
                return await window.electronAPI.readDatabase(entity);
            }
            if (isNativeMobile && config.mobilePath) {
                const mobileData = await readFromMobileFile(entity, config.mobilePath);
                if (mobileData) return mobileData;
            }
            // Fall through to throw/localStorage
            throw new Error("Local database requires specialized access.");
        }

        // 3. NETWORK (Express API)
        if (config.type === 'network') {
            let apiUrl = config.url || API_URL;

            // UNC Path detection for Electron
            if (window.electronAPI && (apiUrl.startsWith('//') || apiUrl.startsWith('\\\\'))) {
                return await window.electronAPI.readDatabase(entity);
            }

            if (apiUrl && !apiUrl.startsWith('http')) {
                const clean = apiUrl.replace(/^[\\/]+|[\\/]+$/g, '');
                if (clean.includes('/') || clean.includes('\\')) {
                    apiUrl = `http://${clean.split(/[\\/]/)[0]}:3001/api`;
                } else {
                    apiUrl = clean.includes(':') ? `http://${clean}` : `http://${clean}:3001`;
                }
            }
            if (apiUrl && !apiUrl.endsWith('/api')) apiUrl = `${apiUrl}/api`.replace(/\/\/api/g, '/api');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
                const response = await fetch(`${apiUrl}/${entity}`, {
                    signal: controller.signal,
                    headers: getClientHeaders()
                });
                clearTimeout(timeoutId);
                if (response.status === 403) {
                    const body = await response.json();
                    if (body.clientStatus === 'pending') {
                        throw new Error('PENDING_APPROVAL');
                    }
                    if (body.clientStatus === 'blocked') {
                        throw new Error('ACCESS_DENIED');
                    }
                }
                if (!response.ok) throw new Error('API request failed');
                emitConnectionOk();
                return await response.json();
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                emitConnectionError(fetchErr, `fetch:${entity}`);
                throw new Error(`Network fetch failed for ${entity}: ${fetchErr.message}`);
            }
        }

        // Fallback default if config is somehow messed up but we have Electron
        if (window.electronAPI) return await window.electronAPI.readDatabase(entity);

        // If we reach here, no valid transport was found, so throw to hit catch/localStorage
        throw new Error("No valid transport found for " + entity);
    } catch (error) {
        console.error(`Error fetching ${entity} [${config.type}]:`, error);
        // Emit connection error for hosted/network types
        if (config.type === 'hosted' || config.type === 'network') {
            emitConnectionError(error, `fetch:${entity}`);
        }
        // 4. Ultimate Fallback to localStorage (Offline mode or just cache)
        try {
            const data = localStorage.getItem(entity);
            return data ? JSON.parse(data) : [];
        } catch (localError) {
            console.error(`Error parsing localStorage for ${entity}:`, localError);
            return [];
        }
    }
};

const postData = async (entity, data, dbData = null) => {
    const config = getDatabaseConfig();
    try {
        // 1. HOSTED (Supabase)
        if (config.type === 'hosted' && supabase) {
            const payload = dbData || data;
            const BATCH_SIZE = 500;

            // Chunk the upserts
            for (let i = 0; i < payload.length; i += BATCH_SIZE) {
                const chunk = payload.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from(entity)
                    .upsert(chunk, { onConflict: 'id' });

                if (error) {
                    console.error(`Supabase batch upsert failed for ${entity} (chunk ${i}):`, error);
                    throw error;
                }
            }
            emitConnectionOk();
            return { success: true };
        }

        // 2. LOCAL (Electron IPC or Mobile File)
        if (config.type === 'local') {
            if (window.electronAPI) {
                const result = await window.electronAPI.writeDatabase(entity, data);
                if (result && result.success) return result;
            }
            if (isNativeMobile && config.mobilePath) {
                const result = await writeToMobileFile(entity, data, config.mobilePath);
                if (result.success) return result;
            }
        }

        // EXPRESS HOST = MONITOR MODE (read-only for owner)
        if (config.type === 'express') {
            console.warn(`[Monitor Mode] Write blocked for ${entity} — owner is in monitor-only mode.`);
            return { success: false, monitorMode: true };
        }

        // 3. NETWORK (Express API)
        if (config.type === 'network') {
            let apiUrl = config.url || API_URL;

            // UNC Path detection for Electron
            if (window.electronAPI && (apiUrl.startsWith('//') || apiUrl.startsWith('\\\\'))) {
                return await window.electronAPI.writeDatabase(entity, data);
            }

            if (apiUrl && !apiUrl.startsWith('http')) {
                const clean = apiUrl.replace(/^[\\/]+|[\\/]+$/g, '');
                if (clean.includes('/') || clean.includes('\\')) {
                    apiUrl = `http://${clean.split(/[\\/]/)[0]}:3001/api`;
                } else {
                    apiUrl = clean.includes(':') ? `http://${clean}` : `http://${clean}:3001`;
                }
            }
            if (apiUrl && !apiUrl.endsWith('/api')) apiUrl = `${apiUrl}/api`.replace(/\/\/api/g, '/api');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            try {
                const response = await fetch(`${apiUrl}/${entity}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getClientHeaders()
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.status === 403) {
                    const body = await response.json();
                    if (body.clientStatus === 'pending') throw new Error('PENDING_APPROVAL');
                    if (body.clientStatus === 'blocked') throw new Error('ACCESS_DENIED');
                }
                if (!response.ok) throw new Error(`API request failed with status: ${response.status}`);
                emitConnectionOk();
                return await response.json();
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                emitConnectionError(fetchErr, `post:${entity}`);
                throw new Error(`Network post failed for ${entity}: ${fetchErr.message}`);
            }
        }

        // Fallback default
        if (window.electronAPI) {
            return await window.electronAPI.writeDatabase(entity, data);
        }

        throw new Error("No valid database connection configured.");

    } catch (error) {
        console.error(`Error posting ${entity} [${config.type}], falling back to localStorage:`, error);
        // Emit connection error for hosted/network types
        if (config.type === 'hosted' || config.type === 'network') {
            emitConnectionError(error, `post:${entity}`);
        }
        // 4. Fallback to localStorage
        localStorage.setItem(entity, JSON.stringify(data));
        return { success: true, fallback: true };
    }
};

// --- Activity Logging ---
const PENDING_LOGS_KEY = 'dyr_pending_logs';

const savePendingLog = (log) => {
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
        pending.push(log);
        // Keep last 500 pending logs only
        localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pending.slice(-500)));
    } catch (e) {
        console.error('Error saving pending log:', e);
    }
};

export const syncPendingLogs = async () => {
    if (!supabase) return;
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
        if (pending.length === 0) return;

        const { error } = await supabase.from('app_logs').insert(pending);
        if (!error) {
            localStorage.removeItem(PENDING_LOGS_KEY);
            console.log(`Successfully synced ${pending.length} pending logs to cloud.`);
        }
    } catch (e) {
        console.error('Sync pending logs failed:', e);
    }
};

export const logActivity = async (action, tab, details = '') => {
    try {
        const security = getAppSecurity();
        const userName = localStorage.getItem('trusted_user_name') || 'Unknown';
        const externalIp = window.electronAPI ? await window.electronAPI.getExternalIp() : '0.0.0.0';

        // Get internal/local IP
        let internalIp = '0.0.0.0';
        if (window.electronAPI && window.electronAPI.getSystemInfo) {
            try {
                const sysInfo = await window.electronAPI.getSystemInfo();
                internalIp = sysInfo?.ip || '0.0.0.0';
            } catch (e) { /* ignore */ }
        }

        const logEntry = {
            id: crypto.randomUUID(),
            user_name: userName,
            action: action, // ADD, EDIT, DELETE, CONVERT, CANCEL, PAYMENT, etc.
            tab_name: tab,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            ip_address: externalIp,
            internal_ip: internalIp,
            created_at: new Date().toISOString()
        };

        // 1. Always save locally first (Cap at 2000 for local file)
        if (window.electronAPI) {
            try {
                const currentLogs = await window.electronAPI.readDatabase('app_logs') || [];
                currentLogs.unshift(logEntry);
                if (currentLogs.length > 2000) currentLogs.pop();
                await window.electronAPI.writeDatabase('app_logs', currentLogs);
            } catch (le) { console.error('Local log write failed', le); }
        }

        // 2. Try Hosted (Supabase)
        if (supabase) {
            const { error } = await supabase.from('app_logs').insert(logEntry);
            if (error) {
                // If network error/failed, store as pending
                savePendingLog(logEntry);
            }
        } else {
            savePendingLog(logEntry);
        }
    } catch (e) {
        console.error('Logging failed:', e);
        // Ultimate fallback
        try {
            const logEntry = {
                id: crypto.randomUUID(),
                action, tab,
                details: String(details),
                created_at: new Date().toISOString()
            };
            savePendingLog(logEntry);
        } catch (inner) { }
    }
};

// --- MAPPERS (CamelCase <-> Snake_case) ---

const mapCustomerToDB = (c) => ({
    id: String(c.id),
    name: c.name,
    phone: c.phone,
    phone2: c.phone2,
    email: c.email,
    id_number: c.idNumber,
    id_type: c.idType,
    blood_type: c.bloodType,
    direct_indirect: c.directIndirect,
    id_card_path: c.idCardPath,
    created_at: c.createdAt
});

const mapCustomerFromDB = (c) => ({
    id: String(c.id),
    name: c.name,
    phone: c.phone,
    phone2: c.phone2 || c.phone_2 || '',
    email: c.email || '',
    idNumber: c.id_number || c.idNumber || '',
    idType: c.id_type || c.idType || '',
    bloodType: c.blood_type || c.bloodType || '',
    directIndirect: c.direct_indirect || c.directIndirect || '',
    idCardPath: c.id_card_path || c.idCardPath || '',
    createdAt: c.created_at || c.createdAt
});

const mapSalesToDB = (s) => ({
    id: String(s.id),
    name: s.name,
    phone: s.phone,
    email: s.email,
    id_card_path: s.idCardPath,
    broker_id: s.brokerId,
    commission_rate: s.commissionRate,
    created_at: s.createdAt
});

const mapSalesFromDB = (s) => ({
    id: String(s.id),
    name: s.name,
    phone: s.phone,
    email: s.email || '',
    idCardPath: s.id_card_path || s.idCardPath || '',
    brokerId: s.broker_id || s.brokerId || '',
    commissionRate: s.commission_rate !== undefined ? s.commission_rate : (s.commissionRate !== undefined ? s.commissionRate : null),
    createdAt: s.created_at || s.createdAt
});

// --- BROKER COMPANY MAPPERS ---
const mapBrokerToDB = (b) => ({
    id: String(b.id),
    name: b.name,
    phone: b.phone,
    email: b.email,
    address: b.address,
    commission_rate: b.commissionRate,
    type: 'broker',
    created_at: b.createdAt
});

const mapBrokerFromDB = (b) => ({
    id: String(b.id),
    name: b.name,
    phone: b.phone || '',
    email: b.email || '',
    address: b.address || '',
    commissionRate: b.commission_rate !== undefined ? b.commission_rate : (b.commissionRate !== undefined ? b.commissionRate : 3),
    type: 'broker',
    createdAt: b.created_at || b.createdAt
});

// --- COMMISSION MAPPERS ---
const mapCommissionToDB = (c) => ({
    id: c.id,
    contract_id: c.contractId,
    unit_id: c.unitId,
    building_id: c.buildingId,
    customer_name: c.customerName,
    sales_id: c.salesId,
    sales_name: c.salesName,
    broker_id: c.brokerId,
    total_contract_price: c.totalContractPrice,
    commission_rate: c.commissionRate,
    commission_amount: c.commissionAmount,
    activated_at: c.activatedAt,
    payments: c.payments,
    total_paid: c.totalPaid,
    status: c.status
});

const mapCommissionFromDB = (c) => ({
    id: c.id,
    contractId: c.contract_id || c.contractId,
    unitId: c.unit_id || c.unitId,
    buildingId: c.building_id || c.buildingId || '',
    customerName: c.customer_name || c.customerName || '',
    salesId: c.sales_id || c.salesId,
    salesName: c.sales_name || c.salesName || '',
    brokerId: c.broker_id || c.brokerId || '',
    totalContractPrice: Number(c.total_contract_price || c.totalContractPrice || 0),
    commissionRate: Number(c.commission_rate || c.commissionRate || 3),
    commissionAmount: Number(c.commission_amount || c.commissionAmount || 0),
    activatedAt: c.activated_at || c.activatedAt || '',
    payments: c.payments || [],
    totalPaid: Number(c.total_paid || c.totalPaid || 0),
    status: c.status || 'pending'
});

const mapContractToDB = (c) => ({
    id: c.id,
    customer_id: c.customerId,
    customer_name: c.customerName,
    unit_id: c.unitId,
    building_id: c.buildingId,
    contract_id: c.contractId,
    date: c.date,
    total_price: c.totalPrice,
    down_payment: c.downPayment,
    years: c.years,
    frequency: c.frequency,
    notes: c.notes,
    joint_purchasers: c.jointPurchasers,
    guarantor: c.guarantor,
    sales_id: c.salesId,
    offer_id: c.offerId,
    created_at: c.createdAt,
    status: c.status,
    termination_date: c.terminationDate,
    termination_reason: c.terminationReason,
    pre_term_base_price: c.preTermBasePrice,
    pre_term_finished_price: c.preTermFinishedPrice,
    pre_term_payment_plan: c.preTermPaymentPlan,
    resale_date: c.resaleDate,
    resold_to: c.resoldTo
});

const mapContractFromDB = (c) => ({
    id: c.id,
    customerId: c.customer_id || c.customerId,
    customerName: c.customer_name || c.customerName,
    unitId: c.unit_id || c.unitId,
    buildingId: c.building_id || c.buildingId,
    contractId: c.contract_id || c.contractId || c.id,
    date: c.date,
    totalPrice: c.total_price || c.totalPrice,
    downPayment: c.down_payment || c.downPayment,
    years: c.years,
    frequency: c.frequency,
    notes: c.notes,
    jointPurchasers: c.joint_purchasers || c.jointPurchasers || [],
    guarantor: c.guarantor,
    salesId: c.sales_id || c.salesId,
    offerId: c.offer_id || c.offerId || '',
    createdAt: c.created_at || c.createdAt,
    status: c.status,
    terminationDate: c.termination_date || c.terminationDate,
    terminationReason: c.termination_reason || c.terminationReason,
    preTermBasePrice: c.pre_term_base_price || c.preTermBasePrice,
    preTermFinishedPrice: c.pre_term_finished_price || c.preTermFinishedPrice,
    preTermPaymentPlan: c.pre_term_payment_plan || c.preTermPaymentPlan,
    resaleDate: c.resale_date || c.resaleDate,
    resoldTo: c.resold_to || c.resoldTo
});

const mapInstallmentToDB = (i) => ({
    id: i.id,
    contract_id: i.contractId,
    unit_id: i.unitId,
    customer_name: i.customerName,
    type: i.type,
    due_date: i.dueDate,
    amount: i.amount,
    paid_amount: i.paidAmount,
    status: i.status,
    payment_method: i.paymentMethod,
    cheque_number: i.chequeNumber,
    bank: i.bank,
    payments: i.payments,
    feedbacks: i.feedbacks,
    cheque_status: i.chequeStatus,
    deposited_bank: i.depositedBank,
    sales_id: i.salesId,
    last_reminder_sent: i.lastReminderSent,
    pre_term_status: i.preTermStatus
});

const mapInstallmentFromDB = (i) => {
    let pMethod = i.payment_method || i.paymentMethod;
    const chqNo = i.cheque_number || i.chequeNumber;

    // Auto-fix inconsistent data: If it has a valid cheque number but is marked as CASH/TRANSFER, treat it as Cheque
    const invalidChq = ['', '-', 'N/A', 'Offer Credits', 'N / A', 'n/a', 'none', 'NA'];
    const pMethodUpper = String(pMethod || '').toUpperCase().trim();
    if (chqNo && !invalidChq.includes(String(chqNo).trim())) {
        if (pMethodUpper === 'CASH' || pMethodUpper === 'TRANSFER' || !pMethodUpper) {
            pMethod = 'Cheque';
        }
    }

    return {
        id: i.id,
        contractId: i.contract_id || i.contractId,
        unitId: i.unit_id || i.unitId,
        customerName: i.customer_name || i.customerName,
        type: i.type,
        dueDate: i.due_date || i.dueDate,
        amount: i.amount,
        paidAmount: i.paid_amount || i.paidAmount,
        status: i.status,
        paymentMethod: pMethod,
        chequeNumber: chqNo,
        bank: i.bank,
        payments: i.payments || [],
        feedbacks: i.feedbacks || [],
        chequeStatus: i.cheque_status || i.chequeStatus || 'Not Received',
        depositedBank: i.deposited_bank || i.depositedBank || '',
        salesId: i.sales_id || i.salesId || '',
        lastReminderSent: i.last_reminder_sent || i.lastReminderSent || '',
        preTermStatus: i.pre_term_status || i.preTermStatus
    };
};

// --- TERMINATED MAPPERS ---

const mapTerminatedContractToDB = (c) => ({
    ...mapContractToDB(c),
    termination_date: c.terminationDate,
    termination_reason: c.terminationReason
});

const mapTerminatedContractFromDB = (c) => ({
    ...mapContractFromDB(c),
    terminationDate: c.termination_date || c.terminationDate,
    terminationReason: c.termination_reason || c.terminationReason
});

const deleteSupabaseRow = async (entity, id) => {
    if (supabase) {
        try {
            const { error } = await supabase.from(entity).delete().eq('id', id);
            if (error) console.warn(`Supabase delete ${entity} ${id} failed:`, error);
        } catch (e) {
            console.error('Supabase delete exception:', e);
        }
    }
};

const deleteAllSupabaseRows = async (entity) => {
    if (supabase) {
        try {
            // Delete all rows where id is not "0" (all rows)
            const { error } = await supabase.from(entity).delete().neq('id', '0');
            if (error) console.warn(`Supabase delete all ${entity} failed:`, error);
        } catch (e) {
            console.error('Supabase delete all exception:', e);
        }
    }
};

export const getBuildings = () => fetchData('buildings');
export const saveBuildings = (buildings) => postData('buildings', buildings);

export const addBuilding = async (name) => {
    const buildings = await getBuildings();
    const newBuilding = {
        id: Date.now().toString(),
        name,
        units: []
    };
    buildings.push(newBuilding);
    await saveBuildings(buildings);
    await logActivity('ADD', 'BUILDINGS', `Added building: ${name}`);
    return newBuilding;
};

export const removeBuilding = async (id) => {
    const buildings = await getBuildings();
    const b = buildings.find(b => b.id === id);
    const filtered = buildings.filter(b => b.id !== id);
    await saveBuildings(filtered);
    await deleteSupabaseRow('buildings', id);
    await logActivity('DELETE', 'BUILDINGS', `Deleted building: ${b?.name || id}`);
};

export const addUnitToBuilding = async (buildingId, unit) => {
    const buildings = await getBuildings();
    const index = buildings.findIndex(b => b.id === buildingId);
    if (index !== -1) {
        if (!buildings[index].units) buildings[index].units = [];
        buildings[index].units.push({
            ...unit,
            id: Date.now().toString()
        });
        await saveBuildings(buildings);
        await logActivity('ADD', 'BUILDINGS', `Added unit ${unit.unitId || 'N/A'} to ${buildings[index].name}`);
    }
};

export const removeUnitFromBuilding = async (buildingId, unitId) => {
    const buildings = await getBuildings();
    const index = buildings.findIndex(b => b.id === buildingId);
    if (index !== -1) {
        const unit = buildings[index].units.find(u => u.id === unitId);
        buildings[index].units = buildings[index].units.filter(u => u.id !== unitId);
        await saveBuildings(buildings);
        await logActivity('DELETE', 'BUILDINGS', `Removed unit ${unit?.unitId || unitId} from ${buildings[index].name}`);
    }
};


export const bulkUpdateUnitPrices = async (buildingId, percentage) => {
    const buildings = await getBuildings();
    const index = buildings.findIndex(b => b.id === buildingId);
    if (index === -1) return null;

    const building = buildings[index];
    if (!building.units) return null;

    // Create a backup of current prices for undo
    // We store the backup in the building object itself
    const backup = building.units.map(u => ({ id: u.id, price: u.price, finishedPrice: u.finishedPrice, status: u.status }));
    building.priceBackup = backup;

    // Apply percentage change to available and locked units
    const factor = 1 + (Number(percentage) / 100);
    building.units = building.units.map(u => {
        const status = (u.status || '').toLowerCase();
        if (status === 'available' || status === 'locked') {
            const oldPrice = Number(u.price) || 0;
            const oldFinishedPrice = Number(u.finishedPrice) || 0;
            return {
                ...u,
                price: Math.round(oldPrice * factor),
                finishedPrice: oldFinishedPrice ? Math.round(oldFinishedPrice * factor) : u.finishedPrice
            };
        }
        return u;
    });

    await saveBuildings(buildings);
    await logActivity('EDIT', 'BUILDINGS', `Bulk price update for ${building.name}: ${percentage}% change.`);
    return buildings[index];
};

export const undoBulkUpdatePrices = async (buildingId) => {
    const buildings = await getBuildings();
    const index = buildings.findIndex(b => b.id === buildingId);
    if (index === -1) return null;

    const building = buildings[index];
    if (!building.priceBackup) {
        throw new Error("No undo data available for this building.");
    }

    // Restore prices from backup
    building.units = building.units.map(u => {
        const backupEntry = building.priceBackup.find(b => b.id === u.id);
        if (backupEntry) {
            return {
                ...u,
                price: backupEntry.price,
                finishedPrice: backupEntry.finishedPrice
            };
        }
        return u;
    });

    // Clear backup after undo
    delete building.priceBackup;

    await saveBuildings(buildings);
    await logActivity('EDIT', 'BUILDINGS', `Undo bulk price update for ${building.name}.`);
    return buildings[index];
};

// One-time fix: REVERSE the mistaken 2% increase to finishedPrice on "Curve - 141"
export const fixCuve141FinishedPrices = async () => {
    const MIGRATION_KEY = 'chrono_revert_curve141_finished_v5';
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const buildings = await getBuildings();
    const building = buildings.find(b => b.name && b.name.toLowerCase().includes('141'));
    if (!building || !building.units) {
        localStorage.setItem(MIGRATION_KEY, 'no_match');
        return;
    }

    const factor = 1.02; // divide by this to reverse the 2% increase
    let changed = 0;
    building.units = building.units.map(u => {
        const status = (u.status || '').toLowerCase();
        if (status === 'available' || status === 'locked') {
            const fin = Number(u.finishedPrice) || 0;
            if (fin > 0) {
                changed++;
                return { ...u, finishedPrice: Math.round(fin / factor) };
            }
        }
        return u;
    });

    if (changed > 0) {
        await saveBuildings(buildings);
        await logActivity('EDIT', 'BUILDINGS', `Reverted 2% increase on finished prices for ${building.name}. ${changed} units restored.`);
    }
    localStorage.setItem(MIGRATION_KEY, `done_${changed}`);
    console.log(`[Migration v5] Curve-141 finished price -2% revert: ${changed} units restored.`);
};

// One-time fix: Set exact finished prices on "Cruise - 140" units
export const fixCruise140FinishedPrices = async () => {
    const MIGRATION_KEY = 'chrono_fix_cruise140_finished_v1';
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const PRICE_MAP = {
        'CE206': 3822257, 'CE209': 3822257, 'CE210': 3822257, 'CE214': 3822257,
        'CE404': 3897962, 'CE407': 3897962, 'CE410': 3897962, 'CE411': 3897962, 'CE416': 3897962,
        'CE604': 3935814, 'CE607': 3935814, 'CE610': 3935814, 'CE611': 3935814,
        'CE805': 3973667, 'CE806': 3973667, 'CE809': 3973667, 'CE812': 3973667,
        'CE223': 3558526, 'CE525': 3617196, 'CE625': 3636752, 'CE725': 3656310, 'CE823': 3675866,
        'CE425': 3713692, 'CE119': 3767289, 'CE220': 3788107, 'CE521': 3850564,
        'CE721': 3892201, 'CE804': 3913020, 'CE421': 3945798, 'CE621': 3988697,
        'CE201': 4530713, 'CE401': 4768151, 'CE601': 4824929, 'CE801': 4881708,
        'CE002': 5315637, 'CE001': 5424120, 'CE004': 5424120, 'CE005': 5424120, 'CE007': 5424120,
        'CE116': 5804659, 'CE108': 6039078, 'CE205': 6075209, 'CE208': 6075209,
        'CE217': 5713891, 'CE308': 6371146, 'CE405': 6484702, 'CE409': 6484702,
        'CE606': 6560407, 'CE612': 6560407, 'CE613': 6560407, 'CE614': 6560407, 'CE617': 6560407,
        'CE807': 6636112, 'CE808': 6636112, 'CE814': 6636112,
        'CE211': 6176463, 'CE311': 6477332, 'CE317': 6092500,
        'CE406': 6592781, 'CE412': 6592781, 'CE414': 6592781,
        'CE605': 6669747, 'CE813': 6746714, 'CE815': 6746714,
        'CE420': 6331998, 'CE620': 6411488, 'CE118': 6056276, 'CE720': 6553633,
        'CE219': 6190049, 'CE424': 6533014, 'CE723': 6656035, 'CE724': 6656035, 'CE822': 6697041,
        'CE202': 6285281, 'CE222': 6285281, 'CE302': 6591885,
        'CE402': 6633522, 'CE422': 6633522, 'CE423': 6633522,
        'CE522': 6675159, 'CE523': 6675159, 'CE524': 6675159,
        'CE602': 6716797, 'CE622': 6716797, 'CE623': 6716797, 'CE624': 6716797,
        'CE722': 6758434, 'CE802': 6800073, 'CE619': 6818566, 'CE820': 6903103,
        'CE102': 6434794,
        'CC503': 7289816, 'CC602': 7335523, 'CE115': 6944938,
        'CC103': 6917021, 'CC202': 6961283, 'CC303': 7302727, 'CE821': 7212198,
        'CC506': 8406290, 'CC611': 8455309, 'CE006': 7933417, 'CE216': 7999026, 'CE316': 8601046,
        'CC402': 8818916, 'CC505': 9883070, 'CC612': 9940701,
        'CE107': 8957964, 'CE112': 8957964, 'CE608': 9731271, 'CE615': 9731271,
        'CE204': 9112813, 'CE207': 9112813, 'CE213': 9112813,
        'CE307': 9556718, 'CE313': 9556718, 'CE408': 9727054, 'CE415': 9727054,
        'CE810': 9954168, 'CE811': 9954168,
        'CE203': 9237457, 'CE303': 9688072, 'CE403': 9749266, 'CE603': 9871656, 'CE803': 9994046,
        'CE626': 10075195, 'CE123': 9462932, 'CE224': 9523152, 'CE324': 9987704,
        'CE426': 10050791, 'CE526': 10113878, 'CE726': 10240053, 'CE824': 10303140,
        'CC104': 11363678, 'CC507': 13063828, 'CC508': 13063828,
        'CC609': 13140007, 'CC610': 13140007, 'CC201': 11535839, 'CC304': 12101664,
        'CE111': 12178804, 'CE212': 12251671, 'CE312': 12848477, 'CE418': 13185562,
        'CC706': 14135571, 'CE120': 12396441, 'CE321': 13083891, 'CE221': 12570560,
        'CC601': 14139487, 'CC401': 15328117, 'CC707': 16778808, 'CC708': 19422044
    };

    const buildings = await getBuildings();
    const building = buildings.find(b => b.name && b.name.toLowerCase().includes('140'));
    if (!building || !building.units) {
        localStorage.setItem(MIGRATION_KEY, 'no_match');
        return;
    }

    let changed = 0;
    building.units = building.units.map(u => {
        const uid = (u.unitId || '').trim().toUpperCase();
        if (PRICE_MAP[uid] !== undefined) {
            changed++;
            return { ...u, finishedPrice: PRICE_MAP[uid] };
        }
        return u;
    });

    if (changed > 0) {
        await saveBuildings(buildings);
        await logActivity('EDIT', 'BUILDINGS', `Set exact finished prices on ${building.name}. ${changed} units updated.`);
    }
    localStorage.setItem(MIGRATION_KEY, `done_${changed}`);
    console.log(`[Migration] Cruise-140 finished prices set: ${changed} units updated.`);
};

// One-time fix: Set exact BASE prices on "Cruise - 140" units
export const fixCruise140BasePrices = async () => {
    const MIGRATION_KEY = 'chrono_fix_cruise140_base_v1';
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const PRICE_MAP = {
        'CA103': 3866000, 'CA106': 7987000, 'CA111': 10858000, 'CA112': 7987000,
        'CA115': 6103000, 'CA120': 11051000, 'CA123': 8372000, 'CA203': 8180000,
        'CA212': 10932000, 'CA224': 8348000, 'CA303': 8630000, 'CA304': 5717000,
        'CA306': 3240000, 'CA309': 3351000, 'CA317': 7718000, 'CA324': 3073000,
        'CA325': 8896000, 'CA418': 11854000, 'CA426': 8960000, 'CA503': 8753000,
        'CA506': 5966000, 'CA507': 3427000, 'CA526': 9023000, 'CA703': 8874000,
        'CA710': 5945000, 'CA726': 9149000, 'CA802': 6081000, 'CA803': 8936000,
        'CA824': 9213000
    };

    const buildings = await getBuildings();
    const building = buildings.find(b => b.name && b.name.toLowerCase().includes('140'));
    if (!building || !building.units) {
        localStorage.setItem(MIGRATION_KEY, 'no_match');
        return;
    }

    let changed = 0;
    building.units = building.units.map(u => {
        const uid = (u.unitId || '').trim().toUpperCase();
        if (PRICE_MAP[uid] !== undefined) {
            changed++;
            return { ...u, price: PRICE_MAP[uid] };
        }
        return u;
    });

    if (changed > 0) {
        await saveBuildings(buildings);
        await logActivity('EDIT', 'BUILDINGS', `Set exact base prices on ${building.name}. ${changed} units updated.`);
    }
    localStorage.setItem(MIGRATION_KEY, `done_${changed}`);
    console.log(`[Migration] Cruise-140 base prices set: ${changed} units updated.`);
};

// One-time fix: Set exact finished prices (batch 2) on "Cruise - 140" units
export const fixCruise140FinishedPricesV2 = async () => {
    const MIGRATION_KEY = 'chrono_fix_cruise140_finished_v2';
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const PRICE_MAP = {
        'CA824': 10773600, 'CE524': 6984171, 'CE224': 9991352, 'CB101': 6554520,
        'CE004': 5385670, 'CE220': 3762730, 'CA309': 3819180, 'CA112': 9375934,
        'CA703': 10387782, 'CB302': 3783935, 'CE006': 8293931, 'CA803': 10449782,
        'CE212': 12818193, 'CB112': 6320430, 'CA203': 9693782, 'CA325': 10456600,
        'CA526': 10583600, 'CE102': 6753170, 'CE401': 4733546, 'CE523': 6984171,
        'CE815': 7032316, 'CE810': 10375548, 'CA507': 3895180, 'CE722': 7067446,
        'CE821': 7539938, 'CE203': 9691611, 'CB120': 4270842, 'CB714': 10204243,
        'CD002': 5386151, 'CE120': 13009783, 'CE211': 6462065, 'CE214': 3799187,
        'CE403': 10203420, 'CE526': 10582078, 'CE604': 3912744, 'CE822': 7001371,
        'CS802': 6893690, 'CA115': 7164208, 'CE119': 3741912, 'CC602': 7658581,
        'CE213': 9534193, 'CE623': 7025809
    };

    const buildings = await getBuildings();
    const building = buildings.find(b => b.name && b.name.toLowerCase().includes('140'));
    if (!building || !building.units) {
        localStorage.setItem(MIGRATION_KEY, 'no_match');
        return;
    }

    let changed = 0;
    building.units = building.units.map(u => {
        const uid = (u.unitId || '').trim().toUpperCase();
        if (PRICE_MAP[uid] !== undefined) {
            changed++;
            return { ...u, finishedPrice: PRICE_MAP[uid] };
        }
        return u;
    });

    if (changed > 0) {
        await saveBuildings(buildings);
        await logActivity('EDIT', 'BUILDINGS', `Set finished prices (batch 2) on ${building.name}. ${changed} units updated.`);
    }
    localStorage.setItem(MIGRATION_KEY, `done_${changed}`);
    console.log(`[Migration] Cruise-140 finished prices v2: ${changed} units updated.`);
};

// --- Customers ---
export const getCustomers = async () => {
    const raw = await fetchData('customers');
    return raw.map(mapCustomerFromDB);
};
export const saveCustomers = (data) => {
    const dbData = data.map(mapCustomerToDB);
    return postData('customers', data, dbData);
};

export const deleteAllCustomers = async () => {
    await saveCustomers([]);
    await deleteAllSupabaseRows('customers');
    await logActivity('DELETE_ALL', 'CUSTOMERS', 'Deleted all customers');
};

export const addCustomer = async (customer) => {
    const customers = await getCustomers();
    // Prioritize provided ID (e.g. from Excel or manual entry system number)
    const newCustomer = {
        ...customer,
        id: customer.id ? String(customer.id) : Date.now().toString()
    };
    customers.push(newCustomer);
    await saveCustomers(customers);
    await logActivity('ADD', 'CUSTOMERS', `Added customer: ${newCustomer.name} (ID: ${newCustomer.id})`);
    return newCustomer;
};

export const deleteCustomer = async (id) => {
    const customers = await getCustomers();
    const c = customers.find(item => String(item.id) === String(id));
    const filtered = customers.filter(c => c.id !== id);
    await saveCustomers(filtered);
    await deleteSupabaseRow('customers', id);
    await logActivity('DELETE', 'CUSTOMERS', `Deleted customer: ${c?.name || id}`);
};

export const updateCustomer = async (id, updates) => {
    const customers = await getCustomers();
    const index = customers.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
        customers[index] = { ...customers[index], ...updates };
        await saveCustomers(customers);
        await logActivity('EDIT', 'CUSTOMERS', `Updated customer: ${customers[index].name}. ID Card: ${updates.idCardPath ? 'Linked' : 'No change'}`);
        return customers[index];
    }
    return null;
};

// --- Offers ---
const mapOfferToDB = (o) => ({
    id: o.id,
    customer_id: o.customerId,
    customer_name: o.customerName,
    unit_id: o.unitId,
    building_id: o.buildingId,
    date: o.date,
    start_date: o.startDate,
    valid_until: o.validUntil,
    years: o.years,
    frequency: o.frequency,
    down_payment: o.downPayment,
    down_payment_amount: o.downPaymentAmount,
    final_price: o.finalPrice,
    total_price: o.totalPrice,
    discount_percent: o.discountPercent,
    price_type: o.priceType,
    installment_amount: o.installmentAmount,
    num_installments: o.numInstallments,
    status: o.status,
    notes: o.notes,
    payments: o.payments,
    installments: o.installments,
    contract_id: o.contractId,
    sales_id: o.salesId,
    joint_purchasers: o.jointPurchasers,
    guarantor: o.guarantor,
    pre_cancel_base_price: o.preCancelBasePrice,
    pre_cancel_finished_price: o.preCancelFinishedPrice,
    pre_cancel_payment_plan: o.preCancelPaymentPlan,
    cancel_date: o.cancelDate
});

const mapOfferFromDB = (o) => ({
    id: o.id,
    customerId: o.customer_id || o.customerId,
    customerName: o.customer_name || o.customerName,
    unitId: o.unit_id || o.unitId,
    buildingId: o.building_id || o.buildingId,
    date: o.date,
    startDate: o.start_date || o.startDate,
    validUntil: o.valid_until || o.validUntil,
    years: o.years,
    frequency: o.frequency,
    downPayment: o.down_payment || o.downPayment,
    downPaymentAmount: o.down_payment_amount || o.downPaymentAmount,
    finalPrice: o.final_price || o.finalPrice,
    totalPrice: o.total_price || o.totalPrice,
    discountPercent: o.discount_percent || o.discountPercent || 0,
    priceType: o.price_type || o.priceType || 'base',
    installmentAmount: o.installment_amount || o.installmentAmount || 0,
    numInstallments: o.num_installments || o.numInstallments || 0,
    status: o.status,
    notes: o.notes,
    payments: o.payments || [],
    installments: o.installments || [],
    contractId: o.contract_id || o.contractId,
    salesId: o.sales_id || o.salesId,
    jointPurchasers: o.joint_purchasers || o.jointPurchasers || [],
    guarantor: o.guarantor || null,
    preCancelBasePrice: o.pre_cancel_base_price || o.preCancelBasePrice,
    preCancelFinishedPrice: o.pre_cancel_finished_price || o.preCancelFinishedPrice,
    preCancelPaymentPlan: o.pre_cancel_payment_plan || o.preCancelPaymentPlan,
    cancelDate: o.cancel_date || o.cancelDate
});

// Generate installments for an offer (pre-calculate all dates and amounts)
// Generate installments for an offer or contract (pre-calculate all dates and amounts)
export const generateInstallmentPlan = (data) => {
    const installments = [];
    const total = Number(data.finalPrice || data.totalPrice || 0);
    const downPaymentPercent = Number(data.downPayment || 0);
    const years = Number(data.years || 0);
    const freqStr = data.frequency || 'quarterly';
    const freq = freqStr === 'monthly' ? 12 : freqStr === 'quarterly' ? 4 : freqStr === 'biannual' ? 2 : 1;

    // Use date (offer/contract date) as DP due date; startDate kept for backward compat
    const startDateStr = data.startDate || data.date || new Date().toISOString().split('T')[0];

    // Use data ID for unique installment IDs
    const baseId = data.id || Date.now();

    // Flash fill details
    const startingCheque = data.startingChequeNumber || '';
    const bank = data.bank || '';
    const paymentMethod = data.paymentMethod || 'Cheque';
    let chequeCounter = startingCheque ? parseInt(startingCheque, 10) : 0;
    const hasChequeStart = startingCheque && !isNaN(chequeCounter);

    // Calculate Down Payment
    const downAmount = Math.round(total * (downPaymentPercent / 100));
    if (downAmount > 0 && !data.skipDownPayment) {
        installments.push({
            id: `${baseId}-INS-DP`,
            contractId: data.id?.startsWith('CON-') ? data.id : undefined,
            offerId: data.id?.startsWith('OFF-') ? data.id : undefined,
            type: 'Down Payment',
            dueDate: startDateStr,
            amount: downAmount,
            status: 'Planned',
            paymentMethod: paymentMethod,
            chequeNumber: '',
            bank: bank,
            paidAmount: 0,
            payments: [],
            feedbacks: []
        });
    }

    // Calculate recurring installments
    const remaining = total - (data.skipDownPayment ? 0 : downAmount);
    const numInstallments = years * freq;
    if (numInstallments > 0 && remaining > 0) {
        const insAmount = Math.round(remaining / numInstallments);

        // Use firstInstallmentDate if provided, otherwise calculate from startDate
        const firstInsDateStr = data.firstInstallmentDate || '';

        // Parse date parts to avoid timezone issues
        const parseDateParts = (dateStr) => {
            if (!dateStr) return { year: 0, month: 0, day: 0 };
            const parts = dateStr.split('-');
            if (parts[0].length === 4) {
                return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) };
            }
            return { day: parseInt(parts[0]), month: parseInt(parts[1]), year: parseInt(parts[2]) };
        };

        const buildDateStr = (year, month, day) => {
            while (month > 12) { month -= 12; year++; }
            while (month < 1) { month += 12; year--; }
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        };

        for (let i = 1; i <= numInstallments; i++) {
            let dueDateStr;
            if (firstInsDateStr) {
                const { year, month, day } = parseDateParts(firstInsDateStr);
                const offset = i - 1;
                if (freqStr === 'monthly') dueDateStr = buildDateStr(year, month + offset, day);
                else if (freqStr === 'quarterly') dueDateStr = buildDateStr(year, month + (offset * 3), day);
                else if (freqStr === 'biannual') dueDateStr = buildDateStr(year, month + (offset * 6), day);
                else dueDateStr = buildDateStr(year + offset, month, day);
            } else {
                const { year, month, day } = parseDateParts(startDateStr);
                if (freqStr === 'monthly') dueDateStr = buildDateStr(year, month + i, day);
                else if (freqStr === 'quarterly') dueDateStr = buildDateStr(year, month + (i * 3), day);
                else if (freqStr === 'biannual') dueDateStr = buildDateStr(year, month + (i * 6), day);
                else dueDateStr = buildDateStr(year + i, month, day);
            }

            installments.push({
                id: `${baseId}-INS-${i}-${Date.now()}`,
                contractId: data.id?.startsWith('CON-') ? data.id : undefined,
                offerId: data.id?.startsWith('OFF-') ? data.id : undefined,
                type: `Installment ${i}/${numInstallments}`,
                dueDate: dueDateStr,
                amount: insAmount,
                status: 'Planned',
                paymentMethod: paymentMethod,
                chequeNumber: hasChequeStart ? String(chequeCounter++) : '',
                bank: bank,
                paidAmount: 0,
                payments: [],
                feedbacks: []
            });
        }
    }

    return installments;
};

export const generateOfferInstallments = (offer) => generateInstallmentPlan(offer);

export const flashFillContractInstallments = async (contractId, options) => {
    const contracts = await getContracts();
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) throw new Error("Contract not found");

    const allInstallments = await getInstallments();
    const contractInstallments = allInstallments.filter(ins => ins.contractId === contractId);

    let finalInstallments = [];
    let displayCustName = contract.customerName;

    if (options.includePaid) {
        // WIPE EVERYTHING and start fresh
        finalInstallments = generateInstallmentPlan({
            ...contract,
            ...options,
            id: contractId
        }).map(ins => ({ ...ins, customerName: displayCustName, unitId: contract.unitId }));
    } else {
        // KEEP PAID ONES
        const paidInstallments = contractInstallments.filter(ins => (ins.paidAmount || 0) > 0 || ins.status === 'Paid' || ins.status === 'Partially Paid');
        const paidTotal = paidInstallments.reduce((sum, ins) => sum + (ins.amount || 0), 0);

        // Calculate remaining to be planned
        const remainingToPlan = Math.max(0, Number(options.totalPrice || contract.totalPrice) - paidTotal);

        if (remainingToPlan > 0) {
            const newPlan = generateInstallmentPlan({
                ...contract,
                ...options,
                totalPrice: remainingToPlan,
                downPayment: 0, // No down payment for remaining part
                skipDownPayment: true,
                id: contractId + '-FILL'
            }).map(ins => ({ ...ins, contractId: contractId, customerName: displayCustName, unitId: contract.unitId }));

            finalInstallments = [...paidInstallments, ...newPlan];
        } else {
            finalInstallments = paidInstallments;
        }
    }

    // Replace installments for this contract
    const otherInstallments = allInstallments.filter(ins => ins.contractId !== contractId);
    await saveInstallments([...otherInstallments, ...finalInstallments]);

    await logActivity('EDIT', 'CONTRACTS', `Flash Fill performed for contract ${contractId}. Include Paid: ${options.includePaid}`);
    return finalInstallments;
};


export const getOffers = async () => {
    const raw = await fetchData('offers');
    const offers = raw.map(mapOfferFromDB);

    // Auto-generate installments for legacy offers that don't have them
    let needsSave = false;
    offers.forEach(offer => {
        if (offer.status === 'active' && (!offer.installments || offer.installments.length === 0)) {
            offer.installments = generateOfferInstallments(offer);
            needsSave = true;
        }
    });

    // Save updated offers if we generated any missing installments
    if (needsSave) {
        const dbData = offers.map(mapOfferToDB);
        await postData('offers', offers, dbData);
    }

    return offers;
};
export const saveOffers = (offers) => {
    const dbData = offers.map(mapOfferToDB);
    return postData('offers', offers, dbData);
};

export const addOffer = async (offer) => {
    const offers = await getOffers();
    const newOffer = {
        ...offer,
        id: 'OFF-' + Date.now(),
        status: 'active', // 'active', 'contracted', 'cancelled'
        payments: [],
        installments: [] // Will be populated below
    };

    // Generate pre-calculated installments for this offer
    newOffer.installments = generateOfferInstallments(newOffer);

    offers.push(newOffer);
    await saveOffers(offers);

    // Update Unit Status to 'offer'
    const buildings = await getBuildings();
    if (offer.buildingId) {
        const bIndex = buildings.findIndex(b => String(b.id).trim() === String(offer.buildingId).trim());
        if (bIndex !== -1 && buildings[bIndex].units) {
            const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === String(offer.unitId).trim());
            if (uIndex !== -1) {
                buildings[bIndex].units[uIndex].status = 'offer';
                await saveBuildings(buildings);
            }
        }
    }
    await logActivity('ADD', 'OFFERS', `Created offer for unit ${offer.unitId} - Customer: ${offer.customerName || offer.customerId}`);
    return newOffer;
};

export const addOfferPayment = async (offerId, payment) => {
    const offers = await getOffers();
    const index = offers.findIndex(o => o.id === offerId);
    if (index !== -1) {
        if (!offers[index].payments) offers[index].payments = [];
        offers[index].payments.push({
            id: 'PAY-' + Date.now(),
            date: payment.date || new Date().toISOString().split('T')[0],
            ...payment
        });
        await saveOffers(offers);
        await logActivity('PAYMENT', 'OFFERS', `Payment of ${payment.amount} added to offer ${offerId}`);
    }
};

export const updateOfferPayment = async (offerId, paymentId, updates) => {
    const offers = await getOffers();
    const index = offers.findIndex(o => o.id === offerId);
    if (index !== -1 && offers[index].payments) {
        const pIndex = offers[index].payments.findIndex(p => p.id === paymentId);
        if (pIndex !== -1) {
            offers[index].payments[pIndex] = { ...offers[index].payments[pIndex], ...updates };
            await saveOffers(offers);
            await logActivity('EDIT', 'OFFERS', `Updated payment ${paymentId} on offer ${offerId}`);
            return offers[index];
        }
    }
    return null;
};

export const updateOfferPaymentStatus = async (offerId, paymentId, newStatus) => {
    return updateOfferPayment(offerId, paymentId, { chequeStatus: newStatus });
};

export const deleteOfferPayment = async (offerId, paymentId) => {
    const offers = await getOffers();
    const index = offers.findIndex(o => o.id === offerId);
    if (index !== -1 && offers[index].payments) {
        offers[index].payments = offers[index].payments.filter(p => p.id !== paymentId);
        await saveOffers(offers);
        await logActivity('DELETE', 'OFFERS', `Deleted payment ${paymentId} from offer ${offerId}`);
        return offers[index];
    }
    return null;
};

export const updateOffer = async (offerId, updates) => {
    const offers = await getOffers();
    const index = offers.findIndex(o => o.id === offerId);
    if (index !== -1) {
        offers[index] = { ...offers[index], ...updates };
        await saveOffers(offers);
        await logActivity('EDIT', 'OFFERS', `Updated offer ${offerId}. Fields: ${Object.keys(updates).join(', ')}`);
        return offers[index];
    }
    return null;
};

export const cancelOffer = async (offerId, cancelConfig = {}) => {
    const {
        newBasePrice,
        newFinishedPrice,
        newUnitStatus = 'available',
        paymentPlan = ''
    } = cancelConfig;

    const offers = await getOffers();
    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex !== -1) {
        const offer = offers[offerIndex];
        const buildings = await getBuildings();

        // Find the unit to save current prices before changing
        let savedBasePrice, savedFinishedPrice, savedPaymentPlan;
        if (offer.buildingId) {
            const bIndex = buildings.findIndex(b => String(b.id).trim() === String(offer.buildingId).trim());
            if (bIndex !== -1 && buildings[bIndex].units) {
                const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === String(offer.unitId).trim());
                if (uIndex !== -1) {
                    const unit = buildings[bIndex].units[uIndex];
                    // Save current prices on the offer for restoration
                    savedBasePrice = unit.price;
                    savedFinishedPrice = unit.finishedPrice;
                    savedPaymentPlan = unit.paymentPlan || '';

                    // Apply new config
                    unit.status = newUnitStatus;
                    if (newBasePrice !== undefined && newBasePrice !== '') unit.price = Number(newBasePrice);
                    if (newFinishedPrice !== undefined && newFinishedPrice !== '') unit.finishedPrice = Number(newFinishedPrice);
                    if (paymentPlan) unit.paymentPlan = paymentPlan;
                    await saveBuildings(buildings);
                }
            }
        }

        // Save pre-cancel prices on offer and mark as cancelled
        offers[offerIndex] = {
            ...offer,
            status: 'cancelled',
            cancelDate: new Date().toISOString().split('T')[0],
            preCancelBasePrice: savedBasePrice,
            preCancelFinishedPrice: savedFinishedPrice,
            preCancelPaymentPlan: savedPaymentPlan
        };
        await saveOffers(offers);
        await logActivity('CANCEL', 'OFFERS', `Cancelled offer ${offerId} for unit ${offer.unitId}`);
    }
};

export const deleteOffer = async (offerId) => {
    const offers = await getOffers();
    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex !== -1) {
        const offer = offers[offerIndex];

        // Prevent deletion if converted to contract - mark as cancelled to preserve history
        if (offer.status === 'contracted') {
            offer.status = 'cancelled';
            await saveOffers(offers);
            await logActivity('CANCEL', 'OFFERS', `Contracted offer ${offerId} marked as cancelled instead of deleted.`);
            return;
        }

        // If it was active, reset unit status
        if (!offer.status || offer.status === 'active') {
            const buildings = await getBuildings();
            if (offer.buildingId) {
                const bIndex = buildings.findIndex(b => String(b.id).trim() === String(offer.buildingId).trim());
                if (bIndex !== -1 && buildings[bIndex].units) {
                    const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === String(offer.unitId).trim());
                    if (uIndex !== -1) {
                        buildings[bIndex].units[uIndex].status = 'available';
                        await saveBuildings(buildings);
                    }
                }
            }
        }

        // Always mark as cancelled instead of hard deleting if user wants to preserve data
        // But for hard delete (requested from UI), we can filter it out IF not contracted.
        const updatedOffers = offers.filter(o => o.id !== offerId);
        await saveOffers(updatedOffers);
        await logActivity('DELETE', 'OFFERS', `Deleted offer: ${offer.unitId} for ${offer.customerName}`);
    }
};

export const markOfferContracted = async (offerId, contractId = null) => {
    const offers = await getOffers();
    const index = offers.findIndex(o => o.id === offerId);
    if (index !== -1) {
        offers[index].status = 'contracted';
        if (contractId) offers[index].contractId = contractId;
        await saveOffers(offers);
        await logActivity('CONVERT', 'OFFERS', `Offer ${offerId} marked as contracted${contractId ? ` (Contract: ${contractId})` : ''}`);
    }
};

export const convertOfferToContract = async (offer) => {
    // 1. Build contract from offer data
    const newContractId = 'CON-' + Date.now();
    const contractDate = new Date().toISOString().split('T')[0];

    const contract = {
        id: newContractId,
        customerId: offer.customerId,
        customerName: offer.customerName,
        unitId: offer.unitId,
        buildingId: offer.buildingId,
        date: contractDate,
        totalPrice: offer.finalPrice || offer.totalPrice,
        downPayment: offer.downPayment,
        years: offer.years,
        frequency: offer.frequency,
        salesId: offer.salesId || '',
        offerId: offer.id,
        notes: `Converted from Offer ${offer.id}`
    };

    // 2. Save contract
    const contracts = await getContracts();
    contracts.push(contract);
    await saveContracts(contracts);

    // 3. Update Unit Status to 'contract'
    const buildings = await getBuildings();
    if (offer.buildingId) {
        const bIndex = buildings.findIndex(b => String(b.id).trim() === String(offer.buildingId).trim());
        if (bIndex !== -1 && buildings[bIndex].units) {
            const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === String(offer.unitId).trim());
            if (uIndex !== -1) {
                buildings[bIndex].units[uIndex].status = 'contract';
                await saveBuildings(buildings);
            }
        }
    }

    // 4. Resolve customer name for installments
    let displayCustName = offer.customerName;
    if (!displayCustName && offer.customerId) {
        const customers = await getCustomers();
        const cust = customers.find(c => String(c.id).trim() === String(offer.customerId).trim());
        if (cust) displayCustName = cust.name;
    }

    // 5. Transfer offer installments to contract installments
    const existingInstallments = await getInstallments();
    const transferredPayments = offer.payments || [];
    const totalTransferred = transferredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const firstTransferredCheque = transferredPayments.map(p => p.chequeNumber || p.reference || p.ref).find(c => c && c.trim()) || 'Offer Credits';
    const firstTransferredBank = transferredPayments.map(p => p.bank).find(b => b && b.trim()) || '';


    // Use offer's pre-calculated installments if available
    const offerInstallments = offer.installments || [];

    if (offerInstallments.length > 0) {
        // Transfer pre-calculated installments from offer
        let remainingCredit = totalTransferred;

        offerInstallments.forEach((offerIns, index) => {
            const amount = Number(offerIns.amount || 0);
            let paidAmount = 0;
            let status = 'Pending';

            // Apply transferred payments to installments (starting with down payment)
            if (remainingCredit > 0 && index === 0) {
                // Apply credit to down payment first
                paidAmount = Math.min(remainingCredit, amount);
                remainingCredit -= paidAmount;
                status = paidAmount >= amount ? 'Paid' : 'Pending';
            }

            existingInstallments.push({
                id: `INS-${index}-` + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                contractId: newContractId,
                unitId: offer.unitId,
                customerName: displayCustName || offer.customerId,
                type: offerIns.type,
                dueDate: offerIns.dueDate,
                amount: amount,
                paidAmount: paidAmount,
                status: status,
                paymentMethod: paidAmount > 0 ? 'TRANSFER' : (offerIns.paymentMethod || 'CASH'),
                chequeNumber: offerIns.chequeNumber || (paidAmount > 0 ? firstTransferredCheque : ''),
                bank: offerIns.bank || (paidAmount > 0 ? firstTransferredBank : ''),

                payments: index === 0 ? transferredPayments.map(p => ({
                    ...p,
                    method: p.paymentMethod || 'OFFER-TRANSFER',
                    ref: p.chequeNumber || p.reference || p.ref || '',
                    notes: (p.notes || `Transferred from Offer ${offer.id}`) + (p.bank ? ` [Bank: ${p.bank}]` : ''),
                    attachment: p.attachment || null
                })) : []
            });
        });
    } else {
        // Fallback: Generate installments if offer doesn't have pre-calculated ones
        const total = Number(offer.finalPrice || offer.totalPrice || 0);
        const downPaymentPercent = Number(offer.downPayment || 0);
        const years = Number(offer.years || 0);
        const freqStr = offer.frequency || 'quarterly';
        const freq = freqStr === 'quarterly' ? 4 : freqStr === 'biannual' ? 2 : 1;

        const downAmount = Math.round(total * (downPaymentPercent / 100));
        if (downAmount > 0) {
            const isPaid = totalTransferred >= downAmount;
            existingInstallments.push({
                id: 'INS-DP-' + Date.now(),
                contractId: newContractId,
                unitId: offer.unitId,
                customerName: displayCustName || offer.customerId,
                type: 'Down Payment',
                dueDate: contractDate,
                amount: downAmount,
                paidAmount: totalTransferred,
                status: isPaid ? 'Paid' : 'Pending',
                paymentMethod: totalTransferred > 0 ? 'TRANSFER' : 'CASH',
                chequeNumber: totalTransferred > 0 ? firstTransferredCheque : '',
                bank: firstTransferredBank,

                payments: transferredPayments.map(p => ({
                    ...p,
                    method: p.paymentMethod || 'OFFER-TRANSFER',
                    ref: p.chequeNumber || p.reference || p.ref || '',
                    notes: (p.notes || `Transferred from Offer ${offer.id}`) + (p.bank ? ` [Bank: ${p.bank}]` : '')
                }))
            });
        }

        const remaining = total - downAmount;
        const numInstallments = years * freq;
        if (numInstallments > 0 && remaining > 0) {
            const insAmount = Math.round(remaining / numInstallments);
            const startDate = new Date(contractDate);
            for (let i = 1; i <= numInstallments; i++) {
                const dueDate = new Date(startDate);
                if (freqStr === 'quarterly') dueDate.setMonth(dueDate.getMonth() + (i * 3));
                else if (freqStr === 'biannual') dueDate.setMonth(dueDate.getMonth() + (i * 6));
                else dueDate.setFullYear(dueDate.getFullYear() + i);
                existingInstallments.push({
                    id: `INS-${i}-` + Date.now(),
                    contractId: newContractId,
                    unitId: offer.unitId,
                    customerName: displayCustName || offer.customerId,
                    type: `Installment ${i}/${numInstallments}`,
                    dueDate: dueDate.toISOString().split('T')[0],
                    amount: insAmount,
                    paidAmount: 0,
                    status: 'Pending',
                    paymentMethod: 'CASH',
                    chequeNumber: '',
                    bank: ''
                });
            }
        }
    }

    await saveInstallments(existingInstallments);

    // 6. Mark offer as contracted with contract link
    await markOfferContracted(offer.id, newContractId);

    await logActivity('CONVERT', 'CONTRACTS', `Converted offer ${offer.id} to contract ${newContractId} for unit ${offer.unitId} - Customer: ${offer.customerName || offer.customerId}`);
    return contract;
};

export const removeOfferOnly = async (offerId) => {
    const offers = await getOffers();
    const index = offers.findIndex(o => o.id === offerId);
    if (index !== -1) {
        const offer = offers[index];
        // PERMANENT DELETE (Only for cleanup/admin)
        offers.splice(index, 1);
        await saveOffers(offers);
        await deleteSupabaseRow('offers', offerId);
        await logActivity('DELETE', 'OFFERS', `Permanently deleted offer ${offerId} for unit ${offer.unitId || 'N/A'}`);
    }
};

// --- CONTRACTS ---
export const getContracts = async () => {
    const raw = await fetchData('contracts');
    return raw.map(mapContractFromDB);
};
export const saveContracts = (contracts) => {
    const dbData = contracts.map(mapContractToDB);
    return postData('contracts', contracts, dbData);
};

export const updateContract = async (id, updates) => {
    const contracts = await getContracts();
    const index = contracts.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
        contracts[index] = { ...contracts[index], ...updates };
        await saveContracts(contracts);
        await logActivity('EDIT', 'CONTRACTS', `Updated contract: ${id}. Updates: ${JSON.stringify(updates)}`);
        return contracts[index];
    }
    return null;
};

export const getTerminatedContracts = async () => {
    const raw = await fetchData('terminated_contracts');
    return raw.map(mapTerminatedContractFromDB);
};
export const saveTerminatedContracts = (data) => {
    const dbData = data.map(mapTerminatedContractToDB);
    return postData('terminated_contracts', data, dbData);
};

export const getTerminatedInstallments = async () => {
    const raw = await fetchData('terminated_installments');
    return raw.map(mapInstallmentFromDB);
};
export const saveTerminatedInstallments = (data) => {
    const dbData = data.map(mapInstallmentToDB);
    return postData('terminated_installments', data, dbData);
};

export const deleteAllContracts = async () => {
    await saveContracts([]);
    await deleteAllSupabaseRows('contracts');
    await logActivity('DELETE_ALL', 'CONTRACTS', 'Deleted all contracts');
};

export const deleteAllTerminatedHistory = async () => {
    await saveTerminatedContracts([]);
    await saveTerminatedInstallments([]);
    await deleteAllSupabaseRows('terminated_contracts');
    await deleteAllSupabaseRows('terminated_installments');
    await logActivity('DELETE_ALL', 'TERMINATED', 'Deleted all terminated contracts and installment history');
};

export const addContract = async (contract, transferredPayments = []) => {
    const contracts = await getContracts();
    const newContract = { ...contract, id: 'CON-' + Date.now() };
    contracts.push(newContract);
    await saveContracts(contracts);

    const buildings = await getBuildings();
    if (contract.buildingId) {
        const bIndex = buildings.findIndex(b => String(b.id).trim() === String(contract.buildingId).trim());
        if (bIndex !== -1 && buildings[bIndex].units) {
            const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === String(contract.unitId).trim());
            if (uIndex !== -1) {
                buildings[bIndex].units[uIndex].status = 'contract';
                await saveBuildings(buildings);
            }
        }
    }

    // Resolve customer name for installments
    let displayCustName = contract.customerName;
    if (!displayCustName && contract.customerId) {
        const customers = await getCustomers();
        const cust = customers.find(c => String(c.id).trim() === String(contract.customerId).trim());
        if (cust) displayCustName = cust.name;
    }

    // Generate Installments
    const newInstallments = generateInstallmentPlan({
        ...contract,
        id: newContract.id
    });

    // Resolve customer name and apply transferred payments
    const totalTransferred = transferredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    let remainingCredit = totalTransferred;
    const installmentsToSave = newInstallments.map((ins, index) => {
        let paidAmount = 0;
        let pHistory = [];

        if (remainingCredit > 0 && index === 0) {
            paidAmount = Math.min(remainingCredit, ins.amount);
            remainingCredit -= paidAmount;
            pHistory = transferredPayments.map(p => ({
                ...p,
                method: 'OFFER-TRANSFER',
                notes: 'Transferred from Offer'
            }));
        }

        return {
            ...ins,
            customerName: displayCustName || contract.customerId,
            unitId: contract.unitId,
            paidAmount,
            payments: pHistory,
            status: paidAmount >= ins.amount ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Pending')
        };
    });

    const currentInstallments = await getInstallments();
    await saveInstallments([...currentInstallments, ...installmentsToSave]);


    await logActivity('ADD', 'CONTRACTS', `Added contract ${newContract.id} for unit ${contract.unitId} - Customer: ${contract.customerName || contract.customerId}`);
    return newContract;
};

// --- NEW: Resale contract IN-PLACE (old contract stays with 'resold' status, new contract created) ---
export const resaleContractInPlace = async (contractId, resaleData = {}) => {
    const {
        newCustomerId,
        newCustomerName,
        updatedInstallments = []
    } = resaleData;

    // Fetch all data
    const [contracts, buildings, installments, allOffers] = await Promise.all([
        getContracts(),
        getBuildings(),
        getInstallments(),
        getOffers()
    ]);

    const index = contracts.findIndex(c => c.id === contractId);
    if (index === -1) {
        console.warn(`Contract ${contractId} not found. Cannot resale.`);
        return null;
    }

    const oldContract = contracts[index];

    // 1. Mark old contract as resold (stays in active list)
    contracts[index] = {
        ...oldContract,
        status: 'resold',
        resaleDate: new Date().toISOString().split('T')[0],
        resoldTo: newCustomerName
    };

    // 2. Mark all linked installments as resold
    const linkedInstallmentIds = [];
    for (let i = 0; i < installments.length; i++) {
        const ins = installments[i];
        const matchByContract = ins.contractId && String(ins.contractId).trim() === String(contractId).trim();
        const matchByUnit = String(ins.unitId || '').trim().toLowerCase() === String(oldContract.unitId || '').trim().toLowerCase() &&
            String(ins.customerName || '').trim().toLowerCase() === String(oldContract.customerName || '').trim().toLowerCase();
        if (matchByContract || matchByUnit) {
            installments[i] = { ...ins, status: 'resold' };
            linkedInstallmentIds.push(ins.id);
        }
    }

    // 3. Create new contract for new customer
    const newContractId = 'CON-RESALE-' + Date.now();
    const newContract = {
        ...oldContract,
        id: newContractId,
        contractId: newContractId,
        customerId: newCustomerId,
        customerName: newCustomerName,
        status: undefined, // active
        notes: `Resale from ${oldContract.customerName || oldContract.customerId}. ` + (oldContract.notes || ''),
        resaleDate: undefined,
        resoldTo: undefined,
        terminationDate: undefined,
        terminationReason: undefined
    };
    // Clean undefined keys
    Object.keys(newContract).forEach(key => newContract[key] === undefined && delete newContract[key]);
    contracts.push(newContract);

    // 4. Create new installments from the updated list
    const newInstallments = updatedInstallments.map((ins, i) => {
        const newIns = {
            ...ins,
            id: `INS-RS-${i}-` + Date.now(),
            contractId: newContractId,
            customerName: newCustomerName,
            unitId: oldContract.unitId,
            status: ins.status === 'resold' || ins.status === 'terminated' ? 'Pending' : ins.status // Reset status for new
        };
        // Keep paid amount if it was paid
        if (ins.status === 'Paid') {
            newIns.status = 'Paid';
        }
        return newIns;
    });
    installments.push(...newInstallments);

    // 5. Update old contract's offer to 'resold_contract'
    const linkedOffer = allOffers.find(o =>
        o.contractId === contractId ||
        (o.unitId === oldContract.unitId && o.status === 'contracted')
    );
    if (linkedOffer) {
        const oIndex = allOffers.findIndex(o => o.id === linkedOffer.id);
        if (oIndex !== -1) {
            allOffers[oIndex] = { ...allOffers[oIndex], status: 'resold_contract' };
        }
    }

    // 6. Update unit to point to new contract (keep sold status)
    const uId = String(oldContract.unitId).trim();
    for (const b of buildings) {
        if (b.units) {
            const uIndex = b.units.findIndex(u => String(u.unitId).trim() === uId);
            if (uIndex !== -1) {
                b.units[uIndex].status = 'sold';
                break;
            }
        }
    }

    // 7. Save all
    await Promise.all([
        saveContracts(contracts),
        saveBuildings(buildings),
        saveInstallments(installments),
        saveOffers(allOffers)
    ]);

    console.log(`Resale complete for contract ${contractId}. New contract ${newContractId} for ${newCustomerName}.`);
    await logActivity('RESALE', 'CONTRACTS', `Resold contract ${contractId} (${oldContract.customerName}) to ${newCustomerName}. New contract: ${newContractId}. ${linkedInstallmentIds.length} installments archived.`);

    return newContract;
};

// --- NEW: Terminate contract IN-PLACE (keeps in active lists with 'terminated' status) ---
export const terminateContractInPlace = async (contractId, terminationData = {}) => {
    const {
        reason = 'Terminated',
        newBasePrice,
        newFinishedPrice,
        newUnitStatus = 'available',
        paymentPlan = ''
    } = terminationData;

    // Fetch necessary data
    const [contracts, buildings, installments, allOffers] = await Promise.all([
        getContracts(),
        getBuildings(),
        getInstallments(),
        getOffers()
    ]);

    const index = contracts.findIndex(c => c.id === contractId);
    if (index === -1) {
        console.warn(`Contract ${contractId} not found. Cannot terminate.`);
        return null;
    }

    const contract = contracts[index];

    // 1. Mark contract as terminated (stays in active list)
    // Save pre-termination unit prices for restoration
    const uId = String(contract.unitId).trim();
    let savedBasePrice, savedFinishedPrice, savedPaymentPlan;

    // Find unit to save current prices
    const findUnit = () => {
        if (contract.buildingId) {
            const bId = String(contract.buildingId).trim();
            const bIndex = buildings.findIndex(b => String(b.id).trim() === bId);
            if (bIndex !== -1 && buildings[bIndex].units) {
                const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === uId);
                if (uIndex !== -1) return buildings[bIndex].units[uIndex];
            }
        }
        for (const b of buildings) {
            if (b.units) {
                const u = b.units.find(u => String(u.unitId).trim() === uId);
                if (u) return u;
            }
        }
        return null;
    };
    const currentUnit = findUnit();
    if (currentUnit) {
        savedBasePrice = currentUnit.price;
        savedFinishedPrice = currentUnit.finishedPrice;
        savedPaymentPlan = currentUnit.paymentPlan || '';
    }

    contracts[index] = {
        ...contract,
        status: 'terminated',
        terminationDate: new Date().toISOString().split('T')[0],
        terminationReason: reason,
        preTermBasePrice: savedBasePrice,
        preTermFinishedPrice: savedFinishedPrice,
        preTermPaymentPlan: savedPaymentPlan
    };

    // 2. Update unit: new prices, status, and payment plan note
    if (currentUnit) {
        currentUnit.status = newUnitStatus;
        if (newBasePrice !== undefined && newBasePrice !== '') currentUnit.price = Number(newBasePrice);
        if (newFinishedPrice !== undefined && newFinishedPrice !== '') currentUnit.finishedPrice = Number(newFinishedPrice);
        if (paymentPlan) currentUnit.paymentPlan = paymentPlan;
    }


    // 3. Mark all linked installments as terminated (save original status for restoration)
    const linkedInstallmentIds = [];
    for (let i = 0; i < installments.length; i++) {
        const ins = installments[i];
        const matchByContract = ins.contractId && String(ins.contractId).trim() === String(contractId).trim();
        const matchByUnit = String(ins.unitId || '').trim().toLowerCase() === String(contract.unitId || '').trim().toLowerCase() &&
            String(ins.customerName || '').trim().toLowerCase() === String(contract.customerName || '').trim().toLowerCase();
        if (matchByContract || matchByUnit) {
            installments[i] = { ...ins, preTermStatus: ins.status, status: 'terminated' };
            linkedInstallmentIds.push(ins.id);
        }
    }

    // 4. Update linked offer to 'terminated_contract'
    const linkedOffer = allOffers.find(o =>
        o.contractId === contractId ||
        (o.unitId === contract.unitId && o.status === 'contracted')
    );
    if (linkedOffer) {
        const oIndex = allOffers.findIndex(o => o.id === linkedOffer.id);
        if (oIndex !== -1) {
            allOffers[oIndex] = { ...allOffers[oIndex], status: 'terminated_contract' };
        }
    }

    // 5. Save all changes
    await Promise.all([
        saveContracts(contracts),
        saveBuildings(buildings),
        saveInstallments(installments),
        saveOffers(allOffers)
    ]);

    console.log(`In-place termination complete for contract ${contractId}. Unit ${contract.unitId} set to '${newUnitStatus}'.`);
    await logActivity('TERMINATE', 'CONTRACTS', `Terminated contract ${contractId} for unit ${contract.unitId} - Reason: ${reason} - ${linkedInstallmentIds.length} installments marked terminated`);

    return contracts[index];
};

// --- Reactivate a cancelled offer (restore unit prices and set back to active) ---
export const reactivateOffer = async (offerId) => {
    const [offers, buildings] = await Promise.all([
        getOffers(),
        getBuildings()
    ]);

    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex === -1) {
        throw new Error('Offer not found.');
    }

    const offer = offers[offerIndex];
    if (offer.status !== 'cancelled') {
        throw new Error('Only cancelled offers can be reactivated.');
    }

    // Check for conflicts — no other active offers on the same unit
    const conflicting = offers.find(o =>
        o.id !== offerId &&
        String(o.unitId).trim().toLowerCase() === String(offer.unitId).trim().toLowerCase() &&
        (o.status === 'active' || o.status === 'contracted')
    );
    if (conflicting) {
        throw new Error(`Cannot reactivate: Unit ${offer.unitId} already has an active offer (${conflicting.id}).`);
    }

    // Restore unit prices from saved pre-cancel values
    const uId = String(offer.unitId).trim();
    for (const b of buildings) {
        if (b.units) {
            const uIndex = b.units.findIndex(u => String(u.unitId).trim() === uId);
            if (uIndex !== -1) {
                b.units[uIndex].status = 'offer';
                if (offer.preCancelBasePrice !== undefined && offer.preCancelBasePrice !== null) {
                    b.units[uIndex].price = Number(offer.preCancelBasePrice);
                }
                if (offer.preCancelFinishedPrice !== undefined && offer.preCancelFinishedPrice !== null) {
                    b.units[uIndex].finishedPrice = Number(offer.preCancelFinishedPrice);
                }
                if (offer.preCancelPaymentPlan) {
                    b.units[uIndex].paymentPlan = offer.preCancelPaymentPlan;
                }
                break;
            }
        }
    }

    // Set offer back to active and clear cancel metadata
    offers[offerIndex] = {
        ...offer,
        status: 'active',
        cancelDate: undefined,
        preCancelBasePrice: undefined,
        preCancelFinishedPrice: undefined,
        preCancelPaymentPlan: undefined
    };

    await Promise.all([
        saveOffers(offers),
        saveBuildings(buildings)
    ]);

    await logActivity('REACTIVATE', 'OFFERS', `Reactivated offer ${offerId} for unit ${offer.unitId}`);
    return offers[offerIndex];
};

// --- Reactivate a terminated contract (restore contract + offer + installments + unit prices) ---
export const reactivateContract = async (contractId) => {
    const [contracts, buildings, installments, allOffers] = await Promise.all([
        getContracts(),
        getBuildings(),
        getInstallments(),
        getOffers()
    ]);

    const index = contracts.findIndex(c => c.id === contractId);
    if (index === -1) {
        throw new Error('Contract not found.');
    }

    const contract = contracts[index];
    if (contract.status !== 'terminated') {
        throw new Error('Only terminated contracts can be reactivated.');
    }

    // Check for conflicts — no active offers or contracts on the same unit
    const unitId = String(contract.unitId).trim().toLowerCase();

    const conflictingOffer = allOffers.find(o =>
        String(o.unitId || '').trim().toLowerCase() === unitId &&
        (o.status === 'active' || o.status === 'contracted')
    );
    if (conflictingOffer) {
        throw new Error(`Cannot reactivate: Unit ${contract.unitId} already has an active offer (${conflictingOffer.id}).`);
    }

    const conflictingContract = contracts.find(c =>
        c.id !== contractId &&
        String(c.unitId || '').trim().toLowerCase() === unitId &&
        (!c.status || c.status === 'active')
    );
    if (conflictingContract) {
        throw new Error(`Cannot reactivate: Unit ${contract.unitId} already has an active contract (${conflictingContract.id}).`);
    }

    // 1. Restore contract to active
    contracts[index] = {
        ...contract,
        status: undefined,
        terminationDate: undefined,
        terminationReason: undefined,
        preTermBasePrice: undefined,
        preTermFinishedPrice: undefined,
        preTermPaymentPlan: undefined
    };

    // 2. Restore unit prices
    const uId = String(contract.unitId).trim();
    for (const b of buildings) {
        if (b.units) {
            const uIndex = b.units.findIndex(u => String(u.unitId).trim() === uId);
            if (uIndex !== -1) {
                b.units[uIndex].status = 'contract';
                if (contract.preTermBasePrice !== undefined && contract.preTermBasePrice !== null) {
                    b.units[uIndex].price = Number(contract.preTermBasePrice);
                }
                if (contract.preTermFinishedPrice !== undefined && contract.preTermFinishedPrice !== null) {
                    b.units[uIndex].finishedPrice = Number(contract.preTermFinishedPrice);
                }
                if (contract.preTermPaymentPlan) {
                    b.units[uIndex].paymentPlan = contract.preTermPaymentPlan;
                }
                break;
            }
        }
    }

    // 3. Restore linked installments to their original status
    let restoredCount = 0;
    for (let i = 0; i < installments.length; i++) {
        const ins = installments[i];
        const matchByContract = ins.contractId && String(ins.contractId).trim() === String(contractId).trim();
        const matchByUnit = String(ins.unitId || '').trim().toLowerCase() === unitId &&
            String(ins.customerName || '').trim().toLowerCase() === String(contract.customerName || '').trim().toLowerCase();
        if ((matchByContract || matchByUnit) && ins.status === 'terminated') {
            const originalStatus = ins.preTermStatus || 'Pending';
            installments[i] = { ...ins, status: originalStatus, preTermStatus: undefined };
            restoredCount++;
        }
    }

    // 4. Restore linked offer from 'terminated_contract' back to 'contracted'
    const linkedOffer = allOffers.find(o =>
        (o.contractId === contractId || (String(o.unitId || '').trim().toLowerCase() === unitId)) &&
        o.status === 'terminated_contract'
    );
    if (linkedOffer) {
        const oIndex = allOffers.findIndex(o => o.id === linkedOffer.id);
        if (oIndex !== -1) {
            allOffers[oIndex] = { ...allOffers[oIndex], status: 'contracted' };
        }
    }

    // 5. Save all changes
    await Promise.all([
        saveContracts(contracts),
        saveBuildings(buildings),
        saveInstallments(installments),
        saveOffers(allOffers)
    ]);

    console.log(`Reactivation complete for contract ${contractId}. Unit ${contract.unitId} restored to 'contract'.`);
    await logActivity('REACTIVATE', 'CONTRACTS', `Reactivated contract ${contractId} for unit ${contract.unitId} - ${restoredCount} installments restored`);

    return contracts[index];
};

export const cancelContract = async (contractId, reason = 'cancelled', skipUnitReset = false) => {
    // Fetch necessary data in parallel for performance
    const [contracts, buildings, termContracts, installments, termInstallments] = await Promise.all([
        getContracts(),
        skipUnitReset ? Promise.resolve(null) : getBuildings(),
        getTerminatedContracts(),
        getInstallments(),
        getTerminatedInstallments()
    ]);

    const index = contracts.findIndex(c => c.id === contractId);
    if (index === -1) {
        console.warn(`Contract ${contractId} not found in active contracts. Cannot terminate.`);
        return null;
    }

    const contract = contracts[index];

    // 1. Reset Unit Status (if not skipped for resale)
    if (!skipUnitReset && buildings) {
        let unitFound = false;
        const uId = String(contract.unitId).trim();

        // Priority Match: buildingId
        if (contract.buildingId) {
            const bId = String(contract.buildingId).trim();
            const bIndex = buildings.findIndex(b => String(b.id).trim() === bId);
            if (bIndex !== -1 && buildings[bIndex].units) {
                const uIndex = buildings[bIndex].units.findIndex(u => String(u.unitId).trim() === uId);
                if (uIndex !== -1) {
                    buildings[bIndex].units[uIndex].status = 'available';
                    unitFound = true;
                }
            }
        }

        // Fallback Match: Search all buildings for unitId
        if (!unitFound) {
            for (const b of buildings) {
                if (b.units) {
                    const uIndex = b.units.findIndex(u => String(u.unitId).trim() === uId);
                    if (uIndex !== -1) {
                        b.units[uIndex].status = 'available';
                        unitFound = true;
                        break;
                    }
                }
            }
        }

        if (unitFound) {
            console.log(`Unit ${contract.unitId} reset to available.`);
        } else {
            console.warn(`Could not find unit ${contract.unitId} in any building.`);
        }
    }

    // 2. Prepare terminated contract
    const terminatedEntry = {
        ...contract,
        terminationDate: new Date().toISOString().split('T')[0],
        terminationReason: reason
    };
    termContracts.push(terminatedEntry);

    // 3. Find and move linked installments
    const linked = installments.filter(ins =>
        (ins.contractId && String(ins.contractId).trim() === String(contractId).trim()) ||
        (String(ins.unitId || '').trim().toLowerCase() === String(contract.unitId || '').trim().toLowerCase() &&
            String(ins.customerName || '').trim().toLowerCase() === String(contract.customerName || '').trim().toLowerCase())
    );
    const remaining = installments.filter(ins => !linked.find(l => l.id === ins.id));

    if (linked.length > 0) {
        console.log(`Moving ${linked.length} installments to terminated storage for unit ${contract.unitId}`);
        termInstallments.push(...linked);
    }

    // 4. Remove from active contracts
    contracts.splice(index, 1);

    // 5. Save all changes in parallel for maximum performance
    const savePromises = [
        saveTerminatedContracts(termContracts),
        saveInstallments(remaining),
        saveContracts(contracts),
        linked.length > 0 ? saveTerminatedInstallments(termInstallments) : Promise.resolve()
    ];
    if (!skipUnitReset && buildings) {
        savePromises.push(saveBuildings(buildings));
    }
    await Promise.all(savePromises);

    // 6. Cleanup Supabase (batch operations instead of individual deletes)
    if (supabase) {
        const linkedIds = linked.map(ins => ins.id);
        const cleanupPromises = [
            deleteSupabaseRow('contracts', contractId)
        ];

        // Batch delete installments by ID if any linked
        if (linkedIds.length > 0) {
            cleanupPromises.push(
                supabase.from('installments').delete().in('id', linkedIds)
            );
        }

        await Promise.all(cleanupPromises);
        console.log(`Successfully cleaned up contract ${contractId} from Supabase.`);
    }

    // 7. Force localStorage sync for offline mode
    localStorage.setItem('installments', JSON.stringify(remaining));

    console.log(`Termination complete for contract ${contractId}. Unit ${contract.unitId} is now available.`);
    await logActivity('TERMINATE', 'CONTRACTS', `Terminated contract ${contractId} for unit ${contract.unitId} - Reason: ${reason} - ${linked.length} installments archived`);
    return terminatedEntry;
};

// --- INSTALLMENTS ---
export const getInstallments = async () => {
    const raw = await fetchData('installments');
    return (raw || []).map(mapInstallmentFromDB).map(recalculateInstallment);
};
export const saveInstallments = (installments) => {
    const dbData = installments.map(mapInstallmentToDB);
    return postData('installments', installments, dbData);
};

// --- RECALCULATION HELPER ---
const recalculateInstallment = (ins) => {
    if (!ins.payments || ins.payments.length === 0) {
        // Legacy fallback: if no multi-payments exist, use the base paidAmount logic
        return ins;
    }
    const total = ins.payments.reduce((sum, p) => {
        const method = (p.method || '').toLowerCase().trim();
        const status = (p.chequeStatus || '').toLowerCase().trim();
        const isCheque = method === 'cheque';
        const isCleared = status === 'cleared';
        return (!isCheque || isCleared) ? sum + (Number(p.amount) || 0) : sum;
    }, 0);
    ins.paidAmount = total;
    const due = Math.round(Number(ins.amount) || 0);
    const rPaid = Math.round(total);
    if (due > 0 && (due - rPaid) < 1) ins.status = 'Paid';
    else if (rPaid > 1) ins.status = 'Partially Paid';
    else ins.status = 'Not Paid';
    return ins;
};

export const deleteAllInstallments = async () => {
    await saveInstallments([]);
    await deleteAllSupabaseRows('installments');
    await logActivity('DELETE_ALL', 'INSTALLMENTS', 'Deleted all installments');
};

export const updateInstallment = async (installmentId, updates) => {
    const installments = await getInstallments();
    const index = installments.findIndex(ins => ins.id === installmentId);
    if (index !== -1) {
        let updatedRow = { ...installments[index], ...updates };

        // Handle Cheque 'Cleared'/'Rejected' status: automatically update paid amount
        // ONLY if there are no multi-payments (cash, transfer, etc.) recorded.
        const hasPaymentHistory = updatedRow.payments && updatedRow.payments.length > 0;
        if (updatedRow.paymentMethod === 'Cheque' && !hasPaymentHistory) {
            if (updatedRow.chequeStatus === 'Cleared') {
                updatedRow.paidAmount = updatedRow.amount;
            } else if (updatedRow.chequeStatus === 'Rejected') {
                updatedRow.paidAmount = 0;
            }
        }

        // Auto-recalculate status based on Rest Amount (using rounding for precision)
        const totalPaid = Math.round(Number(updatedRow.paidAmount) || 0);
        const totalDue = Math.round(Number(updatedRow.amount) || 0);

        if (totalDue > 0 && (totalDue - totalPaid) < 1) {
            updatedRow.status = 'Paid';
        } else if (totalPaid > 1) {
            updatedRow.status = 'Partially Paid';
        } else {
            updatedRow.status = 'Not Paid';
        }

        installments[index] = updatedRow;
        await saveInstallments(installments);
        await logActivity('EDIT', 'INSTALLMENTS', `Updated installment ${installmentId} - Status: ${updatedRow.status}, Paid: ${totalPaid}/${totalDue}`);
        return installments[index];
    }
    return null;
};

export const addInstallmentFeedback = async (installmentId, feedbackText) => {
    const installments = await getInstallments();
    const index = installments.findIndex(ins => ins.id === installmentId);
    if (index !== -1) {
        if (!installments[index].feedbacks) installments[index].feedbacks = [];
        installments[index].feedbacks.push({
            id: Date.now().toString(),
            text: feedbackText,
            date: (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })()
        });
        await saveInstallments(installments);
        await logActivity('FEEDBACK', 'INSTALLMENTS', `Added feedback to installment ${installmentId}: ${feedbackText.substring(0, 100)}`);
        return installments[index];
    }
    return null;
};

export const deleteInstallmentFeedback = async (installmentId, feedbackId) => {
    const installments = await getInstallments();
    const index = installments.findIndex(ins => ins.id === installmentId);
    if (index !== -1 && installments[index].feedbacks) {
        installments[index].feedbacks = installments[index].feedbacks.filter(fb => fb.id !== feedbackId);
        await saveInstallments(installments);
        await logActivity('DELETE', 'INSTALLMENTS', `Deleted feedback ${feedbackId} from installment ${installmentId}`);
        return installments[index];
    }
    return null;
};

// --- PAYMENTS (Multi-Payment Support) ---
export const addInstallmentPayment = async (installmentId, payment) => {
    const installments = await getInstallments();
    const index = installments.findIndex(ins => ins.id === installmentId);
    if (index !== -1) {
        // Initialize payments array if needed
        if (!installments[index].payments) {
            installments[index].payments = [];

            // CONTEXT: If we have a legacy 'paidAmount' but no payments array, 
            // we should preserve that legacy amount as a "Previous Payment" entry.
            const existingPaid = Number(installments[index].paidAmount) || 0;
            if (existingPaid > 0) {
                installments[index].payments.push({
                    id: 'legacy-' + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    amount: existingPaid,
                    method: 'Unknown',
                    ref: 'Legacy Import',
                    notes: 'Auto-generated from pre-existing paid amount'
                });
            }
        }

        const newPayment = {
            id: Date.now().toString(),
            date: payment.date || new Date().toISOString().split('T')[0],
            amount: Number(payment.amount) || 0,
            method: payment.method || 'cash',
            ref: payment.ref || '',
            notes: payment.notes || '',
            bank: payment.bank || '',
            chequeNumber: payment.chequeNumber || '',
            chequeStatus: payment.chequeStatus || 'Not Collected',
            attachment: payment.attachment || null
        };

        installments[index].payments.push(newPayment);
        recalculateInstallment(installments[index]);

        await saveInstallments(installments);
        await logActivity('PAYMENT', 'INSTALLMENTS', `Payment of ${newPayment.amount} (${newPayment.method}) added to installment ${installmentId} - Total Paid: ${installments[index].paidAmount}`);

        // Auto-check commission activation
        const cId = installments[index].contractId;
        if (cId) {
            try { await checkAndActivateCommission(cId); } catch (e) { console.warn('Commission check skipped:', e.message); }
        }

        return installments[index];
    }
    return null;
};

export const deleteInstallmentPayment = async (installmentId, paymentId) => {
    const installments = await getInstallments();
    const index = installments.findIndex(ins => ins.id === installmentId);
    if (index !== -1 && installments[index].payments) {
        installments[index].payments = installments[index].payments.filter(p => p.id !== paymentId);
        recalculateInstallment(installments[index]);

        await saveInstallments(installments);
        await logActivity('DELETE', 'INSTALLMENTS', `Deleted payment ${paymentId} from installment ${installmentId} - New Status: ${installments[index].status}, Remaining Paid: ${installments[index].paidAmount}`);
        return installments[index];
    }
    return null;
};

export const updateInstallmentPayment = async (installmentId, paymentId, updates) => {
    const installments = await getInstallments();
    const index = installments.findIndex(ins => ins.id === installmentId);
    if (index !== -1 && installments[index].payments) {
        const pIndex = installments[index].payments.findIndex(p => p.id === paymentId);
        if (pIndex !== -1) {
            installments[index].payments[pIndex] = { ...installments[index].payments[pIndex], ...updates };
            recalculateInstallment(installments[index]);
            await saveInstallments(installments);
            await logActivity('EDIT', 'INSTALLMENTS', `Updated payment ${paymentId} on installment ${installmentId}`);
            return installments[index];
        }
    }
    return null;
};


export const updatePaymentReceiptInfo = async (paymentId, unitId) => {
    // This handles both contract installments and offer payments if they have unique IDs
    // Check Installments (Main Payments array)
    const installments = await getInstallments();
    // Search in all installments' payment arrays
    for (let i = 0; i < installments.length; i++) {
        const ins = installments[i];
        if (ins.payments) {
            const pIndex = ins.payments.findIndex(p => p.id === paymentId);
            if (pIndex !== -1) {
                const pay = ins.payments[pIndex];
                const newCount = (pay.print_count || 0) + 1;
                const serial = pay.receipt_serial || `REC-${unitId}-${Date.now()}`;

                ins.payments[pIndex] = { ...pay, print_count: newCount, receipt_serial: serial };
                await saveInstallments(installments);
                return ins.payments[pIndex];
            }
        }
        // Also check if the installment ITSELF is the payment (legacy support or main installment record)
        if (ins.id === paymentId) {
            const newCount = (ins.print_count || 0) + 1;
            const serial = ins.receipt_serial || `REC-${unitId}-${Date.now()}`;

            installments[i] = { ...ins, print_count: newCount, receipt_serial: serial };
            await saveInstallments(installments);
            return installments[i];
        }
    }

    // Check Offers
    const offers = await getOffers();
    for (let o of offers) {
        if (o.payments) {
            const payIndex = o.payments.findIndex(p => p.id === paymentId);
            if (payIndex !== -1) {
                const pay = o.payments[payIndex];
                const newCount = (pay.print_count || 0) + 1;
                const serial = pay.receipt_serial || `REC-OFF-${unitId}-${Date.now()}`;

                o.payments[payIndex] = { ...pay, print_count: newCount, receipt_serial: serial };
                await saveOffers(offers);
                return o.payments[payIndex];
            }
        }
    }
    return null;
};

// --- SALES ---
export const getSales = async () => {
    const raw = await fetchData('sales');
    return raw.map(mapSalesFromDB);
};
export const saveSales = (data) => {
    const dbData = data.map(mapSalesToDB);
    return postData('sales', data, dbData);
};

export const addSales = async (sale) => {
    const sales = await getSales();
    const newSale = {
        ...sale,
        id: sale.id ? String(sale.id) : 'SALES-' + Date.now()
    };
    sales.push(newSale);
    await saveSales(sales);
    await logActivity('ADD', 'SALES', `Added sales agent: ${newSale.name} (ID: ${newSale.id})`);
    return newSale;
};

export const deleteSales = async (id) => {
    const sales = await getSales();
    const s = sales.find(s => String(s.id) === String(id));
    const filtered = sales.filter(s => s.id !== id);
    await saveSales(filtered);
    await deleteSupabaseRow('sales', id);
    await logActivity('DELETE', 'SALES', `Deleted sales agent: ${s?.name || id}`);
};

export const updateSales = async (id, updates) => {
    const sales = await getSales();
    const index = sales.findIndex(s => String(s.id) === String(id));
    if (index !== -1) {
        sales[index] = { ...sales[index], ...updates };
        await saveSales(sales);
        await logActivity('EDIT', 'SALES', `Updated sales agent: ${sales[index].name}`);
        return sales[index];
    }
    return null;
};

export const deleteAllSales = async () => {
    await saveSales([]);
    await deleteAllSupabaseRows('sales');
    await logActivity('DELETE_ALL', 'SALES', 'Deleted all sales agents');
};

// --- Wallets ---
const mapWalletToDB = (w) => ({
    id: w.id,
    bank_address: w.bankAddress,
    application_date: w.applicationDate,
    check_ids: w.checkIds,
    notes: w.notes,
    created_at: w.createdAt
});

const mapWalletFromDB = (w) => ({
    id: w.id,
    bankAddress: w.bank_address || w.bankAddress,
    applicationDate: w.application_date || w.applicationDate,
    checkIds: w.check_ids || w.checkIds || [],
    notes: w.notes || '',
    createdAt: w.created_at || w.createdAt
});

export const getWallets = async () => {
    const raw = await fetchData('wallets');
    return raw.map(mapWalletFromDB);
};

export const saveWallets = (data) => {
    const dbData = data.map(mapWalletToDB);
    return postData('wallets', data, dbData);
};

export const addWallet = async (wallet) => {
    const wallets = await getWallets();
    const newWallet = {
        ...wallet,
        id: wallet.id ? String(wallet.id) : 'WALLET-' + Date.now(),
        createdAt: new Date().toISOString()
    };
    wallets.push(newWallet);
    await saveWallets(wallets);
    await logActivity('ADD', 'WALLETS', `Added wallet: ${newWallet.bankAddress} (ID: ${newWallet.id})`);
    return newWallet;
};

export const deleteWallet = async (id) => {
    const wallets = await getWallets();
    const w = wallets.find(item => String(item.id) === String(id));
    const filtered = wallets.filter(item => item.id !== id);
    await saveWallets(filtered);
    await deleteSupabaseRow('wallets', id);
    await logActivity('DELETE', 'WALLETS', `Deleted wallet: ${w?.bankAddress || id}`);
};

export const updateWallet = async (id, updates) => {
    const wallets = await getWallets();
    const index = wallets.findIndex(w => String(w.id) === String(id));
    if (index !== -1) {
        wallets[index] = { ...wallets[index], ...updates };
        await saveWallets(wallets);
        await logActivity('EDIT', 'WALLETS', `Updated wallet: ${wallets[index].bankAddress}`);
        return wallets[index];
    }
    return null;
};

// --- APP CONFIG (Version Check) ---
export const getAppConfig = async () => {
    // 1. Try Supabase Cloud first
    if (supabase) {
        const { data, error } = await supabase
            .from('app_config')
            .select('*')
            .eq('id', 'main')
            .single();
        if (!error && data) return data;
    }

    // 2. Fallback to Express API
    try {
        const response = await fetch(`${API_URL}/app_config`);
        if (response.ok) {
            const data = await response.json();
            // Express API returns array, we want single object
            return Array.isArray(data) ? data.find(c => c.id === 'main') : data;
        }
    } catch {
        console.warn('Failed to fetch app config locally');
    }

    return { latest_version: '1.0.0', apk_url: '' };
};

export const saveAppConfig = (config) => postData('app_config', { ...config, id: 'main' });

// --- CHEQUE TEMPLATES ---
export const getChequeTemplates = () => fetchData('cheque_templates');
export const saveChequeTemplates = (templates) => postData('cheque_templates', templates);

export const addChequeTemplate = async (template) => {
    const templates = await getChequeTemplates();
    const newTemplate = {
        ...template,
        id: template.id || template.name // Use name as ID if no unique ID provided
    };
    // Ensure we don't have duplicates
    const filtered = templates.filter(t => t.id !== newTemplate.id);
    filtered.push(newTemplate);
    await saveChequeTemplates(filtered);
    await logActivity('ADD', 'CHEQUE_TEMPLATES', `Added/updated cheque template: ${newTemplate.id}`);
    return newTemplate;
};

export const deleteChequeTemplate = async (id) => {
    const templates = await getChequeTemplates();
    const filtered = templates.filter(t => t.id !== id);
    await saveChequeTemplates(filtered);
    await deleteSupabaseRow('cheque_templates', id);
    await logActivity('DELETE', 'CHEQUE_TEMPLATES', `Deleted cheque template: ${id}`);
};

// --- ACTIVITY LOGS ---
export const getAppLogs = async () => {
    // Try Supabase first
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('app_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);
            if (!error && data && data.length > 0) return data;
        } catch (e) {
            console.warn('Supabase app_logs query failed, falling back to local:', e);
        }
    }
    // Local fallback
    if (window.electronAPI) {
        try {
            const localLogs = await window.electronAPI.readDatabase('app_logs') || [];
            return localLogs.slice(0, 500);
        } catch (e) {
            console.warn('Local logs read failed:', e);
        }
    }
    return [];
};

// --- COMMISSION SETTINGS ---
export const getCommissionSettings = async () => {
    try {
        const raw = await fetchData('commission_settings');
        if (raw && raw.length > 0) return raw[0];
    } catch (e) { /* fallback */ }
    return { id: 'main', defaultRate: 3, activationThreshold: 8, brokerStartCode: 90000, brokerCodeStep: 1000 };
};

export const saveCommissionSettings = async (settings) => {
    const data = { ...settings, id: 'main' };
    await postData('commission_settings', [data]);
    await logActivity('EDIT', 'COMMISSION_SETTINGS', `Updated commission settings: Rate ${settings.defaultRate}%, Threshold ${settings.activationThreshold}%`);
    return data;
};

// --- BROKERS ---
export const getBrokers = async () => {
    const raw = await fetchData('brokers');
    return (raw || []).map(mapBrokerFromDB);
};

export const saveBrokers = (data) => {
    const dbData = data.map(mapBrokerToDB);
    return postData('brokers', data, dbData);
};

export const getNextBrokerCode = async () => {
    const [brokers, settings] = await Promise.all([getBrokers(), getCommissionSettings()]);
    const startCode = settings.brokerStartCode || 90000;
    const step = settings.brokerCodeStep || 1000;
    if (brokers.length === 0) return String(startCode);
    const existingCodes = brokers.map(b => Number(b.id)).filter(n => !isNaN(n));
    let nextCode = startCode;
    while (existingCodes.includes(nextCode)) {
        nextCode += step;
    }
    return String(nextCode);
};

export const getNextAgentCode = async (brokerId) => {
    const sales = await getSales();
    const brokerNum = Number(brokerId);
    const step = 1000; // agents range within broker: brokerId+1 to brokerId+999
    const agentsUnderBroker = sales
        .filter(s => String(s.brokerId) === String(brokerId))
        .map(s => Number(s.id))
        .filter(n => !isNaN(n));
    let nextCode = brokerNum + 1;
    while (agentsUnderBroker.includes(nextCode) && nextCode < brokerNum + step) {
        nextCode++;
    }
    return String(nextCode);
};

export const addBroker = async (broker) => {
    const brokers = await getBrokers();
    // Validate unique code
    if (brokers.some(b => String(b.id) === String(broker.id))) {
        throw new Error(`Broker code ${broker.id} already exists.`);
    }
    const settings = await getCommissionSettings();
    const newBroker = {
        ...broker,
        id: String(broker.id),
        commissionRate: broker.commissionRate !== undefined ? broker.commissionRate : settings.defaultRate,
        type: 'broker',
        createdAt: new Date().toISOString()
    };
    brokers.push(newBroker);
    await saveBrokers(brokers);
    await logActivity('ADD', 'BROKERS', `Added broker company: ${newBroker.name} (Code: ${newBroker.id})`);
    return newBroker;
};

export const updateBroker = async (id, updates) => {
    const brokers = await getBrokers();
    const index = brokers.findIndex(b => String(b.id) === String(id));
    if (index !== -1) {
        brokers[index] = { ...brokers[index], ...updates };
        await saveBrokers(brokers);
        await logActivity('EDIT', 'BROKERS', `Updated broker: ${brokers[index].name}`);
        return brokers[index];
    }
    return null;
};

export const deleteBroker = async (id) => {
    const [brokers, sales] = await Promise.all([getBrokers(), getSales()]);
    const broker = brokers.find(b => String(b.id) === String(id));
    // Check if broker has agents
    const agentsUnder = sales.filter(s => String(s.brokerId) === String(id));
    if (agentsUnder.length > 0) {
        throw new Error(`Cannot delete broker ${broker?.name || id}: ${agentsUnder.length} agents still assigned. Remove agents first.`);
    }
    const filtered = brokers.filter(b => String(b.id) !== String(id));
    await saveBrokers(filtered);
    await deleteSupabaseRow('brokers', id);
    await logActivity('DELETE', 'BROKERS', `Deleted broker: ${broker?.name || id}`);
};

// --- COMMISSIONS ---
export const getCommissions = async () => {
    const raw = await fetchData('commissions');
    return (raw || []).map(mapCommissionFromDB);
};

export const saveCommissions = (data) => {
    const dbData = data.map(mapCommissionToDB);
    return postData('commissions', data, dbData);
};

export const addCommission = async (commission) => {
    const commissions = await getCommissions();
    const newCommission = {
        ...commission,
        id: commission.id || 'COM-' + Date.now(),
        payments: [],
        totalPaid: 0,
        status: 'pending',
        activatedAt: new Date().toISOString().split('T')[0]
    };
    commissions.push(newCommission);
    await saveCommissions(commissions);
    await logActivity('ADD', 'COMMISSIONS', `Commission activated for contract ${commission.contractId} - Agent: ${commission.salesName} - Amount: ${commission.commissionAmount}`);
    return newCommission;
};

export const deleteCommission = async (commissionId) => {
    const commissions = await getCommissions();
    const comm = commissions.find(c => c.id === commissionId);
    const filtered = commissions.filter(c => c.id !== commissionId);
    await saveCommissions(filtered);
    await logActivity('DELETE', 'COMMISSIONS', `Deleted commission ${commissionId} - Agent: ${comm?.salesName || commissionId}`);
};

export const updateCommission = async (commissionId, updates) => {
    const commissions = await getCommissions();
    const index = commissions.findIndex(c => c.id === commissionId);
    if (index === -1) throw new Error('Commission not found');
    commissions[index] = { ...commissions[index], ...updates };
    await saveCommissions(commissions);
    await logActivity('EDIT', 'COMMISSIONS', `Updated commission ${commissionId} - ${JSON.stringify(updates).slice(0, 100)}`);
    return commissions[index];
};

export const addCommissionPayment = async (commissionId, payment) => {
    const commissions = await getCommissions();
    const index = commissions.findIndex(c => c.id === commissionId);
    if (index === -1) throw new Error('Commission not found.');

    const newPayment = {
        id: 'CPAY-' + Date.now(),
        amount: Number(payment.amount) || 0,
        date: payment.date || new Date().toISOString().split('T')[0],
        paymentMethod: payment.paymentMethod || 'CASH',
        notes: payment.notes || '',
        bank: payment.bank || '',
        chequeNumber: payment.chequeNumber || '',
        chequeDate: payment.chequeDate || ''
    };

    commissions[index].payments.push(newPayment);
    commissions[index].totalPaid = commissions[index].payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const remaining = commissions[index].commissionAmount - commissions[index].totalPaid;
    commissions[index].status = remaining <= 1 ? 'paid' : commissions[index].totalPaid > 0 ? 'partial' : 'pending';

    await saveCommissions(commissions);
    await logActivity('PAYMENT', 'COMMISSIONS', `Paid ${newPayment.amount} (${newPayment.paymentMethod}) to commission ${commissionId} - Total Paid: ${commissions[index].totalPaid}/${commissions[index].commissionAmount}`);
    return commissions[index];
};

export const deleteCommissionPayment = async (commissionId, paymentId) => {
    const commissions = await getCommissions();
    const index = commissions.findIndex(c => c.id === commissionId);
    if (index === -1) throw new Error('Commission not found.');

    commissions[index].payments = commissions[index].payments.filter(p => p.id !== paymentId);
    commissions[index].totalPaid = commissions[index].payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const remaining = commissions[index].commissionAmount - commissions[index].totalPaid;
    commissions[index].status = remaining <= 1 ? 'paid' : commissions[index].totalPaid > 0 ? 'partial' : 'pending';

    await saveCommissions(commissions);
    await logActivity('DELETE', 'COMMISSIONS', `Deleted payment ${paymentId} from commission ${commissionId}`);
    return commissions[index];
};

export const updateCommissionPayment = async (commissionId, paymentId, updates) => {
    const commissions = await getCommissions();
    const index = commissions.findIndex(c => c.id === commissionId);
    if (index === -1) throw new Error('Commission not found.');

    const pIndex = commissions[index].payments.findIndex(p => p.id === paymentId);
    if (pIndex === -1) throw new Error('Payment not found.');

    commissions[index].payments[pIndex] = { ...commissions[index].payments[pIndex], ...updates };
    commissions[index].totalPaid = commissions[index].payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const remaining = commissions[index].commissionAmount - commissions[index].totalPaid;
    commissions[index].status = remaining <= 1 ? 'paid' : commissions[index].totalPaid > 0 ? 'partial' : 'pending';

    await saveCommissions(commissions);
    await logActivity('EDIT', 'COMMISSIONS', `Updated payment ${paymentId} on commission ${commissionId}`);
    return commissions[index];
};

// --- COMMISSION ENGINE: Check and auto-activate ---
export const checkAndActivateCommission = async (contractId) => {
    const [contracts, installments, commissions, sales, brokers, settings] = await Promise.all([
        getContracts(), getInstallments(), getCommissions(), getSales(), getBrokers(), getCommissionSettings()
    ]);

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return null;
    if (!contract.salesId) return null; // No sales agent assigned

    // Check if commission already exists for this contract
    const existing = commissions.find(c => c.contractId === contractId);
    if (existing) return existing; // Already activated

    const totalPrice = Number(contract.totalPrice) || 0;
    if (totalPrice <= 0) return null;

    // Calculate total payments received on this contract
    const contractInstallments = installments.filter(ins => {
        const matchByContract = ins.contractId && String(ins.contractId).trim() === String(contractId).trim();
        const matchByUnit = String(ins.unitId || '').trim().toLowerCase() === String(contract.unitId || '').trim().toLowerCase() &&
            String(ins.customerName || '').trim().toLowerCase() === String(contract.customerName || '').trim().toLowerCase();
        return matchByContract || matchByUnit;
    });

    const totalPaid = contractInstallments.reduce((sum, ins) => sum + (Number(ins.paidAmount) || 0), 0);
    const threshold = (settings.activationThreshold || 8) / 100;

    if (totalPaid / totalPrice < threshold) return null; // Below threshold

    // Get commission rate: agent rate → broker rate → default setting
    const agent = sales.find(s => String(s.id).trim() === String(contract.salesId).trim());
    let commissionRate = settings.defaultRate || 3;
    if (agent) {
        if (agent.commissionRate !== null && agent.commissionRate !== undefined) {
            commissionRate = Number(agent.commissionRate);
        } else if (agent.brokerId) {
            const broker = brokers.find(b => String(b.id) === String(agent.brokerId));
            if (broker) commissionRate = Number(broker.commissionRate);
        }
    }

    const commissionAmount = Math.round(totalPrice * commissionRate / 100);
    const newCommission = await addCommission({
        contractId,
        unitId: contract.unitId,
        buildingId: contract.buildingId || '',
        customerId: contract.customerId || '',
        customerName: contract.customerName || '',
        salesId: contract.salesId,
        salesName: agent?.name || contract.salesId,
        brokerId: agent?.brokerId || '',
        totalContractPrice: totalPrice,
        commissionRate,
        commissionAmount
    });

    return newCommission;
};
