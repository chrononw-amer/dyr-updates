// DYR Express Server — LAN Database Server with Connection Approval
// New clients must be APPROVED by the host before accessing data.
// Approved/blocked list persists to disk.

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3001;

// ─── Exported start function (used by Electron main process) ───
function startServer(dbFolderOverride) {
    const DB_FOLDER = dbFolderOverride || getDBFolderFromArgs();
    const CLIENTS_FILE = path.join(DB_FOLDER, '_server_clients.json');

    const expressApp = express();

    // ─── CLIENT MANAGEMENT ───
    let clients = {};
    let totalRequests = 0;

    const saveClients = () => {
        try {
            fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf8');
        } catch (e) { console.error('Failed to save clients:', e); }
    };

    const loadClients = () => {
        try {
            if (fs.existsSync(CLIENTS_FILE)) {
                clients = JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
                console.log(`[DYR Server] Loaded ${Object.keys(clients).length} saved client(s).`);
            }
        } catch (e) { console.error('Failed to load clients:', e); }
    };

    const getClientIP = (req) => {
        const forwarded = req.headers['x-forwarded-for'];
        const socketIP = req.socket?.remoteAddress || '';
        const raw = forwarded || socketIP || 'unknown';
        return raw.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1').trim();
    };

    const isLocalRequest = (ip) => {
        return ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0';
    };

    // Write-lock mechanism
    const writeLocks = new Map();
    const acquireLock = (entity) => {
        return new Promise((resolve) => {
            const check = () => {
                if (!writeLocks.get(entity)) {
                    writeLocks.set(entity, true);
                    resolve();
                } else {
                    setTimeout(check, 10);
                }
            };
            check();
        });
    };
    const releaseLock = (entity) => {
        writeLocks.set(entity, false);
    };

    expressApp.use(cors());
    expressApp.use(express.json({ limit: '50mb' }));

    // ─── MAIN MIDDLEWARE: Track + Gate clients ───
    expressApp.use((req, res, next) => {
        if (!fs.existsSync(DB_FOLDER)) {
            fs.mkdirSync(DB_FOLDER, { recursive: true });
        }

        const ip = getClientIP(req);
        totalRequests++;

        // Always allow localhost (the host's app + admin endpoints)
        if (isLocalRequest(ip)) {
            return next();
        }

        const clientName = req.headers['x-client-name'] || 'Unknown PC';
        const clientUsername = req.headers['x-client-username'] || '';
        const clientCompany = req.headers['x-client-company'] || '';
        const clientMac = req.headers['x-client-mac'] || '';
        const clientExternalIp = req.headers['x-client-external-ip'] || '';

        // New client? Add as PENDING
        if (!clients[ip]) {
            clients[ip] = {
                name: clientName,
                username: clientUsername,
                company: clientCompany,
                mac: clientMac,
                externalIp: clientExternalIp,
                status: 'pending',
                requests: 0,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            saveClients();
            console.log(`[DYR Server] 🆕 New connection from ${clientName} (${ip}) — PENDING approval`);
        }

        clients[ip].lastSeen = new Date().toISOString();
        clients[ip].requests = (clients[ip].requests || 0) + 1;
        if (clientName !== 'Unknown PC') clients[ip].name = clientName;
        // Update metadata fields each request (they may change, e.g. user logs in)
        if (clientUsername) clients[ip].username = clientUsername;
        if (clientCompany) clients[ip].company = clientCompany;
        if (clientMac) clients[ip].mac = clientMac;
        if (clientExternalIp) clients[ip].externalIp = clientExternalIp;

        const status = clients[ip].status;

        if (status === 'blocked') {
            return res.status(403).json({
                error: 'ACCESS_DENIED',
                clientStatus: 'blocked',
                message: 'Your access has been suspended by the administrator.'
            });
        }

        if (status === 'pending') {
            return res.status(403).json({
                error: 'PENDING_APPROVAL',
                clientStatus: 'pending',
                message: 'Waiting for the host to approve your connection.'
            });
        }

        next();
    });

    // ─── ADMIN ENDPOINTS (localhost only) ───

    expressApp.get('/api/health', (req, res) => {
        const nets = os.networkInterfaces();
        let hostIp = '0.0.0.0';
        let hostMac = '00:00:00:00:00:00';
        for (const name of Object.keys(nets)) {
            for (const netInfo of nets[name]) {
                if ((netInfo.family === 'IPv4' || netInfo.family === 4) && !netInfo.internal) {
                    const lowerName = name.toLowerCase();
                    if (lowerName.includes('ethernet') || lowerName.includes('wi-fi') || lowerName.includes('wireless')) {
                        hostIp = netInfo.address;
                        hostMac = netInfo.mac;
                    } else if (hostIp === '0.0.0.0') {
                        hostIp = netInfo.address;
                        hostMac = netInfo.mac;
                    }
                }
            }
        }

        const clientList = Object.entries(clients).map(([clientIP, info]) => ({
            ip: clientIP,
            name: info.name || 'Unknown PC',
            username: info.username || '',
            company: info.company || '',
            mac: info.mac || '',
            externalIp: info.externalIp || '',
            status: info.status,
            requests: info.requests || 0,
            firstSeen: info.firstSeen,
            lastSeen: info.lastSeen
        }));

        const pending = clientList.filter(c => c.status === 'pending').length;
        const approved = clientList.filter(c => c.status === 'approved').length;
        const blocked = clientList.filter(c => c.status === 'blocked').length;

        res.json({
            status: 'ok',
            server: 'DYR Express Server',
            ip: hostIp, port: PORT, dbFolder: DB_FOLDER,
            uptime: process.uptime(),
            totalRequests,
            host: {
                hostname: os.hostname(),
                username: os.userInfo().username,
                platform: os.platform(),
                ip: hostIp,
                mac: hostMac
            },
            clients: clientList,
            summary: { total: clientList.length, pending, approved, blocked },
            timestamp: new Date().toISOString()
        });
    });

    expressApp.post('/api/admin/approve', (req, res) => {
        if (!isLocalRequest(getClientIP(req))) return res.status(403).json({ error: 'Only the host can manage clients.' });
        const { ip } = req.body;
        if (!ip || !clients[ip]) return res.status(400).json({ error: 'Client not found.' });
        clients[ip].status = 'approved';
        saveClients();
        console.log(`[DYR Server] ✅ Approved client: ${clients[ip].name} (${ip})`);
        res.json({ success: true });
    });

    expressApp.post('/api/admin/block', (req, res) => {
        if (!isLocalRequest(getClientIP(req))) return res.status(403).json({ error: 'Only the host can manage clients.' });
        const { ip } = req.body;
        if (!ip || !clients[ip]) return res.status(400).json({ error: 'Client not found.' });
        clients[ip].status = 'blocked';
        saveClients();
        console.log(`[DYR Server] ⛔ Blocked client: ${clients[ip].name} (${ip})`);
        res.json({ success: true });
    });

    expressApp.post('/api/admin/unblock', (req, res) => {
        if (!isLocalRequest(getClientIP(req))) return res.status(403).json({ error: 'Only the host can manage clients.' });
        const { ip } = req.body;
        if (!ip || !clients[ip]) return res.status(400).json({ error: 'Client not found.' });
        clients[ip].status = 'approved';
        saveClients();
        console.log(`[DYR Server] ✅ Unblocked client: ${clients[ip].name} (${ip})`);
        res.json({ success: true });
    });

    expressApp.post('/api/admin/remove', (req, res) => {
        if (!isLocalRequest(getClientIP(req))) return res.status(403).json({ error: 'Only the host can manage clients.' });
        const { ip } = req.body;
        if (ip && clients[ip]) { delete clients[ip]; saveClients(); }
        res.json({ success: true });
    });

    // ─── DATA ENDPOINTS ───

    expressApp.get('/api/:entity', (req, res) => {
        const { entity } = req.params;
        if (entity === 'admin') return res.status(404).json({ error: 'Not found' });
        const filePath = path.join(DB_FOLDER, `${entity}.json`);
        try {
            if (!fs.existsSync(filePath)) return res.json([]);
            const data = fs.readFileSync(filePath, 'utf8');
            res.json(JSON.parse(data));
        } catch (error) {
            console.error(`Error reading ${entity}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    expressApp.post('/api/:entity', async (req, res) => {
        const { entity } = req.params;
        if (entity === 'admin') return res.status(404).json({ error: 'Not found' });
        const data = req.body;
        const filePath = path.join(DB_FOLDER, `${entity}.json`);
        const clientIP = getClientIP(req);
        try {
            await acquireLock(entity);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            releaseLock(entity);
            const who = clients[clientIP]?.name || clientIP;
            console.log(`[DYR Server] ✏️ ${who} wrote to ${entity}`);
            res.json({ success: true });
        } catch (error) {
            releaseLock(entity);
            console.error(`Error writing ${entity}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    // ─── START ───
    loadClients();
    return new Promise((resolve, reject) => {
        const httpServer = expressApp.listen(PORT, '0.0.0.0', () => {
            console.log(`[DYR Server] Running at http://0.0.0.0:${PORT}`);
            console.log(`[DYR Server] Database folder: ${DB_FOLDER}`);
            console.log(`[DYR Server] New connections require host approval.`);
            resolve(httpServer);
        });
        httpServer.on('error', (err) => {
            reject(err);
        });
    });
}

// ─── CLI MODE: Run directly from command line ───
const getDBFolderFromArgs = () => {
    const args = process.argv.slice(2);
    const dbArgIndex = args.indexOf('--db');
    if (dbArgIndex !== -1 && args[dbArgIndex + 1]) {
        return args[dbArgIndex + 1];
    }
    return process.env.DB_PATH || 'C:\\Users\\C0QA\\Downloads\\DATABASE';
};

// If run directly (not required by Electron)
if (require.main === module) {
    startServer().catch(err => {
        console.error('[DYR Server] Failed to start:', err.message);
        process.exit(1);
    });
}

module.exports = { startServer };
