export function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export function remainingFromUsed(usedPercent) {
  const used = clampPercent(usedPercent);
  if (used === null) return null;
  return clampPercent(100 - used);
}

export function roundPct(value) {
  const n = clampPercent(value);
  if (n === null) return null;
  return Math.round(n);
}

export function formatReset(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    let ts = value;
    if (ts > 1e12) ts /= 1000;
    // seconds remaining style if small
    if (ts < 1e9) {
      const s = Math.max(0, Math.floor(ts));
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      if (d) return `${d}g ${h}s`;
      if (h) return `${h}s ${m}d`;
      return `${m}d`;
    }
    return new Date(ts * 1000).toLocaleString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return formatReset(Number(trimmed));
    }
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    return value;
  }
  return String(value);
}
