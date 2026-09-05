// skyframe.subtitles v1.0.0 — Titulky (Whisper AI)
// Prepis reči → editovateľné segmenty v SPODNOM paneli → SRT alebo
// vypálené titulky vo videu. Prepis beží lokálne cez whisper.cpp.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];
const LANGS = [
  { id: "auto", key: "lang_auto" },
  { id: "sk", key: "lang_sk" },
  { id: "en", key: "lang_en" },
  { id: "de", key: "lang_de" },
  { id: "ru", key: "lang_ru" },
  { id: "zh", key: "lang_zh" },
];

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

function fmtTime(s) {
  const ms = Math.round(s * 1000);
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const mmm = ms % 1000;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(mmm).padStart(3, "0")}`;
}

function parseTime(str) {
  const m = /^(\d+):(\d+)[.,](\d+)$/.exec(str.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) / 1000;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  media: null,            // path
  lang: "auto",
  segments: [],           // {start, end, text}[]
  srtPath: "",
  status: null,           // {runtime_installed, model_installed} | null
  busy: false,            // prebieha prepis/pálenie
  busyLabel: "",
  progress: -1,
  outDir: "",
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

function log(line) {
  const ts = new Date().toLocaleTimeString();
  store.setState((s) => ({ log: [`[${ts}] ${line}`, ...s.log].slice(0, 100) }));
}

function watchJob(jobId, onProgress) {
  return new Promise((resolve) => {
    let unlisten;
    api
      .listenJob(jobId, (job) => {
        onProgress?.(job);
        if (job.status !== "running") {
          unlisten?.();
          resolve(job);
        }
      })
      .then((u) => { unlisten = u; });
  });
}

// ---------------------------------------------------------------------------
// Akcie
// ---------------------------------------------------------------------------

async function refreshStatus() {
  try {
    const st = await api.invoke("whisper_status", {});
    store.setState({ status: st });
  } catch {
    store.setState({ status: null });
  }
}

async function ensureAll() {
  const r = await api.invoke("ensure_whisper_runtime", {});
  if (r) {
    log(t("dl_runtime", "Sťahujem Whisper runtime…"));
    await watchJob(r, (j) => store.setState({ busyLabel: j.message || "", progress: j.progress ?? -1 }));
  }
  const m = await api.invoke("ensure_whisper_model", {});
  if (m) {
    log(t("dl_model", "Sťahujem Whisper model (142 MB)…"));
    await watchJob(m, (j) => store.setState({ busyLabel: j.message || "", progress: j.progress ?? -1 }));
  }
  await refreshStatus();
}

async function transcribe() {
  const s = store.getState();
  if (!s.media || s.busy) return;
  store.setState({ busy: true, busyLabel: "", progress: -1 });
  log(`${t("transcribing", "Prepisujem")}: ${baseName(s.media)}`);
  try {
    await ensureAll();
    const st = store.getState().status;
    if (!st?.runtime_installed || !st?.model_installed) {
      log(`⚠️ ${t("whisper_missing", "Whisper nie je nainštalovaný — pozri AI centrum.")}`);
      return;
    }
    const jobId = await api.invoke("transcribe_audio", {
      input: store.getState().media,
      lang: store.getState().lang,
      moduleId: api.moduleId,
    });
    const res = await watchJob(jobId, (j) => store.setState({ progress: j.progress ?? -1, busyLabel: j.message || "" }));
    if (res.status === "done" && res.result) {
      const data = JSON.parse(res.result);
      store.setState({ segments: data.segments || [], srtPath: data.srt_path || "" });
      log(`✓ ${t("segments_done", "Segmentov")}: ${(data.segments || []).length} → ${baseName(data.srt_path || "")}`);
    } else if (res.status === "cancelled") {
      log(`⊘ ${t("cancelled", "zrušené")}`);
    } else {
      log(`✕ ${res.message || "?"}`);
    }
  } catch (e) {
    log(`✕ ${String(e)}`);
  } finally {
    store.setState({ busy: false, progress: -1, busyLabel: "" });
  }
}

async function saveSrt() {
  const s = store.getState();
  if (!s.segments.length) return;
  try {
    const path = await api.invoke("export_srt", {
      segments: s.segments,
      outputName: s.media ? baseName(s.media).replace(/\.[^.]+$/, "") : null,
    });
    store.setState({ srtPath: path });
    log(`✓ SRT: ${path}`);
  } catch (e) {
    log(`✕ ${String(e)}`);
  }
}

async function burn() {
  const s = store.getState();
  if (!s.media || !s.segments.length || s.busy) return;
  store.setState({ busy: true, progress: -1, busyLabel: t("burning", "Pálim titulky do videa…") });
  try {
    const jobId = await api.invoke("burn_subtitles", {
      input: s.media,
      segments: s.segments,
      moduleId: api.moduleId,
      outputDir: s.outDir || null,
    });
    const res = await watchJob(jobId, (j) => store.setState({ progress: j.progress ?? -1, busyLabel: j.message || t("burning", "Pálim titulky do videa…") }));
    if (res.status === "done" && res.result) {
      log(`✓ ${t("burn_done", "Vypálené")}: ${res.result}`);
      if (api.setActiveMedia) api.setActiveMedia(res.result);
    } else if (res.status !== "cancelled") {
      log(`✕ ${res.message || "?"}`);
    }
  } catch (e) {
    log(`✕ ${String(e)}`);
  } finally {
    store.setState({ busy: false, progress: -1, busyLabel: "" });
  }
}

// ---------------------------------------------------------------------------
// Spodný panel — editor segmentov (časová os textu)
// ---------------------------------------------------------------------------

function SegmentsPanel() {
  const s = useStore();
  const upd = (i, patch) =>
    store.setState((st) => ({ segments: st.segments.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));

  if (!s.segments.length) {
    return (
      <div className="h-full flex items-center justify-center text-text-dim text-xs px-4 text-center">
        {t("no_segments", "Žiadne segmenty — spusti prepis a titulky sa objavia tu.")}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3 py-2 space-y-1">
      {s.segments.map((g, i) => (
        <div key={i} className="flex items-center gap-2 bg-bg rounded-lg border border-border px-2 py-1.5">
          <span className="text-[10px] font-mono text-text-dim w-6 shrink-0 text-right">{i + 1}</span>
          <input
            defaultValue={fmtTime(g.start)}
            onBlur={(e) => { const v = parseTime(e.target.value); if (v != null && v < g.end) upd(i, { start: v }); else e.target.value = fmtTime(g.start); }}
            disabled={s.busy}
            className="w-20 px-1.5 py-1 bg-bg-card rounded border border-border text-[11px] font-mono text-text text-center"
            title={t("seg_start", "Začiatok (mm:ss.mmm)")}
          />
          <span className="text-text-dim text-[10px]">→</span>
          <input
            defaultValue={fmtTime(g.end)}
            onBlur={(e) => { const v = parseTime(e.target.value); if (v != null && v > g.start) upd(i, { end: v }); else e.target.value = fmtTime(g.end); }}
            disabled={s.busy}
            className="w-20 px-1.5 py-1 bg-bg-card rounded border border-border text-[11px] font-mono text-text text-center"
            title={t("seg_end", "Koniec (mm:ss.mmm)")}
          />
          <input
            value={g.text}
            onChange={(e) => upd(i, { text: e.target.value })}
            disabled={s.busy}
            className="flex-1 px-2 py-1 bg-bg-card rounded border border-border text-xs text-text min-w-0"
          />
          <button
            onClick={() => {
              // rozdelenie segmentu na dva (v strede)
              const mid = (g.start + g.end) / 2;
              const words = g.text.split(" ");
              const half = Math.ceil(words.length / 2);
              const a = { ...g, end: mid, text: words.slice(0, half).join(" ") || g.text };
              const b = { start: mid, end: g.end, text: words.slice(half).join(" ") || g.text };
              store.setState((st) => ({ segments: [...st.segments.slice(0, i), a, b, ...st.segments.slice(i + 1)] }));
            }}
            disabled={s.busy}
            title={t("seg_split", "Rozdeliť segment")}
            className="px-1.5 py-1 rounded text-[11px] text-text-dim hover:bg-bg-card-hover shrink-0"
          >✂️</button>
          <button
            onClick={() => store.setState((st) => ({ segments: st.segments.filter((_, j) => j !== i) }))}
            disabled={s.busy}
            title={t("seg_delete", "Zmazať segment")}
            className="px-1.5 py-1 rounded text-[11px] text-error hover:bg-error/10 shrink-0"
          >✕</button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hlavná stránka
// ---------------------------------------------------------------------------

function Subtitles() {
  const s = useStore();

  useEffect(() => {
    refreshStatus();
    const iv = setInterval(refreshStatus, 4000);
    return () => clearInterval(iv);
  }, []);

  // spodný panel = editor segmentov
  useEffect(() => {
    if (api.registerBottomPanel) api.registerBottomPanel(SegmentsPanel);
  }, []);

  const pickMedia = async () => {
    const f = await api.pickFiles(VIDEO_FILTERS, false);
    const path = Array.isArray(f) ? f[0] : f;
    if (path) store.setState({ media: path, segments: [], srtPath: "" });
  };

  const ready = s.status?.runtime_installed && s.status?.model_installed;

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">💬 {t("title", "Titulky")}</h2>

          {/* Zdroj */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => void pickMedia()}
              disabled={s.busy}
              className="px-4 py-2 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              🎬 {s.media ? baseName(s.media) : t("pick_video", "Vybrať video")}
            </button>
            {s.media && !s.busy && (
              <button onClick={() => store.setState({ media: null, segments: [], srtPath: "" })} className="px-2 py-1 text-error hover:bg-error/10 rounded text-xs">✕</button>
            )}
          </div>

          {!ready && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              ⚠️ {t("setup_needed", "Whisper runtime a model sa stiahnu automaticky pri prvom prepise (alebo v AI centre). ~250 MB spolu.")}
            </div>
          )}

          {/* Jazyk + prepis */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={s.lang}
              onChange={(e) => store.setState({ lang: e.target.value })}
              disabled={s.busy}
              className="px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none"
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>{t(l.key, l.id)}</option>
              ))}
            </select>
            <button
              onClick={() => void transcribe()}
              disabled={!s.media || s.busy}
              className="px-4 py-2 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              {s.busy ? `⏳ ${s.busyLabel || "…"}` : `🎙️ ${t("transcribe", "Prepísať reč")}`}
            </button>
            {s.busy && s.progress >= 0 && <span className="text-xs font-mono text-text-dim">{Math.round(s.progress)} %</span>}
          </div>

          {/* Výstup */}
          {s.segments.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs text-text-dim">
                {t("segments_count", "Segmentov")}: <b className="text-text">{s.segments.length}</b>
                {s.srtPath && <> · SRT: <span className="font-mono">{baseName(s.srtPath)}</span></>}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void saveSrt()}
                  disabled={s.busy}
                  className="px-4 py-2 rounded-xl text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40"
                >
                  💾 {t("save_srt", "Uložiť SRT")}
                </button>
                <button
                  onClick={() => void burn()}
                  disabled={s.busy || !s.media}
                  className="px-4 py-2 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
                >
                  🔥 {t("burn", "Vypáliť do videa")}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { const d = await api.pickDirectory(); if (d) store.setState({ outDir: d }); }}
                  disabled={s.busy}
                  className="px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text"
                >
                  {s.outDir ? t("change", "Zmeniť") : t("browse", "Výstupný priečinok…")}
                </button>
                <span className="text-[11px] font-mono text-text-dim truncate">{s.outDir || t("default_output", "(predvolený priečinok aplikácie)")}</span>
              </div>
              <p className="text-[11px] text-text-dim">{t("burn_hint", "Vypálenie vloží titulky natrvalo do obrazu (MP4, zvuk sa skopíruje). Text upravíš v spodnom paneli.")}</p>
            </div>
          )}
        </div>

        {/* Log */}
        {s.log.length > 0 && (
          <div className="bg-bg-card rounded-2xl border border-border p-4">
            <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("log", "Log")}</h3>
            <div className="max-h-32 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5">
              {s.log.map((line, i) => (<div key={i}>{line}</div>))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subtitles;
