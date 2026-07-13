/* Dev harness: load the real engine files in a shared VM context and run verdicts. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ctx = { console: console };
ctx.self = ctx;
ctx.module = {};
vm.createContext(ctx);

["arb-data.js", "accuracy.js", "seasonality.js", "matcher.js", "forecast.js", "deal.js", "ledger.js"].forEach((f) => {
  const src = fs.readFileSync(path.join("extension", f), "utf8");
  vm.runInContext(src, ctx, { filename: f });
});

const TESTS = [
  { brand: "J.Crew", title: "Cashmere crewneck sweater", buyPrice: 49, msrp: 168, host: "jcrew.com" },
  { brand: "J.Crew", title: "Short-sleeve cashmere-linen blend sweater", buyPrice: 138, msrp: null, host: "jcrew.com" },
  { brand: "J.Crew Factory", title: "Factory waffle cotton sweater", buyPrice: 25, msrp: 90, host: "factory.jcrew.com" },
  { brand: "J.Crew", title: "Cotton crewneck sweater", buyPrice: 40, msrp: 98, host: "jcrew.com" },
  { brand: "The North Face", title: "Men's 1996 Retro Nuptse 700 Jacket Medium Black", buyPrice: 110, msrp: 330, host: "thenorthface.com" },
  { brand: "The North Face", title: "Men's Nuptse Jacket XXL", buyPrice: 150, msrp: 330, host: "thenorthface.com" },
  { brand: "Smith", title: "I/O Mag Snow Goggles ChromaPop", buyPrice: 60, msrp: 260, host: "" },
  { brand: "Patagonia", title: "Better Sweater 1/4 Zip Fleece Medium", buyPrice: 35, msrp: 159, host: "patagonia.com" },
  { brand: "Lululemon", title: "Define Jacket", buyPrice: 60, msrp: 128, host: "" },
  { brand: "Arc'teryx", title: "Arc'teryx Beta LT Jacket Men's Large", buyPrice: 120, msrp: 500, host: "rei.com" },
  { brand: "Carhartt", title: "Carhartt Detroit Jacket Brown Large", buyPrice: 55, msrp: 140, host: "" },
  { brand: "Canada Goose", title: "Canada Goose Expedition Parka Black L", buyPrice: 400, msrp: 1295, host: "" },
  { brand: "Sorel", title: "Sorel Caribou Boots Men's Size 10", buyPrice: 45, msrp: 200, host: "" }
];
ctx.TESTS = TESTS;

const code = `JSON.stringify(TESTS.map(function(it){
  var mr = ARB_MATCH.match(it);
  var r = ARB_FORECAST.evaluate(it, mr, new Date(2026,5,15));
  var d = ARB_DEAL.score(it, mr, r, new Date(2026,5,15));
  return {
    item: it.title.slice(0,38),
    archetype: r.archetypeLabel || "(none)",
    verdict: r.verdict,
    deal: d.grade + (d.score!=null?" ("+d.score+")":""),
    dealHead: d.headline,
    headline: r.headline,
    maxBuy: r.maxBuy != null ? Math.round(r.maxBuy) : null,
    resale: r.resaleMedian ? Math.round(r.resaleMedian) : null,
    profit: r.profitRange ? r.profitRange.map(function(x){return Math.round(x)}) : null,
    sell: r.timing ? r.timing.sellWindow : null,
    nuances: (r.nuances||[]).map(function(n){return n.text.slice(0,46)})
  };
}), null, 2)`;

const rows = JSON.parse(vm.runInContext(code, ctx));
rows.forEach(function (r) {
  console.log(
    "FLIP " + (r.verdict + "        ").slice(0, 8) +
    "| DEAL " + (r.deal + "          ").slice(0, 11) +
    "| " + (r.item + " ".repeat(34)).slice(0, 34) +
    "| " + (r.dealHead || "")
  );
});
