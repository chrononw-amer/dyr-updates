const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL, fileURLToPath } = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const archiver = require('archiver');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

console.log('Main process starting...');
console.log('UserData Path:', app.getPath('userData'));

// Single-instance lock — prevent double launch
// Skip if this is the Express server child process (spawned with --db arg)
const isServerChild = process.argv.some(arg => arg === '--db');
if (!isServerChild) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    console.log('[DYR] Another instance is already running. Quitting.');
    app.quit();
  } else {
    app.on('second-instance', () => {
      // Focus existing window when user tries to open a second instance
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Use app userData folder for portable database storage
// Development: Uses local path for convenience
// Production: Uses %APPDATA%/DYR for proper Windows installation
const getDBFolder = () => {
  // 1. Check for custom overrides
  const configPath = path.join(app.getPath('userData'), 'db-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.path) {
        // Verify the custom path still exists and is accessible
        try {
          fs.accessSync(config.path, fs.constants.R_OK | fs.constants.W_OK);
          return config.path;
        } catch (accessErr) {
          console.error(`[DB CONFIG] Saved path "${config.path}" is NOT accessible: ${accessErr.message}`);
          console.error('[DB CONFIG] Falling back to default path. Data may not load correctly!');
          // Notify renderer about the issue after window is ready
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.once('did-finish-load', () => {
              mainWindow.webContents.send('db-path-error', {
                savedPath: config.path,
                error: accessErr.message
              });
            });
          }
        }
      }
    }
  } catch (e) { console.error('Error reading db-config:', e); }

  // 2. Default paths
  if (app.isPackaged) {
    const dbPath = path.join(app.getPath('userData'), 'database');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
    return dbPath;
  } else {
    // Development: Use possible paths
    const possiblePaths = [
      'C:\\Users\\C0QA\\Downloads\\DATABASE',
      'C:\\Users\\C0QA\\OneDrive\\Desktop\\database',
      path.join(__dirname, '../database')
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    return possiblePaths[1]; // Fallback to original default
  }
};

// Configurable backup folder — defaults to DB_PATH/BACKUPS
const getBackupFolder = () => {
  const configPath = path.join(app.getPath('userData'), 'backup-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.path) {
        try {
          fs.accessSync(config.path, fs.constants.R_OK | fs.constants.W_OK);
          return config.path;
        } catch (accessErr) {
          console.error(`[BACKUP CONFIG] Saved backup path "${config.path}" is NOT accessible: ${accessErr.message}`);
          console.error('[BACKUP CONFIG] Falling back to default backup path inside DB folder.');
        }
      }
    }
  } catch (e) { console.error('Error reading backup-config:', e); }

  // Default: BACKUPS folder inside the database folder
  const defaultPath = path.join(getDBFolder(), 'BACKUPS');
  if (!fs.existsSync(defaultPath)) fs.mkdirSync(defaultPath, { recursive: true });
  return defaultPath;
};

// ...

let mainWindow;

