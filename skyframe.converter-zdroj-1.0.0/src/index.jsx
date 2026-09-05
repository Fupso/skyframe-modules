// skyframe.converter v1.0.0 — Konvertor (HandBrake-style)
// Samostatná stránka: fronta súborov + nastavenia konverzie. Jazdec je
// core command convert_video_ex (krok 43) — HW enkodér sa vyberie sám.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useRef, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];

const RESOLUTIONS = ["orig", "3840", "2560", "1920", "1280", "854"];
const FPS_OPTS = ["orig", "24", "25", "30", "50", "60"];
const AUDIO_OPTS = ["orig", "320", "192", "128", "96", "none"];
const FORMATS = ["mp4", "mkv", "mov"];

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const PRESETS = ["youtube_4k", "youtube_1080", "instagram", "tiktok", "email", "archive"];

const initialState = {
  files: [],        // { path, status: "queued"|"running"|"done"|"error"|"cancelled", progress, result, error }[]
  mode: "custom",   // "custom" | preset id (youtube_4k, tiktok…)
  resolution: "orig",
  crf: 23,
  fps: "orig",
  audio: "orig",
  format: "mp4",
  outDir: "",
  running: false,
  log: [],
  restored: false,
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

const cancelFlag = { current: false };
const saveTimer = { current: null };

function log(line) {
  const ts = new Date().toLocaleTimeString();
  store.setState((s) => ({ log: [`[${ts}] ${line}`, ...s.log].slice(0, 120) }));
}

function setFile(i, patch) {
  store.setState((s) => ({
    files: s.files.map((f, j) => (j === i ? { ...f, ...patch } : f)),
  }));
}

// ---------------------------------------------------------------------------
// Fronta — sekvenčne, každý súbor = jedna úloha v core
// ---------------------------------------------------------------------------

function watchJob(jobId, i) {
  return new Promise((resolve) => {
    let unlisten;
    api
      .listenJob(jobId, (job) => {
        setFile(i, { progress: Math.max(0, job.progress ?? 0), message: job.message || "" });
        if (job.status !== "running") {
          unlisten?.();
          resolve(job);
        }
      })
      .then((u) => { unlisten = u; });
  });
}

async function runQueue() {
  const s = store.getState();
  if (s.running || !s.files.length) return;
  cancelFlag.current = false;
  store.setState({ running: true, files: s.files.map((f) => ({ ...f, status: "queued", progress: 0, result: null, error: "" })) });
  log(`${t("start_log", "Spúšťam")} ${s.files.length} ${t("files_word", "súborov")}…`);

  for (let i = 0; i < s.files.length; i++) {
    if (cancelFlag.current) {
      store.setState((st) => ({ files: st.files.map((f, j) => (j >= i && f.status === "queued" ? { ...f, status: "cancelled" } : f)) }));
      break;
    }
    const f = store.getState().files[i];
    setFile(i, { status: "running", progress: 0 });
    try {
      const st = store.getState();
      const jobId = st.mode === "custom"
        ? await api.invoke("convert_video_ex", {
            input: f.path,
            resolution: st.resolution,
            crf: st.crf,
            fps: st.fps,
            audio: st.audio,
            format: st.format,
            moduleId: api.moduleId,
            outputDir: st.outDir || null,
          })
        : await api.invoke("convert_video", {
            input: f.path,
            preset: st.mode,
            moduleId: api.moduleId,
            outputDir: st.outDir || null,
          });
      const res = await watchJob(jobId, i);
      if (res.status === "done" && res.result) {
        setFile(i, { status: "done", progress: 100, result: res.result });
        log(`✓ ${baseName(f.path)} → ${baseName(res.result)}`);
      } else if (res.status === "cancelled") {
        setFile(i, { status: "cancelled" });
        log(`⊘ ${baseName(f.path)} — ${t("cancelled", "zrušené")}`);
      } else {
        setFile(i, { status: "error", error: res.message || "?" });
        log(`✕ ${baseName(f.path)}: ${res.message || "?"}`);
      }
    } catch (e) {
      setFile(i, { status: "error", error: String(e) });
      log(`✕ ${baseName(f.path)}: ${String(e)}`);
    }
  }
  store.setState({ running: false });
  log(t("queue_done", "Fronta dokončená."));
}

async function cancelRunning() {
  cancelFlag.current = true;
  const st = store.getState();
  const cur = st.files.findIndex((f) => f.status === "running");
  if (cur >= 0) {
    try { await api.invoke("cancel_job", { jobId: st.files[cur].jobId }); } catch {}
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function Select({ label, value, onChange, options, labels, disabled }) {
  return (
    <div>
      <label className="block text-xs text-text-dim mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{labels ? labels[o] : o}</option>
        ))}
      </select>
    </div>
  );
}

