// merger-build/react-shim.js
var R = window.React;
var react_shim_default = R;
var useState = R.useState;
var useEffect = R.useEffect;
var useMemo = R.useMemo;
var useRef = R.useRef;
var useCallback = R.useCallback;
var useSyncExternalStore = R.useSyncExternalStore;
var Fragment = R.Fragment;

// ../mnt/agents/output/fimi.merger-zdroj/src/index.jsx
var api = window.SkyFrame;
var t = (k, f) => api.t(k, f);
var { useState: useState2, useEffect: useEffect2, useMemo: useMemo2, useRef: useRef2, useSyncExternalStore: useSyncExternalStore2 } = react_shim_default;
var VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
var AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }];
var PRESETS = [
  { id: "youtube_4k", label: "YouTube 4K" },
  { id: "youtube_1080", label: "YouTube 1080p" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "email", label: "E-mail (mal\xE9)" },
  { id: "archive", labelKey: "preset_archive" }
];
function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
var initialState = {
  folder: "",
  flights: [],
  // { checked, clips: {checked, path, size_mb, time}[], total_mb, split_reason }[]
  manual: [],
  // string[]
  sdFolders: [],
  // { path, mp4_count }[]
  mode: "flights",
  // "flights" | "all"
  outputName: "merged",
  outDir: "",
  musicEnabled: false,
  music: null,
  loopMusic: true,
  convertAfter: false,
  preset: "youtube_1080",
  preview: null,
  // path | null
  scanning: false,
  error: "",
  jobs: [],
  log: [],
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
var shared = { cancelFlag: { current: false }, scrollEl: { current: null } };
function openPreview(path) {
  const s = store.getState();
  const next = s.preview === path ? null : path;
  store.setState({ preview: next });
  if (next && shared.scrollEl.current) {
    shared.scrollEl.current.scrollTo({ top: 0, behavior: "smooth" });
  }
}
var thumbCache = /* @__PURE__ */ new Map();
function log(msg) {
  store.setState((s) => ({
    log: [...s.log.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${msg}`]
  }));
}
function busy() {
  return store.getState().jobs.some((j) => j.status === "running");
}
function selectedPaths() {
  const s = store.getState();
  const fromFlights = s.flights.filter((f) => f.checked).flatMap((f) => f.clips.filter((c) => c.checked).map((c) => c.path));
  return [...fromFlights, ...s.manual.filter((m) => !fromFlights.includes(m))];
}
async function scanFolder(folder) {
  store.setState({ scanning: true, error: "" });
  try {
    const res = await api.invoke("analyze_flights", { folder });
    let flights = [];
    if (Array.isArray(res)) flights = res;
    else if (res && typeof res === "object" && Array.isArray(res.flights)) flights = res.flights;
    else throw new Error(t("bad_response", "Neo\u010Dak\xE1van\xE1 odpove\u010F z core."));
    const withChecks = flights.map((f) => ({
      ...f,
      checked: true,
      clips: (Array.isArray(f.clips) ? f.clips : []).map((c) => ({ ...c, checked: true }))
    }));
    store.setState({ flights: withChecks });
    log(`${t("scan_done", "Skenovanie dokon\u010Den\xE9")}: ${folder} \u2014 ${withChecks.length} ${t("flights", "letov")}`);
    if (!withChecks.length) log(t("no_videos", "V prie\u010Dinku nie s\xFA \u017Eiadne vide\xE1."));
  } catch (e) {
    store.setState({ error: String(e) });
    log(String(e));
  } finally {
    store.setState({ scanning: false });
  }
}
async function pickAndScan() {
  const dir = await api.pickDirectory();
  if (!dir) return;
  store.setState({ folder: dir });
  await scanFolder(dir);
}
async function addManual() {
  const files = await api.pickFiles(VIDEO_FILTERS, true);
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];
  store.setState((s) => ({ manual: [...s.manual, ...list.filter((f) => !s.manual.includes(f))] }));
  log(`${t("added_manual", "Pridan\xE9 ru\u010Dne")}: ${list.length}`);
}
function toggleFlight(fi) {
  store.setState((s) => ({
    flights: s.flights.map((f, i) => i === fi ? { ...f, checked: !f.checked } : f)
  }));
}
function toggleClip(fi, ci) {
  store.setState((s) => ({
    flights: s.flights.map(
      (f, i) => i === fi ? { ...f, clips: f.clips.map((c, j) => j === ci ? { ...c, checked: !c.checked } : c) } : f
    )
  }));
}
function checkAll(value) {
  store.setState((s) => ({
    flights: s.flights.map((f) => ({
      ...f,
      checked: value,
      clips: f.clips.map((c) => ({ ...c, checked: value }))
    }))
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
async function startMerge() {
  const s = store.getState();
  store.setState({ error: "" });
  shared.cancelFlag.current = false;
  const groups = [];
  if (s.mode === "flights" && s.flights.some((f) => f.checked)) {
    s.flights.filter((f) => f.checked).forEach((f, i) => {
      const files = f.clips.filter((c) => c.checked).map((c) => c.path);
      if (files.length) groups.push({ files, name: `${s.outputName}_flight${i + 1}` });
    });
    if (s.manual.length) groups.push({ files: s.manual, name: `${s.outputName}_manual` });
  } else {
    groups.push({ files: selectedPaths(), name: s.outputName });
  }
  if (!groups.length || groups.every((g) => g.files.length < 1)) {
    store.setState({ error: t("nothing_selected", "Nie je vybran\xE9 \u017Eiadne video.") });
    return;
  }
  log(`${t("start_log", "Sp\xFA\u0161\u0165am")} ${groups.length} ${t("jobs_word", "\xFAloh")}\u2026`);
  store.setState({
    jobs: groups.map((g, i) => ({
      id: `pending-${i}`,
      moduleId: api.moduleId,
      label: g.name,
      status: "running",
      progress: -1,
      message: t("queued", "\u010Cak\xE1 v rade"),
      result: null
    }))
  });
  for (let i = 0; i < groups.length && !shared.cancelFlag.current; i++) {
    const g = groups[i];
    try {
      const jobId = await api.invoke("merge_videos", {
        files: g.files,
        outputName: g.name,
        music: s.musicEnabled ? s.music : null,
        moduleId: api.moduleId,
        outputDir: s.outDir || null,
        loopMusic: s.loopMusic
      });
      store.setState((st) => {
        const jobs = [...st.jobs];
        jobs[i] = { ...jobs[i], id: jobId, progress: 0, message: "" };
        return { jobs };
      });
      log(`\u25B6 ${g.name} (${g.files.length} ${t("videos_count", "vide\xED")})`);
      const res = await watchJob(jobId);
      if (res.status === "done" && res.result) {
        log(`\u2713 ${res.result}`);
        if (s.convertAfter) {
          const preset = PRESETS.find((p) => p.id === s.preset);
          const label = preset ? preset.labelKey ? t(preset.labelKey, preset.labelKey) : preset.label : s.preset;
          log(`${t("converting", "Konvertujem")}: ${label}`);
          const convId = await api.invoke("convert_video", {
            input: res.result,
            preset: s.preset,
            moduleId: api.moduleId,
            outputDir: s.outDir || null
          });
          store.setState((st) => ({
            jobs: [
              ...st.jobs,
              {
                id: convId,
                moduleId: api.moduleId,
                label: `convert: ${baseName(res.result)}`,
                status: "running",
                progress: 0,
                message: "",
                result: null
              }
            ]
          }));
          const convRes = await watchJob(convId);
          if (convRes.status === "done") log(`\u2713 ${convRes.result}`);
        }
      } else if (res.status === "error") {
        log(`\u2717 ${g.name}: ${res.message}`);
      } else if (res.status === "cancelled") {
        log(`\u2298 ${g.name}: ${t("cancelled", "zru\u0161en\xE9")}`);
        break;
      }
    } catch (e) {
      store.setState((st) => {
        const jobs = [...st.jobs];
        jobs[i] = { ...jobs[i], status: "error", message: String(e) };
        return { jobs, error: String(e) };
      });
      log(String(e));
    }
  }
  log(t("finished_log", "Spracovanie ukon\u010Den\xE9."));
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
    sdFolders: store.getState().sdFolders
  });
}
function ThumbCard({ path, checked, onToggle, onRemove, disabled }) {
  const s = useStore();
  const [thumb, setThumb] = useState2(() => thumbCache.get(path) || null);
  const active = s.preview === path;
  useEffect2(() => {
    let alive = true;
    if (thumbCache.has(path)) {
      setThumb(thumbCache.get(path));
      return;
    }
    api.invoke("video_thumbnail", { path, atSeconds: 1 }).then((bytes) => {
      if (!alive) return;
      const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const url = URL.createObjectURL(new Blob([arr], { type: "image/jpeg" }));
      thumbCache.set(path, url);
      setThumb(url);
    }).catch(() => {
      thumbCache.set(path, "error");
      if (alive) setThumb("error");
    });
    return () => {
      alive = false;
    };
  }, [path]);
  return /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      onClick: () => openPreview(path),
      title: path,
      style: { cursor: "pointer" },
      className: `rounded-xl overflow-hidden border transition-colors ${active ? "border-accent" : "border-border hover:border-accent/40"} bg-bg`
    },
    /* @__PURE__ */ react_shim_default.createElement("div", { style: { position: "relative", aspectRatio: "16/9", background: "#000" } }, thumb && thumb !== "error" ? /* @__PURE__ */ react_shim_default.createElement(
      "img",
      {
        src: thumb,
        alt: baseName(path),
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
        draggable: false
      }
    ) : /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "#64748b"
        }
      },
      thumb === "error" ? "\u{1F3AC}" : "\u2026"
    ), /* @__PURE__ */ react_shim_default.createElement(
      "input",
      {
        type: "checkbox",
        checked: !!checked,
        disabled,
        onClick: (e) => e.stopPropagation(),
        onChange: (e) => {
          e.stopPropagation();
          onToggle?.();
        },
        style: { position: "absolute", top: 6, left: 6, width: 16, height: 16, accentColor: "#6366f1", cursor: "pointer" }
      }
    ), onRemove && /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onRemove();
        },
        disabled,
        style: { position: "absolute", top: 4, right: 4 },
        className: "px-1.5 py-0.5 rounded text-[10px] text-error bg-black/60 hover:bg-error/20"
      },
      "\u2715"
    ), active && /* @__PURE__ */ react_shim_default.createElement(
      "div",
      {
        style: { position: "absolute", bottom: 4, right: 6 },
        className: "text-[9px] px-1.5 py-0.5 rounded bg-accent text-white"
      },
      "\u25B6"
    )),
    /* @__PURE__ */ react_shim_default.createElement("div", { className: "px-2 py-1.5" }, /* @__PURE__ */ react_shim_default.createElement("p", { className: "text-[11px] truncate" }, baseName(path)))
  );
}
var THUMB_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 10
};
if (api.registerToolbar) {
  api.registerToolbar([
    {
      id: "scan",
      icon: "\u{1F4C2}",
      labelKey: "tool_scan",
      onClick: () => {
        if (!busy() && !store.getState().scanning) void pickAndScan();
      }
    },
    {
      id: "add",
      icon: "\u2795",
      labelKey: "tool_add",
      onClick: () => {
        if (!busy()) void addManual();
      }
    },
    {
      id: "start",
      icon: "\u25B6\uFE0F",
      labelKey: "tool_start",
      onClick: () => {
        if (!busy()) void startMerge();
      }
    }
  ]);
}
function SidePanel() {
  const s = useStore();
  const isBusy = busy();
  const total = selectedPaths().length;
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-4 px-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.musicEnabled,
      onChange: (e) => store.setState({ musicEnabled: e.target.checked }),
      disabled: isBusy,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm font-medium" }, t("music", "Hudba na pozad\xED"))), s.musicEnabled && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-wrap items-center gap-2 pl-7" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: async () => {
        const f = await api.pickFiles(AUDIO_FILTERS, false);
        if (f && !Array.isArray(f)) store.setState({ music: f });
      },
      disabled: isBusy,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    s.music ? baseName(s.music) : t("pick_music", "Vybra\u0165 hudobn\xFD s\xFAbor")
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
  ), t("loop_music", "Opakova\u0165 hudbu (slu\u010Dka)")))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider px-1" }, t("output", "V\xFDstup")), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("merge_mode", "Re\u017Eim sp\xE1jania")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ mode: "flights" }),
      disabled: isBusy,
      className: `flex-1 px-3 py-2 text-xs ${s.mode === "flights" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    t("mode_flights", "Pod\u013Ea letov")
  ), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ mode: "all" }),
      disabled: isBusy,
      className: `flex-1 px-3 py-2 text-xs ${s.mode === "all" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    t("mode_all", "V\u0161etko do jedn\xE9ho")
  ))), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("output_name", "N\xE1zov s\xFAboru")), /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "text",
      value: s.outputName,
      onChange: (e) => store.setState({ outputName: e.target.value }),
      disabled: isBusy,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  )), /* @__PURE__ */ react_shim_default.createElement("div", null, /* @__PURE__ */ react_shim_default.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, t("output_dir", "V\xFDstupn\xFD prie\u010Dinok (volite\u013En\xE9)")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: async () => {
        const dir = await api.pickDirectory();
        if (dir) store.setState({ outDir: dir });
      },
      disabled: isBusy,
      className: "px-3 py-2 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    s.outDir ? t("change", "Zmeni\u0165") : t("browse", "Vybra\u0165\u2026")
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-[11px] font-mono text-text-dim truncate flex-1" }, s.outDir || t("default_output", "(predvolen\xFD prie\u010Dinok aplik\xE1cie)")), s.outDir && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ outDir: "" }),
      disabled: isBusy,
      className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs"
    },
    "\u2715"
  ))), /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.convertAfter,
      onChange: (e) => store.setState({ convertAfter: e.target.checked }),
      disabled: isBusy,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-sm" }, t("convert_after", "Po spojen\xED konvertova\u0165"))), s.convertAfter && /* @__PURE__ */ react_shim_default.createElement(
    "select",
    {
      value: s.preset,
      onChange: (e) => store.setState({ preset: e.target.value }),
      disabled: isBusy,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none"
    },
    PRESETS.map((p) => /* @__PURE__ */ react_shim_default.createElement("option", { key: p.id, value: p.id }, p.labelKey ? t(p.labelKey, p.labelKey) : p.label))
  )), s.error && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-error/10 border border-error/30 rounded-lg p-3 text-xs text-error" }, s.error), s.jobs.length > 0 ? /* @__PURE__ */ react_shim_default.createElement("div", { className: "space-y-3" }, s.jobs.map((job) => /* @__PURE__ */ react_shim_default.createElement("div", { key: job.id }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs font-medium truncate" }, job.label), /* @__PURE__ */ react_shim_default.createElement(
    "span",
    {
      className: `text-[11px] font-mono ${job.status === "error" ? "text-error" : job.status === "done" ? "text-success" : "text-text-dim"}`
    },
    job.status === "running" ? job.progress >= 0 ? `${Math.round(job.progress)}%` : job.message || "\u2026" : job.status === "done" ? "\u2713" : job.status === "cancelled" ? t("cancelled", "zru\u0161en\xE9") : job.status === "error" ? t("error", "chyba") : job.message
  )), /* @__PURE__ */ react_shim_default.createElement("div", { className: "w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${job.status === "error" ? "bg-error" : job.status === "done" ? "bg-success" : "bg-accent"}`,
      style: {
        width: job.status === "done" ? "100%" : `${Math.max(2, Math.min(100, job.progress))}%`
      }
    }
  )), job.result && /* @__PURE__ */ react_shim_default.createElement("p", { className: "mt-1 text-[10px] font-mono text-text-dim break-all" }, job.result))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-2" }, isBusy && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: cancelAll,
      className: "px-3 py-2 rounded-lg text-xs font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    t("cancel_all", "Zru\u0161i\u0165 v\u0161etko")
  ), !isBusy && /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: resetAll,
      className: "px-3 py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    t("new_merge", "Nov\xE9 sp\xE1janie")
  ))) : /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: startMerge,
      disabled: isBusy || s.scanning || total < 1,
      className: "w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    t("start_merge", "Spusti\u0165 spracovanie"),
    " (",
    total,
    " ",
    t("videos_count", "vide\xED"),
    ")"
  ));
}
if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}
function Merger() {
  const s = useStore();
  const saveTimer = useRef2(null);
  const isBusy = busy();
  const selectedMb = useMemo2(
    () => s.flights.filter((f) => f.checked).reduce((a, f) => a + f.clips.filter((c) => c.checked).reduce((b, c) => b + c.size_mb, 0), 0),
    [s.flights]
  );
  useEffect2(() => {
    api.invoke("find_media_folders").then((folders) => {
      store.setState({ sdFolders: folders });
      if (folders.length) log(`${t("sd_found", "N\xE1jden\xE9 m\xE9di\xE1")}: ${folders.length}`);
    }).catch(() => {
    });
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        const sess = cfg?.session;
        if (sess) {
          const patch = {};
          if (sess.mode === "all" || sess.mode === "flights") patch.mode = sess.mode;
          if (sess.outputName) patch.outputName = sess.outputName;
          patch.musicEnabled = !!sess.musicEnabled;
          patch.music = sess.music ?? null;
          patch.loopMusic = sess.loopMusic !== false;
          patch.convertAfter = !!sess.convertAfter;
          if (sess.preset) patch.preset = sess.preset;
          if (Array.isArray(sess.manual)) patch.manual = sess.manual.filter((x) => typeof x === "string");
          store.setState(patch);
          if (sess.folder) {
            store.setState({ folder: sess.folder, restored: true });
            await scanFolder(sess.folder);
            return;
          }
        }
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
      api.invoke("set_module_config", {
        id: api.moduleId,
        config: {
          session: {
            folder: st.folder,
            manual: st.manual,
            mode: st.mode,
            outputName: st.outputName,
            musicEnabled: st.musicEnabled,
            music: st.music,
            loopMusic: st.loopMusic,
            convertAfter: st.convertAfter,
            preset: st.preset
          }
        }
      }).catch(() => {
      });
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [s.folder, s.manual, s.mode, s.outputName, s.musicEnabled, s.music, s.loopMusic, s.convertAfter, s.preset, s.restored, isBusy]);
  const PlayerShell = api.PlayerShell;
  return /* @__PURE__ */ react_shim_default.createElement("div", { ref: (el) => shared.scrollEl.current = el, className: "p-6 overflow-y-auto h-full" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement("h2", { className: "text-lg font-semibold mb-4" }, t("source", "Zdroj vide\xED")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: pickAndScan,
      disabled: s.scanning || isBusy,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    s.scanning ? t("loading", "Na\u010D\xEDtavam\u2026") : t("scan_folder", "Vybra\u0165 prie\u010Dinok a skenova\u0165")
  ), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: addManual,
      disabled: isBusy,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    t("add_videos", "Prida\u0165 vide\xE1 ru\u010Dne")
  ), s.flights.length > 0 && /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => checkAll(true),
      disabled: isBusy,
      className: "px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
    },
    t("check_all", "Vybra\u0165 v\u0161etko")
  ), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => checkAll(false),
      disabled: isBusy,
      className: "px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
    },
    t("uncheck_all", "Zru\u0161i\u0165 v\xFDber")
  ))), s.sdFolders.length > 0 && !s.flights.length && /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-4" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("sd_cards", "N\xE1jden\xE9 m\xE9di\xE1 (SD karty)")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-wrap gap-2" }, s.sdFolders.map((f) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: f.path,
      onClick: () => {
        store.setState({ folder: f.path });
        void scanFolder(f.path);
      },
      disabled: s.scanning || isBusy,
      className: "px-3 py-2 rounded-xl text-xs font-mono bg-bg border border-border hover:border-accent/40 transition-colors disabled:opacity-50"
    },
    f.path,
    " ",
    /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-accent" }, "(", f.mp4_count, " mp4)")
  )))), s.folder && /* @__PURE__ */ react_shim_default.createElement("p", { className: "mt-3 text-xs font-mono text-text-dim break-all" }, s.folder), s.preview && /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-4 rounded-xl overflow-hidden border border-accent/50 bg-black" }, /* @__PURE__ */ react_shim_default.createElement(PlayerShell, { src: s.preview }), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2 px-3 py-2 bg-bg-card border-t border-border" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1 text-xs truncate" }, baseName(s.preview)), /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      onClick: () => store.setState({ preview: null }),
      className: "text-[10px] px-2 py-1 rounded text-text-dim border border-border hover:border-accent/40"
    },
    t("close", "Zavrie\u0165")
  ))), s.flights.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-4 space-y-3" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, t("flights", "Lety"), " (", s.flights.length, ") \xB7 ", selectedMb.toFixed(0), " MB"), s.flights.map((flight, fi) => /* @__PURE__ */ react_shim_default.createElement("div", { key: fi, className: "rounded-xl border border-border bg-bg overflow-hidden" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "flex items-center gap-3 p-3 cursor-pointer hover:bg-bg-card-hover/50" }, /* @__PURE__ */ react_shim_default.createElement(
    "input",
    {
      type: "checkbox",
      checked: flight.checked,
      onChange: () => toggleFlight(fi),
      disabled: isBusy,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ react_shim_default.createElement("span", { className: "font-medium text-sm" }, t("flight", "Let"), " ", fi + 1), /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-xs text-text-dim" }, flight.clips.length, " ", t("videos_count", "vide\xED"), " \xB7 ", flight.total_mb.toFixed(0), " MB"), /* @__PURE__ */ react_shim_default.createElement("span", { className: "ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent" }, flight.split_reason)), /* @__PURE__ */ react_shim_default.createElement("div", { className: "border-t border-border p-3", style: THUMB_GRID }, flight.clips.map((clip, ci) => /* @__PURE__ */ react_shim_default.createElement(
    ThumbCard,
    {
      key: clip.path,
      path: clip.path,
      checked: clip.checked,
      disabled: isBusy || !flight.checked,
      onToggle: () => toggleClip(fi, ci)
    }
  )))))), s.manual.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-4" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("manual_videos", "Ru\u010Dne pridan\xE9"), " (", s.manual.length, ")"), /* @__PURE__ */ react_shim_default.createElement("div", { style: THUMB_GRID }, s.manual.map((path, i) => /* @__PURE__ */ react_shim_default.createElement(
    ThumbCard,
    {
      key: path,
      path,
      checked: true,
      disabled: isBusy,
      onRemove: () => store.setState((st) => ({ manual: st.manual.filter((_, j) => j !== i) }))
    }
  ))))), !api.registerSidePanel && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ react_shim_default.createElement(SidePanel, null)), !api.registerSidePanel && s.error && null, s.log.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ react_shim_default.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, t("log", "Log")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, s.log.map((line, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i }, line))))));
}
var index_default = Merger;
export {
  index_default as default
};
