/*
 * JUNE-2026 LIVE CLEARANCE SCAN — "prove what's on sale now"
 * Real items pulled from Backcountry's sale (2026-06-15) + real eBay SOLD comps
 * pulled the same day. The four archetypes below are now SEEDED in arb-data.js
 * (luggage/footwear/optics), so this just runs the actual matcher + forecast on the
 * real clearance prices. Every resale number came from eBay sold listings, not a guess.
 * Run: node june-scan.js
 */
const fs = require("fs"); const vm = require("vm"); const path = require("path");
const ctx = { console: console }; ctx.self = ctx; ctx.module = {};
vm.createContext(ctx);
["arb-data.js", "accuracy.js", "seasonality.js", "matcher.js", "forecast.js", "deal.js", "ledger.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join("extension", f), "utf8"), ctx, { filename: f }));
const ARB_DATA = ctx.ARB_DATA, ARB_MATCH = ctx.ARB_MATCH, ARB_FORECAST = ctx.ARB_FORECAST, ARB_DEAL = ctx.ARB_DEAL;

const ITEMS = [
  ["Dakine", "Split Roller 110L Gear Bag", 207, 318],
  ["Adidas TERREX", "Terrex Agravic Speed Ultra 2 Trail Running Shoe - Men's", 158, 225],
  ["100%", "Speedcraft Sunglasses", 128, 190],
  ["New Balance", "9060 Shoe", 120, 160],
];
const NOW = new Date(2026, 5, 15);
function pad(s, n) { s = String(s == null ? "" : s); return (s + " ".repeat(n)).slice(0, n); }

console.log("\n=== JUNE 2026 LIVE CLEARANCE SCAN (real items + real eBay sold comps) ===");
console.log(pad("item", 34) + pad("clear", 7) + pad("eBay sold med", 14) + pad("net@med", 9) + pad("maxBuy", 8) + "VERDICT");
let buy = 0, maybe = 0, skip = 0;
ITEMS.forEach(([brand, title, buyPrice, msrp]) => {
  const item = { brand, title, buyPrice, msrp, host: "backcountry.com", url: "", size: "" };
  const mr = ARB_MATCH.match(item);
  const r = ARB_FORECAST.evaluate(item, mr, NOW);
  const v = r.verdict;
  if (v === "BUY") buy++; else if (v === "MAYBE") maybe++; else skip++;
  const netMed = r.netResaleMid != null ? "$" + Math.round(r.netResaleMid) : "—";
  console.log(
    pad(title.slice(0, 33), 34) + pad("$" + buyPrice, 7) +
    pad(r.resaleMedian ? "$" + Math.round(r.resaleMedian) + " [" + Math.round(r.resaleBand[0]) + "-" + Math.round(r.resaleBand[1]) + "]" : "—", 14) +
    pad(netMed, 9) + pad(r.maxBuy != null ? "$" + Math.round(r.maxBuy) : "—", 8) + v);
  console.log("   " + (r.reason || r.headline || ""));
});
console.log("-".repeat(78));
console.log("Result: " + buy + " BUY · " + maybe + " MAYBE · " + skip + " SKIP   (of " + ITEMS.length + " real clearance items)");
console.log("Fee model: " + (ARB_DATA.meta.feeRate * 100).toFixed(2) + "% + $" + ARB_DATA.meta.feeFixed + "/sale, target ROI " + Math.round(ARB_FORECAST.TARGET_ROI * 100) + "%.");
console.log("");
