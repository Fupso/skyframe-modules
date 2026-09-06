var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../framesbuild/react-shim.js
var react_shim_exports = {};
__export(react_shim_exports, {
  Fragment: () => Fragment,
  createContext: () => createContext,
  default: () => react_shim_default,
  forwardRef: () => forwardRef,
  useCallback: () => useCallback,
  useContext: () => useContext,
  useEffect: () => useEffect,
  useLayoutEffect: () => useLayoutEffect,
  useMemo: () => useMemo,
  useReducer: () => useReducer,
  useRef: () => useRef,
  useState: () => useState,
  useSyncExternalStore: () => useSyncExternalStore
});
var useState = useState;
var useEffect = useEffect;
var useRef = useRef;
var useMemo = useMemo;
var useCallback = useCallback;
var useReducer = useReducer;
var useContext = useContext;
var createContext = createContext;
var Fragment = Fragment;
var useSyncExternalStore = useSyncExternalStore;
var useLayoutEffect = useLayoutEffect;
var forwardRef = forwardRef;
var react_shim_default = react_shim_exports;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var tt = (k, f, vars) => {
  let s = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) s = s.replaceAll(`{${kk}}`, String(vv));
  return s;
};
var { useState: useState2 } = react_shim_default;
function CaptureButton({ values, ctx }) {
  const [busy, setBusy] = useState2(false);
  const [msg, setMsg] = useState2("");
  const [err, setErr] = useState2(false);
  async function capture() {
    if (!ctx?.mediaPath || busy) return;
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const p = await api.invoke("export_editor_frame", {
        input: ctx.mediaPath,
        vf: ctx.pipelineVf ?? "",
        timeSec: Number(values?.time) || 0,
        format: values?.format ?? "jpg",
        outputName: null
      });
      setMsg(tt("saved", "\u2705 Ulo\u017Een\xE9: {p}", { p }));
    } catch (e) {
      setErr(true);
      setMsg(tt("failed", "\u274C {e}", { e: String(e) }));
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 10, color: "#a1a1aa" } }, t("hint", "Nastav poz\xEDciu \xFAchytom na \u010Dasovej osi \u2014 video sa presunie na \u0148u. Ulo\u017E\xED sa presne t\xE1 sn\xEDmka, ktor\xFA vid\xED\u0161 (aj s filtrami a strihom).")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => {
        void capture();
      },
      disabled: !ctx?.mediaPath || busy,
      style: {
        padding: "8px 12px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        background: !ctx?.mediaPath || busy ? "#3f3f46" : "#059669",
        color: "#fff",
        border: "none",
        cursor: !ctx?.mediaPath || busy ? "default" : "pointer",
        opacity: !ctx?.mediaPath || busy ? 0.6 : 1
      }
    },
    busy ? t("capturing", "\u23F3 Uklad\xE1m\u2026") : t("capture", "\u{1F4F8} Ulo\u017Ei\u0165 sn\xEDmku")
  ), msg && /* @__PURE__ */ react_shim_default.createElement("div", { style: { fontSize: 11, wordBreak: "break-all", color: err ? "#f87171" : "#34d399" } }, msg));
}
api.registerTool({
  icon: "\u{1F4F8}",
  labelKey: "title",
  fields: [
    { id: "time", type: "time", labelKey: "time", default: 0 },
    {
      id: "format",
      type: "select",
      labelKey: "format",
      default: "jpg",
      options: [
        { value: "jpg", labelKey: "fmt_jpg" },
        { value: "png", labelKey: "fmt_png" }
      ]
    },
    { id: "capture", type: "custom", component: CaptureButton }
  ],
  // nepridáva krok do pipeline — ide o výstupnú akciu, nie úpravu videa
  buildStep: () => null
});
function FramesToolInfo() {
  return null;
}
export {
  FramesToolInfo as default
};
