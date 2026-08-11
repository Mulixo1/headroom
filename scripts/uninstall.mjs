#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const bin = path.join(ROOT, "bin", "headroom.mjs");

console.log("▸ Uninstalling Headroom (autostart + menubar + local config)");
const res = spawnSync(process.execPath, [bin, "service", "uninstall"], {
  cwd: ROOT,
  encoding: "utf8",
  env: process.env,
});
if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);
process.exit(res.status === 0 ? 0 : 1);
