import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  removeAccount,
  saveConfig,
  updateSettings,
  upsertAccount,
} from "../store/config-store.js";
import { fetchAccountQuota, listProviders } from "../providers/index.js";
import { syncSwiftBarPlugins } from "../swiftbar/generate.js";
import {
  ensureLaunchAgentHealthy,
  installLaunchAgent,
  serviceStatus,
  uninstallAll,
} from "../core/service.js";
import {
  dependencyReport,
  openSwiftBarApp,
  detectSwiftBar,
} from "../core/deps.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(__dirname, "../panel");
const MAX_BODY_BYTES = 64 * 1024;

let activeServer = null;

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'",
  });
  res.end(data);
}

function isLocalSocket(req) {
  const ra = req.socket?.remoteAddress || "";
  return ra === "127.0.0.1" || ra === "::1" || ra === "::ffff:127.0.0.1";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Request body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(Object.assign(new Error("Invalid JSON body"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function servePanel(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.normalize(path.join(PANEL_DIR, urlPath));
  if (!filePath.startsWith(PANEL_DIR + path.sep) && filePath !== PANEL_DIR) {
    res.writeHead(403).end("forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; script-src 'self'",
  });
  fs.createReadStream(filePath).pipe(res);
}

function endpointFromConfig(cfg) {
  const host = cfg.settings.host || "127.0.0.1";
  const port = cfg.settings.port || 8787;
  return `http://${host}:${port}`;
}

function autoSync(cfg = loadConfig()) {
  return syncSwiftBarPlugins({
    config: cfg,
    endpoint: endpointFromConfig(cfg),
  });
}

function publicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    provider: account.provider,
    label: account.label,
    enabled: account.enabled !== false,
    menubar: account.menubar !== false,
    showInBar: account.showInBar !== false,
    showInDetail: account.showInDetail !== false,
    order: account.order ?? 100,
    // auth paths only (no secrets). Tokens live in local provider files.
    auth: {
      mode: "file",
      path: account.auth?.path || "",
      jsonPath: account.auth?.jsonPath || "",
    },
  };
}

function publicQuota(item) {
  if (!item) return item;
  const {
    provider,
    accountId,
    label,
    usedPercent,
    remainingPercent,
    resetAt,
    plan,
    email,
    source,
    fetchedAt,
    error,
  } = item;
  return {
    provider,
    accountId,
    label,
    usedPercent,
    remainingPercent,
    resetAt: resetAt ?? null,
    plan: plan ?? null,
    email: email ?? null,
    source: source ?? null,
    fetchedAt,
    error: error ?? null,
  };
}

function publicConfig(cfg) {
  return {
    version: cfg.version || 1,
    settings: cfg.settings,
    accounts: (cfg.accounts || []).map(publicAccount),
  };
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (!isLocalSocket(req)) {
        return sendJson(res, 403, { error: "Localhost only" });
      }

      const url = new URL(req.url, "http://127.0.0.1");
      const { pathname } = url;

      if (pathname === "/api/health" && req.method === "GET") {
        return sendJson(res, 200, {
          ok: true,
          service: "headroom",
          version: "0.1.0",
        });
      }

      if (pathname === "/api/providers" && req.method === "GET") {
        return sendJson(res, 200, { providers: listProviders() });
      }

      if (pathname === "/api/settings" && req.method === "GET") {
        const cfg = loadConfig();
        return sendJson(res, 200, cfg.settings);
      }

      if (pathname === "/api/settings" && req.method === "PUT") {
        const body = await readBody(req);
        const cfg = updateSettings(body || {});
        const sync = autoSync(cfg);
        return sendJson(res, 200, { ...cfg.settings, sync });
      }

      if (pathname === "/api/accounts" && req.method === "GET") {
        const cfg = loadConfig();
        return sendJson(res, 200, { accounts: cfg.accounts.map(publicAccount) });
      }

      if (pathname === "/api/accounts" && req.method === "POST") {
        const body = await readBody(req);
        if (!body?.id || !body?.provider) {
          return sendJson(res, 400, { error: "id and provider required" });
        }
        const cfg = upsertAccount(body);
        const sync = autoSync(cfg);
        return sendJson(res, 200, {
          account: publicAccount(cfg.accounts.find((a) => a.id === body.id || a.provider === body.provider)),
          sync,
        });
      }

      if (pathname.startsWith("/api/accounts/") && req.method === "PUT") {
        const id = decodeURIComponent(pathname.slice("/api/accounts/".length));
        const body = await readBody(req);
        const cfg = loadConfig();
        const current = cfg.accounts.find((a) => a.id === id);
        if (!current) return sendJson(res, 404, { error: "account not found" });
        const next = { ...current, ...body, id };
        const saved = upsertAccount(next);
        const sync = autoSync(saved);
        return sendJson(res, 200, {
          account: publicAccount(saved.accounts.find((a) => a.id === id)),
          sync,
        });
      }

      if (pathname.startsWith("/api/accounts/") && req.method === "DELETE") {
        const id = decodeURIComponent(pathname.slice("/api/accounts/".length));
        const saved = removeAccount(id);
        const sync = autoSync(saved);
        return sendJson(res, 200, { ok: true, sync });
      }

      if (pathname === "/api/quota" && req.method === "GET") {
        const cfg = loadConfig();
        const items = await Promise.all(
          (cfg.accounts || []).map(async (a) => {
            if (!a.enabled) {
              return publicQuota({
                provider: a.provider,
                accountId: a.id,
                label: a.label || a.id,
                usedPercent: null,
                remainingPercent: null,
                resetAt: null,
                plan: null,
                email: null,
                source: a.provider,
                fetchedAt: new Date().toISOString(),
                error: "disabled",
              });
            }
            return publicQuota(await fetchAccountQuota(a));
          }),
        );
        return sendJson(res, 200, { items, generatedAt: new Date().toISOString() });
      }

      if (pathname.startsWith("/api/quota/") && req.method === "GET") {
        const id = decodeURIComponent(pathname.slice("/api/quota/".length));
        const cfg = loadConfig();
        const account = cfg.accounts.find((a) => a.id === id);
        if (!account) return sendJson(res, 404, { error: "account not found" });
        if (!account.enabled || !account.menubar) {
          return sendJson(
            res,
            200,
            publicQuota({
              provider: account.provider,
              accountId: account.id,
              label: account.label || account.id,
              usedPercent: null,
              remainingPercent: null,
              resetAt: null,
              plan: null,
              email: null,
              source: account.provider,
              fetchedAt: new Date().toISOString(),
              error: !account.enabled ? "disabled" : "menubar-off",
            }),
          );
        }
        const item = publicQuota(await fetchAccountQuota(account));
        return sendJson(res, 200, item);
      }

      if (pathname === "/api/swiftbar/sync" && req.method === "POST") {
        const cfg = loadConfig();
        const result = autoSync(cfg);
        return sendJson(res, 200, { ok: true, ...result });
      }

      if (pathname === "/api/swiftbar/reset" && req.method === "POST") {
        const cfg = loadConfig();
        cfg.accounts = (cfg.accounts || []).map((a) => ({
          ...a,
          enabled: true,
          menubar: true,
          showInBar: true,
          showInDetail: true,
        }));
        const saved = saveConfig(cfg);
        const sync = autoSync(saved);
        return sendJson(res, 200, { ok: true, action: "reset", sync });
      }

      if (pathname === "/api/swiftbar/close" && req.method === "POST") {
        const cfg = loadConfig();
        try {
          const result = syncSwiftBarPlugins({
            config: { ...cfg, accounts: [] },
            endpoint: endpointFromConfig(cfg),
          });
          cfg.accounts = (cfg.accounts || []).map((a) => ({
            ...a,
            menubar: false,
            showInBar: false,
            showInDetail: false,
          }));
          saveConfig(cfg);
          setTimeout(() => {
            try {
              activeServer?.close();
            } catch {}
            process.exit(0);
          }, 150);
          return sendJson(res, 200, {
            ok: true,
            action: "close",
            removed: result.written || [],
            dir: result.dir,
          });
        } catch (err) {
          return sendJson(res, 500, { error: err?.message || String(err) });
        }
      }

      if (pathname === "/api/deps" && req.method === "GET") {
        return sendJson(res, 200, dependencyReport());
      }

      if (pathname === "/api/deps/swiftbar/open" && req.method === "POST") {
        const sb = detectSwiftBar();
        const result = openSwiftBarApp(sb.appPath);
        return sendJson(res, result.ok ? 200 : 500, { ...result, swiftbar: sb });
      }

      if (pathname === "/api/service/status" && req.method === "GET") {
        return sendJson(res, 200, serviceStatus());
      }

      if (pathname === "/api/service/install-autostart" && req.method === "POST") {
        const result = installLaunchAgent();
        return sendJson(res, result.ok ? 200 : 500, result);
      }

      if (pathname === "/api/service/uninstall" && req.method === "POST") {
        const body = await readBody(req).catch(() => ({}));
        const result = uninstallAll({ removeConfig: body?.removeConfig !== false });
        // stop server after response
        setTimeout(() => {
          try { activeServer?.close(); } catch {}
          process.exit(0);
        }, 200);
        return sendJson(res, 200, { ok: true, action: "uninstall", ...result });
      }

      if (pathname === "/api/config" && req.method === "GET") {
        return sendJson(res, 200, publicConfig(loadConfig()));
      }

      if (pathname === "/api/config" && req.method === "PUT") {
        const body = await readBody(req);
        // only accept known shape; ignore unexpected secret-like fields
        const current = loadConfig();
        const next = {
          version: 1,
          settings: { ...current.settings, ...(body?.settings || {}) },
          accounts: Array.isArray(body?.accounts) ? body.accounts : current.accounts,
        };
        const saved = saveConfig(next);
        const sync = autoSync(saved);
        return sendJson(res, 200, { ...publicConfig(saved), sync });
      }

      if (req.method === "GET") return servePanel(req, res);
      return sendJson(res, 404, { error: "not found" });
    } catch (err) {
      const status = err?.status || 500;
      return sendJson(res, status, { error: err?.message || String(err) });
    }
  });
}

export function startServer({ host, port } = {}) {
  const cfg = loadConfig();
  // Force local bind even if env is hostile.
  const listenHost = "127.0.0.1";
  const listenPort = Number(port || process.env.HEADROOM_PORT || cfg.settings.port || 8787);
  if (!Number.isInteger(listenPort) || listenPort < 1024 || listenPort > 65535) {
    throw new Error("Invalid HEADROOM_PORT");
  }
  const server = createServer();
  activeServer = server;
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, listenHost, () => {
      try {
        autoSync(cfg);
      } catch {}
      // If autostart exists but node/repo path drifted, repair it.
      try {
        ensureLaunchAgentHealthy();
      } catch {}
      resolve({
        server,
        host: listenHost,
        port: listenPort,
        url: `http://${listenHost}:${listenPort}`,
      });
    });
  });
}