function createWindow() {
  console.log('Creating window...');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.ico'),
    frame: false, // Custom title bar
    show: false, // Start hidden to prevent focus issues on launch
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      plugins: true,
      pdfViewer: true,
      sandbox: false,
      webviewTag: true,
      nodeIntegrationInSubFrames: false,
      webSecurity: false, // Required for dyr-file:// protocol and local file loading
    },
  });

  mainWindow = win;

  // Window control IPC handlers
  ipcMain.handle('window-minimize', () => win.minimize());
  ipcMain.handle('window-maximize', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle('window-close', async () => {
    console.log('App closing, performing final backup...');
    try {
      await performBackup();
    } catch (e) {
      console.error('Final backup failed:', e);
    }
    win.close();
  });

  // External IP Fetching

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    console.log('Loading URL: http://localhost:5173');
    win.loadURL('http://localhost:5173').catch(e => console.error('Failed to load URL:', e));
  } else {
    console.log('Loading file');
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Ensure window is shown and focused when ready
  win.once('ready-to-show', () => {
    win.show();
    win.focus();

    // Workaround for Windows Electron focus bug
    setTimeout(() => {
      win.blur();
      win.focus();
    }, 100);

    if (app.isPackaged) {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (e) {
        console.log('Auto-update check skipped:', e.message);
      }
    }
  });

  // Ensure input focus is transferred to webContents
  win.on('focus', () => {
    win.webContents.focus();
  });

  // Intercept window.open() calls — open external URLs in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Open whatsapp://, tel://, https://, http:// in the OS default app
    if (url.startsWith('whatsapp://') || url.startsWith('tel:') || url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
      return { action: 'deny' }; // Prevent Electron from creating a new window
    }
    // Allow other window.open calls (e.g. print windows) to proceed
    return { action: 'allow' };
  });

  // Check if WhatsApp App is installed on Windows
  ipcMain.handle('check-whatsapp-app', async () => {
    if (process.platform !== 'win32') return true;
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      // 1. Check HKCR (Merged view of HKLM and HKCU)
      exec('reg query "HKEY_CLASSES_ROOT\\whatsapp" /v "URL Protocol"', (err) => {
        if (!err) return resolve(true);

        // 2. Check HKCU Software Classes (Common for per-user installs)
        exec('reg query "HKEY_CURRENT_USER\\Software\\Classes\\whatsapp" /v "URL Protocol"', (err2) => {
          if (!err2) return resolve(true);

          // 3. Fallback: Check for Local AppData installation path (Standalone version)
          try {
            const fs = require('fs');
            const localAppData = process.env.LOCALAPPDATA;
            if (localAppData) {
              const wsPath = path.join(localAppData, 'WhatsApp', 'WhatsApp.exe');
              if (fs.existsSync(wsPath)) return resolve(true);
            }
          } catch (e) { }

          resolve(false);
        });
      });
    });
  });
}

// Register custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'dyr-file', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

