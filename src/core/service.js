import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureDir, expandHome, headroomHome, defaultSwiftBarPluginDir } from "./paths.js";
import { dependencyReport } from "./deps.js";
import { ROOT } from "./paths.js";

const LABEL = "com.headroom.app";

export function launchAgentPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
}

export function nodeBinary() {
  // Prefer absolute current node path for launchd stability.
  return process.execPath;
}

export function appEntry() {
  return path.join(ROOT, "bin", "headroom.mjs");
}

export function logsDir() {
  const dir = path.join(headroomHome(), "logs");
  ensureDir(dir);
  return dir;
}

export function renderLaunchAgentPlist({ nodePath = nodeBinary(), entry = appEntry() } = {}) {
  const outLog = path.join(logsDir(), "stdout.log");
  const errLog = path.join(logsDir(), "stderr.log");
  // Keep XML minimal and deterministic.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${entry}</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>StandardOutPath</key>
  <string>${outLog}</string>
  <key>StandardErrorPath</key>
  <string>${errLog}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
`;
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8" });
}

export function isLaunchAgentInstalled() {
  return fs.existsSync(launchAgentPath());
}

export function installLaunchAgent() {
  if (process.platform !== "darwin") {
    return { ok: false, error: "LaunchAgent is macOS-only" };
  }
  const plistPath = launchAgentPath();
  ensureDir(path.dirname(plistPath));
  const body = renderLaunchAgentPlist();
  fs.writeFileSync(plistPath, body, { mode: 0o644 });

  // unload first (ignore errors), then bootstrap/load
  run("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath]);
  // older macOS fallback
  run("launchctl", ["unload", plistPath]);
  let loaded = run("launchctl", ["bootstrap", `gui/${process.getuid()}`, plistPath]);
  if (loaded.status !== 0) {
    loaded = run("launchctl", ["load", "-w", plistPath]);
  }
  // kickstart
  run("launchctl", ["kickstart", "-k", `gui/${process.getuid()}/${LABEL}`]);
  return {
    ok: loaded.status === 0,
    path: plistPath,
    label: LABEL,
    error: loaded.status === 0 ? null : (loaded.stderr || loaded.stdout || "launchctl load failed"),
  };
}

export function uninstallLaunchAgent() {
  if (process.platform !== "darwin") {
    return { ok: true, skipped: true };
  }
  const plistPath = launchAgentPath();
  run("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath]);
  run("launchctl", ["unload", "-w", plistPath]);
  if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
  return { ok: true, path: plistPath, label: LABEL };
}

export function removeSwiftBarPlugins(pluginDir) {
  const dir = expandHome(pluginDir || defaultSwiftBarPluginDir());
  const removed = [];
  if (!fs.existsSync(dir)) return { dir, removed };
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith("headroom-") || !name.endsWith(".sh")) continue;
    const full = path.join(dir, name);
    try {
      fs.unlinkSync(full);
      removed.push(full);
    } catch {}
  }
  return { dir, removed };
}

export function uninstallAll({ removeConfig = true } = {}) {
  const launch = uninstallLaunchAgent();
  const plugins = removeSwiftBarPlugins();
  let configRemoved = false;
  if (removeConfig) {
    const home = headroomHome();
    // only remove Headroom home contents we own
    try {
      if (fs.existsSync(home)) {
        fs.rmSync(home, { recursive: true, force: true });
        configRemoved = true;
      }
    } catch {}
  }
  return {
    ok: true,
    launch,
    plugins,
    configRemoved,
  };
}

export function serviceStatus() {
  return {
    platform: process.platform,
    launchAgentInstalled: isLaunchAgentInstalled(),
    launchAgentPath: launchAgentPath(),
    appEntry: appEntry(),
    nodePath: nodeBinary(),
    headroomHome: headroomHome(),
    deps: dependencyReport(),
  };
}
