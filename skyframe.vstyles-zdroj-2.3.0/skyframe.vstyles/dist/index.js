// react-shim.mjs
var React = window.React;
var react_shim_default = React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var createElement = React.createElement;
var Fragment = React.Fragment;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2 } = react_shim_default;
var STYLES = [
  { id: "style-paprika", mb: 8.6 },
  { id: "style-hayao-hd", mb: 8.6 },
  { id: "style-shinkai-hd", mb: 8.6 },
  { id: "style-hayao", mb: 4.2 },
  { id: "style-shinkai", mb: 4.2 },
  { id: "style-hayao2", mb: 4.2 },
  { id: "style-shinkai2", mb: 4.2 },
  { id: "style-hayao3", mb: 4.2 },
  { id: "style-ghibli", mb: 7 },
  { id: "style-skica", mb: 4.2 },
  { id: "style-jpanime", mb: 6.1 },
  { id: "style-cartoon", mb: 17 },
  { id: "style-mozaika", mb: 6.6 },
  { id: "style-candy", mb: 6.6 },
  { id: "style-dazd", mb: 6.6 },
  { id: "style-udnie", mb: 6.6 },
  { id: "style-pointil", mb: 6.6 }
];
var state = {
  media: null,
  installed: {},
  previews: {},
  aiOk: null,
  selected: null,
  intensity: 100,
  fps: 24,
  resolution: "original",
  keepAudio: true
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
var writeTimer = null;
function writeStep() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const s = store.getState();
    if (!s.selected || !s.media) {
      api.setEditorStep(null);
      return;
    }
    const label = `${t(s.selected, s.selected)} ${s.intensity} %`;
    api.setEditorStep({
      label,
      style: {
        modelId: s.selected,
        intensity: s.intensity / 100,
        fps: s.fps,
        resolution: s.resolution,
        keepAudio: s.keepAudio
      }
    });
  }, 300);
}
function ToolPanel() {
  const s = useStore();
  const isVideo = s.media && s.media.kind === "video";
  useEffect2(() => {
    refreshInstalled();
    api.invoke("ai_status", {}).then((st) => store.setState({ aiOk: !!(st && (st.licensed || st.trial)) })).catch(() => store.setState({ aiOk: false }));
    if (api.getEditorMedia) store.setState({ media: api.getEditorMedia() });
    let un = null;
    if (api.onEditorMedia) un = api.onEditorMedia((m) => store.setState({ media: m }));
    STYLES.forEach((st) => loadPreviewImage(st.id));
    return () => {
      if (un) un();
    };
  }, []);
  useEffect2(() => {
    writeStep();
  }, [s.selected, s.intensity, s.fps, s.resolution, s.keepAudio, s.media]);
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-3 flex flex-col gap-3 text-sm" }, !s.media && /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs text-text-dim bg-bg-card border border-border rounded-lg p-2" }, t("hint_media", "Otvor fotku alebo video v Editore \u2014 \u0161t\xFDl sa aplikuje na\u0148.")), s.aiOk === false && /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2" }, "\u26A0 ", t("need_ai", "AI \u0161t\xFDly vy\u017Eaduj\xFA AI licenciu a ONNX Runtime \u2014 aktivuj ich v AI centre.")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-2 gap-2" }, STYLES.map((st) => /* @__PURE__ */ react_shim_default.createElement(Card, { key: st.id, style: st, active: s.selected === st.id, installed: !!s.installed[st.id], img: s.previews[st.id] }))), s.selected && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ selected: null }),
      className: "self-start text-xs px-2.5 py-1 rounded-lg border border-border text-text-dim hover:text-red-400"
    },
    "\u2715 ",
    t("off", "Vypn\xFA\u0165 \u0161t\xFDl")
  ), /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-xs text-text-dim flex flex-col gap-1" }, t("intensity", "Intenzita"), " \u2014 ", s.intensity, " %", /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: 10,
      max: 100,
      value: s.intensity,
      onChange: (e) => store.setState({ intensity: +e.target.value })
    }
  )), isVideo && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-wrap gap-3 text-xs text-text-dim" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex flex-col gap-1" }, "FPS", /* @__PURE__ */ react_shim_default.createElement(
    "select",
    {
      value: s.fps,
      onChange: (e) => store.setState({ fps: +e.target.value }),
      className: "bg-bg border border-border rounded px-2 py-1"
    },
    /* @__PURE__ */ react_shim_default.createElement("option", { value: 24 }, "24"),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: 25 }, "25"),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: 30 }, "30")
  )), /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex flex-col gap-1" }, t("resolution", "Rozl\xED\u0161enie"), /* @__PURE__ */ react_shim_default.createElement(
    "select",
    {
      value: s.resolution,
      onChange: (e) => store.setState({ resolution: e.target.value }),
      className: "bg-bg border border-border rounded px-2 py-1"
    },
    /* @__PURE__ */ react_shim_default.createElement("option", { value: "original" }, t("res_orig", "Origin\xE1l")),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: "2160p" }, "4K"),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: "1080p" }, "1080p"),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: "1024p" }, "1024p"),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: "720p" }, "720p"),
    /* @__PURE__ */ react_shim_default.createElement("option", { value: "480p" }, "480p")
  )), /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-end gap-1.5 pb-1" }, /* @__PURE__ */ react_shim_default.createElement("input", { type: "checkbox", checked: s.keepAudio, onChange: (e) => store.setState({ keepAudio: e.target.checked }) }), t("keep_audio", "Zvuk"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim leading-snug border-t border-border pt-2" }, "\u{1F4A1} ", t("how", "\u0160t\xFDl je prv\xFD krok z\xE1sobn\xEDka \u2014 potom m\xF4\u017Ee\u0161 prida\u0165 Filtre alebo Portr\xE9t. Export je jeden s\xFAbor."))));
}
function Card({ style, active, installed, img }) {
  const [dl, setDl] = useState2(null);
  const select = () => store.setState({ selected: style.id });
  const download = async (e) => {
    e.stopPropagation();
    try {
      const jobId = await api.invoke("ensure_style_model", { modelId: style.id });
      if (!jobId) {
        await refreshInstalled();
        return;
      }
      setDl({ pct: 0 });
      const un = await api.listenJob(jobId, (j) => {
        setDl({ pct: Math.max(0, j.progress) });
        if (j.status === "done") {
          setDl(null);
          refreshInstalled();
          un();
        }
        if (j.status === "error") {
          setDl(null);
          un();
        }
      });
    } catch {
    }
  };
  return /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      onClick: installed ? select : void 0,
      className: `rounded-lg border overflow-hidden transition-all ${active ? "border-accent ring-2 ring-accent/30" : "border-border"} ${installed ? "cursor-pointer hover:border-accent/60" : ""}`
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "relative aspect-[3/2] bg-bg" }, img ? /* @__PURE__ */ react_shim_default.createElement("img", { src: img, alt: style.id, className: "w-full h-full object-cover" }) : /* @__PURE__ */ react_shim_default.createElement("div", { className: "w-full h-full flex items-center justify-center text-text-dim" }, "\u2026"), !installed && /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick: download,
        className: "absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-0.5 text-white hover:bg-black/45"
      },
      dl ? /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[10px]" }, Math.round(dl.pct), " %") : /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("span", null, "\u2B07"), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[9px]" }, style.mb, " MB"))
    ), active && installed && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute top-1 right-1 bg-accent text-white text-[9px] px-1 py-0.5 rounded" }, "\u2713")),
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "px-1.5 py-1 bg-bg-card" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[10px] font-medium truncate" }, t(style.id, style.id)))
  );
}
if (api.registerEditorPanel) {
  api.registerEditorPanel(ToolPanel);
}
function VStylesInfo() {
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-4 text-sm text-text-dim" }, "\u{1F3AC} ", t("info", "\u0160t\xFDly videa s\xFA n\xE1stroj Editora \u2014 otvor Editor (\u{1F39B}\uFE0F) a vyber ich vpravo."));
}
export {
  VStylesInfo as default
};