app.whenReady().then(() => {
  console.log('App ready');

  // Register local file protocol
  protocol.handle('dyr-file', async (request) => {
    const logFile = path.join(app.getPath('userData'), 'protocol_debug.log');
    try {
      const { url } = request;

      // Extract path from dyr-file://...
      // We want to handle both dyr-file:///C:/path and dyr-file://C:/path
      let urlPath = url.replace(/^dyr-file:\/+/i, '');
      let decodedPath = decodeURIComponent(urlPath);
      let finalPath = decodedPath;

      // Handle Windows drive letters and paths
      // If it starts with a leading slash before a drive letter (e.g., /C:/...), remove it
      if (finalPath.match(/^\/[a-zA-Z][:/]/)) {
        finalPath = finalPath.slice(1);
      }

      // If it starts with a letter followed by a slash but NO colon (e.g., C/Users/...), add the colon
      // This helps if the colon was stripped or encoded weirdly
      if (finalPath.match(/^[a-zA-Z]\//)) {
        finalPath = finalPath[0] + ':' + finalPath.slice(1);
      }

      finalPath = path.normalize(finalPath);

      // Log for debugging (safely)
      try {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Incoming: ${url} -> ${finalPath}\n`);
      } catch (e) { /* ignore log errors to prevent protocol crash */ }

      if (!fs.existsSync(finalPath)) {
        try {
          fs.appendFileSync(logFile, `[${new Date().toISOString()}] NOT FOUND: ${finalPath}\n`);
        } catch (e) { }
        return new Response('File not found', { status: 404 });
      }

      // Use net.fetch with the actual file:// URL
      // We use pathToFileURL to ensure it's a valid file URL for net.fetch
      const fileUrl = pathToFileURL(finalPath).href;
      return net.fetch(fileUrl).then(response => {
        const headers = new Headers(response.headers);

        // Ensure proper content types for images and PDFs
        const ext = path.extname(finalPath).toLowerCase();
        if (ext === '.pdf') {
          headers.set('Content-Type', 'application/pdf');
        } else if (ext === '.png') {
          headers.set('Content-Type', 'image/png');
        } else if (ext === '.jpg' || ext === '.jpeg') {
          headers.set('Content-Type', 'image/jpeg');
        }

        // Disable cache for local protocol to ensure freshness
        headers.set('Cache-Control', 'no-store, must-revalidate');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      });
    } catch (error) {
      console.error('[Protocol] Error:', error);
      try {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ERROR: ${error.message}\n`);
      } catch (e) { }
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window control IPC handlers
ipcMain.handle('app-relaunch', () => {
  app.relaunch();
  app.exit(0);
});

// IPC Handlers
ipcMain.handle('read-database', async (event, entity) => {
  const filePath = path.join(getDBFolder(), `${entity}.json`);
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${entity}:`, error);
    return [];
  }
});

ipcMain.handle('write-database', async (event, entity, data) => {
  const filePath = path.join(getDBFolder(), `${entity}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error(`Error writing ${entity}:`, error);
    return { success: false, error: error.message };
  }
});

// Auto-Updater IPC Handlers
ipcMain.handle('check-for-update', async () => {
  if (!app.isPackaged) return { status: 'dev' };
  try {
    return await autoUpdater.checkForUpdates();
  } catch (e) {
    console.error('Update check failed:', e.message);
    // Send error to renderer so it shows a friendly message
    mainWindow?.webContents.send('update-status', { status: 'error', error: 'Update server is not configured. No update URL available.' });
    return null;
  }
});

ipcMain.handle('download-update', () => {
  return autoUpdater.downloadUpdate();
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

// Database Path Management
ipcMain.handle('select-db-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];

    // Validate the folder is accessible and writable
    try {
      fs.accessSync(newPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (accessErr) {
      throw new Error(`Selected folder is not accessible: ${accessErr.message}`);
    }

    // Test write capability by creating a temp file
    const testFile = path.join(newPath, '.dyr_write_test');
    try {
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
    } catch (writeErr) {
      throw new Error(`Cannot write to selected folder: ${writeErr.message}`);
    }

    // Save to config
    const configPath = path.join(app.getPath('userData'), 'db-config.json');
    try {
      fs.writeFileSync(configPath, JSON.stringify({ path: newPath }), 'utf8');
      return newPath;
    } catch (e) {
      console.error('Failed to save db config:', e);
      throw e;
    }
  }
  return null;
});

ipcMain.handle('get-db-folder', () => {
  return getDBFolder();
});

// Set database path by typing (supports UNC paths like \\192.168.1.30\share\folder)
ipcMain.handle('set-db-path', async (event, inputPath) => {
  if (!inputPath || !inputPath.trim()) return { success: false, error: 'Path is empty' };

  // Normalize the path (handles forward/back slashes)
  let normalizedPath = path.normalize(inputPath.trim());

  try {
    // Try to create the directory if it doesn't exist
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
    }

    // Verify it's accessible by checking if we can list it
    fs.readdirSync(normalizedPath);

    // Verify it's writable by creating a temp file
    const testFile = path.join(normalizedPath, '.dyr_write_test');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);

    // Save to config
    const configPath = path.join(app.getPath('userData'), 'db-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ path: normalizedPath }), 'utf8');

    return { success: true, path: normalizedPath };
  } catch (e) {
    console.error('Failed to set DB path:', e);
    return { success: false, error: e.message };
  }
});

// Verify a path is accessible without saving it (used by frontend to pre-check)
ipcMain.handle('verify-db-path', async (event, inputPath) => {
  if (!inputPath || !inputPath.trim()) return { accessible: false, error: 'Path is empty' };
  const normalizedPath = path.normalize(inputPath.trim());
  try {
    if (!fs.existsSync(normalizedPath)) {
      return { accessible: false, error: 'Path does not exist', canCreate: true };
    }
    fs.accessSync(normalizedPath, fs.constants.R_OK | fs.constants.W_OK);
    // Check if it has any JSON data files
    const files = fs.readdirSync(normalizedPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    return { accessible: true, path: normalizedPath, hasData: jsonFiles.length > 0, files: jsonFiles };
  } catch (e) {
    return { accessible: false, error: e.message };
  }
});

ipcMain.handle('get-unit-layout', async (event, unitId) => {
  if (!unitId) return null;
  const dbPath = getDBFolder();
  const layoutsPath = path.join(dbPath, 'LAYOUTS');

  // Supported extensions
  const extensions = ['.png', '.jpg', '.jpeg'];

  try {
    for (const ext of extensions) {
      const filePath = path.join(layoutsPath, `${unitId}${ext}`);
      if (fs.existsSync(filePath)) {
        const fileUrl = pathToFileURL(filePath).href;

        return fileUrl.replace(/^file:\/+/i, 'dyr-file:///');
      }
    }
    return null;
  } catch (error) {
    console.error(`Error reading layout for ${unitId}:`, error);
    return null;
  }
});

// ZIP Database Folder for Backup
ipcMain.handle('backup-database', async () => {
  const dbPath = getDBFolder();
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('error', err => reject(err));
    archive.on('end', () => {
      const result = Buffer.concat(chunks);
      resolve(result.toString('base64'));
    });

    archive.directory(dbPath, false); // Add db folder contents to root of zip
    archive.finalize();
  });
});

// System Info for Admin
ipcMain.handle('get-system-info', () => {
  const nets = os.networkInterfaces();
  const results = {};
  let ip = '0.0.0.0';
  let mac = '00:00:00:00:00:00';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);

        // Prioritize known physical interfaces
        const lowerName = name.toLowerCase();
        if ((lowerName.includes('ethernet') || lowerName.includes('wi-fi') || lowerName.includes('wireless')) && !lowerName.includes('virtual')) {
          ip = net.address;
          mac = net.mac;
        } else if (ip === '0.0.0.0') {
          // Fallback if no specific physical interface found yet
          ip = net.address;
          mac = net.mac;
        }
      }
    }
  }

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    ip: ip,
    mac: mac,
    username: os.userInfo().username
  };
});

