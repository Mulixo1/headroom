import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, updateSettings, getDefaultConfig } from "../src/store/config-store.js";
import { remainingFromUsed, roundPct } from "../src/core/math.js";

test("default locale is system", () => {
  const d = getDefaultConfig();
  assert.equal(d.settings.locale, "system");
});

test("host is forced local", () => {
  const cfg = updateSettings({ host: "0.0.0.0", port: 8787 });
  assert.equal(cfg.settings.host, "127.0.0.1");
});

test("remaining math", () => {
  assert.equal(roundPct(remainingFromUsed(40)), 60);
  assert.equal(roundPct(remainingFromUsed(0)), 100);
});

test("loadConfig returns gpt+x+cursor buckets", () => {
  const cfg = loadConfig();
  const providers = cfg.accounts.map((a) => a.provider);
  assert.ok(providers.includes("chatgpt-wham"));
  assert.ok(providers.includes("xai-credits"));
  const cursor = cfg.accounts.filter((a) => a.provider === "cursor-usage");
  assert.equal(cursor.length, 2);
  assert.deepEqual(cursor.map((a) => a.metric).sort(), ["api", "auto"]);
});
