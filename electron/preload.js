console.log('[PRELOAD] Initializing electronAPI...');
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readDatabase: (entity) => ipcRenderer.invoke('read-database', entity),
    writeDatabase: (entity, data) => ipcRenderer.invoke('write-database', entity, data),
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),

    // Auto-Update API
    checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    directPrint: (html, printerName, options) => ipcRenderer.invoke('direct-print', html, printerName, options),
    printPDF: (buffer, options) => ipcRenderer.invoke('print-pdf', buffer, options),
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-status');
        ipcRenderer.removeAllListeners('update-progress');
    },

    // Database Path Management
    selectDBFolder: () => ipcRenderer.invoke('select-db-folder'),
    getDBFolder: () => ipcRenderer.invoke('get-db-folder'),
    setDBPath: (path) => ipcRenderer.invoke('set-db-path', path),
    verifyDBPath: (path) => ipcRenderer.invoke('verify-db-path', path),
    onDBPathError: (callback) => ipcRenderer.on('db-path-error', (_event, value) => callback(value)),

    // Backup Path Management
    getBackupFolder: () => ipcRenderer.invoke('get-backup-folder'),
    setBackupPath: (path) => ipcRenderer.invoke('set-backup-path', path),
    selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
    resetBackupPath: () => ipcRenderer.invoke('reset-backup-path'),

    // Admin
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    backupDatabase: () => ipcRenderer.invoke('backup-database'),
    relaunch: () => ipcRenderer.invoke('app-relaunch'),
    checkWhatsAppApp: () => ipcRenderer.invoke('check-whatsapp-app'),
    getUnitLayout: (unitId) => ipcRenderer.invoke('get-unit-layout', unitId),
    getExternalIp: () => ipcRenderer.invoke('get-external-ip'),
    uploadIdCard: (type, id, buffer) => ipcRenderer.invoke('upload-id-card', type, id, buffer),
    deleteIdCard: (type, id) => ipcRenderer.invoke('delete-id-card', type, id),
    getIdCard: (type, id) => ipcRenderer.invoke('get-id-card', type, id),
    uploadUnitLayout: (unitId, buffer) => ipcRenderer.invoke('upload-unit-layout', unitId, buffer),
    uploadFloorplan: (buildingName, buffer) => ipcRenderer.invoke('upload-floorplan', buildingName, buffer),
    getFloorplan: (buildingName) => ipcRenderer.invoke('get-floorplan', buildingName),
    uploadAttachment: (fileName, buffer) => ipcRenderer.invoke('upload-attachment', fileName, buffer),
    getAttachment: (fileName) => ipcRenderer.invoke('get-attachment', fileName),
    deleteAttachment: (fileName, buffer) => ipcRenderer.invoke('delete-attachment', fileName),
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

    // Express Server Management (LAN Database)
    startExpressServer: () => ipcRenderer.invoke('start-express-server'),
    stopExpressServer: () => ipcRenderer.invoke('stop-express-server'),
    getServerStatus: () => ipcRenderer.invoke('get-server-status'),
    getLanIP: () => ipcRenderer.invoke('get-lan-ip'),

    // Auto-start on Windows startup
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
    setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled)
});
