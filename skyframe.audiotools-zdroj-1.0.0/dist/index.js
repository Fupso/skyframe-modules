// ../../framesbuild/react-shim.js
var React = window.React;
var react_shim_default = React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useReducer = React.useReducer;
var useContext = React.useContext;
var createContext = React.createContext;
var Fragment = React.Fragment;
var useSyncExternalStore = React.useSyncExternalStore;
var useLayoutEffect = React.useLayoutEffect;
var forwardRef = React.forwardRef;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var MEDIA_FILTERS = [
  { name: "Video / Audio", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v", "mp3", "wav", "aac", "m4a", "ogg", "flac"] }
];
var MUSIC_FILTERS = [
  { name: "Audio", extensions: ["mp3", "wav", "aac", "m4a", "ogg", "flac"] }
];
var AUDIO_EXTS = ["mp3", "wav", "aac", "m4a", "ogg", "flac"];
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
function extOf(p) {
  const m = /\.([^.\\/]+)$/.exec(p);
  return m ? m[1].toLowerCase() : "";
}
function isAudioPath(p) {
  return AUDIO_EXTS.includes(extOf(p));
}
function fmtDur(sec) {
  if (!sec || !isFinite(sec)) return "\u2014";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} s`;
}
var initialState = {
  media: null,
  duration: 0,
  volume: 100,
  // %
  normalize: false,
  fadeIn: 0,
  fadeOut: 0,
  removeSilence: false,
  music: null,
  musicMode: "mix",
  // mix | replace
  musicVolume: 100,
  // %
  extractAudio: false,
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
async function pickMedia() {
  const f = await api.pickFiles(MEDIA_FILTERS, false);
  const path = Array.isArray(f) ? f[0] : f;
  if (!path) return;
  store.setState({ media: path, result: "", error: "", duration: 0 });
  try {
    const info = await api.invoke("get_video_info", { path });
    store.setState({ duration: info.duration ?? 0 });
  } catch {
  }
}
async function pickMusic() {
  const f = await api.pickFiles(MUSIC_FILTERS, false);
  const path = Array.isArray(f) ? f[0] : f;
  if (!path) return;
  store.setState({ music: path, error: "" });
}
function hasAnyEdit(s) {
  if (s.extractAudio) return true;
  return Math.abs(s.volume - 100) > 0.01 || s.normalize || s.fadeIn > 0 || s.fadeOut > 0 || s.removeSilence || !!s.music;
}
async function run() {
  const s = store.getState();
  if (!s.media) {
    store.setState({ error: t("err_no_media", "Najprv vyber video alebo audio") });
    return;
  }
  if (!hasAnyEdit(s)) {
    store.setState({ error: t("err_no_edit", "Nezvolen\xE1 \u017Eiadna \xFAprava") });
    return;
  }
  store.setState({ busy: true, progress: -1, busyLabel: "", error: "", result: "" });
  log(`\u{1F50A} ${baseName(s.media)}${s.extractAudio ? " \u2192 MP3" : ""}`);
  try {
    const opts = {
      volume: s.volume,
      normalize: s.normalize,
      fade_in: s.fadeIn > 0 ? s.fadeIn : null,
      fade_out: s.fadeOut > 0 ? s.fadeOut : null,
      remove_silence: s.removeSilence,
      music_path: s.extractAudio ? null : s.music,
      music_mode: s.music ? s.musicMode : null,
      music_volume: s.music ? s.musicVolume : null,
      extract_audio: s.extractAudio
    };
    const jobId = await api.invoke("audio_tools", { input: s.media, opts, moduleId: api.moduleId });
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
async function openFolder() {
  const r = store.getState().result;
  if (!r) return;
  try {
    await api.invoke("open_in_file_manager", { path: r });
  } catch (e) {
    store.setState({ error: String(e) });
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
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
  width: 80
};
var sectionStyle = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 12,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 10
};
var rowStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
var labelStyle = { fontSize: 13, opacity: 0.8, minWidth: 130 };
function Check({ checked, onChange, label, disabled }) {
  return /* @__PURE__ */ react_shim_default.createElement("label", { style: { ...rowStyle, gap: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1 } }, /* @__PURE__ */ react_shim_default.createElement("input", { type: "checkbox", checked, disabled, onChange: (e) => onChange(e.target.checked) }), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13 } }, label));
}
function Preview({ src, volume }) {
  if (isAudioPath(src)) {
    return /* @__PURE__ */ react_shim_default.createElement("audio", { src: api.fileSrc(src), controls: true, style: { width: "100%" } });
  }
  const VP = api.VideoPlayer;
  if (VP) {
    return /* @__PURE__ */ react_shim_default.createElement(VP, { src, style: { width: "100%", maxHeight: 380, borderRadius: 12 } });
  }
  return /* @__PURE__ */ react_shim_default.createElement("video", { src: api.fileSrc(src), controls: true, style: { width: "100%", maxHeight: 380, background: "#000", borderRadius: 12 } });
}
function AudioToolsPage() {
  const s = useStore();
  const [, force] = useState2(0);
  useEffect2(() => store.subscribe(() => force((x) => x + 1)), []);
  const inputIsAudio = s.media ? isAudioPath(s.media) : false;
  const dis = s.busy || s.extractAudio;
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 20, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ react_shim_default.createElement("h2", { style: { margin: 0 } }, "\u{1F50A} ", t("title", "Audio n\xE1stroje")), /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("button", { style: s.media ? btnGhost : btnStyle, onClick: pickMedia, disabled: s.busy }, s.media ? t("change", "Zmeni\u0165") : t("pick_media", "Vybra\u0165 video / audio")), s.media && /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.7, fontSize: 13 } }, baseName(s.media), s.duration > 0 ? ` \xB7 ${fmtDur(s.duration)}` : "")), !s.media && /* @__PURE__ */ react_shim_default.createElement("div", { style: { opacity: 0.6, padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12 } }, t("empty", "Vyber video alebo audio \u2014 hlasitos\u0165, normaliz\xE1cia, fade, ticho, podmaz, extrakcia MP3")), s.media && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement(Preview, { src: s.media, volume: s.volume }), /* @__PURE__ */ react_shim_default.createElement("div", { style: sectionStyle }, /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("span", { style: labelStyle }, t("volume", "Hlasitos\u0165")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "300",
      step: "1",
      value: s.volume,
      disabled: s.busy,
      onChange: (e) => store.setState({ volume: parseInt(e.target.value, 10) }),
      style: { flex: 1, minWidth: 140 }
    }
  ), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      min: "0",
      max: "300",
      step: "5",
      value: s.volume,
      disabled: s.busy,
      onChange: (e) => store.setState({ volume: Math.max(0, Math.min(300, parseInt(e.target.value, 10) || 0)) }),
      style: inputStyle
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13, opacity: 0.6 } }, "%")), /* @__PURE__ */ react_shim_default.createElement(
    Check,
    {
      checked: s.normalize,
      disabled: s.busy,
      onChange: (v) => store.setState({ normalize: v }),
      label: t("normalize", "Normalizova\u0165 hlasitos\u0165 (EBU R128)")
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { style: sectionStyle }, /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("span", { style: labelStyle }, t("fade", "Fade in / out (s)")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      min: "0",
      max: "30",
      step: "0.5",
      value: s.fadeIn,
      disabled: dis,
      onChange: (e) => store.setState({ fadeIn: Math.max(0, parseFloat(e.target.value) || 0) }),
      style: inputStyle,
      title: "fade in"
    }
  ), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      min: "0",
      max: "30",
      step: "0.5",
      value: s.fadeOut,
      disabled: dis,
      onChange: (e) => store.setState({ fadeOut: Math.max(0, parseFloat(e.target.value) || 0) }),
      style: inputStyle,
      title: "fade out"
    }
  )), /* @__PURE__ */ react_shim_default.createElement(
    Check,
    {
      checked: s.removeSilence,
      disabled: dis,
      onChange: (v) => store.setState({ removeSilence: v }),
      label: t("remove_silence", "Odstr\xE1ni\u0165 ticho (-45 dB, min. 0,5 s)")
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { style: sectionStyle }, /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("span", { style: labelStyle }, t("music", "Hudobn\xFD podmaz")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      style: s.music ? btnGhost : { ...btnGhost, border: "1px dashed rgba(255,255,255,0.25)" },
      onClick: pickMusic,
      disabled: dis
    },
    s.music ? baseName(s.music) : t("pick_music", "Vybra\u0165 hudbu\u2026")
  ), s.music && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      style: { ...btnGhost, padding: "6px 10px" },
      disabled: dis,
      onClick: () => store.setState({ music: null })
    },
    "\u2715"
  )), s.music && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("label", { style: { ...rowStyle, gap: 6, cursor: "pointer" } }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "radio",
      name: "mmode",
      checked: s.musicMode === "mix",
      disabled: dis,
      onChange: () => store.setState({ musicMode: "mix" })
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13 } }, t("mode_mix", "Zmie\u0161a\u0165 s p\xF4vodn\xFDm zvukom"))), /* @__PURE__ */ react_shim_default.createElement("label", { style: { ...rowStyle, gap: 6, cursor: inputIsAudio ? "default" : "pointer", opacity: inputIsAudio ? 0.45 : 1 } }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "radio",
      name: "mmode",
      checked: s.musicMode === "replace",
      disabled: dis || inputIsAudio,
      onChange: () => store.setState({ musicMode: "replace" })
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13 } }, t("mode_replace", "Nahradi\u0165 zvuk videa")))), /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { ...labelStyle, minWidth: 0 } }, t("music_volume", "Hlasitos\u0165 podmazu")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "200",
      step: "1",
      value: s.musicVolume,
      disabled: dis,
      onChange: (e) => store.setState({ musicVolume: parseInt(e.target.value, 10) }),
      style: { flex: 1, minWidth: 120 }
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 13, opacity: 0.6, minWidth: 42 } }, s.musicVolume, " %")))), /* @__PURE__ */ react_shim_default.createElement("div", { style: sectionStyle }, /* @__PURE__ */ react_shim_default.createElement(
    Check,
    {
      checked: s.extractAudio,
      disabled: s.busy,
      onChange: (v) => store.setState({ extractAudio: v }),
      label: t("extract", "Len extrahova\u0165 audio do MP3")
    }
  ), s.extractAudio && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 12, opacity: 0.6 } }, t("extract_note", "Ostatn\xE9 \xFApravy okrem hlasitosti sa pri extrakcii nepou\u017Eij\xFA"))), /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, disabled: s.busy || !hasAnyEdit(s), onClick: () => void run() }, s.busy ? `${t("working", "Sprac\xFAvam\u2026")}${s.progress >= 0 ? ` ${Math.round(s.progress)} %` : ""}` : t("apply", "\u{1F50A} Pou\u017Ei\u0165 \xFApravy")), s.busy && s.busyLabel && /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 12, opacity: 0.6 } }, s.busyLabel)), s.error && /* @__PURE__ */ react_shim_default.createElement("div", { style: { color: "#f87171", fontSize: 13, background: "rgba(248,113,113,0.08)", borderRadius: 8, padding: "8px 12px", whiteSpace: "pre-wrap" } }, s.error), s.result && /* @__PURE__ */ react_shim_default.createElement("div", { style: { ...sectionStyle, background: "rgba(34,197,94,0.08)" } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 13 } }, "\u2713 ", t("done", "Hotovo"), ": ", /* @__PURE__ */ react_shim_default.createElement("b", null, baseName(s.result))), /* @__PURE__ */ react_shim_default.createElement("div", { style: rowStyle }, !isAudioPath(s.result) && /* @__PURE__ */ react_shim_default.createElement("button", { style: btnStyle, onClick: () => api.editMedia?.(s.result) }, "\u{1F58C}\uFE0F ", t("open_editor", "Otvori\u0165 v Editore")), /* @__PURE__ */ react_shim_default.createElement("button", { style: btnGhost, onClick: openFolder }, "\u{1F4C2} ", t("open_folder", "Otvori\u0165 prie\u010Dinok")))), s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { style: sectionStyle }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 12, opacity: 0.6 } }, t("log_title", "Z\xE1znam")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontFamily: "monospace", fontSize: 12, opacity: 0.8, maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 } }, s.log.map((l, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, l))))));
}
var index_default = AudioToolsPage;
export {
  index_default as default
};
