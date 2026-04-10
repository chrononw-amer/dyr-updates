import { supabase } from './supabase';
import { version as PKG_VERSION } from '../../package.json';

const SESSION_TABLE = 'app_sessions';

// --- External IP & Location (fetched once per session) ---
let cachedExternalIP = null;
let cachedLocation = null;

export const getExternalIP = async () => {
    if (cachedExternalIP) return cachedExternalIP;
    try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        cachedExternalIP = data.ip || null;
        return cachedExternalIP;
    } catch (e) {
        console.warn('[SessionService] External IP fetch failed:', e.message);
        return null;
    }
};

export const getLocationFromIP = async (ip) => {
    if (cachedLocation) return cachedLocation;
    if (!ip) return null;
    try {
        const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data && data.city) {
            cachedLocation = `${data.city}, ${data.country_name || data.country}`;
            return cachedLocation;
        }
        return null;
    } catch (e) {
        console.warn('[SessionService] Location fetch failed:', e.message);
        return null;
    }
};

// --- Device Type Detection ---
export const detectDeviceType = () => {
    if (window.electronAPI) return 'pc';
    const isNativeMobile = window.Capacitor && window.Capacitor.isNativePlatform();
    if (isNativeMobile) return 'android';
    return 'web';
};

// --- Generate persistent device ID for Web/Mobile ---
export const getDeviceId = () => {
    const deviceType = detectDeviceType();

    if (deviceType === 'pc') {
        // Electron provides real MAC via getSystemInfo — handled externally
        return null; // Will be set from systemInfo
    }

    if (deviceType === 'android') {
        let mockId = localStorage.getItem('dyr_mobile_id');
        if (!mockId) {
            mockId = 'MOB-' + Math.random().toString(36).substring(2, 11).toUpperCase();
            localStorage.setItem('dyr_mobile_id', mockId);
        }
        return mockId;
    }

    // Web browser
    let webId = localStorage.getItem('dyr_web_id');
    if (!webId) {
        webId = 'WEB-' + Math.random().toString(36).substring(2, 11).toUpperCase();
        localStorage.setItem('dyr_web_id', webId);
    }
    return webId;
};

// --- Register Session ---
export const registerSession = async (systemInfo, appVersion = PKG_VERSION, extraData = {}) => {
    if (!supabase) return;

    try {
        const uniqueId = systemInfo.mac || systemInfo.ip;
        const macLower = (systemInfo.mac || '').toLowerCase();
        // Allow MOB- and WEB- prefixed IDs
        const isMockId = macLower.startsWith('mob-') || macLower.startsWith('web-');
        if (!isMockId && (!macLower || macLower === 'unknown mac' || macLower === '00:00:00:00:00:00')) {
            console.warn('[SessionService] Skipping registration — no valid MAC address');
            return;
        }

        const deviceType = detectDeviceType();
        const extIP = await getExternalIP();
        const location = await getLocationFromIP(extIP);

        const sessionData = {
            pc_name: systemInfo.hostname || (deviceType === 'android' ? 'Android Device' : deviceType === 'web' ? 'Web Browser' : 'Unknown PC'),
            user_name: systemInfo.username || 'Unknown User',
            ip_address: systemInfo.ip || 'Unknown IP',
            mac_address: (systemInfo.mac || '').toLowerCase(),
            platform: systemInfo.platform || deviceType,
            last_active: new Date().toISOString(),
            app_version: appVersion,
            session_status: 'online',
            device_type: deviceType,
            external_ip: extIP,
            location: location,
            ...extraData
        };

        const { error } = await supabase
            .from(SESSION_TABLE)
            .upsert(sessionData, { onConflict: 'mac_address' });

        if (error) throw error;

    } catch (error) {
        console.error("Error registering session:", error);
    }
};

// --- Send Heartbeat (every 10s) ---
export const sendHeartbeat = async (macAddress, currentTab = null) => {
    if (!supabase || !macAddress) return null;
    try {
        const macLower = macAddress.toLowerCase();
        const updateData = {
            last_active: new Date().toISOString(),
            session_status: 'online'
        };
        if (currentTab) updateData.current_tab = currentTab;

        // Single query: Update ONLY if session is NOT logged_out, then read
        const { data: updated } = await supabase
            .from(SESSION_TABLE)
            .update(updateData)
            .eq('mac_address', macLower)
            .neq('session_status', 'logged_out')
            .select('status, valid_until, command, id, update_url, session_status, access_expires, logged_in_user')
            .maybeSingle();

        // If update returned data, session is active
        if (updated) return updated;

        // If no rows updated, session might be logged_out — just read it
        const { data: current } = await supabase
            .from(SESSION_TABLE)
            .select('status, valid_until, command, id, update_url, session_status, access_expires, logged_in_user')
            .eq('mac_address', macLower)
            .single();
        return current;
    } catch (e) {
        try {
            const { data } = await supabase
                .from(SESSION_TABLE)
                .select('status, valid_until, command, id, update_url, session_status, access_expires, logged_in_user')
                .eq('mac_address', macAddress.toLowerCase())
                .single();
            return data;
        } catch (inner) {
            return null;
        }
    }
};

