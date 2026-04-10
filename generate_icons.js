import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE = 'C:\\Users\\C0QA\\Downloads\\image-removebg-preview-removebg-preview.png';
const ELECTRON_ASSETS = path.join(__dirname, 'electron', 'assets');

async function generate() {
  console.log('Source:', SOURCE);
  
  // Generate all PNG sizes
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
  for (const size of sizes) {
    const outPath = path.join(ELECTRON_ASSETS, `icon_${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(outPath);
    console.log(`Generated: icon_${size}.png`);
  }
  
  // Generate main icon.png (512px)
  const mainPngPath = path.join(ELECTRON_ASSETS, 'icon.png');
  await sharp(SOURCE).resize(512, 512).png().toFile(mainPngPath);
  console.log('Generated: icon.png (512px)');
  
  // Generate ICO from 256px PNG
  const png256 = path.join(ELECTRON_ASSETS, 'icon_256.png');
  const icoBuffer = await pngToIco(png256);
  fs.writeFileSync(path.join(ELECTRON_ASSETS, 'icon.ico'), icoBuffer);
  console.log('Generated: icon.ico');
  
  // Also copy to public/assets for web
  const publicLogo = path.join(__dirname, 'public', 'assets', 'logo.png');
  if (fs.existsSync(path.dirname(publicLogo))) {
    await sharp(SOURCE).resize(512, 512).png().toFile(publicLogo);
    console.log('Generated: public/assets/logo.png');
  }
  
  console.log('\nAll icons regenerated successfully!');
}

generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
