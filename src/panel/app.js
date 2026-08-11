import {
  normalizeLocale,
  resolveLocale,
  t,
} from "./i18n.js";

const state = {
  accounts: [],
  providers: [],
  quota: [],
  settings: {},
  locks: new Map(),
  pendingPatches: new Map(),
  inflight: new Set(),
  localeSetting: "system",
};

const $ = (s) => document.querySelector(s);
const tt = (key, vars) => t(state.localeSetting, key, vars);

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function tone(n) {
  if (n == null) return "bad";
  if (n >= 50) return "ok";
  if (n >= 20) return "warn";
  return "bad";
}

function setStatus(msg) {
  $("#sync-status").textContent = msg || "";
}

function syncMsg(sync, extra = "") {
  if (!sync) return extra || tt("saved");
  const n = Array.isArray(sync.selected) ? sync.selected.length : sync.count;
  const bar =
    sync.barCount != null ? tt("barCount", { n: sync.barCount }).replace(/^, /, ", ") : "";
  // barCount key already has leading comma in EN/TR templates
  const barPart = sync.barCount != null ? tt("barCount", { n: sync.barCount }) : "";
  return tt("menubarUpdated", { n, bar: barPart }) + (extra ? ` · ${extra}` : "");
}

function isBusy(id) {
  return state.inflight.has(id) || state.pendingPatches.has(id);
}

function normalizeAccount(a, local) {
  const base = {
    ...a,
    enabled: true,
    menubar: a.menubar !== false,
    showInBar: a.showInBar != null ? !!a.showInBar : a.menubar !== false,
    showInDetail: a.showInDetail != null ? !!a.showInDetail : true,
  };
  if (state.pendingPatches.has(a.id)) return { ...base, ...state.pendingPatches.get(a.id) };
  if (state.inflight.has(a.id) && local) return { ...base, ...local };
  return base;
}

function quotaFor(id) {
  return state.quota.find((q) => q.accountId === id) || null;
}

function applyStaticI18n() {
  const lang = resolveLocale(state.localeSetting);
  document.documentElement.lang = lang;
  document.title = tt("title");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = tt(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", tt(key));
  });

  // language option labels
  const sel = $("#set-language");
  if (sel) {
    for (const opt of sel.options) {
      if (opt.value === "system") opt.textContent = tt("langSystem");
      if (opt.value === "en") opt.textContent = tt("langEn");
      if (opt.value === "tr") opt.textContent = tt("langTr");
    }
    sel.value = normalizeLocale(state.localeSetting);
  }
}

function renderSummary() {
  const live = state.quota.filter((q) => !q.error && q.remainingPercent != null);
  const avg = live.length
    ? Math.round(live.reduce((s, q) => s + q.remainingPercent, 0) / live.length)
    : null;
  const low = live.slice().sort((a, b) => a.remainingPercent - b.remainingPercent)[0];
  const barCount = state.accounts.filter((a) => a.menubar !== false && a.showInBar !== false).length;

  $("#summary").innerHTML = `
    <div class="hero"><div class="k">${esc(tt("barTitle"))}</div><div class="v">${barCount}</div><div class="m">${esc(tt("visibleModels"))}</div></div>
    <div class="hero"><div class="k">${esc(tt("avgRemaining"))}</div><div class="v ${tone(avg)}">${avg == null ? "—" : avg + "%"}</div><div class="m">${esc(tt("gptX"))}</div></div>
    <div class="hero"><div class="k">${esc(tt("lowest"))}</div><div class="v ${tone(low?.remainingPercent)}">${low ? esc(low.label) + " " + low.remainingPercent + "%" : "—"}</div><div class="m">${esc(tt("priority"))}</div></div>
  `;
}

function authHint(provider) {
  if (provider === "chatgpt-wham") return "~/.codex/auth.json";
  if (provider === "xai-credits") return "~/.grok/auth.json";
  return "";
}