// Get Available Printers
// Get Available Printers
ipcMain.handle('get-printers', async () => {
  try {
    const printers = await mainWindow?.webContents.getPrintersAsync();
    return printers || [];
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
});

// Direct Print to Printer
ipcMain.handle('direct-print', async (event, html, printerName, options) => {
  return new Promise((resolve) => {
    try {
      // Use temp file for reliability
      const tempPath = path.join(app.getPath('temp'), `print_${Date.now()}.html`);
      fs.writeFileSync(tempPath, html);

      const widthMm = (options?.width || 175000) / 1000;
      const heightMm = (options?.height || 85000) / 1000;

      const printWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1200,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      printWindow.loadURL(`file://${tempPath}`);

      printWindow.webContents.on('did-finish-load', () => {
        // Force zoom limits to prevent automatic scaling
        printWindow.webContents.setVisualZoomLevelLimits(1, 1);

        printWindow.webContents.print({
          silent: true,
          printBackground: true,
          deviceName: printerName || undefined,
          margins: { marginType: 'none' },
          pageSize: 'A4', // Standardize to A4 as requested to avoid custom size centering/offset issues
          landscape: true, // Cheques are almost always printed landscape relative to A4 feed
          color: true
        }, (success, failureReason) => {
          printWindow.close();
          try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) { }
          console.log(`Print to A4 Standard: [${printerName || 'Default'}], Success: ${success}, Error: ${failureReason || 'None'}`);
          resolve({ success, error: failureReason });
        });
      });

      printWindow.webContents.on('did-fail-load', (e, code, desc) => {
        printWindow.close();
        console.error('Failed to load print HTML:', desc);
        resolve({ success: false, error: desc });
      });

    } catch (error) {
      console.error('Direct print error:', error);
      resolve({ success: false, error: error.message });
    }
  });
});

// Print PDF natively through Electron
ipcMain.handle('print-pdf', async (event, pdfBuffer, options) => {
  return new Promise((resolve) => {
    try {
      const tempPath = path.join(app.getPath('temp'), `print_${Date.now()}.pdf`);
      fs.writeFileSync(tempPath, Buffer.from(pdfBuffer));

      const printWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 1100,
        webPreferences: {
          plugins: true,
          pdfViewer: true,
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      printWindow.loadURL(`file://${tempPath}`);

      printWindow.webContents.on('did-finish-load', () => {
        // Wait for PDF to fully render
        setTimeout(() => {
          printWindow.webContents.print({
            silent: false,
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: 'A4',
            scaleFactor: 100
          }, (success, failureReason) => {
            printWindow.close();
            try { fs.unlinkSync(tempPath); } catch(e) {}
            resolve({ success, error: failureReason });
          });
        }, 1000);
      });

      printWindow.webContents.on('did-fail-load', () => {
        printWindow.close();
        try { fs.unlinkSync(tempPath); } catch(e) {}
        resolve({ success: false, error: 'Failed to load PDF' });
      });
    } catch (error) {
      console.error('Print PDF error:', error);
      resolve({ success: false, error: error.message });
    }
  });
});

// Forward Auto-Updater events to renderer
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-status', { status: 'available', info });
});

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents.send('update-status', { status: 'not-available', info });
});

