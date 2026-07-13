# ArbSZN — clearance → resale verdict (working prototype)

Built overnight 2026-06-15. On a clearance product page it shows a **conservative,
comp-backed Buy / Maybe / Skip verdict**: projected resale band, net profit after
eBay fees + shipping, a max-buy price, and best buy/sell windows — for the seeded
categories (premium winter outerwear, fleece, snow accessories, and J.Crew).

This is a **real prototype, not a finished product.** Read "What's real vs.
scaffolded" before judging it.

---

## Load it (2 minutes)

1. Open Chrome → `chrome://extensions`
2. Toggle **Developer mode** (top-right) ON
3. Click **Load unpacked** → select the `extension/` folder in this project
4. Pin "ArbSZN" from the puzzle-piece menu

**Try it two ways:**
- **Popup (works anywhere):** click the toolbar icon → type a brand + title + a
  clearance price (e.g. `J.Crew` / `Cashmere crewneck sweater` / `49`) → **Get verdict.**
- **On a real page:** visit a J.Crew product page (e.g. a sweater or jacket under
  `/p/...`). A verdict card appears bottom-right. Other supported hosts: thenorthface,
  patagonia, columbia, backcountry, REI, Target, Nordstrom Rack, factory.jcrew.

---

## Why this exists — the backtest that justified building it

