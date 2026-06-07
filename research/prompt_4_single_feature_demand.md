# Chrome Extension Single-Feature Demand Research

## Context & Goal

This research follows a specific micro-SaaS methodology for Chrome extension launches:

1. Find a large market where successful extensions already exist (proven demand)
2. Extract **one single feature** from a successful competitor
3. Validate that the specific feature has **consistent, non-zero organic search demand** in Google
4. Build only that one feature as a standalone extension — fast, focused, monetisable

The goal of this research is to identify **10–15 single-feature opportunities** where:
- The parent extension is successful (10,000+ active users)
- The isolated feature has its own meaningful, consistent search demand
- No dominant standalone tool already owns that specific keyword niche
- A solo developer can build it in 4–8 weeks

Revenue target: **$10,000–$50,000/year**. Primary market: **USA and English-speaking countries**.

---

## The Demand Validation Method — Apply This to Every Candidate

The core validation tool is **Google Trends** (set to United States, Last 12 months).

**The benchmark system:**
- `site blocker` = the low-end benchmark. Represents a moderate but real and consistent search volume. A feature keyword that stays consistently above or near this level is viable.
- `adblocker` = the high-end benchmark. Represents very large search volume. Features that compete at this level have massive demand but also more competition.

**A feature keyword PASSES validation if:**
- It has a consistent, non-zero trend line over 12 months in the US
- It does not repeatedly drop to zero (sporadic interest = not viable)
- It holds at or above `site blocker` level on a sustained basis
- It shows stable or growing trend (not sharply declining)

**A feature keyword FAILS validation if:**
- It repeatedly drops to zero or near-zero
- It had one spike but has since died
- It is too broad/generic (e.g. "AI assistant") — these are dominated by major brands
- It contains brand names that users only search because of an existing dominant product

For every feature you identify, **explicitly state whether it PASSES or FAILS** this Google Trends validation, and explain what the trend looks like.

---

## Extensions to Analyse — Candidate Pool

Research the following categories of Chrome extensions. For each, identify the **3–5 most successful extensions** (by active user count) and break down their individual features:

### Category 1: Productivity & Tab Management
Examples of extensions to analyse: tab managers, focus/distraction blockers, session savers, tab groupers, screenshot tools.
Feature extraction examples: "save all tabs," "block distracting websites," "screenshot full page," "group tabs by domain."

### Category 2: Writing & Text Tools
Examples: grammar checkers, text expanders, autocomplete tools, word counters, readability checkers.
Feature extraction examples: "word count any webpage," "text snippet expander," "readability score checker," "highlight and copy formatted text."

### Category 3: SEO & Marketing Tools
Examples: on-page SEO checkers, broken link detectors, meta tag viewers, SERP preview tools, UTM builders.
Feature extraction examples: "check broken links on page," "view meta tags," "preview Google search result," "build UTM tracking link."

### Category 4: Developer Utilities
Examples: colour pickers, JSON formatters, CSS inspectors, cookie editors, local storage viewers.
Feature extraction examples: "pick colour from any webpage," "format JSON response," "edit cookies in browser," "view page response headers."

### Category 5: Research & Reading
Examples: web highlighters, read-later tools, annotation tools, web clippers, page summarisers.
Feature extraction examples: "highlight text on webpage," "save article to read later," "extract all links from page," "copy all text from webpage."

### Category 6: Video & Media
Examples: YouTube tools (speed control, screenshot, transcript), volume boosters, picture-in-picture managers, subtitle tools.
Feature extraction examples: "download YouTube thumbnail," "take screenshot of video frame," "increase browser volume beyond 100%," "get YouTube video transcript."

### Category 7: E-commerce & Shopping
Examples: price trackers, coupon finders, Amazon product analysers, Shopify store inspectors.
Feature extraction examples: "track price drop on Amazon," "find discount codes automatically," "check product review history," "see Shopify store theme."

### Category 8: Privacy & Security
Examples: password managers (lightweight), tracker blockers, cookie cleaners, HTTPS checkers.
Feature extraction examples: "delete all cookies for this site," "block tracking pixels," "check if site uses HTTPS," "see who is tracking you on this page."

