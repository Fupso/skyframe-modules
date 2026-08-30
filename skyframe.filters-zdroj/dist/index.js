// ../merger-build/react-shim.js
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
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
var initialState = {
  videoPath: null,
  // cesta k videu (aktívne médium / výber)
  activeStyle: null,
  // {channels:{r,g,b:{slope,intercept}}, css:{brightness,contrast,saturate}} | null
  activePresetId: null,
  intensity: 80,
  // sila štýlu v % (mierni kanálové posuny aj css)
  skyOnly: false,
  // aplikovať tón len na svetlé partie (obloha) — luma maska
  presets: [],
  // {id, name, style, avgColor, favorite, createdAt}[]
  showNewStyle: false,
  analyzing: false,
  tempAnalysis: null,
  // {style, avgColor}
  tempPhotoUrl: "",
  presetName: "",
  fromActiveMedia: false,
  job: null,
  // {id, status, progress, message, result} | null
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
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var MAIN_FILTER_ID = "skyframe-style-channels";
function scaledStyle(style, intensity) {
  const k = clamp(intensity, 0, 100) / 100;
  const ch = {};
  for (const c of ["r", "g", "b"]) {
    ch[c] = {
      slope: 1 + (style.channels[c].slope - 1) * k,
      intercept: style.channels[c].intercept * k
    };
  }
  const css = {
    brightness: 100 + (style.css.brightness - 100) * k,
    contrast: 100 + (style.css.contrast - 100) * k,
    saturate: 100 + (style.css.saturate - 100) * k
  };
  return { channels: ch, css };
}
function fullFilterString(style, intensity, filterId = MAIN_FILTER_ID) {
  if (!style) return "";
  const s = scaledStyle(style, intensity);
  return `url(#${filterId}) brightness(${s.css.brightness.toFixed(1)}%) contrast(${s.css.contrast.toFixed(1)}%) saturate(${s.css.saturate.toFixed(1)}%)`;
}
function SkyFilterDefs({ style, intensity, filterId }) {
  if (!style) return null;
  const s = scaledStyle(style, intensity);
  return /* @__PURE__ */ react_shim_default.createElement("svg", { width: "0", height: "0", style: { position: "absolute" }, "aria-hidden": "true" }, /* @__PURE__ */ react_shim_default.createElement("filter", { id: filterId, colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ react_shim_default.createElement(
    "feColorMatrix",
    {
      in: "SourceGraphic",
      result: "lumamap",
      type: "matrix",
      values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.299 0.587 0.114 0 0"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("feComponentTransfer", { in: "lumamap", result: "mask" }, /* @__PURE__ */ react_shim_default.createElement("feFuncA", { type: "table", tableValues: "0 0 0.15 1 1" })), /* @__PURE__ */ react_shim_default.createElement("feComponentTransfer", { in: "SourceGraphic", result: "tinted" }, /* @__PURE__ */ react_shim_default.createElement("feFuncR", { type: "linear", slope: s.channels.r.slope.toFixed(4), intercept: s.channels.r.intercept.toFixed(4) }), /* @__PURE__ */ react_shim_default.createElement("feFuncG", { type: "linear", slope: s.channels.g.slope.toFixed(4), intercept: s.channels.g.intercept.toFixed(4) }), /* @__PURE__ */ react_shim_default.createElement("feFuncB", { type: "linear", slope: s.channels.b.slope.toFixed(4), intercept: s.channels.b.intercept.toFixed(4) })), /* @__PURE__ */ react_shim_default.createElement("feComposite", { in: "tinted", in2: "mask", operator: "in", result: "tintedMasked" }), /* @__PURE__ */ react_shim_default.createElement("feMerge", null, /* @__PURE__ */ react_shim_default.createElement("feMergeNode", { in: "SourceGraphic" }), /* @__PURE__ */ react_shim_default.createElement("feMergeNode", { in: "tintedMasked" }))));
}
var SKY_FILTER_ID = "skyframe-style-sky";
function ChannelFilterDefs({ style, intensity, filterId = MAIN_FILTER_ID }) {
  if (!style) return null;
  const s = scaledStyle(style, intensity);
  return /* @__PURE__ */ react_shim_default.createElement("svg", { width: "0", height: "0", style: { position: "absolute" }, "aria-hidden": "true" }, /* @__PURE__ */ react_shim_default.createElement("filter", { id: filterId, colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ react_shim_default.createElement("feComponentTransfer", null, /* @__PURE__ */ react_shim_default.createElement("feFuncR", { type: "linear", slope: s.channels.r.slope.toFixed(4), intercept: s.channels.r.intercept.toFixed(4) }), /* @__PURE__ */ react_shim_default.createElement("feFuncG", { type: "linear", slope: s.channels.g.slope.toFixed(4), intercept: s.channels.g.intercept.toFixed(4) }), /* @__PURE__ */ react_shim_default.createElement("feFuncB", { type: "linear", slope: s.channels.b.slope.toFixed(4), intercept: s.channels.b.intercept.toFixed(4) }))));
}
async function pickVideo() {
  const f = await api.pickFiles(VIDEO_FILTERS, false);
  if (f && !Array.isArray(f)) {
    store.setState({ videoPath: f, fromActiveMedia: false });
    if (api.setActiveMedia) api.setActiveMedia(f);
  }
}
function savePresets(presets) {
  store.setState({ presets });
  api.invoke("set_module_config", { id: api.moduleId, config: { presets } }).catch(() => {
  });
}
function analyzePhoto(file) {
  return new Promise(function(resolve) {
    const img = new Image();
    img.onload = function() {
      const N = 100;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = N;
      canvas.height = N;
      ctx.drawImage(img, 0, 0, N, N);
      const data = ctx.getImageData(0, 0, N, N).data;
      let r = 0, g = 0, b = 0, lumSum = 0, lumSq = 0, satSum = 0;
      const pc = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        r += pr;
        g += pg;
        b += pb;
        const lum2 = (pr + pg + pb) / 3 / 255;
        lumSum += lum2;
        lumSq += lum2 * lum2;
        const mx = Math.max(pr, pg, pb), mn = Math.min(pr, pg, pb);
        satSum += mx > 0 ? (mx - mn) / mx : 0;
      }
      const avgR = r / pc / 255, avgG = g / pc / 255, avgB = b / pc / 255;
      const lum = lumSum / pc;
      const std = Math.sqrt(Math.max(0, lumSq / pc - lum * lum));
      const sat = satSum / pc;
      const chan = (a) => ({ slope: 1, intercept: clamp(a - 0.5, -0.3, 0.3) });
      const style = {
        channels: { r: chan(avgR), g: chan(avgG), b: chan(avgB) },
        css: {
          brightness: clamp(100 + (lum - 0.5) * 60, 70, 140),
          contrast: clamp(100 + (std - 0.18) * 160, 70, 150),
          saturate: clamp(60 + sat * 200, 60, 180)
        }
      };
      resolve({
        avgColor: { r: Math.round(avgR * 255), g: Math.round(avgG * 255), b: Math.round(avgB * 255) },
        style,
        thumb: canvas.toDataURL("image/jpeg", 0.7)
      });
    };
    img.src = URL.createObjectURL(file);
  });
}
function buildVf(style, intensity) {
  const s = scaledStyle(style, intensity);
  const ch = (name, c) => {
    const off = Math.round(c.intercept * 255);
    const sign = off >= 0 ? "+" : "";
    return `${name}='clip(val${sign}${off}\\,0\\,255)'`;
  };
  const lut = `lutrgb=${ch("r", s.channels.r)}:${ch("g", s.channels.g)}:${ch("b", s.channels.b)}`;
  const eq = `eq=brightness=${((s.css.brightness - 100) / 100 * 0.5).toFixed(3)}:contrast=${(s.css.contrast / 100).toFixed(3)}:saturation=${(s.css.saturate / 100).toFixed(3)}`;
  return `${lut},${eq}`;
}
function buildSkyGraph(style, intensity) {
  const sc = scaledStyle(style, intensity);
  const ch = (name, c) => {
    const off = Math.round(c.intercept * 255);
    const sign = off >= 0 ? "+" : "";
    return `${name}='clip(val${sign}${off}\\,0\\,255)'`;
  };
  const lut = `lutrgb=${ch("r", sc.channels.r)}:${ch("g", sc.channels.g)}:${ch("b", sc.channels.b)}`;
  return `[0:v]split=3[base][t][mm];[t]${lut}[tinted];[mm]format=gray,curves=all='0/0 0.55/0 0.75/1 1/1'[mask];[tinted][mask]alphamerge[ta];[base][ta]overlay[v]`;
}
function watchJob(jobId) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      store.setState({ job });
      if (job.status !== "running") {
        unlisten?.();
        resolve(job);
      }
    }).then((u) => {
      unlisten = u;
    });
  });
}
async function exportVideo() {
  const s = store.getState();
  if (!s.videoPath || !s.activeStyle || s.job?.status === "running") return;
  const vf = buildVf(s.activeStyle, s.intensity);
  try {
    const jobId = await api.invoke("filter_video", {
      input: s.videoPath,
      vf,
      af: null,
      quality: "21",
      outputName: null,
      outputDir: null,
      moduleId: api.moduleId,
      filterComplex: s.skyOnly ? buildSkyGraph(s.activeStyle, s.intensity) : null
    });
    store.setState({
      job: { id: jobId, status: "running", progress: 0, message: "", result: null }
    });
    const res = await watchJob(jobId);
    if (res.status === "done" && res.result && api.setActiveMedia) {
      api.setActiveMedia(res.result);
    }
  } catch (e) {
    store.setState({
      job: { id: "error", status: "error", progress: 0, message: String(e), result: null }
    });
  }
}
if (api.registerToolbar) {
  api.registerToolbar([
    {
      id: "open",
      icon: "\u{1F4C2}",
      labelKey: "tool_open",
      onClick: () => void pickVideo()
    },
    {
      id: "new_style",
      icon: "\u{1F3A8}",
      labelKey: "tool_new_style",
      onClick: () => store.setState({ showNewStyle: true })
    },
    {
      id: "clear",
      icon: "\u{1F6AB}",
      labelKey: "tool_clear",
      onClick: () => store.setState({ activeStyle: null, activePresetId: null })
    }
  ]);
}
function PresetCard({ preset }) {
  const s = useStore();
  const isActive = s.activePresetId === preset.id;
  const isFav = preset.favorite;
  return /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      onClick: () => store.setState(
        isActive ? { activeStyle: null, activePresetId: null } : { activeStyle: preset.style, activePresetId: preset.id }
      ),
      className: `rounded-xl border p-2 text-center transition-colors cursor-pointer relative ${isActive ? "border-accent bg-accent/10" : "border-border bg-bg hover:border-accent/40"}`
    },
    /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          savePresets(s.presets.map((p) => p.id === preset.id ? { ...p, favorite: !p.favorite } : p));
        },
        style: { position: "absolute", top: 2, right: 4 },
        className: "text-xs",
        title: t("favorite", "Ob\u013E\xFAben\xE9")
      },
      isFav ? "\u2B50" : "\u2606"
    ),
    /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          savePresets(s.presets.filter((p) => p.id !== preset.id));
        },
        style: { position: "absolute", top: 2, left: 4 },
        className: "text-[10px] text-error",
        title: t("delete", "Zmaza\u0165")
      },
      "\u2715"
    ),
    preset.thumb ? /* @__PURE__ */ react_shim_default.createElement(
      "img",
      {
        src: preset.thumb,
        alt: preset.name,
        draggable: false,
        style: { width: "100%", height: 44, objectFit: "cover", borderRadius: 8, margin: "2px 0 6px" }
      }
    ) : /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: {
          width: 34,
          height: 34,
          borderRadius: "50%",
          margin: "4px auto 6px",
          backgroundColor: `rgb(${preset.avgColor.r},${preset.avgColor.g},${preset.avgColor.b})`,
          border: "2px solid rgba(255,255,255,0.15)"
        }
      }
    ),
    /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] truncate" }, preset.name)
  );
}
function SidePanel() {
  const s = useStore();
  const favorites = s.presets.filter((p) => p.favorite);
  const others = s.presets.filter((p) => !p.favorite);
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-4 px-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs text-text-dim" }, s.activeStyle ? t("filter_on", "Filter akt\xEDvny") : t("filter_off", "\u017Diadny filter")), s.activeStyle && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ activeStyle: null, activePresetId: null }),
      className: "px-2 py-1 rounded text-[10px] text-text-dim border border-border hover:border-accent/40"
    },
    t("clear", "Zru\u0161i\u0165 filter")
  )), s.activeStyle && /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1" }, t("intensity", "Intenzita"), ": ", s.intensity, " %"), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: 0,
      max: 100,
      value: s.intensity,
      onChange: (e) => store.setState({ intensity: Number(e.target.value) }),
      className: "w-full accent-[#6366f1]"
    }
  )), s.activeStyle && /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.skyOnly,
      onChange: (e) => store.setState({ skyOnly: e.target.checked }),
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm" }, t("sky_only", "Len svetl\xE9 partie (obloha)"))), s.activeStyle && /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2 pt-2 border-t border-border" }, !s.job || s.job.status !== "running" ? /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => void exportVideo(),
      disabled: !s.videoPath,
      className: "w-full px-3 py-2 rounded-xl text-xs font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "\u2B07\uFE0F ",
    t("export", "Exportova\u0165 video s filtrom")
  ) : /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs" }, t("exporting", "Exportujem\u2026")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[11px] font-mono text-text-dim" }, Math.round(s.job.progress), "%")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-full rounded-full bg-accent transition-all duration-300", style: { width: `${Math.max(2, Math.min(100, s.job.progress))}%` } }))), s.job?.status === "done" && s.job.result && /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[10px] font-mono text-success break-all" }, "\u2713 ", s.job.result), s.job?.status === "error" && /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[10px] text-error break-all" }, "\u2717 ", s.job.message))), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ showNewStyle: true }),
      className: "w-full px-3 py-2 rounded-xl text-xs font-medium bg-accent/10 text-accent border border-accent/20 border-dashed hover:bg-accent/20 transition-colors"
    },
    "+ ",
    t("new_style", "Nov\xFD \u0161t\xFDl z fotky")
  ), favorites.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, "\u2B50 ", t("favorites", "Ob\u013E\xFAben\xE9"), " (", favorites.length, ")"), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 } }, favorites.map((p) => /* @__PURE__ */ react_shim_default.createElement(PresetCard, { key: p.id, preset: p })))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, "\u2728 ", t("all_styles", "V\u0161etky \u0161t\xFDly"), " (", s.presets.length, ")"), others.length ? /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 } }, others.map((p) => /* @__PURE__ */ react_shim_default.createElement(PresetCard, { key: p.id, preset: p }))) : !favorites.length && /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-xs text-text-dim" }, t("no_styles", "Zatia\u013E \u017Eiadne \u0161t\xFDly \u2014 pridaj prv\xFD z fotky."))));
}
if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}
function Filters() {
  const s = useStore();
  const fileInputRef = useRef2(null);
  const PlayerShell = api.PlayerShell;
  useEffect2(() => {
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        if (Array.isArray(cfg?.presets)) {
          store.setState({ presets: cfg.presets.filter((p) => p && p.style && p.style.channels) });
        }
      } catch {
      }
      store.setState({ restored: true });
    })();
    if (api.getActiveMedia) {
      const active = api.getActiveMedia();
      if (active) store.setState({ videoPath: active, fromActiveMedia: true });
    }
    if (api.onActiveMedia) {
      const off = api.onActiveMedia((path) => {
        if (path) store.setState({ videoPath: path, fromActiveMedia: true });
      });
      return off;
    }
  }, []);
  const handleStylePhoto = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    store.setState({ tempPhotoUrl: URL.createObjectURL(f), analyzing: true });
    const a = await analyzePhoto(f);
    store.setState({ tempAnalysis: a, analyzing: false });
  };
  const savePreset = () => {
    const st = store.getState();
    if (!st.presetName.trim() || !st.tempAnalysis) return;
    const np = {
      id: Date.now().toString(),
      name: st.presetName.trim(),
      style: st.tempAnalysis.style,
      avgColor: st.tempAnalysis.avgColor,
      thumb: st.tempAnalysis.thumb || null,
      favorite: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    savePresets([...st.presets, np]);
    store.setState({ presetName: "", tempAnalysis: null, tempPhotoUrl: "", showNewStyle: false });
  };
  const closeModal = () => store.setState({ showNewStyle: false, tempAnalysis: null, presetName: "", tempPhotoUrl: "" });
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-6 overflow-y-auto h-full" }, /* @__PURE__ */ react_shim_default.createElement(ChannelFilterDefs, { style: s.activeStyle, intensity: s.intensity }), /* @__PURE__ */ react_shim_default.createElement(SkyFilterDefs, { style: s.activeStyle, intensity: s.intensity, filterId: SKY_FILTER_ID }), /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold" }, "\u{1F3A8} ", t("title", "Filtre")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: pickVideo,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    s.videoPath ? `\u{1F504} ${t("change_video", "In\xE9 video")}` : `\u{1F3AC} ${t("pick_video", "Vybra\u0165 video")}`
  )), s.videoPath ? /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, s.fromActiveMedia && /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] text-text-dim mb-2" }, "\u{1F517} ", t("from_active", "Akt\xEDvne m\xE9dium"), ": ", /* @__PURE__ */ react_shim_default.createElement("span", { className: "font-mono" }, baseName(s.videoPath))), /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      className: "rounded-xl overflow-hidden border border-border bg-black",
      style: {
        filter: s.skyOnly ? s.activeStyle ? `url(#${SKY_FILTER_ID})` : "" : fullFilterString(s.activeStyle, s.intensity)
      }
    },
    /* @__PURE__ */ react_shim_default.createElement(PlayerShell, { src: s.videoPath })
  )) : /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      onClick: pickVideo,
      className: "rounded-xl border border-dashed border-border hover:border-accent/40 transition-colors cursor-pointer py-16 text-center"
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-5xl mb-3" }, "\u{1F3AC}"),
    /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-sm font-medium" }, t("pick_video", "Vybra\u0165 video")),
    /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-xs text-text-dim mt-1" }, t("hint_active", "Alebo najprv spoj vide\xE1 v Sp\xE1ja\u010Di \u2014 v\xFDstup sa tu objav\xED s\xE1m."))
  )), !api.registerSidePanel && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement(SidePanel, null))), s.showNewStyle && /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      onClick: closeModal,
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center" }
    },
    /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        className: "bg-bg-card border border-border rounded-2xl p-6",
        style: { width: 400, maxWidth: "90%" }
      },
      /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-base font-semibold mb-4" }, "\u{1F4F7} ", t("new_style", "Nov\xFD \u0161t\xFDl z fotky")),
      !s.tempAnalysis ? /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-xs text-text-dim mb-3" }, t("photo_hint", "Nahraj fotku s po\u017Eadovan\xFDmi farbami \u2014 filter sa odvod\xED z nej.")), s.analyzing ? /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-accent text-sm" }, t("analyzing", "Analyzujem\u2026")) : /* @__PURE__ */ react_shim_default.createElement(
        "button",
        {
          onClick: () => fileInputRef.current?.click(),
          className: "w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors"
        },
        "\u{1F4C1} ",
        t("pick_photo", "Vybra\u0165 fotku")
      ), /* @__PURE__ */ react_shim_default.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handleStylePhoto })) : /* @__PURE__ */ react_shim_default.createElement("div", null, s.tempPhotoUrl && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ react_shim_default.createElement("img", { src: s.tempPhotoUrl, alt: "", className: "rounded-lg", style: { width: "48%", height: 100, objectFit: "cover" } }), /* @__PURE__ */ react_shim_default.createElement(
        "img",
        {
          src: s.tempPhotoUrl,
          alt: "",
          className: "rounded-lg",
          style: { width: "48%", height: 100, objectFit: "cover", filter: fullFilterString(s.tempAnalysis.style, s.intensity, "skyframe-style-preview") }
        }
      )), s.tempAnalysis && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement(ChannelFilterDefs, { style: s.tempAnalysis.style, intensity: s.intensity, filterId: "skyframe-style-preview" }), /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[10px] text-text-dim mb-2 -mt-1" }, t("preview_compare", "V\u013Eavo origin\xE1l, vpravo odvoden\xFD t\xF3n"))), /* @__PURE__ */ react_shim_default.createElement(
        "input",
        {
          type: "text",
          value: s.presetName,
          onChange: (e) => store.setState({ presetName: e.target.value }),
          onKeyDown: (e) => e.stopPropagation(),
          onKeyUp: (e) => e.stopPropagation(),
          placeholder: t("style_name", "N\xE1zov \u0161t\xFDlu\u2026"),
          className: "w-full px-3 py-2 mb-3 bg-bg rounded-lg border border-border text-sm text-text outline-none focus:border-accent/50"
        }
      ), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ react_shim_default.createElement(
        "button",
        {
          onClick: closeModal,
          className: "flex-1 px-3 py-2 rounded-lg text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
        },
        t("cancel", "Zru\u0161i\u0165")
      ), /* @__PURE__ */ react_shim_default.createElement(
        "button",
        {
          onClick: savePreset,
          disabled: !s.presetName.trim(),
          className: "flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
        },
        "\u{1F4BE} ",
        t("save", "Ulo\u017Ei\u0165")
      )))
    )
  ));
}
var index_default = Filters;
export {
  index_default as default
};
