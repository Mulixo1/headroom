#!/usr/bin/env node
/**
 * Copyright (c) 2026 Mulixo
 * SPDX-License-Identifier: MIT
 */
import { spawn } from "node:child_process";
import { loadConfig } from "../src/store/config-store.js";
import { fetchAccountQuota } from "../src/providers/index.js";
import { startServer } from "../src/server/http.js";
import { syncSwiftBarPlugins } from "../src/swiftbar/generate.js";
import {
  ensureLaunchAgentHealthy,
  installLaunchAgent,
  serviceStatus,
  uninstallAll,
} from "../src/core/service.js";

function printHelp() {
  console.log(`Headroom

Usage:
  headroom start                 Start localhost panel/API
  headroom open                  Open panel in browser
  headroom quota                 Print remaining quotas
  headroom sync-swiftbar         Generate SwiftBar plugins
  headroom service install       Install/enable background service + login autostart
  headroom service repair        Repair and re-enable background service
  headroom service status        Show background service status
  headroom service uninstall     Remove background service + menubar + local config
  headroom help

One-click setup:
  node scripts/install.mjs
`);
}

async function cmdQuota() {
  const cfg = loadConfig();
  const accounts = cfg.accounts.filter((a) => a.enabled);
  for (const account of accounts) {
    const q = await fetchAccountQuota(account);
    if (q.error) console.log(`${q.label}: ERROR ${q.error}`);
    else console.log(`${q.label}: remaining ${q.remainingPercent}% (used ${q.usedPercent}%) reset=${q.resetAt || "—"}`);
  }
}

async function cmdSync() {
  const cfg = loadConfig();
  const host = "127.0.0.1";
  const port = cfg.settings.port || 8787;
  const result = syncSwiftBarPlugins({
    config: cfg,
    endpoint: `http://${host}:${port}`,
  });
  console.log(`SwiftBar plugins synced: ${result.count}`);
  console.log(`Dir: ${result.dir}`);
  for (const f of result.written) console.log(` - ${f}`);
}

async function cmdStart() {
  try {
    const { url } = await startServer();
    console.log(`Headroom running at ${url}`);
    console.log("Background service managed by LaunchAgent (survives logout/login).");
  } catch (err) {
    if (err?.code === "HEADROOM_ALREADY_RUNNING" || /EADDRINUSE|already running/i.test(String(err?.message || err))) {
      console.log("Headroom already running in background.");
      console.log("Dashboard: http://127.0.0.1:8787");
      console.log("Status: node bin/headroom.mjs service status");
      process.exit(0);
    }
    throw err;
  }

  const keepAlive = setInterval(() => {}, 1 << 30);
  const shutdown = (signal) => {
    clearInterval(keepAlive);
    console.log(`\nHeadroom stopped (${signal})`);
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  await new Promise(() => {});
}

async function cmdOpen() {
  const cfg = loadConfig();
  const url = `http://127.0.0.1:${cfg.settings.port || 8787}`;
  if (process.platform === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" });
  else console.log(url);
}

async function cmdService(sub) {
  if (sub === "install") {
    const res = installLaunchAgent();
    if (!res.ok) {
      console.error(res.error || "install failed");
      process.exit(1);
    }
    console.log(`Autostart installed: ${res.path}`);
    return;
  }
  if (sub === "repair") {
    const res = ensureLaunchAgentHealthy();
    console.log(JSON.stringify(res, null, 2));
    if (!res.ok) process.exit(1);
    return;
  }
  if (sub === "status") {
    console.log(JSON.stringify(serviceStatus(), null, 2));
    return;
  }
  if (sub === "uninstall") {
    const res = uninstallAll({ removeConfig: true });
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  printHelp();
  process.exit(1);
}

const args = process.argv.slice(2);
const [cmd = "help", sub] = args;

const map = {
  start: cmdStart,
  open: cmdOpen,
  quota: cmdQuota,
  "sync-swiftbar": cmdSync,
  service: () => cmdService(sub),
  help: printHelp,
  "--help": printHelp,
};

const fn = map[cmd];
if (!fn) {
  printHelp();
  process.exit(1);
}
await fn();
