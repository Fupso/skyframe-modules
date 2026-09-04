// react-shim.mjs
var R = window.React;
var react_shim_default = R;
var useState = R.useState;
var useEffect = R.useEffect;
var useMemo = R.useMemo;
var useRef = R.useRef;
var useCallback = R.useCallback;
var useSyncExternalStore = R.useSyncExternalStore;
var Fragment = R.Fragment;
var react_shim_default2 = react_shim_default;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useMemo: useMemo2 } = react_shim_default2;
var STYLES = [
  { id: "style-hayao", cat: "anime", mb: 4.2 },
  { id: "style-shinkai", cat: "anime", mb: 4.2 },
  { id: "style-hayao2", cat: "anime", mb: 4.2 },
  { id: "style-shinkai2", cat: "anime", mb: 4.2 },
  { id: "style-hayao3", cat: "anime", mb: 4.2 },
  { id: "style-ghibli", cat: "portret", mb: 7 },
  { id: "style-skica", cat: "portret", mb: 4.2 },
  { id: "style-tvar", cat: "portret", mb: 8.6 },
  { id: "style-cartoon", cat: "cartoon", mb: 17 },
  { id: "style-mozaika", cat: "art", mb: 6.6 },
  { id: "style-candy", cat: "art", mb: 6.6 },
  { id: "style-dazd", cat: "art", mb: 6.6 },
  { id: "style-udnie", cat: "art", mb: 6.6 },
  { id: "style-pointil", cat: "art", mb: 6.6 }
];
var PHOTO_EXT = ["jpg", "jpeg", "png", "webp", "bmp"];
var isPhoto = (p) => p && PHOTO_EXT.includes(p.split(".").pop().toLowerCase());
var state = {
  media: null,
  installed: {},
  selected: null,
  intensity: 100,
  fps: 24,
  resolution: "original",
  keepAudio: true,
  previewImg: null,
  previewBusy: false,
  job: null,
  jobPct: 0,
  jobMsg: "",
  result: null,
  error: "",
  previews: {},
  aiOk: null
};
var listeners = /* @__PURE__ */ new Set();
var store = {
  getState: () => state,
  setState(p) {
    state = { ...state, ...p };
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  }
};
function useStore() {
  const [s, setS] = useState2(store.getState());
  useEffect2(() => store.subscribe(() => setS(store.getState())), []);
  return s;
}
async function refreshInstalled() {
  try {
    const list = await api.invoke("style_models_status", {});
    const map = {};
    for (const m of list) map[m.id] = m.installed;
    store.setState({ installed: map });
  } catch {
  }
}
async function loadPreviewImage(styleId) {
  if (store.getState().previews[styleId]) return;
  try {
    const bytes = await api.readModuleFile(`assets/previews/${styleId}.jpg`);
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    store.setState({ previews: { ...store.getState().previews, [styleId]: url } });
  } catch {
  }
}
function Module() {
  const s = useStore();
  useEffect2(() => {
    refreshInstalled();
    api.invoke("ai_status", {}).then((st) => store.setState({ aiOk: !!(st && (st.licensed || st.trial)) })).catch(() => store.setState({ aiOk: false }));
    if (api.getEditorMedia) {
      const m = api.getEditorMedia();
      if (m) store.setState({ media: m });
    }
    let un = null;
    if (api.onEditorMedia) un = api.onEditorMedia((m) => {
      if (m) store.setState({ media: m, result: null, previewImg: null });
    });
    STYLES.forEach((st) => loadPreviewImage(st.id));
    return () => {
      if (un) un();
    };
  }, []);
  const pickFile = async () => {
    const sel = await api.pickFiles([{ name: "Video/Foto", extensions: ["mp4", "mov", "mkv", "avi", "m4v", ...PHOTO_EXT] }], false);
    if (sel && typeof sel === "string") {
      store.setState({ media: { path: sel, kind: isPhoto(sel) ? "photo" : "video" }, result: null, previewImg: null, error: "" });
    }
  };
  return /* @__PURE__ */ react_shim_default2.createElement("div", { className: "h-full overflow-y-auto p-4 flex flex-col gap-4" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-xs text-text-dim" }, t("media", "M\xE9dium")), /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-sm truncate" }, s.media ? s.media.path.split(/[\\/]/).pop() : t("no_media", "\u017Diadne \u2014 vyber s\xFAbor alebo otvor m\xE9dium v Editore"))), /* @__PURE__ */ react_shim_default2.createElement("button", { onClick: pickFile, className: "px-3 py-1.5 rounded-lg bg-bg-card-hover border border-border text-sm hover:text-accent" }, "\u{1F4C2} ", t("pick", "Vybra\u0165 s\xFAbor"))), s.aiOk === false && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3" }, "\u26A0 ", t("need_ai", "AI \u0161t\xFDly vy\u017Eaduj\xFA AI licenciu a ONNX Runtime \u2014 aktivuj ich v AI centre.")), /* @__PURE__ */ react_shim_default2.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" }, STYLES.map((st) => /* @__PURE__ */ react_shim_default2.createElement(StyleCard, { key: st.id, style: st, active: s.selected === st.id, installed: !!s.installed[st.id], img: s.previews[st.id] }))), s.selected && /* @__PURE__ */ react_shim_default2.createElement(WorkPanel, null));
}
function StyleCard({ style, active, installed, img }) {
  const s = useStore();
  const [dl, setDl] = useState2(null);
  const select = () => store.setState({ selected: style.id, previewImg: null, error: "" });
  const download = async (e) => {
    e.stopPropagation();
    try {
      const jobId = await api.invoke("ensure_style_model", { modelId: style.id });
      if (!jobId) {
        await refreshInstalled();
        return;
      }
      setDl({ pct: 0, msg: t("downloading", "S\u0165ahujem\u2026") });
      const un = await api.listenJob(jobId, (j) => {
        setDl({ pct: Math.max(0, j.progress), msg: j.message });
        if (j.status === "done") {
          setDl(null);
          refreshInstalled();
          un();
        }
        if (j.status === "error") {
          setDl(null);
          store.setState({ error: j.message });
          un();
        }
      });
    } catch (e2) {
      store.setState({ error: String(e2) });
    }
  };
  return /* @__PURE__ */ react_shim_default2.createElement(
    "div",
    {
      onClick: installed ? select : void 0,
      className: `rounded-xl border overflow-hidden transition-all ${active ? "border-accent ring-2 ring-accent/30" : "border-border"} ${installed ? "cursor-pointer hover:border-accent/60" : "opacity-90"}`
    },
    /* @__PURE__ */ react_shim_default2.createElement("div", { className: "relative aspect-[3/2] bg-bg" }, img ? /* @__PURE__ */ react_shim_default2.createElement("img", { src: img, alt: style.id, className: "w-full h-full object-cover" }) : /* @__PURE__ */ react_shim_default2.createElement("div", { className: "w-full h-full flex items-center justify-center text-text-dim" }, "\u2026"), !installed && /* @__PURE__ */ react_shim_default2.createElement(
      "button",
      {
        onClick: download,
        className: "absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1 text-white hover:bg-black/45"
      },
      dl ? /* @__PURE__ */ react_shim_default2.createElement("span", { className: "text-xs" }, Math.round(dl.pct), " %") : /* @__PURE__ */ react_shim_default2.createElement(react_shim_default2.Fragment, null, /* @__PURE__ */ react_shim_default2.createElement("span", { className: "text-xl" }, "\u2B07"), /* @__PURE__ */ react_shim_default2.createElement("span", { className: "text-xs" }, t("download", "Stiahnu\u0165"), " \xB7 ", style.mb, " MB"))
    ), active && installed && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "absolute top-1.5 right-1.5 bg-accent text-white text-xs px-1.5 py-0.5 rounded" }, "\u2713")),
    /* @__PURE__ */ react_shim_default2.createElement("div", { className: "px-2 py-1.5 bg-bg-card" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-xs font-medium truncate" }, t(style.id, style.id)), installed && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-[10px] text-green-400" }, "\u2713 ", t("installed", "stiahnut\xFD")))
  );
}
function WorkPanel() {
  const s = useStore();
  const unlistenRef = useRef2(null);
  const styleId = s.selected;
  const photo = s.media ? isPhoto(s.media.path) : false;
  const canRun = s.media && s.aiOk !== false && !s.job;
  const doPreview = async () => {
    store.setState({ previewBusy: true, error: "", previewImg: null });
    try {
      let timeSec = 0;
      if (!photo) {
        try {
          const info = await api.invoke("get_video_info", { path: s.media.path });
          timeSec = (info.duration || 0) / 2;
        } catch {
        }
      }
      const bytes = await api.invoke("style_preview_frame", {
        path: s.media.path,
        timeSec,
        modelId: styleId,
        intensity: s.intensity / 100,
        maxWidth: 960
      });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
      store.setState({ previewImg: url, previewBusy: false });
    } catch (e) {
      store.setState({ error: String(e), previewBusy: false });
    }
  };
  const runJob = async (isPreview) => {
    store.setState({ error: "", result: null });
    try {
      let start, dur;
      if (isPreview) {
        dur = 5;
        try {
          const info = await api.invoke("get_video_info", { path: s.media.path });
          start = Math.max(0, (info.duration || 0) / 2 - dur / 2);
        } catch {
          start = 0;
        }
      }
      const jobId = await api.invoke("process_video_style", {
        input: s.media.path,
        modelId: styleId,
        intensity: s.intensity / 100,
        fps: s.fps,
        resolution: s.resolution,
        keepAudio: s.keepAudio,
        previewStartSec: start,
        previewDurationSec: dur,
        outputDir: null,
        moduleId: api.moduleId
      });
      store.setState({ job: jobId, jobPct: 0, jobMsg: "" });
      const un = await api.listenJob(jobId, (j) => {
        store.setState({ jobPct: Math.max(0, j.progress), jobMsg: j.message });
        if (j.status === "done") {
          store.setState({ job: null, result: j.result });
          un();
        }
        if (j.status === "error") {
          store.setState({ job: null, error: j.message });
          un();
        }
        if (j.status === "cancelled") {
          store.setState({ job: null });
          un();
        }
      });
      unlistenRef.current = un;
    } catch (e) {
      store.setState({ error: String(e) });
    }
  };
  const runPhoto = async () => {
    store.setState({ error: "", result: null, previewBusy: true });
    try {
      const out = await api.invoke("style_photo", {
        input: s.media.path,
        modelId: styleId,
        intensity: s.intensity / 100,
        outputDir: null
      });
      store.setState({ result: out, previewBusy: false });
    } catch (e) {
      store.setState({ error: String(e), previewBusy: false });
    }
  };
  const cancel = async () => {
    if (s.job) await api.cancelJob(s.job);
  };
  const saveAs = async () => {
    if (!s.result) return;
    const dest = await api.saveFile(s.result.split(/[\\/]/).pop());
    if (dest) await api.invoke("copy_file", { from: s.result, to: dest });
  };
  return /* @__PURE__ */ react_shim_default2.createElement("div", { className: "bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-3" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex items-center gap-2 text-sm font-medium" }, "\u{1F3AC} ", t(styleId, styleId)), /* @__PURE__ */ react_shim_default2.createElement("label", { className: "text-xs text-text-dim flex flex-col gap-1" }, t("intensity", "Intenzita"), " \u2014 ", s.intensity, " %", /* @__PURE__ */ react_shim_default2.createElement(
    "input",
    {
      type: "range",
      min: 10,
      max: 100,
      value: s.intensity,
      onChange: (e) => store.setState({ intensity: +e.target.value, previewImg: null })
    }
  )), !photo && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex flex-wrap gap-4 text-xs text-text-dim" }, /* @__PURE__ */ react_shim_default2.createElement("label", { className: "flex flex-col gap-1" }, "FPS", /* @__PURE__ */ react_shim_default2.createElement(
    "select",
    {
      value: s.fps,
      onChange: (e) => store.setState({ fps: +e.target.value }),
      className: "bg-bg border border-border rounded px-2 py-1"
    },
    /* @__PURE__ */ react_shim_default2.createElement("option", { value: 24 }, "24"),
    /* @__PURE__ */ react_shim_default2.createElement("option", { value: 25 }, "25"),
    /* @__PURE__ */ react_shim_default2.createElement("option", { value: 30 }, "30")
  )), /* @__PURE__ */ react_shim_default2.createElement("label", { className: "flex flex-col gap-1" }, t("resolution", "Rozl\xED\u0161enie"), /* @__PURE__ */ react_shim_default2.createElement(
    "select",
    {
      value: s.resolution,
      onChange: (e) => store.setState({ resolution: e.target.value }),
      className: "bg-bg border border-border rounded px-2 py-1"
    },
    /* @__PURE__ */ react_shim_default2.createElement("option", { value: "original" }, t("res_orig", "Origin\xE1l")),
    /* @__PURE__ */ react_shim_default2.createElement("option", { value: "1080p" }, "1080p"),
    /* @__PURE__ */ react_shim_default2.createElement("option", { value: "720p" }, "720p")
  )), /* @__PURE__ */ react_shim_default2.createElement("label", { className: "flex items-end gap-1.5 pb-1" }, /* @__PURE__ */ react_shim_default2.createElement("input", { type: "checkbox", checked: s.keepAudio, onChange: (e) => store.setState({ keepAudio: e.target.checked }) }), t("keep_audio", "Zachova\u0165 zvuk"))), /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ react_shim_default2.createElement(
    "button",
    {
      onClick: doPreview,
      disabled: !canRun || s.previewBusy,
      className: "px-3 py-1.5 rounded-lg bg-bg-card-hover border border-border text-sm hover:text-accent disabled:opacity-40"
    },
    "\u{1F5BC} ",
    s.previewBusy ? t("rendering", "Renderujem\u2026") : t("preview", "N\xE1h\u013Ead sn\xEDmky")
  ), !photo && /* @__PURE__ */ react_shim_default2.createElement(
    "button",
    {
      onClick: () => runJob(true),
      disabled: !canRun,
      className: "px-3 py-1.5 rounded-lg bg-bg-card-hover border border-border text-sm hover:text-accent disabled:opacity-40"
    },
    "\u25B6 ",
    t("sample", "Uk\xE1\u017Eka 5 s")
  ), photo ? /* @__PURE__ */ react_shim_default2.createElement(
    "button",
    {
      onClick: runPhoto,
      disabled: !canRun || s.previewBusy,
      className: "px-3 py-1.5 rounded-lg bg-accent text-white text-sm disabled:opacity-40"
    },
    "\u{1F4BE} ",
    t("export_photo", "Exportova\u0165 fotku")
  ) : /* @__PURE__ */ react_shim_default2.createElement(
    "button",
    {
      onClick: () => runJob(false),
      disabled: !canRun,
      className: "px-3 py-1.5 rounded-lg bg-accent text-white text-sm disabled:opacity-40"
    },
    "\u{1F4BE} ",
    t("export_video", "Exportova\u0165 video")
  ), s.job && /* @__PURE__ */ react_shim_default2.createElement("button", { onClick: cancel, className: "px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-sm" }, "\u2715 ", t("cancel", "Zru\u0161i\u0165"))), !s.media && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-xs text-text-dim" }, t("hint_media", "Najprv vyber s\xFAbor hore, alebo otvor m\xE9dium v Editore.")), s.job && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "h-2 bg-bg rounded-full overflow-hidden" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "h-full bg-accent transition-all", style: { width: `${s.jobPct}%` } })), /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-xs text-text-dim" }, Math.round(s.jobPct), " % \u2014 ", s.jobMsg)), s.error && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-sm text-red-400" }, "\u2717 ", s.error), s.previewImg && /* @__PURE__ */ react_shim_default2.createElement("img", { src: s.previewImg, alt: "preview", className: "rounded-lg border border-border max-h-80 object-contain self-start" }), s.result && /* @__PURE__ */ react_shim_default2.createElement("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ react_shim_default2.createElement("div", { className: "text-xs text-green-400" }, "\u2713 ", s.result), isPhoto(s.result) ? /* @__PURE__ */ react_shim_default2.createElement("img", { src: api.fileSrc(s.result), alt: "result", className: "rounded-lg border border-border max-h-96 object-contain self-start" }) : /* @__PURE__ */ react_shim_default2.createElement("video", { src: api.fileSrc(s.result), controls: true, className: "rounded-lg border border-border max-h-96 self-start" }), /* @__PURE__ */ react_shim_default2.createElement("div", null, /* @__PURE__ */ react_shim_default2.createElement("button", { onClick: saveAs, className: "px-3 py-1.5 rounded-lg bg-bg-card-hover border border-border text-sm hover:text-accent" }, "\u{1F4BE} ", t("save_as", "Ulo\u017Ei\u0165 ako\u2026")))));
}
export {
  Module as default
};
