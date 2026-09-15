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
  model: "large-turbo",
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

// Operácie nad segmentami — zdieľané pravým panelom aj spodným panelom
function makeSegOps(segments, value, onChange, timeScale) {
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
    commit(onChange, value, [...segments.slice(0, i), a, b, ...segments.slice(i + 1)], timeScale);
  };
  const merge = (i) => {
    if (i >= segments.length - 1) return;
    const a = segments[i], b = segments[i + 1];
    const joined = { start: a.start, end: b.end, text: (a.text + " " + b.text).trim() };
    commit(onChange, value, [...segments.slice(0, i), joined, ...segments.slice(i + 2)], timeScale);
  };
  const insertAfter = (i) => {
    const g = segments[i];
    const nxt = segments[i + 1];
    const start = g.end;
    const end = nxt ? Math.min(nxt.start, start + 2) : start + 2;
    commit(onChange, value, [...segments.slice(0, i + 1), { start, end: Math.max(end, start + 0.5), text: "" }, ...segments.slice(i + 1)], timeScale);
  };
  // hranice podľa ČASU (zoznam nemusí byť zoradený): najneskorší koniec
  // segmentu končiacoho predo mnou a najskorší začiatok segmentu za mnou
  const timeBounds = (i) => {
    const g = segments[i];
    let minStart = 0, maxEnd = Infinity;
    for (let j = 0; j < segments.length; j++) {
      if (j === i) continue;
      const o = segments[j];
      if (o.end <= g.start + 1e-6) minStart = Math.max(minStart, o.end);
      if (o.start >= g.end - 1e-6) maxEnd = Math.min(maxEnd, o.start);
    }
    return { minStart, maxEnd };
  };
  // posun celého segmentu s ripple efektom — dopredu tlačí všetky
  // nasledujúce (v čase), dozadu sa zastaví o predchádzajúci
  const shift = (i, delta) => {
    const g = segments[i];
    const before = segments.filter((o, j) => j !== i && o.end <= g.start + 1e-6);
    const minStart = before.length ? Math.max(...before.map((o) => o.end)) : 0;
    const len = g.end - g.start;
    const start = Math.max(minStart, g.start + delta);
    const res = segments.map((s2, j) => (j === i ? { ...s2, start, end: start + len } : { ...s2 }));
    // reťazovo posuň segmenty, ktoré boli v čase za posúvaným
    const afterIdx = segments
      .map((o, j) => ({ o, j }))
      .filter((x) => x.j !== i && x.o.start >= g.end - 1e-6)
      .sort((a, b) => a.o.start - b.o.start)
      .map((x) => x.j);
    let prevEnd = start + len;
    for (const j of afterIdx) {
      if (res[j].start < prevEnd - 1e-6) {
        const push = prevEnd - res[j].start;
        res[j] = { ...res[j], start: res[j].start + push, end: res[j].end + push };
      }
      prevEnd = Math.max(prevEnd, res[j].end);
    }
    commit(onChange, value, res, timeScale);
  };
  // zotriedi podľa času a ustrihne konce presahujúce do ďalšieho titulku
  const sortFix = () => {
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    for (let k = 0; k < sorted.length - 1; k++) {
      if (sorted[k].end > sorted[k + 1].start) sorted[k] = { ...sorted[k], end: sorted[k + 1].start };
    }
    const fixed = sorted.map((g) => (g.end <= g.start ? { ...g, end: g.start + 0.1 } : g));
    commit(onChange, value, fixed, timeScale);
  };
  return { upd, del, add, split, merge, insertAfter, shift, sortFix, timeBounds };
}

// Pravý panel — prepis (model + tlačidlo). Zoznam segmentov žije v spodnom
// paneli (krok 76f), kde má celú šírku okna.
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
      {segments.length > 0 && (
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {tt("segments_below", "✏️ Segmenty ({n}) upravuješ v spodnom paneli ⬇", { n: segments.length })}
        </div>
      )}
    </div>
  );
}

