// ../framesbuild/react-shim.js
var R = window.React;
var useState = R.useState;
var useEffect = R.useEffect;
var useRef = R.useRef;
var useMemo = R.useMemo;
var useCallback = R.useCallback;
var useReducer = R.useReducer;
var useContext = R.useContext;
var createContext = R.createContext;
var Fragment = R.Fragment;
var useSyncExternalStore = R.useSyncExternalStore;
var useLayoutEffect = R.useLayoutEffect;
var forwardRef = R.forwardRef;
var react_shim_default = R;

// index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var tt = (k, f, vars) => {
  let str = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) str = str.replaceAll(`{${kk}}`, String(vv));
  return str;
};
var MODELS = ["base", "small", "medium", "large-turbo", "large"];
var initialState = {
  status: null,
  // {runtime_installed, models: []}
  model: "small",
  busy: false,
  busyLabel: "",
  progress: -1,
  error: ""
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
var rowStyle = { display: "flex", gap: 4, alignItems: "center", marginBottom: 4 };
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
    const next = [...segments.slice(0, i), a, b, ...segments.slice(i + 1)];
    commit(onChange, value, next, timeScale);
  };
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement(
    "select",
    {
      value: s.model,
      disabled: s.busy,
      onChange: (e) => store.setState({ model: e.target.value }),
      style: { ...inpStyle, padding: "5px 8px" }
    },
    MODELS.map((m) => {
      const inst = (s.status?.models ?? []).includes(m);
      return /* @__PURE__ */ react_shim_default.createElement("option", { key: m, value: m }, m, inst ? " \u2713" : "");
    })
  ), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      style: btnPrimary,
      disabled: s.busy || !ctx.mediaPath,
      onClick: () => void transcribe(ctx, onChange, value, values?.lang ?? "auto")
    },
    s.busy ? `${s.busyLabel || t("transcribing", "Prepisujem\u2026")} ${s.progress >= 0 ? Math.round(s.progress) + " %" : ""}` : t("transcribe", "\u{1F399}\uFE0F Prep\xEDsa\u0165 re\u010D")
  )), s.error && /* @__PURE__ */ react_shim_default.createElement("div", { style: { color: "#f87171", fontSize: 11 } }, s.error), segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { style: { maxHeight: 220, overflowY: "auto", paddingRight: 2 } }, segments.map((g, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i, style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      style: { ...inpStyle, width: 58, fontFamily: "monospace" },
      defaultValue: fmtTime(g.start),
      key: `s${i}-${g.start}`,
      onBlur: (e) => {
        const v = parseTime(e.target.value);
        if (v != null && v < g.end) upd(i, { start: v });
        else e.target.value = fmtTime(g.start);
      }
    }
  ), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      style: { ...inpStyle, width: 58, fontFamily: "monospace" },
      defaultValue: fmtTime(g.end),
      key: `e${i}-${g.end}`,
      onBlur: (e) => {
        const v = parseTime(e.target.value);
        if (v != null && v > g.start) upd(i, { end: v });
        else e.target.value = fmtTime(g.end);
      }
    }
  ), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      style: { ...inpStyle, flex: 1, minWidth: 0 },
      defaultValue: g.text,
      key: `t${i}-${g.text}`,
      placeholder: t("text_ph", "text titulku\u2026"),
      onBlur: (e) => {
        if (e.target.value !== g.text) upd(i, { text: e.target.value });
      }
    }
  ), /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, title: t("split", "Rozdeli\u0165"), onClick: () => split(i) }, "\u2702"), /* @__PURE__ */ react_shim_default.createElement("button", { style: { ...btnStyle, color: "#f87171" }, title: t("del", "Zmaza\u0165"), onClick: () => del(i) }, "\u2715")))), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, onClick: add }, "\uFF0B ", t("add", "Prida\u0165 titulok")), segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, disabled: saveBusy, onClick: () => {
    void saveSrt();
  } }, saveBusy ? t("srt_saving", "\u23F3 Uklad\xE1m\u2026") : `\u{1F4BE} ${t("srt_save", "Ulo\u017Ei\u0165 SRT")}`), segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      style: { ...btnStyle, color: "#f87171" },
      onClick: () => onChange(null)
    },
    t("clear", "Zru\u0161i\u0165 titulky")
  )), saveMsg && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 10, color: saveMsg.startsWith("\u2705") ? "#34d399" : "#f87171", wordBreak: "break-all" } }, saveMsg));
}
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
api.registerTool({
  icon: "\u{1F4AC}",
  labelKey: "title",
  fields: [
    {
      id: "lang",
      type: "select",
      labelKey: "lang",
      default: "auto",
      options: [
        { value: "auto", labelKey: "lang_auto" },
        { value: "sk", labelKey: "lang_sk" },
        { value: "en", labelKey: "lang_en" },
        { value: "de", labelKey: "lang_de" },
        { value: "ru", labelKey: "lang_ru" },
        { value: "zh", labelKey: "lang_zh" }
      ]
    },
    { id: "subs", type: "custom", labelKey: "segments", component: SubtitlesField },
    { id: "sec_style", type: "separator", labelKey: "sec_style" },
    { id: "fontSize", type: "number", labelKey: "font_size", min: 8, max: 72, step: 1, default: 20 },
    {
      id: "position",
      type: "select",
      labelKey: "position",
      default: "bottom",
      options: [
        { value: "bottom", labelKey: "pos_bottom" },
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
    const fs = clamp(Number(values.fontSize) || 20, 8, 72);
    const margin = clamp(Number(values.marginV) || 0, 0, 400);
    const align = values.position === "top" ? 8 : 2;
    const esc = String(subs.srtPath).replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    const vf = `subtitles=filename='${esc}':force_style='FontName=Arial,FontSize=${fs},PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=${align},MarginV=${margin || 36}'`;
    return { label: `\u{1F4AC} ${t("lbl_count", "titulky")} (${segments.length})`, vf };
  }
});
function SubtitlesToolStub() {
  return react_shim_default.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "N\xE1stroj Titulky n\xE1jde\u0161 v Editore \u2014 v pravom paneli n\xE1strojov.")
  );
}
export {
  SubtitlesToolStub as default
};
