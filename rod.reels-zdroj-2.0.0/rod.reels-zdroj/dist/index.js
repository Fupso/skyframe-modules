// react-shim.js
var react_shim_default = window.React;
var useState = window.React.useState;
var useEffect = window.React.useEffect;
var useRef = window.React.useRef;
var useMemo = window.React.useMemo;
var useCallback = window.React.useCallback;
var useSyncExternalStore = window.React.useSyncExternalStore;
var Fragment = window.React.Fragment;

// src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
var AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }];
var TRANSITIONS = [
  { id: "none", icon: "\u2702\uFE0F" },
  { id: "fade", icon: "\u{1F317}" },
  { id: "dissolve", icon: "\u{1FAE7}" },
  { id: "fadeblack", icon: "\u2B1B" },
  { id: "fadewhite", icon: "\u2B1C" },
  { id: "circleopen", icon: "\u2B55" },
  { id: "radial", icon: "\u{1F300}" },
  { id: "slideleft", icon: "\u2B05\uFE0F" },
  { id: "wipeup", icon: "\u2B06\uFE0F" }
];
var XFADE_DUR = 0.5;
var PRESETS = [
  {
    id: "film",
    // filmový: jemná S-krivka, zdvihnuté čierne, chladné tiene / teplé svetlá
    r: [[0, 0.02], [0.25, 0.24], [0.5, 0.5], [0.75, 0.77], [1, 0.98]],
    g: [[0, 0.015], [0.5, 0.5], [1, 0.99]],
    b: [[0, 0.045], [0.35, 0.36], [0.65, 0.65], [1, 0.94]],
    sat: 0.94,
    con: 1.04,
    vig: 0.25,
    grain: 3
  },
  {
    id: "reels",
    // reels živý: sýtosť + kontrast, čisté čierne
    r: [[0, 0], [0.2, 0.16], [0.5, 0.51], [0.8, 0.84], [1, 1]],
    g: [[0, 0], [0.5, 0.505], [1, 1]],
    b: [[0, 0], [0.5, 0.49], [1, 0.99]],
    sat: 1.22,
    con: 1.1,
    vig: 0.15,
    grain: 0
  },
  {
    id: "studio",
    // štúdiový čistý: neutrál, presnosť, jemný kontrast
    r: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]],
    g: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]],
    b: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]],
    sat: 1.03,
    con: 1.03,
    vig: 0,
    grain: 0
  },
  {
    id: "warm",
    // teplý západ: posun do červenej, mäkké svetlá
    r: [[0, 0.01], [0.5, 0.53], [1, 1]],
    g: [[0, 0], [0.5, 0.5], [1, 0.985]],
    b: [[0, 0], [0.5, 0.45], [1, 0.9]],
    sat: 1.08,
    con: 1.02,
    vig: 0.2,
    grain: 0
  },
  {
    id: "matte",
    // matný portrait: zdvihnuté tiene, stlačené svetlá, nízka sýtosť
    r: [[0, 0.07], [0.5, 0.52], [1, 0.96]],
    g: [[0, 0.065], [0.5, 0.52], [1, 0.96]],
    b: [[0, 0.075], [0.5, 0.52], [1, 0.96]],
    sat: 0.85,
    con: 0.97,
    vig: 0.3,
    grain: 2
  },
  {
    id: "noir",
    // noir: vysoký kontrast, takmer bez sýtosti
    r: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]],
    g: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]],
    b: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]],
    sat: 0.35,
    con: 1.15,
    vig: 0.4,
    grain: 5
  }
];
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}
function buildPresetVf(presetId, intensity) {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return "";
  const it = clamp01(intensity);
  const chan = (pts) => pts.map(([x, y]) => `${x.toFixed(3)}/${(x + (y - x) * it).toFixed(3)}`).join(" ");
  const parts = [`curves=r='${chan(p.r)}':g='${chan(p.g)}':b='${chan(p.b)}'`];
  const sat = 1 + (p.sat - 1) * it;
  const con = 1 + (p.con - 1) * it;
  const eqBits = [];
  if (Math.abs(sat - 1) > 4e-3) eqBits.push(`saturation=${sat.toFixed(3)}`);
  if (Math.abs(con - 1) > 4e-3) eqBits.push(`contrast=${con.toFixed(3)}`);
  if (eqBits.length) parts.push(`eq=${eqBits.join(":")}`);
  const vig = p.vig * it;
  if (vig > 0.02) parts.push(`vignette=a=${(Math.PI / 5 * vig).toFixed(4)}`);
  const gr = Math.round((p.grain || 0) * it);
  if (gr > 0) parts.push(`noise=alls=${gr}:allf=t`);
  return parts.join(",");
}
var initialState = {
  video: null,
  // cesta k zdroju
  info: null,
  // get_video_info
  thumbs: null,
  // {dir, count}
  segments: [],
  // [{start, end}]
  transitions: [],
  // medzi segmentmi i a i+1: transitions[i] = {id}
  pendingIn: null,
  // otvorený I bod
  music: null,
  loopMusic: true,
  presetId: "film",
  intensity: 0.75,
  autoPick: null,
  // {presetId, intensity, stats}
  running: false,
  stage: "",
  error: "",
  log: [],
  preview: null,
  // cesta k proxy náhľadu
  previewScope: "sample",
  // sample (15 s) | full
  result: null,
  cfgLoaded: false
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
  return (p || "").split(/[\\/]/).pop() ?? p;
}
function fmtTime(sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
function log(msg) {
  store.setState((s) => ({ log: [...s.log.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${msg}`] }));
}
function inputFixChain(info) {
  const parts = [];
  const cs = (info?.colorSpace || "").toLowerCase();
  const cr = (info?.colorRange || "").toLowerCase();
  if (cs.includes("bt2020")) {
    parts.push("zscale=t=bt709:m=bt709:p=bt709:r=tv", "tonemap=tonemap=hable", "format=yuv420p");
  }
  if (cr === "pc" || cr === "full") {
    parts.push("scale=in_range=pc:out_range=tv");
  }
  return parts;
}
function buildGraph(info, segments, transitionIds, presetVf) {
  if (!segments.length) return null;
  const fps = Math.min(60, Math.max(24, Math.round(info?.fps || 30)));
  const fix = inputFixChain(info);
  const base = fix.length ? "vb" : "0:v";
  const parts = [];
  if (fix.length) parts.push(`[0:v]${fix.join(",")}[vb]`);
  const hasXf = transitionIds.some((id) => id && id !== "none");
  const lens = segments.map((s) => s.end - s.start);
  segments.forEach((s, i) => {
    parts.push(
      `[${base}]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS,fps=${fps},format=yuv420p,setsar=1[v${i}]`
    );
  });
  let lastV = "v0";
  let cum = lens[0];
  if (hasXf) {
    for (let i = 0; i < segments.length - 1; i++) {
      const tid = transitionIds[i];
      const out = `x${i}`;
      if (tid && tid !== "none") {
        const off = Math.max(0, cum - XFADE_DUR);
        parts.push(`[${lastV}][v${i + 1}]xfade=transition=${tid}:duration=${XFADE_DUR}:offset=${off.toFixed(3)}[${out}]`);
        cum = cum + lens[i + 1] - XFADE_DUR;
      } else {
        parts.push(`[${lastV}][v${i + 1}]concat=n=2:v=1:a=0[${out}]`);
        cum = cum + lens[i + 1];
      }
      lastV = out;
    }
  }
  const tail = [presetVf, "setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709"].filter(Boolean).join(",");
  parts.push(`[${lastV}]${tail}[v]`);
  const fc = parts.join(";");
  const planDur = cum;
  let aGraph = null;
  if (info?.has_audio) {
    const ap = [];
    segments.forEach((s, i) => {
      ap.push(`[0:a:0]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
    });
    let lastA = "a0";
    for (let i = 0; i < segments.length - 1; i++) {
      const tid = transitionIds[i];
      const out = `ax${i}`;
      if (tid && tid !== "none") {
        ap.push(`[${lastA}][a${i + 1}]acrossfade=d=${XFADE_DUR}[${out}]`);
      } else {
        ap.push(`[${lastA}][a${i + 1}]concat=n=2:v=0:a=1[${out}]`);
      }
      lastA = out;
    }
    ap.push(`[${lastA}]acopy[aout]`);
    aGraph = ap.join(";");
  }
  return { fc, aGraph, planDur };
}
function watchJob(jobId) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      if (job.status !== "running") {
        unlisten?.();
        resolve(job);
      }
    }).then((u) => {
      unlisten = u;
    });
  });
}
async function renderPreview() {
  const s = store.getState();
  if (!s.video || !s.segments.length || s.running) return;
  const g = buildGraph(s.info, s.segments, s.transitions.map((x) => x?.id || "none"), buildPresetVf(s.presetId, s.intensity));
  if (!g) return;
  store.setState({ running: true, error: "", preview: null, stage: t("stage_preview", "Renderujem n\xE1h\u013Ead\u2026") });
  log(`\u25B6 ${t("stage_preview", "Renderujem n\xE1h\u013Ead\u2026")} (${s.previewScope === "full" ? t("full", "cel\xFD v\xFDstup") : "15 s"})`);
  try {
    const secs = s.previewScope === "full" ? Math.ceil(g.planDur) + 1 : Math.min(15, g.planDur);
    const path = await api.invoke("proxy_preview", {
      input: s.video,
      vf: null,
      filterComplex: g.fc,
      extraInputs: null,
      seconds: secs,
      maxWidth: 960,
      af: null,
      aGraph: g.aGraph,
      startSec: 0,
      tag: `reels-${Date.now()}`,
      withAudio: true,
      segments: null
    });
    store.setState({ preview: path, stage: "" });
    log(`\u2713 ${t("preview_ready", "N\xE1h\u013Ead hotov\xFD")}`);
  } catch (e) {
    store.setState({ error: String(e), stage: "" });
    log(`\u2717 ${String(e)}`);
  } finally {
    store.setState({ running: false });
  }
}
async function renderFinal() {
  const s = store.getState();
  if (!s.video || !s.segments.length || s.running) return;
  const tIds = s.transitions.map((x) => x?.id || "none");
  const presetVf = buildPresetVf(s.presetId, s.intensity);
  store.setState({ running: true, error: "", result: null });
  try {
    const hasXf = tIds.some((id) => id !== "none");
    const g = buildGraph(s.info, s.segments, tIds, presetVf);
    let jobId;
    if (!hasXf) {
      store.setState({ stage: t("stage_render", "Renderujem v\xFDsledok\u2026") });
      log(`\u25B6 ${t("stage_render", "Renderujem v\xFDsledok\u2026")} (${s.segments.length} ${t("segments", "\xFAsekov")}, ${t("no_transitions", "bez prechodov")})`);
      jobId = await api.invoke("filter_video", {
        input: s.video,
        vf: presetVf,
        af: null,
        quality: "20",
        outputName: "reels",
        outputDir: null,
        moduleId: api.moduleId,
        filterComplex: null,
        aGraph: null,
        extraInputs: null,
        format: null,
        resolution: null,
        trimStart: null,
        trimEnd: null,
        maxDuration: null,
        meta: null,
        loudnorm: null,
        segments: s.segments.map((x) => ({ start: x.start, end: x.end }))
      });
    } else {
      store.setState({ stage: t("stage_render", "Renderujem v\xFDsledok\u2026") });
      log(`\u25B6 ${t("stage_render", "Renderujem v\xFDsledok\u2026")} (${s.segments.length} ${t("segments", "\xFAsekov")}, ${t("with_transitions", "s prechodmi")})`);
      const ag = !s.music && g.aGraph ? g.aGraph : `aevalsrc=0:d=${Math.max(0.1, g.planDur).toFixed(3)}[aout]`;
      jobId = await api.invoke("filter_video", {
        input: s.video,
        vf: "",
        af: null,
        quality: "20",
        outputName: "reels",
        outputDir: null,
        moduleId: api.moduleId,
        filterComplex: g.fc,
        aGraph: ag,
        extraInputs: null,
        format: null,
        resolution: null,
        trimStart: null,
        trimEnd: null,
        maxDuration: null,
        meta: null,
        loudnorm: null,
        segments: null
      });
    }
    const res = await watchJob(jobId);
    if (res.status !== "done" || !res.result) throw new Error(res.message || "render");
    let final = res.result;
    log(`\u2713 ${baseName(final)}`);
    if (s.music) {
      const paths = await api.invoke("get_app_paths");
      store.setState({ stage: t("stage_music", "Prid\xE1vam hudbu\u2026") });
      log(`\u25B6 ${t("stage_music", "Hudba")}: ${baseName(s.music)}`);
      const mId = await api.invoke("merge_videos", {
        files: [final],
        outputName: "reels-music",
        music: s.music,
        moduleId: api.moduleId,
        outputDir: paths.temp_dir,
        loopMusic: s.loopMusic
      });
      const mRes = await watchJob(mId);
      if (mRes.status !== "done" || !mRes.result) throw new Error(mRes.message || "music");
      final = mRes.result;
      log(`\u2713 ${baseName(final)}`);
    }
    store.setState({ result: final, stage: "" });
    if (api.setActiveMedia) api.setActiveMedia(final);
    log(`\u2705 ${t("done", "Hotovo")}: ${baseName(final)}`);
  } catch (e) {
    store.setState({ error: String(e), stage: "" });
    log(`\u2717 ${String(e)}`);
  } finally {
    store.setState({ running: false });
  }
}
async function analyzeAuto() {
  const s = store.getState();
  if (!s.video || s.running) return;
  const segs = s.segments.length ? s.segments : [{ start: 0, end: s.info?.duration || 10 }];
  try {
    log(`\u25B6 ${t("auto_analyzing", "Analyzujem z\xE1bery\u2026")}`);
    let sumL = 0, sumL2 = 0, sumS = 0, sumW = 0, n = 0;
    const samples = [];
    for (const seg of segs.slice(0, 4)) {
      const mid = (seg.start + seg.end) / 2;
      samples.push(seg.start + (seg.end - seg.start) * 0.3, mid, seg.start + (seg.end - seg.start) * 0.7);
    }
    for (const ts of samples.slice(0, 6)) {
      const raw = await api.invoke("video_thumbnail", { path: s.video, atSeconds: ts, maxWidth: 160, vf: null });
      if (!raw) continue;
      const url = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" }));
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      URL.revokeObjectURL(url);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 16) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        sumL += L;
        sumL2 += L * L;
        sumW += r - b;
        n++;
        if (mx > 8) sumS += (mx - mn) / mx;
      }
    }
    if (!n) throw new Error("no samples");
    const meanL = sumL / n;
    const stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
    const meanS = sumS / n;
    const warm = sumW / n;
    const stats = { meanL: Math.round(meanL), stdL: Math.round(stdL), meanS: +meanS.toFixed(2), warm: Math.round(warm) };
    let presetId, intensity;
    if (stdL < 40) {
      presetId = "reels";
      intensity = 0.7 + (40 - stdL) / 60;
    } else if (meanS < 0.24) {
      presetId = "reels";
      intensity = 0.8;
    } else if (meanL < 80) {
      presetId = "matte";
      intensity = 0.7;
    } else if (warm > 25) {
      presetId = "studio";
      intensity = 0.65;
    } else if (warm < -15) {
      presetId = "warm";
      intensity = 0.6;
    } else {
      presetId = "film";
      intensity = 0.65;
    }
    intensity = +clamp01(intensity).toFixed(2);
    store.setState({ autoPick: { presetId, intensity, stats }, presetId, intensity });
    log(`\u2713 Auto: L=${stats.meanL} \u03C3=${stats.stdL} S=${stats.meanS} W=${stats.warm} \u2192 ${t("preset_" + presetId, presetId)} (${Math.round(intensity * 100)} %)`);
  } catch (e) {
    log(`\u2717 Auto: ${String(e)}`);
    store.setState({ error: String(e) });
  }
}
var BTN = "rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-40";
var CARD = "bg-bg-card rounded-2xl border border-border";
function Timeline({ videoRef }) {
  const s = useStore();
  const barRef = useRef2(null);
  const [, force] = useState2(0);
  const dur = s.info?.duration || 0;
  useEffect2(() => {
    const v = videoRef.current;
    if (!v) return;
    const on = () => force((x) => x + 1);
    v.addEventListener("timeupdate", on);
    return () => v.removeEventListener("timeupdate", on);
  }, [videoRef, s.video]);
  const seek = (e) => {
    const v = videoRef.current;
    const bar = barRef.current;
    if (!v || !bar || !dur) return;
    const r = bar.getBoundingClientRect();
    v.currentTime = clamp01((e.clientX - r.left) / r.width) * dur;
  };
  const ct = videoRef.current?.currentTime || 0;
  return /* @__PURE__ */ react_shim_default.createElement("div", { ref: barRef, onClick: seek, className: "relative h-16 rounded-xl overflow-hidden bg-black/40 cursor-pointer select-none" }, s.thumbs && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute inset-0 flex" }, Array.from({ length: s.thumbs.count }, (_, i) => /* @__PURE__ */ react_shim_default.createElement(StripThumb, { key: i, dir: s.thumbs.dir, idx: i + 1 }))), dur > 0 && s.segments.map((seg, i) => /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      key: i,
      className: "absolute top-0 bottom-0 bg-accent/35 border-l-2 border-r-2 border-accent",
      style: { left: `${seg.start / dur * 100}%`, width: `${(seg.end - seg.start) / dur * 100}%` }
    }
  )), dur > 0 && s.pendingIn != null && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute top-0 bottom-0 w-0.5 bg-yellow-400", style: { left: `${s.pendingIn / dur * 100}%` } }), dur > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute top-0 bottom-0 w-0.5 bg-white/90", style: { left: `${ct / dur * 100}%` } }));
}
function StripThumb({ dir, idx }) {
  const [src, setSrc] = useState2(null);
  useEffect2(() => {
    let alive = true;
    let url = null;
    (async () => {
      try {
        const bytes = await api.readFileBytes(`${dir}/t${String(idx).padStart(4, "0")}.jpg`);
        if (!alive || !bytes) return;
        url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
        setSrc(url);
      } catch {
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [dir, idx]);
  return src ? /* @__PURE__ */ react_shim_default.createElement("img", { src, alt: "", className: "h-full flex-1 object-cover min-w-0", draggable: false }) : /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-full flex-1 bg-black/30" });
}
function SegmentList() {
  const s = useStore();
  const upd = (i, patch) => {
    const segs = s.segments.map((x, j) => j === i ? { ...x, ...patch } : x);
    store.setState({ segments: segs, preview: null });
  };
  const del = (i) => {
    const segs = s.segments.filter((_, j) => j !== i);
    const tr = s.transitions.filter((_, j) => j !== Math.min(i, s.transitions.length - 1));
    store.setState({ segments: segs, transitions: tr, preview: null });
  };
  const setTr = (i, id) => {
    const tr = s.transitions.slice();
    tr[i] = { id };
    store.setState({ transitions: tr, preview: null });
  };
  if (!s.segments.length) return null;
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4 space-y-2` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, t("segments_title", "\xDAseky"), " (", s.segments.length, ")"), s.segments.map((seg, i) => /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, { key: i }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim w-6" }, i + 1, "."), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      step: "0.1",
      min: "0",
      value: +seg.start.toFixed(1),
      disabled: s.running,
      className: "w-20 bg-black/30 rounded-lg px-2 py-1 text-sm border border-border",
      onChange: (e) => upd(i, { start: Math.min(+e.target.value, seg.end - 0.2) })
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim" }, "\u2013"), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "number",
      step: "0.1",
      min: "0",
      value: +seg.end.toFixed(1),
      disabled: s.running,
      className: "w-20 bg-black/30 rounded-lg px-2 py-1 text-sm border border-border",
      onChange: (e) => upd(i, { end: Math.max(+e.target.value, seg.start + 0.2) })
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim text-xs" }, "(", fmtTime(seg.end - seg.start), ")"), /* @__PURE__ */ react_shim_default.createElement("button", { className: "ml-auto text-text-dim hover:text-red-400 px-2", onClick: () => del(i), disabled: s.running }, "\u2715")), i < s.segments.length - 1 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-1 pl-8 flex-wrap" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[11px] text-text-dim mr-1" }, "\u21B3 ", t("transition", "prechod"), ":"), TRANSITIONS.map((tr) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: tr.id,
      disabled: s.running,
      title: t("tr_" + tr.id, tr.id),
      className: `px-2 py-0.5 rounded-lg text-xs border ${(s.transitions[i]?.id || "none") === tr.id ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => setTr(i, tr.id)
    },
    tr.icon,
    " ",
    t("tr_" + tr.id, tr.id)
  ))))));
}
function Reels() {
  const s = useStore();
  const videoRef = useRef2(null);
  useEffect2(() => {
    if (s.cfgLoaded) return;
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        const pick = {};
        if (cfg && typeof cfg === "object") {
          for (const k of ["presetId", "intensity", "loopMusic", "previewScope"]) {
            if (cfg[k] !== void 0) pick[k] = cfg[k];
          }
        }
        store.setState({ ...pick, cfgLoaded: true });
      } catch {
        store.setState({ cfgLoaded: true });
      }
    })();
  }, [s.cfgLoaded]);
  useEffect2(() => {
    if (!s.cfgLoaded) return;
    const cfg = { presetId: s.presetId, intensity: s.intensity, loopMusic: s.loopMusic, previewScope: s.previewScope };
    const tm = setTimeout(() => api.invoke("set_module_config", { id: api.moduleId, config: cfg }).catch(() => {
    }), 400);
    return () => clearTimeout(tm);
  }, [s.cfgLoaded, s.presetId, s.intensity, s.loopMusic, s.previewScope]);
  const pickVideo = async () => {
    const f = await api.pickFiles(VIDEO_FILTERS, false);
    if (!f) return;
    const path = Array.isArray(f) ? f[0] : f;
    store.setState({ ...initialState, cfgLoaded: true, video: path, presetId: s.presetId, intensity: s.intensity, loopMusic: s.loopMusic, previewScope: s.previewScope });
    log(`\u25B6 ${baseName(path)}`);
    try {
      const info = await api.invoke("get_video_info", { path });
      store.setState({ info });
      const dur = info?.duration || 0;
      const count = Math.max(50, Math.min(240, Math.ceil(dur * 1.2)));
      const thumbs = await api.invoke("video_thumbs_strip", { path, count });
      store.setState({ thumbs });
      log(`\u2713 ${fmtTime(dur)} \xB7 ${info.width}\xD7${info.height} \xB7 ${info.fps} fps${(info.colorSpace || "").toLowerCase().includes("bt2020") ? " \xB7 HDR" : ""}`);
    } catch (e) {
      store.setState({ error: String(e) });
    }
  };
  useEffect2(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      const v = videoRef.current;
      if (!v || !store.getState().video) return;
      const k = e.key.toLowerCase();
      if (k === "i") {
        store.setState({ pendingIn: v.currentTime });
        log(`I @ ${fmtTime(v.currentTime)}`);
      } else if (k === "o") {
        const st = store.getState();
        if (st.pendingIn == null) return;
        const a = st.pendingIn, b = v.currentTime;
        if (b - a < 0.3) {
          log(`\u26A0 ${t("seg_too_short", "\xFAsek je pr\xEDli\u0161 kr\xE1tky")}`);
          return;
        }
        const segs = [...st.segments, { start: +a.toFixed(3), end: +b.toFixed(3) }].sort((x, y) => x.start - y.start);
        const tr = Array(Math.max(0, segs.length - 1)).fill(null).map((_, i) => st.transitions[i] || { id: "none" });
        store.setState({ segments: segs, transitions: tr, pendingIn: null, preview: null });
        log(`O @ ${fmtTime(b)} \u2192 ${t("segment", "\xFAsek")} ${fmtTime(a)}\u2013${fmtTime(b)}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const totalLen = s.segments.reduce((a, x) => a + (x.end - x.start), 0);
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-6 max-w-5xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ react_shim_default.createElement("h1", { className: "text-xl font-semibold" }, "\u{1F4F1} ", t("title", "Reels")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-4 py-2 text-sm`, disabled: !s.segments.length || s.running, onClick: renderPreview }, s.running && s.stage ? s.stage : `\u{1F441} ${t("preview", "N\xE1h\u013Ead")}`), /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-5 py-2.5`, disabled: !s.segments.length || s.running, onClick: renderFinal }, s.running ? s.stage || "\u2026" : `\u{1F680} ${t("make", "Vytvori\u0165")}`))), s.error ? /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-3 text-sm text-red-400` }, "\u274C ", s.error) : null, !s.video ? /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: pickVideo,
      className: `${CARD} w-full py-14 text-center text-text-dim hover:border-accent/40 transition-colors border-dashed`
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-4xl mb-2" }, "\u{1F3AC}"),
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-sm" }, t("drop_hint", "Vlo\u017E jedno dlh\xE9 video"))
  ) : /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4 space-y-3` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-sm truncate" }, baseName(s.video), s.info ? /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim text-xs" }, " \xB7 ", fmtTime(s.info.duration), " \xB7 ", s.info.width, "\xD7", s.info.height, (s.info.colorSpace || "").toLowerCase().includes("bt2020") ? " \xB7 HDR\u2192SDR" : "") : null), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-xs text-accent hover:underline", onClick: pickVideo, disabled: s.running }, t("change_video", "Zmeni\u0165 video"))), /* @__PURE__ */ react_shim_default.createElement(
    "video",
    {
      ref: videoRef,
      src: api.fileSrc(s.video),
      controls: true,
      className: "w-full max-h-[420px] object-contain rounded-xl bg-black"
    }
  ), /* @__PURE__ */ react_shim_default.createElement(Timeline, { videoRef }), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2 text-xs text-text-dim flex-wrap" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "px-2 py-1 rounded-lg border border-border" }, "I = ", t("in_point", "za\u010Diatok \xFAseku")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "px-2 py-1 rounded-lg border border-border" }, "O = ", t("out_point", "koniec \xFAseku")), s.pendingIn != null && /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-yellow-400" }, "I @ ", fmtTime(s.pendingIn), " \u2014 ", t("press_o", "stla\u010D O pre koniec")), totalLen > 0 && /* @__PURE__ */ react_shim_default.createElement("span", { className: "ml-auto" }, t("total", "Spolu"), ": ", fmtTime(totalLen)))), /* @__PURE__ */ react_shim_default.createElement(SegmentList, null), s.video ? /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("music", "Hudba")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "w-full py-2 rounded-lg border border-dashed border-border text-sm text-text-dim hover:border-accent/50",
      disabled: s.running,
      onClick: async () => {
        const f = await api.pickFiles(AUDIO_FILTERS, false);
        if (f) store.setState({ music: Array.isArray(f) ? f[0] : f });
      }
    },
    s.music ? `\u{1F3B5} ${baseName(s.music)}` : `\uFF0B ${t("pick_music", "Vybra\u0165 hudbu (nahrad\xED zvuk)")}`
  ), s.music && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-3 mt-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ react_shim_default.createElement("input", { type: "checkbox", checked: s.loopMusic, onChange: (e) => store.setState({ loopMusic: e.target.checked }), disabled: s.running }), t("loop_music", "Opakova\u0165 v slu\u010Dke")), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-xs text-text-dim hover:text-red-400", onClick: () => store.setState({ music: null }), disabled: s.running }, "\u2715"))) : null, s.video ? /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, t("look", "Obrazov\xFD preset")), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-xs text-accent hover:underline disabled:opacity-40", onClick: analyzeAuto, disabled: s.running }, "\u2728 ", t("auto", "Automatick\xFD"))), s.autoPick && /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim mb-2" }, "Auto: ", t("preset_" + s.autoPick.presetId, s.autoPick.presetId), " \xB7 L=", s.autoPick.stats.meanL, " \u03C3=", s.autoPick.stats.stdL, " S=", s.autoPick.stats.meanS, " W=", s.autoPick.stats.warm), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-3 gap-1" }, PRESETS.map((p) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: p.id,
      disabled: s.running,
      className: `py-1.5 px-2 rounded-lg text-xs border text-left ${s.presetId === p.id ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => store.setState({ presetId: p.id, preview: null })
    },
    t("preset_" + p.id, p.id)
  ))), /* @__PURE__ */ react_shim_default.createElement("label", { className: "block mt-2 text-xs text-text-dim" }, t("intensity", "Intenzita"), ": ", Math.round(s.intensity * 100), " %", /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: 0,
      max: 100,
      value: Math.round(s.intensity * 100),
      disabled: s.running,
      className: "w-full",
      onChange: (e) => store.setState({ intensity: Number(e.target.value) / 100, preview: null })
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-3 mt-2 text-xs text-text-dim" }, /* @__PURE__ */ react_shim_default.createElement("span", null, t("preview_len", "D\u013A\u017Eka n\xE1h\u013Eadu"), ":"), [["sample", "15 s"], ["full", t("full", "cel\xFD v\xFDstup")]].map(([v, l]) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: v,
      className: `px-2 py-1 rounded-lg border ${s.previewScope === v ? "border-accent text-accent" : "border-border"}`,
      onClick: () => store.setState({ previewScope: v }),
      disabled: s.running
    },
    l
  )))) : null, s.preview ? /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("preview", "N\xE1h\u013Ead")), /* @__PURE__ */ react_shim_default.createElement(
    "video",
    {
      key: s.preview,
      src: api.fileSrc(s.preview),
      controls: true,
      autoPlay: true,
      className: "w-full max-h-[420px] object-contain rounded-xl bg-black"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim mt-1" }, t("preview_note", "Renderovan\xFD n\xE1h\u013Ead = rovnak\xFD graf ako fin\xE1lny v\xFDstup."))) : null, s.result ? /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("result", "V\xFDsledok")), /* @__PURE__ */ react_shim_default.createElement(
    "video",
    {
      key: s.result,
      src: api.fileSrc(s.result),
      controls: true,
      className: "w-full max-h-[420px] object-contain rounded-xl bg-black"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2 mt-3 flex-wrap" }, /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-4 py-2 text-sm`, onClick: () => api.editMedia(s.result) }, "\u2702\uFE0F ", t("open_editor", "Otvori\u0165 v Editore")), /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-4 py-2 text-sm`, onClick: () => api.invoke("open_in_file_manager", { path: s.result }).catch(() => {
  }) }, "\u{1F4C1} ", t("open_folder", "Zobrazi\u0165 v prie\u010Dinku")))) : null, s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("log", "Log")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, s.log.map((line, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, line)))));
}
var index_default = Reels;
export {
  index_default as default
};
