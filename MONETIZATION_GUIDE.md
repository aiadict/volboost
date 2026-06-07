# Monetization Guide — Volume Booster

This guide covers the full monetization strategy: when to add paid features, how to set up payments, and what the technical changes look like.

---

## Phase 1: Launch Free (Current State)

**Do this first. Do not add paid features until you have traction.**

Target milestones before adding paid tier:
- 500+ active users
- 50+ ratings with 4.3+ average
- At least 4 weeks of live data

Why launch free first?
- Chrome users are reluctant to pay for unknown extensions
- You need reviews and ratings to show up in search results
- A free extension with 500 users and 50 good reviews is worth more than a paid extension with 10 users and no reviews
- You'll learn what users actually want in the paid tier from their reviews and feedback

---

## Phase 2: Add the Pro Tier

When you hit the milestones above, add these paid features:

**Free tier keeps:**
- Volume boost 100%–600%
- Works on all sites
- No account required

**Pro tier adds ($4.99 one-time OR $1.99/month):**
- Per-site memory (remembers your setting for youtube.com, spotify.com, etc.)
- 3 presets: Movie Mode (boosted, bass up), Music Mode (balanced), Voice Mode (mid-range boost)
- Bass boost slider
- Visual equalizer (bass / mid / treble)

One-time pricing ($4.99) is recommended for a volume booster — it removes the subscription friction and matches user expectations for a simple utility.

---

## Payment Setup: Lemon Squeezy

Lemon Squeezy is the recommended payment processor because:
- Handles EU VAT and taxes automatically (Merchant of Record)
- Built-in license key system
- Simple setup (no coding required for the payment page)
- No monthly fee — they take a percentage per sale (~5% + payment processing)

### Create your Lemon Squeezy account

1. Go to https://www.lemonsqueezy.com
2. Sign up for a free account
3. Complete identity verification (they need ID for payment processing — standard requirement)

### Create your product

1. In Lemon Squeezy dashboard → **Products** → **New Product**
2. Name: `Volume Booster Pro`
3. Price: `$4.99` (one-time purchase)
4. Enable **License Keys**: yes
   - License key activation limit: `3` (allows user to use on 3 Chrome profiles)
   - License key expiry: `Never`
5. Save the product
6. Copy the **Store URL** for this product — this goes in your extension's upgrade button

### Update the upgrade button URL

In `popup/popup.html`, find this line:
```html
href="https://your-lemon-squeezy-link.com"
```
Replace the URL with your actual Lemon Squeezy product page URL.

---

## Implementing License Key Validation

When you're ready to add the paid tier, here are the code changes needed:

### 1. Add a license key input to the popup

In `popup.html`, add below the pro banner:

```html
<div class="license-section" id="licenseSection" style="display:none">
  <input type="text" id="licenseKey" placeholder="Enter license key..." />
  <button id="activateBtn">Activate Pro</button>
</div>
```

### 2. Validate the license key via Lemon Squeezy API

Lemon Squeezy provides a license validation endpoint. Add this to `popup.js`:

```javascript
async function activateLicense(key) {
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: key,
        instance_name: 'Chrome Extension'
      })
    });

    const data = await response.json();

    if (data.activated) {
      await chrome.storage.local.set({ proLicense: key, proActive: true });
      showProUI();
      showStatus('Pro activated! Thank you.', false);
    } else {
      showStatus('Invalid or already-used license key.', true);
    }
  } catch (e) {
    showStatus('Could not validate key. Check your internet.', true);
  }
}
```

### 3. Check pro status on popup open

In the `init()` function, add:

```javascript
const stored = await chrome.storage.local.get('proActive');
if (stored.proActive) {
  showProUI(); // show extended slider (up to 600%)
}
```

### 4. Restrict the free slider max

While in free mode, set slider max to 200 (still useful, just not the full 600%):

```javascript
if (!stored.proActive) {
  slider.max = 200;
  // Show "Upgrade for 600%" label
}
```

---

## Alternative: Search Traffic Monetization

This is the model from the webinar — no paid tier needed at all.

Instead of charging users, you earn money when users search through your extension's search integration.

**How it works:**
1. Add a "New Tab" override that replaces Chrome's new tab page
2. Include a search bar powered by a partner search feed (Yahoo, Bing)
3. Every search query earns you $15–$50 per 1,000 searches
4. With 1,000 active users averaging 6 searches/day = ~$2,000–$5,000/month

**Setup:**
1. Apply to a search distribution network: **Coinis** (coinis.com), **System1**, or **Perion**
2. They provide a search API endpoint
3. You replace the Chrome new tab page with a clean page containing your search bar
4. The search bar routes queries through their API

**Chrome policy requirements (mandatory):**
- The new tab override must be disclosed clearly on the extension's store page
- User must explicitly approve it during installation (Chrome prompts automatically)
- The search bar must be clearly labeled
- You cannot change the default search engine in the address bar without user approval

**Which to choose: Pro tier or search traffic?**

| | Pro Tier ($4.99) | Search Traffic |
|---|---|---|
| Revenue per user | $4.99 (once) | ~$2–5/month ongoing |
| Complexity | Low | Medium |
| Risk | Low | Medium (policy compliance) |
| Best for | Utility tools | High-volume consumer tools |

For Volume Booster: **Pro tier first**, search traffic later if/when you scale to 10,000+ users.

---

## Revenue Projections

Conservative model after adding pro tier:

| Users | Conversion | Price | Annual Revenue |
|---|---|---|---|
| 1,000 | 3% | $4.99 | ~$1,800 |
| 5,000 | 3% | $4.99 | ~$9,000 |
| 10,000 | 3% | $4.99 | ~$17,900 |
| 20,000 | 3% | $4.99 | ~$35,800 |
| 50,000 | 3% | $4.99 | ~$89,500 |

Target: 20,000 users at 3% conversion = ~$36,000/year. Achievable in 12–18 months with good SEO and reviews.

---

## Tracking Revenue Without Analytics

Since the extension has no tracking, use Lemon Squeezy's built-in dashboard for:
- Total sales
- Revenue over time
- License activations by date

For Chrome Web Store stats (installs, active users, ratings):
- Go to https://chrome.google.com/webstore/devconsole
- Your extension's page shows weekly active users, installs, uninstalls, and ratings

Check these weekly. The key metrics to watch:
1. **Weekly active users** — are people installing AND using it?
2. **Uninstall rate** — are people leaving? (if >20%, investigate why)
3. **Rating trend** — are reviews positive?

---

## Pricing Experiments

After 3 months of sales data, consider:
- Does $4.99 feel too cheap? Try $7.99 — conversion may drop slightly but revenue may go up
- Does $4.99 have low conversion? Try $2.99 — lower barrier, more buyers
- A/B test is not possible in Chrome Web Store (single listing), so change price and observe for 30 days

---

## Tax Considerations

Lemon Squeezy acts as the "Merchant of Record" — they handle:
- EU VAT collection and remittance
- US sales tax in relevant states
- International tax compliance

You receive payouts already net of taxes. Keep records of Lemon Squeezy payouts for your local income tax filing. Consult a local accountant for specifics.
