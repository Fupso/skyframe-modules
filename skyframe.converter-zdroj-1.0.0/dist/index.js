// ../../merger-build/react-shim.js
var R = window.React;
var react_shim_default = R;
var useState = R.useState;
var useEffect = R.useEffect;
var useMemo = R.useMemo;
var useRef = R.useRef;
var useCallback = R.useCallback;
var useSyncExternalStore = R.useSyncExternalStore;
var Fragment = R.Fragment;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];
var RESOLUTIONS = ["orig", "3840", "2560", "1920", "1280", "854"];
var FPS_OPTS = ["orig", "24", "25", "30", "50", "60"];
var AUDIO_OPTS = ["orig", "320", "192", "128", "96", "none"];
var FORMATS = ["mp4", "mkv", "mov"];
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
var PRESETS = ["youtube_4k", "youtube_1080", "instagram", "tiktok", "email", "archive"];
var initialState = {
  files: [],
  // { path, status: "queued"|"running"|"done"|"error"|"cancelled", progress, result, error }[]
  mode: "custom",
  // "custom" | preset id (youtube_4k, tiktok…)
  resolution: "orig",
  crf: 23,
  fps: "orig",
  audio: "orig",
  format: "mp4",
  outDir: "",
  running: false,
  log: [],
  restored: false
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
var cancelFlag = { current: false };
var saveTimer = { current: null };
function log(line) {
  const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  store.setState((s) => ({ log: [`[${ts}] ${line}`, ...s.log].slice(0, 120) }));
}
function setFile(i, patch) {
  store.setState((s) => ({
    files: s.files.map((f, j) => j === i ? { ...f, ...patch } : f)
  }));
}
function watchJob(jobId, i) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      setFile(i, { progress: Math.max(0, job.progress ?? 0), message: job.message || "" });
      if (job.status !== "running") {
        unlisten?.();
        resolve(job);
      }
    }).then((u) => {
      unlisten = u;
    });
  });
}
async function runQueue() {
  const s = store.getState();
  if (s.running || !s.files.length) return;
  cancelFlag.current = false;
  store.setState({ running: true, files: s.files.map((f) => ({ ...f, status: "queued", progress: 0, result: null, error: "" })) });
  log(`${t("start_log", "Sp\xFA\u0161\u0165am")} ${s.files.length} ${t("files_word", "s\xFAborov")}\u2026`);
  for (let i = 0; i < s.files.length; i++) {
    if (cancelFlag.current) {
      store.setState((st) => ({ files: st.files.map((f2, j) => j >= i && f2.status === "queued" ? { ...f2, status: "cancelled" } : f2) }));
      break;
    }
    const f = store.getState().files[i];
    setFile(i, { status: "running", progress: 0 });
    try {
      const st = store.getState();
      const jobId = st.mode === "custom" ? await api.invoke("convert_video_ex", {
        input: f.path,
        resolution: st.resolution,
        crf: st.crf,
        fps: st.fps,
        audio: st.audio,
        format: st.format,
        moduleId: api.moduleId,
        outputDir: st.outDir || null
      }) : await api.invoke("convert_video", {
        input: f.path,
        preset: st.mode,
        moduleId: api.moduleId,
        outputDir: st.outDir || null
      });
      const res = await watchJob(jobId, i);
      if (res.status === "done" && res.result) {
        setFile(i, { status: "done", progress: 100, result: res.result });
        log(`\u2713 ${baseName(f.path)} \u2192 ${baseName(res.result)}`);
      } else if (res.status === "cancelled") {
        setFile(i, { status: "cancelled" });
        log(`\u2298 ${baseName(f.path)} \u2014 ${t("cancelled", "zru\u0161en\xE9")}`);
      } else {
        setFile(i, { status: "error", error: res.message || "?" });
        log(`\u2715 ${baseName(f.path)}: ${res.message || "?"}`);
      }
    } catch (e) {
      setFile(i, { status: "error", error: String(e) });
      log(`\u2715 ${baseName(f.path)}: ${String(e)}`);
    }
  }
  store.setState({ running: false });
  log(t("queue_done", "Fronta dokon\u010Den\xE1."));
}
async function cancelRunning() {
  cancelFlag.current = true;
  const st = store.getState();
  const cur = st.files.findIndex((f) => f.status === "running");
  if (cur >= 0) {
    try {
      await api.invoke("cancel_job", { jobId: st.files[cur].jobId });
    } catch {
    }
  }
}
function Select({ label, value, onChange, options, labels, disabled }) {
  return /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, label), /* @__PURE__ */ react_shim_default.createElement(
    "select",
    {
      value,
      onChange: (e) => onChange(e.target.value),
      disabled,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none"
    },
    options.map((o) => /* @__PURE__ */ react_shim_default.createElement("option", { key: o, value: o }, labels ? labels[o] : o))
  ));
}
function Converter() {
  const s = useStore();
  const sRef = useRef2(s);
  sRef.current = s;
  useEffect2(() => {
    const handler = (e) => {
      const files = e.detail?.files;
      if (!Array.isArray(files)) return;
      const existing = new Set(store.getState().files.map((f) => f.path));
      const fresh = files.filter((p) => typeof p === "string" && !existing.has(p)).map((p) => ({ path: p, status: "queued", progress: 0, result: null, error: "" }));
      if (fresh.length) {
        store.setState((st) => ({ files: [...st.files, ...fresh] }));
        log(`\u{1F4E5} ${fresh.length} ${t("files_received", "s\xFAborov prijat\xFDch z in\xE9ho modulu")}`);
      }
    };
    window.addEventListener("skyframe-module-payload-skyframe.converter", handler);
    return () => window.removeEventListener("skyframe-module-payload-skyframe.converter", handler);
  }, []);
  useEffect2(() => {
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
      } catch {
      }
      store.setState({ restored: true });
    })();
  }, []);
  useEffect2(() => {
    if (!s.restored || s.running) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const st = store.getState();
      api.invoke("set_module_config", {
        id: api.moduleId,
        config: { session: {
          files: st.files.map((f) => f.path),
          mode: st.mode,
          resolution: st.resolution,
          crf: st.crf,
          fps: st.fps,
          audio: st.audio,
          format: st.format,
          outDir: st.outDir
        } }
      }).catch(() => {
      });
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
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
    orig: t("audio_orig", "P\xF4vodn\xFD (kop\xEDrova\u0165)"),
    "320": "AAC 320 kbps",
    "192": "AAC 192 kbps",
    "128": "AAC 128 kbps",
    "96": "AAC 96 kbps",
    none: t("audio_none", "Bez zvuku")
  };
  const resLabels = {
    orig: t("res_orig", "P\xF4vodn\xE9"),
    "3840": "4K UHD (3840)",
    "2560": "QHD (2560)",
    "1920": "Full HD (1920)",
    "1280": "HD (1280)",
    "854": "SD (854)"
  };
  const fpsLabels = { orig: t("fps_orig", "P\xF4vodn\xE9"), "24": "24", "25": "25", "30": "30", "50": "50", "60": "60" };
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-6 overflow-y-auto h-full" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold" }, "\u{1F504} ", t("title", "Konvertor")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => void addFiles(),
      disabled: s.running,
      className: "px-4 py-2 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
    },
    "\u2795 ",
    t("add_files", "Prida\u0165 vide\xE1")
  )), s.files.length === 0 ? /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => void addFiles(),
      className: "w-full rounded-xl border border-dashed border-border hover:border-accent/40 transition-colors py-14 text-center"
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-4xl mb-2" }, "\u{1F4C1}"),
    /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-sm font-medium" }, t("drop_hint", "Vyber vide\xE1 na konverziu")),
    /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-xs text-text-dim mt-1" }, "MP4 \xB7 MOV \xB7 MKV \xB7 AVI \xB7 WebM")
  ) : /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2" }, s.files.map((f, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: f.path, className: "flex items-center gap-3 bg-bg rounded-xl border border-border px-3 py-2" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm truncate" }, baseName(f.path)), /* @__PURE__ */ react_shim_default.createElement("span", { className: `text-[11px] font-mono shrink-0 ${f.status === "error" ? "text-error" : f.status === "done" ? "text-success" : "text-text-dim"}` }, f.status === "running" ? `${Math.round(f.progress)}%` : f.status === "done" ? "\u2713" : f.status === "error" ? t("error", "chyba") : f.status === "cancelled" ? t("cancelled", "zru\u0161en\xE9") : t("queued", "\u010Dak\xE1"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "w-full h-1.5 bg-bg-card rounded-full overflow-hidden border border-border mt-1" }, /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${f.status === "error" ? "bg-error" : f.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: `${f.status === "done" ? 100 : f.progress}%` }
    }
  )), f.error && /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] text-error mt-1 truncate" }, f.error)), !s.running && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState((st) => ({ files: st.files.filter((_, j) => j !== i) })),
      className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs shrink-0"
    },
    "\u2715"
  ))))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-4" }, t("settings", "Nastavenia konverzie")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-wrap gap-2 mb-4" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ mode: "custom" }),
      disabled: s.running,
      className: `px-3 py-1.5 rounded-lg text-xs border transition-colors ${s.mode === "custom" ? "bg-accent text-white border-accent" : "bg-bg text-text-dim border-border hover:text-text"}`
    },
    "\u2699\uFE0F ",
    t("mode_custom", "Vlastn\xE9")
  ), PRESETS.map((pr) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: pr,
      onClick: () => store.setState({ mode: pr }),
      disabled: s.running,
      className: `px-3 py-1.5 rounded-lg text-xs border transition-colors ${s.mode === pr ? "bg-accent text-white border-accent" : "bg-bg text-text-dim border-border hover:text-text"}`
    },
    t(`preset_${pr}`, pr)
  ))), s.mode !== "custom" && /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] text-text-dim mb-4" }, t(`preset_desc_${s.mode}`, "")), s.mode === "custom" && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ react_shim_default.createElement(Select, { label: t("resolution", "Rozl\xED\u0161enie"), value: s.resolution, onChange: (v) => store.setState({ resolution: v }), options: RESOLUTIONS, labels: resLabels, disabled: s.running }), /* @__PURE__ */ react_shim_default.createElement(Select, { label: t("fps", "Sn\xEDmkov\xE1 frekvencia"), value: s.fps, onChange: (v) => store.setState({ fps: v }), options: FPS_OPTS, labels: fpsLabels, disabled: s.running }), /* @__PURE__ */ react_shim_default.createElement(Select, { label: t("audio", "Zvuk"), value: s.audio, onChange: (v) => store.setState({ audio: v }), options: AUDIO_OPTS, labels: audioLabels, disabled: s.running }), /* @__PURE__ */ react_shim_default.createElement(Select, { label: t("format", "Form\xE1t"), value: s.format, onChange: (v) => store.setState({ format: v }), options: FORMATS, disabled: s.running })), /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between text-xs text-text-dim mb-1.5" }, /* @__PURE__ */ react_shim_default.createElement("span", null, t("quality", "Kvalita (CRF)")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "font-mono" }, s.crf, " \u2014 ", s.crf <= 20 ? t("quality_high", "vysok\xE1") : s.crf <= 26 ? t("quality_balanced", "vyv\xE1\u017Een\xE1") : t("quality_small", "mal\xFD s\xFAbor"))), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: 16,
      max: 32,
      step: 1,
      value: s.crf,
      onChange: (e) => store.setState({ crf: parseInt(e.target.value, 10) }),
      disabled: s.running,
      className: "w-full accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] text-text-dim mt-1" }, t("crf_hint", "Men\u0161ie \u010D\xEDslo = lep\u0161ia kvalita a v\xE4\u010D\u0161\xED s\xFAbor. 23 je dobr\xFD \u0161tandard."))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-4" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("output_dir", "V\xFDstupn\xFD prie\u010Dinok (volite\u013En\xE9)")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: async () => {
        const d = await api.pickDirectory();
        if (d) store.setState({ outDir: d });
      },
      disabled: s.running,
      className: "px-3 py-2 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    s.outDir ? t("change", "Zmeni\u0165") : t("browse", "Vybra\u0165\u2026")
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[11px] font-mono text-text-dim truncate flex-1" }, s.outDir || t("default_output", "(predvolen\xFD prie\u010Dinok aplik\xE1cie)")), s.outDir && /* @__PURE__ */ react_shim_default.createElement("button", { onClick: () => store.setState({ outDir: "" }), disabled: s.running, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "\u2715"))))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2" }, s.running ? /* @__PURE__ */ react_shim_default.createElement("button", { onClick: () => void cancelRunning(), className: "flex-1 px-4 py-3 rounded-xl text-sm bg-error/80 text-white hover:bg-error" }, "\u23F9 ", t("cancel_queue", "Zru\u0161i\u0165 frontu")) : /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => void runQueue(),
      disabled: !s.files.length,
      className: "flex-1 px-4 py-3 rounded-xl text-sm bg-accent text-white hover:opacity-90 disabled:opacity-40"
    },
    "\u25B6 ",
    t("start", "Spusti\u0165 konverziu"),
    " (",
    s.files.length,
    ")"
  )), s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("log", "Log")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-h-36 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, s.log.map((line, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, line))))));
}
var index_default = Converter;
export {
  index_default as default
};