// Spodný panel — zoznam segmentov cez celú šírku, všetko v jednom riadku
function SubtitlesBottomPanel({ values, onChangeField, ctx }) {
  const timeScale = ctx?.timeScale > 0 ? ctx.timeScale : 1;
  const value = values?.subs ?? null;
  const onChange = (v) => onChangeField("subs", v);
  const segments = Array.isArray(value?.segments) ? value.segments : [];
  const ops = makeSegOps(segments, value, onChange, timeScale);

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

  const miniBtn = { ...btnStyle, whiteSpace: "nowrap", flexShrink: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* hlavička: akcie nad celým zoznamom */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, opacity: 0.6 }}>💬 {tt("seg_count", "{n} titulkov", { n: segments.length })}</span>
        <button style={miniBtn} onClick={ops.add}>＋ {t("add", "Pridať titulok")}</button>
        {segments.length > 1 && (
          <button style={miniBtn} title={t("sort_fix_hint", "Zotriedi titulky podľa času a odstráni prekrytie")} onClick={ops.sortFix}>
            ⇅ {t("sort_fix", "Zoradiť a opraviť")}
          </button>
        )}
        {segments.length > 0 && (
          <button style={miniBtn} disabled={saveBusy} onClick={() => { void saveSrt(); }}>
            {saveBusy ? t("srt_saving", "⏳ Ukladám…") : `💾 ${t("srt_save", "Uložiť SRT")}`}
          </button>
        )}
        {segments.length > 0 && (
          <button style={{ ...miniBtn, color: "#f87171" }} onClick={() => onChange(null)}>
            {t("clear", "Zrušiť titulky")}
          </button>
        )}
        {saveMsg && (
          <span style={{ fontSize: 10, color: saveMsg.startsWith("✅") ? "#34d399" : "#f87171", wordBreak: "break-all" }}>{saveMsg}</span>
        )}
      </div>
      {/* zoznam segmentov — jeden riadok = jeden titulok */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "4px 8px" }}>
        {segments.length === 0 && (
          <div style={{ fontSize: 11, opacity: 0.5, padding: 8 }}>
            {t("no_segments", "Zatiaľ žiadne titulky — prepíš reč tlačidlom v pravom paneli, alebo pridaj titulok ručne.")}
          </div>
        )}
        {segments.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3, padding: "3px 6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>
            <span style={{ fontSize: 10, opacity: 0.45, width: 20, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
            <input
              style={{ ...inpStyle, width: 64, fontFamily: "monospace", flexShrink: 0 }}
              defaultValue={fmtTime(g.start)}
              key={`s${i}-${g.start}`}
              title={t("seg_start", "Začiatok")}
              onBlur={(e) => { let v = parseTime(e.target.value); if (v != null) { const b = ops.timeBounds(i); if (v < b.minStart) v = b.minStart; } if (v != null && v < g.end) ops.upd(i, { start: v }); else e.target.value = fmtTime(g.start); }}
            />
            <span style={{ fontSize: 10, opacity: 0.5, flexShrink: 0 }}>→</span>
            <input
              style={{ ...inpStyle, width: 64, fontFamily: "monospace", flexShrink: 0 }}
              defaultValue={fmtTime(g.end)}
              key={`e${i}-${g.end}`}
              title={t("seg_end", "Koniec")}
              onBlur={(e) => { let v = parseTime(e.target.value); if (v != null) { const b = ops.timeBounds(i); if (v > b.maxEnd) v = b.maxEnd; } if (v != null && v > g.start) ops.upd(i, { end: v }); else e.target.value = fmtTime(g.end); }}
            />
            <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0, width: 34 }}>{(g.end - g.start).toFixed(1)}s</span>
            <input
              style={{ ...inpStyle, flex: 1, minWidth: 80, fontSize: 12 }}
              defaultValue={g.text}
              key={`t${i}-${g.text}`}
              placeholder={t("text_ph", "text titulku…")}
              onBlur={(e) => { if (e.target.value !== g.text) ops.upd(i, { text: e.target.value }); }}
            />
            <button style={miniBtn} title={t("shift_back", "Posunúť −0,5 s")} onClick={() => ops.shift(i, -0.5)}>◂ 0,5s</button>
            <button style={miniBtn} title={t("shift_fwd", "Posunúť +0,5 s")} onClick={() => ops.shift(i, 0.5)}>▸ 0,5s</button>
            <button style={miniBtn} title={t("split", "Rozdeliť")} onClick={() => ops.split(i)}>✂ {t("split", "Rozdeliť")}</button>
            <button style={miniBtn} title={t("insert_after", "Vložiť za")} onClick={() => ops.insertAfter(i)}>＋ {t("insert_after", "Vložiť za")}</button>
            {i < segments.length - 1 && (
              <button style={miniBtn} title={t("merge", "Spojiť s ďalším")} onClick={() => ops.merge(i)}>⇶ {t("merge", "Spojiť")}</button>
            )}
            <button style={{ ...miniBtn, color: "#f87171" }} title={t("del", "Zmazať")} onClick={() => ops.del(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrácia nástroja
// ---------------------------------------------------------------------------

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// #rrggbb → ASS &HAABBGGRR (alpha 00 = nepriehľadné, FF = plne priehľadné)
function hexToAss(hex, alpha = 0) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return "&H00FFFFFF";
  const n = parseInt(m[1], 16);
  const h2 = (x) => x.toString(16).padStart(2, "0").toUpperCase();
  return `&H${h2(alpha)}${h2(n & 255)}${h2((n >> 8) & 255)}${h2((n >> 16) & 255)}`;
}

// krok 76e — presety štýlu titulkov (prepíšu vlastné nastavenia)
const PRESETS = {
  youtube: { fontName: "Arial", fontSize: 26, bold: true, textColor: "#ffffff", outlineColor: "#000000", outline: 3, background: "none", bgColor: "#000000", bgOpacity: 60, position: "bottom", marginV: 36, shadow: 0 },
  film:    { fontName: "Georgia", fontSize: 20, bold: false, textColor: "#ffffff", outlineColor: "#000000", outline: 1, background: "none", bgColor: "#000000", bgOpacity: 60, position: "bottom", marginV: 30, shadow: 0 },
  netflix: { fontName: "Arial", fontSize: 22, bold: false, textColor: "#ffffff", outlineColor: "#000000", outline: 0, background: "none", bgColor: "#000000", bgOpacity: 60, position: "bottom", marginV: 36, shadow: 2 },
};

const FONT_OPTIONS = ["Arial", "Arial Black", "Verdana", "Tahoma", "Georgia", "Impact", "Trebuchet MS", "Courier New"];

api.registerTool({
  icon: "💬",
  labelKey: "title",
  bottomPanel: SubtitlesBottomPanel,
  fields: [
    { id: "lang", type: "select", labelKey: "lang", default: "auto",
      options: [
        { value: "auto", labelKey: "lang_auto" },
        { value: "sk", labelKey: "lang_sk" },
        { value: "cs", labelKey: "lang_cs" },
        { value: "en", labelKey: "lang_en" },
        { value: "de", labelKey: "lang_de" },
        { value: "ru", labelKey: "lang_ru" },
        { value: "zh", labelKey: "lang_zh" },
      ] },
    { id: "subs", type: "custom", labelKey: "segments", component: SubtitlesField },
    { id: "sec_style", type: "separator", labelKey: "sec_style" },
    { id: "preset", type: "select", labelKey: "preset", default: "custom",
      options: [
        { value: "custom", labelKey: "preset_custom" },
        { value: "youtube", labelKey: "preset_youtube" },
        { value: "film", labelKey: "preset_film" },
        { value: "netflix", labelKey: "preset_netflix" },
      ] },
    { id: "fontName", type: "select", labelKey: "font", default: "Arial",
      options: FONT_OPTIONS.map((f) => ({ value: f, labelKey: f })) },
    { id: "fontSize", type: "number", labelKey: "font_size", min: 8, max: 72, step: 1, default: 20 },
    { id: "bold", type: "checkbox", labelKey: "bold", default: false },
    { id: "textColor", type: "color", labelKey: "text_color", default: "#ffffff" },
    { id: "outlineColor", type: "color", labelKey: "outline_color", default: "#000000" },
    { id: "outline", type: "number", labelKey: "outline_w", min: 0, max: 6, step: 0.5, default: 2 },
    { id: "background", type: "select", labelKey: "background", default: "none",
      options: [
        { value: "none", labelKey: "bg_none" },
        { value: "box", labelKey: "bg_box" },
      ] },
    { id: "bgColor", type: "color", labelKey: "bg_color", default: "#000000" },
    { id: "bgOpacity", type: "slider", labelKey: "bg_opacity", min: 0, max: 100, step: 5, unit: "%", default: 60 },
    { id: "position", type: "select", labelKey: "position", default: "bottom",
      options: [
        { value: "bottom", labelKey: "pos_bottom" },
        { value: "middle", labelKey: "pos_middle" },
        { value: "top", labelKey: "pos_top" },
      ] },
    { id: "marginV", type: "number", labelKey: "margin_v", min: 0, max: 200, step: 2, default: 36 },
  ],
  buildStep(values, ctx) {
    if (ctx.kind !== "video") return null;
    const subs = values.subs;
    const segments = subs && Array.isArray(subs.segments) ? subs.segments : [];
    if (!subs?.srtPath || segments.length === 0) return null;

    // preset prepíše vlastné nastavenia (krok 76e)
    const raw = values.preset && PRESETS[values.preset] ? { ...values, ...PRESETS[values.preset] } : values;
    const fs = clamp(Number(raw.fontSize) || 20, 8, 72);
    const margin = clamp(Number(raw.marginV) || 0, 0, 400);
    const align = raw.position === "top" ? 8 : raw.position === "middle" ? 5 : 2;
    const isBox = raw.background === "box";
    const outline = clamp(Number(raw.outline ?? 2) || 0, 0, 6);
    const shadow = clamp(Number(raw.shadow) || 0, 0, 4);
    const opacity = clamp(Number(raw.bgOpacity ?? 60) || 0, 0, 100);
    const style = [
      `FontName=${raw.fontName || "Arial"}`,
      `FontSize=${fs}`,
      `Bold=${raw.bold ? -1 : 0}`,
      `PrimaryColour=${hexToAss(raw.textColor || "#ffffff")}`,
      `OutlineColour=${hexToAss(raw.outlineColor || "#000000")}`,
      `BackColour=${hexToAss(raw.bgColor || "#000000", Math.round(255 * (1 - opacity / 100)))}`,
      `BorderStyle=${isBox ? 3 : 1}`,
      `Outline=${isBox ? 0 : outline}`,
      `Shadow=${isBox ? 0 : shadow}`,
      `Alignment=${align}`,
      `MarginV=${margin || 36}`,
    ].join(",");
    // escaping pre subtitles filter (Windows: \ → \\, : → \:)
    const esc = String(subs.srtPath).replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    const vf = `subtitles=filename='${esc}':force_style='${style}'`;
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
