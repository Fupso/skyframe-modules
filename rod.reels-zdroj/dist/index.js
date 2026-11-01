// react-shim.js
var React = window.React;
var react_shim_default = React;
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
var { useState: useState2, useEffect: useEffect2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
var AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }];
var PRESETS = [
  { id: "cisty", icon: "\u2728", r: [[0, 0], [0.25, 0.26], [0.5, 0.51], [0.75, 0.76], [1, 1]], sat: 1.06 },
  { id: "zivy", icon: "\u{1F308}", r: [[0, 0], [0.25, 0.235], [0.5, 0.5], [0.75, 0.765], [1, 1]], sat: 1.28 },
  { id: "filmovy", icon: "\u{1F3AC}", r: [[0, 0], [0.5, 0.47], [1, 1]], g: [[0, 0], [0.5, 0.5], [1, 1]], b: [[0, 0.05], [0.5, 0.5], [1, 0.94]], sat: 0.96 },
  { id: "matny", icon: "\u{1F32B}\uFE0F", r: [[0, 0.06], [0.5, 0.53], [1, 0.97]], sat: 0.9 },
  { id: "kontrastny", icon: "\u26A1", r: [[0, 0], [0.25, 0.19], [0.5, 0.5], [0.75, 0.81], [1, 1]], sat: 1.08 },
  { id: "teply", icon: "\u{1F305}", r: [[0, 0], [0.5, 0.53], [1, 1]], g: [[0, 5e-3], [0.5, 0.5], [1, 0.99]], b: [[0, 0], [0.5, 0.46], [1, 0.93]], sat: 1.05 }
];
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}
function buildPresetVf(presetId, intensity) {
  const p = PRESETS.find((x) => x.id === presetId) || PRESETS[0];
  const it = clamp01(intensity);
  const chan = (pts) => (pts || p.r).map(([x, y]) => `${x.toFixed(3)}/${(x + (y - x) * it).toFixed(3)}`).join(" ");
  const parts = [`curves=r='${chan(p.r)}':g='${chan(p.g)}':b='${chan(p.b)}'`];
  const sat = 1 + (p.sat - 1) * it;
  if (Math.abs(sat - 1) > 5e-3) parts.push(`eq=saturation=${sat.toFixed(3)}`);
  return parts.join(",");
}
var initialState = {
  clips: [],
  mode: "strop",
  // strop | high | whole
  targetSecs: 30,
  // len režim high
  margin: 1.5,
  // rezerva na hraniciach strihu (režim strop), sekundy
  aspect: "9:16",
  music: null,
  loopMusic: true,
  platform: "tiktok",
  presetId: "filmovy",
  intensity: 0.7,
  aiPick: null,
  working: null,
  result: null,
  resultInfo: null,
  resultStamp: 0,
  jobs: [],
  running: false,
  stage: "",
  error: "",
  log: [],
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
function log(msg) {
  store.setState((s) => ({ log: [...s.log.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${msg}`] }));
}
function resetResult() {
  store.setState({ result: null, resultInfo: null, resultStamp: 0, working: null, jobs: [], error: "" });
}
function watchJob(jobId) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      store.setState((s) => ({ jobs: s.jobs.map((j) => j.id === jobId ? job : j) }));
      if (job.status !== "running") {
        unlisten?.();
        resolve(job);
      }
    }).then((u) => {
      unlisten = u;
    });
  });
}
function pushJob(label) {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  store.setState((s) => ({ jobs: [...s.jobs, { id, label, status: "running", progress: 0, message: "", result: null }] }));
  return id;
}
function swapJobId(oldId, newId) {
  store.setState((s) => ({ jobs: s.jobs.map((j) => j.id === oldId ? { ...j, id: newId } : j) }));
}
async function ceilingSegments(path, marginSec) {
  const info = await api.invoke("get_video_info", { path });
  const dur = info?.duration || 0;
  if (dur < 6) return [[0, dur]];
  const count = Math.max(50, Math.min(800, Math.ceil(dur * 1.5)));
  const strip = await api.invoke("video_thumbs_strip", { path, count });
  const dir = strip.dir, n = strip.count;
  const dt = dur / n;
  const W = 48;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const cov = new Array(n).fill(0);
  const uni = new Array(n).fill(0);
  let prev = null;
  for (let i = 1; i <= n; i++) {
    const fp = `${dir}/t${String(i).padStart(4, "0")}.jpg`;
    let gray = null;
    try {
      const bytes = await api.readFileBytes(fp);
      const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      const img = new Image();
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
      const h = Math.max(1, Math.round(img.naturalHeight / img.naturalWidth * W));
      cv.width = W;
      cv.height = h;
      ctx.drawImage(img, 0, 0, W, h);
      const d = ctx.getImageData(0, 0, W, h).data;
      const m = W * h;
      gray = new Float32Array(m);
      let sL = 0, sL2 = 0;
      for (let j = 0, p = 0; j < d.length; j += 4, p++) {
        const L = 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2];
        gray[p] = L;
        sL += L;
        sL2 += L * L;
      }
      uni[i - 1] = Math.sqrt(Math.max(0, sL2 / m - sL / m * (sL / m)));
      if (prev && prev.length === m) {
        let ch = 0;
        for (let p = 0; p < m; p++) if (Math.abs(gray[p] - prev[p]) > 25) ch++;
        cov[i - 1] = ch / m;
      }
    } catch {
    }
    prev = gray;
    if (i % 25 === 0) store.setState({ stage: `${t("stage_analyze", "Analyzujem z\xE1ber\u2026")} ${Math.round(i / n * 100)} %` });
  }
  const manip = cov.map((c, i) => c > 0.55 || uni[i] > 0 && uni[i] < 12);
  for (let i = 1; i < n - 1; i++) {
    if (!manip[i] && manip[i - 1] && manip[i + 1]) manip[i] = true;
  }
  const segs = [];
  let s0 = -1;
  for (let i = 0; i <= n; i++) {
    const isM = i < n ? manip[i] : true;
    if (!isM && s0 < 0) s0 = i;
    if (isM && s0 >= 0) {
      const a = s0 * dt + marginSec, b = i * dt - marginSec;
      if (b - a >= 4) segs.push([+a.toFixed(2), +b.toFixed(2)]);
      s0 = -1;
    }
  }
  return segs.length ? segs : null;
}
async function runPipeline() {
  const s = store.getState();
  if (!s.clips.length || s.running) return;
  store.setState({ running: true, error: "", result: null, resultInfo: null, jobs: [], stage: "" });
  try {
    const paths = await api.invoke("get_app_paths");
    const tempDir = paths.temp_dir;
    let work = null;
    if (s.mode === "strop") {
      const cutFiles = [];
      for (let ci = 0; ci < s.clips.length; ci++) {
        const clip = s.clips[ci];
        store.setState({ stage: `${t("stage_analyze", "Analyzujem z\xE1ber\u2026")} (${ci + 1}/${s.clips.length})` });
        log(`\u25B6 ${t("stage_analyze", "Analyzujem z\xE1ber\u2026")} ${baseName(clip)}`);
        const segs = await ceilingSegments(clip, s.margin);
        if (!segs) {
          log(`\u26A0 ${baseName(clip)}: ${t("no_segments", "\u017Eiadny stabiln\xFD \xFAsek \u2014 beriem cel\xFD klip")}`);
          cutFiles.push(clip);
          continue;
        }
        log(`\u2713 ${baseName(clip)}: ${segs.length} ${t("segments", "\xFAsekov")} (${segs.map(([a, b]) => `${a.toFixed(0)}\u2013${b.toFixed(0)} s`).join(", ")})`);
        for (let si = 0; si < segs.length; si++) {
          const [a, b] = segs[si];
          store.setState({ stage: `${t("stage_cut", "Vystrihujem \xFAseky\u2026")} ${ci + 1}.${si + 1}` });
          const jid = pushJob(`${t("stage_cut", "Strih")} ${ci + 1}.${si + 1}`);
          const jobId = await api.invoke("trim_video", {
            input: clip,
            start: a,
            end: b,
            mode: "precise",
            outputName: `reels-cut-${ci}-${si}`,
            outputDir: tempDir,
            moduleId: api.moduleId
          });
          swapJobId(jid, jobId);
          const res = await watchJob(jobId);
          if (res.status !== "done" || !res.result) throw new Error(res.message || "trim");
          cutFiles.push(res.result);
        }
      }
      if (cutFiles.length === 1) {
        work = cutFiles[0];
      } else {
        store.setState({ stage: t("stage_merge", "Sp\xE1jam klipy\u2026") });
        const jid = pushJob(t("stage_merge", "Sp\xE1jam klipy"));
        const jobId = await api.invoke("merge_videos", {
          files: cutFiles,
          outputName: "reels-src",
          music: null,
          moduleId: api.moduleId,
          outputDir: tempDir,
          loopMusic: false
        });
        swapJobId(jid, jobId);
        log(`\u25B6 ${t("stage_merge", "Sp\xE1jam klipy")} (${cutFiles.length})`);
        const res = await watchJob(jobId);
        if (res.status !== "done" || !res.result) throw new Error(res.message || t("merge_failed", "Spojenie zlyhalo"));
        work = res.result;
        log(`\u2713 ${baseName(work)}`);
      }
      store.setState({ working: work });
    } else {
      work = s.clips[0];
      if (s.clips.length > 1) {
        store.setState({ stage: t("stage_merge", "Sp\xE1jam klipy\u2026") });
        const jid = pushJob(t("stage_merge", "Sp\xE1jam klipy"));
        const jobId = await api.invoke("merge_videos", {
          files: s.clips,
          outputName: "reels-src",
          music: null,
          moduleId: api.moduleId,
          outputDir: tempDir,
          loopMusic: false
        });
        swapJobId(jid, jobId);
        log(`\u25B6 ${t("stage_merge", "Sp\xE1jam klipy")} (${s.clips.length})`);
        const res = await watchJob(jobId);
        if (res.status !== "done" || !res.result) throw new Error(res.message || t("merge_failed", "Spojenie zlyhalo"));
        work = res.result;
        store.setState({ working: work });
        log(`\u2713 ${baseName(work)}`);
      }
      const info = await api.invoke("get_video_info", { path: work });
      const dur = info?.duration || 0;
      if (s.mode === "high") {
        if (dur > s.targetSecs + 5) {
          store.setState({ stage: t("stage_highlights", "H\u013Ead\xE1m najlep\u0161ie momenty\u2026") });
          const jid = pushJob(t("stage_highlights", "Zostrih highlightov"));
          try {
            const jobId = await api.invoke("auto_highlights", {
              input: work,
              targetSecs: s.targetSecs,
              moduleId: api.moduleId
            });
            swapJobId(jid, jobId);
            log(`\u25B6 ${t("stage_highlights", "Zostrih highlightov")} \u2192 ${s.targetSecs} s`);
            const res = await watchJob(jobId);
            if (res.status !== "done" || !res.result) throw new Error(res.message || "highlights");
            work = res.result;
            log(`\u2713 ${baseName(work)}`);
          } catch (e) {
            log(`\u26A0 ${t("highlights_skipped", "Zostrih presko\u010Den\xFD \u2014 pou\u017Eije sa cel\xE9 video")}`);
            store.setState((st) => ({ jobs: st.jobs.filter((j) => j.id !== jid) }));
          }
        } else {
          log(`\u2139 ${t("short_video", "Video je krat\u0161ie ako cie\u013E \u2014 pou\u017Eije sa cel\xE9")}`);
        }
      } else {
        log(`\u2139 ${t("whole_video", "Re\u017Eim Cel\xE9 \u2014 video sa neskracuje")}`);
      }
    }
    let framed = work;
    if (s.aspect !== "orig") {
      store.setState({ stage: t("stage_reframe", "Re\u017Eem na form\xE1t\u2026") });
      const jid = pushJob(`Auto Reframe ${s.aspect}`);
      const jobId = await api.invoke("auto_reframe", {
        input: work,
        aspect: s.aspect,
        moduleId: api.moduleId,
        track: null
      });
      swapJobId(jid, jobId);
      log(`\u25B6 Auto Reframe ${s.aspect}`);
      const res = await watchJob(jobId);
      if (res.status !== "done" || !res.result) throw new Error(res.message || "reframe");
      framed = res.result;
      log(`\u2713 ${baseName(framed)}`);
    }
    let final = framed;
    if (s.music) {
      store.setState({ stage: t("stage_music", "Prid\xE1vam hudbu\u2026") });
      const jid = pushJob(t("stage_music", "Hudba"));
      const jobId = await api.invoke("merge_videos", {
        files: [framed],
        outputName: "reels-music",
        music: s.music,
        moduleId: api.moduleId,
        outputDir: tempDir,
        loopMusic: s.loopMusic
      });
      swapJobId(jid, jobId);
      log(`\u25B6 ${t("stage_music", "Hudba")}: ${baseName(s.music)}`);
      const res = await watchJob(jobId);
      if (res.status !== "done" || !res.result) throw new Error(res.message || "music");
      final = res.result;
      log(`\u2713 ${baseName(final)}`);
    }
    const finfo = await api.invoke("get_video_info", { path: final });
    store.setState({ result: final, resultInfo: finfo || null, resultStamp: Date.now(), stage: "" });
    if (api.setActiveMedia) api.setActiveMedia(final);
    log(`\u2705 ${t("done", "Hotovo")}: ${baseName(final)}`);
  } catch (e) {
    const msg = String(e);
    store.setState({ error: msg, stage: "" });
    log(`\u2717 ${msg}`);
  } finally {
    store.setState({ running: false });
  }
}
async function analyzeLook() {
  const s = store.getState();
  const src = s.result || s.working || s.clips[0];
  if (!src) return;
  store.setState({ error: "" });
  try {
    log(`\u25B6 ${t("ai_analyzing", "AI anal\xFDza obrazu\u2026")}`);
    const info = await api.invoke("get_video_info", { path: src });
    const dur = info?.duration || 10;
    const times = [dur * 0.2, dur * 0.5, dur * 0.8];
    let sumL = 0, sumL2 = 0, sumS = 0, n = 0;
    for (const ts of times) {
      const raw = await api.invoke("video_thumbnail", { path: src, atSeconds: ts, maxWidth: 160 });
      let url = null, revoke = false;
      if (typeof raw === "string") url = api.fileSrc(raw);
      else if (raw) {
        url = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" }));
        revoke = true;
      }
      if (!url) continue;
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      if (revoke) URL.revokeObjectURL(url);
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
        n++;
        if (mx > 8) sumS += (mx - mn) / mx;
      }
    }
    if (!n) throw new Error("no samples");
    const meanL = sumL / n;
    const stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
    const meanS = sumS / n;
    const stats = { meanL: Math.round(meanL), stdL: Math.round(stdL), meanS: +meanS.toFixed(2) };
    let presetId = "filmovy", intensity = 0.6;
    if (stdL < 42) {
      presetId = "kontrastny";
      intensity = Math.min(1, 0.5 + (42 - stdL) / 40);
    } else if (meanS < 0.26) {
      presetId = "zivy";
      intensity = Math.min(1, 0.55 + (0.26 - meanS) * 2);
    } else if (meanL < 85) {
      presetId = "matny";
      intensity = 0.75;
    }
    store.setState({ aiPick: { presetId, intensity: +intensity.toFixed(2), stats }, presetId, intensity: +intensity.toFixed(2) });
    log(`\u2713 AI: L=${stats.meanL} \u03C3=${stats.stdL} S=${stats.meanS} \u2192 ${t("preset_" + presetId, presetId)} (${Math.round(intensity * 100)} %)`);
  } catch (e) {
    log(`\u2717 AI: ${String(e)}`);
    store.setState({ error: String(e) });
  }
}
function openInEditor() {
  const s = store.getState();
  if (!s.result) return;
  api.editMedia(s.result);
  const vf = buildPresetVf(s.presetId, s.intensity);
  setTimeout(() => {
    api.setEditorStep({ label: t("editor_step", "Reels look"), vf });
    log(`\u2192 ${t("sent_to_editor", "Otvoren\xE9 v Editore s presetom")} (${t("preset_" + s.presetId, s.presetId)})`);
  }, 700);
}
async function exportNow() {
  const s = store.getState();
  if (!s.result || s.running) return;
  const presetMap = { tiktok: "tiktok", instagram: "instagram", shorts: "tiktok", youtube: "youtube_1080" };
  const preset = presetMap[s.platform] || "tiktok";
  store.setState({ running: true, error: "" });
  try {
    const jid = pushJob(`${t("export", "Export")}: ${s.platform}`);
    const jobId = await api.invoke("convert_video", {
      input: s.result,
      preset,
      moduleId: api.moduleId,
      outputDir: null
    });
    swapJobId(jid, jobId);
    log(`\u25B6 ${t("export", "Export")} (${preset})`);
    const res = await watchJob(jobId);
    if (res.status !== "done") throw new Error(res.message || "export");
    log(`\u2705 ${t("exported", "Exportovan\xE9")}: ${res.result}`);
  } catch (e) {
    store.setState({ error: String(e) });
    log(`\u2717 ${String(e)}`);
  } finally {
    store.setState({ running: false });
  }
}
var BTN = "rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-40";
var CARD = "bg-bg-card rounded-2xl border border-border";
function ClipRow({ path, onRemove }) {
  const [thumb, setThumb] = useState2(null);
  useEffect2(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await api.invoke("video_thumbnail", { path, atSeconds: 1, maxWidth: 240 });
        if (!alive) return;
        if (typeof raw === "string") setThumb(api.fileSrc(raw));
        else if (raw) setThumb(URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" })));
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, [path]);
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-2 flex items-center gap-3` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "w-24 h-14 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center shrink-0" }, thumb ? /* @__PURE__ */ react_shim_default.createElement("img", { src: thumb, alt: "", className: "w-full h-full object-cover" }) : /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim text-lg" }, "\u{1F39E}\uFE0F")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-sm truncate" }, baseName(path))), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-text-dim hover:text-red-400 px-2", onClick: onRemove, title: t("remove", "Odstr\xE1ni\u0165") }, "\u2715"));
}
function Jobs() {
  const s = useStore();
  if (!s.jobs.length) return null;
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2" }, s.jobs.map((j) => /* @__PURE__ */ react_shim_default.createElement("div", { key: j.id, className: `${CARD} p-3` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between text-xs mb-1" }, /* @__PURE__ */ react_shim_default.createElement("span", null, j.label), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim" }, j.status === "running" ? `${Math.max(0, Math.round((j.progress ?? 0) * 100))} %` : j.status === "done" ? "\u2713" : j.status === "cancelled" ? "\u2298" : "\u2717")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-1.5 rounded bg-black/30 overflow-hidden" }, /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      className: `h-full transition-all ${j.status === "error" ? "bg-red-500" : "bg-accent"}`,
      style: { width: `${j.status === "done" ? 100 : Math.max(2, Math.round((j.progress ?? 0) * 100))}%` }
    }
  )), j.message ? /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim mt-1" }, j.message) : null)));
}
function ResultView() {
  const s = useStore();
  if (!s.result) return null;
  const info = s.resultInfo;
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-3" }, t("result", "V\xFDsledok"), " ", info ? `\xB7 ${Math.round(info.duration || 0)} s \xB7 ${info.width}\xD7${info.height}` : ""), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-center" }, /* @__PURE__ */ react_shim_default.createElement(
    "video",
    {
      key: s.resultStamp || s.result,
      src: `${api.fileSrc(s.result)}${s.result.includes("?") ? "&" : "?"}r=${s.resultStamp || 0}`,
      controls: true,
      className: "max-w-full w-auto max-h-[420px] object-contain rounded-xl bg-black"
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2 mt-3 flex-wrap" }, /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-4 py-2 text-sm`, onClick: openInEditor }, "\u2702\uFE0F ", t("open_editor", "Otvori\u0165 v Editore")), /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-4 py-2 text-sm`, onClick: exportNow, disabled: s.running }, "\u2B07\uFE0F ", t("export", "Exportova\u0165"))));
}
function SidePanel() {
  const s = useStore();
  const upd = (patch) => store.setState(patch);
  const pickMusic = async () => {
    const f = await api.pickFiles(AUDIO_FILTERS, false);
    if (f) upd({ music: Array.isArray(f) ? f[0] : f });
  };
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("mode", "Re\u017Eim strihu")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-3 gap-1" }, [["strop", t("mode_strop", "Strop")], ["high", t("mode_high", "Highlighty")], ["whole", t("mode_whole", "Cel\xE9")]].map(([v, l]) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: v,
      disabled: s.running,
      className: `py-1.5 rounded-lg text-sm border ${s.mode === v ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => upd({ mode: v })
    },
    l
  ))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim mt-1" }, s.mode === "strop" && t("mode_strop_note", "Kamera na strope: vystrihne manipul\xE1ciu (kladenie/dv\xEDhanie), nech\xE1 stabiln\xE9 \xFAseky."), s.mode === "high" && t("mode_high_note", "Najlep\u0161ie momenty pod\u013Ea pohybu a zvuku."), s.mode === "whole" && t("mode_whole_note", "Video sa neskracuje \u2014 len spojenie a \xFApravy."))), s.mode === "high" && /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("target_len", "Cie\u013Eov\xE1 d\u013A\u017Eka")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-4 gap-1" }, [15, 30, 60, 90].map((v) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: v,
      disabled: s.running,
      className: `py-1.5 rounded-lg text-sm border ${s.targetSecs === v ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => upd({ targetSecs: v })
    },
    v,
    " s"
  )))), s.mode === "strop" && /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("margin", "Rezerva strihu")), /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim" }, s.margin.toFixed(1), " s", /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "range",
      min: 0,
      max: 40,
      value: Math.round(s.margin * 10),
      disabled: s.running,
      className: "w-full",
      onChange: (e) => upd({ margin: Number(e.target.value) / 10 })
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim" }, t("margin_note", "O ko\u013Eko sek\xFAnd sa usekne naviac na ka\u017Edej strane stabiln\xE9ho \xFAseku."))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("aspect", "Form\xE1t")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-3 gap-1" }, [["9:16", "9:16"], ["1:1", "1:1"], ["orig", t("aspect_orig", "Origin\xE1l")]].map(([v, l]) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: v,
      disabled: s.running,
      className: `py-1.5 rounded-lg text-sm border ${s.aspect === v ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => upd({ aspect: v })
    },
    l
  )))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("music", "Hudba")), /* @__PURE__ */ react_shim_default.createElement("button", { className: "w-full py-2 rounded-lg border border-dashed border-border text-sm text-text-dim hover:border-accent/50", onClick: pickMusic, disabled: s.running }, s.music ? `\u{1F3B5} ${baseName(s.music)}` : `\uFF0B ${t("pick_music", "Vybra\u0165 hudbu")}`), s.music && /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-2 mt-2 text-xs text-text-dim" }, /* @__PURE__ */ react_shim_default.createElement("input", { type: "checkbox", checked: s.loopMusic, onChange: (e) => upd({ loopMusic: e.target.checked }), disabled: s.running }), t("loop_music", "Opakova\u0165 hudbu v slu\u010Dke")), s.music && /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim mt-1" }, t("music_note", "Hudba nahrad\xED p\xF4vodn\xFD zvuk videa."))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, t("look", "Obrazov\xFD preset")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      className: "text-xs text-accent hover:underline disabled:opacity-40",
      onClick: analyzeLook,
      disabled: s.running || !s.clips.length && !s.result,
      title: t("ai_hint", "Analyzuje sn\xEDmky a odporu\u010D\xED preset")
    },
    "\u2728 ",
    t("ai_pick", "AI v\xFDber")
  )), s.aiPick && /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim mb-2" }, "AI: ", t("preset_" + s.aiPick.presetId, s.aiPick.presetId), " \xB7 L=", s.aiPick.stats.meanL, " \u03C3=", s.aiPick.stats.stdL, " S=", s.aiPick.stats.meanS), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-2 gap-1" }, PRESETS.map((p) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: p.id,
      disabled: s.running,
      className: `py-1.5 px-2 rounded-lg text-xs border text-left ${s.presetId === p.id ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => upd({ presetId: p.id })
    },
    p.icon,
    " ",
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
      onChange: (e) => upd({ intensity: Number(e.target.value) / 100 })
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim" }, t("look_note", "Preset sa aplikuje pri otvoren\xED v Editore ako upravite\u013En\xFD krok."))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("platform", "Platforma")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-2 gap-1" }, [["tiktok", "TikTok"], ["instagram", "Instagram"], ["shorts", "YT Shorts"], ["youtube", "YouTube"]].map(([v, l]) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: v,
      disabled: s.running,
      className: `py-1.5 rounded-lg text-sm border ${s.platform === v ? "border-accent text-accent" : "border-border text-text-dim"}`,
      onClick: () => upd({ platform: v })
    },
    l
  )))));
}
function Reels() {
  const s = useStore();
  useEffect2(() => {
    if (s.cfgLoaded) return;
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        if (cfg && typeof cfg === "object") {
          const pick = {};
          for (const k of ["mode", "targetSecs", "margin", "aspect", "loopMusic", "platform", "presetId", "intensity"]) {
            if (cfg[k] !== void 0) pick[k] = cfg[k];
          }
          store.setState({ ...pick, cfgLoaded: true });
        } else {
          store.setState({ cfgLoaded: true });
        }
      } catch {
        store.setState({ cfgLoaded: true });
      }
    })();
  }, [s.cfgLoaded]);
  useEffect2(() => {
    if (!s.cfgLoaded) return;
    const cfg = { mode: s.mode, targetSecs: s.targetSecs, margin: s.margin, aspect: s.aspect, loopMusic: s.loopMusic, platform: s.platform, presetId: s.presetId, intensity: s.intensity };
    const tm = setTimeout(() => {
      api.invoke("set_module_config", { id: api.moduleId, config: cfg }).catch(() => {
      });
    }, 400);
    return () => clearTimeout(tm);
  }, [s.cfgLoaded, s.mode, s.targetSecs, s.margin, s.aspect, s.loopMusic, s.platform, s.presetId, s.intensity]);
  const addClips = async () => {
    const f = await api.pickFiles(VIDEO_FILTERS, true);
    if (!f) return;
    const list = Array.isArray(f) ? f : [f];
    const fresh = list.filter((p) => !state.clips.includes(p));
    if (!fresh.length) return;
    resetResult();
    store.setState((st) => ({ clips: [...st.clips, ...fresh] }));
  };
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-6 max-w-5xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ react_shim_default.createElement("h1", { className: "text-xl font-semibold" }, "\u{1F4F1} ", t("title", "Reels")), /* @__PURE__ */ react_shim_default.createElement("button", { className: `${BTN} px-5 py-2.5`, disabled: !s.clips.length || s.running, onClick: runPipeline }, s.running ? s.stage || "\u2026" : `\u{1F680} ${t("make_reel", "Vytvori\u0165 zostrih")}`)), s.error ? /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-3 text-sm text-red-400` }, "\u274C ", s.error) : null, /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, t("clips", "Klipy"), " (", s.clips.length, ")"), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-sm text-accent hover:underline disabled:opacity-40", onClick: addClips, disabled: s.running }, "\uFF0B ", t("add_clips", "Prida\u0165 vide\xE1"))), s.clips.length === 0 ? /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: addClips,
      className: "w-full py-10 rounded-xl border border-dashed border-border text-center text-text-dim hover:border-accent/40 transition-colors"
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-3xl mb-2" }, "\u{1F4F9}"),
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-sm" }, t("drop_hint", "Vlo\u017E jedno dlh\xE9 video alebo viac krat\u0161\xEDch klipov"))
  ) : /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2" }, s.clips.map((p, i) => /* @__PURE__ */ react_shim_default.createElement(ClipRow, { key: p, path: p, onRemove: () => {
    resetResult();
    store.setState((st) => ({ clips: st.clips.filter((_, j) => j !== i) }));
  } })), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-[11px] text-text-dim" }, s.mode === "strop" ? t("strop_hint", "Z ka\u017Ed\xE9ho klipu sa vyber\xFA stabiln\xE9 \xFAseky (bez kladenia a dv\xEDhania kamery) a spoja sa.") : s.clips.length > 1 ? t("merge_note", "Klipy sa najprv spoja, potom sa vyber\xFA najlep\u0161ie momenty.") : t("one_note", "Z dlh\xE9ho videa sa vyber\xFA najlep\u0161ie momenty.")))), /* @__PURE__ */ react_shim_default.createElement(Jobs, null), /* @__PURE__ */ react_shim_default.createElement(ResultView, null), s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: `${CARD} p-4` }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("log", "Log")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, s.log.map((line, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, line)))));
}
if (api.registerSidePanel) api.registerSidePanel(SidePanel);
var index_default = Reels;
export {
  index_default as default
};