---

## Output Format — For Each Feature Opportunity

Find 10–15 validated single-feature opportunities. Present each in this exact format:

---

**Feature Name:** [short, descriptive name of the isolated feature]
**Parent Extension(s):** [which successful extension(s) this feature is taken from — include user count]
**Category:** [which of the 8 categories above]

**What the feature does (one sentence):**
[Describe exactly what the standalone tool would do — as simple and specific as possible]

**Search Demand Validation:**
- Primary keyword tested: [e.g. "broken link checker"]
- Google Trends result vs site blocker benchmark: [PASSES / FAILS — describe the trend shape]
- Secondary keywords with demand: [list 2–3 alternative phrasings that also show demand]
- Overall demand verdict: [Strong / Moderate / Weak — with one sentence explanation]

**Standalone Tool Concept:**
[Describe what the extension would be — one focused feature, nothing more. What does the user do, what happens, what do they get?]

**Existing Standalone Competition:**
- Are there already dedicated extensions that do ONLY this feature? [Yes/No]
- If yes: name the top 2–3, their user counts, ratings, and last update dates
- Competitive gap: [Is there a clear opening, or is the space already served well?]

**Build Complexity:**
- Solo developer time estimate: [days / weeks]
- Key technical challenge: [one sentence on the hardest part]
- Manifest V3 compatible: [Yes / straightforward / requires workaround]

**Monetisation Path:**
- Primary model: [Freemium subscription / One-time purchase / Search traffic revenue / Ad-supported]
- Free tier: [what is free]
- Paid tier: [what unlocks at $X/month or one-time $X]
- Realistic annual revenue estimate: [show the math — MAU assumption × conversion rate × price]

**Launch Channel:**
[One specific community, subreddit, or channel where this feature's target user already gathers]

**Red Flags:**
[Any risk: Chrome policy concern, platform dependency, native browser feature competition, ethical issue]

---

## Special Section: Search Traffic Monetisation Candidates

In a separate section, identify **3–5 features** that are specifically suitable for **search engine traffic monetisation** — where the extension changes a default browser behaviour (search engine, homepage, new tab page) and the developer earns revenue by directing search queries through a partner search engine (e.g. via distributors like Digital Turbine / Bing Ads distribution network).

For each candidate:
- Describe the feature (what default behaviour it changes)
- Confirm it is compliant with Chrome Web Store policies (no deceptive installation, user-initiated change only)
- Estimate potential RPM (revenue per 1,000 searches) based on published industry ranges ($5–$50/RPM depending on country and query type)
- Estimate monthly search volume from realistic active user base
- Calculate realistic monthly and annual revenue

Note: flag any candidate where the search traffic model may conflict with Chrome policy.

---

## Final Ranking

After all briefs, rank the full list of 10–15 opportunities by:

1. **Demand strength** — how consistent and large is the search volume?
2. **Competition gap** — is the standalone niche genuinely open?
3. **Build speed** — can a solo developer ship v1 in under 6 weeks?
4. **Revenue clarity** — is the monetisation path obvious and proven?

Label the top 5 as **Green Light** and any with significant concerns as **Yellow**.

For the top 3 Green Light picks, provide:
- A suggested Chrome Web Store title (max 45 characters)
- A suggested short description (max 132 characters)
- 3 target keywords for store SEO

---

## Hard Constraints

- Every feature must be validated against Google Trends — do not include features with no confirmed search demand
- Do not include features that require scraping personal data or violate Chrome Web Store policies
- Do not include features already dominated by a well-funded standalone product with 500,000+ users
- Do not include features where a native browser function (Chrome, Edge, Safari) already does this out of the box for free with no friction
- Focus exclusively on the US English-speaking market for demand validation
- Every revenue estimate must show explicit assumptions — no unsupported numbers
- Build time must be realistic for a solo developer — do not include features requiring ML model training, proprietary data pipelines, or real-time server infrastructure in the free tier
