// Records scenes/video.html frame by frame (deterministic, 30 fps), renders its soundtrack offline,
// then builds out/video/promo.mp4 and three GIF loops with ffmpeg.
// Usage: node record.mjs [--frames-only|--encode-only]   Needs Google Chrome and ffmpeg.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serveRepo } from './serve.mjs';

const dir = fileURLToPath(new URL('.', import.meta.url));
const FPS = 30;
const DURATION = 36;
const frames = `${dir}out/frames`;
const video = `${dir}out/video`;
const arg = process.argv[2];

if (arg !== '--encode-only') {
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  mkdirSync(video, { recursive: true });

  const { origin, close } = await serveRepo();
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(`${origin}/marketing/scenes/video.html`);
  await page.evaluate(async () => { await window.sceneReady; await document.fonts.ready; });

  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.renderFrame(t), i / FPS);
    await page.screenshot({ path: `${frames}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }

  const wav = await page.evaluate(() => window.renderAudio());
  writeFileSync(`${video}/soundtrack.wav`, Buffer.from(wav, 'base64'));
  await browser.close();
  close();
}

if (arg !== '--frames-only') {
  const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
  ff('-framerate', String(FPS), '-i', `${frames}/f%05d.jpg`, '-i', `${video}/soundtrack.wav`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', `${video}/promo.mp4`);

  // GIF loops: [name, start s, length s]
  for (const [name, start, len] of [['knob', 4.4, 6.2], ['limiter', 12, 7], ['modes', 19, 7]]) {
    ff('-ss', String(start), '-t', String(len), '-i', `${video}/promo.mp4`,
      '-vf', 'fps=15,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      '-loop', '0', `${video}/${name}.gif`);
  }
  console.log('out/video: promo.mp4, knob.gif, limiter.gif, modes.gif');
}
