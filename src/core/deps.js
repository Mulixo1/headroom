import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { defaultSwiftBarPluginDir, expandHome } from "./paths.js";

const SWIFTBAR_DOWNLOAD = "https://github.com/swiftbar/SwiftBar/releases/latest";
const SWIFTBAR_SITE = "https://swiftbar.app";

function exists(p) {
  try { return Boolean(p && fs.existsSync(p)); } catch { return false; }
}

function commandPath(cmd) {
  const res = spawnSync("/bin/bash", ["-lc", "command -v " + cmd], { encoding: "utf8" });
  if (res.status !== 0) return null;
  const p = String(res.stdout || "").trim().split(/\r?\n/)[0] || "";
  return p || null;
}

function candidateSwiftBarApps() {
  return [
    "/Applications/SwiftBar.app",
    path.join(os.homedir(), "Applications", "SwiftBar.app"),
    "/Applications/SwiftBar/SwiftBar.app",
  ];
}

export function detectBrew() {
  const p = commandPath("brew");
  return { installed: Boolean(p), path: p };
}

export function detectSwiftBar() {
  if (process.platform !== "darwin") {
    return {
      installed: false, running: false, appPath: null,
      pluginDir: defaultSwiftBarPluginDir(), pluginDirExists: false,
      downloadUrl: SWIFTBAR_DOWNLOAD, siteUrl: SWIFTBAR_SITE,
      reason: "SwiftBar is macOS-only",
    };
  }
  let appPath = null;
  for (const c of candidateSwiftBarApps()) {
    if (exists(c)) { appPath = c; break; }
  }
  if (!appPath) {
    const md = spawnSync("mdfind", ["kMDItemCFBundleIdentifier == 'com.ameba.SwiftBar'"], { encoding: "utf8" });
    const hit = String(md.stdout || "").trim().split(/\r?\n/).filter(Boolean)[0];
    if (hit && exists(hit)) appPath = hit;
  }
  let running = false;
  const ps = spawnSync("pgrep", ["-x", "SwiftBar"], { encoding: "utf8" });
  if (ps.status === 0 && String(ps.stdout || "").trim()) running = true;
  const pluginDir = defaultSwiftBarPluginDir();
  return {
    installed: Boolean(appPath), running, appPath, pluginDir,
    pluginDirExists: exists(expandHome(pluginDir)),
    downloadUrl: SWIFTBAR_DOWNLOAD, siteUrl: SWIFTBAR_SITE,
    reason: appPath ? null : "SwiftBar app not found",
  };
}

export function openSwiftBarApp(appPath) {
  if (!appPath) return { ok: false, error: "SwiftBar app path missing" };
  const res = spawnSync("open", ["-a", appPath], { encoding: "utf8" });
  return { ok: res.status === 0, error: res.status === 0 ? null : (res.stderr || res.stdout || "failed to open SwiftBar") };
}

export function installSwiftBarWithBrew() {
  if (process.platform !== "darwin") return { ok: false, error: "SwiftBar install is macOS-only" };
  const brew = detectBrew();
  if (!brew.installed) {
    return { ok: false, error: "Homebrew not found", hint: "Install Homebrew from https://brew.sh or install SwiftBar manually", downloadUrl: SWIFTBAR_DOWNLOAD };
  }
  const res = spawnSync(brew.path, ["install", "--cask", "swiftbar"], { encoding: "utf8" });
  const out = (String(res.stdout || "") + "\n" + String(res.stderr || "")).trim();
  const detected = detectSwiftBar();
  if (detected.installed) {
    openSwiftBarApp(detected.appPath);
    return { ok: true, method: "homebrew-cask", output: out.slice(-2000), swiftbar: detected };
  }
  return { ok: false, error: "brew install finished but SwiftBar not detected", output: out.slice(-2000), downloadUrl: SWIFTBAR_DOWNLOAD };
}

export function dependencyReport() {
  const brew = detectBrew();
  const swiftbar = detectSwiftBar();
  return {
    platform: process.platform, node: process.version, brew, swiftbar,
    readyForMenubar: Boolean(swiftbar.installed),
    notes: ["Headroom service and panel work without SwiftBar", "Menubar chips require SwiftBar"],
  };
}
