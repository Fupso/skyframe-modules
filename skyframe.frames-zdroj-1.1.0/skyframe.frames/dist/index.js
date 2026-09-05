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
var tt = (k, f, vars) => {
  let s = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) s = s.replaceAll(`{${kk}}`, String(vv));
  return s;
};
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2, useCallback: useCallback2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
function parseTime(str) {
  const s = String(str).trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(s);
  if (m) return parseInt(m[1], 10) * 60 + parseFloat(m[2]);
  return null;
}
var initialState = {
  video: null,
  // path
  curTime: 0,
  // aktuálna pozícia prehrávača (s)
  timeStr: "",
  frames: [],
  // cesty k snímkam
  fps: 0,
  time: 0,
  // použitá sekunda
  selected: -1,
  // index vybranej snímky
  busy: false,
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
async function pickVideo() {
  const f = await api.pickFiles(VIDEO_FILTERS, false);
  if (f && f[0]) {
    store.setState({ video: f[0], frames: [], selected: -1, error: "" });
  }
}
async function extract(secOverride) {
  const s = store.getState();
  if (!s.video) {
    store.setState({ error: t("err_no_video", "Najprv vyber video") });
    return;
  }
  const sec = secOverride != null ? secOverride : parseTime(s.timeStr);
  if (sec == null || sec < 0) {
    store.setState({ error: t("err_time", "Zadaj platn\xFD \u010Das (sekundy alebo mm:ss)") });
    return;
  }
  store.setState({ busy: true, error: "", frames: [], selected: -1 });
  try {
    const res = await api.invoke("extract_second_frames", { input: s.video, timeSec: sec });
    store.setState({
      busy: false,
      frames: res.frames ?? [],
      fps: res.fps ?? 0,
      time: res.time ?? sec
    });
    log(tt("frames_of", "Sn\xEDmky z {t}. sekundy ({n} ks, {fps} fps)", {
      t: Math.floor(res.time ?? sec),
      n: (res.frames ?? []).length,
      fps: Math.round((res.fps ?? 0) * 100) / 100
    }));
  } catch (e) {
    store.setState({ busy: false, error: String(e) });
    log("Chyba: " + String(e));
  }
}
async function saveSelected() {
  const s = store.getState();
  const frame = s.frames[s.selected];
  if (!frame) return;
  const stem = baseName(s.video ?? "video").replace(/\.[^.]+$/, "");
  const name = `${stem}_${Math.floor(s.time)}s_sn${s.selected + 1}`;
  try {
    const p = await api.invoke("export_frame", { framePath: frame, outputName: name });
    log(tt("saved", "Sn\xEDmka ulo\u017Een\xE1: {p}", { p }));
  } catch (e) {
    log("Chyba: " + String(e));
  }
}
async function editSelected() {
  const s = store.getState();
  const frame = s.frames[s.selected];
  if (!frame) return;
  const stem = baseName(s.video ?? "video").replace(/\.[^.]+$/, "");
  const name = `${stem}_${Math.floor(s.time)}s_sn${s.selected + 1}`;
  try {
    const p = await api.invoke("export_frame", { framePath: frame, outputName: name });
    log(tt("edit_sent", "Sn\xEDmka odoslan\xE1 do Editora"));
    api.editMedia?.(p);
  } catch (e) {
    log("Chyba: " + String(e));
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
var inputStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
  width: 140
};
function fmtClock(sec) {
  const mm = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function PlayerSection({ busy }) {
  const s = useStore();
  const CorePlayer = api.VideoPlayer;
  const onTime = useCallback2((tm) => {
    store.setState({ curTime: tm });
  }, []);
  const extractHere = () => void extract(store.getState().curTime);
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, CorePlayer ? /* @__PURE__ */ react_shim_default.createElement(CorePlayer, { src: s.video, title: baseName(s.video), onTimeUpdate: onTime }) : /* @__PURE__ */ react_shim_default.createElement(
    "video",
    {
      src: api.fileSrc(s.video),
      controls: true,
      onTimeUpdate: (e) => onTime(e.currentTarget.currentTime),
      style: { width: "100%", maxHeight: 420, background: "#000", borderRadius: 12 }
    }
  ), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontFamily: "monospace", fontSize: 14, background: "rgba(255,255,255,0.06)", padding: "6px 10px", borderRadius: 8 } }, fmtClock(s.curTime), " ", /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.6 } }, "(", s.curTime.toFixed(2), " s)")), /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, disabled: busy, onClick: extractHere }, busy ? t("extracting", "Extrahujem\u2026") : t("extract_here", "\u{1F39E}\uFE0F Sn\xEDmky z aktu\xE1lnej poz\xEDcie")), /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.5, fontSize: 12 } }, t("or_manual", "alebo zadaj \u010Das ru\u010Dne:")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      style: { ...inputStyle, width: 110 },
      value: s.timeStr,
      placeholder: t("time_hint", "napr. 25 alebo 1:25"),
      onChange: (e) => store.setState({ timeStr: e.target.value }),
      onKeyDown: (e) => {
        if (e.key === "Enter" && !busy) void extract();
      }
    }
  ), /* @__PURE__ */ react_shim_default.createElement("button", { style: btnGhost, disabled: busy, onClick: () => void extract() }, t("extract", "Zobrazi\u0165 sn\xEDmky"))));
}
function FramesExtractor() {
  const s = useStore();
  const [, force] = useState2(0);
  useEffect2(() => {
    const u = store.subscribe(() => force((x) => x + 1));
    return u;
  }, []);
  const selFrame = s.selected >= 0 ? s.frames[s.selected] : null;
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 20, maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ react_shim_default.createElement("h2", { style: { margin: 0 } }, "\u{1F39E}\uFE0F ", t("title", "Extraktor sn\xEDmok")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ react_shim_default.createElement("button", { style: s.video ? btnGhost : btnStyle, onClick: pickVideo }, s.video ? t("change", "Zmeni\u0165") : t("pick_video", "Vybra\u0165 video")), s.video && /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.7, fontSize: 13 } }, baseName(s.video))), s.video && /* @__PURE__ */ react_shim_default.createElement(PlayerSection, { busy: s.busy }), s.error && /* @__PURE__ */ react_shim_default.createElement("div", { style: { color: "#f87171", fontSize: 13 } }, s.error), !s.video && /* @__PURE__ */ react_shim_default.createElement("div", { style: { opacity: 0.6, padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12 } }, t("empty", "Vyber video a zadaj \u010Das \u2014 zobrazia sa v\u0161etky sn\xEDmky tej sekundy")), s.frames.length > 0 && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13, opacity: 0.8 } }, tt("frames_of", "Sn\xEDmky z {t}. sekundy ({n} ks, {fps} fps)", {
    t: Math.floor(s.time),
    n: s.frames.length,
    fps: Math.round(s.fps * 100) / 100
  }), " \u2014 ", t("pick_frame", "Klikni na sn\xEDmku, ktor\xFA chce\u0161 vybra\u0165")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 } }, s.frames.map((f, i) => /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      key: f,
      onClick: () => store.setState({ selected: i }),
      style: {
        border: i === s.selected ? "2px solid #3b82f6" : "2px solid transparent",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        background: "#000"
      }
    },
    /* @__PURE__ */ react_shim_default.createElement("img", { src: api.fileSrc(f), style: { width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" } }),
    /* @__PURE__ */ react_shim_default.createElement("span", { style: {
      position: "absolute",
      left: 4,
      top: 4,
      fontSize: 11,
      background: "rgba(0,0,0,0.65)",
      color: "#fff",
      padding: "1px 6px",
      borderRadius: 6
    } }, tt("frame_no", "Sn\xEDmka \u010D. {n} ({t} s)", {
      n: i + 1,
      t: (s.time + (s.fps ? i / s.fps : 0)).toFixed(2)
    }))
  )))), selFrame && /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13, opacity: 0.8 } }, t("selected", "Vybran\xE1 sn\xEDmka")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { background: "#000", borderRadius: 12, overflow: "hidden", textAlign: "center" } }, /* @__PURE__ */ react_shim_default.createElement("img", { src: api.fileSrc(selFrame), style: { maxWidth: "100%", maxHeight: 480, objectFit: "contain" } })), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, onClick: () => void editSelected() }, t("edit", "\u{1F58C}\uFE0F Editova\u0165 v Editore")), /* @__PURE__ */ react_shim_default.createElement("button", { style: btnGhost, onClick: () => void saveSelected() }, t("save", "\u{1F4BE} Ulo\u017Ei\u0165 do v\xFDstupu")))), s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13, opacity: 0.7, marginBottom: 6 } }, t("log_title", "Z\xE1znam")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 12, fontFamily: "monospace", opacity: 0.75, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 10, maxHeight: 140, overflowY: "auto" } }, s.log.map((l, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, l)))));
}
var index_default = FramesExtractor;
export {
  index_default as default
};
