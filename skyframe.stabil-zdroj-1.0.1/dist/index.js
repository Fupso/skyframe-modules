// ../../framesbuild-shim.js
var React = window.React;
var useState = React.useState;
var useEffect = React.useEffect;
var useMemo = React.useMemo;
var useRef = React.useRef;
var useCallback = React.useCallback;
var useSyncExternalStore = React.useSyncExternalStore;
var createElement = React.createElement;
var Fragment = React.Fragment;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
api.registerTool({
  icon: "\u{1F3A5}",
  labelKey: "title",
  fields: [
    { id: "enabled", type: "checkbox", labelKey: "enabled", default: true },
    { id: "rx", type: "slider", labelKey: "rx", min: 16, max: 64, step: 16, unit: "px", default: 32 },
    { id: "ry", type: "slider", labelKey: "ry", min: 16, max: 64, step: 16, unit: "px", default: 32 },
    { id: "blocksize", type: "slider", labelKey: "blocksize", min: 4, max: 32, step: 4, default: 16, hintKey: "blocksize_hint" },
    {
      id: "edge",
      type: "select",
      labelKey: "edge",
      default: "mirror",
      options: [
        { value: "mirror", labelKey: "edge_mirror" },
        { value: "blank", labelKey: "edge_blank" },
        { value: "original", labelKey: "edge_original" },
        { value: "clamp", labelKey: "edge_clamp" }
      ]
    }
  ],
  buildStep(values, ctx) {
    if (!ctx.mediaPath || ctx.kind !== "video") return null;
    if (values.enabled === false) return null;
    const rx = Math.max(16, Math.min(64, Math.round((Number(values.rx) || 16) / 16) * 16));
    const ry = Math.max(16, Math.min(64, Math.round((Number(values.ry) || 16) / 16) * 16));
    const bs = Math.round(Math.max(4, Math.min(32, Number(values.blocksize) || 8)));
    const edgeMap = { blank: 0, original: 1, clamp: 2, mirror: 3 };
    const edge = edgeMap[values.edge] ?? 3;
    const vf = `deshake=rx=${rx}:ry=${ry}:edge=${edge}:blocksize=${bs}`;
    return { label: `\u{1F3A5} ${t("title", "Stabiliz\xE1cia")} \xB1${rx}/${ry}px`, vf };
  }
});
function StabilInfo() {
  return null;
}
export {
  StabilInfo as default
};
