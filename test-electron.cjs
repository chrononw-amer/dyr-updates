console.log('Node version:', process.version);
console.log('Electron version:', process.versions.electron);
console.log('Process argv:', process.argv);
const electron = require('electron');
console.log('Electron module type:', typeof electron);
if (typeof electron === 'object') {
    console.log('Electron keys:', Object.keys(electron));
} else {
    console.log('Electron value:', electron);
}
process.exit(0);