// --- Update Current Tab (lightweight, called on every tab switch) ---
export const updateSessionTab = async (macAddress, tabName) => {
    if (!supabase || !macAddress) return;
    try {
        await supabase
            .from(SESSION_TABLE)
            .update({ current_tab: tabName, last_active: new Date().toISOString() })
            .eq('mac_address', macAddress.toLowerCase());
    } catch (e) {
        console.warn('[SessionService] Tab update failed:', e.message);
    }
};

// --- Update User Info on Login ---
export const updateSessionUserInfo = async (macAddress, userInfo) => {
    if (!supabase || !macAddress) return;
    try {
        const { error } = await supabase
            .from(SESSION_TABLE)
            .update({
                logged_in_user: userInfo.name,
                user_role: userInfo.role || userInfo.rank,
                user_company: userInfo.company,
                user_permissions: userInfo.permissions,
                login_time: new Date().toISOString(),
                user_name: userInfo.name // Also update the legacy field
            })
            .eq('mac_address', macAddress.toLowerCase());

        if (error) throw error;
    } catch (e) {
        console.error('[SessionService] User info update failed:', e);
    }
};

// --- Update Host Status ---
export const updateSessionHostStatus = async (macAddress, isHost) => {
    if (!supabase || !macAddress) return;
    try {
        await supabase
            .from(SESSION_TABLE)
            .update({ is_host: isHost })
            .eq('mac_address', macAddress.toLowerCase());
    } catch (e) {
        console.warn('[SessionService] Host status update failed:', e.message);
    }
};

// --- Clear User Info on Logout ---
export const clearSessionUserInfo = async (macAddress) => {
    if (!supabase || !macAddress) return;
    try {
        await supabase
            .from(SESSION_TABLE)
            .update({
                logged_in_user: null,
                user_role: null,
                user_company: null,
                user_permissions: null,
                login_time: null,
                current_tab: null,
                session_status: 'offline'
            })
            .eq('mac_address', macAddress.toLowerCase());
    } catch (e) {
        console.warn('[SessionService] Session clear failed:', e.message);
    }
};

// --- Single Session Enforcement: Kick all other sessions for this user ---
export const kickOtherSessions = async (userName, currentMac) => {
    if (!supabase || !userName || !currentMac) return;
    try {
        // Mark all OTHER sessions with the same logged_in_user as kicked
        const { error } = await supabase
            .from(SESSION_TABLE)
            .update({ session_status: 'logged_out' })
            .eq('logged_in_user', userName)
            .neq('mac_address', currentMac.toLowerCase());

        if (error) console.warn('[SessionService] Kick other sessions error:', error);
    } catch (e) {
        console.error('[SessionService] Kick other sessions failed:', e);
    }
};

// --- Access Duration: Set expiry on user ---
export const setUserAccessDuration = async (userId, duration) => {
    if (!supabase || !userId) return;

    let expiresAt = null;
    const now = new Date();

    const durationMap = {
        '1d': 1, '3d': 3, '7d': 7, '15d': 15,
        '1m': 30, '3m': 90, '6m': 180, '1y': 365,
        'permanent': null
    };

    if (duration !== 'permanent' && durationMap[duration] !== undefined) {
        const days = durationMap[duration];
        expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
        // Update app_users table
        const { error: userError } = await supabase
            .from('app_users')
            .update({ access_expires: expiresAt, access_duration: duration })
            .eq('id', userId);

        if (userError) throw userError;

        // Also update all active sessions for this user
        const { data: user } = await supabase
            .from('app_users')
            .select('name')
            .eq('id', userId)
            .single();

        if (user && user.name) {
            await supabase
                .from(SESSION_TABLE)
                .update({ access_expires: expiresAt })
                .eq('logged_in_user', user.name);
        }

        return { success: true, expiresAt };
    } catch (e) {
        console.error('[SessionService] Set access duration failed:', e);
        return { success: false, error: e.message };
    }
};

// --- Get Active Sessions (enhanced with all new fields) ---
export const getActiveSessions = async () => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from(SESSION_TABLE)
            .select('*')
            .order('last_active', { ascending: false });

        if (error) throw error;
        return data.map(s => ({
            ...s,
            isOnline: new Date(s.last_active) > new Date(Date.now() - 2 * 60 * 1000)
        }));
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return [];
    }
};

export const clearCommand = async (id) => {
    if (!supabase || !id) return;
    await supabase.from(SESSION_TABLE).update({ command: null }).eq('id', id);
};

export const updateBackupUrl = async (id, url) => {
    if (!supabase || !id) return;
    await supabase.from(SESSION_TABLE).update({ backup_url: url }).eq('id', id);
};

export const requestUpdate = async (macAddress) => {
    if (!supabase || !macAddress) return;
    return await supabase.from(SESSION_TABLE).update({ update_requested: true }).eq('mac_address', macAddress);
};

export const pushUpdate = async (sessionId, updateUrl) => {
    if (!supabase || !sessionId) return;
    return await supabase.from(SESSION_TABLE).update({
        command: 'UPDATE',
        update_url: updateUrl,
        update_requested: false
    }).eq('id', sessionId);
};

export const updateSessionStatus = async (macAddress, status) => {
    if (!supabase || !macAddress) return;
    return await supabase
        .from(SESSION_TABLE)
        .update({ session_status: status })
        .eq('mac_address', macAddress.toLowerCase());
};
