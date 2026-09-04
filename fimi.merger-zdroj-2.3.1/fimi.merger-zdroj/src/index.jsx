// fimi.merger v2.3.1 — Spájač
// Layout: zdroj + lety + náhľad v hlavnej ploche, hudba/výstup/spustenie
// v pravom paneli core (registerSidePanel), nástroje v toolbare (registerToolbar).
// Zdieľaný stav ide cez modulový store (panel sa renderuje v strome core).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useMemo, useRef, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
const AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }];
const PRESETS = [
  { id: "youtube_4k", label: "YouTube 4K" },
  { id: "youtube_1080", label: "YouTube 1080p" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "email", label: "E-mail (malé)" },
  { id: "archive", labelKey: "preset_archive" },
];

// ---------------------------------------------------------------------------
// Pomocné funkcie
// ---------------------------------------------------------------------------

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

// ---------------------------------------------------------------------------
// Modulový store
// ---------------------------------------------------------------------------

const initialState = {
  folder: "",
  flights: [],        // { checked, clips: {checked, path, size_mb, time}[], total_mb, split_reason }[]
  manual: [],         // string[]
  sdFolders: [],      // { path, mp4_count }[]
  mode: "flights",    // "flights" | "all"
  outputName: "merged",
  outDir: "",
  musicEnabled: false,
  music: null,
  loopMusic: true,
  convertAfter: false,
  preset: "youtube_1080",
  preview: null,      // path | null
  scanning: false,
  error: "",
  jobs: [],
  log: [],
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

const shared = { cancelFlag: { current: false }, scrollEl: { current: null } };

/** Otvorí/zavrie náhľad a odroluje hore, kde je prehrávač. */
function openPreview(path) {
  const s = store.getState();
  const next = s.preview === path ? null : path;
  store.setState({ preview: next });
  if (next && shared.scrollEl.current) {
    shared.scrollEl.current.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/** Cache miniatur (path -> blob URL | "error"). Žije, kým žije modul. */
const thumbCache = new Map();

function log(msg) {
  store.setState((s) => ({
    log: [...s.log.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`],
  }));
}

function busy() {
  return store.getState().jobs.some((j) => j.status === "running");
}

/** Všetky vybrané klipy z letov + ručne pridané (bez duplicít). */
function selectedPaths() {
  const s = store.getState();
  const fromFlights = s.flights
    .filter((f) => f.checked)
    .flatMap((f) => f.clips.filter((c) => c.checked).map((c) => c.path));
  return [...fromFlights, ...s.manual.filter((m) => !fromFlights.includes(m))];
}

// ---------------------------------------------------------------------------
// Akcie (modulový scope — použiteľné z toolbaru aj UI)
// ---------------------------------------------------------------------------

async function scanFolder(folder) {
  store.setState({ scanning: true, error: "" });
  try {
    const res = await api.invoke("analyze_flights", { folder });
    let flights = [];
    if (Array.isArray(res)) flights = res;
    else if (res && typeof res === "object" && Array.isArray(res.flights)) flights = res.flights;
    else throw new Error(t("bad_response", "Neočakávaná odpoveď z core."));
    const withChecks = flights.map((f) => ({
      ...f,
      checked: true,
      clips: (Array.isArray(f.clips) ? f.clips : []).map((c) => ({ ...c, checked: true })),
    }));
    store.setState({ flights: withChecks });
    log(`${t("scan_done", "Skenovanie dokončené")}: ${folder} — ${withChecks.length} ${t("flights", "letov")}`);
    if (!withChecks.length) log(t("no_videos", "V priečinku nie sú žiadne videá."));
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
  log(`${t("added_manual", "Pridané ručne")}: ${list.length}`);
}

function toggleFlight(fi) {
  store.setState((s) => ({
    flights: s.flights.map((f, i) => (i === fi ? { ...f, checked: !f.checked } : f)),
  }));
}

function toggleClip(fi, ci) {
  store.setState((s) => ({
    flights: s.flights.map((f, i) =>
      i === fi
        ? { ...f, clips: f.clips.map((c, j) => (j === ci ? { ...c, checked: !c.checked } : c)) }
        : f,
    ),
  }));
}

function checkAll(value) {
  store.setState((s) => ({
    flights: s.flights.map((f) => ({
      ...f,
      checked: value,
      clips: f.clips.map((c) => ({ ...c, checked: value })),
    })),
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

async function startMerge() {
  const s = store.getState();
  store.setState({ error: "" });
  shared.cancelFlag.current = false;

  const groups = [];
  if (s.mode === "flights" && s.flights.some((f) => f.checked)) {
    s.flights
      .filter((f) => f.checked)
      .forEach((f, i) => {
        const files = f.clips.filter((c) => c.checked).map((c) => c.path);
        if (files.length) groups.push({ files, name: `${s.outputName}_flight${i + 1}` });
      });
    if (s.manual.length) groups.push({ files: s.manual, name: `${s.outputName}_manual` });
  } else {
    groups.push({ files: selectedPaths(), name: s.outputName });
  }

  if (!groups.length || groups.every((g) => g.files.length < 1)) {
    store.setState({ error: t("nothing_selected", "Nie je vybrané žiadne video.") });
    return;
  }

  log(`${t("start_log", "Spúšťam")} ${groups.length} ${t("jobs_word", "úloh")}…`);
  store.setState({
    jobs: groups.map((g, i) => ({
      id: `pending-${i}`,
      moduleId: api.moduleId,
      label: g.name,
      status: "running",
      progress: -1,
      message: t("queued", "Čaká v rade"),
      result: null,
    })),
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
        loopMusic: s.loopMusic,
      });
      store.setState((st) => {
        const jobs = [...st.jobs];
        jobs[i] = { ...jobs[i], id: jobId, progress: 0, message: "" };
        return { jobs };
      });
      log(`▶ ${g.name} (${g.files.length} ${t("videos_count", "videí")})`);
      const res = await watchJob(jobId);
      if (res.status === "done" && res.result) {
        log(`✓ ${res.result}`);
        if (api.setActiveMedia) api.setActiveMedia(res.result);
        if (s.convertAfter) {
          const preset = PRESETS.find((p) => p.id === s.preset);
          const label = preset ? (preset.labelKey ? t(preset.labelKey, preset.labelKey) : preset.label) : s.preset;
          log(`${t("converting", "Konvertujem")}: ${label}`);
          const convId = await api.invoke("convert_video", {
            input: res.result,
            preset: s.preset,
            moduleId: api.moduleId,
            outputDir: s.outDir || null,
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
                result: null,
              },
            ],
          }));
          const convRes = await watchJob(convId);
          if (convRes.status === "done") {
            log(`✓ ${convRes.result}`);
            if (convRes.result && api.setActiveMedia) api.setActiveMedia(convRes.result);
          }
        }
      } else if (res.status === "error") {
        log(`✗ ${g.name}: ${res.message}`);
      } else if (res.status === "cancelled") {
        log(`⊘ ${g.name}: ${t("cancelled", "zrušené")}`);
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
  log(t("finished_log", "Spracovanie ukončené."));
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
    sdFolders: store.getState().sdFolders,
  });
}

// ---------------------------------------------------------------------------
// Miniatúra videa — karta v mriežke
// ---------------------------------------------------------------------------

function ThumbCard({ path, checked, onToggle, onRemove, disabled }) {
  const s = useStore();
  const [thumb, setThumb] = useState(() => thumbCache.get(path) || null);
  const active = s.preview === path;

  useEffect(() => {
    let alive = true;
    if (thumbCache.has(path)) {
      setThumb(thumbCache.get(path));
      return;
    }
    api
      .invoke("video_thumbnail", { path, atSeconds: 1 })
      .then((bytes) => {
        if (!alive) return;
        const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const url = URL.createObjectURL(new Blob([arr], { type: "image/jpeg" }));
        thumbCache.set(path, url);
        setThumb(url);
      })
      .catch(() => {
        thumbCache.set(path, "error");
        if (alive) setThumb("error");
      });
    return () => {
      alive = false;
    };
  }, [path]);

  return (
    <div
      onClick={() => openPreview(path)}
      title={path}
      style={{ cursor: "pointer" }}
      className={`rounded-xl overflow-hidden border transition-colors ${active ? "border-accent" : "border-border hover:border-accent/40"} bg-bg`}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
        {thumb && thumb !== "error" ? (
          <img
            src={thumb}
            alt={baseName(path)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: "#64748b",
            }}
          >
            {thumb === "error" ? "🎬" : "…"}
          </div>
        )}
        {/* štvorček na označenie — vľavo hore */}
        <input
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          style={{ position: "absolute", top: 6, left: 6, width: 16, height: 16, accentColor: "#6366f1", cursor: "pointer" }}
        />
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            style={{ position: "absolute", top: 4, right: 4 }}
            className="px-1.5 py-0.5 rounded text-[10px] text-error bg-black/60 hover:bg-error/20"
          >
            ✕
          </button>
        )}
        {active && (
          <div
            style={{ position: "absolute", bottom: 4, right: 6 }}
            className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-white"
          >
            ▶
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[11px] truncate">{baseName(path)}</p>
      </div>
    </div>
  );
}

const THUMB_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 10,
};

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

if (api.registerToolbar) {
  api.registerToolbar([
    {
      id: "scan",
      icon: "📂",
      labelKey: "tool_scan",
      onClick: () => {
        if (!busy() && !store.getState().scanning) void pickAndScan();
      },
    },
    {
      id: "add",
      icon: "➕",
      labelKey: "tool_add",
      onClick: () => {
        if (!busy()) void addManual();
      },
    },
    {
      id: "start",
      icon: "▶️",
      labelKey: "tool_start",
      onClick: () => {
        if (!busy()) void startMerge();
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Bočný panel — hudba, výstup, spustenie (pravý panel core)
// ---------------------------------------------------------------------------

function SidePanel() {
  const s = useStore();
  const isBusy = busy();
  const total = selectedPaths().length;

  return (
    <div className="space-y-4 px-1">
      {/* Hudba */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.musicEnabled}
            onChange={(e) => store.setState({ musicEnabled: e.target.checked })}
            disabled={isBusy}
            className="w-4 h-4 accent-[#6366f1]"
          />
          <span className="text-sm font-medium">{t("music", "Hudba na pozadí")}</span>
        </label>
        {s.musicEnabled && (
          <div className="flex flex-wrap items-center gap-2 pl-7">
            <button
              onClick={async () => {
                const f = await api.pickFiles(AUDIO_FILTERS, false);
                if (f && !Array.isArray(f)) store.setState({ music: f });
              }}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
            >
              {s.music ? baseName(s.music) : t("pick_music", "Vybrať hudobný súbor")}
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
              {t("loop_music", "Opakovať hudbu (slučka)")}
            </label>
          </div>
        )}
      </div>

      {/* Výstup */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider px-1">
          {t("output", "Výstup")}
        </h3>

        <div>
          <label className="block text-xs text-text-dim mb-1.5">{t("merge_mode", "Režim spájania")}</label>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => store.setState({ mode: "flights" })}
              disabled={isBusy}
              className={`flex-1 px-3 py-2 text-xs ${s.mode === "flights" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`}
            >
              {t("mode_flights", "Podľa letov")}
            </button>
            <button
              onClick={() => store.setState({ mode: "all" })}
              disabled={isBusy}
              className={`flex-1 px-3 py-2 text-xs ${s.mode === "all" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`}
            >
              {t("mode_all", "Všetko do jedného")}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-dim mb-1.5">{t("output_name", "Názov súboru")}</label>
          <input
            type="text"
            value={s.outputName}
            onChange={(e) => store.setState({ outputName: e.target.value })}
            disabled={isBusy}
            className="w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs text-text-dim mb-1.5">{t("output_dir", "Výstupný priečinok (voliteľné)")}</label>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const dir = await api.pickDirectory();
                if (dir) store.setState({ outDir: dir });
              }}
              disabled={isBusy}
              className="px-3 py-2 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
            >
              {s.outDir ? t("change", "Zmeniť") : t("browse", "Vybrať…")}
            </button>
            <span className="text-[11px] font-mono text-text-dim truncate flex-1">
              {s.outDir || t("default_output", "(predvolený priečinok aplikácie)")}
            </span>
            {s.outDir && (
              <button
                onClick={() => store.setState({ outDir: "" })}
                disabled={isBusy}
                className="px-2 py-1 text-error hover:bg-error/10 rounded text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.convertAfter}
            onChange={(e) => store.setState({ convertAfter: e.target.checked })}
            disabled={isBusy}
            className="w-4 h-4 accent-[#6366f1]"
          />
          <span className="text-sm">{t("convert_after", "Po spojení konvertovať")}</span>
        </label>
        {s.convertAfter && (
          <select
            value={s.preset}
            onChange={(e) => store.setState({ preset: e.target.value })}
            disabled={isBusy}
            className="w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm text-text outline-none"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.labelKey ? t(p.labelKey, p.labelKey) : p.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chyba */}
      {s.error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-3 text-xs text-error">{s.error}</div>
      )}

      {/* Spustenie / úlohy */}
      {s.jobs.length > 0 ? (
        <div className="space-y-3">
          {s.jobs.map((job) => (
            <div key={job.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium truncate">{job.label}</span>
                <span
                  className={`text-[11px] font-mono ${job.status === "error" ? "text-error" : job.status === "done" ? "text-success" : "text-text-dim"}`}
                >
                  {job.status === "running"
                    ? job.progress >= 0
                      ? `${Math.round(job.progress)}%`
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
              <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${job.status === "error" ? "bg-error" : job.status === "done" ? "bg-success" : "bg-accent"}`}
                  style={{
                    width: job.status === "done" ? "100%" : `${Math.max(2, Math.min(100, job.progress))}%`,
                  }}
                />
              </div>
              {job.result && (
                <p className="mt-1 text-[10px] font-mono text-text-dim break-all">{job.result}</p>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            {isBusy && (
              <button
                onClick={cancelAll}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
              >
                {t("cancel_all", "Zrušiť všetko")}
              </button>
            )}
            {!isBusy && (
              <button
                onClick={resetAll}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                {t("new_merge", "Nové spájanie")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={startMerge}
          disabled={isBusy || s.scanning || total < 1}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
        >
          {t("start_merge", "Spustiť spracovanie")} ({total} {t("videos_count", "videí")})
        </button>
      )}
    </div>
  );
}

// Registrácia do pravého panelu core
if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}

// ---------------------------------------------------------------------------
// Hlavný komponent — zdroj, lety, náhľad
// ---------------------------------------------------------------------------

function Merger() {
  const s = useStore();
  const saveTimer = useRef(null);
  const isBusy = busy();
  const selectedMb = useMemo(
    () =>
      s.flights
        .filter((f) => f.checked)
        .reduce((a, f) => a + f.clips.filter((c) => c.checked).reduce((b, c) => b + c.size_mb, 0), 0),
    [s.flights],
  );

  // Nájdené SD karty + obnova relácie
  useEffect(() => {
    api
      .invoke("find_media_folders")
      .then((folders) => {
        store.setState({ sdFolders: folders });
        if (folders.length) log(`${t("sd_found", "Nájdené médiá")}: ${folders.length}`);
      })
      .catch(() => {});
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
      } catch {}
      store.setState({ restored: true });
    })();
  }, []);

  // Ukladanie relácie (debounce 600 ms, nie počas behu úloh)
  useEffect(() => {
    if (!s.restored || isBusy) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const st = store.getState();
      api
        .invoke("set_module_config", {
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
              preset: st.preset,
            },
          },
        })
        .catch(() => {});
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [s.folder, s.manual, s.mode, s.outputName, s.musicEnabled, s.music, s.loopMusic, s.convertAfter, s.preset, s.restored, isBusy]);

  const PlayerShell = api.PlayerShell;

  return (
    <div ref={(el) => (shared.scrollEl.current = el)} className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Zdroj videí */}
        <div className="bg-bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">{t("source", "Zdroj videí")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={pickAndScan}
              disabled={s.scanning || isBusy}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {s.scanning ? t("loading", "Načítavam…") : t("scan_folder", "Vybrať priečinok a skenovať")}
            </button>
            <button
              onClick={addManual}
              disabled={isBusy}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {t("add_videos", "Pridať videá ručne")}
            </button>
            {s.flights.length > 0 && (
              <>
                <button
                  onClick={() => checkAll(true)}
                  disabled={isBusy}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
                >
                  {t("check_all", "Vybrať všetko")}
                </button>
                <button
                  onClick={() => checkAll(false)}
                  disabled={isBusy}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
                >
                  {t("uncheck_all", "Zrušiť výber")}
                </button>
              </>
            )}
          </div>

          {s.sdFolders.length > 0 && !s.flights.length && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">
                {t("sd_cards", "Nájdené médiá (SD karty)")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {s.sdFolders.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => {
                      store.setState({ folder: f.path });
                      void scanFolder(f.path);
                    }}
                    disabled={s.scanning || isBusy}
                    className="px-3 py-2 rounded-xl text-xs font-mono bg-bg border border-border hover:border-accent/40 transition-colors disabled:opacity-50"
                  >
                    {f.path} <span className="text-accent">({f.mp4_count} mp4)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {s.folder && <p className="mt-3 text-xs font-mono text-text-dim break-all">{s.folder}</p>}

          {/* Prehrávač — vždy hore */}
          {s.preview && (
            <div className="mt-4 rounded-xl overflow-hidden border border-accent/50 bg-black">
              <PlayerShell src={s.preview} />
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-card border-t border-border">
                <span className="flex-1 text-xs truncate">{baseName(s.preview)}</span>
                <button
                  onClick={() => store.setState({ preview: null })}
                  className="text-[10px] px-2 py-1 rounded text-text-dim border border-border hover:border-accent/40"
                >
                  {t("close", "Zavrieť")}
                </button>
              </div>
            </div>
          )}

          {s.flights.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">
                {t("flights", "Lety")} ({s.flights.length}) · {selectedMb.toFixed(0)} MB
              </h3>
              {s.flights.map((flight, fi) => (
                <div key={fi} className="rounded-xl border border-border bg-bg overflow-hidden">
                  <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-bg-card-hover/50">
                    <input
                      type="checkbox"
                      checked={flight.checked}
                      onChange={() => toggleFlight(fi)}
                      disabled={isBusy}
                      className="w-4 h-4 accent-[#6366f1]"
                    />
                    <span className="font-medium text-sm">
                      {t("flight", "Let")} {fi + 1}
                    </span>
                    <span className="text-xs text-text-dim">
                      {flight.clips.length} {t("videos_count", "videí")} · {flight.total_mb.toFixed(0)} MB
                    </span>
                    <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent">
                      {flight.split_reason}
                    </span>
                  </label>
                  <div className="border-t border-border p-3" style={THUMB_GRID}>
                    {flight.clips.map((clip, ci) => (
                      <ThumbCard
                        key={clip.path}
                        path={clip.path}
                        checked={clip.checked}
                        disabled={isBusy || !flight.checked}
                        onToggle={() => toggleClip(fi, ci)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {s.manual.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">
                {t("manual_videos", "Ručne pridané")} ({s.manual.length})
              </h3>
              <div style={THUMB_GRID}>
                {s.manual.map((path, i) => (
                  <ThumbCard
                    key={path}
                    path={path}
                    checked
                    disabled={isBusy}
                    onRemove={() => store.setState((st) => ({ manual: st.manual.filter((_, j) => j !== i) }))}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Fallback: starší core bez pravého panelu */}
        {!api.registerSidePanel && (
          <div className="bg-bg-card rounded-2xl border border-border p-6">
            <SidePanel />
          </div>
        )}

        {/* Chyba (keď je side panel aktívny, chyba je tam; tu pre fallback) */}
        {!api.registerSidePanel && s.error && null}

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

export default Merger;