autoUpdater.on('error', (err) => {
  // Show a clean message instead of raw HTTP error dumps
  let friendlyError = err.message;
  if (err.message && (err.message.includes('example.com') || err.message.includes('404') || err.message.includes('Cannot find channel'))) {
    friendlyError = 'Update server is not configured. Contact your administrator to set up auto-updates.';
  }
  mainWindow?.webContents.send('update-status', { status: 'error', error: friendlyError });
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-status', { status: 'downloaded', info });
});

// --- HELPER: PERFORM DB BACKUP ---
async function performBackup() {
  const dbPath = getDBFolder();
  const backupsDir = getBackupFolder();
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipPath = path.join(backupsDir, `DYR_DB_${timestamp}.zip`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Backup completed: ${zipPath} (${archive.pointer()} total bytes)`);
      resolve(zipPath);
    });

    archive.on('error', err => reject(err));
    archive.pipe(output);
    archive.directory(dbPath, false, (entry) => {
      // Don't backup the BACKUPS folder itself to avoid recursion
      if (entry.name && entry.name.startsWith('BACKUPS')) return false;
      return entry;
    });
    archive.finalize();
  });
}

// Start hourly backup timer
setInterval(() => {
  console.log('Hourly backup triggered...');
  performBackup().catch(e => console.error('Hourly backup failed:', e));
}, 60 * 60 * 1000);

// Backup Path Management
ipcMain.handle('get-backup-folder', () => {
  return getBackupFolder();
});

ipcMain.handle('set-backup-path', async (event, inputPath) => {
  if (!inputPath || !inputPath.trim()) return { success: false, error: 'Path is empty' };

  let normalizedPath = path.normalize(inputPath.trim());

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
    }

    // Verify readable
    fs.readdirSync(normalizedPath);

    // Verify writable
    const testFile = path.join(normalizedPath, '.dyr_backup_write_test');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);

    // Save to config
    const configPath = path.join(app.getPath('userData'), 'backup-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ path: normalizedPath }), 'utf8');

    return { success: true, path: normalizedPath };
  } catch (e) {
    console.error('Failed to set backup path:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('select-backup-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Backup Folder',
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];

    // Validate writable
    try {
      fs.accessSync(newPath, fs.constants.R_OK | fs.constants.W_OK);
      const testFile = path.join(newPath, '.dyr_backup_write_test');
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
    } catch (err) {
      throw new Error(`Selected folder is not writable: ${err.message}`);
    }

    // Save to config
    const configPath = path.join(app.getPath('userData'), 'backup-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ path: newPath }), 'utf8');
    return newPath;
  }
  return null;
});

ipcMain.handle('reset-backup-path', async () => {
  const configPath = path.join(app.getPath('userData'), 'backup-config.json');
  try {
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    return { success: true, path: path.join(getDBFolder(), 'BACKUPS') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// File Upload Handlers
ipcMain.handle('upload-id-card', async (event, type, id, fileBuffer) => {
  const dbPath = getDBFolder();
  const folderName = type === 'customer' ? 'CUSTOMER_IDS' : 'SALES_IDS';
  const dir = path.join(dbPath, folderName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${id}.png`);
  fs.writeFileSync(filePath, Buffer.from(fileBuffer));
  return filePath;
});

