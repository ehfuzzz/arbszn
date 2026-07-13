/* LIVE winter true-positive test: real current TheNorthFace.com items (scraped 2026-06-15)
 * Confirms the engine SPEAKS correctly where it should + Deal Score behaves WITH a comp.
 * Last row is a hypothetical clearance-priced Nuptse (labeled) to show the SPEAK path.
 * Run: node live-test-winter.js
 */
const fs = require("fs"); const vm = require("vm"); const path = require("path");
const ctx = { console: console }; ctx.self = ctx; ctx.module = {};
vm.createContext(ctx);
["arb-data.js", "accuracy.js", "seasonality.js", "matcher.js", "forecast.js", "deal.js", "ledger.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join("extension", f), "utf8"), ctx, { filename: f }));
const ARB_MATCH = ctx.ARB_MATCH, ARB_FORECAST = ctx.ARB_FORECAST, ARB_DEAL = ctx.ARB_DEAL;

const ITEMS = [
  ["The North Face", "Men's 1996 Retro Nuptse Jacket", 380, 380, "REAL — full price, no markdown"],
  ["The North Face", "Men's 1996 Retro Nuptse Vest", 260, 260, "REAL — full price"],
  ["The North Face", "Women's Nuptse Short Jacket", 280, 280, "REAL — full price"],
  ["The North Face", "Men's Cedar Trail Grid Fleece 1/4-Zip", 56, 80, "REAL — 30% off (on sale)"],
  ["The North Face", "Men's Antora Jacket", 130, 130, "REAL — rain shell, off-archetype"],
  ["The North Face", "Men's 1996 Retro Nuptse Jacket Medium", 120, 330, "HYPOTHETICAL clearance — should SPEAK"],
];
const NOW = new Date(2026, 5, 15);
ITEMS.forEach(([brand, title, buyPrice, msrp, note]) => {
  const item = { brand, title, buyPrice, msrp, host: "thenorthface.com", url: "", size: "" };
  const mr = ARB_MATCH.match(item);
  const r = ARB_FORECAST.evaluate(item, mr, NOW);
  let d = {}; try { d = ARB_DEAL.score(item, mr, r, NOW); } catch (e) {}
  console.log("\n" + title + "  ($" + buyPrice + (msrp && msrp !== buyPrice ? " / $" + msrp : "") + ")   [" + note + "]");
  console.log("  archetype : " + (r.archetypeLabel || "— none —") + (r.confidenceLabel ? " (" + r.confidenceLabel + " conf)" : ""));
  console.log("  FLIP      : " + r.verdict + (r.resaleMedian ? "  resale ~$" + Math.round(r.resaleMedian) + " [$" + Math.round(r.resaleBand[0]) + "-$" + Math.round(r.resaleBand[1]) + "]  maxBuy $" + Math.round(r.maxBuy) : "") + (r.headline ? "  — " + r.headline : ""));
  console.log("  DEAL      : " + d.grade + (d.score != null ? " (" + d.score + ")" : "") + "  — " + (d.headline || ""));
  if (d.reasons && d.reasons.length) d.reasons.forEach(x => console.log("              · " + x.text.slice(0, 96)));
  if (r.projection) console.log("  proj      : anchored=" + r.projection.anchored + " vol=" + (r.projection.vol != null ? (r.projection.vol * 100).toFixed(1) + "%" : "—") + " buyEligible=" + r.buyEligible);
});
console.log("");