function renderAccounts() {
  if (!state.accounts.length) {
    $("#accounts").innerHTML = `<div class="empty">${esc(tt("noAccounts"))}</div>`;
    return;
  }

  $("#accounts").innerHTML = state.accounts
    .slice()
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    .map((a) => {
      const q = quotaFor(a.id);
      const remain = q && !q.error ? q.remainingPercent : null;
      const used = q && !q.error ? q.usedPercent : null;
      const err = q?.error && !["disabled", "menubar-off"].includes(q.error) ? q.error : null;
      const busy = isBusy(a.id);
      const pctHtml = err
        ? `<div class="pct bad">!</div><div class="meta">${esc(err)}</div>`
        : remain == null
          ? `<div class="pct">—</div><div class="meta">${esc(tt("noData"))}</div>`
          : `<div class="pct ${tone(remain)}">${remain}%</div><div class="meta">${esc(tt("remainingUsed", { used: used ?? "—" }))}</div>`;

      return `<article class="row" data-acc="${esc(a.id)}">
        <div>
          <div class="name">${esc(a.label || a.id)}</div>
          <div class="id">${esc(authHint(a.provider) || a.provider)}</div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            <span class="switch ${a.showInBar ? "on" : ""}">${esc(a.showInBar ? tt("inBar") : tt("barOff"))}</span>
            <span class="switch ${a.showInDetail ? "on" : ""}">${esc(a.showInDetail ? tt("inDetail") : tt("detailOff"))}</span>
            ${busy ? `<span class="switch">${esc(tt("processing"))}</span>` : ""}
          </div>
        </div>
        <div>${pctHtml}</div>
        <div class="actions">
          <button class="btn sm primary" data-toggle-bar="${esc(a.id)}" type="button" ${busy ? "disabled" : ""}>
            ${esc(busy ? "…" : a.showInBar ? tt("removeFromBar") : tt("addToBar"))}
          </button>
          <button class="btn sm" data-toggle-detail="${esc(a.id)}" type="button" ${busy ? "disabled" : ""}>
            ${esc(a.showInDetail ? tt("removeFromDetail") : tt("addToDetail"))}
          </button>
        </div>
      </article>`;
    })
    .join("");

  $("#accounts").querySelectorAll("[data-toggle-bar]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.toggleBar;
      const acc = state.accounts.find((a) => a.id === id);
      if (!acc || isBusy(id)) return;
      const desired = !acc.showInBar;
      queueAccountPatch(
        id,
        {
          menubar: true,
          enabled: true,
          showInBar: desired,
          showInDetail: acc.showInDetail !== false,
        },
        desired ? tt("addingToBar") : tt("removingFromBar"),
      );
    });
  });

  $("#accounts").querySelectorAll("[data-toggle-detail]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.toggleDetail;
      const acc = state.accounts.find((a) => a.id === id);
      if (!acc || isBusy(id)) return;
      const desired = !acc.showInDetail;
      queueAccountPatch(
        id,
        {
          menubar: true,
          enabled: true,
          showInBar: acc.showInBar !== false,
          showInDetail: desired,
        },
        desired ? tt("addingToDetail") : tt("removingFromDetail"),
      );
    });
  });
}

function queueAccountPatch(id, patch, statusText) {
  const prevPatch = state.pendingPatches.get(id) || {};
  const merged = { ...prevPatch, ...patch, enabled: true, menubar: true };
  state.pendingPatches.set(id, merged);

  const acc = state.accounts.find((a) => a.id === id);
  if (acc) Object.assign(acc, merged);
  renderSummary();
  renderAccounts();
  if (statusText) setStatus(statusText);

  const prev = state.locks.get(id) || Promise.resolve();
  const next = prev.catch(() => {}).then(() => drainAccountPatches(id));
  state.locks.set(id, next);
}

