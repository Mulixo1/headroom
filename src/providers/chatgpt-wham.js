import { remainingFromUsed, roundPct, formatReset } from "../core/math.js";
import { fetchJson, getByPath, nowIso, readJsonFile } from "./utils.js";

export const chatgptWhamProvider = {
  id: "chatgpt-wham",
  title: "ChatGPT / Codex WHAM",
  description: "Weekly remaining limit via chatgpt.com/backend-api/wham/usage",

  async fetchQuota(account) {
    const authPath = account.auth?.path || "~/.codex/auth.json";
    const jsonPath = account.auth?.jsonPath || "tokens.access_token";
    const file = readJsonFile(authPath);
    const token = getByPath(file, jsonPath);
    if (!token || typeof token !== "string") {
      throw new Error("ChatGPT access_token not found in ~/.codex/auth.json");
    }

    const data = await fetchJson("https://chatgpt.com/backend-api/wham/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "headroom/0.1",
      },
    });

    const rate = data?.rate_limit || {};
    const primary = rate.primary_window || {};
    const used = Number(primary.used_percent);
    if (!Number.isFinite(used)) throw new Error("ChatGPT used_percent missing");

    const usedPercent = roundPct(used);
    const remainingPercent = remainingFromUsed(used);

    return {
      provider: this.id,
      accountId: account.id,
      label: account.label || "GPT",
      usedPercent,
      remainingPercent: roundPct(remainingPercent),
      resetAt: formatReset(primary.reset_after_seconds ?? primary.reset_at),
      plan: data.plan_type || null,
      email: data.email || null,
      source: "chatgpt:wham",
      fetchedAt: nowIso(),
      raw: {
        allowed: rate.allowed,
        limit_reached: rate.limit_reached,
        primary_window: primary,
      },
      error: null,
    };
  },
};
