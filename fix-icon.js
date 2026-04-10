import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const rcedit = require('rcedit');

async function fixIcon() {
  const root = 'C:\\Users\\C0QA\\Downloads\\CHRONO DEVELOPMENT - 3-3-2026\\CHRONO DEVELOPMENT - 10-02-2026';
  const exePath = path.join(root, 'release/win-unpacked/Chrono-Dev.exe');
  const iconPath = path.join(root, 'release/win-unpacked/resources/assets/ICON.ico');
  const tempPath = path.join(root, 'release/win-unpacked/Chrono-Dev-REFRESH.exe');

  console.log(`Patching: ${exePath}`);
  try {
    const fn = typeof rcedit === 'function' ? rcedit : rcedit.rcedit;
    await fn(exePath, { icon: iconPath });
    console.log('1. Icon resource patched.');

    if (fs.existsSync(exePath)) {
        console.log('2. Forcing Explorer refresh...');
        fs.renameSync(exePath, tempPath);
        // Wait a second for Windows to notice the "new" file
        setTimeout(() => {
            fs.renameSync(tempPath, exePath);
            console.log('3. Success! Please refresh your folder (F5) or wait a moment.');
        }, 1500);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

fixIcon();
