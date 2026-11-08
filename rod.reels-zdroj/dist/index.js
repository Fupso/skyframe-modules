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
var AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }];
var MIN_SEG = 0.3;
var PRESETS = [
  { id: "film", r: [[0, 0.02], [0.25, 0.24], [0.5, 0.5], [0.75, 0.77], [1, 0.98]], g: [[0, 0.015], [0.5, 0.5], [1, 0.99]], b: [[0, 0.045], [0.35, 0.36], [0.65, 0.65], [1, 0.94]], sat: 0.94, con: 1.04, vig: 0.25, grain: 3 },
  { id: "reels", r: [[0, 0], [0.2, 0.16], [0.5, 0.51], [0.8, 0.84], [1, 1]], g: [[0, 0], [0.5, 0.505], [1, 1]], b: [[0, 0], [0.5, 0.49], [1, 0.99]], sat: 1.22, con: 1.1, vig: 0.15, grain: 0 },
  { id: "studio", r: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]], g: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]], b: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]], sat: 1.03, con: 1.03, vig: 0, grain: 0 },
  { id: "warm", r: [[0, 0.01], [0.5, 0.53], [1, 1]], g: [[0, 0], [0.5, 0.5], [1, 0.985]], b: [[0, 0], [0.5, 0.45], [1, 0.9]], sat: 1.08, con: 1.02, vig: 0.2, grain: 0 },
  { id: "matte", r: [[0, 0.07], [0.5, 0.52], [1, 0.96]], g: [[0, 0.065], [0.5, 0.52], [1, 0.96]], b: [[0, 0.075], [0.5, 0.52], [1, 0.96]], sat: 0.85, con: 0.97, vig: 0.3, grain: 2 },
  { id: "noir", r: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]], g: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]], b: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]], sat: 0.35, con: 1.15, vig: 0.4, grain: 5 }
];
var TRANSITIONS = ["none", "black", "white"];
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}
function buildPresetVf(presetId, intensity) {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return "";
  const it = clamp01(intensity);
  const chan = (pts) => pts.map(([x, y]) => `${x.toFixed(3)}/${(x + (y - x) * it).toFixed(3)}`).join(" ");
  const parts = [`curves=r='${chan(p.r)}':g='${chan(p.g)}':b='${chan(p.b)}'`];
  const eqBits = [];
  const sat = 1 + (p.sat - 1) * it, con = 1 + (p.con - 1) * it;
  if (Math.abs(sat - 1) > 4e-3) eqBits.push(`saturation=${sat.toFixed(3)}`);
  if (Math.abs(con - 1) > 4e-3) eqBits.push(`contrast=${con.toFixed(3)}`);
  if (eqBits.length) parts.push(`eq=${eqBits.join(":")}`);
  const vig = p.vig * it;
  if (vig > 0.02) parts.push(`vignette=a=${(Math.PI / 5 * vig).toFixed(4)}`);
  const gr = Math.round((p.grain || 0) * it);
  if (gr > 0) parts.push(`noise=alls=${gr}:allf=t`);
  return parts.join(",");
}
function chanTable(pts, it) {
  const out = [];
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    let a = pts[0], b = pts[pts.length - 1];
    for (let k = 0; k < pts.length - 1; k++) {
      if (x >= pts[k][0] && x <= pts[k + 1][0]) {
        a = pts[k];
        b = pts[k + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const y = a[1] + (b[1] - a[1]) * ((x - a[0]) / span);
    out.push((x + (y - x) * it).toFixed(4));
  }
  return out.join(" ");
}
function buildLiveFilter(presetId, intensity) {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return null;
  const it = clamp01(intensity);
  return {
    r: chanTable(p.r, it),
    g: chanTable(p.g, it),
    b: chanTable(p.b, it),
    saturate: 1 + (p.sat - 1) * it,
    fx: { blur: 0, sharpen: 0, vignette: Math.round(p.vig * 100 * it), grain: Math.round((p.grain || 0) * 10 * it) }
  };
}
function segGrade(fin, fout, len) {
  const parts = [];
  const mk = (id, dir) => {
    const d = Math.min(0.4, len / 2 * 0.9);
    if (d < 0.05) return null;
    const col = id === "white" ? ":color=white" : "";
    return dir === "in" ? `fade=t=in:st=0:d=${d.toFixed(3)}${col}` : `fade=t=out:st=${(len - d).toFixed(3)}:d=${d.toFixed(3)}${col}`;
  };
  if (fin && fin !== "none") {
    const f = mk(fin, "in");
    if (f) parts.push(f);
  }
  if (fout && fout !== "none") {
    const f = mk(fout, "out");
    if (f) parts.push(f);
  }
  return parts.join(",");
}
function fmtTime(sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
function baseName(p) {
  return (p || "").split(/[\\/]/).pop() ?? p;
}
var initialEdit = () => ({
  segments: [],
  // [{start,end}]
  cuts: [],
  // cuts[i] = prechod medzi úsekom i a i+1
  pendingIn: null,
  sel: -1,
  presetId: "none",
  intensity: 0.75,
  music: null,
  // {path, volume, mode}
  msg: "",
  previewPath: null,
  previewBusy: false,
  autoBusy: false
});
var state = {
  mediaPath: null,
  info: null,
  thumbs: null,
  cfgLoaded: false,
  ...initialEdit()
};
var listeners = /* @__PURE__ */ new Set();
var store = {
  getState: () => state,
  set(patch) {
    state = { ...state, ...typeof patch === "function" ? patch(state) : patch };
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  }
};
var useStore = () => useSyncExternalStore2(store.subscribe, store.getState);
var loadingFor = null;
async function loadMedia(path) {
  if (!path || loadingFor === path) return;
  loadingFor = path;
  store.set({ mediaPath: path, info: null, thumbs: null, cfgLoaded: false, ...initialEdit() });
  try {
    const info = await api.invoke("get_video_info", { path });
    if (state.mediaPath !== path) return;
    store.set({ info });
    try {
      const cfg = await api.invoke("get_module_config", { id: api.moduleId });
      const saved = cfg?.reels?.[path];
      if (saved && state.mediaPath === path && !state.segments.length && state.presetId === "none") {
        store.set({
          segments: saved.segments || [],
          cuts: saved.cuts || [],
          presetId: saved.presetId || "none",
          intensity: saved.intensity ?? 0.75,
          music: saved.music || null
        });
      }
    } catch {
    }
    if (state.mediaPath === path) store.set({ cfgLoaded: true });
    try {
      const thumbs = await api.invoke("video_thumbs_strip", { path, count: 120 });
      if (state.mediaPath === path) store.set({ thumbs });
    } catch {
    }
  } catch (e) {
    if (state.mediaPath === path) store.set({ msg: String(e) });
  } finally {
    if (loadingFor === path) loadingFor = null;
  }
}
var saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = store.getState();
    if (!s.mediaPath || !s.cfgLoaded) return;
    api.invoke("get_module_config", { id: api.moduleId }).then((cfg) => {
      const reels = { ...cfg?.reels || {} };
      reels[s.mediaPath] = { segments: s.segments, cuts: s.cuts, presetId: s.presetId, intensity: s.intensity, music: s.music };
      return api.invoke("set_module_config", { id: api.moduleId, config: { ...cfg || {}, reels } });
    }).catch(() => {
    });
  }, 600);
}
function applyToEditor() {
  const s = store.getState();
  const segs = s.segments.length ? s.segments.map((g, i) => ({
    start: g.start,
    end: g.end,
    grade: segGrade(s.cuts[i - 1], s.cuts[i], g.end - g.start) || void 0
  })) : null;
  api.setEditorSegments(segs);
  api.setEditorLiveFilter(buildLiveFilter(s.presetId, s.intensity));
  const vf = buildPresetVf(s.presetId, s.intensity);
  let agraph, aInputs;
  const total = s.segments.length ? s.segments.reduce((a, g) => a + (g.end - g.start), 0) : s.info?.duration || 0;
  if (s.music?.path && total > 0) {
    const v = clamp01((s.music.volume ?? 30) / 100).toFixed(3);
    if (s.music.mode === "replace" || s.info?.has_audio === false) {
      agraph = `[I0]aloop=loop=-1:size=2000000000,atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${v}[A_OUT]`;
    } else {
      agraph = `[A_IN]volume=1.0[oa];[I0]aloop=loop=-1:size=2000000000,volume=${v}[ma];[oa][ma]amix=inputs=2:duration=first:normalize=0[A_OUT]`;
    }
    aInputs = [s.music.path];
  }
  if (vf || agraph) {
    api.setEditorStep({ label: "Reels", vf: vf || void 0, agraph, aInputs });
  } else {
    api.setEditorStep(null);
  }
}
function update(patch) {
  store.set(patch);
  applyToEditor();
  scheduleSave();
}
function markIn() {
  const pos = api.getPlayerPosition();
  if (pos == null) return;
  store.set({ pendingIn: pos, msg: `\u25B8 I = ${fmtTime(pos)} \u2014 ${t("now_out", "teraz prejdi na koniec \xFAseku a stla\u010D O")}`, previewPath: null });
}
function markOut() {
  const s = store.getState();
  const pos = api.getPlayerPosition();
  if (pos == null) return;
  if (s.pendingIn == null) {
    store.set({ msg: t("err_no_in", "Najprv ozna\u010D za\u010Diatok (I).") });
    return;
  }
  const start = Math.min(s.pendingIn, pos), end = Math.max(s.pendingIn, pos);
  if (end - start < MIN_SEG) {
    store.set({ msg: t("err_short", "\xDAsek je pr\xEDli\u0161 kr\xE1tky.") });
    return;
  }
  if (s.segments.some((g) => start < g.end - 1e-3 && end > g.start + 1e-3)) {
    store.set({ msg: t("err_overlap", "\xDAsek sa prekr\xFDva s in\xFDm \xFAsekom.") });
    return;
  }
  const at = (() => {
    const i = s.segments.findIndex((g) => g.start > start);
    return i === -1 ? s.segments.length : i;
  })();
  const ns = [...s.segments];
  ns.splice(at, 0, { start, end });
  const nc = [...s.cuts];
  nc.splice(at, 0, "none");
  update({ segments: ns, cuts: nc, pendingIn: null, sel: at, previewPath: null, msg: `\u2713 ${t("seg_added", "\xDAsek pridan\xFD")}: ${fmtTime(start)} \u2013 ${fmtTime(end)}` });
}
function removeSeg(i) {
  const s = store.getState();
  const ns = s.segments.filter((_, k) => k !== i);
  const nc = [...s.cuts];
  nc.splice(Math.min(i, nc.length - 1), 1);
  nc.length = Math.max(0, ns.length - 1);
  update({ segments: ns, cuts: nc, sel: -1, previewPath: null });
}
function updateSeg(i, key, val) {
  const s = store.getState();
  const dur = s.info?.duration || val;
  const v = Math.max(0, Math.min(dur, val));
  const ns = s.segments.map((g, k) => k === i ? { ...g, [key]: v } : g);
  if (ns[i].end - ns[i].start < MIN_SEG) {
    store.set({ msg: t("err_short", "\xDAsek je pr\xEDli\u0161 kr\xE1tky.") });
    return;
  }
  update({ segments: ns, msg: "", previewPath: null });
}
function resetAll() {
  update({ ...initialEdit() });
  store.set({ msg: "" });
}
async function pickMusic() {
  const p = await api.pickFiles(AUDIO_FILTERS, false);
  const file = Array.isArray(p) ? p[0] : p;
  if (file) {
    const s = store.getState();
    update({ music: { path: file, volume: s.music?.volume ?? 30, mode: s.music?.mode || "mix" } });
  }
}
async function renderCutPreview() {
  const s = store.getState();
  if (!s.mediaPath || !s.segments.length || s.previewBusy) return;
  store.set({ previewBusy: true, msg: t("rendering", "Vykres\u013Eujem n\xE1h\u013Ead\u2026") });
  try {
    const segs = s.segments.map((g, i) => ({
      start: g.start,
      end: g.end,
      grade: segGrade(s.cuts[i - 1], s.cuts[i], g.end - g.start) || void 0
    }));
    const total = s.segments.reduce((a, g) => a + (g.end - g.start), 0);
    const vf = buildPresetVf(s.presetId, s.intensity);
    let aGraph = null, extraInputs = null;
    if (s.music?.path) {
      const v = clamp01((s.music.volume ?? 30) / 100).toFixed(3);
      if (s.music.mode === "replace" || s.info?.has_audio === false) {
        aGraph = `[1:a]aloop=loop=-1:size=2000000000,atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${v}[aout]`;
      } else {
        aGraph = `[0:a:0]volume=1.0[oa];[1:a]aloop=loop=-1:size=2000000000,volume=${v}[ma];[oa][ma]amix=inputs=2:duration=first:normalize=0[aout]`;
      }
      extraInputs = [s.music.path];
    }
    const out = await api.invoke("proxy_preview", {
      input: s.mediaPath,
      vf: vf || null,
      filterComplex: null,
      extraInputs,
      seconds: Math.min(total, 86400),
      maxWidth: 640,
      af: null,
      aGraph,
      segments: segs,
      withAudio: true
    });
    store.set({ previewPath: out, previewBusy: false, msg: `\u2713 ${t("preview_ready", "N\xE1h\u013Ead zostrihu pripraven\xFD")}` });
  } catch (e) {
    store.set({ previewBusy: false, msg: String(e) });
  }
}
async function analyzeAuto() {
  const s = store.getState();
  if (!s.mediaPath || s.autoBusy) return;
  store.set({ autoBusy: true, msg: t("auto_analyzing", "Analyzujem z\xE1bery\u2026") });
  try {
    const segs = s.segments.length ? s.segments : [{ start: 0, end: s.info?.duration || 10 }];
    const samples = [];
    for (const seg of segs.slice(0, 4)) {
      samples.push(seg.start + (seg.end - seg.start) * 0.3, (seg.start + seg.end) / 2, seg.start + (seg.end - seg.start) * 0.7);
    }
    let sumL = 0, sumL2 = 0, sumS = 0, sumW = 0, n = 0;
    for (const ts of samples.slice(0, 6)) {
      const raw = await api.invoke("video_thumbnail", { path: s.mediaPath, atSeconds: ts, maxWidth: 160, vf: null });
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
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
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
    if (!n) throw new Error("no frames");
    const meanL = sumL / n, stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
    const meanS = sumS / n, warm = sumW / n;
    let pid, it;
    if (stdL < 40) {
      pid = "reels";
      it = 0.7 + (40 - stdL) / 60;
    } else if (meanS < 0.24) {
      pid = "reels";
      it = 0.8;
    } else if (meanL < 80) {
      pid = "matte";
      it = 0.7;
    } else if (warm > 25) {
      pid = "studio";
      it = 0.65;
    } else if (warm < -15) {
      pid = "warm";
      it = 0.6;
    } else {
      pid = "film";
      it = 0.65;
    }
    update({ presetId: pid, intensity: +clamp01(it).toFixed(2), msg: `\u2728 ${t("preset_" + pid, pid)} ${Math.round(clamp01(it) * 100)} %` });
  } catch (e) {
    store.set({ msg: t("err_frames", "Sn\xEDmky videa sa nepodarilo na\u010D\xEDta\u0165.") });
  } finally {
    store.set({ autoBusy: false });
  }
}
function ReelsPanel() {
  const s = useStore();
  useEffect2(() => {
    const check = () => {
      const m = api.getEditorMedia();
      const p = m?.kind === "video" ? m.path : null;
      if (p && p !== store.getState().mediaPath) loadMedia(p);
      if (!p && store.getState().mediaPath) store.set({ mediaPath: null, info: null, thumbs: null });
    };
    check();
    const iv = setInterval(check, 1500);
    return () => clearInterval(iv);
  }, []);
  const btn = "px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40";
  const btnA = "px-2 py-1 rounded-md text-[11px] font-medium bg-accent hover:bg-accent/90 text-white disabled:opacity-40";
  const inp = "w-16 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]";
  if (!s.mediaPath) {
    return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-3 text-[11px] text-text-dim" }, "\u{1F3AC} ", /* @__PURE__ */ react_shim_default.createElement("b", null, "Reels"), /* @__PURE__ */ react_shim_default.createElement("p", { className: "mt-2" }, t("no_media", "Najprv otvor video v Editore.")));
  }
  const duration = s.info?.duration || Math.max(0, ...s.segments.map((g) => g.end)) || 1;
  const total = s.segments.reduce((a, g) => a + (g.end - g.start), 0);
  const thumbCount = s.thumbs?.count || 0;
  const shown = Math.min(thumbCount || 0, 24);
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-3 flex flex-col gap-3 text-[11px]" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("span", null, "\u{1F3AC} ", /* @__PURE__ */ react_shim_default.createElement("b", null, "Reels")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1 truncate text-text-dim", title: s.mediaPath }, baseName(s.mediaPath))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "relative h-12 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 select-none" }, thumbCount > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute inset-0 flex" }, Array.from({ length: shown }).map((_, i) => /* @__PURE__ */ react_shim_default.createElement(
    "img",
    {
      key: i,
      src: api.fileSrc(`${s.thumbs.dir}/t${String(Math.floor(i * thumbCount / shown) + 1).padStart(4, "0")}.jpg`),
      className: "h-full flex-1 object-cover min-w-0",
      draggable: false,
      alt: ""
    }
  ))), s.segments.map((g, i) => /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      key: i,
      onClick: () => store.set({ sel: s.sel === i ? -1 : i }),
      className: `absolute top-0 bottom-0 border-y-2 cursor-pointer ${s.sel === i ? "bg-accent/40 border-accent" : "bg-emerald-500/30 border-emerald-500"}`,
      style: { left: `${g.start / duration * 100}%`, width: `${(g.end - g.start) / duration * 100}%` }
    }
  )), s.pendingIn != null && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute top-0 bottom-0 w-0.5 bg-yellow-400", style: { left: `${s.pendingIn / duration * 100}%` } })), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-1.5 items-center" }, /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: markIn, title: t("io_in_hint", "Ozna\u010D\xED za\u010Diatok \xFAseku na poz\xEDcii prehr\xE1va\u010Da") }, "I \xB7 ", t("io_in", "Za\u010Diatok")), /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: markOut, disabled: s.pendingIn == null, title: t("io_out_hint", "Uzavrie \xFAsek na poz\xEDcii prehr\xE1va\u010Da") }, "O \xB7 ", t("io_out", "Koniec")), /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: () => store.set({ pendingIn: null, msg: "" }), disabled: s.pendingIn == null }, "\u2715"), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1 text-right text-text-dim" }, s.segments.length > 0 ? `${t("marked", "Ozna\u010Den\xE9")}: ${s.segments.length} \xB7 ${fmtTime(total)}` : "")), s.msg ? /* @__PURE__ */ react_shim_default.createElement("div", { className: s.msg.startsWith("\u2713") || s.msg.startsWith("\u25B8") || s.msg.startsWith("\u2728") ? "text-emerald-400" : "text-amber-400" }, s.msg) : null, s.segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: renderCutPreview, disabled: s.previewBusy }, s.previewBusy ? `\u23F3 ${t("rendering", "Vykres\u013Eujem n\xE1h\u013Ead\u2026")}` : `\u25B6 ${t("preview", "N\xE1h\u013Ead zostrihu")}`), s.previewPath && /* @__PURE__ */ react_shim_default.createElement("video", { key: s.previewPath, src: api.fileSrc(s.previewPath), controls: true, autoPlay: true, className: "w-full rounded-md bg-black max-h-48" })), s.segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-col gap-1" }, s.segments.map((g, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i, className: `rounded-md border px-2 py-1.5 ${s.sel === i ? "border-accent bg-accent/10" : "border-zinc-800"}` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-1.5 cursor-pointer", onClick: () => store.set({ sel: s.sel === i ? -1 : i }) }, /* @__PURE__ */ react_shim_default.createElement("b", null, i + 1, "."), /* @__PURE__ */ react_shim_default.createElement("span", null, fmtTime(g.start), " \u2013 ", fmtTime(g.end)), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1" }), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-red-400 hover:text-red-300", onClick: (e) => {
    e.stopPropagation();
    removeSeg(i);
  } }, "\u2715")), s.sel === i && /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-1.5 flex flex-col gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("start", "Za\u010Diatok")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "number", step: "0.1", min: "0", className: inp, value: g.start.toFixed(1), onChange: (e) => updateSeg(i, "start", parseFloat(e.target.value)) }), /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("end", "Koniec")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "number", step: "0.1", min: "0", className: inp, value: g.end.toFixed(1), onChange: (e) => updateSeg(i, "end", parseFloat(e.target.value)) })), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("transition", "Prechod za \xFAsekom")), /* @__PURE__ */ react_shim_default.createElement("select", { className: "flex-1 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]", value: s.cuts[i] || "none", onChange: (e) => {
    const nc = [...s.cuts];
    nc[i] = e.target.value;
    update({ cuts: nc });
  }, disabled: i >= s.segments.length - 1 }, TRANSITIONS.map((id) => /* @__PURE__ */ react_shim_default.createElement("option", { key: id, value: id }, t("tr_" + id, id))))))))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-col gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim" }, t("presets", "Look")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1" }), /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: analyzeAuto, disabled: s.autoBusy }, "\u2728 ", t("auto", "Automatick\xFD"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-3 gap-1" }, ["none", ...PRESETS.map((p) => p.id)].map((id) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: id,
      onClick: () => update({ presetId: id }),
      className: `px-1 py-1.5 rounded-md border text-[10px] ${s.presetId === id ? "border-accent bg-accent/15 text-accent" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`
    },
    t("preset_" + id, id)
  ))), s.presetId !== "none" && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("intensity", "Intenzita")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "range", min: "10", max: "100", value: Math.round(s.intensity * 100), className: "flex-1", onChange: (e) => update({ intensity: parseInt(e.target.value, 10) / 100 }) }), /* @__PURE__ */ react_shim_default.createElement("span", { className: "w-8 text-right" }, Math.round(s.intensity * 100), " %"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-col gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim" }, t("music", "Hudba")), s.music?.path ? /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1 truncate", title: s.music.path }, "\u266A ", baseName(s.music.path)), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-red-400 hover:text-red-300", onClick: () => update({ music: null }) }, "\u2715")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("music_volume", "Hlasitos\u0165")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "range", min: "0", max: "100", value: s.music.volume ?? 30, className: "flex-1", onChange: (e) => update({ music: { ...s.music, volume: parseInt(e.target.value, 10) } }) }), /* @__PURE__ */ react_shim_default.createElement("span", { className: "w-8 text-right" }, s.music.volume ?? 30, " %")), /* @__PURE__ */ react_shim_default.createElement("select", { className: "px-1.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-[11px]", value: s.music.mode || "mix", onChange: (e) => update({ music: { ...s.music, mode: e.target.value } }) }, /* @__PURE__ */ react_shim_default.createElement("option", { value: "mix" }, t("music_mix", "Zmie\u0161a\u0165 s p\xF4vodn\xFDm zvukom")), /* @__PURE__ */ react_shim_default.createElement("option", { value: "replace" }, t("music_replace", "Nahradi\u0165 zvuk")))) : /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: pickMusic }, "\u266A ", t("music_pick", "Vybra\u0165 hudbu\u2026"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: () => api.exportEditor(), disabled: !s.segments.length && s.presetId === "none" && !s.music }, t("export", "Exportova\u0165\u2026")), /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: resetAll, disabled: !s.segments.length && s.presetId === "none" && !s.music }, t("reset", "Reset"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-text-dim text-[10px]" }, t("hint", "Zmeny sa aplikuj\xFA okam\u017Eite \u2014 n\xE1h\u013Ead Editora ukazuje re\xE1lny v\xFDsledok.")));
}
api.registerEditorPanel(ReelsPanel);
