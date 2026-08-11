import test from "node:test";
import assert from "node:assert/strict";
import { serviceStatus, renderLaunchAgentPlist } from "../src/core/service.js";

test("service status has expected fields", () => {
  const s = serviceStatus();
  assert.equal(typeof s.launchAgentPath, "string");
  assert.equal(typeof s.appEntry, "string");
  assert.equal(typeof s.nodePath, "string");
});

test("launch agent plist contains start command", () => {
  const xml = renderLaunchAgentPlist({
    nodePath: "/usr/bin/node",
    entry: "/tmp/headroom/bin/headroom.mjs",
  });
  assert.match(xml, /com\.headroom\.app/);
  assert.match(xml, /headroom\.mjs/);
  assert.match(xml, /<string>start<\/string>/);
});
