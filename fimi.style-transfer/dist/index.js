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
  activeFilters: null,
  // {brightness, contrast, saturate, sepia, hueRotate} | null
  activePresetId: null,
  presets: [],
  // {id, name, filters, avgColor, favorite, createdAt}[]
  showNewStyle: false,
  analyzing: false,
  tempAnalysis: null,
  // {filters, avgColor}
  tempPhotoUrl: "",
  presetName: "",
  fromActiveMedia: false,
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
function filterString(f) {
  if (!f) return "";
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg)`;
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
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;
      let r = 0, g = 0, b = 0, warm = 0, cool = 0, sat = 0, bright = 0, dark = 0;
      const pc = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        r += pr;
        g += pg;
        b += pb;
        if (pr > pb + 20) warm++;
        else if (pb > pr + 20) cool++;
        const mx = Math.max(pr, pg, pb), mn = Math.min(pr, pg, pb);
        sat += (mx - mn) / 255;
        const br2 = (pr + pg + pb) / 3;
        if (br2 > 180) bright++;
        else if (br2 < 75) dark++;
      }
      const avgSat = sat / pc * 100, wm = warm / pc, cl = cool / pc, br = (r + g + b) / 3 / pc / 255 * 100;
      const f = {
        brightness: Math.round(90 + (br - 50) * 0.4),
        contrast: Math.round(100 + (avgSat - 50) * 0.8),
        saturate: Math.round(80 + avgSat * 0.8),
        sepia: Math.round(wm * 60),
        hueRotate: wm > 0.4 ? Math.round(wm * -15) : cl > 0.4 ? Math.round(cl * 10) : 0
      };
      if (bright > 0.3 && dark > 0.2) f.contrast = Math.min(f.contrast + 20, 150);
      resolve({
        avgColor: { r: Math.round(r / pc), g: Math.round(g / pc), b: Math.round(b / pc) },
        filters: f
      });
    };
    img.src = URL.createObjectURL(file);
  });
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
      onClick: () => store.setState({ activeFilters: null, activePresetId: null })
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
        isActive ? { activeFilters: null, activePresetId: null } : { activeFilters: preset.filters, activePresetId: preset.id }
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
    /* @__PURE__ */ react_shim_default.createElement(
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
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-4 px-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs text-text-dim" }, s.activeFilters ? t("filter_on", "Filter akt\xEDvny") : t("filter_off", "\u017Diadny filter")), s.activeFilters && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ activeFilters: null, activePresetId: null }),
      className: "px-2 py-1 rounded text-[10px] text-text-dim border border-border hover:border-accent/40"
    },
    t("clear", "Zru\u0161i\u0165 filter")
  )), /* @__PURE__ */ react_shim_default.createElement(
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
        if (Array.isArray(cfg?.presets)) store.setState({ presets: cfg.presets });
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
      filters: st.tempAnalysis.filters,
      avgColor: st.tempAnalysis.avgColor,
      favorite: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    savePresets([...st.presets, np]);
    store.setState({ presetName: "", tempAnalysis: null, tempPhotoUrl: "", showNewStyle: false });
  };
  const closeModal = () => store.setState({ showNewStyle: false, tempAnalysis: null, presetName: "", tempPhotoUrl: "" });
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-6 overflow-y-auto h-full" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold" }, "\u{1F3A8} ", t("title", "Filtre")), /* @__PURE__ */ react_shim_default.createElement(
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
      style: { filter: filterString(s.activeFilters) }
    },
    /* @__PURE__ */ react_shim_default.createElement(PlayerShell, { src: s.videoPath })
  ), s.activeFilters && /* @__PURE__ */ react_shim_default.createElement("p", { className: "mt-2 text-[11px] font-mono text-text-dim" }, filterString(s.activeFilters))) : /* @__PURE__ */ react_shim_default.createElement(
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
      ), /* @__PURE__ */ react_shim_default.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handleStylePhoto })) : /* @__PURE__ */ react_shim_default.createElement("div", null, s.tempPhotoUrl && /* @__PURE__ */ react_shim_default.createElement("img", { src: s.tempPhotoUrl, alt: "", className: "rounded-lg mb-3", style: { width: "100%", height: 120, objectFit: "cover" } }), /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] font-mono text-text-dim mb-3" }, filterString(s.tempAnalysis.filters)), /* @__PURE__ */ react_shim_default.createElement(
        "input",
        {
          type: "text",
          value: s.presetName,
          onChange: (e) => store.setState({ presetName: e.target.value }),
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
