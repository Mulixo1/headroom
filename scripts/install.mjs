#!/usr/bin/env node
/**
 * One-click local installer for Headroom.
 * Hybrid dependency policy:
 * - Headroom service/autostart/plugin: automatic
 * - SwiftBar: detect; optional Homebrew install if approved/flagged
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  dependencyReport,
  detectSwiftBar,
  installSwiftBarWithBrew,
  openSwiftBarApp,
} from "../src/core/deps.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const bin = path.join(ROOT, "bin", "headroom.mjs");

function log(msg) { console.log(`▸ ${msg}`); }
function fail(msg) { console.error(`✖ ${msg}`); process.exit(1); }

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) fail(`Node.js 20+ required (found ${process.version})`);
if (process.platform !== "darwin") {
  log("Warning: full menubar + autostart experience is macOS-focused.");
}

try { fs.chmodSync(bin, 0o755); } catch {}

const args = process.argv.slice(2);
const noStart = args.includes("--no-start");
const noOpen = args.includes("--no-open");
const noAutostart = args.includes("--no-autostart");
const withSwiftBar = args.includes("--with-swiftbar");
const noSwiftBarPrompt = args.includes("--no-swiftbar-prompt");

function run(cmdArgs) {
  const res = spawnSync(process.execPath, [bin, ...cmdArgs], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status === 0;
}

function askYesNo(question, defaultYes = true) {
  if (!process.stdin.isTTY) return defaultYes;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const hint = defaultYes ? "Y/n" : "y/N";
  return new Promise((resolve) => {
    rl.question(`${question} [${hint}] `, (answer) => {
      rl.close();
      const a = String(answer || "").trim().toLowerCase();
      if (!a) return resolve(defaultYes);
      resolve(a === "y" || a === "yes");
    });
  });
}

log("Headroom one-click setup");
log(`Install root: ${ROOT}`);

// 1) deps report
const deps = dependencyReport();
log(`Node: ${deps.node}`);
log(`SwiftBar: ${deps.swiftbar.installed ? "found" : "missing"}${deps.swiftbar.running ? " (running)" : ""}`);
log(`Homebrew: ${deps.brew.installed ? "found" : "missing"}`);

// 2) optional SwiftBar install
if (process.platform === "darwin" && !deps.swiftbar.installed) {
  let shouldInstall = withSwiftBar;
  if (!shouldInstall && !noSwiftBarPrompt) {
    log("Menubar requires SwiftBar (third-party app).");
    shouldInstall = await askYesNo("Install SwiftBar now via Homebrew?", true);
  }
  if (shouldInstall) {
    log("Installing SwiftBar via Homebrew cask...");
    const res = installSwiftBarWithBrew();
    if (res.ok) log("SwiftBar installed");
    else {
      log(`SwiftBar auto-install skipped/failed: ${res.error || "unknown"}`);
      if (res.downloadUrl) log(`Manual download: ${res.downloadUrl}`);
    }
  } else {
    log("Continuing without SwiftBar. Panel will still work; menubar needs SwiftBar later.");
    log(`Download: ${deps.swiftbar.downloadUrl}`);
  }
} else if (deps.swiftbar.installed && !deps.swiftbar.running) {
  log("Starting SwiftBar...");
  openSwiftBarApp(deps.swiftbar.appPath);
}

// 3) Headroom config + plugin
run(["quota"]);
run(["sync-swiftbar"]);

// 4) autostart
if (!noAutostart && process.platform === "darwin") {
  log("Installing login autostart (LaunchAgent)...");
  if (!run(["service", "install"])) {
    log("Autostart install failed. Retry: node bin/headroom.mjs service install");
  } else {
    log("Autostart enabled (survives logout/login)");
  }
}

if (noStart) {
  log("Setup complete.");
  log("Start now: node bin/headroom.mjs start");
  process.exit(0);
}

// 5) ensure service up
const health = spawnSync("curl", ["-s", "http://127.0.0.1:8787/api/health"], { encoding: "utf8" });
const up = health.status === 0 && (health.stdout || "").includes('"ok":true');
if (!up) {
  log("Starting Headroom service...");
  const child = spawn(process.execPath, [bin, "start"], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

setTimeout(() => {
  const sb = detectSwiftBar();
  if (!noOpen && process.platform === "darwin") {
    spawn("open", ["http://127.0.0.1:8787"], { detached: true, stdio: "ignore" }).unref();
  }
  log("Done. Panel: http://127.0.0.1:8787");
  if (sb.installed) log("Menubar ready via SwiftBar. No terminal needed after setup.");
  else log("Panel ready. Install SwiftBar later for menubar chips.");
  process.exit(0);
}, 1000);
