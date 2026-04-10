const fs = require('fs');
const path = require('path');

async function processIcon() {
    try {
        const sharp = require('sharp');
        // Dynamic import because it's an ESM
        const pngToIco = (await import('png-to-ico')).default;

        console.log('Processing icon...');

        // 1. Ensure directories exist
        const dirs = ['build', 'electron/assets'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        // 2. Resize to square 512x512 using sharp
        const squarePngBuffer = await sharp('assets/icon.png')
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();

        // 3. Save square PNG to build and electron/assets
        fs.writeFileSync('build/icon.png', squarePngBuffer);
        fs.writeFileSync('electron/assets/icon.png', squarePngBuffer);
        console.log('Square PNGs created.');

        // 4. Convert to ICO
        const icoBuffer = await pngToIco(squarePngBuffer);

        // 5. Save ICO to build and electron/assets
        fs.writeFileSync('build/icon.ico', icoBuffer);
        fs.writeFileSync('electron/assets/icon.ico', icoBuffer);
        console.log('ICO files created successfully.');

    } catch (err) {
        console.error('Error processing icon:', err);
        process.exit(1);
    }
}

processIcon();
