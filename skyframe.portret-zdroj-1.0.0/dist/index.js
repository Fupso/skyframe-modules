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

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var PHOTO_EXT = ["jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"];
function isPhotoPath(p) {
  if (!p) return false;
  return PHOTO_EXT.includes(p.split(".").pop().toLowerCase());
}
var PICK_FILTERS = [{ name: "Foto", extensions: PHOTO_EXT }];
var DEFAULTS = { smooth: 30, brighten: 5, warmth: 10, saturation: 8, sharpen: 15, vignette: 0 };
var PRESETS = [
  { id: "natural", nameKey: "preset_natural", p: { smooth: 25, brighten: 5, warmth: 5, saturation: 5, sharpen: 10, vignette: 0 } },
  { id: "softskin", nameKey: "preset_softskin", p: { smooth: 60, brighten: 10, warmth: 8, saturation: 4, sharpen: 5, vignette: 0 } },
  { id: "golden", nameKey: "preset_golden", p: { smooth: 35, brighten: 8, warmth: 35, saturation: 15, sharpen: 10, vignette: 20 } },
  { id: "studio", nameKey: "preset_studio", p: { smooth: 20, brighten: 15, warmth: 0, saturation: 0, sharpen: 25, vignette: 15 } },
  { id: "bw", nameKey: "preset_bw", p: { smooth: 30, brighten: 8, warmth: 0, saturation: -100, sharpen: 20, vignette: 25 } }
];
var initialState = {
  photoPath: null,
  photoUrl: "",
  params: { ...DEFAULTS },
  job: null
  // {status:"running"|"done"|"error", message, result}
};
var state = { ...initialState };
var listeners = /* @__PURE__ */ new Set();
var store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...patch };
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
function cssFilter(p) {
  const parts = [];
  if (p.brighten) parts.push(`brightness(${(1 + p.brighten / 100 * 0.35).toFixed(3)})`);
  if (p.saturation) parts.push(`saturate(${(1 + p.saturation / 100).toFixed(3)})`);
  if (p.warmth > 0) parts.push(`sepia(${p.warmth / 100 * 0.35})`);
  if (p.warmth < 0) parts.push(`hue-rotate(${-p.warmth / 100 * 12}deg) saturate(${(1 + -p.warmth / 100 * 0.08).toFixed(3)})`);
  if (p.smooth) parts.push(`blur(${(p.smooth / 100 * 1.2).toFixed(2)}px)`);
  return parts.join(" ") || "none";
}
function buildVf(p) {
  const chain = [];
  if (p.smooth > 0) {
    const lr = (0.5 + p.smooth / 100 * 2).toFixed(2);
    const ls = (-(p.smooth / 100)).toFixed(2);
    chain.push(`smartblur=lr=${lr}:ls=${ls}:lt=0`);
  }
  const br = (p.brighten / 100 * 0.35).toFixed(3);
  const sat = (1 + p.saturation / 100).toFixed(3);
  if (p.brighten !== 0 || p.saturation !== 0) {
    chain.push(`eq=brightness=${br}:saturation=${sat}`);
  }
  if (p.warmth !== 0) {
    const temp = Math.round(6500 - p.warmth * 22);
    chain.push(`colortemperature=temperature=${Math.max(1e3, Math.min(12e3, temp))}`);
  }
  if (p.sharpen > 0) {
    chain.push(`unsharp=5:5:${(p.sharpen / 100 * 1.5).toFixed(2)}`);
  }
  if (p.vignette > 0) {
    chain.push(`vignette=angle=${(p.vignette / 100 * 0.78).toFixed(3)}`);
  }
  return chain.join(",");
}
async function pickPhoto() {
  const f = await api.pickFiles(PICK_FILTERS, false);
  if (f && !Array.isArray(f)) {
    store.setState({ photoPath: f, job: null });
    if (api.setActiveMedia) api.setActiveMedia(f);
  }
}
async function exportPhoto() {
  const s = store.getState();
  if (!s.photoPath || s.job?.status === "running") return;
  const vf = buildVf(s.params);
  store.setState({ job: { status: "running", message: "", result: null } });
  try {
    const result = await api.invoke("filter_image", {
      input: s.photoPath,
      vf: vf || null,
      filterComplex: null,
      outputName: null,
      outputDir: null
    });
    store.setState({ job: { status: "done", message: "", result } });
    if (api.setActiveMedia) api.setActiveMedia(result);
  } catch (e) {
    store.setState({ job: { status: "error", message: String(e), result: null } });
  }
}
function Slider({ label, value, min, max, onChange }) {
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 4 } }, /* @__PURE__ */ react_shim_default.createElement("span", null, label), /* @__PURE__ */ react_shim_default.createElement("span", null, value)), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min,
      max,
      value,
      onChange: (e) => onChange(parseInt(e.target.value, 10)),
      style: { width: "100%" }
    }
  ));
}
function SidePanel() {
  const s = useStore();
  const set = (k) => (v) => store.setState({ params: { ...s.params, [k]: v } });
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 12, overflowY: "auto", height: "100%" } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 } }, t("presets", "Predvo\u013Eby")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 } }, PRESETS.map((pr) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: pr.id,
      className: "px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => store.setState({ params: { ...pr.p } })
    },
    t(pr.nameKey, pr.id)
  ))), /* @__PURE__ */ react_shim_default.createElement(Slider, { label: `\u2728 ${t("smooth", "Jemnos\u0165 pleti")}`, value: s.params.smooth, min: 0, max: 100, onChange: set("smooth") }), /* @__PURE__ */ react_shim_default.createElement(Slider, { label: `\u{1F4A1} ${t("brighten", "Rozjasnenie")}`, value: s.params.brighten, min: 0, max: 100, onChange: set("brighten") }), /* @__PURE__ */ react_shim_default.createElement(Slider, { label: `\u{1F321}\uFE0F ${t("warmth", "Teplota")}`, value: s.params.warmth, min: -100, max: 100, onChange: set("warmth") }), /* @__PURE__ */ react_shim_default.createElement(Slider, { label: `\u{1F3A8} ${t("saturation", "S\xFDtos\u0165")}`, value: s.params.saturation, min: -100, max: 100, onChange: set("saturation") }), /* @__PURE__ */ react_shim_default.createElement(Slider, { label: `\u{1F50D} ${t("sharpen", "Vyostrenie")}`, value: s.params.sharpen, min: 0, max: 100, onChange: set("sharpen") }), /* @__PURE__ */ react_shim_default.createElement(Slider, { label: `\u{1F311} ${t("vignette", "Vignet\xE1cia")}`, value: s.params.vignette, min: 0, max: 100, onChange: set("vignette") }), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "w-full mt-1 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => store.setState({ params: { ...DEFAULTS } })
    },
    "\u21A9\uFE0F ",
    t("reset", "Obnovi\u0165 predvolen\xE9")
  ), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "w-full mt-3 px-3 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50",
      disabled: !s.photoPath || s.job?.status === "running",
      onClick: () => void exportPhoto()
    },
    s.job?.status === "running" ? `\u23F3 ${t("exporting", "Exportujem\u2026")}` : `\u{1F4BE} ${t("export_photo", "Exportova\u0165 fotku")}`
  ), s.job?.status === "done" && s.job.result && /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginTop: 10, fontSize: 12, color: "#34d399", wordBreak: "break-all" } }, "\u2705 ", s.job.result), s.job?.status === "error" && /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginTop: 10, fontSize: 12, color: "#f87171", wordBreak: "break-all" } }, "\u274C ", s.job.message));
}
function Portret() {
  const s = useStore();
  useEffect2(() => {
    if (api.getActiveMedia) {
      const active = api.getActiveMedia();
      if (active && isPhotoPath(active)) store.setState({ photoPath: active });
    }
    if (api.onActiveMedia) {
      return api.onActiveMedia((path) => {
        if (path && isPhotoPath(path)) store.setState({ photoPath: path, job: null });
      });
    }
  }, []);
  useEffect2(() => {
    if (!s.photoPath) {
      if (store.getState().photoUrl) store.setState({ photoUrl: "" });
      return;
    }
    let dead = false;
    (async () => {
      try {
        const bytes = await api.invoke("video_thumbnail", { path: s.photoPath, atSeconds: 0, maxWidth: 1920 });
        if (dead) return;
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
        store.setState({ photoUrl: url });
      } catch (e) {
        if (!dead) store.setState({ job: { status: "error", message: String(e), result: null } });
      }
    })();
    return () => {
      dead = true;
    };
  }, [s.photoPath]);
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", background: "#111" } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" } }, s.photoUrl ? /* @__PURE__ */ react_shim_default.createElement(
    "img",
    {
      src: s.photoUrl,
      alt: "",
      draggable: false,
      style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: cssFilter(s.params) }
    }
  ) : /* @__PURE__ */ react_shim_default.createElement("div", { style: { textAlign: "center", opacity: 0.7 } }, /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 14, marginBottom: 12 } }, t("no_photo", "\u017Diadna fotka \u2014 pridaj fotku, alebo ju najprv otvor vo Filtroch a prepni sem.")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "px-4 py-2 text-sm rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => void pickPhoto()
    },
    "\u{1F4C1} ",
    t("pick_file", "Prida\u0165 fotku")
  ))), s.photoPath && /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: "6px 12px", fontSize: 11, opacity: 0.6, display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ react_shim_default.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.photoPath), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-xs underline", onClick: () => void pickPhoto() }, "\u{1F504} ", t("change_file", "In\xE1 fotka"))));
}
if (api.registerToolbar) {
  api.registerToolbar([
    { id: "open", icon: "\u{1F4C2}", labelKey: "tool_open", onClick: () => void pickPhoto() },
    { id: "export", icon: "\u{1F4BE}", labelKey: "tool_export", onClick: () => void exportPhoto() }
  ]);
}
if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}
var index_default = Portret;
export {
  index_default as default
};
