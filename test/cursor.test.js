import test from "node:test";
import assert from "node:assert/strict";
import { listProviders, getProvider } from "../src/providers/index.js";
import { loadConfig } from "../src/store/config-store.js";
import { cursorUsedPercent, normalizeCursorMetric } from "../src/providers/cursor-usage.js";
import { remainingFromUsed, roundPct } from "../src/core/math.js";

test("cursor provider is registered", () => {
  const ids = listProviders().map((p) => p.id);
  assert.ok(ids.includes("cursor-usage"));
  assert.equal(getProvider("cursor-usage")?.title, "Cursor");
});

test("default config includes both cursor buckets", () => {
  const cfg = loadConfig();
  const cursor = cfg.accounts.filter((a) => a.provider === "cursor-usage");
  assert.equal(cursor.length, 2);
  const metrics = cursor.map((a) => a.metric).sort();
  assert.deepEqual(metrics, ["api", "auto"]);
  assert.ok(cursor.every((a) => a.showInBar && a.showInDetail));
});

test("cursor auto and api remaining percents are separate", () => {
  const planUsage = { autoPercentUsed: 5, apiPercentUsed: 14, totalPercentUsed: 30 };
  assert.equal(normalizeCursorMetric({ id: "cursor-auto" }), "auto");
  assert.equal(normalizeCursorMetric({ id: "cursor-api" }), "api");
  assert.equal(roundPct(cursorUsedPercent(planUsage, "auto")), 5);
  assert.equal(roundPct(cursorUsedPercent(planUsage, "api")), 14);
  assert.equal(roundPct(remainingFromUsed(cursorUsedPercent(planUsage, "auto"))), 95);
  assert.equal(roundPct(remainingFromUsed(cursorUsedPercent(planUsage, "api"))), 86);
});
