import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { remainingFromUsed, roundPct, formatReset } from "../core/math.js";
import { fetchJson, nowIso } from "./utils.js";

const XAI_DISCOVERY = "https://auth.x.ai/.well-known/openid-configuration";
const XAI_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";

function expand(p) {
  if (!p) return p;
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function loadGrokAuth(authPath) {
  const full = expand(authPath || "~/.grok/auth.json");
  if (!fs.existsSync(full)) throw new Error(`Grok auth missing: ${full}`);
  const file = JSON.parse(fs.readFileSync(full, "utf8"));
  // pick first valid entry
  for (const [slot, entry] of Object.entries(file || {})) {
    if (!entry || typeof entry !== "object") continue;
    const access = entry.key || entry.access_token || entry.accessToken;
    const refresh = entry.refresh_token || entry.refreshToken;
    if (typeof access === "string" && access.length > 20) {
      return {
        fullPath: full,
        slot,
        file,
        entry,
        access,
        refresh: typeof refresh === "string" ? refresh : "",
        userId: entry.user_id || entry.userId || entry.principal_id || "",
        email: entry.email || null,
        expiresAt: entry.expires_at || entry.expiresAt || null,
      };
    }
  }
  throw new Error("No valid token in Grok auth.json");
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return false;
  return t <= Date.now() + 60_000;
}

async function refreshGrokAccess(refreshToken) {
  const disc = await fetchJson(XAI_DISCOVERY, { headers: { Accept: "application/json" } });
  const tokenEndpoint = disc?.token_endpoint;
  if (!tokenEndpoint) throw new Error("xAI token endpoint missing");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: XAI_CLIENT_ID,
    refresh_token: refreshToken,
  }).toString();
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Grok token refresh HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  if (!json?.access_token) throw new Error("Grok refresh did not return access_token");
  return json;
}

function persistGrokAuth(auth, tokenPayload) {
  const entry = { ...auth.entry };
  entry.key = tokenPayload.access_token;
  if (tokenPayload.refresh_token) entry.refresh_token = tokenPayload.refresh_token;
  if (tokenPayload.expires_in) {
    entry.expires_at = new Date(Date.now() + Number(tokenPayload.expires_in) * 1000).toISOString();
  }
  const nextFile = { ...auth.file, [auth.slot]: entry };
  // atomic write
  const tmp = `${auth.fullPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(nextFile, null, 2));
  fs.renameSync(tmp, auth.fullPath);
  return {
    ...auth,
    entry,
    access: entry.key,
    refresh: entry.refresh_token || auth.refresh,
    expiresAt: entry.expires_at || null,
    file: nextFile,
  };
}

async function getValidGrokAuth(account) {
  let auth = loadGrokAuth(account.auth?.path || "~/.grok/auth.json");
  if (!auth.userId) throw new Error("Grok user id missing");
  if (!isExpired(auth.expiresAt)) return auth;
  if (!auth.refresh) throw new Error("Grok token expired and no refresh_token");
  const payload = await refreshGrokAccess(auth.refresh);
  auth = persistGrokAuth(auth, payload);
  return auth;
}

export const xaiCreditsProvider = {
  id: "xai-credits",
  title: "x (Grok)",
  description: "Weekly remaining via native Grok auth (~/.grok/auth.json)",

  async fetchQuota(account) {
    const auth = await getValidGrokAuth(account);
    const data = await fetchJson(
      "https://cli-chat-proxy.grok.com/v1/billing?format=credits",
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${auth.access}`,
          "User-Agent": "headroom-grok/0.1",
          "x-userid": auth.userId,
          "x-xai-token-auth": "xai-grok-cli",
          "x-authenticateresponse": "authenticate-response",
          "x-grok-client-identifier": "headroom",
          "x-grok-client-version": "0.1.0",
        },
      },
    );

    const config = data?.config || {};
    const used = Number(config.creditUsagePercent ?? 0);
    if (!Number.isFinite(used)) throw new Error("creditUsagePercent missing");
    const period = config.currentPeriod || {};

    return {
      provider: this.id,
      accountId: account.id,
      label: account.label || "x",
      usedPercent: roundPct(used),
      remainingPercent: roundPct(remainingFromUsed(used)),
      resetAt: formatReset(period.end),
      plan: null,
      email: auth.email,
      source: "xai:grok-native-auth",
      fetchedAt: nowIso(),
      raw: {
        currentPeriod: period,
        productUsage: config.productUsage || [],
      },
      error: null,
    };
  },
};
