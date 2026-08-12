import test from "node:test";
import assert from "node:assert/strict";
import { listProviders, getProvider } from "../src/providers/index.js";
import { loadConfig } from "../src/store/config-store.js";

test("cursor provider is registered", () => {
  const ids = listProviders().map((p) => p.id);
  assert.ok(ids.includes("cursor-usage"));
  assert.equal(getProvider("cursor-usage")?.title, "Cursor");
});

test("default config includes cursor account", () => {
  const cfg = loadConfig();
  const providers = cfg.accounts.map((a) => a.provider);
  assert.ok(providers.includes("cursor-usage"));
});