Before writing any code I tested the load-bearing assumption ("last winter's
archetype resale price predicts this winter's") against **real eBay Terapeak SOLD
data**, two full winters (Oct 2024–Feb 2025 vs Oct 2025–Feb 2026), volume-weighted
median, noise-filtered:

| Archetype | last winter | this winter | YoY |
|---|---|---|---|
| Patagonia Down Sweater | $180 | $185 | +2.8% |
| TNF Nuptse | $189 | $181 | −4.0% |
| Smith I/O Mag | $100 | $104 | +3.6% |
| Oakley Flight Deck | $108 | $110 | +1.8% |
| Burton Cartel | $96 | $100 | +4.2% |
| Patagonia Better Sweater | $82 | $94 | +14% (mix shift) |

5 of 6 archetypes moved **under ±4% YoY** at realistic prices. Low-volume archetypes
(Anon M4, Burton) were noisier — which is why confidence is gated on comp volume.
J.Crew showed a clean **5× mainline↔outlet spread** (cashmere $107 vs Factory $20),
which the nuance layer detects. Every seeded number in `extension/arb-data.js` came
from those pulls.

**This backtest is now reproducible and wired into the engine.** Run
`node backtest-walkforward.js`: it stands at the end of last winter knowing only that
winter's median, projects this winter out-of-sample, and scores it against what actually
happened — **5/6 within ±8%, median miss 4.0%** — then prints the live forward forecast so
you can watch the gate reserve "Buy" for the archetypes that actually held (Nuptse, Down
Sweater, Oakley) and withhold it from the volatile (Better Sweater +14.6%), thin-volume
(Smith), and wide-variant (Burton Cartel) ones.

---

## What's real vs. scaffolded

**Real and working now:**
- Page parsing (J.Crew price selectors verified on the live DOM; JSON-LD/OpenGraph/
  generic fallbacks for other retailers)
- Archetype matching + nuance rules (outlet/Factory phantom-MSRP detection, premium
  sub-line, material, size-extreme penalty)
- Forecast engine: net profit after eBay fees + shipping, ROI, conservative max-buy,
  confidence gating, Buy/Maybe/Skip — validated end-to-end (`node engine-test.js`)
- **Accuracy layer** (`extension/accuracy.js`) — the part you'd pay for:
  - **Same-window YoY projection.** Anchors on *last winter's same window* (Oct–Feb), not a
    summer comp × a multiplier. With only two seasons it treats YoY as a *volatility* signal,
    not a trend to extrapolate — the drift carried forward is heavily damped and clamped (one
    YoY delta is one observation).
  - **Volatility-widened bands + calibrated confidence.** Each archetype's confidence combines
    match quality, comp volume, band width, YoY volatility, and whether a real same-window
    anchor exists. Volatile / thin / unanchored ⇒ lower.
  - **Two-tier BUY gate.** "Buy" is reserved for archetypes we can stand behind: a two-season
    anchor that held (low volatility), *or* a very-liquid, tight-band, high-confidence
    archetype. Everything else caps at "Maybe." This is what makes it *reliably right where it
    speaks, quiet elsewhere.*
  - **Time-to-sell in the annualized ROI** — illiquid items are penalized for the weeks of
    capital lockup they actually cost, killing false "Buy"s on thin comps.
- **Track record / reconciliation loop** (`extension/ledger.js`) — logs every Buy/Maybe it
  stands behind, lets you enter the real sold price later (popup → Track record), and computes
  an auditable calibration: in-band rate, median miss, Buy hit-rate. Starts empty; never
  pre-populated. This ledger *is* the proof a premium forecast is sold on.
- **Tighter matching** — condition (NWT vs used/open-box, with a resale haircut for used) and a
  wide-variant warning (e.g. "Cartel" spans many model-years) that caps confidence until the
  exact sub-model/year is pinned
- **Deal Score** (the frugal "should I keep it?" view): grades the clearance
  Great/Good/Fair/Wait/Weak using the **resale-value anchor** (new clearance price vs.
  what it sells for *used*), markdown-cadence timing, and outlet phantom-MSRP detection —
  **no affiliate feeds, no price-history vendor.** Shown beside the Flip verdict, and it
  rightly diverges (e.g. a $110 Nuptse is flip-Skip but keep-Great). When it has **no
  resale comp** for an item it now *abstains* (mirrors the Flip side's silence) — or, for a
  genuinely deep cut (≥50% off), grades on discount depth alone *clearly labeled as
  unverified* — rather than defaulting to a hollow "Fair." (Caught and fixed via the live
  pressure-test below.)
- **Flip / Deal / Both toggle** (card header + popup): frugal users can hide the
  reseller math, resellers can hide the deal view. The choice persists and the card
  and popup stay in sync
- Seasonal best buy/sell windows + holding period
- **28 seeded archetypes** from real eBay sold data: 24 winter (outerwear, fleece, snow
  accessories, winter boots, J.Crew) from the Terapeak winter pull, plus **4 non-winter**
  (Dakine luggage, adidas/New-Balance footwear, 100% optics) added from live eBay-sold
  comps during the June clearance scan — including a Canada Goose "avoid: counterfeit
  minefield" flag instead of a bogus price. The non-winter four are single-season
  (unanchored, confidence "low") and cap at MAYBE by design until a prior season is pulled
- **5 retailers**: J.Crew (DOM-verified) + REI, Target, Nordstrom Rack, Backcountry
  (JSON-LD-first + known price selectors)
- Popup manual-lookup tool

**Scaffolded (clearly marked, drop-in):**
- **AI nuance layer** — works as rules today. For the LLM upgrade, paste an Anthropic
  API key in the popup and click **"Test AI on the item above"** to confirm a live
  Claude-Haiku round-trip; `background.js` then enriches verdicts on real pages too.
  Keys live only in your browser's local storage (sent only to api.anthropic.com).
  Without a key it's simply off.
- **Live data in production** — the seeded DB is a cached snapshot. Items not in it
  fall back to a one-click "view eBay sold comps" deep-link (user-assisted). A live
  sold-data feed is the ToS-gated piece we discussed — deliberately not wired.

**Scaffolded / needs live data (clearly marked):**
- **Saturation early-warning.** The one accuracy signal that needs a *live* pull (active-listing
  growth vs. sold velocity) — deliberately not faked. It's the natural next Terapeak hook; the
  confidence model already has the slot for it.
- **Track-record calibration** is real code but only becomes *meaningful* once you reconcile
  real outcomes over a season. It ships empty on purpose.

**Known limits / tuning knobs:**
- Accuracy knobs live at the top of `accuracy.js` (`DRIFT_CARRY`, `DRIFT_CLAMP`, `VOL_BUY_MAX`,
  `BUY_CONF_*`, `BAND_TIGHT`) — all documented. They're set conservative.
- Conservatism is also set by `TARGET_ROI` (0.30) in `forecast.js`. A $110 Nuptse (~26% ROI on
  the projection) reads SKIP on margin; the same archetype at ~$90 reaches BUY because it's a
  two-season-anchored, low-volatility comp. That split is the gate working as intended.
- Two-season anchors are seeded for 6 archetypes (the ones with verified Season A→B pulls). The
  other 18 forecast at reduced confidence and **cannot reach an anchored Buy** until their prior
  winter is pulled — honest by construction. Adding history is a one-line `history` block per
  archetype in `arb-data.js`.
- Burton Cartel ("Cartel" spans many model-years) now self-demotes to ~0.40 confidence → SKIP
  until the title pins a sub-model/year. Working as intended, not a bug.
- J.Crew price selectors are DOM-verified; REI/Target/Nordstrom Rack/Backcountry use
  JSON-LD + known selectors (they wall automated testing but render normally in a real
  browsing session) — confirm live and tweak `RETAILER_PROFILES` in `parsers.js` if a
  price reads wrong.

---

## File map

```
extension/
  manifest.json     MV3 config
  arb-data.js       seeded comp DB + category seasonality + 2-season history (real eBay data)
  accuracy.js       same-window YoY projection, volatility, liquidity, calibrated confidence + BUY gate
  seasonality.js    buy/sell windows, holding period, seasonal multiplier
  matcher.js        archetype match + nuance rules (outlet/material/size/condition/variant)
  forecast.js       scoring: profit, max-buy, confidence, Buy/Maybe/Skip
  deal.js           Deal Score (frugal "keep it?" view, resale-anchored, no affiliate)
  ledger.js         forecast track-record + reconciliation/calibration math
  parsers.js        page extraction (JSON-LD/OG/__NEXT_DATA__/retailer profiles)
  content.js        orchestrator + injected overlay card
  overlay.css       card styles
  popup.html/js     manual lookup tool + AI key setting + track record
  background.js     optional Claude-Haiku nuance enrichment
engine-test.js          dev harness: runs the engine on sample items (node engine-test.js)
backtest-walkforward.js out-of-sample YoY proof + live forward gate (node backtest-walkforward.js)
live-test.js            live pressure-test: 42 real scraped Backcountry clearance items through the engine
live-test-winter.js     live winter true-positive check on real TheNorthFace.com items
june-scan.js            dated clearance scan: real items + real eBay sold comps -> engine verdicts (watchlist trigger prices)
watchlist.js            standing buy-trigger sheet: every archetype's "buy below" price from the live engine (node watchlist.js)
```

*Estimates only — past eBay sold prices don't guarantee future results. Not financial advice.*
