/*
 * ArbSZN WATCHLIST — standing buy-trigger sheet, derived from the live engine.
 * For every seeded archetype it asks the real forecast engine: "what clearance price
 * clears the 30% margin bar?" (= maxBuy). That's your trigger price — when you see the
 * item on clearance below it, it's worth a hard look. Also shows which archetypes can
 * actually reach a BUY (two-season anchor / liquid) vs. cap at MAYBE, and which are in
 * their clearance-buy window RIGHT NOW. Re-run any time: node watchlist.js
 */
const fs = require("fs"); const vm = require("vm"); const path = require("path");
const ctx = { console: console }; ctx.self = ctx; ctx.module = {};
vm.createContext(ctx);
["arb-data.js", "accuracy.js", "seasonality.js", "matcher.js", "forecast.js", "deal.js", "ledger.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join("extension", f), "utf8"), ctx, { filename: f }));
const ARB_DATA = ctx.ARB_DATA, ARB_MATCH = ctx.ARB_MATCH, ARB_FORECAST = ctx.ARB_FORECAST;

const NOW = new Date(2026, 5, 15);
function pad(s, n) { s = String(s == null ? "" : s); return (s + " ".repeat(n)).slice(0, n); }
function p$(n) { return n == null ? "—" : "$" + Math.round(n); }

const rows = [];
const avoid = [];
ARB_DATA.archetypes.forEach((a) => {
  if (a.category === "outlet" || a.outletTrap) return;
  const token = (a.match && a.match.modelAny && a.match.modelAny[0]) || "";
  const item = { brand: a.brand || "", title: ((a.brand || "") + " " + token).trim() || a.label, buyPrice: null, msrp: null, host: "", url: "", size: "" };
  const mr = ARB_MATCH.match(item);
  const r = ARB_FORECAST.evaluate(item, mr, NOW);
  if (a.avoidReason) { avoid.push({ label: a.label, reason: a.avoidReason }); return; }
  if (r.resaleMedian == null || r.maxBuy == null) return;
  rows.push({
    label: a.label,
    cat: a.category,
    resale: r.resaleMedian,
    buyBelow: r.maxBuy,
    conf: r.confidenceLabel,
    anchored: !!(r.projection && r.projection.anchored),
    buyEligible: !!r.buyEligible,
    sell: r.timing ? r.timing.sellWindow : "—",
    inBuyNow: !!(r.timing && r.timing.inBuyWindowNow),
  });
});

rows.sort((x, y) => (y.buyEligible - x.buyEligible) || (y.anchored - x.anchored) || (y.resale - x.resale));

console.log("\n=== ArbSZN WATCHLIST — buy-trigger prices (live engine, " + NOW.toISOString().slice(0, 10) + ") ===");
console.log("Tracking " + rows.length + " archetypes. \"Buy below\" = clearance price that clears the " +
  Math.round(ARB_FORECAST.TARGET_ROI * 100) + "% margin bar. ★ = in its clearance-buy window NOW.\n");
console.log(pad("archetype", 32) + pad("resale", 8) + pad("BUY BELOW", 11) + pad("conf", 7) + pad("ceiling", 14) + pad("sell window", 26) + "season");
console.log("-".repeat(104));
rows.forEach((r) => {
  const ceiling = r.buyEligible ? (r.anchored ? "BUY (anchor)" : "BUY (liquid)") : "MAYBE max";
  console.log(
    pad(r.label, 32) + pad(p$(r.resale), 8) + pad(p$(r.buyBelow), 11) + pad(r.conf, 7) +
    pad(ceiling, 14) + pad(r.sell, 26) + (r.inBuyNow ? "★ now" : ""));
});
if (avoid.length) {
  console.log("\nAVOID (structural — never auto-buy):");
  avoid.forEach((a) => console.log("  • " + a.label + " — " + a.reason.slice(0, 80)));
}
const buyable = rows.filter((r) => r.buyEligible).length;
const inSeason = rows.filter((r) => r.inBuyNow).length;
console.log("\n" + buyable + " of " + rows.length + " can reach a true BUY (the rest cap at MAYBE). " +
  inSeason + " are in their clearance-buy window today.");
console.log("Reminder: a price under \"buy below\" is a SIGNAL to verify comps, not an auto-buy — low-confidence rows still gate to SKIP.\n");
