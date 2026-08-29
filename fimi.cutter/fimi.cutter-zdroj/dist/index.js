// ../cutter-build/react-shim.js
var R = window.React;
var react_shim_default = R;
var useState = R.useState;
var useEffect = R.useEffect;
var useMemo = R.useMemo;
var useRef = R.useRef;
var useCallback = R.useCallback;
var useSyncExternalStore = R.useSyncExternalStore;
var Fragment = R.Fragment;

// index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useMemo: useMemo2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
var AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }];
var SEG_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6"];
var START_COLOR = "#22c55e";
var END_COLOR = "#ef4444";
var THUMB_COUNT = 16;
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
function fmtTime(s) {
  const v = Math.max(0, s);
  const h = Math.floor(v / 3600);
  const m = Math.floor(v % 3600 / 60);
  const sec = v % 60;
  const base = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${Math.floor(sec).toString().padStart(2, "0")}`;
  const tenth = Math.round((sec - Math.floor(sec)) * 10);
  return tenth ? `${base}.${tenth}` : base;
}
function parseTime(str) {
  const parts = str.trim().split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map(parseFloat);
    if ([h, m, s].every((n) => !isNaN(n))) return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map(parseFloat);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const sec = parseFloat(str);
  return isNaN(sec) ? 0 : sec;
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
var initialState = {
  video: null,
  // { path, info } | null
  videoDuration: 0,
  // fallback dĺžka z <video>
  selStart: 0,
  selEnd: 0,
  playhead: 0,
  scrubbing: false,
  activeHandle: null,
  // "start" | "end" | null
  segments: [],
  // { id, start, end }[]
  mode: "copy",
  // "copy" | "precise"
  mergeAfter: false,
  withMusic: false,
  music: null,
  // cesta | null
  loopMusic: true,
  outputName: "cut",
  outDir: "",
  jobs: [],
  // JobInfo-like[]
  log: [],
  // string[]
  error: "",
  restored: false
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
var shared = {
  playerBox: null,
  // DOM box s <video> z PlayerShell (nastavuje Main)
  cancelFlag: { current: false },
  stripEl: null
  // interaktívna vrstva timeline (nastavuje Timeline)
};
function log(msg) {
  store.setState((s) => ({
    log: [...s.log.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${msg}`]
  }));
}
function duration() {
  const s = store.getState();
  return (s.video?.info?.duration ?? 0) > 0 ? s.video.info.duration : s.videoDuration;
}
function getVideoEl() {
  return shared.playerBox?.querySelector("video") ?? null;
}
function seek(tSec) {
  const g = duration();
  const v = getVideoEl();
  if (v) {
    try {
      v.pause();
      v.currentTime = Math.max(0, Math.min(g || v.duration || tSec, tSec));
    } catch {
    }
  }
  store.setState({ playhead: Math.max(0, Math.min(g || tSec, tSec)) });
}
function busy() {
  return store.getState().jobs.some((j) => j.status === "running");
}
if (api.registerToolbar) {
  api.registerToolbar([
    {
      id: "open",
      icon: "\u{1F4C2}",
      labelKey: "tool_open",
      onClick: () => {
        if (!busy()) void pickVideo();
      }
    },
    {
      id: "add",
      icon: "\u2795",
      labelKey: "tool_add",
      onClick: () => addSegment()
    },
    {
      id: "export",
      icon: "\u2B07\uFE0F",
      labelKey: "tool_export",
      onClick: () => {
        if (!busy()) void exportAll();
      }
    }
  ]);
}
async function pickVideo() {
  const selected = await api.pickFiles(VIDEO_FILTERS, false);
  if (!selected || Array.isArray(selected)) return;
  let info = null;
  try {
    info = await api.invoke("get_video_info", { path: selected });
  } catch {
  }
  store.setState({
    video: { path: selected, info },
    videoDuration: 0,
    selStart: 0,
    selEnd: info?.duration ?? 0,
    playhead: 0,
    segments: [],
    jobs: [],
    error: ""
  });
  log(`${t("loaded", "Na\u010D\xEDtan\xE9")}: ${baseName(selected)}${info ? ` (${fmtTime(info.duration)}, ${info.width}\xD7${info.height})` : ""}`);
}
function addSegment() {
  const s = store.getState();
  if (!s.video || s.selEnd - s.selStart < 0.1) return;
  if (s.segments.some((seg) => Math.abs(seg.start - s.selStart) < 0.5 && Math.abs(seg.end - s.selEnd) < 0.5)) {
    store.setState({ error: t("seg_exists", "Tento \xFAsek u\u017E existuje.") });
    return;
  }
  store.setState((st) => ({
    error: "",
    segments: [...st.segments, { id: uid(), start: st.selStart, end: st.selEnd }].sort((a, b) => a.start - b.start)
  }));
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
function pushPendingJob(label) {
  store.setState((s) => ({
    jobs: [
      ...s.jobs,
      {
        id: `pending-${uid()}`,
        moduleId: api.moduleId,
        label,
        status: "running",
        progress: -1,
        message: t("queued", "\u010Cak\xE1 v rade"),
        result: null
      }
    ]
  }));
}
function resolvePendingJob(label, jobId) {
  store.setState((s) => ({
    jobs: s.jobs.map(
      (j) => j.label === label && j.id.startsWith("pending") ? { ...j, id: jobId, progress: 0, message: "" } : j
    )
  }));
}
async function runMerge(files, outName, music, outDir) {
  pushPendingJob(outName);
  const jobId = await api.invoke("merge_videos", {
    files,
    outputName: outName,
    music,
    moduleId: api.moduleId,
    outputDir: outDir,
    loopMusic: store.getState().loopMusic
  });
  resolvePendingJob(outName, jobId);
  log(`\u25B6 ${outName} (${files.length} ${t("pieces", "dielov")}${music ? " + hudba" : ""})`);
  const res = await watchJob(jobId);
  if (res.status === "done" && res.result) {
    log(`\u2713 ${res.result}`);
    return res.result;
  }
  if (res.status === "error") {
    store.setState({ error: res.message });
    log(`\u2717 ${res.message}`);
  } else {
    log(`\u2298 ${outName}`);
  }
  return null;
}
async function exportAll() {
  const s = store.getState();
  if (!s.video || s.segments.length === 0) return;
  store.setState({ error: "" });
  shared.cancelFlag.current = false;
  const name = s.outputName.trim() || "cut";
  const outDir = s.outDir || null;
  const withMusic = s.withMusic && !!s.music;
  const partNames = s.segments.map(
    (_, i) => withMusic || s.mergeAfter ? `${name}_${i + 1}_tmp` : `${name}_${i + 1}`
  );
  store.setState({
    jobs: s.segments.map((_, i) => ({
      id: `pending-${i}`,
      moduleId: api.moduleId,
      label: partNames[i],
      status: "running",
      progress: -1,
      message: t("queued", "\u010Cak\xE1 v rade"),
      result: null
    }))
  });
  log(`${t("export_start", "Exportujem")} ${s.segments.length} ${t("pieces", "dielov")}\u2026`);
  const outputs = [];
  for (let i = 0; i < s.segments.length && !shared.cancelFlag.current; i++) {
    const seg = s.segments[i];
    try {
      const jobId = await api.invoke("trim_video", {
        input: s.video.path,
        start: seg.start,
        end: seg.end,
        mode: s.mode,
        outputName: partNames[i],
        outputDir: outDir,
        moduleId: api.moduleId
      });
      store.setState((st) => {
        const jobs = [...st.jobs];
        jobs[i] = { ...jobs[i], id: jobId, progress: 0, message: "" };
        return { jobs };
      });
      log(`\u25B6 ${partNames[i]} (${fmtTime(seg.start)} \u2192 ${fmtTime(seg.end)})`);
      const res = await watchJob(jobId);
      if (res.status === "done" && res.result) {
        outputs.push(res.result);
        log(`\u2713 ${res.result}`);
      } else if (res.status === "error") {
        log(`\u2717 ${partNames[i]}: ${res.message}`);
        store.setState({ error: res.message });
        return;
      } else {
        log(`\u2298 ${partNames[i]}`);
        return;
      }
    } catch (e) {
      store.setState({ error: String(e) });
      log(String(e));
      return;
    }
  }
  if (shared.cancelFlag.current || outputs.length === 0) return;
  try {
    if (s.mergeAfter) {
      await runMerge(outputs, `${name}_merged`, withMusic ? s.music : null, outDir);
    } else if (withMusic) {
      for (let i = 0; i < outputs.length && !shared.cancelFlag.current; i++) {
        await runMerge([outputs[i]], `${name}_${i + 1}`, s.music, outDir);
      }
    }
  } catch (e) {
    store.setState({ error: String(e) });
    log(String(e));
  }
  log(t("export_done", "Export dokon\u010Den\xFD."));
}
async function cancelAll() {
  shared.cancelFlag.current = true;
  for (const j of store.getState().jobs) {
    if (j.status === "running" && !j.id.startsWith("pending")) {
      await api.cancelJob(j.id);
    }
  }
}
function resetAll() {
  store.setState({
    ...initialState,
    restored: true,
    outDir: store.getState().outDir
  });
}
function Handle({ which }) {
  const s = useStore();
  const g = duration();
  const time = which === "start" ? s.selStart : s.selEnd;
  const color = which === "start" ? START_COLOR : END_COLOR;
  const pct = g > 0 ? time / g * 100 : 0;
  const onPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    store.setState({ activeHandle: which });
    const onMove = (ev) => {
      const tSec = clientXToTime(ev.clientX);
      if (which === "start") {
        store.setState((st) => {
          const v = Math.min(tSec, st.selEnd - 0.1);
          return v >= 0 ? { selStart: v } : {};
        });
      } else {
        store.setState((st) => {
          const v = Math.max(tSec, st.selStart + 0.1);
          return v <= g ? { selEnd: v } : {};
        });
      }
      seek(tSec);
    };
    const onUp = () => {
      store.setState({ activeHandle: null });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      onPointerDown,
      className: "absolute z-20 cursor-ew-resize touch-none",
      style: { left: `calc(${pct}% - 11px)`, width: 22, top: -8, bottom: -8 }
    },
    /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        className: "absolute left-1/2 -translate-x-1/2 rounded",
        style: { top: 0, bottom: 0, width: 4, backgroundColor: color, boxShadow: "0 0 6px rgba(0,0,0,0.8)" }
      }
    ),
    /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        className: "absolute left-1/2 flex flex-col items-center justify-center gap-[3px] rounded-md border",
        style: {
          top: "50%",
          transform: `translate(-50%, -50%)${s.activeHandle === which ? " scale(1.15)" : ""}`,
          width: 22,
          height: 36,
          backgroundColor: color,
          borderColor: "rgba(255,255,255,0.5)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)"
        }
      },
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } }),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } }),
      /* @__PURE__ */ react_shim_default.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } })
    ),
    s.activeHandle === which && /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        className: "absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap pointer-events-none",
        style: { top: -30, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", zIndex: 30 }
      },
      which === "start" ? "\u25B6 " : "\u25C0 ",
      fmtTime(time)
    )
  );
}
function clientXToTime(clientX) {
  const el = shared.stripEl;
  const g = duration();
  if (!el || g <= 0) return 0;
  const rect = el.getBoundingClientRect();
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * g;
}
function Timeline() {
  const s = useStore();
  const canvasRef = useRef2(null);
  const stripRef = useRef2(null);
  const g = duration();
  const pct = (time) => `${g > 0 ? time / g * 100 : 0}%`;
  useEffect2(() => {
    if (!s.video || g <= 0) return;
    let disposed = false;
    let pollTimer = null;
    let stopTimer = null;
    const startPainting = (src) => {
      const canvas = canvasRef.current;
      if (!canvas || disposed) return;
      const W = 960;
      const H = 56;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "auto";
      const tileW = W / THUMB_COUNT;
      const paintTile = (i) => {
        if (disposed || i >= THUMB_COUNT) return;
        const time = Math.min(Math.max(0.05, (i + 0.5) / THUMB_COUNT * g), Math.max(0.05, g - 0.05));
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          v.removeEventListener("seeked", onSeeked);
          try {
            const vw = v.videoWidth;
            const vh = v.videoHeight;
            if (vw && vh && !disposed) {
              const scale = Math.max(tileW / vw, H / vh);
              const dw = vw * scale;
              const dh = vh * scale;
              ctx.drawImage(v, i * tileW + (tileW - dw) / 2, (H - dh) / 2, dw, dh);
            }
          } catch {
          }
          paintTile(i + 1);
        };
        const onSeeked = () => finish();
        v.addEventListener("seeked", onSeeked);
        setTimeout(finish, 900);
        try {
          v.currentTime = time;
        } catch {
          finish();
        }
      };
      v.addEventListener("loadeddata", () => paintTile(0));
      v.addEventListener("error", () => {
      });
      v.src = src;
    };
    pollTimer = setInterval(() => {
      if (disposed) {
        pollTimer && clearInterval(pollTimer);
        return;
      }
      const vid = getVideoEl();
      if (vid && vid.src) {
        pollTimer && clearInterval(pollTimer);
        startPainting(vid.src);
      }
    }, 500);
    stopTimer = setTimeout(() => {
      pollTimer && clearInterval(pollTimer);
    }, 3e4);
    return () => {
      disposed = true;
      pollTimer && clearInterval(pollTimer);
      stopTimer && clearTimeout(stopTimer);
    };
  }, [s.video?.path, g]);
  const onStripPointerDown = (e) => {
    if (!s.video || busy()) return;
    e.preventDefault();
    const dragState = { startX: e.clientX, moved: false };
    seek(clientXToTime(e.clientX));
    const onMove = (ev) => {
      if (!dragState.moved && Math.abs(ev.clientX - dragState.startX) < 4) return;
      dragState.moved = true;
      store.setState({ scrubbing: true });
      seek(clientXToTime(ev.clientX));
    };
    const onUp = (ev) => {
      store.setState({ scrubbing: false });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const tSec = clientXToTime(ev.clientX);
      if (!dragState.moved) {
        const st = store.getState();
        if (Math.abs(tSec - st.selStart) <= Math.abs(tSec - st.selEnd)) {
          store.setState({ selStart: Math.min(tSec, st.selEnd - 0.1) });
        } else {
          store.setState({ selEnd: Math.max(tSec, st.selStart + 0.1) });
        }
      }
      seek(tSec);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  if (!s.video) {
    return /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-full flex items-center justify-center" }, /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-xs text-text-dim" }, t("no_video_timeline", "Najprv vyber video.")));
  }
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-full flex flex-col px-3 py-2 gap-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "relative flex-1 min-h-0" }, /* @__PURE__ */ react_shim_default.createElement(
    "canvas",
    {
      ref: canvasRef,
      className: "block w-full h-full rounded-lg border border-border bg-black"
    }
  ), /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      ref: (el) => {
        stripRef.current = el;
        shared.stripEl = el;
      },
      onPointerDown: onStripPointerDown,
      className: "absolute inset-0 cursor-crosshair select-none touch-none"
    },
    s.segments.map((seg, i) => /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        key: seg.id,
        className: "absolute top-0 bottom-0 pointer-events-none",
        style: {
          left: pct(seg.start),
          width: pct(seg.end - seg.start),
          backgroundColor: SEG_COLORS[i % SEG_COLORS.length],
          opacity: 0.4
        }
      }
    )),
    /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 pointer-events-none",
        style: {
          left: pct(s.selStart),
          width: pct(s.selEnd - s.selStart),
          backgroundColor: "rgba(255,255,255,0.12)",
          borderLeft: `2px solid ${START_COLOR}`,
          borderRight: `2px solid ${END_COLOR}`
        }
      }
    ),
    /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        className: `absolute w-[2px] bg-white pointer-events-none z-10 ${s.scrubbing ? "" : "transition-[left] duration-150"}`,
        style: { left: pct(s.playhead), top: -6, bottom: -6, boxShadow: "0 0 4px rgba(0,0,0,0.9)" }
      }
    ),
    s.scrubbing && /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        className: "absolute px-2 py-0.5 rounded text-[11px] font-mono pointer-events-none -translate-x-1/2 z-30",
        style: { left: pct(s.playhead), top: -32, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff" }
      },
      fmtTime(s.playhead)
    ),
    /* @__PURE__ */ react_shim_default.createElement(Handle, { which: "start" }),
    /* @__PURE__ */ react_shim_default.createElement(Handle, { which: "end" })
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between items-center shrink-0" }, /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[10px] text-text-dim" }, t("timeline_hint", "Podr\u017E my\u0161 na ose a \u0165ahaj pre \u017Eiv\xFD n\xE1h\u013Ead. Klik nastav\xED bli\u017E\u0161iu zna\u010Dku.")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[11px] font-mono text-text-dim" }, fmtTime(s.playhead), " / ", fmtTime(g))));
}
if (api.registerBottomPanel) {
  api.registerBottomPanel(Timeline);
}
function SidePanel() {
  const s = useStore();
  const isBusy = busy();
  const totalDur = s.segments.reduce((a, seg) => a + (seg.end - seg.start), 0);
  const g = duration();
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-3 px-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold" }, t("output", "V\xFDstup")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("cut_mode", "Re\u017Eim strihu")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ mode: "copy" }),
      disabled: isBusy,
      className: `flex-1 px-3 py-2.5 text-sm ${s.mode === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    t("mode_copy", "R\xFDchly (bez prek\xF3dovania)")
  ), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ mode: "precise" }),
      disabled: isBusy,
      className: `flex-1 px-3 py-2.5 text-sm ${s.mode === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    t("mode_precise", "Presn\xFD (prek\xF3dovanie)")
  )), /* @__PURE__ */ react_shim_default.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, t("mode_hint", "R\xFDchly = bez re-enk\xF3du (keyframe). Presn\xFD = pomal\u0161\xED, na frame."))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("output_name", "N\xE1zov s\xFAboru")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      value: s.outputName,
      onChange: (e) => store.setState({ outputName: e.target.value }),
      disabled: isBusy,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("output_dir", "V\xFDstupn\xFD prie\u010Dinok")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: async () => {
        const dir = await api.pickDirectory();
        if (dir) store.setState({ outDir: dir });
      },
      disabled: isBusy,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    s.outDir ? t("change", "Zmeni\u0165") : t("browse", "Vybra\u0165\u2026")
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, s.outDir || t("default_output", "(predvolen\xFD prie\u010Dinok)")), s.outDir && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ outDir: "" }),
      disabled: isBusy,
      className: "px-2 py-1 text-error hover:bg-error/10 rounded"
    },
    "\u2715"
  ))), /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.mergeAfter,
      onChange: (e) => store.setState({ mergeAfter: e.target.checked }),
      disabled: isBusy,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm" }, t("merge_after", "\xDAseky aj spoji\u0165 do jedn\xE9ho s\xFAboru"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.withMusic,
      onChange: (e) => store.setState({ withMusic: e.target.checked }),
      disabled: isBusy,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm" }, t("music", "Hudba"))), s.withMusic && /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2 pl-7" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: async () => {
        const f = await api.pickFiles(AUDIO_FILTERS, false);
        if (f && !Array.isArray(f)) store.setState({ music: f });
      },
      disabled: isBusy,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    s.music ? baseName(s.music) : t("pick_music", "Vybra\u0165 hudbu")
  ), s.music && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ music: null }),
      disabled: isBusy,
      className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs"
    },
    "\u2715"
  ), /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.loopMusic,
      onChange: (e) => store.setState({ loopMusic: e.target.checked }),
      disabled: isBusy,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), t("loop_music", "Slu\u010Dka (opakova\u0165 hudbu)"))), /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[10px] text-text-dim" }, t("music_note", "Hudba sa prid\xE1 ku ka\u017Ed\xE9mu v\xFDstupu. Kon\u010D\xED spolu s videom; ak je krat\u0161ia a slu\u010Dka je vypnut\xE1, video sa skr\xE1ti na d\u013A\u017Eku hudby."))))), s.error && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-error/10 border border-error/30 rounded-lg p-3 text-xs text-error" }, s.error), /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-3" }, s.jobs.length > 0 ? /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-3" }, s.jobs.map((job) => /* @__PURE__ */ react_shim_default.createElement("div", { key: job.id }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm font-medium truncate" }, job.label), /* @__PURE__ */ react_shim_default.createElement(
    "span",
    {
      className: `text-xs font-mono ${job.status === "error" ? "text-error" : job.status === "done" ? "text-success" : "text-text-dim"}`
    },
    job.status === "running" ? job.progress >= 0 ? `${Math.round(job.progress)}%${job.message ? ` \xB7 ${job.message}` : ""}` : job.message || "\u2026" : job.status === "done" ? "\u2713" : job.status === "cancelled" ? t("cancelled", "zru\u0161en\xE9") : job.status === "error" ? t("error", "chyba") : job.message
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${job.status === "error" ? "bg-error" : job.status === "done" ? "bg-success" : "bg-accent"}`,
      style: {
        width: job.status === "done" ? "100%" : `${Math.max(2, Math.min(100, job.progress))}%`
      }
    }
  ))))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2" }, isBusy && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: cancelAll,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    t("cancel_all", "Zru\u0161i\u0165 v\u0161etko")
  ), !isBusy && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: resetAll,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    t("new_cut", "Nov\xE9 strihanie")
  ))) : /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: exportAll,
      disabled: isBusy || !s.video || s.segments.length === 0,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    t("export", "Exportova\u0165"),
    " (",
    s.segments.length,
    " ",
    t("pieces", "dielov"),
    " \xB7 ",
    fmtTime(totalDur),
    ")"
  )));
}
if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}
function Cutter() {
  const s = useStore();
  const saveTimer = useRef2(null);
  const g = duration();
  const isBusy = busy();
  const totalDur = useMemo2(() => s.segments.reduce((a, seg) => a + (seg.end - seg.start), 0), [s.segments]);
  useEffect2(() => {
    api.invoke("get_last_output_dir").then((dir) => {
      if (dir) store.setState({ outDir: dir });
    }).catch(() => {
    });
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        const sess = cfg?.session;
        if (!sess) {
          store.setState({ restored: true });
          return;
        }
        const patch = {
          selStart: sess.selStart ?? 0,
          selEnd: sess.selEnd ?? 0,
          segments: (sess.segments ?? []).map((seg) => ({ id: uid(), start: seg.start, end: seg.end })),
          mergeAfter: !!sess.mergeAfter,
          withMusic: !!sess.withMusic,
          music: sess.music ?? null,
          loopMusic: sess.loopMusic !== false
        };
        if (sess.mode === "copy" || sess.mode === "precise") patch.mode = sess.mode;
        if (sess.outputName) patch.outputName = sess.outputName;
        if (sess.videoPath) {
          let info = null;
          try {
            info = await api.invoke("get_video_info", { path: sess.videoPath });
          } catch {
          }
          if (info) {
            patch.video = { path: sess.videoPath, info };
            log(`${t("loaded", "Na\u010D\xEDtan\xE9")}: ${baseName(sess.videoPath)} (${fmtTime(info.duration)})`);
          }
        }
        store.setState(patch);
      } catch {
      }
      store.setState({ restored: true });
    })();
  }, []);
  useEffect2(() => {
    if (!s.restored || isBusy) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const st = store.getState();
      const session = {
        videoPath: st.video?.path ?? null,
        selStart: st.selStart,
        selEnd: st.selEnd,
        segments: st.segments.map((seg) => ({ start: seg.start, end: seg.end })),
        mode: st.mode,
        mergeAfter: st.mergeAfter,
        withMusic: st.withMusic,
        music: st.music,
        loopMusic: st.loopMusic,
        outputName: st.outputName
      };
      api.invoke("set_module_config", { id: api.moduleId, config: { session } }).catch(() => {
      });
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [s.video, s.selStart, s.selEnd, s.segments, s.mode, s.mergeAfter, s.withMusic, s.music, s.loopMusic, s.outputName, s.restored, isBusy]);
  useEffect2(() => {
    if (!s.video) return;
    const id = setInterval(() => {
      const v = getVideoEl();
      if (!v) return;
      const st = store.getState();
      if (!st.scrubbing && !st.activeHandle && !isNaN(v.currentTime)) {
        store.setState({ playhead: v.currentTime });
      }
      if (duration() <= 0 && v.duration && isFinite(v.duration)) {
        store.setState((cur) => ({
          videoDuration: v.duration,
          selEnd: cur.selEnd <= 0 ? v.duration : cur.selEnd
        }));
      }
    }, 200);
    return () => clearInterval(id);
  }, [s.video?.path, g]);
  const PlayerShell = api.PlayerShell;
  const setStart = (str) => store.setState((st) => ({ selStart: Math.max(0, Math.min(parseTime(str), st.selEnd - 0.1)) }));
  const setEnd = (str) => store.setState((st) => ({ selEnd: Math.min(duration(), Math.max(parseTime(str), st.selStart + 0.1)) }));
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-6 overflow-y-auto h-full" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold" }, t("video", "Video")), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: pickVideo,
      disabled: isBusy,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    s.video ? t("change_video", "Zmeni\u0165 video") : t("pick_video", "Vybra\u0165 video")
  )), s.video && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, baseName(s.video.path), " \xB7 ", fmtTime(g), s.video.info ? ` \xB7 ${s.video.info.width}\xD7${s.video.info.height} \xB7 ${s.video.info.codec}` : ""), /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      ref: (el) => {
        shared.playerBox = el;
      },
      className: "rounded-xl overflow-hidden border border-border bg-black"
    },
    /* @__PURE__ */ react_shim_default.createElement(PlayerShell, { src: s.video.path })
  ), !api.registerBottomPanel && /* @__PURE__ */ react_shim_default.createElement("div", { className: "h-28" }, /* @__PURE__ */ react_shim_default.createElement(Timeline, null)), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-3 gap-3 items-end" }, /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1" }, t("start", "\u0160tart")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      defaultValue: fmtTime(s.selStart),
      key: `s-${s.selStart.toFixed(2)}`,
      onBlur: (e) => setStart(e.target.value),
      disabled: isBusy,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1" }, t("end", "Koniec")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      defaultValue: fmtTime(s.selEnd),
      key: `e-${s.selEnd.toFixed(2)}`,
      onBlur: (e) => setEnd(e.target.value),
      disabled: isBusy,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs text-text-dim font-mono" }, fmtTime(s.selEnd - s.selStart)), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: addSegment,
      disabled: isBusy || s.selEnd - s.selStart < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    t("add_cut", "Prida\u0165 \xFAsek")
  ))))), s.segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold mb-3" }, t("segments", "\xDAseky"), " (", s.segments.length, ") \xB7 ", fmtTime(totalDur)), /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-1.5" }, s.segments.map((seg, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: seg.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "w-2.5 h-2.5 rounded-full", style: { backgroundColor: SEG_COLORS[i % SEG_COLORS.length] } }), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm font-medium" }, t("segment", "\xDAsek"), " ", i + 1), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs font-mono text-text-dim" }, fmtTime(seg.start), " \u2192 ", fmtTime(seg.end)), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs text-text-dim" }, "(", fmtTime(seg.end - seg.start), ")"), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState((st) => ({ segments: st.segments.filter((x) => x.id !== seg.id) })),
      disabled: isBusy,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "\u2715"
  ))))), !api.registerSidePanel && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement(SidePanel, null)), s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("log", "Log")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, s.log.map((line, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, line))))));
}
var index_default = Cutter;
export {
  index_default as default
};
