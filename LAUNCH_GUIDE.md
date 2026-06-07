# Launch Guide — Publishing to Chrome Web Store

Follow these steps in order. Each section tells you what to do, where to go, and what to expect.

---

## Overview

| Step | Task | Time needed |
|---|---|---|
| 1 | Create Google Developer Account | 15 min |
| 2 | Generate icons | 5 min |
| 3 | Take screenshots | 30 min |
| 4 | Write the store listing | 20 min (copy from below) |
| 5 | Create a privacy policy page | 15 min |
| 6 | Package and submit the extension | 20 min |
| 7 | Wait for review | 1–3 business days |

---

## Step 1 — Create a Chrome Web Store Developer Account

**Where to go:** https://chrome.google.com/webstore/devconsole

1. Log in with your Google account (or create one)
2. You'll be asked to pay a **one-time $5 registration fee** — pay with a card
3. Accept the developer agreement
4. Your developer account is now active

**Note:** You can use any Google account. If you already have one, you don't need to create a new one.

---

## Step 2 — Generate Icons

If you haven't done this yet:
1. Open Chrome
2. Open `icons/generate-icons.html` from this project
3. Click "Generate & Download Icons"
4. Move the 4 downloaded PNG files into the `icons/` folder

You need: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

---

## Step 3 — Take Screenshots

The Chrome Web Store requires at least 1 screenshot. You need **1280×800 pixels** (or 640×400).

**What to show:**
1. **Screenshot 1** — Extension popup open on YouTube, showing 250% boost, video playing
2. **Screenshot 2** — Before/after comparison (popup closed vs open, volume level shown)
3. **Screenshot 3** — Extension popup open on Spotify or Netflix

**How to take 1280×800 screenshots:**
1. Set your Chrome window to exactly 1280px wide (use a window resizer extension like "Window Resizer")
2. Navigate to YouTube, play a video
3. Open the Volume Booster popup
4. Use `Cmd+Shift+4` (Mac) or `Win+Shift+S` (Windows) to take a screenshot
5. Crop to 1280×800 in Preview (Mac) or Paint (Windows)

**Tips for good screenshots:**
- Use a popular, recognizable page (YouTube homepage is ideal)
- Show the popup clearly with the slider at a non-100% position
- Make sure no personal information is visible (no email, no profile photo)
- Dark background pages look good with our dark popup

---

## Step 4 — Store Listing Copy

Use this copy exactly. It's written for the keyword `volume booster` and passes Chrome's content policy.

**Name (max 45 chars):**
```
Volume Booster — Safe Tab Audio Amplifier
```

**Short Description (max 132 chars):**
```
Boost browser tab volume up to 600%. Works on YouTube, Spotify & Netflix. No adware, no tracking, 100% local.
```

**Full Description:**
```
🔊 SAFE, CLEAN VOLUME BOOSTER — NO ADWARE

Tired of quiet videos or low audio on your laptop? Volume Booster amplifies any browser tab's audio up to 600% — safely, privately, with zero data collection.

WORKS ON:
✓ YouTube
✓ Spotify Web Player
✓ Netflix
✓ Twitch, Vimeo, SoundCloud
✓ Any website with audio or video

HOW IT WORKS:
Click the extension icon → drag the slider → audio instantly boosts. Reset to normal in one click.

WHY CHOOSE THIS ONE:
✗ No adware or affiliate injections
✗ No usage tracking or analytics
✗ No account required
✗ No background scripts on every page
✓ 100% local — runs only when you use it
✓ Works with the Web Audio API — no hacks or workarounds
✓ Manifest V3 — built to Chrome's latest standards

SIMPLE AND TRANSPARENT:
We only request 3 permissions: activeTab, scripting, and storage. We cannot see your browsing history. We do not run any code unless you click the extension icon.

Built by an independent developer who wanted a clean alternative to the adware-infected volume boosters on the market.

Report issues or suggest features: [your email here]
```

**Category:** Accessibility

**Language:** English

---

## Step 5 — Privacy Policy

Chrome Web Store **requires** a privacy policy URL. You need a publicly accessible page.

**Option A (Easiest): Use a free GitHub Pages page**

1. Create a free account at https://github.com
2. Create a new repository named `volume-booster-privacy`
3. Add a file called `index.html` with the content below
4. Enable GitHub Pages: Repository Settings → Pages → Source: main branch

**Privacy Policy Template:**