ipcMain.handle('delete-id-card', async (event, type, id) => {
  const dbPath = getDBFolder();
  const folderName = type === 'customer' ? 'CUSTOMER_IDS' : 'SALES_IDS';
  const extensions = ['.png', '.jpg', '.jpeg'];
  let deleted = false;
  for (const ext of extensions) {
    const filePath = path.join(dbPath, folderName, `${id}${ext}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
      console.log(`Deleted ID card: ${filePath}`);
    }
  }
  return deleted;
});

ipcMain.handle('get-id-card', async (event, type, id) => {
  const dbPath = getDBFolder();
  const folderName = type === 'customer' ? 'CUSTOMER_IDS' : 'SALES_IDS';
  const extensions = ['.png', '.jpg', '.jpeg'];
  try {
    for (const ext of extensions) {
      const filePath = path.join(dbPath, folderName, `${id}${ext}`);
      if (fs.existsSync(filePath)) {
        const fileUrl = pathToFileURL(filePath).href;

        return fileUrl.replace(/^file:\/+/i, 'dyr-file:///');
      }
    }
    return null;
  } catch (error) {
    console.error(`Error reading ID card for ${type}/${id}:`, error);
    return null;
  }
});

ipcMain.handle('upload-unit-layout', async (event, unitId, fileBuffer) => {
  const dbPath = getDBFolder();
  const dir = path.join(dbPath, 'LAYOUTS');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${unitId}.png`);
  fs.writeFileSync(filePath, Buffer.from(fileBuffer));
  return filePath;
});

ipcMain.handle('upload-floorplan', async (event, buildingName, fileBuffer) => {
  const dbPath = getDBFolder();
  const dir = path.join(dbPath, 'floorplans');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `${buildingName}_Floorplan.pdf`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, Buffer.from(fileBuffer));
  return filePath;
});

ipcMain.handle('get-floorplan', async (event, buildingName) => {
  console.log(`[IPC] get-floorplan requested for: ${buildingName}`);
  const dbPath = getDBFolder();
  const filePath = path.join(dbPath, 'floorplans', `${buildingName}_Floorplan.pdf`);
  if (fs.existsSync(filePath)) {
    console.log(`[IPC] Floorplan found at: ${filePath}`);
    const fileUrl = pathToFileURL(filePath).href;

    return fileUrl.replace(/^file:\/+/i, 'dyr-file:///');
  }
  return null;
});

ipcMain.handle('upload-attachment', async (event, fileName, fileBuffer) => {
  const dbPath = getDBFolder();
  const dir = path.join(dbPath, 'Attachments');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, Buffer.from(fileBuffer));
  return filePath;
});

ipcMain.handle('get-attachment', async (event, fileName) => {
  const dbPath = getDBFolder();
  const filePath = path.join(dbPath, 'Attachments', fileName);
  if (fs.existsSync(filePath)) {
    const fileUrl = pathToFileURL(filePath).href;

    return fileUrl.replace(/^file:\/+/i, 'dyr-file:///');
  }
  return null;
});

ipcMain.handle('delete-attachment', async (event, fileName) => {
  const dbPath = getDBFolder();
  const filePath = path.join(dbPath, 'Attachments', fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});




// Get External IP Address
ipcMain.handle('get-external-ip', async () => {
  try {
    const https = require('https');
    return await new Promise((resolve) => {
      const req = https.get('https://api.ipify.org?format=text', { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data.trim() || 'Unknown'));
      });
      req.on('error', () => {
        // Fallback to local IP
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
              resolve(net.address);
              return;
            }
          }
        }
        resolve('0.0.0.0');
      });
      req.on('timeout', () => {
        req.destroy();
        resolve('Timeout');
      });
    });
  } catch (e) {
    console.error('getExternalIp error:', e);
    return '0.0.0.0';
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  if (!filePath) return false;

  let targetPath = filePath;

  // If it's a URL (either standard file:// or our custom dyr-file://),
  // convert it to a local filesystem path that shell.openPath and fs.existsSync understand.
  if (filePath.startsWith('file://') || filePath.startsWith('dyr-file://')) {
    try {
      const urlToConvert = filePath.startsWith('dyr-file://')
        ? filePath.replace('dyr-file://', 'file://')
        : filePath;
      targetPath = fileURLToPath(urlToConvert);
    } catch (e) {
      console.error('[IPC] Error converting URL to path:', e);
      // Fallback for malformed URLs
      targetPath = decodeURIComponent(filePath.replace(/^(dyr-file|file):\/\/+/i, ''));
      if (process.platform === 'win32' && targetPath.match(/^\/[a-zA-Z]:/)) {
        targetPath = targetPath.slice(1);
      }
    }
  }

  // Normalize the final path for the current OS
  targetPath = path.normalize(targetPath);

  if (fs.existsSync(targetPath)) {
    try {
      console.log(`[IPC] Opening file: ${targetPath}`);
      const error = await shell.openPath(targetPath);
      if (error) {
        console.warn(`[IPC] shell.openPath failed, trying openExternal: ${error}`);
        await shell.openExternal(pathToFileURL(targetPath).href);
      }
      return true;
    } catch (e) {
      console.error('[IPC] Critical error in open-file:', e);
      return false;
    }
  } else {
    console.error(`[IPC] File not found: ${targetPath}`);
  }
  return false;
});

