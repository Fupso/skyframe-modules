// ../../framesbuild/react-shim.js
var useState = window.React.useState;
var useEffect = window.React.useEffect;
var useMemo = window.React.useMemo;
var useRef = window.React.useRef;
var useCallback = window.React.useCallback;
var useSyncExternalStore = window.React.useSyncExternalStore;
var Fragment = window.React.Fragment;
var react_shim_default = window.React;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];
var PRESETS = [2, 4, 8, 16, 30, 60];
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
function fmtDur(sec) {
  if (!sec || !isFinite(sec)) return "\u2014";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} s`;
}
var initialState = {
  video: null,
  duration: 0,
  // dĺžka zdroja (s)
  factor: 30,
  // zrýchlenie
  target: "",
  // cieľová dĺžka (s) — ak zadaná, prepisuje factor
  audio: "none",
  // none | speed
  busy: false,
  progress: -1,
  busyLabel: "",
  result: "",
  error: "",
  log: []
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
function log(line) {
  const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString();
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
    }).then((u) => {
      unlisten = u;
    });
  });
}
async function pickVideo() {
  const f = await api.pickFiles(VIDEO_FILTERS, false);
  const path = Array.isArray(f) ? f[0] : f;
  if (!path) return;
  store.setState({ video: path, result: "", error: "", duration: 0 });
  try {
    const info = await api.invoke("get_video_info", { path });
    store.setState({ duration: info.duration ?? 0 });
  } catch {
  }
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
  log(`\u23E9 ${baseName(s.video)} \u2014 ${Math.round(f)}\xD7`);
  try {
    const jobId = await api.invoke("timelapse_video", { input: s.video, factor: f, moduleId: api.moduleId });
    const res = await watchJob(jobId, (j) => store.setState({ progress: j.progress ?? -1, busyLabel: j.message || "" }));
    if (res.status === "done" && res.result) {
      store.setState({ result: res.result, busy: false });
      log(`\u2713 ${t("done", "Hotovo")}: ${baseName(res.result)}`);
    } else if (res.status === "cancelled") {
      store.setState({ busy: false });
      log("\u2298 zru\u0161en\xE9");
    } else {
      store.setState({ busy: false, error: res.message || "?" });
      log("\u2717 " + (res.message || "?"));
    }
  } catch (e) {
    store.setState({ busy: false, error: String(e) });
    log("\u2717 " + String(e));
  }
}
var btnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600
};
var btnGhost = { ...btnStyle, background: "rgba(255,255,255,0.08)", color: "inherit" };
var selectStyle = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit"
};
function Preview({ src, factor }) {
  const ref = useRef2(null);
  useEffect2(() => {
    const v = ref.current;
    if (!v) return;
    try {
      v.playbackRate = Math.min(16, Math.max(0.25, factor));
    } catch {
    }
  }, [factor]);
  return /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement(
    "video",
    {
      ref,
      src: api.fileSrc(src),
      controls: true,
      muted: true,
      style: { width: "100%", maxHeight: 400, background: "#000", borderRadius: 12, display: "block" }
    }
  ), factor > 16 && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 11, opacity: 0.55, marginTop: 4 } }, t("preview_cap", "N\xE1h\u013Ead be\u017E\xED max 16\xD7 \u2014 v\xFDsledok bude r\xFDchlej\u0161\xED"), " (", Math.round(factor), "\xD7)"));
}
function TimelapsePage() {
  const s = useStore();
  const [, force] = useState2(0);
  useEffect2(() => store.subscribe(() => force((x) => x + 1)), []);
  const f = effFactor(s);
  const outLen = s.duration > 0 ? s.duration / f : 0;
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 20, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ react_shim_default.createElement("h2", { style: { margin: 0 } }, "\u23E9 ", t("title", "\u010Casozber")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement("button", { style: s.video ? btnGhost : btnStyle, onClick: pickVideo, disabled: s.busy }, s.video ? t("change", "Zmeni\u0165") : t("pick_video", "Vybra\u0165 video")), s.video && /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.7, fontSize: 13 } }, baseName(s.video))), !s.video && /* @__PURE__ */ react_shim_default.createElement("div", { style: { opacity: 0.6, padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12 } }, t("empty", "Vyber video \u2014 z dlh\xE9ho z\xE1znamu sprav\xED\u0161 kr\xE1tke zr\xFDchlen\xE9 video"), /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginTop: 8, fontSize: 12, opacity: 0.7 } }, t("hint", "Tip: 30\xD7 premen\xED 15-min\xFAtov\xFD let na 30 sek\xFAnd"))), s.video && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement(Preview, { src: s.video, factor: f }), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13, opacity: 0.8 } }, t("speed", "Zr\xFDchlenie"), ":"), PRESETS.map((p) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: p,
      style: {
        ...btnGhost,
        padding: "5px 12px",
        fontWeight: s.factor === p && !s.target ? 700 : 400,
        background: s.factor === p && !s.target ? "rgba(59,130,246,0.35)" : btnGhost.background
      },
      disabled: s.busy,
      onClick: () => store.setState({ factor: p, target: "" })
    },
    p,
    "\xD7"
  )), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      min: "1",
      max: "240",
      step: "1",
      value: s.factor,
      disabled: s.busy,
      onChange: (e) => store.setState({ factor: Math.max(1, Math.min(240, parseFloat(e.target.value) || 1)), target: "" }),
      style: { ...selectStyle, width: 80 },
      title: t("custom", "vlastn\xE9\u2026")
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.5 } }, "\xD7")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13, opacity: 0.8 } }, t("target_len", "Cie\u013Eov\xE1 d\u013A\u017Eka (s)"), ":"), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      min: "1",
      step: "1",
      value: s.target,
      placeholder: "\u2014",
      disabled: s.busy,
      onChange: (e) => store.setState({ target: e.target.value }),
      style: { ...selectStyle, width: 90 }
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 12, opacity: 0.5 } }, "(", t("custom", "vlastn\xE9\u2026"), " \u2014 ", t("speed", "Zr\xFDchlenie").toLowerCase(), " sa prepo\u010D\xEDta)")), s.duration > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13, fontFamily: "monospace", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" } }, t("src_len", "D\u013A\u017Eka videa"), ": ", fmtDur(s.duration), " \u2192 ", /* @__PURE__ */ react_shim_default.createElement("b", null, Math.round(f), "\xD7"), " \u2192 ", t("out_len", "V\xFDstup"), ": \u2248 ", fmtDur(outLen), " \xB7 ", t("audio_note", "zvuk sa zr\xFDchli spolu s videom")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } }, /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, disabled: s.busy, onClick: () => void create() }, s.busy ? `${t("creating", "Vytv\xE1ram\u2026")} ${s.progress >= 0 ? Math.round(s.progress) + " %" : ""}` : t("create", "\u23E9 Vytvori\u0165 \u010Dasozber")), s.busy && /* @__PURE__ */ react_shim_default.createElement("button", { style: btnGhost, onClick: () => api.cancelJob?.() }, "\u2715")), s.error && /* @__PURE__ */ react_shim_default.createElement("div", { style: { color: "#f87171", fontSize: 13 } }, s.error), s.result && /* @__PURE__ */ react_shim_default.createElement("div", { style: { border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13 } }, "\u2713 ", t("done", "Hotovo"), ": ", /* @__PURE__ */ react_shim_default.createElement("b", null, baseName(s.result))), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, onClick: () => api.editMedia?.(s.result) }, t("open_editor", "\u{1F58C}\uFE0F Otvori\u0165 v Editore")), /* @__PURE__ */ react_shim_default.createElement("button", { style: btnGhost, onClick: () => api.invoke("open_in_file_manager", { path: s.result }) }, t("open_folder", "\u{1F4C2} Otvori\u0165 prie\u010Dinok"))))), s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13, opacity: 0.7, marginBottom: 6 } }, t("log_title", "Z\xE1znam")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 12, fontFamily: "monospace", opacity: 0.75, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 10, maxHeight: 120, overflowY: "auto" } }, s.log.map((l, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, l)))));
}
var index_default = TimelapsePage;
export {
  index_default as default
};
