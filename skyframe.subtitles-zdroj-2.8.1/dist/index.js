// ../framesbuild-shim.js
var React = window.React;
var framesbuild_shim_default = React;
var useState = React.useState;
var useEffect = React.useEffect;
var useMemo = React.useMemo;
var useRef = React.useRef;
var useCallback = React.useCallback;
var useSyncExternalStore = React.useSyncExternalStore;
var createElement = React.createElement;
var Fragment = React.Fragment;

// index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useSyncExternalStore: useSyncExternalStore2 } = framesbuild_shim_default;
var tt = (k, f, vars) => {
  let str = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) str = str.replaceAll(`{${kk}}`, String(vv));
  return str;
};
var MODELS = ["base", "small", "medium", "large-turbo", "large"];
var initialState = {
  status: null,
  // {runtime_installed, models: []}
  model: "large-turbo",
  busy: false,
  busyLabel: "",
  progress: -1,
  error: "",
  trBusy: false,
  trMsg: ""
};
var state = { ...initialState };
var listeners = /* @__PURE__ */ new Set();
var store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...typeof patch === "function" ? patch(state) : patch };
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  }
};
function useStore() {
  return useSyncExternalStore2(store.subscribe, store.getState);
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
    }).then((u) => {
      unlisten = u;
    });
  });
}
async function refreshStatus() {
  try {
    const st = await api.invoke("whisper_status", {});
    store.setState({ status: st });
  } catch {
  }
}
function fmtTime(s) {
  const ms = Math.round(s * 1e3);
  const mm = Math.floor(ms / 6e4);
  const ss = Math.floor(ms % 6e4 / 1e3);
  return `${mm}:${String(ss).padStart(2, "0")}.${String(Math.round(ms % 1e3 / 10)).padStart(2, "0")}`;
}
function parseTime(str) {
  const m = /^(\d+):(\d+)[.,](\d+)$/.exec(String(str).trim());
  if (!m) return null;
  return +m[1] * 60 + +m[2] + +m[3] / 100;
}
var lastWrittenPath = "";
var lastScale = 1;
async function commit(onChange, value, segments, timeScale = 1) {
  try {
    const ts = timeScale > 0 && isFinite(timeScale) ? timeScale : 1;
    const scaled = ts === 1 ? segments : segments.map((g) => ({ start: g.start * ts, end: g.end * ts, text: g.text }));
    const srtPath = await api.invoke("write_temp_srt", { segments: scaled, previous: value?.srtPath ?? null });
    lastWrittenPath = srtPath;
    lastScale = ts;
    onChange({ ...value, segments, srtPath });
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
      store.setState({ busyLabel: t("install_runtime", "In\u0161talujem runtime\u2026") });
      await api.invoke("ensure_whisper_runtime", {});
    }
    const model = store.getState().model;
    if (!(st?.models ?? []).includes(model)) {
      store.setState({ busyLabel: t("install_model", "S\u0165ahujem model\u2026") });
      await api.invoke("ensure_whisper_model", { model });
    }
    const jobId = await api.invoke("transcribe_audio", {
      input: ctx.mediaPath,
      lang: lang || "auto",
      model,
      moduleId: api.moduleId
    });
    const res = await watchJob(
      jobId,
      (j) => store.setState({ progress: j.progress ?? -1, busyLabel: j.message || "" })
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
var inpStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  color: "inherit",
  fontSize: 11,
  padding: "3px 6px"
};
var btnStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "none",
  borderRadius: 6,
  color: "inherit",
  fontSize: 11,
  padding: "3px 8px",
  cursor: "pointer"
};
var btnPrimary = { ...btnStyle, background: "#3b82f6", color: "#fff", fontWeight: 600 };
function makeSegOps(segments, value, onChange, timeScale) {
  const upd = (i, patch) => {
    const next = segments.map((g, j) => j === i ? { ...g, ...patch } : g);
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
  const shift = (i, delta) => {
    const g = segments[i];
    const before = segments.filter((o, j) => j !== i && o.end <= g.start + 1e-6);
    const minStart = before.length ? Math.max(...before.map((o) => o.end)) : 0;
    const len = g.end - g.start;
    const start = Math.max(minStart, g.start + delta);
    const res = segments.map((s2, j) => j === i ? { ...s2, start, end: start + len } : { ...s2 });
    const afterIdx = segments.map((o, j) => ({ o, j })).filter((x) => x.j !== i && x.o.start >= g.end - 1e-6).sort((a, b) => a.o.start - b.o.start).map((x) => x.j);
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
  const sortFix = () => {
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    for (let k = 0; k < sorted.length - 1; k++) {
      if (sorted[k].end > sorted[k + 1].start) sorted[k] = { ...sorted[k], end: sorted[k + 1].start };
    }
    const fixed = sorted.map((g) => g.end <= g.start ? { ...g, end: g.start + 0.1 } : g);
    commit(onChange, value, fixed, timeScale);
  };
  return { upd, del, add, split, merge, insertAfter, shift, sortFix, timeBounds };
}
function SubtitlesField({ value, onChange, values, ctx }) {
  const timeScale = ctx?.timeScale > 0 ? ctx.timeScale : 1;
  const s = useStore();
  const segments = Array.isArray(value?.segments) ? value.segments : [];
  useEffect2(() => {
    refreshStatus();
    const iv = setInterval(refreshStatus, 6e3);
    return () => clearInterval(iv);
  }, []);
  useEffect2(() => {
    if (segments.length > 0 && (value?.srtPath !== lastWrittenPath || timeScale !== lastScale)) {
      void commit(onChange, value, segments, timeScale);
    }
  }, [timeScale]);
  return /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ framesbuild_shim_default.createElement(
    "select",
    {
      value: s.model,
      disabled: s.busy,
      onChange: (e) => store.setState({ model: e.target.value }),
      style: { ...inpStyle, padding: "5px 8px" }
    },
    MODELS.map((m) => {
      const inst = (s.status?.models ?? []).includes(m);
      return /* @__PURE__ */ framesbuild_shim_default.createElement("option", { key: m, value: m }, m, inst ? " \u2713" : "");
    })
  ), /* @__PURE__ */ framesbuild_shim_default.createElement(
    "button",
    {
      style: btnPrimary,
      disabled: s.busy || !ctx.mediaPath,
      onClick: () => void transcribe(ctx, onChange, value, values?.lang ?? "auto")
    },
    s.busy ? `${s.busyLabel || t("transcribing", "Prepisujem\u2026")} ${s.progress >= 0 ? Math.round(s.progress) + " %" : ""}` : t("transcribe", "\u{1F399}\uFE0F Prep\xEDsa\u0165 re\u010D")
  )), s.error && /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { color: "#f87171", fontSize: 11 } }, s.error), segments.length > 0 && /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { fontSize: 11, opacity: 0.6 } }, tt("segments_below", "\u270F\uFE0F Segmenty ({n}) upravuje\u0161 v spodnom paneli \u2B07", { n: segments.length })));
}
function SubtitlesBottomPanel({ values, onChangeField, ctx }) {
  const timeScale = ctx?.timeScale > 0 ? ctx.timeScale : 1;
  const value = values?.subs ?? null;
  const onChange = (v) => onChangeField("subs", v);
  const segments = Array.isArray(value?.segments) ? value.segments : [];
  const ops = makeSegOps(segments, value, onChange, timeScale);
  const [saveMsg, setSaveMsg] = useState2("");
  const [saveBusy, setSaveBusy] = useState2(false);
  const saveSrt = async () => {
    if (segments.length === 0 || saveBusy) return;
    setSaveBusy(true);
    setSaveMsg("");
    try {
      const ts = timeScale > 0 && isFinite(timeScale) ? timeScale : 1;
      const scaled = ts === 1 ? segments : segments.map((g) => ({ start: g.start * ts, end: g.end * ts, text: g.text }));
      const p = await api.invoke("export_srt", { segments: scaled, outputName: null });
      setSaveMsg(tt("srt_saved", "\u2705 Ulo\u017Een\xE9: {p}", { p }));
    } catch (e) {
      setSaveMsg(tt("srt_failed", "\u274C {e}", { e: String(e) }));
    } finally {
      setSaveBusy(false);
    }
  };
  const miniBtn = { ...btnStyle, whiteSpace: "nowrap", flexShrink: 0 };
  const s = useStore();
  const translateTarget = values?.translate_to ?? "off";
  const variants = value && typeof value.variants === "object" && value.variants || {};
  const activeLang = value?.activeLang ?? "orig";
  const origLangCode = values?.lang && values.lang !== "auto" ? values.lang : "und";
  const variantLangs = ["orig", ...Object.keys(variants).filter((k) => k !== "orig" && Array.isArray(variants[k]) && variants[k].length > 0)];
  const scaledSegs = (segs) => {
    const ts = timeScale > 0 && isFinite(timeScale) ? timeScale : 1;
    return ts === 1 ? segs : segs.map((g) => ({ start: g.start * ts, end: g.end * ts, text: g.text }));
  };
  const switchLang = async (next) => {
    if (next === activeLang) return;
    const v = { ...variants, [activeLang]: segments };
    const nextSegs = Array.isArray(v[next]) ? v[next] : [];
    await commit(onChange, { ...value, variants: v, activeLang: next }, nextSegs, timeScale);
  };
  const deleteVariant = async (lang) => {
    const v = { ...variants, [activeLang]: segments };
    delete v[lang];
    const orig = Array.isArray(v.orig) ? v.orig : [];
    await commit(onChange, { ...value, variants: v, activeLang: "orig" }, orig, timeScale);
  };
  const doTranslate = async () => {
    if (segments.length === 0 || s.trBusy) return;
    store.setState({ trBusy: true, trMsg: "" });
    try {
      const source = values?.lang && values.lang !== "auto" ? values.lang : null;
      const origSegs = activeLang === "orig" ? segments : Array.isArray(variants.orig) && variants.orig.length ? variants.orig : segments;
      const texts = origSegs.map((g) => g.text);
      const translated = await api.invoke("translate_segments", { texts, target: translateTarget, source });
      const newSegs = origSegs.map((g, i) => ({ ...g, text: translated[i] ?? g.text }));
      const v = { ...variants, [activeLang]: segments, [translateTarget]: newSegs };
      await commit(onChange, { ...value, variants: v, activeLang: translateTarget }, newSegs, timeScale);
      store.setState({ trBusy: false, trMsg: tt("tr_done", "\u2705 Prelo\u017Een\xE9 ({n} titulkov)", { n: newSegs.length }) });
    } catch (e) {
      store.setState({ trBusy: false, trMsg: tt("tr_failed", "\u274C {e}", { e: String(e) }) });
    }
  };
  const saveAllSrt = async () => {
    if (segments.length === 0 || saveBusy) return;
    setSaveBusy(true);
    setSaveMsg("");
    try {
      const cur = { ...variants, [activeLang]: segments };
      let n = 0, lastPath = "";
      for (const [lang, segs] of Object.entries(cur)) {
        if (!Array.isArray(segs) || segs.length === 0) continue;
        const code = lang === "orig" ? origLangCode : lang;
        lastPath = await api.invoke("export_srt", { segments: scaledSegs(segs), outputName: `titulky-${code}` });
        n++;
      }
      setSaveMsg(tt("srt_saved_all", "\u2705 Ulo\u017Een\xE9 {n} SRT (posledn\xFD: {p})", { n, p: lastPath }));
    } catch (e) {
      setSaveMsg(tt("srt_failed", "\u274C {e}", { e: String(e) }));
    } finally {
      setSaveBusy(false);
    }
  };
  const muxMkv = async () => {
    if (segments.length === 0 || saveBusy) return;
    setSaveBusy(true);
    setSaveMsg("");
    try {
      const cur = { ...variants, [activeLang]: segments };
      const tracks = Object.entries(cur).filter(([, segs]) => Array.isArray(segs) && segs.length > 0).map(([lang, segs]) => ({ lang: lang === "orig" ? origLangCode : lang, segments: scaledSegs(segs) }));
      const p = await api.invoke("mux_subtitles_mkv", { input: ctx.mediaPath, tracks, outputName: null });
      setSaveMsg(tt("mkv_saved", "\u2705 MKV ulo\u017Een\xE9: {p}", { p }));
    } catch (e) {
      setSaveMsg(tt("mkv_failed", "\u274C {e}", { e: String(e) }));
    } finally {
      setSaveBusy(false);
    }
  };
  return /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } }, /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, flexWrap: "wrap" } }, /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { fontSize: 11, opacity: 0.6 } }, "\u{1F4AC} ", tt("seg_count", "{n} titulkov", { n: segments.length })), variantLangs.length > 1 && /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { display: "flex", gap: 3, alignItems: "center" } }, variantLangs.map((lang) => /* @__PURE__ */ framesbuild_shim_default.createElement("span", { key: lang, style: { display: "flex", alignItems: "center", gap: 2 } }, /* @__PURE__ */ framesbuild_shim_default.createElement(
    "button",
    {
      style: { ...miniBtn, background: lang === activeLang ? "#3b82f6" : miniBtn.background, color: lang === activeLang ? "#fff" : miniBtn.color, fontWeight: lang === activeLang ? 700 : 400 },
      title: lang === "orig" ? t("tab_orig", "P\xF4vodn\xFD jazyk") : lang.toUpperCase(),
      onClick: () => {
        void switchLang(lang);
      }
    },
    lang === "orig" ? `\u{1F17E} ${t("tab_orig_short", "Orig")}` : lang.toUpperCase()
  ), lang !== "orig" && lang === activeLang && /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: { ...miniBtn, color: "#f87171", padding: "3px 5px" }, title: t("tab_del", "Zmaza\u0165 t\xFAto jazykov\xFA verziu"), onClick: () => {
    void deleteVariant(lang);
  } }, "\u2715")))), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, onClick: ops.add }, "\uFF0B ", t("add", "Prida\u0165 titulok")), segments.length > 1 && /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, title: t("sort_fix_hint", "Zotriedi titulky pod\u013Ea \u010Dasu a odstr\xE1ni prekrytie"), onClick: ops.sortFix }, "\u21C5 ", t("sort_fix", "Zoradi\u0165 a opravi\u0165")), segments.length > 0 && translateTarget !== "off" && /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: { ...miniBtn, background: "#3b82f6", color: "#fff" }, disabled: s.trBusy, onClick: () => {
    void doTranslate();
  } }, s.trBusy ? t("translating", "\u23F3 Preklad\xE1m\u2026") : `\u{1F310} ${t("translate_btn", "Prelo\u017Ei\u0165")} \u2192 ${translateTarget.toUpperCase()}`), s.trMsg && /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { fontSize: 10, color: s.trMsg.startsWith("\u2705") ? "#34d399" : "#f87171" } }, s.trMsg), segments.length > 0 && /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, disabled: saveBusy, onClick: () => {
    void saveSrt();
  } }, saveBusy ? t("srt_saving", "\u23F3 Uklad\xE1m\u2026") : `\u{1F4BE} ${t("srt_save", "Ulo\u017Ei\u0165 SRT")}`), segments.length > 0 && variantLangs.length > 1 && /* @__PURE__ */ framesbuild_shim_default.createElement(framesbuild_shim_default.Fragment, null, /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, disabled: saveBusy, title: t("srt_all_hint", "Ulo\u017E\xED SRT pre ka\u017Ed\xFD jazyk (titulky-sk.srt, \u2026)"), onClick: () => {
    void saveAllSrt();
  } }, `\u{1F4BE} ${t("srt_save_all", "V\u0161etky SRT")}`), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: { ...miniBtn, background: "#059669", color: "#fff" }, disabled: saveBusy || !ctx.mediaPath, title: t("mkv_hint", "MKV s prep\xEDnate\u013En\xFDmi titulkov\xFDmi stopami \u2014 bez re-enk\xF3du, okam\u017Eit\xE9"), onClick: () => {
    void muxMkv();
  } }, saveBusy ? t("srt_saving", "\u23F3 Uklad\xE1m\u2026") : `\u{1F4E6} ${t("mkv_save", "MKV so stopami")}`)), segments.length > 0 && /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: { ...miniBtn, color: "#f87171" }, onClick: () => onChange(null) }, t("clear", "Zru\u0161i\u0165 titulky")), saveMsg && /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { fontSize: 10, color: saveMsg.startsWith("\u2705") ? "#34d399" : "#f87171", wordBreak: "break-all" } }, saveMsg)), /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "4px 8px" } }, segments.length === 0 && /* @__PURE__ */ framesbuild_shim_default.createElement("div", { style: { fontSize: 11, opacity: 0.5, padding: 8 } }, t("no_segments", "Zatia\u013E \u017Eiadne titulky \u2014 prep\xED\u0161 re\u010D tla\u010Didlom v pravom paneli, alebo pridaj titulok ru\u010Dne.")), segments.map((g, i) => /* @__PURE__ */ framesbuild_shim_default.createElement("div", { key: i, style: { display: "flex", gap: 4, alignItems: "center", marginBottom: 3, padding: "3px 6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 } }, /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { fontSize: 10, opacity: 0.45, width: 20, textAlign: "right", flexShrink: 0 } }, i + 1), /* @__PURE__ */ framesbuild_shim_default.createElement(
    "input",
    {
      style: { ...inpStyle, width: 64, fontFamily: "monospace", flexShrink: 0 },
      defaultValue: fmtTime(g.start),
      key: `s${i}-${g.start}`,
      title: t("seg_start", "Za\u010Diatok"),
      onBlur: (e) => {
        let v = parseTime(e.target.value);
        if (v != null) {
          const b = ops.timeBounds(i);
          if (v < b.minStart) v = b.minStart;
        }
        if (v != null && v < g.end) ops.upd(i, { start: v });
        else e.target.value = fmtTime(g.start);
      }
    }
  ), /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { fontSize: 10, opacity: 0.5, flexShrink: 0 } }, "\u2192"), /* @__PURE__ */ framesbuild_shim_default.createElement(
    "input",
    {
      style: { ...inpStyle, width: 64, fontFamily: "monospace", flexShrink: 0 },
      defaultValue: fmtTime(g.end),
      key: `e${i}-${g.end}`,
      title: t("seg_end", "Koniec"),
      onBlur: (e) => {
        let v = parseTime(e.target.value);
        if (v != null) {
          const b = ops.timeBounds(i);
          if (v > b.maxEnd) v = b.maxEnd;
        }
        if (v != null && v > g.start) ops.upd(i, { end: v });
        else e.target.value = fmtTime(g.end);
      }
    }
  ), /* @__PURE__ */ framesbuild_shim_default.createElement("span", { style: { fontSize: 10, opacity: 0.45, flexShrink: 0, width: 34 } }, (g.end - g.start).toFixed(1), "s"), /* @__PURE__ */ framesbuild_shim_default.createElement(
    "input",
    {
      style: { ...inpStyle, flex: 1, minWidth: 80, fontSize: 12 },
      defaultValue: g.text,
      key: `t${i}-${g.text}`,
      placeholder: t("text_ph", "text titulku\u2026"),
      onBlur: (e) => {
        if (e.target.value !== g.text) ops.upd(i, { text: e.target.value });
      }
    }
  ), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, title: t("shift_back", "Posun\xFA\u0165 \u22120,5 s"), onClick: () => ops.shift(i, -0.5) }, "\u25C2 0,5s"), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, title: t("shift_fwd", "Posun\xFA\u0165 +0,5 s"), onClick: () => ops.shift(i, 0.5) }, "\u25B8 0,5s"), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, title: t("split", "Rozdeli\u0165"), onClick: () => ops.split(i) }, "\u2702 ", t("split", "Rozdeli\u0165")), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, title: t("insert_after", "Vlo\u017Ei\u0165 za"), onClick: () => ops.insertAfter(i) }, "\uFF0B ", t("insert_after", "Vlo\u017Ei\u0165 za")), i < segments.length - 1 && /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: miniBtn, title: t("merge", "Spoji\u0165 s \u010Fal\u0161\xEDm"), onClick: () => ops.merge(i) }, "\u21F6 ", t("merge", "Spoji\u0165")), /* @__PURE__ */ framesbuild_shim_default.createElement("button", { style: { ...miniBtn, color: "#f87171" }, title: t("del", "Zmaza\u0165"), onClick: () => ops.del(i) }, "\u2715")))));
}
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hexToAss(hex, alpha = 0) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return "&H00FFFFFF";
  const n = parseInt(m[1], 16);
  const h2 = (x) => x.toString(16).padStart(2, "0").toUpperCase();
  return `&H${h2(alpha)}${h2(n & 255)}${h2(n >> 8 & 255)}${h2(n >> 16 & 255)}`;
}
var PRESETS = {
  youtube: { fontName: "Arial", fontSize: 26, bold: true, textColor: "#ffffff", outlineColor: "#000000", outline: 3, background: "none", bgColor: "#000000", bgOpacity: 60, position: "bottom", marginV: 36, shadow: 0 },
  film: { fontName: "Georgia", fontSize: 20, bold: false, textColor: "#ffffff", outlineColor: "#000000", outline: 1, background: "none", bgColor: "#000000", bgOpacity: 60, position: "bottom", marginV: 30, shadow: 0 },
  netflix: { fontName: "Arial", fontSize: 22, bold: false, textColor: "#ffffff", outlineColor: "#000000", outline: 0, background: "none", bgColor: "#000000", bgOpacity: 60, position: "bottom", marginV: 36, shadow: 2 }
};
var FONT_OPTIONS = ["Arial", "Arial Black", "Verdana", "Tahoma", "Georgia", "Impact", "Trebuchet MS", "Courier New"];
api.registerTool({
  icon: "\u{1F4AC}",
  labelKey: "title",
  bottomPanel: SubtitlesBottomPanel,
  fields: [
    {
      id: "lang",
      type: "select",
      labelKey: "lang",
      default: "auto",
      options: [
        { value: "auto", labelKey: "lang_auto" },
        { value: "sk", labelKey: "lang_sk" },
        { value: "cs", labelKey: "lang_cs" },
        { value: "en", labelKey: "lang_en" },
        { value: "de", labelKey: "lang_de" },
        { value: "ru", labelKey: "lang_ru" },
        { value: "zh", labelKey: "lang_zh" }
      ]
    },
    {
      id: "translate_to",
      type: "select",
      labelKey: "translate_to",
      default: "off",
      options: [
        { value: "off", labelKey: "tr_off" },
        { value: "sk", labelKey: "lang_sk" },
        { value: "cs", labelKey: "lang_cs" },
        { value: "en", labelKey: "lang_en" },
        { value: "de", labelKey: "lang_de" },
        { value: "ru", labelKey: "lang_ru" },
        { value: "zh", labelKey: "lang_zh" }
      ]
    },
    { id: "subs", type: "custom", labelKey: "segments", component: SubtitlesField },
    { id: "sec_style", type: "separator", labelKey: "sec_style" },
    {
      id: "preset",
      type: "select",
      labelKey: "preset",
      default: "custom",
      options: [
        { value: "custom", labelKey: "preset_custom" },
        { value: "youtube", labelKey: "preset_youtube" },
        { value: "film", labelKey: "preset_film" },
        { value: "netflix", labelKey: "preset_netflix" }
      ]
    },
    {
      id: "fontName",
      type: "select",
      labelKey: "font",
      default: "Arial",
      options: FONT_OPTIONS.map((f) => ({ value: f, labelKey: f }))
    },
    { id: "fontSize", type: "number", labelKey: "font_size", min: 8, max: 72, step: 1, default: 20 },
    { id: "bold", type: "checkbox", labelKey: "bold", default: false },
    { id: "textColor", type: "color", labelKey: "text_color", default: "#ffffff" },
    { id: "outlineColor", type: "color", labelKey: "outline_color", default: "#000000" },
    { id: "outline", type: "number", labelKey: "outline_w", min: 0, max: 6, step: 0.5, default: 2 },
    {
      id: "background",
      type: "select",
      labelKey: "background",
      default: "none",
      options: [
        { value: "none", labelKey: "bg_none" },
        { value: "box", labelKey: "bg_box" }
      ]
    },
    { id: "bgColor", type: "color", labelKey: "bg_color", default: "#000000" },
    { id: "bgOpacity", type: "slider", labelKey: "bg_opacity", min: 0, max: 100, step: 5, unit: "%", default: 60 },
    {
      id: "position",
      type: "select",
      labelKey: "position",
      default: "bottom",
      options: [
        { value: "bottom", labelKey: "pos_bottom" },
        { value: "middle", labelKey: "pos_middle" },
        { value: "top", labelKey: "pos_top" }
      ]
    },
    { id: "marginV", type: "number", labelKey: "margin_v", min: 0, max: 200, step: 2, default: 36 }
  ],
  buildStep(values, ctx) {
    if (ctx.kind !== "video") return null;
    const subs = values.subs;
    const segments = subs && Array.isArray(subs.segments) ? subs.segments : [];
    if (!subs?.srtPath || segments.length === 0) return null;
    const raw = values.preset && PRESETS[values.preset] ? { ...values, ...PRESETS[values.preset] } : values;
    const fs = clamp(Number(raw.fontSize) || 20, 8, 72);
    const margin = clamp(Number(raw.marginV) || 0, 0, 400);
    const align = raw.position === "top" ? 6 : raw.position === "middle" ? 10 : 2;
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
      `MarginV=${margin || 36}`
    ].join(",");
    const esc = String(subs.srtPath).replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    const vf = `subtitles=filename='${esc}':force_style='${style}'`;
    return { label: `\u{1F4AC} ${t("lbl_count", "titulky")} (${segments.length})`, vf };
  }
});
function SubtitlesToolStub() {
  return framesbuild_shim_default.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "N\xE1stroj Titulky n\xE1jde\u0161 v Editore \u2014 v pravom paneli n\xE1strojov.")
  );
}
export {
  SubtitlesToolStub as default
};
