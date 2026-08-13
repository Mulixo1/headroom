import fs from "node:fs";
import path from "node:path";
import { ensureDir, expandHome, headroomHome } from "../core/paths.js";

const SUPPORTED_PROVIDERS = new Set(["chatgpt-wham", "xai-credits", "cursor-usage"]);

const DEFAULT_ACCOUNTS = [
  {
    id: "gpt-main",
    provider: "chatgpt-wham",
    label: "GPT",
    enabled: true,
    menubar: true,
    showInBar: true,
    showInDetail: true,
    order: 10,
    auth: {
      mode: "file",
      path: "~/.codex/auth.json",
      jsonPath: "tokens.access_token",
    },
  },
  {
    id: "x-main",
    provider: "xai-credits",
    label: "x",
    enabled: true,
    menubar: true,
    showInBar: true,
    showInDetail: true,
    order: 20,
    auth: {
      mode: "file",
      path: "~/.grok/auth.json",
      jsonPath: "",
    },
  },
  {
    id: "cursor-auto",
    provider: "cursor-usage",
    metric: "auto",
    label: "Cursor Auto",
    enabled: true,
    menubar: true,
    showInBar: true,
    showInDetail: true,
    order: 30,
    auth: {
      mode: "file",
      path: "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb",
      jsonPath: "",
    },
  },
  {
    id: "cursor-api",
    provider: "cursor-usage",
    metric: "api",
    label: "Cursor API",
    enabled: true,
    menubar: true,
    showInBar: true,
    showInDetail: true,
    order: 31,
    auth: {
      mode: "file",
      path: "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb",
      jsonPath: "",
    },
  },
];

const DEFAULT_CONFIG = {
  version: 1,
  settings: {
    host: "127.0.0.1",
    port: 8787,
    refreshSeconds: 30,
    showUsedInDropdown: true,
    menubarMode: "detail",
    menubarJoin: " · ",
    menubarEmptyTitle: "HR",
    locale: "system",
    swiftbarPluginDir: "",
  },
  accounts: DEFAULT_ACCOUNTS,
};

function configPath() {
  return path.join(headroomHome(), "config.json");
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function sanitizeHost(host) {
  const h = String(host || "127.0.0.1").trim().toLowerCase();
  // Local-only by design. Do not allow binding to public interfaces.
  if (h === "127.0.0.1" || h === "localhost" || h === "::1") return h === "localhost" ? "127.0.0.1" : h;
  return "127.0.0.1";
}

function sanitizePort(port) {
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) return 8787;
  return n;
}

function sanitizeSettings(settings = {}) {
  const next = {
    ...DEFAULT_CONFIG.settings,
    ...settings,
  };
  next.host = sanitizeHost(next.host);
  next.port = sanitizePort(next.port);
  next.refreshSeconds = Math.max(15, Math.min(3600, Number(next.refreshSeconds) || 30));
  next.menubarMode = next.menubarMode === "compact" ? "compact" : "detail";
  next.menubarJoin = String(next.menubarJoin ?? " · ").slice(0, 16);
  next.menubarEmptyTitle = String(next.menubarEmptyTitle || "HR").slice(0, 24);
  const locale = String(next.locale || "system").toLowerCase();
  next.locale = locale === "en" || locale === "tr" || locale === "system" ? locale : "system";
  next.swiftbarPluginDir = String(next.swiftbarPluginDir || "").slice(0, 500);
  next.showUsedInDropdown = next.showUsedInDropdown !== false;
  return next;
}

function cursorMetric(account) {
  if (account?.provider !== "cursor-usage") return null;
  if (account.metric === "api" || account.id === "cursor-api") return "api";
  return "auto";
}

function accountSlot(account) {
  if (account?.provider === "cursor-usage") return "cursor-usage:" + cursorMetric(account);
  return account?.provider || "";
}

