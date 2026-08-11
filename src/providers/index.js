import { chatgptWhamProvider } from "./chatgpt-wham.js";
import { xaiCreditsProvider } from "./xai-credits.js";

const providers = [chatgptWhamProvider, xaiCreditsProvider];
const byId = new Map(providers.map((p) => [p.id, p]));

export function listProviders() {
  return providers.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
  }));
}

export function getProvider(id) {
  return byId.get(id) || null;
}

export async function fetchAccountQuota(account) {
  const provider = getProvider(account.provider);
  if (!provider) {
    return {
      provider: account.provider,
      accountId: account.id,
      label: account.label || account.id,
      usedPercent: null,
      remainingPercent: null,
      resetAt: null,
      plan: null,
      email: null,
      source: "unknown",
      fetchedAt: new Date().toISOString(),
      error: `Unknown provider: ${account.provider}`,
    };
  }

  try {
    return await provider.fetchQuota(account);
  } catch (err) {
    return {
      provider: account.provider,
      accountId: account.id,
      label: account.label || account.id,
      usedPercent: null,
      remainingPercent: null,
      resetAt: null,
      plan: null,
      email: null,
      source: provider.id,
      fetchedAt: new Date().toISOString(),
      error: err?.message || String(err),
    };
  }
}
