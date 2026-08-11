import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, "../..");

export function expandHome(input = "") {
  if (!input) return input;
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

export function headroomHome() {
  const env = process.env.HEADROOM_HOME?.trim();
  if (env) return expandHome(env);

  // Prefer OS user config dir so clones never write secrets into the repo tree.
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Headroom");
  }
  if (process.platform === "win32") {
    const base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(base, "Headroom");
  }
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  if (xdg) return path.join(expandHome(xdg), "headroom");
  return path.join(os.homedir(), ".config", "headroom");
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function defaultSwiftBarPluginDir() {
  const env = process.env.SWIFTBAR_PLUGIN_DIR?.trim();
  if (env) return expandHome(env);
  return path.join(os.homedir(), "Library/Application Support/SwiftBar/Plugins");
}
