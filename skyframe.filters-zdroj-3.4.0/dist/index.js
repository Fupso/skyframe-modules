// ../../merger-build/react-shim.js
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
function mkStyle(r, g, b, brightness, contrast, saturate) {
  return {
    channels: { r: { slope: 1, intercept: r }, g: { slope: 1, intercept: g }, b: { slope: 1, intercept: b } },
    css: { brightness, contrast, saturate }
  };
}
function builtin(id, r, g, b, br, ct, st) {
  return { id: `builtin_${id}`, nameKey: `style_${id}`, style: mkStyle(r, g, b, br, ct, st), builtin: true };
}
var BUILTIN_PRESETS = [
  builtin("sunset", 0.14, -0.02, -0.08, 104, 106, 122),
  builtin("cinematic", 0.06, -0.02, 0.05, 100, 118, 108),
  builtin("cold_blue", -0.1, 0, 0.12, 100, 104, 110),
  builtin("forest", -0.04, 0.1, -0.04, 99, 108, 116),
  builtin("noir", 0, 0, 0, 100, 122, 0),
  builtin("sepia", 0.12, 0.03, -0.1, 102, 100, 88),
  builtin("pink_clouds", 0.15, -0.04, 0.07, 103, 102, 112),
  builtin("summer", 0.04, 0.02, -0.02, 108, 104, 126),
  builtin("winter_fog", 0, 0.01, 0.04, 107, 92, 82),
  builtin("drama", 0, 0, 0, 97, 128, 118),
  builtin("golden", 0.16, 0.04, -0.12, 104, 106, 116),
  builtin("blue_hour", -0.08, -0.02, 0.14, 96, 110, 108),
  builtin("vintage", 0.09, 0.03, -0.07, 105, 92, 90),
  builtin("cyberpunk", 0.1, -0.08, 0.12, 99, 114, 124),
  builtin("emerald", -0.06, 0.1, 0.06, 100, 108, 114),
  builtin("pastel", 0.02, 0.02, 0.02, 107, 94, 78),
  builtin("contrast", 0, 0, 0, 100, 134, 104),
  builtin("fade", 0.03, 0.03, 0.03, 106, 88, 92),
  builtin("portrait", 0.07, 0, -0.03, 102, 103, 110),
  builtin("arctic", -0.06, 0.02, 0.12, 104, 106, 100)
];
var initialState = {
  media: null,
  // {path, kind} z editora
  activeStyle: null,
  // {channels, css}
  activePresetId: null,
  intensity: 80,
  skyOnly: false,
  aiMask: false,
  aiStatus: null,
  // {licensed, runtimeInstalled, modelInstalled} | null
  maskPath: "",
  // cesta k AI maske pre aktuálne médium
  maskFor: "",
  // pre ktoré médium je maska
  maskLoading: false,
  maskProgress: -1,
  // progres výpočtu AI masky videa (-1 = nič)
  presets: [],
  // používateľské štýly z configu
  baseThumb: null,
  // HTMLImageElement ukážkovej fotky
  thumbs: {},
  // presetId -> dataURL miniatúry s filtrom
  photoBusy: false,
  // prebieha analýza fotky
  openCustom: true,
  // rozbalená sekcia vlastných filtrov
  openBuiltin: false,
  // rozbalená sekcia vstavaných filtrov
  curves: null,
  // [[x,y],...] | null (master krivka)
  wheels: { s: [0, 0], m: [0, 0], h: [0, 0] },
  // tieň/stredy/svetlá [dx,dy]
  openGrade: false
  // rozbalená sekcia kriviek a koliesok
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
function scaledStyle(style, intensity) {
  const k = Math.max(0, Math.min(100, intensity)) / 100;
  const ch = (c) => ({ slope: 1, intercept: c.intercept * k });
  return {
    channels: { r: ch(style.channels.r), g: ch(style.channels.g), b: ch(style.channels.b) },
    css: {
      brightness: 100 + (style.css.brightness - 100) * k,
      contrast: 100 + (style.css.contrast - 100) * k,
      saturate: 100 + (style.css.saturate - 100) * k
    }
  };
}
function evalCurve(points, x) {
  if (!points || points.length < 2) return x;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  let i = 0;
  while (i < points.length - 2 && points[i + 1][0] < x) i++;
  const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
  const t2 = (x - p1[0]) / Math.max(1e-6, p2[0] - p1[0]);
  const t22 = t2 * t2, t3 = t22 * t2;
  const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t2 + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t22 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  return Math.max(0, Math.min(1, y));
}
function wheelToRgb(off) {
  const [dx, dy] = off;
  const a = Math.min(1, Math.hypot(dx, dy)) * 0.55;
  if (a < 0.01) return [0, 0, 0];
  const th = Math.atan2(dy, dx);
  const cl = (v) => Math.max(-1, Math.min(1, v));
  return [
    cl(a * Math.cos(th)),
    cl(a * Math.cos(th - 2 * Math.PI / 3)),
    cl(a * Math.cos(th + 2 * Math.PI / 3))
  ];
}
function buildChannelLuts(style, intensity, curves, wheels) {
  const s = style ? scaledStyle(style, intensity) : mkStyle(0, 0, 0, 100, 100, 100);
  const off = [s.channels.r.intercept, s.channels.g.intercept, s.channels.b.intercept];
  const bright = (s.css.brightness - 100) / 100 * 0.5;
  const cont = s.css.contrast / 100;
  const wS = wheels ? wheelToRgb(wheels.s || [0, 0]) : [0, 0, 0];
  const wM = wheels ? wheelToRgb(wheels.m || [0, 0]) : [0, 0, 0];
  const wH = wheels ? wheelToRgb(wheels.h || [0, 0]) : [0, 0, 0];
  const hasC = curves && curves.length >= 3;
  const luts = [[], [], []];
  for (let v = 0; v < 256; v++) {
    const x0 = v / 255;
    for (let c = 0; c < 3; c++) {
      let x = x0 + off[c] + bright;
      x = (x - 0.5) * cont + 0.5;
      const cl0 = Math.max(0, Math.min(1, x));
      const sW = Math.max(0, 1 - cl0 * 2);
      const mW = Math.max(0, 1 - Math.abs(cl0 - 0.5) * 2);
      const hW = Math.max(0, cl0 * 2 - 1);
      x += 0.5 * (wS[c] * sW + wM[c] * mW + wH[c] * hW);
      x = Math.max(0, Math.min(1, x));
      if (hasC) x = evalCurve(curves, x);
      luts[c].push(Math.max(0, Math.min(1, x)));
    }
  }
  return { luts, saturate: Math.max(0, s.css.saturate / 100) };
}
function isIdentityLut(lut) {
  for (let v = 0; v < 256; v += 8) if (Math.abs(lut[v] - v / 255) > 4e-3) return false;
  return true;
}
function computeLiveSpec(style, intensity, curves, wheels) {
  const { luts, saturate } = buildChannelLuts(style, intensity, curves, wheels);
  return {
    r: luts[0].map((v) => v.toFixed(3)).join(" "),
    g: luts[1].map((v) => v.toFixed(3)).join(" "),
    b: luts[2].map((v) => v.toFixed(3)).join(" "),
    saturate
  };
}
function wheelsActive(wheels) {
  if (!wheels) return false;
  return ["s", "m", "h"].some((k) => {
    const [dx, dy] = wheels[k] || [0, 0];
    return Math.hypot(dx, dy) * 0.55 >= 0.01;
  });
}
function buildChain(style, intensity, curves, wheels) {
  const { luts, saturate } = buildChannelLuts(style, intensity, curves, wheels);
  const parts = [];
  const allIdentity = luts.every(isIdentityLut);
  if (!allIdentity) {
    const N = 33;
    const names = ["r", "g", "b"];
    const chans = luts.map((lut) => {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const x = i / (N - 1);
        const y = lut[Math.round(x * 255)];
        pts.push(`${x.toFixed(3)}/${y.toFixed(3)}`);
      }
      return pts.join(" ");
    });
    parts.push(`curves=r='${chans[0]}':g='${chans[1]}':b='${chans[2]}'`);
  }
  if (Math.abs(saturate - 1) > 5e-3) parts.push(`eq=saturation=${saturate.toFixed(3)}`);
  return parts.join(",");
}
function skyGraphLuma(chain) {
  return `[IN]split=3[base][t][mm];[t]${chain}[tinted];[mm]format=gray,curves=all='0/0 0.55/0 0.75/1 1/1'[mask];[tinted][mask]alphamerge[ta];[base][ta]overlay[OUT]`;
}
function skyGraphAi(chain) {
  return `[IN]split=2[base][t];[t]${chain}[tinted];[I0][tinted]scale2ref[mask][ti];[ti][mask]alphamerge[ta];[base][ta]overlay[OUT]`;
}
function presetName(p) {
  return p.nameKey ? t(p.nameKey, p.id) : p.name || p.id;
}
var THUMB_W = 300;
var THUMB_H = 200;
function applyStyleToPixels(data, style, curves, wheels) {
  const { luts, saturate: sat } = buildChannelLuts(style, 100, curves, wheels);
  for (let i = 0; i < data.length; i += 4) {
    let r = luts[0][data[i]] * 255;
    let g = luts[1][data[i + 1]] * 255;
    let b = luts[2][data[i + 2]] * 255;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;
    data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}
function makeThumb(baseImg, style, curves, wheels) {
  const cv = document.createElement("canvas");
  cv.width = THUMB_W;
  cv.height = THUMB_H;
  const ctx = cv.getContext("2d");
  const ir = baseImg.width / baseImg.height, tr = THUMB_W / THUMB_H;
  let sw = baseImg.width, sh = baseImg.height, sx = 0, sy = 0;
  if (ir > tr) {
    sw = baseImg.height * tr;
    sx = (baseImg.width - sw) / 2;
  } else {
    sh = baseImg.width / tr;
    sy = (baseImg.height - sh) / 2;
  }
  ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, THUMB_W, THUMB_H);
  const id = ctx.getImageData(0, 0, THUMB_W, THUMB_H);
  applyStyleToPixels(id.data, style, curves, wheels);
  ctx.putImageData(id, 0, 0);
  return cv.toDataURL("image/jpeg", 0.82);
}
async function loadImageFromPath(path) {
  const url = api.fileSrc ? api.fileSrc(path) : path;
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
function analyzePhotoStyle(img) {
  const S = 128;
  const cv = document.createElement("canvas");
  const k = Math.min(1, S / Math.max(img.width, img.height));
  cv.width = Math.max(8, Math.round(img.width * k));
  cv.height = Math.max(8, Math.round(img.height * k));
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let sr = 0, sg = 0, sb = 0, n = d.length / 4;
  let srg = 0, syb = 0, srg2 = 0, syb2 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    sr += r;
    sg += g;
    sb += b;
    const rg = r - g, yb = 0.5 * (r + g) - b;
    srg += rg;
    syb += yb;
    srg2 += rg * rg;
    syb2 += yb * yb;
  }
  const mr = sr / n, mg = sg / n, mb = sb / n;
  const luma = (0.299 * mr + 0.587 * mg + 0.114 * mb) / 255;
  const mrg = srg / n, myb = syb / n;
  const vrg = srg2 / n - mrg * mrg, vyb = syb2 / n - myb * myb;
  const cf = Math.sqrt(Math.max(0, vrg) + Math.max(0, vyb)) + 0.3 * Math.sqrt(mrg * mrg + myb * myb);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const SOFT = 0.55;
  const style = mkStyle(
    cl((mr / 255 - 0.5) * SOFT, -0.18, 0.18),
    cl((mg / 255 - 0.5) * SOFT, -0.18, 0.18),
    cl((mb / 255 - 0.5) * SOFT, -0.18, 0.18),
    Math.round(cl(100 + (luma - 0.45) * 45, 90, 114)),
    106,
    Math.round(cl(88 + (cf - 18) * 1.6, 85, 135))
  );
  return style;
}
async function savePresets(presets) {
  try {
    await api.invoke("set_module_config", { id: api.moduleId, config: { presets } });
  } catch (e) {
    console.error("[filtre] ukladanie \u0161t\xFDlov:", e);
  }
}
function Section({ title, open, onToggle, count, children }) {
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: onToggle,
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        textTransform: "uppercase",
        opacity: 0.75,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 0",
        color: "inherit"
      }
    },
    /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "inline-block", transition: "transform 120ms", transform: open ? "rotate(90deg)" : "none" } }, "\u25B6"),
    /* @__PURE__ */ react_shim_default.createElement("span", null, title),
    /* @__PURE__ */ react_shim_default.createElement("span", { style: { opacity: 0.6 } }, "(", count, ")")
  ), open && children);
}
var CURVE_W = 232;
var CURVE_H = 150;
function CurveEditor({ points, onChange, onLive }) {
  const ref = react_shim_default.useRef(null);
  const drag = react_shim_default.useRef(-1);
  const [local, setLocal] = useState2(null);
  const shown = local || points;
  const draw = (cv, pts) => {
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, CURVE_W, CURVE_H);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, CURVE_W, CURVE_H);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(CURVE_W / 4 * i, 0);
      ctx.lineTo(CURVE_W / 4 * i, CURVE_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, CURVE_H / 4 * i);
      ctx.lineTo(CURVE_W, CURVE_H / 4 * i);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, CURVE_H);
    ctx.lineTo(CURVE_W, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= CURVE_W; px += 2) {
      const y = evalCurve(pts, px / CURVE_W);
      const py = CURVE_H - y * CURVE_H;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    for (const [x, y] of pts) {
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x * CURVE_W, CURVE_H - y * CURVE_H, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };
  react_shim_default.useEffect(() => {
    if (ref.current) draw(ref.current, shown);
  }, [shown]);
  const toXY = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    return [x, y];
  };
  const nearest = (x, y) => {
    let best = -1, bd = 0.06;
    shown.forEach(([px, py], i) => {
      const d = Math.hypot(px - x, py - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const onDown = (e) => {
    const [x, y] = toXY(e);
    const hit = nearest(x, y);
    if (hit >= 0) {
      drag.current = hit;
    } else {
      const pts = [...shown, [x, y]].sort((a, b) => a[0] - b[0]);
      drag.current = pts.findIndex((pt) => pt[0] === x && pt[1] === y);
      setLocal(pts);
      onLive?.(pts);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (drag.current < 0) return;
    let [x, y] = toXY(e);
    const pts = shown.map((pt) => [...pt]);
    const i = drag.current;
    if (i === 0) x = pts[0][0];
    if (i === pts.length - 1) x = pts[pts.length - 1][0];
    const minX = i > 0 ? pts[i - 1][0] + 0.02 : 0;
    const maxX = i < pts.length - 1 ? pts[i + 1][0] - 0.02 : 1;
    x = Math.max(minX, Math.min(maxX, x));
    pts[i] = [x, y];
    setLocal(pts);
    onLive?.(pts);
  };
  const onUp = () => {
    if (drag.current >= 0 && local) onChange(local);
    drag.current = -1;
    setLocal(null);
  };
  const onDbl = (e) => {
    const [x, y] = toXY(e);
    const hit = nearest(x, y);
    if (hit > 0 && hit < shown.length - 1 && shown.length > 3) {
      onChange(shown.filter((_, i) => i !== hit));
    }
  };
  return /* @__PURE__ */ react_shim_default.createElement(
    "canvas",
    {
      ref,
      width: CURVE_W,
      height: CURVE_H,
      style: { width: "100%", borderRadius: 8, cursor: "crosshair", touchAction: "none" },
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onDoubleClick: onDbl
    }
  );
}
var WHEEL_R = 48;
function Wheel({ value, onChange, label, onLive }) {
  const ref = react_shim_default.useRef(null);
  const dragging = react_shim_default.useRef(false);
  const [local, setLocal] = useState2(null);
  const shown = local || value;
  const draw = (cv, [dx, dy]) => {
    const S2 = WHEEL_R * 2 + 8;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, S2, S2);
    const cx = S2 / 2, cy = S2 / 2;
    const grad = ctx.createConicGradient ? ctx.createConicGradient(0, cx, cy) : null;
    if (grad) {
      for (let i = 0; i <= 360; i += 60) grad.addColorStop(i / 360, `hsl(${i}, 70%, 45%)`);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
    }
    ctx.beginPath();
    ctx.arc(cx, cy, WHEEL_R, 0, Math.PI * 2);
    ctx.fill();
    const rad = ctx.createRadialGradient(cx, cy, 2, cx, cy, WHEEL_R);
    rad.addColorStop(0, "rgba(20,20,24,0.85)");
    rad.addColorStop(1, "rgba(20,20,24,0.15)");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(cx, cy, WHEEL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + dx * (WHEEL_R - 7), cy + dy * (WHEEL_R - 7), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  react_shim_default.useEffect(() => {
    if (ref.current) draw(ref.current, shown);
  }, [shown]);
  const set = (e) => {
    const r = ref.current.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 7);
    let dy = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 7);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    const v = [Math.round(dx * 50) / 50, Math.round(dy * 50) / 50];
    if (dragging.current) {
      setLocal(v);
      onLive?.(v);
    } else {
      onChange(v);
    }
  };
  const S = WHEEL_R * 2 + 8;
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 } }, /* @__PURE__ */ react_shim_default.createElement(
    "canvas",
    {
      ref,
      width: S,
      height: S,
      style: { cursor: "crosshair", touchAction: "none" },
      onPointerDown: (e) => {
        dragging.current = true;
        set(e);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e) => {
        if (dragging.current) set(e);
      },
      onPointerUp: () => {
        dragging.current = false;
        if (local) onChange(local);
        setLocal(null);
      },
      onDoubleClick: () => onChange([0, 0])
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 10, opacity: 0.7 } }, label));
}
function ToolPanel() {
  const s = useStore();
  const sendLive = (curves, wheels) => {
    if (!api.setEditorLiveFilter) return;
    const st = store.getState();
    api.setEditorLiveFilter(computeLiveSpec(st.activeStyle, st.intensity, curves ?? st.curves, wheels ?? st.wheels));
  };
  useEffect2(() => {
    return () => api.setEditorLiveFilter?.(null);
  }, []);
  useEffect2(() => {
    if (api.getEditorMedia) store.setState({ media: api.getEditorMedia() });
    if (api.onEditorMedia) {
      return api.onEditorMedia((media) => store.setState({ media }));
    }
  }, []);
  useEffect2(() => {
    (async () => {
      try {
        const st = await api.invoke("ai_status", {});
        store.setState({ aiStatus: st });
      } catch {
        store.setState({ aiStatus: null });
      }
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        if (Array.isArray(cfg?.presets)) {
          store.setState({ presets: cfg.presets.filter((p) => p && p.style && p.style.channels) });
        }
      } catch {
      }
      if (api.readModuleFile) {
        try {
          const bytes = await api.readModuleFile("assets/preview-base.jpg");
          const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
          const img = await new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = rej;
            im.src = url;
          });
          store.setState({ baseThumb: img });
        } catch {
        }
      }
    })();
  }, []);
  useEffect2(() => {
    if (!s.baseThumb) return;
    const all = [...BUILTIN_PRESETS, ...s.presets];
    const missing = all.filter((p) => !s.thumbs[p.id]);
    if (!missing.length) return;
    const next = { ...s.thumbs };
    for (const p of missing) {
      try {
        next[p.id] = makeThumb(s.baseThumb, p.style, p.curves || null, p.wheels || null);
      } catch {
      }
    }
    store.setState({ thumbs: next });
  }, [s.baseThumb, s.presets]);
  useEffect2(() => {
    if (!s.aiMask || !s.media || s.media.kind !== "photo") return;
    if (s.maskFor === s.media.path && s.maskPath) return;
    let dead = false;
    store.setState({ maskLoading: true });
    (async () => {
      try {
        const path = await api.invoke("ai_sky_mask_file", { input: s.media.path });
        if (!dead) store.setState({ maskPath: path, maskFor: s.media.path, maskLoading: false });
      } catch (e) {
        if (!dead) store.setState({ maskLoading: false, maskPath: "", maskFor: "" });
        console.error("[filtre] ai maska:", e);
      }
    })();
    return () => {
      dead = true;
    };
  }, [s.aiMask, s.media, s.maskFor, s.maskPath]);
  useEffect2(() => {
    if (!api.setEditorStep) return;
    const timer = setTimeout(() => {
      const st = store.getState();
      const chain = st.activeStyle || st.curves || wheelsActive(st.wheels) ? buildChain(st.activeStyle, st.intensity, st.curves, st.wheels) : "";
      if (!st.media || !chain) {
        api.setEditorStep(null);
        return;
      }
      const name = st.activePresetId ? presetName({ id: st.activePresetId, nameKey: st.activePresetId.startsWith("builtin_") ? `style_${st.activePresetId.slice(8)}` : void 0, name: st.activePresetName }) : t("grade_only", "Farebn\xE1 \xFAprava");
      const extras = `${st.curves ? " \xB7 krivky" : ""}${wheelsActive(st.wheels) ? " \xB7 kolieska" : ""}`;
      const label = `\u{1F3A8} ${name}${st.activeStyle ? ` ${st.intensity}%` : ""}${st.skyOnly ? st.aiMask ? " \xB7 AI obloha" : " \xB7 obloha" : ""}${extras}`;
      if (!st.skyOnly) {
        api.setEditorStep({ label, vf: chain });
      } else if (!st.aiMask) {
        api.setEditorStep({ label, graph: skyGraphLuma(chain) });
      } else if (st.maskPath && st.maskFor === st.media.path) {
        api.setEditorStep({ label, graph: skyGraphAi(chain), inputs: [st.maskPath] });
      } else {
        api.setEditorStep(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [s.activeStyle, s.intensity, s.skyOnly, s.aiMask, s.media, s.maskPath, s.maskFor, s.curves, s.wheels]);
  const pick = (p) => {
    if (s.activePresetId === p.id) {
      store.setState({ activeStyle: null, activePresetId: null, activePresetName: null, curves: null, wheels: { s: [0, 0], m: [0, 0], h: [0, 0] } });
    } else {
      store.setState({
        activeStyle: p.style,
        activePresetId: p.id,
        activePresetName: p.name || null,
        curves: p.curves ? p.curves.map((pt) => [...pt]) : null,
        wheels: p.wheels ? { s: [...p.wheels.s || [0, 0]], m: [...p.wheels.m || [0, 0]], h: [...p.wheels.h || [0, 0]] } : { s: [0, 0], m: [0, 0], h: [0, 0] }
      });
    }
  };
  const addFromPhoto = async () => {
    if (s.photoBusy || !api.pickFiles) return;
    const picked = await api.pickFiles(
      [{ name: t("photos", "Fotky"), extensions: ["jpg", "jpeg", "png", "webp", "bmp"] }],
      false
    );
    const path = Array.isArray(picked) ? picked[0] : picked;
    if (!path) return;
    store.setState({ photoBusy: true });
    try {
      const img = await loadImageFromPath(path);
      const style = analyzePhotoStyle(img);
      const st = store.getState();
      const id = `custom_${Date.now()}`;
      const name = `${t("custom_prefix", "Z fotky")} ${st.presets.length + 1}`;
      const photoPath = path;
      const thumb = makeThumb(st.baseThumb || img, style);
      const presets = [...st.presets, { id, name, style, photoPath }];
      store.setState({ presets, thumbs: { ...st.thumbs, [id]: thumb }, openCustom: true });
      savePresets(presets);
    } catch (e) {
      console.error("[filtre] filter z fotky:", e);
    } finally {
      store.setState({ photoBusy: false });
    }
  };
  const removePreset = (id) => {
    const presets = store.getState().presets.filter((p) => p.id !== id);
    const patch = { presets };
    if (s.activePresetId === id) {
      patch.activeStyle = null;
      patch.activePresetId = null;
      patch.activePresetName = null;
    }
    store.setState(patch);
    savePresets(presets);
  };
  const ai = s.aiStatus;
  const card = (p) => {
    const active = s.activePresetId === p.id;
    const thumb = s.thumbs[p.id];
    return /* @__PURE__ */ react_shim_default.createElement("div", { key: p.id, style: { position: "relative" } }, /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick: () => pick(p),
        style: {
          width: "100%",
          border: active ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: 4,
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          textAlign: "center"
        }
      },
      thumb ? /* @__PURE__ */ react_shim_default.createElement(
        "img",
        {
          src: thumb,
          alt: presetName(p),
          draggable: false,
          style: { width: "100%", aspectRatio: "3/2", objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 4 }
        }
      ) : /* @__PURE__ */ react_shim_default.createElement("div", { style: { width: "100%", aspectRatio: "3/2", borderRadius: 6, marginBottom: 4, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.4 } }, "\u2026"),
      /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 11 } }, presetName(p))
    ), !p.builtin && /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick: () => removePreset(p.id),
        title: t("delete_preset", "Zmaza\u0165 filter"),
        style: {
          position: "absolute",
          top: 6,
          right: 6,
          width: 20,
          height: 20,
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 11,
          lineHeight: 1
        }
      },
      "\u2715"
    ));
  };
  return /* @__PURE__ */ react_shim_default.createElement("div", { style: { padding: 12, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } }, !s.media && /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 12, opacity: 0.7, marginBottom: 12 } }, t("tool_no_media", "V Editore nie je otvoren\xFD \u017Eiadny s\xFAbor.")), /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 4 } }, /* @__PURE__ */ react_shim_default.createElement("span", null, t("intensity", "Intenzita")), /* @__PURE__ */ react_shim_default.createElement("span", null, s.intensity, " %")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: 0,
      max: 100,
      value: s.intensity,
      onChange: (e) => store.setState({ intensity: parseInt(e.target.value, 10) }),
      style: { width: "100%" }
    }
  )), /* @__PURE__ */ react_shim_default.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8, cursor: "pointer" } }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.skyOnly,
      onChange: (e) => store.setState({ skyOnly: e.target.checked })
    }
  ), "\u2601\uFE0F ", t("sky_only", "Len svetl\xE9 partie (obloha)")), s.skyOnly && /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginLeft: 4, marginBottom: 8 } }, /* @__PURE__ */ react_shim_default.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" } }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.aiMask,
      disabled: !ai?.licensed,
      onChange: (e) => store.setState({ aiMask: e.target.checked })
    }
  ), "\u{1F916} ", t("ai_mask", "AI maska (presnej\u0161ia)")), s.aiMask && s.media?.kind === "video" && s.maskFor === s.media.path && s.maskPath ? /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 11, opacity: 0.7, marginTop: 6 } }, "\u2713 ", t("ai_video_ready", "AI maska videa je pripraven\xE1 (cache).")) : s.aiMask && s.media?.kind === "video" ? /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginTop: 6 } }, s.maskLoading ? /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 11, opacity: 0.8 } }, "\u23F3 ", t("mask_loading", "Po\u010D\xEDtam AI masku\u2026"), " ", s.maskProgress >= 0 ? `${Math.round(s.maskProgress)} %` : "") : /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: async () => {
        const media = s.media;
        if (!media) return;
        store.setState({ maskLoading: true, maskProgress: 0 });
        try {
          const jobId = await api.invoke("ai_sky_maskvideo_file", { input: media.path, maskFps: 3, moduleId: api.moduleId });
          await new Promise((resolve) => {
            let un;
            api.listenJob(jobId, (job) => {
              store.setState({ maskProgress: job.progress ?? -1 });
              if (job.status !== "running") {
                un?.();
                resolve(job);
              }
            }).then((u) => {
              un = u;
            });
          }).then((job) => {
            if (job.status === "done" && job.result) {
              store.setState({ maskPath: job.result, maskFor: media.path, maskLoading: false, maskProgress: -1 });
            } else {
              store.setState({ maskLoading: false, maskProgress: -1 });
              if (job.status === "error") console.error("[filtre] ai maska videa:", job.message);
            }
          });
        } catch (e) {
          store.setState({ maskLoading: false, maskProgress: -1 });
          console.error("[filtre] ai maska videa:", e);
        }
      }
    },
    "\u{1F916} ",
    t("ai_video_prepare", "Pripravi\u0165 AI masku videa")
  ), /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 10, opacity: 0.55, marginTop: 4 } }, t("ai_video_hint", "AI prebehne ka\u017Ed\xFA 3. sn\xEDmku, v\xFDsledok sa cachuje \u2014 druh\xFDkr\xE1t je okam\u017Eit\xFD."))) : null, s.aiMask && s.maskLoading && /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 11, opacity: 0.7, marginTop: 6 } }, "\u23F3 ", t("mask_loading", "Po\u010D\xEDtam AI masku\u2026")), !ai?.licensed && /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 11, opacity: 0.7, marginTop: 6 } }, "\u{1F512} ", t("ai_locked", "AI maska vy\u017Eaduje AI licenciu \u2014 aktivuj ju v AI centre."))), /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ openGrade: !s.openGrade }),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        textTransform: "uppercase",
        opacity: 0.75,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 0",
        color: "inherit"
      }
    },
    /* @__PURE__ */ react_shim_default.createElement("span", { style: { display: "inline-block", transition: "transform 120ms", transform: s.openGrade ? "rotate(90deg)" : "none" } }, "\u25B6"),
    /* @__PURE__ */ react_shim_default.createElement("span", null, t("grade_section", "Krivky a farby"))
  ), s.openGrade && /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginTop: 6, display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ react_shim_default.createElement(
    CurveEditor,
    {
      points: s.curves || [[0, 0], [1, 1]],
      onLive: (pts) => sendLive(pts, void 0),
      onChange: (pts) => {
        const identity = pts.length === 2 && Math.abs(pts[0][1] - pts[0][0]) < 0.01 && Math.abs(pts[1][1] - pts[1][0]) < 0.01;
        store.setState({ curves: identity ? null : pts });
      }
    }
  ), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "px-2 py-1 text-[11px] rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => store.setState({ curves: null })
    },
    "\u21BA ",
    t("curve_reset", "Reset krivky")
  ), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 10, opacity: 0.5, alignSelf: "center" } }, t("curve_hint", "klik = bod \xB7 dvojklik = zmaza\u0165"))), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "flex", justifyContent: "space-around" } }, /* @__PURE__ */ react_shim_default.createElement(Wheel, { label: t("wheel_shadows", "Tiene"), value: s.wheels.s, onLive: (v) => sendLive(void 0, { ...s.wheels, s: v }), onChange: (v) => store.setState({ wheels: { ...s.wheels, s: v } }) }), /* @__PURE__ */ react_shim_default.createElement(Wheel, { label: t("wheel_midtones", "Stredy"), value: s.wheels.m, onLive: (v) => sendLive(void 0, { ...s.wheels, m: v }), onChange: (v) => store.setState({ wheels: { ...s.wheels, m: v } }) }), /* @__PURE__ */ react_shim_default.createElement(Wheel, { label: t("wheel_highlights", "Svetl\xE1"), value: s.wheels.h, onLive: (v) => sendLive(void 0, { ...s.wheels, h: v }), onChange: (v) => store.setState({ wheels: { ...s.wheels, h: v } }) })), /* @__PURE__ */ react_shim_default.createElement("span", { style: { fontSize: 10, opacity: 0.5, textAlign: "center" } }, t("wheel_hint", "\u0165ahaj bodku \xB7 dvojklik = reset kolieska")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "w-full px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => {
        const st = store.getState();
        if (!st.curves && !wheelsActive(st.wheels) && !st.activeStyle) return;
        const id = `custom_${Date.now()}`;
        const name = `${t("custom_grade_prefix", "\xDAprava")} ${st.presets.length + 1}`;
        const preset = {
          id,
          name,
          style: st.activeStyle || mkStyle(0, 0, 0, 100, 100, 100),
          curves: st.curves ? st.curves.map((pt) => [...pt]) : void 0,
          wheels: wheelsActive(st.wheels) ? { s: [...st.wheels.s], m: [...st.wheels.m], h: [...st.wheels.h] } : void 0
        };
        let thumb = null;
        try {
          if (st.baseThumb) thumb = makeThumb(st.baseThumb, preset.style, preset.curves || null, preset.wheels || null);
        } catch {
        }
        const presets = [...st.presets, preset];
        store.setState({
          presets,
          thumbs: thumb ? { ...st.thumbs, [id]: thumb } : st.thumbs,
          openCustom: true
        });
        savePresets(presets);
      }
    },
    "\u{1F4BE} ",
    t("save_grade", "Ulo\u017Ei\u0165 ako vlastn\xFD filter")
  ))), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "w-full mb-2 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => void addFromPhoto(),
      disabled: s.photoBusy
    },
    s.photoBusy ? `\u23F3 ${t("photo_analyzing", "Analyzujem fotku\u2026")}` : `\u2795 ${t("add_from_photo", "Nov\xFD filter z fotky")}`
  ), /* @__PURE__ */ react_shim_default.createElement("div", { style: { flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 } }, /* @__PURE__ */ react_shim_default.createElement(
    Section,
    {
      title: t("custom_filters", "Vlastn\xE9 filtre"),
      count: s.presets.length,
      open: s.openCustom,
      onToggle: () => store.setState({ openCustom: !s.openCustom })
    },
    s.presets.length === 0 ? /* @__PURE__ */ react_shim_default.createElement("p", { style: { fontSize: 11, opacity: 0.6, margin: "4px 0 8px" } }, t("no_custom", "Zatia\u013E \u017Eiadne \u2014 vytvor si vlastn\xFD z fotky tla\u010Didlom vy\u0161\u0161ie.")) : /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, s.presets.map(card))
  ), /* @__PURE__ */ react_shim_default.createElement(
    Section,
    {
      title: t("builtin_filters", "Vstavan\xE9 filtre"),
      count: BUILTIN_PRESETS.length,
      open: s.openBuiltin,
      onToggle: () => store.setState({ openBuiltin: !s.openBuiltin })
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, BUILTIN_PRESETS.map(card))
  )), (s.activeStyle || s.curves || wheelsActive(s.wheels)) && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "w-full mt-2 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600",
      onClick: () => store.setState({ activeStyle: null, activePresetId: null, activePresetName: null, curves: null, wheels: { s: [0, 0], m: [0, 0], h: [0, 0] } })
    },
    "\u2715 ",
    t("clear_style", "Zru\u0161i\u0165 v\u0161etko")
  ));
}
if (api.registerEditorPanel) {
  api.registerEditorPanel(ToolPanel);
}
function FiltersInfo() {
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-full flex items-center justify-center" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-center max-w-sm rounded-2xl border border-border bg-bg-card p-8" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-5xl mb-4" }, "\u{1F3A8}"), /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold mb-2" }, t("title", "Filtre")), /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-sm text-text-dim" }, t("editor_tool_info", "Tento modul je n\xE1stroj SkyFrame Editora. Otvor Editor (ikona \u{1F39B}\uFE0F v\u013Eavo), nahraj s\xFAbor a tento n\xE1stroj n\xE1jde\u0161 v pravom st\u013Apci."))));
}
var index_default = FiltersInfo;
export {
  index_default as default
};
