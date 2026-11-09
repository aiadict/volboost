// Renders marketing/scenes/*.html to PNG. Each scene declares its size and output path:
//   <meta name="render" content="1200x630 ../docs/og.png">   (path relative to marketing/)
// Usage: node render-scenes.mjs [scene-name ...]   Needs Google Chrome installed.
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const only = process.argv.slice(2);
const scenes = readdirSync(`${dir}scenes`).filter(f => f.endsWith('.html'))
  .filter(f => !only.length || only.includes(f.replace('.html', '')));

const browser = await chromium.launch({ channel: 'chrome' });
for (const file of scenes) {
  const meta = readFileSync(`${dir}scenes/${file}`, 'utf8').match(/<meta name="render" content="(\d+)x(\d+) ([^"]+)"/);
  if (!meta) { console.log(`skip ${file} (no render meta)`); continue; }
  const [, w, h, out] = meta;
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await page.goto(`file://${dir}scenes/${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dir}${out}`, type: 'png' });
  console.log(`${file} → ${out}`);
  await page.close();
}
await browser.close();