function Converter() {
  const s = useStore();
  const sRef = useRef(s);
  sRef.current = s;

  // payload z iného modulu (krok 43): { files: [...] } — napr. Spájač po spojení
  useEffect(() => {
    const handler = (e) => {
      const files = e.detail?.files;
      if (!Array.isArray(files)) return;
      const existing = new Set(store.getState().files.map((f) => f.path));
      const fresh = files.filter((p) => typeof p === "string" && !existing.has(p))
        .map((p) => ({ path: p, status: "queued", progress: 0, result: null, error: "" }));
      if (fresh.length) {
        store.setState((st) => ({ files: [...st.files, ...fresh] }));
        log(`📥 ${fresh.length} ${t("files_received", "súborov prijatých z iného modulu")}`);
      }
    };
    window.addEventListener("skyframe-module-payload-skyframe.converter", handler);
    return () => window.removeEventListener("skyframe-module-payload-skyframe.converter", handler);
  }, []);

  // obnova relácie
  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        const sess = cfg?.session;
        if (sess) {
          const patch = {};
          for (const k of ["resolution", "fps", "audio", "format", "outDir"]) if (typeof sess[k] === "string") patch[k] = sess[k];
          if (typeof sess.crf === "number") patch.crf = Math.max(16, Math.min(32, sess.crf));
          if (sess.mode === "custom" || PRESETS.includes(sess.mode)) patch.mode = sess.mode;
          if (Array.isArray(sess.files)) patch.files = sess.files.filter((x) => typeof x === "string").map((p) => ({ path: p, status: "queued", progress: 0, result: null, error: "" }));
          store.setState(patch);
        }
      } catch {}
      store.setState({ restored: true });
    })();
  }, []);

  // ukladanie relácie (debounce)
  useEffect(() => {
    if (!s.restored || s.running) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const st = store.getState();
      api.invoke("set_module_config", {
        id: api.moduleId,
        config: { session: {
          files: st.files.map((f) => f.path),
          mode: st.mode,
          resolution: st.resolution, crf: st.crf, fps: st.fps,
          audio: st.audio, format: st.format, outDir: st.outDir,
        } },
      }).catch(() => {});
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [s.files, s.mode, s.resolution, s.crf, s.fps, s.audio, s.format, s.outDir, s.restored, s.running]);

  const addFiles = async () => {
    const picked = await api.pickFiles(VIDEO_FILTERS, true);
    const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (!paths.length) return;
    const existing = new Set(store.getState().files.map((f) => f.path));
    const fresh = paths.filter((p) => !existing.has(p)).map((p) => ({ path: p, status: "queued", progress: 0, result: null, error: "" }));
    store.setState((st) => ({ files: [...st.files, ...fresh] }));
  };

  const audioLabels = {
    orig: t("audio_orig", "Pôvodný (kopírovať)"),
    "320": "AAC 320 kbps", "192": "AAC 192 kbps", "128": "AAC 128 kbps", "96": "AAC 96 kbps",
    none: t("audio_none", "Bez zvuku"),
  };
  const resLabels = {
    orig: t("res_orig", "Pôvodné"),
    "3840": "4K UHD (3840)", "2560": "QHD (2560)", "1920": "Full HD (1920)", "1280": "HD (1280)", "854": "SD (854)",
  };
  const fpsLabels = { orig: t("fps_orig", "Pôvodné"), "24": "24", "25": "25", "30": "30", "50": "50", "60": "60" };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">🔄 {t("title", "Konvertor")}</h2>
            <button
              onClick={() => void addFiles()}
              disabled={s.running}
              className="px-4 py-2 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              ➕ {t("add_files", "Pridať videá")}
            </button>
          </div>

          {s.files.length === 0 ? (
            <button
              onClick={() => void addFiles()}
              className="w-full rounded-xl border border-dashed border-border hover:border-accent/40 transition-colors py-14 text-center"
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-sm font-medium">{t("drop_hint", "Vyber videá na konverziu")}</p>
              <p className="text-xs text-text-dim mt-1">MP4 · MOV · MKV · AVI · WebM</p>
            </button>
          ) : (
            <div className="space-y-2">
              {s.files.map((f, i) => (
                <div key={f.path} className="flex items-center gap-3 bg-bg rounded-xl border border-border px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm truncate">{baseName(f.path)}</span>
                      <span className={`text-[11px] font-mono shrink-0 ${f.status === "error" ? "text-error" : f.status === "done" ? "text-success" : "text-text-dim"}`}>
                        {f.status === "running" ? `${Math.round(f.progress)}%`
                          : f.status === "done" ? "✓"
                          : f.status === "error" ? t("error", "chyba")
                          : f.status === "cancelled" ? t("cancelled", "zrušené")
                          : t("queued", "čaká")}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden border border-border mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${f.status === "error" ? "bg-error" : f.status === "done" ? "bg-success" : "bg-accent"}`}
                        style={{ width: `${f.status === "done" ? 100 : f.progress}%` }}
                      />
                    </div>
                    {f.error && <p className="text-[11px] text-error mt-1 truncate">{f.error}</p>}
                  </div>
                  {!s.running && (
                    <button
                      onClick={() => store.setState((st) => ({ files: st.files.filter((_, j) => j !== i) }))}
                      className="px-2 py-1 text-error hover:bg-error/10 rounded text-xs shrink-0"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nastavenia */}
        <div className="bg-bg-card rounded-2xl border border-border p-6">
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-4">{t("settings", "Nastavenia konverzie")}</h3>

          {/* Rýchle presety (core convert_video — pad/crop pre platformy) */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => store.setState({ mode: "custom" })}
              disabled={s.running}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${s.mode === "custom" ? "bg-accent text-white border-accent" : "bg-bg text-text-dim border-border hover:text-text"}`}
            >
              ⚙️ {t("mode_custom", "Vlastné")}
            </button>
            {PRESETS.map((pr) => (
              <button
                key={pr}
                onClick={() => store.setState({ mode: pr })}
                disabled={s.running}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${s.mode === pr ? "bg-accent text-white border-accent" : "bg-bg text-text-dim border-border hover:text-text"}`}
              >
                {t(`preset_${pr}`, pr)}
              </button>
            ))}
          </div>

          {s.mode !== "custom" && (
            <p className="text-[11px] text-text-dim mb-4">{t(`preset_desc_${s.mode}`, "")}</p>
          )}

          {s.mode === "custom" && (<>
          <div className="grid grid-cols-2 gap-4">
            <Select label={t("resolution", "Rozlíšenie")} value={s.resolution} onChange={(v) => store.setState({ resolution: v })} options={RESOLUTIONS} labels={resLabels} disabled={s.running} />
            <Select label={t("fps", "Snímková frekvencia")} value={s.fps} onChange={(v) => store.setState({ fps: v })} options={FPS_OPTS} labels={fpsLabels} disabled={s.running} />
            <Select label={t("audio", "Zvuk")} value={s.audio} onChange={(v) => store.setState({ audio: v })} options={AUDIO_OPTS} labels={audioLabels} disabled={s.running} />
            <Select label={t("format", "Formát")} value={s.format} onChange={(v) => store.setState({ format: v })} options={FORMATS} disabled={s.running} />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-dim mb-1.5">
              <span>{t("quality", "Kvalita (CRF)")}</span>
              <span className="font-mono">{s.crf} — {s.crf <= 20 ? t("quality_high", "vysoká") : s.crf <= 26 ? t("quality_balanced", "vyvážená") : t("quality_small", "malý súbor")}</span>
            </div>
            <input
              type="range" min={16} max={32} step={1} value={s.crf}
              onChange={(e) => store.setState({ crf: parseInt(e.target.value, 10) })}
              disabled={s.running}
              className="w-full accent-[#6366f1]"
            />
            <p className="text-[11px] text-text-dim mt-1">{t("crf_hint", "Menšie číslo = lepšia kvalita a väčší súbor. 23 je dobrý štandard.")}</p>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-text-dim mb-1.5">{t("output_dir", "Výstupný priečinok (voliteľné)")}</label>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => { const d = await api.pickDirectory(); if (d) store.setState({ outDir: d }); }}
                disabled={s.running}
                className="px-3 py-2 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
              >
                {s.outDir ? t("change", "Zmeniť") : t("browse", "Vybrať…")}
              </button>
              <span className="text-[11px] font-mono text-text-dim truncate flex-1">{s.outDir || t("default_output", "(predvolený priečinok aplikácie)")}</span>
              {s.outDir && (
                <button onClick={() => store.setState({ outDir: "" })} disabled={s.running} className="px-2 py-1 text-error hover:bg-error/10 rounded text-xs">✕</button>
              )}
            </div>
          </div>
          </>)}
        </div>

        {/* Spustenie */}
        <div className="flex gap-2">
          {s.running ? (
            <button onClick={() => void cancelRunning()} className="flex-1 px-4 py-3 rounded-xl text-sm bg-error/80 text-white hover:bg-error">
              ⏹ {t("cancel_queue", "Zrušiť frontu")}
            </button>
          ) : (
            <button
              onClick={() => void runQueue()}
              disabled={!s.files.length}
              className="flex-1 px-4 py-3 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              ▶ {t("start", "Spustiť konverziu")} ({s.files.length})
            </button>
          )}
        </div>

        {/* Log */}
        {s.log.length > 0 && (
          <div className="bg-bg-card rounded-2xl border border-border p-4">
            <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("log", "Log")}</h3>
            <div className="max-h-36 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5">
              {s.log.map((line, i) => (<div key={i}>{line}</div>))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Converter;
