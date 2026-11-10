# Chrome Web Store listing — v1.1.0

Paste these into the developer dashboard → Store listing. Plain text: the store does not render Markdown, so copy the description block as-is.

## Name
Comes from `manifest.json`: **Volume Booster — Loud & Clear**

## Summary (manifest `description`, 122 of 132 characters)
Turn any tab up to 600% without the crackle. Voice, Bass and Night modes. No ads, no tracking, nothing leaves your device.

## Description

```
Too quiet? Turn any Chrome tab up to 600%, without the crackle.

Volume Booster — Loud & Clear makes quiet videos, weak laptop speakers and hard-to-hear calls louder. Click the knob icon, turn it up, and hear the change as you turn. A built-in limiter catches the peaks, so the sound gets louder instead of distorted.

HOW TO USE
1. Click the knob icon on the tab that's too quiet.
2. Turn the knob: drag, scroll or use the arrow keys.
3. That's it. The boost stays on that tab until you reset it.

MODES
• Voice: clearer dialogue in films, quiet people on calls, lectures
• Bass: more low end for small laptop speakers
• Night: evens out loud and quiet scenes

ALSO
• Clean boost: a built-in limiter stops crackle at high levels
• Fullscreen keeps working while a tab is boosted
• The toolbar icon shows the boost level of the tab
• Go below 100% to turn one noisy tab down
• Light and dark themes follow your system

WORKS ON
YouTube, Netflix, Spotify, Twitch, Google Meet and Zoom in the browser, podcasts, online courses and any site that plays sound. Chrome doesn't allow extensions to capture sound on its own pages, such as Settings or the Chrome Web Store.

PRIVATE BY DESIGN
All sound processing happens on your device. No account, no ads, no analytics, no browsing history. The code is open on GitHub.

PERMISSIONS, IN PLAIN WORDS
• activeTab: works only on the tab you open it on
• tabCapture: takes that tab's sound so it can be made louder on your device
• offscreen: runs the sound processing in the background
• scripting: adds a small helper to the boosted tab so fullscreen keeps working
• windows: switches the window to fullscreen when a video asks for it
• storage: remembers your settings, on your device

A NOTE ON VOLUME
Very loud sound for a long time can harm your hearing. Turn it up only as far as you need.

Help: https://aiadict.github.io/volboost/help.html
```

## Other fields
| Field | Value |
|---|---|
| Category | Accessibility (unchanged) |
| Language | English (United States) |
| Homepage URL | https://aiadict.github.io/volboost/ |
| Support URL | https://aiadict.github.io/volboost/help.html |
| Privacy policy URL | https://aiadict.github.io/volboost/privacy-policy.html (unchanged) |

## Graphics (render with `node render-scenes.mjs`, files land in `out/store/`)
| Slot | File | Size |
|---|---|---|
| Screenshot 1 | `screenshot-1-boost.png` | 1280×800 |
| Screenshot 2 | `screenshot-2-limiter.png` | 1280×800 |
| Screenshot 3 | `screenshot-3-modes.png` | 1280×800 |
| Screenshot 4 | `screenshot-4-fullscreen.png` | 1280×800 |
| Screenshot 5 | `screenshot-5-privacy.png` | 1280×800 |
| Small promo tile | `tile-small.png` | 440×280 |
| Marquee promo tile | `tile-marquee.png` | 1400×560 |
| Store icon | `../icons/icon128.png` | 128×128 |

Delete the three old screenshots (raw browser captures) when uploading these.

## Promo video
`node record.mjs` builds `out/video/promo.mp4` (36 s, 1080p, with soundtrack) and three GIFs (`knob.gif`, `limiter.gif`, `modes.gif`). Upload the MP4 to YouTube (public or unlisted), then paste the YouTube link into the dashboard's "Promo video" field.

Suggested YouTube title: **Volume Booster — Loud & Clear: make any Chrome tab louder (up to 600%)**
Suggested description: the summary line above, plus the store link.