async function drainAccountPatches(id) {
  while (state.pendingPatches.has(id)) {
    const patch = state.pendingPatches.get(id);
    state.pendingPatches.delete(id);
    state.inflight.add(id);
    renderAccounts();
    try {
      const res = await api(`/api/accounts/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      const acc = state.accounts.find((a) => a.id === id);
      if (acc && !state.pendingPatches.has(id) && res.account) {
        Object.assign(acc, normalizeAccount(res.account, acc));
      }
      if (!state.pendingPatches.has(id)) {
        setStatus(syncMsg(res.sync, tt("updated")));
      }
    } catch (e) {
      if (!state.pendingPatches.has(id)) setStatus(e.message || String(e));
    } finally {
      state.inflight.delete(id);
      renderSummary();
      renderAccounts();
    }
  }
  if (!state.pendingPatches.has(id) && !state.inflight.has(id)) {
    state.locks.delete(id);
  }
}

async function refreshService() {
  try {
    const st = await api("/api/service/status");
    state.service = st;
    const el = $("#autostart-state");
    if (el) {
      if (!st.launchAgentInstalled) el.textContent = tt("autostartOff");
      else if (st.launchAgentHealthy === false) el.textContent = tt("autostartOn") + " · " + tt("autostartNeedsRepair");
      else el.textContent = tt("autostartOn") + " · " + tt("autostartHealthy");
    }
  } catch {
    const el = $("#autostart-state");
    if (el) el.textContent = "—";
  }
  try {
    const deps = await api("/api/deps");
    state.deps = deps;
    const sb = deps.swiftbar || {};
    const el = $("#swiftbar-state");
    if (el) {
      if (sb.installed) {
        el.textContent = sb.running ? (tt("swiftbarFound") + " · " + tt("swiftbarRunning")) : tt("swiftbarFound");
      } else {
        el.textContent = tt("swiftbarMissing");
      }
    }
    const openBtn = $("#btn-open-swiftbar");
    if (openBtn) openBtn.disabled = !sb.installed;
    const code = $("#swiftbar-install-cmd");
    if (code) code.style.display = sb.installed ? "none" : "block";
    const copyBtn = $("#btn-copy-swiftbar-cmd");
    if (copyBtn) copyBtn.style.display = sb.installed ? "none" : "inline-flex";
  } catch {
    const el = $("#swiftbar-state");
    if (el) el.textContent = "—";
  }
}

function fillSettings() {
  const s = state.settings || {};
  $("#set-host").value = s.host || "127.0.0.1";
  $("#set-port").value = s.port || 8787;
  $("#set-refresh").value = s.refreshSeconds || 30;
  if ($("#set-menubar-mode")) {
    $("#set-menubar-mode").value = s.menubarMode === "compact" ? "compact" : "detail";
  }
  if ($("#set-menubar-join")) $("#set-menubar-join").value = s.menubarJoin ?? " · ";
  if ($("#set-menubar-empty")) $("#set-menubar-empty").value = s.menubarEmptyTitle ?? "HR";
  $("#set-plugin-dir").value = s.swiftbarPluginDir || "";
  if ($("#set-language")) {
    $("#set-language").value = normalizeLocale(state.localeSetting);
  }
}

async function setLanguage(next) {
  const locale = normalizeLocale(next);
  state.localeSetting = locale;
  applyStaticI18n();
  renderSummary();
  renderAccounts();
  try {
    const res = await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ locale }),
    });
    state.settings = res;
    state.localeSetting = normalizeLocale(res.locale || locale);
    applyStaticI18n();
  } catch (e) {
    setStatus(e.message || String(e));
  }
}

async function refresh({ withQuota = true } = {}) {
  const reqs = [
    api("/api/health"),
    api("/api/providers"),
    api("/api/accounts"),
    api("/api/settings"),
  ];
  if (withQuota) reqs.splice(3, 0, api("/api/quota"));
  const results = await Promise.all(reqs);
  const health = results[0];
  const providers = results[1];
  const accounts = results[2];
  const quota = withQuota ? results[3] : { items: state.quota };
  const settings = withQuota ? results[4] : results[3];

  state.providers = providers.providers || [];
  const prevLocal = new Map(state.accounts.map((a) => [a.id, a]));
  state.accounts = (accounts.accounts || []).map((a) => normalizeAccount(a, prevLocal.get(a.id)));
  if (withQuota) state.quota = quota.items || [];
  state.settings = settings || {};
  state.localeSetting = normalizeLocale(state.settings.locale || "system");

  applyStaticI18n();

  const h = $("#health");
  h.textContent = health.ok ? tt("healthOnline") : tt("healthOffline");
  h.className = `pill ${health.ok ? "ok" : "bad"}`;

  renderSummary();
  renderAccounts();
  fillSettings();
  refreshService().catch(() => {});
}

function bind() {
  $("#btn-refresh").onclick = async () => {
    setStatus(tt("refreshing"));
    try {
      await refresh({ withQuota: true });
      setStatus(tt("refreshed"));
    } catch (e) {
      setStatus(e.message);
    }
  };

  $("#btn-sync").onclick = async () => {
    setStatus(tt("writingMenubar"));
    try {
      const res = await api("/api/swiftbar/sync", { method: "POST" });
      setStatus(syncMsg(res));
    } catch (e) {
      setStatus(e.message);
    }
  };

  $("#set-language").onchange = async (e) => {
    await setLanguage(e.target.value);
  };

  const openSb = $("#btn-open-swiftbar");
  if (openSb) {
    openSb.onclick = async () => {
      try { await api("/api/deps/swiftbar/open", { method: "POST", body: "{}" }); }
      catch (e) { setStatus(e.message || String(e)); }
    };
  }
  const copySb = $("#btn-copy-swiftbar-cmd");
  if (copySb) {
    copySb.onclick = async () => {
      const code = $("#swiftbar-install-cmd")?.textContent || "brew install --cask swiftbar\nopen -a SwiftBar";
      try {
        await navigator.clipboard.writeText(code);
        setStatus(tt("copiedSwiftBarCmd"));
      } catch {
        setStatus(code);
      }
    };
  }
  const writePlugin = $("#btn-write-plugin");
  if (writePlugin) {
    writePlugin.onclick = async () => {
      setStatus(tt("writingMenubar"));
      try {
        const res = await api("/api/swiftbar/sync", { method: "POST" });
        setStatus(syncMsg(res));
      } catch (e) {
        setStatus(e.message || String(e));
      }
    };
  }

  const autoBtn = $("#btn-autostart");
  if (autoBtn) {
    autoBtn.onclick = async () => {
      setStatus(tt("installingAutostart"));
      try {
        await api("/api/service/install-autostart", { method: "POST", body: "{}" });
        await refreshService();
        setStatus(tt("autostartEnabled"));
      } catch (e) {
        setStatus(e.message || String(e));
      }
    };
  }

  const unBtn = $("#btn-uninstall");
  if (unBtn) {
    unBtn.onclick = async () => {
      if (!confirm(tt("uninstallConfirm"))) return;
      setStatus(tt("uninstalling"));
      try {
        await api("/api/service/uninstall", {
          method: "POST",
          body: JSON.stringify({ removeConfig: true }),
        });
        setStatus(tt("uninstalled"));
        $("#health").textContent = tt("healthOffline");
        $("#health").className = "pill bad";
      } catch (e) {
        // server may die mid-request after uninstall; treat as success-ish
        setStatus(tt("uninstalled"));
        $("#health").textContent = tt("healthOffline");
        $("#health").className = "pill bad";
      }
    };
  }

  $("#btn-save-settings").onclick = async () => {
    setStatus(tt("savingSettings"));
    try {
      const res = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          host: $("#set-host").value.trim(),
          port: Number($("#set-port").value),
          refreshSeconds: Number($("#set-refresh").value),
          menubarMode: ($("#set-menubar-mode") && $("#set-menubar-mode").value) || "detail",
          menubarJoin: ($("#set-menubar-join") && $("#set-menubar-join").value) || " · ",
          menubarEmptyTitle: ($("#set-menubar-empty") && $("#set-menubar-empty").value) || "HR",
          swiftbarPluginDir: $("#set-plugin-dir").value.trim(),
          locale: normalizeLocale($("#set-language")?.value || state.localeSetting || "system"),
        }),
      });
      state.settings = res;
      state.localeSetting = normalizeLocale(res.locale || "system");
      applyStaticI18n();
      setStatus(syncMsg(res.sync, tt("settingsSaved")));
    } catch (e) {
      setStatus(e.message);
    }
  };
}

bind();
refresh({ withQuota: true }).catch((e) => {
  state.localeSetting = "system";
  applyStaticI18n();
  $("#health").textContent = tt("healthOffline");
  $("#health").className = "pill bad";
  $("#accounts").innerHTML = `<div class="empty">${esc(tt("offlinePrefix") + e.message)}</div>`;
});
