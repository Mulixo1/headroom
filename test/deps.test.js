import test from "node:test";
import assert from "node:assert/strict";
import { dependencyReport, detectBrew, detectSwiftBar } from "../src/core/deps.js";

test("dependency report shape", () => {
  const d = dependencyReport();
  assert.equal(typeof d.platform, "string");
  assert.equal(typeof d.node, "string");
  assert.equal(typeof d.brew.installed, "boolean");
  assert.equal(typeof d.swiftbar.installed, "boolean");
  assert.equal(typeof d.readyForMenubar, "boolean");
});

test("detect helpers return objects", () => {
  assert.equal(typeof detectBrew().installed, "boolean");
  assert.equal(typeof detectSwiftBar().downloadUrl, "string");
});
