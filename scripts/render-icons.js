/**
 * Renders the app icon SVGs in assets/icon-src to the PNGs Expo uses (assets/images).
 * Chromium is used instead of an SVG library so the Arabic wordmark is shaped correctly
 * with the app's own Cairo font. Run: node scripts/render-icons.js
 */
const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')));
}

const root = path.join(__dirname, '..');
const src = path.join(root, 'assets/icon-src');
const out = path.join(root, 'assets/images');
const fontDir = path.join(root, 'node_modules/@expo-google-fonts/cairo/800ExtraBold/Cairo_800ExtraBold.ttf');

// [source svg, output png, size (or [width, height]), transparent background]
const jobs = [
  ['icon.svg', 'icon.png', 1024, false],
  ['android-foreground.svg', 'android-icon-foreground.png', 512, true],
  ['android-background.svg', 'android-icon-background.png', 512, false],
  ['android-monochrome.svg', 'android-icon-monochrome.png', 432, true],
  ['splash.svg', 'splash-icon.png', 512, true],
  ['icon.svg', 'favicon.png', 48, false],
  ['feature-graphic.svg', '../store/feature-graphic.png', [1024, 500], false],
];

(async () => {
  const font = fs.readFileSync(fontDir).toString('base64');
  const browser = await chromium.launch();
  for (const [svgName, pngName, size, transparent] of jobs) {
    const [width, height] = Array.isArray(size) ? size : [size, size];
    const page = await browser.newPage({ viewport: { width, height } });
    const svg = fs.readFileSync(path.join(src, svgName), 'utf8');
    await page.setContent(
      `<html><head><style>@font-face{font-family:Cairo;font-weight:800;src:url(data:font/ttf;base64,${font})}` +
        `html,body{margin:0;background:transparent}svg{width:${width}px;height:${height}px;display:block}</style></head><body>${svg}</body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, pngName), omitBackground: transparent });
    await page.close();
    console.log(`${pngName} ${width}x${height}`);
  }
  await browser.close();
})();
