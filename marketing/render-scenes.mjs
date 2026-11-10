// Renders marketing/scenes/*.html to PNG. Each scene declares its size and output path:
//   <meta name="render" content="1280x800 out/store/screenshot-1.png">   (path relative to marketing/)
// Scenes may set window.sceneReady (a promise) when they need time to set up.
// Usage: node render-scenes.mjs [scene-name ...]   Needs Google Chrome installed.
import { chromium } from 'playwright';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo } from './serve.mjs';

const dir = fileURLToPath(new URL('.', import.meta.url));
const only = process.argv.slice(2);
const scenes = readdirSync(`${dir}scenes`).filter(f => f.endsWith('.html'))
  .filter(f => !only.length || only.includes(f.replace('.html', '')));

const { origin, close } = await serveRepo();
const browser = await chromium.launch({ channel: 'chrome' });
for (const file of scenes) {
  const meta = readFileSync(`${dir}scenes/${file}`, 'utf8').match(/<meta name="render" content="(\d+)x(\d+) ([^"]+)"/);
  if (!meta) continue;
  const [, w, h, out] = meta;
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log(`  ${file}: ${e.message}`));
  await page.goto(`${origin}/marketing/scenes/${file}`);
  await page.evaluate(async () => { await window.sceneReady; await document.fonts.ready; });
  mkdirSync(dirname(`${dir}${out}`), { recursive: true });
  await page.screenshot({ path: `${dir}${out}`, type: 'png' });
  console.log(`${file} → ${out}`);
  await page.close();
}
await browser.close();
close();
