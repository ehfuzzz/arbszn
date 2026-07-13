/*
 * Walk-forward backtest — does "last winter's same-window median predict this
 * winter's?" hold, and is our confidence/gating calibrated to it?
 *
 * For every archetype that has two real same-window seasons (Oct–Feb 2024-25 vs
 * 2025-26) we do an honest out-of-sample check:
 *   - Stand at the END of Season A knowing ONLY Season A's median.
 *   - Project Season B = Season A median ± this archetype's typical spread
 *     (no drift — one observation is not a trend).
 *   - Score it against what Season B ACTUALLY did.
 * Then we print the LIVE forward forecast (next winter) with the volatility,
 * calibrated confidence, and BUY-eligibility the shipped engine now produces —
 * so you can see the gate reserve BUY for the archetypes that actually held.
 *
 * Finally we push the out-of-sample outcomes through the real ARB_LEDGER stats
 * math, proving the calibration the product will show users is computed the same
 * way here.  Run:  node backtest-walkforward.js
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ctx = { console: console };
ctx.self = ctx;
ctx.module = {};
vm.createContext(ctx);
["arb-data.js", "accuracy.js", "seasonality.js", "matcher.js", "forecast.js", "deal.js", "ledger.js"].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join("extension", f), "utf8"), ctx, { filename: f });
});

const ARB_DATA = ctx.ARB_DATA, ARB_ACCURACY = ctx.ARB_ACCURACY, ARB_LEDGER = ctx.ARB_LEDGER;

function pct(x) { return (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%"; }
function pad(s, n) { s = String(s); return (s + " ".repeat(n)).slice(0, n); }

const withHistory = ARB_DATA.archetypes.filter(
  (a) => a.history && a.history.seasons && a.history.seasons.length >= 2 && a.resale.median > 0
);

console.log("\n=== WALK-FORWARD: forecast Season B from Season A (out-of-sample) ===");
console.log(pad("archetype", 26) + pad("A med", 8) + pad("proj band", 16) + pad("B actual", 10) + pad("in-band", 9) + "err");

const TOL = 0.08;
const ledgerRecords = [];
let inBand = 0, n = 0, withinTol = 0;
withHistory.forEach((a) => {
  const seasons = a.history.seasons;
  const A = seasons[0].median;
  const Bactual = seasons[seasons.length - 1].median;
  const relLow = a.resale.p25 / a.resale.median;
  const relHigh = a.resale.p75 / a.resale.median;
  const projMed = A;
  const projLow = Math.round(A * relLow), projHigh = Math.round(A * relHigh);
  const hit = Bactual >= projLow && Bactual <= projHigh;
  const err = Math.abs(Bactual - projMed) / projMed;
  if (hit) inBand++; if (err <= TOL) withinTol++; n++;
  console.log(
    pad(a.label, 26) + pad("$" + A, 8) + pad("$" + projLow + "-$" + projHigh, 16) +
    pad("$" + Bactual, 10) + pad(hit ? "yes" : "NO", 9) + pct(err)
  );
  ledgerRecords.push({
    id: a.id + "@A", archetypeId: a.id, label: a.label, verdict: "MAYBE",
    projMedian: projMed, projLow: projLow, projHigh: projHigh,
    feeRate: ARB_DATA.meta.feeRate, feeFixed: ARB_DATA.meta.feeFixed, shipping: a.shippingEst,
    buyPrice: null, actualPrice: Bactual
  });
});
console.log("-".repeat(70));
console.log("Band coverage: " + inBand + "/" + n + " fell within last-year ± seeded spread (strict; tight bands under-cover).");
console.log("YoY stability: " + withinTol + "/" + n + " moved within ±" + Math.round(TOL * 100) + "% of last year's median — the assumption the product rests on.");

console.log("\n=== LIVE forward forecast (next winter) — what the shipped gate now does ===");
console.log(pad("archetype", 26) + pad("anchor", 9) + pad("proj med", 10) + pad("YoY vol", 9) + pad("conf", 7) + "BUY-eligible");
withHistory.forEach((a) => {
  const proj = ARB_ACCURACY.project(a);
  const conf = ARB_ACCURACY.confidence(a, "model", proj);
  const gate = ARB_ACCURACY.gate(a, proj, conf);
  console.log(
    pad(a.label, 26) +
    pad("$" + Math.round(a.resale.median), 9) +
    pad("$" + Math.round(proj.median), 10) +
    pad((proj.vol != null ? (proj.vol * 100).toFixed(1) + "%" : "—"), 9) +
    pad(conf.toFixed(2), 7) +
    (gate.buyEligible ? "YES (" + gate.path + ")" : "no — " + gate.reason)
  );
});

console.log("\n=== LEDGER calibration math (same code the popup shows) ===");
const stats = ARB_LEDGER.computeStats(ledgerRecords);
console.log("logged=" + stats.logged + " reconciled=" + stats.reconciled +
  " in-band=" + (stats.inBandRate != null ? Math.round(stats.inBandRate * 100) + "%" : "—") +
  " median-miss=" + (stats.medianAbsErrPct != null ? (stats.medianAbsErrPct * 100).toFixed(1) + "%" : "—"));
console.log("");
