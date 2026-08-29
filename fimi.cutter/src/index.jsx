// fimi.cutter v2.7.0 — Strihač
// Layout: prehrávač + ovládanie v hlavnej ploche, časová os v spodnom paneli
// core (registerBottomPanel), nástroje vo vertikálnom toolbare (registerToolbar).
// Zdieľaný stav medzi hlavným komponentom a panelom ide cez modulový store
// (bottom panel sa renderuje v strome core, nie modulu — kontext by nedošiel).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useMemo, useRef, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
const AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }];
const SEG_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6"];
const START_COLOR = "#22c55e";
const END_COLOR = "#ef4444";
const THUMB_COUNT = 16;

// ---------------------------------------------------------------------------
// Pomocné funkcie
// ---------------------------------------------------------------------------

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

function fmtTime(s) {
  const v = Math.max(0, s);
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
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

// ---------------------------------------------------------------------------
// Modulový store — zdieľaný stav pre hlavný komponent aj spodný panel
// ---------------------------------------------------------------------------

const initialState = {
  video: null,          // { path, info } | null
  videoDuration: 0,     // fallback dĺžka z <video>
  selStart: 0,
  selEnd: 0,
  playhead: 0,
  scrubbing: false,
  activeHandle: null,   // "start" | "end" | null
  segments: [],         // { id, start, end }[]
  mode: "copy",         // "copy" | "precise"
  mergeAfter: false,
  withMusic: false,
  music: null,          // cesta | null
  loopMusic: true,
  outputName: "cut",
  outDir: "",
  jobs: [],             // JobInfo-like[]
  log: [],              // string[]
  error: "",
  restored: false,
};

let state = { ...initialState };
const listeners = new Set();

const store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

function useStore() {
  return useSyncExternalStore(store.subscribe, store.getState);
}

// Zdieľané referencie naprieč komponentmi
const shared = {
  playerBox: null,      // DOM box s <video> z PlayerShell (nastavuje Main)
  cancelFlag: { current: false },
  stripEl: null,        // interaktívna vrstva timeline (nastavuje Timeline)
};

function log(msg) {
  store.setState((s) => ({
    log: [...s.log.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`],
  }));
}

function duration() {
  const s = store.getState();
  return (s.video?.info?.duration ?? 0) > 0 ? s.video.info.duration : s.videoDuration;
}

function getVideoEl() {
  return shared.playerBox?.querySelector("video") ?? null;
}

/** Živý seek — pauzne prehrávač a nastaví currentTime + playhead v store. */
function seek(tSec) {
  const g = duration();
  const v = getVideoEl();
  if (v) {
    try {
      v.pause();
      v.currentTime = Math.max(0, Math.min(g || v.duration || tSec, tSec));
    } catch {}
  }
  store.setState({ playhead: Math.max(0, Math.min(g || tSec, tSec)) });
}

function busy() {
  return store.getState().jobs.some((j) => j.status === "running");
}

// ---------------------------------------------------------------------------
// Registrácia do core — toolbar nástroje (bottom panel sa registruje nižšie)
// ---------------------------------------------------------------------------

if (api.registerToolbar) {
  api.registerToolbar([
    {
      id: "open",
      icon: "📂",
      labelKey: "tool_open",
      onClick: () => {
        if (!busy()) void pickVideo();
      },
    },
    {
      id: "add",
      icon: "➕",
      labelKey: "tool_add",
      onClick: () => addSegment(),
    },
    {
      id: "export",
      icon: "⬇️",
      labelKey: "tool_export",
      onClick: () => {
        if (!busy()) void exportAll();
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Akcie (modulový scope — použiteľné z toolbaru aj z UI)
// ---------------------------------------------------------------------------

async function pickVideo() {
  const selected = await api.pickFiles(VIDEO_FILTERS, false);
  if (!selected || Array.isArray(selected)) return;
  let info = null;
  try {
    info = await api.invoke("get_video_info", { path: selected });
  } catch {}
  store.setState({
    video: { path: selected, info },
    videoDuration: 0,
    selStart: 0,
    selEnd: info?.duration ?? 0,
    playhead: 0,
    segments: [],
    jobs: [],
    error: "",
  });
  log(`${t("loaded", "Načítané")}: ${baseName(selected)}${info ? ` (${fmtTime(info.duration)}, ${info.width}×${info.height})` : ""}`);
}

function addSegment() {
  const s = store.getState();
  if (!s.video || s.selEnd - s.selStart < 0.1) return;
  if (s.segments.some((seg) => Math.abs(seg.start - s.selStart) < 0.5 && Math.abs(seg.end - s.selEnd) < 0.5)) {
    store.setState({ error: t("seg_exists", "Tento úsek už existuje.") });
    return;
  }
  store.setState((st) => ({
    error: "",
    segments: [...st.segments, { id: uid(), start: st.selStart, end: st.selEnd }].sort((a, b) => a.start - b.start),
  }));
}

function watchJob(jobId) {
  return new Promise((resolve) => {
    let unlisten;
    api
      .listenJob(jobId, (job) => {
        store.setState((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? job : j)) }));
        if (job.status !== "running") {
          unlisten?.();
          resolve(job);
        }
      })
      .then((u) => {
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
        message: t("queued", "Čaká v rade"),
        result: null,
      },
    ],
  }));
}

function resolvePendingJob(label, jobId) {
  store.setState((s) => ({
    jobs: s.jobs.map((j) =>
      j.label === label && j.id.startsWith("pending") ? { ...j, id: jobId, progress: 0, message: "" } : j,
    ),
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
    loopMusic: store.getState().loopMusic,
  });
  resolvePendingJob(outName, jobId);
  log(`▶ ${outName} (${files.length} ${t("pieces", "dielov")}${music ? " + hudba" : ""})`);
  const res = await watchJob(jobId);
  if (res.status === "done" && res.result) {
    log(`✓ ${res.result}`);
    return res.result;
  }
  if (res.status === "error") {
    store.setState({ error: res.message });
    log(`✗ ${res.message}`);
  } else {
    log(`⊘ ${outName}`);
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
  const partNames = s.segments.map((_, i) =>
    withMusic || s.mergeAfter ? `${name}_${i + 1}_tmp` : `${name}_${i + 1}`,
  );

  store.setState({
    jobs: s.segments.map((_, i) => ({
      id: `pending-${i}`,
      moduleId: api.moduleId,
      label: partNames[i],
      status: "running",
      progress: -1,
      message: t("queued", "Čaká v rade"),
      result: null,
    })),
  });
  log(`${t("export_start", "Exportujem")} ${s.segments.length} ${t("pieces", "dielov")}…`);

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
        moduleId: api.moduleId,
      });
      store.setState((st) => {
        const jobs = [...st.jobs];
        jobs[i] = { ...jobs[i], id: jobId, progress: 0, message: "" };
        return { jobs };
      });
      log(`▶ ${partNames[i]} (${fmtTime(seg.start)} → ${fmtTime(seg.end)})`);
      const res = await watchJob(jobId);
      if (res.status === "done" && res.result) {
        outputs.push(res.result);
        log(`✓ ${res.result}`);
      } else if (res.status === "error") {
        log(`✗ ${partNames[i]}: ${res.message}`);
        store.setState({ error: res.message });
        return;
      } else {
        log(`⊘ ${partNames[i]}`);
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
  log(t("export_done", "Export dokončený."));
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
    outDir: store.getState().outDir,
  });
}

// ---------------------------------------------------------------------------
// Časová os — beží v spodnom paneli core
// ---------------------------------------------------------------------------

function Handle({ which }) {
  const s = useStore();
  const g = duration();
  const time = which === "start" ? s.selStart : s.selEnd;
  const color = which === "start" ? START_COLOR : END_COLOR;
  const pct = g > 0 ? (time / g) * 100 : 0;

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

  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute z-20 cursor-ew-resize touch-none"
      style={{ left: `calc(${pct}% - 11px)`, width: 22, top: -8, bottom: -8 }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded"
        style={{ top: 0, bottom: 0, width: 4, backgroundColor: color, boxShadow: "0 0 6px rgba(0,0,0,0.8)" }}
      />
      <div
        className="absolute left-1/2 flex flex-col items-center justify-center gap-[3px] rounded-md border"
        style={{
          top: "50%",
          transform: `translate(-50%, -50%)${s.activeHandle === which ? " scale(1.15)" : ""}`,
          width: 22,
          height: 36,
          backgroundColor: color,
          borderColor: "rgba(255,255,255,0.5)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 }} />
        <div style={{ width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 }} />
        <div style={{ width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 }} />
      </div>
      {s.activeHandle === which && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap pointer-events-none"
          style={{ top: -30, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", zIndex: 30 }}
        >
          {which === "start" ? "▶ " : "◀ "}
          {fmtTime(time)}
        </div>
      )}
    </div>
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
  const canvasRef = useRef(null);
  const stripRef = useRef(null);
  const g = duration();
  const pct = (time) => `${g > 0 ? (time / g) * 100 : 0}%`;

  // Náhľady (thumbnails) — čaká na <video> z PlayerShell v hlavnom komponente
  useEffect(() => {
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
        const time = Math.min(Math.max(0.05, ((i + 0.5) / THUMB_COUNT) * g), Math.max(0.05, g - 0.05));
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
          } catch {}
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
      v.addEventListener("error", () => {});
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
    }, 30000);

    return () => {
      disposed = true;
      pollTimer && clearInterval(pollTimer);
      stopTimer && clearTimeout(stopTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.video?.path, g]);

  // Scrubbing — klik nastaví bližšiu značku, ťahanie = živý náhľad
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
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-text-dim">{t("no_video_timeline", "Najprv vyber video.")}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-1">
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full rounded-lg border border-border bg-black"
        />
        <div
          ref={(el) => {
            stripRef.current = el;
            shared.stripEl = el;
          }}
          onPointerDown={onStripPointerDown}
          className="absolute inset-0 cursor-crosshair select-none touch-none"
        >
          {s.segments.map((seg, i) => (
            <div
              key={seg.id}
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: pct(seg.start),
                width: pct(seg.end - seg.start),
                backgroundColor: SEG_COLORS[i % SEG_COLORS.length],
                opacity: 0.4,
              }}
            />
          ))}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: pct(s.selStart),
              width: pct(s.selEnd - s.selStart),
              backgroundColor: "rgba(255,255,255,0.12)",
              borderLeft: `2px solid ${START_COLOR}`,
              borderRight: `2px solid ${END_COLOR}`,
            }}
          />
          <div
            className={`absolute w-[2px] bg-white pointer-events-none z-10 ${s.scrubbing ? "" : "transition-[left] duration-150"}`}
            style={{ left: pct(s.playhead), top: -6, bottom: -6, boxShadow: "0 0 4px rgba(0,0,0,0.9)" }}
          />
          {s.scrubbing && (
            <div
              className="absolute px-2 py-0.5 rounded text-[11px] font-mono pointer-events-none -translate-x-1/2 z-30"
              style={{ left: pct(s.playhead), top: -32, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff" }}
            >
              {fmtTime(s.playhead)}
            </div>
          )}
          <Handle which="start" />
          <Handle which="end" />
        </div>
      </div>
      <div className="flex justify-between items-center shrink-0">
        <p className="text-[10px] text-text-dim">
          {t("timeline_hint", "Podrž myš na ose a ťahaj pre živý náhľad. Klik nastaví bližšiu značku.")}
        </p>
        <span className="text-[11px] font-mono text-text-dim">
          {fmtTime(s.playhead)} / {fmtTime(g)}
        </span>
      </div>
    </div>
  );
}

// Registrácia do spodného panelu core
if (api.registerBottomPanel) {
  api.registerBottomPanel(Timeline);
}

// ---------------------------------------------------------------------------
// Bočný panel — výstupné nastavenia + export (pravý panel core)
// ---------------------------------------------------------------------------

function SidePanel() {
  const s = useStore();
  const isBusy = busy();
  const totalDur = s.segments.reduce((a, seg) => a + (seg.end - seg.start), 0);
  const g = duration();
  return (
    <div className="space-y-3 px-1">
        {/* Výstup */}
        {s.segments.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{t("output", "Výstup")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-dim mb-1.5">{t("cut_mode", "Režim strihu")}</label>
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => store.setState({ mode: "copy" })}
                    disabled={isBusy}
                    className={`flex-1 px-3 py-2.5 text-sm ${s.mode === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`}
                  >
                    {t("mode_copy", "Rýchly (bez prekódovania)")}
                  </button>
                  <button
                    onClick={() => store.setState({ mode: "precise" })}
                    disabled={isBusy}
                    className={`flex-1 px-3 py-2.5 text-sm ${s.mode === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`}
                  >
                    {t("mode_precise", "Presný (prekódovanie)")}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-text-dim">
                  {t("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame.")}
                </p>
              </div>
              <div>
                <label className="block text-xs text-text-dim mb-1.5">{t("output_name", "Názov súboru")}</label>
                <input
                  value={s.outputName}
                  onChange={(e) => store.setState({ outputName: e.target.value })}
                  disabled={isBusy}
                  className="w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-dim mb-1.5">{t("output_dir", "Výstupný priečinok")}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const dir = await api.pickDirectory();
                    if (dir) store.setState({ outDir: dir });
                  }}
                  disabled={isBusy}
                  className="px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
                >
                  {s.outDir ? t("change", "Zmeniť") : t("browse", "Vybrať…")}
                </button>
                <span className="text-xs font-mono text-text-dim truncate flex-1">
                  {s.outDir || t("default_output", "(predvolený priečinok)")}
                </span>
                {s.outDir && (
                  <button
                    onClick={() => store.setState({ outDir: "" })}
                    disabled={isBusy}
                    className="px-2 py-1 text-error hover:bg-error/10 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={s.mergeAfter}
                onChange={(e) => store.setState({ mergeAfter: e.target.checked })}
                disabled={isBusy}
                className="w-4 h-4 accent-[#6366f1]"
              />
              <span className="text-sm">{t("merge_after", "Úseky aj spojiť do jedného súboru")}</span>
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.withMusic}
                  onChange={(e) => store.setState({ withMusic: e.target.checked })}
                  disabled={isBusy}
                  className="w-4 h-4 accent-[#6366f1]"
                />
                <span className="text-sm">{t("music", "Hudba")}</span>
              </label>
              {s.withMusic && (
                <div className="space-y-2 pl-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        const f = await api.pickFiles(AUDIO_FILTERS, false);
                        if (f && !Array.isArray(f)) store.setState({ music: f });
                      }}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
                    >
                      {s.music ? baseName(s.music) : t("pick_music", "Vybrať hudbu")}
                    </button>
                    {s.music && (
                      <button
                        onClick={() => store.setState({ music: null })}
                        disabled={isBusy}
                        className="px-2 py-1 text-error hover:bg-error/10 rounded text-xs"
                      >
                        ✕
                      </button>
                    )}
                    <label className="flex items-center gap-2 text-xs text-text-dim">
                      <input
                        type="checkbox"
                        checked={s.loopMusic}
                        onChange={(e) => store.setState({ loopMusic: e.target.checked })}
                        disabled={isBusy}
                        className="w-3.5 h-3.5 accent-[#6366f1]"
                      />
                      {t("loop_music", "Slučka (opakovať hudbu)")}
                    </label>
                  </div>
                  <p className="text-[10px] text-text-dim">
                    {t("music_note", "Hudba sa pridá ku každému výstupu. Končí spolu s videom; ak je kratšia a slučka je vypnutá, video sa skráti na dĺžku hudby.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chyba */}
        {s.error && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-3 text-xs text-error">{s.error}</div>
        )}

        {/* Export / úlohy */}
        {s.segments.length > 0 && (
          <div className="space-y-3">
            {s.jobs.length > 0 ? (
              <>
                <div className="space-y-3">
                  {s.jobs.map((job) => (
                    <div key={job.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium truncate">{job.label}</span>
                        <span
                          className={`text-xs font-mono ${job.status === "error" ? "text-error" : job.status === "done" ? "text-success" : "text-text-dim"}`}
                        >
                          {job.status === "running"
                            ? job.progress >= 0
                              ? `${Math.round(job.progress)}%${job.message ? ` · ${job.message}` : ""}`
                              : job.message || "…"
                            : job.status === "done"
                              ? "✓"
                              : job.status === "cancelled"
                                ? t("cancelled", "zrušené")
                                : job.status === "error"
                                  ? t("error", "chyba")
                                  : job.message}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-bg rounded-full overflow-hidden border border-border">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${job.status === "error" ? "bg-error" : job.status === "done" ? "bg-success" : "bg-accent"}`}
                          style={{
                            width:
                              job.status === "done"
                                ? "100%"
                                : `${Math.max(2, Math.min(100, job.progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {isBusy && (
                    <button
                      onClick={cancelAll}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
                    >
                      {t("cancel_all", "Zrušiť všetko")}
                    </button>
                  )}
                  {!isBusy && (
                    <button
                      onClick={resetAll}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                    >
                      {t("new_cut", "Nové strihanie")}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={exportAll}
                disabled={isBusy || !s.video}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
              >
                {t("export", "Exportovať")} ({s.segments.length} {t("pieces", "dielov")} · {fmtTime(totalDur)})
              </button>
            )}
          </div>
        )}

    </div>
  );
}

// Registrácia do pravého panelu core
if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}

// ---------------------------------------------------------------------------
// Hlavný komponent — prehrávač, úseky, výstup
// ---------------------------------------------------------------------------

function Cutter() {
  const s = useStore();
  const saveTimer = useRef(null);
  const g = duration();
  const isBusy = busy();
  const totalDur = useMemo(() => s.segments.reduce((a, seg) => a + (seg.end - seg.start), 0), [s.segments]);

  // Obnova relácie + predvolený výstupný priečinok
  useEffect(() => {
    api
      .invoke("get_last_output_dir")
      .then((dir) => {
        if (dir) store.setState({ outDir: dir });
      })
      .catch(() => {});
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
          loopMusic: sess.loopMusic !== false,
        };
        if (sess.mode === "copy" || sess.mode === "precise") patch.mode = sess.mode;
        if (sess.outputName) patch.outputName = sess.outputName;
        if (sess.videoPath) {
          let info = null;
          try {
            info = await api.invoke("get_video_info", { path: sess.videoPath });
          } catch {}
          if (info) {
            patch.video = { path: sess.videoPath, info };
            log(`${t("loaded", "Načítané")}: ${baseName(sess.videoPath)} (${fmtTime(info.duration)})`);
          }
        }
        store.setState(patch);
      } catch {}
      store.setState({ restored: true });
    })();
  }, []);

  // Ukladanie relácie (debounce 600 ms, nie počas exportu)
  useEffect(() => {
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
        outputName: st.outputName,
      };
      api.invoke("set_module_config", { id: api.moduleId, config: { session } }).catch(() => {});
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [s.video, s.selStart, s.selEnd, s.segments, s.mode, s.mergeAfter, s.withMusic, s.music, s.loopMusic, s.outputName, s.restored, isBusy]);

  // Playhead — poll <video> 5× za sekundu + doplnenie dĺžky z elementu
  useEffect(() => {
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
          selEnd: cur.selEnd <= 0 ? v.duration : cur.selEnd,
        }));
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.video?.path, g]);

  const PlayerShell = api.PlayerShell;
  const setStart = (str) =>
    store.setState((st) => ({ selStart: Math.max(0, Math.min(parseTime(str), st.selEnd - 0.1)) }));
  const setEnd = (str) =>
    store.setState((st) => ({ selEnd: Math.min(duration(), Math.max(parseTime(str), st.selStart + 0.1)) }));

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Video + časové polia */}
        <div className="bg-bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("video", "Video")}</h2>
            <button
              onClick={pickVideo}
              disabled={isBusy}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {s.video ? t("change_video", "Zmeniť video") : t("pick_video", "Vybrať video")}
            </button>
          </div>

          {s.video && (
            <>
              <p className="text-xs font-mono text-text-dim break-all">
                {baseName(s.video.path)} · {fmtTime(g)}
                {s.video.info ? ` · ${s.video.info.width}×${s.video.info.height} · ${s.video.info.codec}` : ""}
              </p>
              <div
                ref={(el) => {
                  shared.playerBox = el;
                }}
                className="rounded-xl overflow-hidden border border-border bg-black"
              >
                <PlayerShell src={s.video.path} />
              </div>
              {/* Fallback: starší core bez spodného panelu — os priamo v module */}
              {!api.registerBottomPanel && (
                <div className="h-28">
                  <Timeline />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs text-text-dim mb-1">{t("start", "Štart")}</label>
                  <input
                    defaultValue={fmtTime(s.selStart)}
                    key={`s-${s.selStart.toFixed(2)}`}
                    onBlur={(e) => setStart(e.target.value)}
                    disabled={isBusy}
                    className="w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-dim mb-1">{t("end", "Koniec")}</label>
                  <input
                    defaultValue={fmtTime(s.selEnd)}
                    key={`e-${s.selEnd.toFixed(2)}`}
                    onBlur={(e) => setEnd(e.target.value)}
                    disabled={isBusy}
                    className="w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-dim font-mono">{fmtTime(s.selEnd - s.selStart)}</span>
                  <button
                    onClick={addSegment}
                    disabled={isBusy || s.selEnd - s.selStart < 0.1}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
                  >
                    + {t("add_cut", "Pridať úsek")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Zoznam úsekov */}
        {s.segments.length > 0 && (
          <div className="bg-bg-card rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-3">
              {t("segments", "Úseky")} ({s.segments.length}) · {fmtTime(totalDur)}
            </h2>
            <div className="space-y-1.5">
              {s.segments.map((seg, i) => (
                <div key={seg.id} className="flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }} />
                  <span className="text-sm font-medium">
                    {t("segment", "Úsek")} {i + 1}
                  </span>
                  <span className="text-xs font-mono text-text-dim">
                    {fmtTime(seg.start)} → {fmtTime(seg.end)}
                  </span>
                  <span className="text-xs text-text-dim">({fmtTime(seg.end - seg.start)})</span>
                  <button
                    onClick={() =>
                      store.setState((st) => ({ segments: st.segments.filter((x) => x.id !== seg.id) }))
                    }
                    disabled={isBusy}
                    className="ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

{/* Nastavenia výstupu a export sú v pravom panelu core */}
        {!api.registerSidePanel && (
          <div className="bg-bg-card rounded-2xl border border-border p-6">
            <SidePanel />
          </div>
        )}

        {/* Log */}
        {s.log.length > 0 && (
          <div className="bg-bg-card rounded-2xl border border-border p-4">
            <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("log", "Log")}</h3>
            <div className="max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5">
              {s.log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cutter;