```html
<!DOCTYPE html>
<html>
<head><title>Volume Booster — Privacy Policy</title></head>
<body>
<h1>Privacy Policy — Volume Booster Chrome Extension</h1>
<p>Last updated: [today's date]</p>

<h2>Summary</h2>
<p>Volume Booster does not collect, transmit, or store any personal data.
All processing happens locally in your browser.</p>

<h2>Data Collection</h2>
<p>We collect no data. The extension does not send any information to any
server. It does not use analytics, tracking pixels, or third-party services.</p>

<h2>Permissions</h2>
<p>The extension requests the following Chrome permissions:</p>
<ul>
  <li><strong>activeTab</strong>: To access the currently active tab when
  you click the extension icon.</li>
  <li><strong>scripting</strong>: To inject the audio boost function into
  the current page.</li>
  <li><strong>storage</strong>: To save your volume setting for each tab
  locally on your device.</li>
</ul>
<p>None of these permissions are used to collect or transmit data.</p>

<h2>Contact</h2>
<p>Questions? Email: [your email]</p>
</body>
</html>
```

Your privacy policy URL will be: `https://[your-github-username].github.io/volume-booster-privacy/`

---

## Step 6 — Package and Submit

### Package the extension

1. Go to your project folder in Finder
2. Select all files EXCEPT the `research/` folder (we don't want to ship that)
3. Right-click → Compress (Mac) / Send to → Compressed folder (Windows)
4. Rename the zip file to `volume-booster-v1.0.0.zip`

**What should be in the zip:**
```
volume-booster-v1.0.0.zip
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── service-worker.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

Do NOT include: `research/`, `DEVELOPER_GUIDE.md`, `LAUNCH_GUIDE.md`, `MONETIZATION_GUIDE.md`, `icons/generate-icons.html`, `.gitignore`

### Submit

1. Go to https://chrome.google.com/webstore/devconsole
2. Click **"New Item"**
3. Upload your zip file
4. Fill in all fields:
   - Name, short description, full description (from Step 4)
   - Category: **Accessibility**
   - Language: English
   - Screenshots (from Step 3)
   - Store icon: use `icon128.png`
   - Privacy policy URL (from Step 5)
5. Under **Visibility**: set to **Public**
6. Click **"Submit for Review"**

---

## Step 7 — After Submission

**What to expect:**
- Review takes **1–3 business days** (sometimes up to 7 days for first submission)
- You'll get an email when it's approved or if there are issues
- Common rejection reasons: missing privacy policy, unclear permissions justification, screenshots too small

**If rejected:**
- Read the rejection reason carefully
- Fix the issue
- Resubmit — subsequent reviews are usually faster

**When approved:**
- Your extension is live on the Chrome Web Store
- Share the link in relevant communities (see Marketing section)

---

## Step 8 — Marketing After Launch

These are the highest-return channels based on our research:

### Day 1 (launch day)
- Post on r/chrome_extensions: "I built a safe, adware-free volume booster — here's why I made it"
- Post on r/software: Share the adware story and your clean alternative
- Post on r/lifehacks or r/productivity: Focus on the use case (quiet laptop, quiet videos)

### Week 1
- Post on Hacker News "Show HN": Keep it factual and technical
- Share on Twitter/X with the hashtag #ChromeExtension
- Post a YouTube Shorts video showing before/after (30 seconds, no talking needed — just show the boost working)

### Ongoing
- Answer questions on Reddit whenever someone asks "how do I make my browser louder"
- Reply to negative reviews of the adware-infected competitor (tactfully)

### The key message to use everywhere:
> "I built this because the popular Volume Booster extension got caught injecting adware. This one is 100% local — open source, no tracking, no background scripts."

---

## Version Numbers

When you update the extension, increment the version in `manifest.json`:
- Bug fix: 1.0.0 → 1.0.1
- New feature: 1.0.0 → 1.1.0
- Major change: 1.0.0 → 2.0.0

Every time you submit a new version, it goes through review again (usually faster for updates).

---

## Checklist Before Submitting

- [ ] All 4 icon PNG files exist in `icons/` folder
- [ ] Extension loads without errors in `chrome://extensions`
- [ ] Tested on YouTube — audio boosts correctly
- [ ] Tested on Spotify — audio boosts correctly
- [ ] Tested reset button — returns to 100%
- [ ] Tested on a `chrome://` page — shows "Cannot boost audio on this page" error (expected)
- [ ] Privacy policy URL is live and accessible
- [ ] Screenshots are 1280×800
- [ ] Zip file does not include `research/` or guide files
- [ ] Version in `manifest.json` is correct
