import fs from "node:fs";
import { expandHome } from "../core/paths.js";

export function readJsonFile(filePath) {
  const p = expandHome(filePath);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function getByPath(obj, dotted) {
  if (!dotted) return obj;
  return dotted.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, obj);
}

export async function fetchJson(url, { headers = {}, timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
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

export function nowIso() {
  return new Date().toISOString();
}
