# Developer Guide — Volume Booster Extension

This is your complete reference for developing, testing, and modifying the extension.
You do not need Node.js, npm, or any build tools. This is plain HTML/CSS/JS.

---

## Project Structure

```
chromeext_volume_booster/
├── manifest.json              ← The extension's "ID card" — Chrome reads this first
├── popup/
│   ├── popup.html             ← The UI that appears when you click the extension icon
│   ├── popup.css              ← Styles for the popup
│   └── popup.js               ← Logic: slider, volume boost, storage
├── content/                   ← (reserved for future content scripts)
├── background/
│   └── service-worker.js      ← Runs in background, cleans up storage on tab close
├── icons/
│   ├── generate-icons.html    ← Open this in Chrome to generate icon PNG files
│   ├── icon16.png             ← (you generate these — see Step 1 below)
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── research/                  ← All market research (not part of the extension)
├── DEVELOPER_GUIDE.md         ← This file
├── LAUNCH_GUIDE.md            ← How to publish to Chrome Web Store
└── MONETIZATION_GUIDE.md      ← How to add paid features later
```

**What each file does in plain English:**

| File | Purpose |
|---|---|
| `manifest.json` | Tells Chrome the extension's name, version, what permissions it needs, and which files to use |
| `popup.html` | The small window that pops up when you click the extension icon in the toolbar |
| `popup.css` | Makes the popup look good (colors, fonts, layout) |
| `popup.js` | The brain: reads the slider, injects audio boost code into the current tab, saves settings |
| `service-worker.js` | A tiny background script that cleans up saved settings when you close a tab |
| `generate-icons.html` | A helper tool — opens in Chrome and downloads 4 icon PNG files |

---

## Step 1 — Generate Icons (do this once)

Before you can load the extension, you need PNG icon files.

1. Open Chrome
2. Press `Cmd + O` (Mac) or `Ctrl + O` (Windows)
3. Navigate to `icons/generate-icons.html` and open it
4. Click **"Generate & Download Icons"**
5. Four files download: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
6. Move all four files into the `icons/` folder of this project

---

## Step 2 — Load the Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions` in the address bar
3. Turn ON **Developer mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the `chromeext_volume_booster/` folder (the root of this project)
6. The extension appears in your list — you should see the 🔊 icon in Chrome's toolbar

If you don't see the icon in the toolbar: click the puzzle piece icon (🧩) next to the address bar → find "Volume Booster" → click the pin icon.

---

## Step 3 — Test It Works

1. Open any page with audio — YouTube works great
2. Start playing a video
3. Click the Volume Booster icon in Chrome's toolbar
4. Move the slider to 200% or higher
5. The audio should get louder

**Test on these sites specifically:**
- YouTube (most important — millions of users)
- Spotify Web Player
- Netflix
- Any site with `<audio>` or `<video>` elements
- Try a simple HTML page with an audio tag

---

## Step 4 — Making Changes and Reloading

Every time you edit a file, you need to reload the extension:

1. Make your change and save the file
2. Go to `chrome://extensions`
3. Find Volume Booster and click the **reload icon** (circular arrow ↻)
4. Close and reopen the popup

**Shortcut:** Keep `chrome://extensions` open in a tab while developing. One click to reload.

---

## How the Audio Boost Works (Technical)

When you move the slider, `popup.js` does this:

1. Gets the current tab's ID
2. Uses `chrome.scripting.executeScript` to inject a function directly into the webpage
3. That function uses the browser's built-in **Web Audio API** to:
   - Create an `AudioContext` (a sound processing engine)
   - Create a `GainNode` (a volume amplifier)
   - Connect every `<audio>` and `<video>` element on the page through the amplifier
   - Set the gain value (100% = 1.0, 200% = 2.0, 600% = 6.0)
4. A `MutationObserver` watches for new media elements (for sites like YouTube that load videos dynamically)
5. The setting (what % you chose) is saved in `chrome.storage.local` keyed by tab ID

**Why `world: 'MAIN'` in the script injection?**
Chrome extensions normally run in an "isolated world" (sandbox) that can't touch the page's own JavaScript variables. By using `world: 'MAIN'`, the injected function runs inside the page's own JavaScript context — same as the page itself. This is required for the Web Audio API to work correctly and persist across multiple popup opens.

---

## Debugging

### Popup errors
1. Right-click the extension icon → **Inspect popup**
2. This opens DevTools for the popup — check the Console tab for errors

### Page script errors
1. Open DevTools on the page (`F12` or right-click → Inspect)
2. Go to Console tab
3. Look for errors mentioning `AudioContext`, `GainNode`, or `Volume Booster`

### Service worker errors
1. Go to `chrome://extensions`
2. Click **"Service Worker"** link under Volume Booster
3. This opens DevTools for the background service worker

### Common Issues

**"Cannot boost audio on this page"**
The extension cannot run on Chrome internal pages (`chrome://`, `chrome-extension://`) or the Chrome Web Store itself. This is a Chrome security restriction — expected and normal.

**Audio is not getting louder**
- The page may not have started playing audio yet when you moved the slider. Try: play audio first, then adjust the slider.
- Some sites use unusual audio pipelines. Try refreshing the page, then adjusting the slider before playing.

**Extension icon not visible**
Click the puzzle piece 🧩 icon in Chrome's toolbar → pin Volume Booster.

**Changes not showing after edit**
Go to `chrome://extensions` → click the reload icon under Volume Booster.

**"Could not access tab" error**
Some pages block extension scripts. Usually happens on browser internal pages — safe to ignore.

---

## Permissions Explained

The `manifest.json` requests only three permissions:

| Permission | Why we need it |
|---|---|
| `activeTab` | Lets us access the currently active tab when the user clicks the extension icon |
| `scripting` | Lets us inject the audio boost function into the page |
| `storage` | Lets us save the volume setting per tab |

We do NOT request `<all_urls>` (which would let us run on every page automatically). We only activate when the user explicitly clicks the extension. This is intentional — it's why we can say "no tracking" and have a cleaner permission footprint.

---

## Project Values to Maintain

These are the things that make this extension trusted:
- **100% local** — no network requests, no servers, no analytics
- **No permissions creep** — don't add permissions unless absolutely necessary
- **No ads or tracking code** — ever
- **Fast and lightweight** — the popup should open in under 100ms

---

## File Sizes Reference

Keep the extension lean. Target total size under 100KB (excluding icons).
Current approximate sizes:
- `popup.html` ~1KB
- `popup.css` ~3KB
- `popup.js` ~4KB
- `service-worker.js` <1KB
- Icons: ~30KB total

---

## Git Setup (Recommended)

Initialize version control so you can track your changes:

```bash
cd /Users/CS/Projects/04-mvps/chromeext_volume_booster
git init
git add .
git commit -m "Initial extension structure"
```

Create a private GitHub repo and push to it for backup.
