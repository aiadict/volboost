// Copies the real popup and shared assets into docs/ so the website demo always
// matches the extension. Run after changing popup/ or shared/: node scripts/build-site.mjs
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const docs = `${root}docs/`;

for (const dir of ['shared', 'popup']) {
  rmSync(`${docs}${dir}`, { recursive: true, force: true });
  cpSync(`${root}${dir}`, `${docs}${dir}`, { recursive: true });
}
cpSync(`${root}icons/icon32.png`, `${docs}icon32.png`);
cpSync(`${root}icons/icon128.png`, `${docs}icon128.png`);

// The shim must load before any popup script touches chrome.*.
const popupHtml = `${docs}popup/popup.html`;
const html = readFileSync(popupHtml, 'utf8');
const marker = '<script src="../shared/hifi.js"></script>';
if (!html.includes(marker)) throw new Error('popup.html changed: update the shim injection in build-site.mjs');
writeFileSync(popupHtml, html.replace(marker, `<script src="../chrome-shim.js"></script>\n  ${marker}`));

console.log('docs/shared, docs/popup, docs/icon*.png updated');
