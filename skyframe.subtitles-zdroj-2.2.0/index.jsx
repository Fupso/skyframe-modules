// skyframe.subtitles v2.0.0 — Titulky ako nástroj Editora (krok 56)
// AI prepis (Whisper, offline) + editor segmentov beží v pravom paneli
// Editora. Výsledok je krok v zásobníku úprav: vf=subtitles (dočasný
// .srt zapisuje core cez write_temp_srt). Titulky sa vypália v JEDNOM
// exporte spolu s ostatnými nástrojmi — bez medzikroku „burn".

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useSyncExternalStore } = React;
const tt = (k, f, vars) => {
  let str = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) str = str.replaceAll(`{${kk}}`, String(vv));
  return str;
};

const MODELS = ["base", "small", "medium", "large-turbo", "large"];

// ---------------------------------------------------------------------------
// Lokálny stav nástroja (busy/progress — segmenty samotné žijú v toolValues,
// aby sa auto-ukladali a prežili pád programu)
// ---------------------------------------------------------------------------

const initialState = {
  status: null,      // {runtime_installed, models: []}
  model: "small",
  busy: false,
  busyLabel: "",
  progress: -1,
  error: "",
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

async function refreshStatus() {
  try {
    const st = await api.invoke("whisper_status", {});
    store.setState({ status: st });
  } catch { /* ignore */ }
}

function fmtTime(s) {
  const ms = Math.round(s * 1000);
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  return `${mm}:${String(ss).padStart(2, "0")}.${String(Math.round((ms % 1000) / 10)).padStart(2, "0")}`;
}
function parseTime(str) {
  const m = /^(\d+):(\d+)[.,](\d+)$/.exec(String(str).trim());
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]) + (+m[3]) / 100;
}

// zapíše SRT cez core a potvrdí nové dáta do toolValues (autosave + rebuild kroku)
let lastWrittenPath = ""; // čerstvosť: po reštarte appky sa SRT vždy regeneruje
let lastScale = 1;
async function commit(onChange, value, segments, timeScale = 1) {
  try {
    // segmenty držíme v čase ZDROJA (editor ich tak ukazuje), do SRT idú
    // škálované — subtitles filter ich kreslí na časovú os PO časozbere
    const ts = timeScale > 0 && isFinite(timeScale) ? timeScale : 1;
    const scaled = ts === 1 ? segments : segments.map((g) => ({ start: g.start * ts, end: g.end * ts, text: g.text }));
    const srtPath = await api.invoke("write_temp_srt", { segments: scaled, previous: value?.srtPath ?? null });
    lastWrittenPath = srtPath;
    lastScale = ts;
    onChange({ segments, srtPath });
  } catch (e) {
    store.setState({ error: String(e) });
  }
}

async function transcribe(ctx, onChange, value, lang) {
  const ts = ctx?.timeScale > 0 ? ctx.timeScale : 1;
  if (!ctx.mediaPath) return;
  store.setState({ busy: true, progress: -1, busyLabel: "", error: "" });
  try {
    const st = store.getState().status;
    if (!st?.runtime_installed) {
      store.setState({ busyLabel: t("install_runtime", "Inštalujem runtime…") });
      await api.invoke("ensure_whisper_runtime", {});
    }
    const model = store.getState().model;
    if (!(st?.models ?? []).includes(model)) {
      store.setState({ busyLabel: t("install_model", "Sťahujem model…") });
      await api.invoke("ensure_whisper_model", { model });
    }
    const jobId = await api.invoke("transcribe_audio", {
      input: ctx.mediaPath,
      lang: lang || "auto",
      model,
      moduleId: api.moduleId,
    });
    const res = await watchJob(jobId, (j) =>
      store.setState({ progress: j.progress ?? -1, busyLabel: j.message || "" })
    );
    if (res.status === "done" && res.result) {
      const data = JSON.parse(res.result);
      const segments = (data.segments ?? []).map((g) => ({ start: g.start, end: g.end, text: g.text }));
      store.setState({ busy: false });
      await commit(onChange, value, segments, ts);
    } else if (res.status === "cancelled") {
      store.setState({ busy: false });
    } else {
      store.setState({ busy: false, error: res.message || "?" });
    }
  } catch (e) {
    store.setState({ busy: false, error: String(e) });
  }
}

