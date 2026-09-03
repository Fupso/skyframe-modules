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

// tool-portret/src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var DEFAULTS = { smooth: 0, brighten: 0, warmth: 0, saturation: 0, sharpen: 0, vignette: 0 };
var PRESETS = [
  { id: "natural", nameKey: "preset_natural", p: { smooth: 25, brighten: 5, warmth: 5, saturation: 5, sharpen: 10, vignette: 0 } },
  { id: "softskin", nameKey: "preset_softskin", p: { smooth: 60, brighten: 10, warmth: 8, saturation: 4, sharpen: 5, vignette: 0 } },
  { id: "golden", nameKey: "preset_golden", p: { smooth: 35, brighten: 8, warmth: 35, saturation: 15, sharpen: 10, vignette: 20 } },
  { id: "studio", nameKey: "preset_studio", p: { smooth: 20, brighten: 15, warmth: 0, saturation: 0, sharpen: 25, vignette: 15 } },
  { id: "bw", nameKey: "preset_bw", p: { smooth: 30, brighten: 8, warmth: 0, saturation: -100, sharpen: 20, vignette: 25 } }
];
var state = { params: { ...DEFAULTS }, media: null };
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
function isNeutral(p) {
  return Object.keys(DEFAULTS).every((k) => p[k] === DEFAULTS[k]);
}
function stepLabel(p) {
  const parts = [];
  if (p.smooth) parts.push(`${t("smooth", "Jemnos\u0165 pleti")} ${p.smooth}`);
  if (p.brighten) parts.push(`+${t("brighten", "Rozjasnenie")} ${p.brighten}`);
  if (p.warmth) parts.push(`${t("warmth", "Teplota")} ${p.warmth > 0 ? "+" : ""}${p.warmth}`);
  if (p.saturation) parts.push(`${t("saturation", "S\xFDtos\u0165")} ${p.saturation > 0 ? "+" : ""}${p.saturation}`);
  if (p.sharpen) parts.push(`${t("sharpen", "Vyostrenie")} ${p.sharpen}`);
  if (p.vignette) parts.push(`${t("vignette", "Vignet\xE1cia")} ${p.vignette}`);
  return `\u{1F9D1} ${parts.join(", ")}`;
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
function ToolPanel() {
  const s = useStore();
  useEffect2(() => {
    if (api.getEditorMedia) store.setState({ media: api.getEditorMedia() });
    if (api.onEditorMedia) {
      return api.onEditorMedia((media) => store.setState({ media }));
    }
  }, []);
  useEffect2(() => {
    if (!api.setEditorStep) return;
    const timer = setTimeout(() => {
      if (!s.media || isNeutral(s.params)) {
        api.setEditorStep(null);
      } else {
        api.setEditorStep({ label: stepLabel(s.params), vf: buildVf(s.params) });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [s.params, s.media]);
  const set = (k) => (v) => store.setState({ params: { ...s.params, [k]: v } });
  if (!s.media) {
    return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 16, fontSize: 12, opacity: 0.7 } }, t("tool_no_media", "V Editore nie je otvoren\xFD \u017Eiadny s\xFAbor."));
  }
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 12 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 } }, t("presets", "Predvo\u013Eby")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 } }, PRESETS.map((pr) => /* @__PURE__ */ react_shim_default.createElement(
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
  ));
}
if (api.registerEditorPanel) {
  api.registerEditorPanel(ToolPanel);
}
function PortretInfo() {
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-full flex items-center justify-center" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-center max-w-sm rounded-2xl border border-border bg-bg-card p-8" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-5xl mb-4" }, "\u{1F9D1}"), /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold mb-2" }, t("title", "Portr\xE9t")), /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-sm text-text-dim" }, t("editor_tool_info", "Tento modul je n\xE1stroj SkyFrame Editora. Otvor Editor (ikona \u{1F39B}\uFE0F v\u013Eavo), nahraj s\xFAbor a tento n\xE1stroj n\xE1jde\u0161 v pravom st\u013Apci."))));
}
var index_default = PortretInfo;
export {
  index_default as default
};
