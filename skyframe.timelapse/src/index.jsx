// skyframe.timelapse v1.1.0 — Časozber (timelapse/hyperlapse)
// Vyber video → zvoľ zrýchlenie (alebo cieľovú dĺžku) → vytvor →
// výsledok otvoríš v Editore na ďalšie úpravy.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useRef, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];
const PRESETS = [2, 4, 8, 16, 30, 60];

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

function fmtDur(sec) {
  if (!sec || !isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} s`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  video: null,
  duration: 0,          // dĺžka zdroja (s)
  factor: 30,           // zrýchlenie
  target: "",           // cieľová dĺžka (s) — ak zadaná, prepisuje factor
  audio: "none",        // none | speed
  busy: false,
  progress: -1,
  busyLabel: "",
  result: "",
  error: "",
  log: [],
};

let state = { ...initialState };
const listeners = new Set();
const store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
function useStore() {
  return useSyncExternalStore(store.subscribe, store.getState);
}

function log(line) {
  const ts = new Date().toLocaleTimeString();
  store.setState((s) => ({ log: [`[${ts}] ${line}`, ...s.log].slice(0, 100) }));
}

function watchJob(jobId, onProgress) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      onProgress?.(job);
      if (job.status !== "running") {
        unlisten?.();
        resolve(job);
      }
    }).then((u) => { unlisten = u; });
  });
}

// ---------------------------------------------------------------------------
// Akcie
// ---------------------------------------------------------------------------

async function pickVideo() {
  const f = await api.pickFiles(VIDEO_FILTERS, false);
  const path = Array.isArray(f) ? f[0] : f;
  if (!path) return;
  store.setState({ video: path, result: "", error: "", duration: 0 });
  try {
    const info = await api.invoke("get_video_info", { path });
    store.setState({ duration: info.duration ?? 0 });
  } catch { /* bez info — odhad nezobrazíme */ }
}

function effFactor(s) {
  const tgt = parseFloat(String(s.target).replace(",", "."));
  if (tgt > 0 && s.duration > 0) return Math.max(1, s.duration / tgt);
  return s.factor;
}

async function create() {
  const s = store.getState();
  if (!s.video) {
    store.setState({ error: t("err_no_video", "Najprv vyber video") });
    return;
  }
  const f = effFactor(s);
  store.setState({ busy: true, progress: -1, busyLabel: "", error: "", result: "" });
  log(`⏩ ${baseName(s.video)} — ${Math.round(f)}×`);
  try {
    const jobId = await api.invoke("timelapse_video", { input: s.video, factor: f, moduleId: api.moduleId });
    const res = await watchJob(jobId, (j) => store.setState({ progress: j.progress ?? -1, busyLabel: j.message || "" }));
    if (res.status === "done" && res.result) {
      store.setState({ result: res.result, busy: false });
      log(`✓ ${t("done", "Hotovo")}: ${baseName(res.result)}`);
    } else if (res.status === "cancelled") {
      store.setState({ busy: false });
      log("⊘ zrušené");
    } else {
      store.setState({ busy: false, error: res.message || "?" });
      log("✗ " + (res.message || "?"));
    }
  } catch (e) {
    store.setState({ busy: false, error: String(e) });
    log("✗ " + String(e));
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const btnStyle = {
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600,
};
const btnGhost = { ...btnStyle, background: "rgba(255,255,255,0.08)", color: "inherit" };
const selectStyle = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)", color: "inherit",
};

// Živý náhľad rýchlosti — prehráva video s playbackRate = faktor
function Preview({ src, factor }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // prehliadač zvládne max ~16× — nad tým beží náhľad na 16×
    try { v.playbackRate = Math.min(16, Math.max(0.25, factor)); } catch {}
  }, [factor]);
  return (
    <div>
      <video ref={ref} src={api.fileSrc(src)} controls muted
        style={{ width: "100%", maxHeight: 400, background: "#000", borderRadius: 12, display: "block" }} />
      {factor > 16 && (
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
          {t("preview_cap", "Náhľad beží max 16× — výsledok bude rýchlejší")} ({Math.round(factor)}×)
        </div>
      )}
    </div>
  );
}

function TimelapsePage() {
  const s = useStore();
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((x) => x + 1)), []);

  const f = effFactor(s);
  const outLen = s.duration > 0 ? s.duration / f : 0;

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>⏩ {t("title", "Časozber")}</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button style={s.video ? btnGhost : btnStyle} onClick={pickVideo} disabled={s.busy}>
          {s.video ? t("change", "Zmeniť") : t("pick_video", "Vybrať video")}
        </button>
        {s.video && <span style={{ opacity: 0.7, fontSize: 13 }}>{baseName(s.video)}</span>}
      </div>

      {!s.video && (
        <div style={{ opacity: 0.6, padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12 }}>
          {t("empty", "Vyber video — z dlhého záznamu spravíš krátke zrýchlené video")}
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>{t("hint", "Tip: 30× premení 15-minútový let na 30 sekúnd")}</div>
        </div>
      )}

      {s.video && (
        <>
          <Preview src={s.video} factor={f} />
          {/* zrýchlenie */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>{t("speed", "Zrýchlenie")}:</span>
            {PRESETS.map((p) => (
              <button
                key={p}
                style={{ ...btnGhost, padding: "5px 12px", fontWeight: s.factor === p && !s.target ? 700 : 400,
                  background: s.factor === p && !s.target ? "rgba(59,130,246,0.35)" : btnGhost.background }}
                disabled={s.busy}
                onClick={() => store.setState({ factor: p, target: "" })}
              >
                {p}×
              </button>
            ))}
            <input
              type="number" min="1" max="240" step="1"
              value={s.factor}
              disabled={s.busy}
              onChange={(e) => store.setState({ factor: Math.max(1, Math.min(240, parseFloat(e.target.value) || 1)), target: "" })}
              style={{ ...selectStyle, width: 80 }}
              title={t("custom", "vlastné…")}
            />
            <span style={{ opacity: 0.5 }}>×</span>
          </div>

          {/* cieľová dĺžka */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>{t("target_len", "Cieľová dĺžka (s)")}:</span>
            <input
              type="number" min="1" step="1"
              value={s.target}
              placeholder="—"
              disabled={s.busy}
              onChange={(e) => store.setState({ target: e.target.value })}
              style={{ ...selectStyle, width: 90 }}
            />
            <span style={{ fontSize: 12, opacity: 0.5 }}>({t("custom", "vlastné…")} — {t("speed", "Zrýchlenie").toLowerCase()} sa prepočíta)</span>
          </div>

          {/* súhrn */}
          {s.duration > 0 && (
            <div style={{ fontSize: 13, fontFamily: "monospace", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
              {t("src_len", "Dĺžka videa")}: {fmtDur(s.duration)} → <b>{Math.round(f)}×</b> → {t("out_len", "Výstup")}: ≈ {fmtDur(outLen)} · {t("audio_note", "zvuk sa zrýchli spolu s videom")}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={btnStyle} disabled={s.busy} onClick={() => void create()}>
              {s.busy ? `${t("creating", "Vytváram…")} ${s.progress >= 0 ? Math.round(s.progress) + " %" : ""}` : t("create", "⏩ Vytvoriť časozber")}
            </button>
            {s.busy && (
              <button style={btnGhost} onClick={() => api.cancelJob?.()}>{/* cancel cez jobs UI */}✕</button>
            )}
          </div>

          {s.error && <div style={{ color: "#f87171", fontSize: 13 }}>{s.error}</div>}

          {/* výsledok */}
          {s.result && (
            <div style={{ border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13 }}>✓ {t("done", "Hotovo")}: <b>{baseName(s.result)}</b></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btnStyle} onClick={() => api.editMedia?.(s.result)}>
                  {t("open_editor", "🖌️ Otvoriť v Editore")}
                </button>
                <button style={btnGhost} onClick={() => api.invoke("open_in_file_manager", { path: s.result })}>
                  {t("open_folder", "📂 Otvoriť priečinok")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {s.log.length > 0 && (
        <div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{t("log_title", "Záznam")}</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", opacity: 0.75, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 10, maxHeight: 120, overflowY: "auto" }}>
            {s.log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimelapsePage;