// ---------------------------------------------------------------------------
// Custom pole: prepis + editor segmentov
// ---------------------------------------------------------------------------

const rowStyle = { display: "flex", gap: 4, alignItems: "center", marginBottom: 4 };
const inpStyle = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6, color: "inherit", fontSize: 11, padding: "3px 6px",
};
const btnStyle = {
  background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6,
  color: "inherit", fontSize: 11, padding: "3px 8px", cursor: "pointer",
};
const btnPrimary = { ...btnStyle, background: "#3b82f6", color: "#fff", fontWeight: 600 };

function SubtitlesField({ value, onChange, values, ctx }) {
  const timeScale = ctx?.timeScale > 0 ? ctx.timeScale : 1;
  const s = useStore();
  const segments = Array.isArray(value?.segments) ? value.segments : [];

  useEffect(() => {
    refreshStatus();
    const iv = setInterval(refreshStatus, 6000);
    return () => clearInterval(iv);
  }, []);

  // temp .srt neprežije reštart appky — obnovenú session preženieme cez
  // write_temp_srt znova, inak by export zlyhal na neexistujúcom súbore
  useEffect(() => {
    if (segments.length > 0 && (value?.srtPath !== lastWrittenPath || timeScale !== lastScale)) {
      void commit(onChange, value, segments, timeScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeScale]);

  const [saveMsg, setSaveMsg] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  // uloží titulky ako .srt do výstupného priečinka — časy ŠKÁLOVANÉ,
  // aby sedeli na exportované video (rovnako ako vypálené titulky)
  const saveSrt = async () => {
    if (segments.length === 0 || saveBusy) return;
    setSaveBusy(true); setSaveMsg("");
    try {
      const ts = timeScale > 0 && isFinite(timeScale) ? timeScale : 1;
      const scaled = ts === 1 ? segments : segments.map((g) => ({ start: g.start * ts, end: g.end * ts, text: g.text }));
      const p = await api.invoke("export_srt", { segments: scaled, outputName: null });
      setSaveMsg(tt("srt_saved", "✅ Uložené: {p}", { p }));
    } catch (e) {
      setSaveMsg(tt("srt_failed", "❌ {e}", { e: String(e) }));
    } finally {
      setSaveBusy(false);
    }
  };

  const upd = (i, patch) => {
    const next = segments.map((g, j) => (j === i ? { ...g, ...patch } : g));
    commit(onChange, value, next, timeScale);
  };
  const del = (i) => commit(onChange, value, segments.filter((_, j) => j !== i), timeScale);
  const add = () => {
    const last = segments[segments.length - 1];
    const start = last ? last.end : 0;
    commit(onChange, value, [...segments, { start, end: start + 2, text: "" }], timeScale);
  };
  const split = (i) => {
    const g = segments[i];
    const mid = (g.start + g.end) / 2;
    const words = g.text.split(" ");
    const half = Math.ceil(words.length / 2);
    const a = { ...g, end: mid, text: words.slice(0, half).join(" ") || g.text };
    const b = { start: mid, end: g.end, text: words.slice(half).join(" ") };
    const next = [...segments.slice(0, i), a, b, ...segments.slice(i + 1)];
    commit(onChange, value, next, timeScale);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* prepis */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={s.model}
          disabled={s.busy}
          onChange={(e) => store.setState({ model: e.target.value })}
          style={{ ...inpStyle, padding: "5px 8px" }}
        >
          {MODELS.map((m) => {
            const inst = (s.status?.models ?? []).includes(m);
            return <option key={m} value={m}>{m}{inst ? " ✓" : ""}</option>;
          })}
        </select>
        <button
          style={btnPrimary}
          disabled={s.busy || !ctx.mediaPath}
          onClick={() => void transcribe(ctx, onChange, value, values?.lang ?? "auto")}
        >
          {s.busy
            ? `${s.busyLabel || t("transcribing", "Prepisujem…")} ${s.progress >= 0 ? Math.round(s.progress) + " %" : ""}`
            : t("transcribe", "🎙️ Prepísať reč")}
        </button>
      </div>
      {s.error && <div style={{ color: "#f87171", fontSize: 11 }}>{s.error}</div>}

      {/* segmenty */}
      {segments.length > 0 && (
        <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 2 }}>
          {segments.map((g, i) => (
            <div key={i} style={rowStyle}>
              <input
                style={{ ...inpStyle, width: 58, fontFamily: "monospace" }}
                defaultValue={fmtTime(g.start)}
                key={`s${i}-${g.start}`}
                onBlur={(e) => { const v = parseTime(e.target.value); if (v != null && v < g.end) upd(i, { start: v }); else e.target.value = fmtTime(g.start); }}
              />
              <input
                style={{ ...inpStyle, width: 58, fontFamily: "monospace" }}
                defaultValue={fmtTime(g.end)}
                key={`e${i}-${g.end}`}
                onBlur={(e) => { const v = parseTime(e.target.value); if (v != null && v > g.start) upd(i, { end: v }); else e.target.value = fmtTime(g.end); }}
              />
              <input
                style={{ ...inpStyle, flex: 1, minWidth: 0 }}
                defaultValue={g.text}
                key={`t${i}-${g.text}`}
                placeholder={t("text_ph", "text titulku…")}
                onBlur={(e) => { if (e.target.value !== g.text) upd(i, { text: e.target.value }); }}
              />
              <button style={btnStyle} title={t("split", "Rozdeliť")} onClick={() => split(i)}>✂</button>
              <button style={{ ...btnStyle, color: "#f87171" }} title={t("del", "Zmazať")} onClick={() => del(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btnStyle} onClick={add}>＋ {t("add", "Pridať titulok")}</button>
        {segments.length > 0 && (
          <button style={btnStyle} disabled={saveBusy} onClick={() => { void saveSrt(); }}>
            {saveBusy ? t("srt_saving", "⏳ Ukladám…") : `💾 ${t("srt_save", "Uložiť SRT")}`}
          </button>
        )}
        {segments.length > 0 && (
          <button
            style={{ ...btnStyle, color: "#f87171" }}
            onClick={() => onChange(null)}
          >
            {t("clear", "Zrušiť titulky")}
          </button>
        )}
      </div>
      {saveMsg && (
        <div style={{ fontSize: 10, color: saveMsg.startsWith("✅") ? "#34d399" : "#f87171", wordBreak: "break-all" }}>{saveMsg}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrácia nástroja
// ---------------------------------------------------------------------------

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

api.registerTool({
  icon: "💬",
  labelKey: "title",
  fields: [
    { id: "lang", type: "select", labelKey: "lang", default: "auto",
      options: [
        { value: "auto", labelKey: "lang_auto" },
        { value: "sk", labelKey: "lang_sk" },
        { value: "en", labelKey: "lang_en" },
        { value: "de", labelKey: "lang_de" },
        { value: "ru", labelKey: "lang_ru" },
        { value: "zh", labelKey: "lang_zh" },
      ] },
    { id: "subs", type: "custom", labelKey: "segments", component: SubtitlesField },
    { id: "sec_style", type: "separator", labelKey: "sec_style" },
    { id: "fontSize", type: "number", labelKey: "font_size", min: 8, max: 72, step: 1, default: 20 },
    { id: "position", type: "select", labelKey: "position", default: "bottom",
      options: [
        { value: "bottom", labelKey: "pos_bottom" },
        { value: "top", labelKey: "pos_top" },
      ] },
    { id: "marginV", type: "number", labelKey: "margin_v", min: 0, max: 200, step: 2, default: 36 },
  ],
  buildStep(values, ctx) {
    if (ctx.kind !== "video") return null;
    const subs = values.subs;
    const segments = subs && Array.isArray(subs.segments) ? subs.segments : [];
    if (!subs?.srtPath || segments.length === 0) return null;

    const fs = clamp(Number(values.fontSize) || 20, 8, 72);
    const margin = clamp(Number(values.marginV) || 0, 0, 400);
    const align = values.position === "top" ? 8 : 2;
    // escaping pre subtitles filter (Windows: \ → \\, : → \:)
    const esc = String(subs.srtPath).replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    const vf = `subtitles=filename='${esc}':force_style='FontName=Arial,FontSize=${fs},PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=${align},MarginV=${margin || 36}'`;
    return { label: `💬 ${t("lbl_count", "titulky")} (${segments.length})`, vf };
  },
});

// Loader vyžaduje default export — nástroj žije v Editore.
export default function SubtitlesToolStub() {
  return React.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "Nástroj Titulky nájdeš v Editore — v pravom paneli nástrojov.")
  );
}
