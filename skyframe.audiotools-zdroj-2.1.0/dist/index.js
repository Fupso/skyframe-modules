// ../../framesbuild/react-shim.js
var React = window.React;
var react_shim_default = React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useReducer = React.useReducer;
var useContext = React.useContext;
var createContext = React.createContext;
var Fragment = React.Fragment;
var useSyncExternalStore = React.useSyncExternalStore;
var useLayoutEffect = React.useLayoutEffect;
var forwardRef = React.forwardRef;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
api.registerTool({
  icon: "\u{1F50A}",
  labelKey: "title",
  fields: [
    { id: "sec_vol", type: "separator", labelKey: "sec_volume" },
    { id: "volume", type: "slider", labelKey: "volume", min: 0, max: 300, step: 1, unit: " %", default: 100 },
    { id: "normalize", type: "checkbox", labelKey: "normalize", default: false },
    { id: "sec_fade", type: "separator", labelKey: "sec_fade" },
    { id: "fadeIn", type: "time", labelKey: "fade_in", min: 0, max: 30, step: 0.5, unit: "s", default: 0 },
    { id: "fadeOut", type: "time", labelKey: "fade_out", min: 0, max: 30, step: 0.5, unit: "s", default: 0, fromEnd: true },
    { id: "sec_sil", type: "separator", labelKey: "sec_silence" },
    { id: "removeSilence", type: "checkbox", labelKey: "remove_silence", default: false }
  ],
  buildStep(values, ctx) {
    if (ctx.kind !== "video") return null;
    const chain = [];
    const labels = [];
    if (values.removeSilence) {
      chain.push("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2");
      chain.push("silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-45dB");
      labels.push(t("lbl_silence", "bez ticha"));
    }
    const vol = Number(values.volume ?? 100);
    if (Math.abs(vol - 100) > 0.01) {
      chain.push(`volume=${(vol / 100).toFixed(4)}`);
      labels.push(`${vol} %`);
    }
    if (values.normalize) {
      chain.push("loudnorm=I=-16:TP=-1.5:LRA=11");
      labels.push(t("lbl_norm", "normaliz\xE1cia"));
    }
    const fi = Number(values.fadeIn) || 0;
    if (fi > 0) {
      chain.push(`afade=t=in:st=0:d=${fi}`);
      labels.push(`fade in ${fi} s`);
    }
    const fo = Number(values.fadeOut) || 0;
    if (fo > 0 && ctx.duration > fo) {
      chain.push(`afade=t=out:st=${(ctx.duration - fo).toFixed(3)}:d=${fo}`);
      labels.push(`fade out ${fo} s`);
    }
    if (chain.length === 0) return null;
    return { label: `\u{1F50A} ${labels.join(", ")}`, af: chain.join(",") };
  }
});
function AudioToolStub() {
  return react_shim_default.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "N\xE1stroj Zvuk n\xE1jde\u0161 v Editore \u2014 v pravom paneli n\xE1strojov.")
  );
}
export {
  AudioToolStub as default
};