// --- AUTO-START ON WINDOWS STARTUP ---
ipcMain.handle('get-auto-start', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'server_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { enabled: !!config.autoStartServer };
    }
  } catch (e) {
    console.error('[Auto-Start] Failed to read config:', e);
  }
  return { enabled: false };
});

ipcMain.handle('set-auto-start', async (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: ['--auto-start']
    });
  } catch (e) {
    console.error('[Auto-Start] setLoginItemSettings failed:', e);
  }
  // Save the auto-server preference regardless
  try {
    const configPath = path.join(app.getPath('userData'), 'server_config.json');
    let config = {};
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e) {}
    config.autoStartServer = enabled;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('[Auto-Start] Failed to save config:', e);
  }
  return { success: true, enabled };
});

// --- EXPRESS SERVER MANAGEMENT (IN-PROCESS) ---
let expressHttpServer = null;
let expressServerRunning = false;

const getLanIP = () => {
  const nets = os.networkInterfaces();
  let ip = '0.0.0.0';
  for (const name of Object.keys(nets)) {
    for (const netInfo of nets[name]) {
      const familyV4Value = typeof netInfo.family === 'string' ? 'IPv4' : 4;
      if (netInfo.family === familyV4Value && !netInfo.internal) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('ethernet') || lowerName.includes('wi-fi') || lowerName.includes('wireless')) {
          ip = netInfo.address;
        } else if (ip === '0.0.0.0') {
          ip = netInfo.address;
        }
      }
    }
  }
  return ip;
};

// Start the Express server in-process (no child process needed)
const startExpressServer = async () => {
  if (expressServerRunning && expressHttpServer) {
    return { success: true, already: true, ip: getLanIP(), port: 3001 };
  }

  const dbPath = getDBFolder();
  // Always use asar-relative path so server can find express in node_modules
  const serverScript = path.join(__dirname, '..', 'server', 'index.js');

  try {
    // Clear require cache so server can be restarted
    delete require.cache[require.resolve(serverScript)];
    const { startServer } = require(serverScript);
    expressHttpServer = await startServer(dbPath);
    expressServerRunning = true;
    console.log('[Express Server] Started in-process successfully');
    return { success: true, ip: getLanIP(), port: 3001 };
  } catch (err) {
    console.error('[Express Server] Failed to start:', err);
    expressServerRunning = false;
    expressHttpServer = null;
    return { success: false, error: err.message || String(err) };
  }
};

ipcMain.handle('start-express-server', async () => {
  return await startExpressServer();
});

ipcMain.handle('stop-express-server', async () => {
  if (expressHttpServer) {
    return new Promise((resolve) => {
      expressHttpServer.close(() => {
        console.log('[Express Server] Stopped');
        expressHttpServer = null;
        expressServerRunning = false;
        resolve({ success: true });
      });
    });
  }
  return { success: true, already: true };
});

ipcMain.handle('get-server-status', () => {
  return { running: expressServerRunning, ip: getLanIP(), port: 3001 };
});

ipcMain.handle('get-lan-ip', () => {
  return getLanIP();
});

// Clean up server on app quit
app.on('before-quit', () => {
  if (expressHttpServer) {
    expressHttpServer.close();
    expressHttpServer = null;
  }
});

// AUTO-START: If configured, start Express server automatically when DYR launches
setTimeout(() => {
  try {
    const configPath = path.join(app.getPath('userData'), 'server_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.autoStartServer) {
        console.log('[Auto-Start] Starting Express server automatically...');
        startExpressServer().then(result => {
          console.log('[Auto-Start] Server result:', result);
        });
      }
    }
  } catch (e) {
    console.error('[Auto-Start] Failed:', e);
  }
}, 2000);

