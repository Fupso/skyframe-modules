// ../framesbuild/react-shim.js
var R = window.React;
var useState = R.useState;
var useEffect = R.useEffect;
var useRef = R.useRef;
var useMemo = R.useMemo;
var useCallback = R.useCallback;
var useReducer = R.useReducer;
var useContext = R.useContext;
var createContext = R.createContext;
var Fragment = R.Fragment;
var useSyncExternalStore = R.useSyncExternalStore;
var useLayoutEffect = R.useLayoutEffect;
var forwardRef = R.forwardRef;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var ASPECTS = [
  { value: "orig", labelKey: "aspect_orig" },
  { value: "16:9", labelKey: "aspect_169" },
  { value: "9:16", labelKey: "aspect_916" },
  { value: "1:1", labelKey: "aspect_11" },
  { value: "4:3", labelKey: "aspect_43" },
  { value: "3:4", labelKey: "aspect_34" }
];
function aspectRatio(a) {
  switch (a) {
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "3:4":
      return 3 / 4;
    default:
      return null;
  }
}
function isNeutral(v) {
  return !(Math.abs(Number(v.rotate)) > 0.01) && !(Number(v.zoom) > 1.001) && (v.aspect ?? "orig") === "orig";
}
function buildVf(v) {
  const parts = [];
  const rot = Number(v.rotate) || 0;
  if (Math.abs(rot) > 0.01) {
    parts.push(`rotate=${(rot * Math.PI / 180).toFixed(5)}:fillcolor=black`);
  }
  const zoom = Math.max(1, Number(v.zoom) || 1);
  const r = aspectRatio(v.aspect ?? "orig");
  if (zoom > 1.001 || r !== null) {
    const z = zoom.toFixed(3);
    const w = r !== null ? `min(iw/${z}\\,ih/${z}*${r.toFixed(4)})` : `iw/${z}`;
    const h = r !== null ? `min(ih/${z}\\,iw/${z}/${r.toFixed(4)})` : `ih/${z}`;
    const px = Math.max(-50, Math.min(50, Number(v.posX) || 0)) / 50;
    const py = Math.max(-50, Math.min(50, Number(v.posY) || 0)) / 50;
    const x = `(iw-ow)/2*(1+${px.toFixed(3)})`;
    const y = `(ih-oh)/2*(1+${py.toFixed(3)})`;
    parts.push(`crop=w='${w}':h='${h}':x='${x}':y='${y}'`);
  }
  return parts.join(",");
}
api.registerTool({
  icon: "\u{1F532}",
  labelKey: "title",
  fields: [
    { id: "rotate", type: "slider", labelKey: "rotate", min: -45, max: 45, step: 0.5, unit: "\xB0", default: 0 },
    { id: "zoom", type: "slider", labelKey: "zoom", min: 1, max: 3, step: 0.05, unit: "\xD7", default: 1 },
    { id: "posX", type: "slider", labelKey: "pos_x", min: -50, max: 50, step: 1, unit: "%", default: 0 },
    { id: "posY", type: "slider", labelKey: "pos_y", min: -50, max: 50, step: 1, unit: "%", default: 0 },
    { id: "aspect", type: "select", labelKey: "aspect", default: "orig", options: ASPECTS }
  ],
  buildStep(values, ctx) {
    if (!ctx.mediaPath) return null;
    if (isNeutral(values)) return null;
    const vf = buildVf(values);
    if (!vf) return null;
    const parts = [];
    const rot = Number(values.rotate) || 0;
    if (Math.abs(rot) > 0.01) parts.push(`${rot > 0 ? "+" : ""}${rot}\xB0`);
    if (Number(values.zoom) > 1.001) parts.push(`${Number(values.zoom).toFixed(2)}\xD7`);
    if ((values.aspect ?? "orig") !== "orig") parts.push(values.aspect);
    return { label: `\u{1F532} ${t("title", "Orezanie")} ${parts.join(" \xB7 ")}`, vf };
  }
});
function CropInfo() {
  return null;
}
export {
  CropInfo as default
};