function normalizeAccount(account) {
  const provider = account?.provider;
  if (!SUPPORTED_PROVIDERS.has(provider)) return null;
  const metric = cursorMetric({ ...account, provider });
  const slot = accountSlot({ ...account, provider, metric });
  const base =
    DEFAULT_ACCOUNTS.find((a) => accountSlot(a) === slot) ||
    DEFAULT_ACCOUNTS.find((a) => a.provider === provider) ||
    {};
  const id = account.id || base.id;
  return {
    ...base,
    ...account,
    provider,
    id,
    metric: provider === "cursor-usage" ? metric : undefined,
    label:
      provider === "cursor-usage" && (!account.label || account.label === "Cursor")
        ? (metric === "api" ? "Cursor API" : "Cursor Auto")
        : (account.label || base.label),
    enabled: account.enabled !== false,
    menubar: account.menubar !== false,
    showInBar: account.showInBar != null ? !!account.showInBar : account.menubar !== false,
    showInDetail: account.showInDetail != null ? !!account.showInDetail : true,
    order: Number.isFinite(Number(account.order)) ? Number(account.order) : base.order || 100,
    auth: {
      mode: "file",
      path: account?.auth?.path || base.auth?.path || "",
      jsonPath: account?.auth?.jsonPath ?? base.auth?.jsonPath ?? "",
    },
  };
}

function ensureCoreAccounts(accounts) {
  const next = [];
  const seen = new Set();
  for (const raw of accounts || []) {
    const acc = normalizeAccount(raw);
    if (!acc) continue;
    const slot = accountSlot(acc);
    if (seen.has(slot)) continue;
    seen.add(slot);
    next.push(acc);
  }
  for (const def of DEFAULT_ACCOUNTS) {
    const slot = accountSlot(def);
    if (!seen.has(slot)) {
      next.push(deepClone(def));
      seen.add(slot);
    }
  }
  next.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  return next;
}

export function loadConfig() {
  ensureDir(headroomHome());
  const file = configPath();
  if (!fs.existsSync(file)) {
    const cfg = deepClone(DEFAULT_CONFIG);
    cfg.settings = sanitizeSettings(cfg.settings);
    saveConfig(cfg);
    return cfg;
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const cfg = {
    ...deepClone(DEFAULT_CONFIG),
    ...raw,
    settings: sanitizeSettings({
      ...DEFAULT_CONFIG.settings,
      ...(raw.settings || {}),
    }),
    accounts: ensureCoreAccounts(Array.isArray(raw.accounts) ? raw.accounts : []),
  };
  try {
    const prev = JSON.stringify(raw);
    const now = JSON.stringify(cfg);
    if (prev !== now) saveConfig(cfg);
  } catch {
    saveConfig(cfg);
  }
  return cfg;
}

export function saveConfig(config) {
  const home = headroomHome();
  ensureDir(home);
  const file = configPath();
  const cleaned = {
    version: 1,
    settings: sanitizeSettings(config.settings || {}),
    accounts: ensureCoreAccounts(config.accounts || []),
  };
  // Unique tmp avoids parallel-test races (ENOENT on rename).
  const tmp = path.join(
    home,
    `config.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  fs.writeFileSync(tmp, JSON.stringify(cleaned, null, 2));
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    // Fallback for rare FS races on some CI runners.
    try {
      fs.writeFileSync(file, JSON.stringify(cleaned, null, 2));
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
    if (!fs.existsSync(file)) throw err;
  }
  return cleaned;
}

export function upsertAccount(account) {
  const cfg = loadConfig();
  const normalized = normalizeAccount(account);
  if (!normalized) throw new Error("Only GPT, x, and Cursor providers are supported");
  const idx = cfg.accounts.findIndex((a) => a.id === normalized.id || accountSlot(a) === accountSlot(normalized));
  if (idx >= 0) {
    normalized.id = cfg.accounts[idx].id;
    cfg.accounts[idx] = { ...cfg.accounts[idx], ...normalized, id: cfg.accounts[idx].id };
  } else {
    cfg.accounts.push(normalized);
  }
  cfg.accounts = ensureCoreAccounts(cfg.accounts);
  return saveConfig(cfg);
}

export function removeAccount(id) {
  const cfg = loadConfig();
  const acc = cfg.accounts.find((a) => a.id === id);
  if (!acc) return cfg;
  acc.showInBar = false;
  acc.showInDetail = false;
  acc.menubar = false;
  return saveConfig(cfg);
}

export function updateSettings(patch) {
  const cfg = loadConfig();
  cfg.settings = sanitizeSettings({ ...cfg.settings, ...patch });
  return saveConfig(cfg);
}

export function resolveAuthPath(p) {
  return expandHome(p);
}

export function listSupportedProviders() {
  return [...SUPPORTED_PROVIDERS];
}

export function getDefaultConfig() {
  return deepClone(DEFAULT_CONFIG);
}
