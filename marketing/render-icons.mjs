// Renders icons/src/*.svg to the PNG sizes the manifest uses. Needs Google Chrome installed.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sizes = { 16: 'icon-small.svg', 32: 'icon-small.svg', 48: 'icon.svg', 128: 'icon.svg' };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 256, height: 256 } });
for (const [size, file] of Object.entries(sizes)) {
  const svg = readFileSync(`${root}icons/src/${file}`, 'utf8').replace(/width="128" height="128"/, `width="${size}" height="${size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent;line-height:0">${svg}</body></html>`);
  await page.screenshot({ path: `${root}icons/icon${size}.png`, omitBackground: true, clip: { x: 0, y: 0, width: +size, height: +size } });
  console.log(`icons/icon${size}.png`);
}
await browser.close();
