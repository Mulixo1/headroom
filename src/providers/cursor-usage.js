import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { remainingFromUsed, roundPct, formatReset } from "../core/math.js";
import { nowIso } from "./utils.js";

export function normalizeCursorMetric(account) {
  if (account?.metric === "api" || account?.id === "cursor-api") return "api";
  return "auto";
}

export function cursorUsedPercent(planUsage = {}, metric = "auto") {
  const key = metric === "api" ? "apiPercentUsed" : "autoPercentUsed";
  const n = Number(planUsage[key]);
  if (Number.isFinite(n)) return n;
  const total = Number(planUsage.totalPercentUsed);
  return Number.isFinite(total) ? total : NaN;
}

function expand(p) {
  if (!p) return p;
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function defaultStateDbPath() {
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library/Application Support/Cursor/User/globalStorage/state.vscdb",
    );
  }
  if (process.platform === "win32") {
    const base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(base, "Cursor", "User", "globalStorage", "state.vscdb");
  }
  return path.join(os.homedir(), ".config", "Cursor", "User", "globalStorage", "state.vscdb");
}

function readItemTableValue(dbPath, key) {
  // Zero-dependency sqlite read via python (macOS has python3).
  const script = [
    "import sqlite3,sys",
    "con=sqlite3.connect(sys.argv[1])",
    "row=con.execute('select value from ItemTable where key=?',(sys.argv[2],)).fetchone()",
    "if not row or row[0] is None:",
    "  sys.exit(0)",
    "val=row[0]",
    "sys.stdout.write(val if isinstance(val,str) else val.decode('utf-8','ignore'))",
  ].join("\n");
  const res = spawnSync("python3", ["-c", script, dbPath, key], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "sqlite read failed").trim();
    throw new Error(err || "sqlite read failed");
  }
  return res.stdout || "";
}

function loadCursorAuth(account) {
  const dbPath = expand(account.auth?.path || defaultStateDbPath());
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Cursor auth DB missing: ${dbPath}`);
  }
  const access = readItemTableValue(dbPath, "cursorAuth/accessToken");
  const email = readItemTableValue(dbPath, "cursorAuth/cachedEmail") || null;
  const plan = readItemTableValue(dbPath, "cursorAuth/stripeMembershipType") || null;
  if (!access || access.length < 20) {
    throw new Error("Cursor accessToken not found (sign in to Cursor app first)");
  }
  return {
    access,
    email: email || null,
    planHint: plan || null,
    sourcePath: dbPath,
  };
}

async function postJson(url, { headers = {}, body = {}, timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

const USAGE_CACHE_MS = 12000;
let usageCache = { at: 0, token: "", data: null };

async function fetchPeriodUsage(access) {
  const now = Date.now();
  if (usageCache.data && usageCache.token === access && now - usageCache.at < USAGE_CACHE_MS) {
    return usageCache.data;
  }
  const data = await postJson(
    "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage",
    {
      headers: {
        Authorization: `Bearer ${access}`,
        "User-Agent": "headroom-cursor/0.1.3",
      },
      body: {},
    },
  );
  usageCache = { at: now, token: access, data };
  return data;
}

export const cursorUsageProvider = {
  id: "cursor-usage",
  title: "Cursor",
  description: "Cursor Auto (Grok/Cursor models) and Cursor API remaining via local auth",

  async fetchQuota(account) {
    const auth = loadCursorAuth(account);
    const data = await fetchPeriodUsage(auth.access);

    const metric = normalizeCursorMetric(account);
    const planUsage = data?.planUsage || {};
    const usedPercent = cursorUsedPercent(planUsage, metric);
    if (!Number.isFinite(usedPercent)) {
      throw new Error(metric === "api" ? "Cursor apiPercentUsed missing" : "Cursor autoPercentUsed missing");
    }
    const remainingPercent = remainingFromUsed(usedPercent);
    const label =
      account.label ||
      (metric === "api" ? "Cursor API" : "Cursor Auto");

    let planName = auth.planHint || null;
    try {
      const plan = await postJson(
        "https://api2.cursor.sh/aiserver.v1.DashboardService/GetPlanInfo",
        {
          headers: {
            Authorization: `Bearer ${auth.access}`,
            "User-Agent": "headroom-cursor/0.1.3",
          },
          body: {},
        },
      );
      planName = plan?.planInfo?.planName || planName;
    } catch {
      // non-fatal
    }

    return {
      provider: this.id,
      accountId: account.id,
      label,
      usedPercent: roundPct(usedPercent),
      remainingPercent: roundPct(remainingPercent),
      resetAt: formatReset(data?.billingCycleEnd),
      plan: planName,
      email: auth.email,
      source: metric === "api" ? "cursor:api-usage" : "cursor:auto-usage",
      fetchedAt: nowIso(),
      raw: {
        displayMessage: data?.displayMessage || null,
        autoModelSelectedDisplayMessage: data?.autoModelSelectedDisplayMessage || null,
        namedModelSelectedDisplayMessage: data?.namedModelSelectedDisplayMessage || null,
        metric,
        planUsage,
        billingCycleStart: data?.billingCycleStart || null,
        billingCycleEnd: data?.billingCycleEnd || null,
      },
      error: null,
    };
  },
};
