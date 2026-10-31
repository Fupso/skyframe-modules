// rod.reels v1.1.0 — Reels: automatický zostrih krátkych videí
// Režimy strihu:
//   strop  — kamera položená na strope: analýza snímok (1,5 fps strip z
//            core) deteguje MANIPULÁCIU (globálny pohyb celého obrazu =
//            kladenie/dvíhanie telefónu, prípadne zakrytá/uniformná snímka)
//            a ponechá stabilné úseky medzi ňou. Strih = hranice manipulácie,
//            s rezervou (margin) na oboch stranách.
//   high   — klasické highlighty z jadra (pohyb + zvuk), pre „normálne" zábery
//   whole  — celé video, len spojenie/úpravy (predstavenia…)
// Ďalej: auto_reframe (9:16/1:1), hudba (nahrádza zvuk), AI obrazový preset
// (curves+eq → v Editore beží čisto cez GPU-live).
// Layout: hlavná plocha = klipy + náhľad výsledku; nastavenia v pravom
// paneli core (registerSidePanel).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useRef, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];
const AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }];

// ---------------------------------------------------------------------------
// Preset balíčky obrazu — LEN curves + eq=saturation (obe parsuje jadro na
// GPU-live: krok v Editore beží živo, bez proxy renderu).
// ---------------------------------------------------------------------------
const PRESETS = [
  { id: "cisty", icon: "✨", r: [[0,0],[0.25,0.26],[0.5,0.51],[0.75,0.76],[1,1]], sat: 1.06 },
  { id: "zivy", icon: "🌈", r: [[0,0],[0.25,0.235],[0.5,0.5],[0.75,0.765],[1,1]], sat: 1.28 },
  { id: "filmovy", icon: "🎬", r: [[0,0],[0.5,0.47],[1,1]], g: [[0,0],[0.5,0.5],[1,1]], b: [[0,0.05],[0.5,0.5],[1,0.94]], sat: 0.96 },
  { id: "matny", icon: "🌫️", r: [[0,0.06],[0.5,0.53],[1,0.97]], sat: 0.9 },
  { id: "kontrastny", icon: "⚡", r: [[0,0],[0.25,0.19],[0.5,0.5],[0.75,0.81],[1,1]], sat: 1.08 },
  { id: "teply", icon: "🌅", r: [[0,0],[0.5,0.53],[1,1]], g: [[0,0.005],[0.5,0.5],[1,0.99]], b: [[0,0],[0.5,0.46],[1,0.93]], sat: 1.05 },
];

function clamp01(v) { return Math.min(1, Math.max(0, v)); }

function buildPresetVf(presetId, intensity) {
  const p = PRESETS.find((x) => x.id === presetId) || PRESETS[0];
  const it = clamp01(intensity);
  const chan = (pts) =>
    (pts || p.r).map(([x, y]) => `${x.toFixed(3)}/${(x + (y - x) * it).toFixed(3)}`).join(" ");
  const parts = [`curves=r='${chan(p.r)}':g='${chan(p.g)}':b='${chan(p.b)}'`];
  const sat = 1 + (p.sat - 1) * it;
  if (Math.abs(sat - 1) > 0.005) parts.push(`eq=saturation=${sat.toFixed(3)}`);
  return parts.join(",");
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
const initialState = {
  clips: [],
  mode: "strop",        // strop | high | whole
  targetSecs: 30,       // len režim high
  margin: 1.5,          // rezerva na hraniciach strihu (režim strop), sekundy
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
  jobs: [],
  running: false,
  stage: "",
  error: "",
  log: [],
  cfgLoaded: false,
};

let state = { ...initialState };
const listeners = new Set();
const store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    listeners.forEach((l) => l());
  },
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
};
function useStore() { return useSyncExternalStore(store.subscribe, store.getState); }

function baseName(p) { return (p || "").split(/[\\/]/).pop() ?? p; }

function log(msg) {
  store.setState((s) => ({ log: [...s.log.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`] }));
}

function watchJob(jobId) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      store.setState((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? job : j)) }));
      if (job.status !== "running") { unlisten?.(); resolve(job); }
    }).then((u) => { unlisten = u; });
  });
}

function pushJob(label) {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  store.setState((s) => ({ jobs: [...s.jobs, { id, label, status: "running", progress: 0, message: "", result: null }] }));
  return id;
}
function swapJobId(oldId, newId) {
  store.setState((s) => ({ jobs: s.jobs.map((j) => (j.id === oldId ? { ...j, id: newId } : j)) }));
}

// ---------------------------------------------------------------------------
// Analýza „strop": nájde stabilné úseky medzi manipuláciou s kamerou.
// Vstup: cesta k videu. Výstup: pole [start, end] (sekundy) alebo null =
// nepoužiteľné (vezme sa celé).
// ---------------------------------------------------------------------------
async function ceilingSegments(path, marginSec) {
  const info = await api.invoke("get_video_info", { path });
  const dur = info?.duration || 0;
  if (dur < 6) return [[0, dur]];

  // ~1,5 vzorky/s (core clamp 50–800) — na detekciu manipulácie stačí
  const count = Math.max(50, Math.min(800, Math.ceil(dur * 1.5)));
  const strip = await api.invoke("video_thumbs_strip", { path, count });
  const dir = strip.dir, n = strip.count;
  const dt = dur / n; // časový krok medzi snímkami

  const W = 48;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true });

  const cov = new Array(n).fill(0);  // podiel silno zmenených pixelov vs. predošlá snímka
  const uni = new Array(n).fill(0);  // smerodajná odchýlka jasu (nízka = uniformná snímka)
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
      const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
      cv.width = W; cv.height = h;
      ctx.drawImage(img, 0, 0, W, h);
      const d = ctx.getImageData(0, 0, W, h).data;
      const m = W * h;
      gray = new Float32Array(m);
      let sL = 0, sL2 = 0;
      for (let j = 0, p = 0; j < d.length; j += 4, p++) {
        const L = 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2];
        gray[p] = L; sL += L; sL2 += L * L;
      }
      uni[i - 1] = Math.sqrt(Math.max(0, sL2 / m - (sL / m) * (sL / m)));
      if (prev && prev.length === m) {
        let ch = 0;
        for (let p = 0; p < m; p++) if (Math.abs(gray[p] - prev[p]) > 25) ch++;
        cov[i - 1] = ch / m;
      }
    } catch { /* chýbajúca snímka → nuly */ }
    prev = gray;
    if (i % 25 === 0) store.setState({ stage: `${t("stage_analyze", "Analyzujem záber…")} ${Math.round((i / n) * 100)} %` });
  }

  // manipulácia = globálna zmena (kladie/dvíha telefón: prakticky celý obraz
  // sa zmení) ALEBO takmer uniformná snímka (čistý strop / zakrytá šošovka)
  const manip = cov.map((c, i) => c > 0.55 || (uni[i] > 0 && uni[i] < 12));
  // vyhladenie: osamelé zábery nech nerozsekajú úsek (2 susedia rozhodnú)
  for (let i = 1; i < n - 1; i++) {
    if (!manip[i] && manip[i - 1] && manip[i + 1]) manip[i] = true;
  }

  // súvislé úseky obsahu (nie manipulácia), min. 4 s
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

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
async function runPipeline() {
  const s = store.getState();
  if (!s.clips.length || s.running) return;
  store.setState({ running: true, error: "", result: null, resultInfo: null, jobs: [], stage: "" });
  try {
    const paths = await api.invoke("get_app_paths");
    const tempDir = paths.temp_dir;
    let work = null;

    if (s.mode === "strop") {
      // 1) per-klip analýza manipulácie → vystrihnuté stabilné úseky
      const cutFiles = [];
      for (let ci = 0; ci < s.clips.length; ci++) {
        const clip = s.clips[ci];
        store.setState({ stage: `${t("stage_analyze", "Analyzujem záber…")} (${ci + 1}/${s.clips.length})` });
        log(`▶ ${t("stage_analyze", "Analyzujem záber…")} ${baseName(clip)}`);
        const segs = await ceilingSegments(clip, s.margin);
        if (!segs) {
          log(`⚠ ${baseName(clip)}: ${t("no_segments", "žiadny stabilný úsek — beriem celý klip")}`);
          cutFiles.push(clip);
          continue;
        }
        log(`✓ ${baseName(clip)}: ${segs.length} ${t("segments", "úsekov")} (${segs.map(([a, b]) => `${a.toFixed(0)}–${b.toFixed(0)} s`).join(", ")})`);
        for (let si = 0; si < segs.length; si++) {
          const [a, b] = segs[si];
          store.setState({ stage: `${t("stage_cut", "Vystrihujem úseky…")} ${ci + 1}.${si + 1}` });
          const jid = pushJob(`${t("stage_cut", "Strih")} ${ci + 1}.${si + 1}`);
          const jobId = await api.invoke("trim_video", {
            input: clip, start: a, end: b, mode: "precise",
            outputName: `reels-cut-${ci}-${si}`, outputDir: tempDir, moduleId: api.moduleId,
          });
          swapJobId(jid, jobId);
          const res = await watchJob(jobId);
          if (res.status !== "done" || !res.result) throw new Error(res.message || "trim");
          cutFiles.push(res.result);
        }
      }
      // 2) spojenie úsekov
      if (cutFiles.length === 1) {
        work = cutFiles[0];
      } else {
        store.setState({ stage: t("stage_merge", "Spájam klipy…") });
        const jid = pushJob(t("stage_merge", "Spájam klipy"));
        const jobId = await api.invoke("merge_videos", {
          files: cutFiles, outputName: "reels-src", music: null,
          moduleId: api.moduleId, outputDir: tempDir, loopMusic: false,
        });
        swapJobId(jid, jobId);
        log(`▶ ${t("stage_merge", "Spájam klipy")} (${cutFiles.length})`);
        const res = await watchJob(jobId);
        if (res.status !== "done" || !res.result) throw new Error(res.message || t("merge_failed", "Spojenie zlyhalo"));
        work = res.result;
        log(`✓ ${baseName(work)}`);
      }
      store.setState({ working: work });
    } else {
      // high / whole: najprv spojenie (ak je viac klipov)
      work = s.clips[0];
      if (s.clips.length > 1) {
        store.setState({ stage: t("stage_merge", "Spájam klipy…") });
        const jid = pushJob(t("stage_merge", "Spájam klipy"));
        const jobId = await api.invoke("merge_videos", {
          files: s.clips, outputName: "reels-src", music: null,
          moduleId: api.moduleId, outputDir: tempDir, loopMusic: false,
        });
        swapJobId(jid, jobId);
        log(`▶ ${t("stage_merge", "Spájam klipy")} (${s.clips.length})`);
        const res = await watchJob(jobId);
        if (res.status !== "done" || !res.result) throw new Error(res.message || t("merge_failed", "Spojenie zlyhalo"));
        work = res.result;
        store.setState({ working: work });
        log(`✓ ${baseName(work)}`);
      }

      // highlighty (len režim high)
      const info = await api.invoke("get_video_info", { path: work });
      const dur = info?.duration || 0;
      if (s.mode === "high") {
        if (dur > s.targetSecs + 5) {
          store.setState({ stage: t("stage_highlights", "Hľadám najlepšie momenty…") });
          const jid = pushJob(t("stage_highlights", "Zostrih highlightov"));
          try {
            const jobId = await api.invoke("auto_highlights", {
              input: work, targetSecs: s.targetSecs, moduleId: api.moduleId,
            });
            swapJobId(jid, jobId);
            log(`▶ ${t("stage_highlights", "Zostrih highlightov")} → ${s.targetSecs} s`);
            const res = await watchJob(jobId);
            if (res.status !== "done" || !res.result) throw new Error(res.message || "highlights");
            work = res.result;
            log(`✓ ${baseName(work)}`);
          } catch (e) {
            log(`⚠ ${t("highlights_skipped", "Zostrih preskočený — použije sa celé video")}`);
            store.setState((st) => ({ jobs: st.jobs.filter((j) => j.id !== jid) }));
          }
        } else {
          log(`ℹ ${t("short_video", "Video je kratšie ako cieľ — použije sa celé")}`);
        }
      } else {
        log(`ℹ ${t("whole_video", "Režim Celé — video sa neskracuje")}`);
      }
    }

    // 3) formát (9:16 / 1:1)
    let framed = work;
    if (s.aspect !== "orig") {
      store.setState({ stage: t("stage_reframe", "Režem na formát…") });
      const jid = pushJob(`Auto Reframe ${s.aspect}`);
      const jobId = await api.invoke("auto_reframe", {
        input: work, aspect: s.aspect, moduleId: api.moduleId, track: null,
      });
      swapJobId(jid, jobId);
      log(`▶ Auto Reframe ${s.aspect}`);
      const res = await watchJob(jobId);
      if (res.status !== "done" || !res.result) throw new Error(res.message || "reframe");
      framed = res.result;
      log(`✓ ${baseName(framed)}`);
    }

    // 4) hudba
    let final = framed;
    if (s.music) {
      store.setState({ stage: t("stage_music", "Pridávam hudbu…") });
      const jid = pushJob(t("stage_music", "Hudba"));
      const jobId = await api.invoke("merge_videos", {
        files: [framed], outputName: "reels-music", music: s.music,
        moduleId: api.moduleId, outputDir: tempDir, loopMusic: s.loopMusic,
      });
      swapJobId(jid, jobId);
      log(`▶ ${t("stage_music", "Hudba")}: ${baseName(s.music)}`);
      const res = await watchJob(jobId);
      if (res.status !== "done" || !res.result) throw new Error(res.message || "music");
      final = res.result;
      log(`✓ ${baseName(final)}`);
    }

    const finfo = await api.invoke("get_video_info", { path: final });
    store.setState({ result: final, resultInfo: finfo || null, stage: "" });
    if (api.setActiveMedia) api.setActiveMedia(final);
    log(`✅ ${t("done", "Hotovo")}: ${baseName(final)}`);
  } catch (e) {
    const msg = String(e);
    store.setState({ error: msg, stage: "" });
    log(`✗ ${msg}`);
  } finally {
    store.setState({ running: false });
  }
}

// ---------------------------------------------------------------------------
// AI analýza obrazu — 3 snímky (20/50/80 %), jas + kontrast + sýtosť
// ---------------------------------------------------------------------------
async function analyzeLook() {
  const s = store.getState();
  const src = s.result || s.working || s.clips[0];
  if (!src) return;
  store.setState({ error: "" });
  try {
    log(`▶ ${t("ai_analyzing", "AI analýza obrazu…")}`);
    const info = await api.invoke("get_video_info", { path: src });
    const dur = info?.duration || 10;
    const times = [dur * 0.2, dur * 0.5, dur * 0.8];
    let sumL = 0, sumL2 = 0, sumS = 0, n = 0;
    for (const ts of times) {
      const raw = await api.invoke("video_thumbnail", { path: src, atSeconds: ts, maxWidth: 160 });
      let url = null, revoke = false;
      if (typeof raw === "string") url = api.fileSrc(raw);
      else if (raw) { url = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" })); revoke = true; }
      if (!url) continue;
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      if (revoke) URL.revokeObjectURL(url);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 16) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        sumL += L; sumL2 += L * L; n++;
        if (mx > 8) sumS += (mx - mn) / mx;
      }
    }
    if (!n) throw new Error("no samples");
    const meanL = sumL / n;
    const stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
    const meanS = sumS / n;
    const stats = { meanL: Math.round(meanL), stdL: Math.round(stdL), meanS: +meanS.toFixed(2) };

    let presetId = "filmovy", intensity = 0.6;
    if (stdL < 42) { presetId = "kontrastny"; intensity = Math.min(1, 0.5 + (42 - stdL) / 40); }
    else if (meanS < 0.26) { presetId = "zivy"; intensity = Math.min(1, 0.55 + (0.26 - meanS) * 2); }
    else if (meanL < 85) { presetId = "matny"; intensity = 0.75; }
    store.setState({ aiPick: { presetId, intensity: +intensity.toFixed(2), stats }, presetId, intensity: +intensity.toFixed(2) });
    log(`✓ AI: L=${stats.meanL} σ=${stats.stdL} S=${stats.meanS} → ${t("preset_" + presetId, presetId)} (${Math.round(intensity * 100)} %)`);
  } catch (e) {
    log(`✗ AI: ${String(e)}`);
    store.setState({ error: String(e) });
  }
}

// ---------------------------------------------------------------------------
// Výstupy
// ---------------------------------------------------------------------------
function openInEditor() {
  const s = store.getState();
  if (!s.result) return;
  api.editMedia(s.result);
  const vf = buildPresetVf(s.presetId, s.intensity);
  setTimeout(() => {
    api.setEditorStep({ label: t("editor_step", "Reels look"), vf });
    log(`→ ${t("sent_to_editor", "Otvorené v Editore s presetom")} (${t("preset_" + s.presetId, s.presetId)})`);
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
      input: s.result, preset, moduleId: api.moduleId, outputDir: null,
    });
    swapJobId(jid, jobId);
    log(`▶ ${t("export", "Export")} (${preset})`);
    const res = await watchJob(jobId);
    if (res.status !== "done") throw new Error(res.message || "export");
    log(`✅ ${t("exported", "Exportované")}: ${res.result}`);
  } catch (e) {
    store.setState({ error: String(e) });
    log(`✗ ${String(e)}`);
  } finally {
    store.setState({ running: false });
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const BTN = "rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-40";
const CARD = "bg-bg-card rounded-2xl border border-border";

function ClipRow({ path, onRemove }) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await api.invoke("video_thumbnail", { path, atSeconds: 1, maxWidth: 240 });
        if (!alive) return;
        if (typeof raw === "string") setThumb(api.fileSrc(raw));
        else if (raw) setThumb(URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" })));
      } catch { /* bez miniatury */ }
    })();
    return () => { alive = false; };
  }, [path]);
  return (
    <div className={`${CARD} p-2 flex items-center gap-3`}>
      <div className="w-24 h-14 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
        {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <span className="text-text-dim text-lg">🎞️</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{baseName(path)}</div>
      </div>
      <button className="text-text-dim hover:text-red-400 px-2" onClick={onRemove} title={t("remove", "Odstrániť")}>✕</button>
    </div>
  );
}

function Jobs() {
  const s = useStore();
  if (!s.jobs.length) return null;
  return (
    <div className="space-y-2">
      {s.jobs.map((j) => (
        <div key={j.id} className={`${CARD} p-3`}>
          <div className="flex justify-between text-xs mb-1">
            <span>{j.label}</span>
            <span className="text-text-dim">
              {j.status === "running" ? `${Math.max(0, Math.round((j.progress ?? 0) * 100))} %` : j.status === "done" ? "✓" : j.status === "cancelled" ? "⊘" : "✗"}
            </span>
          </div>
          <div className="h-1.5 rounded bg-black/30 overflow-hidden">
            <div
              className={`h-full transition-all ${j.status === "error" ? "bg-red-500" : "bg-accent"}`}
              style={{ width: `${j.status === "done" ? 100 : Math.max(2, Math.round((j.progress ?? 0) * 100))}%` }}
            />
          </div>
          {j.message ? <div className="text-[11px] text-text-dim mt-1">{j.message}</div> : null}
        </div>
      ))}
    </div>
  );
}

function ResultView() {
  const s = useStore();
  if (!s.result) return null;
  const info = s.resultInfo;
  return (
    <div className={`${CARD} p-4`}>
      <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-3">
        {t("result", "Výsledok")} {info ? `· ${Math.round(info.duration || 0)} s · ${info.width}×${info.height}` : ""}
      </h3>
      <video src={api.fileSrc(s.result)} controls className="max-h-[420px] mx-auto rounded-xl bg-black" />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className={`${BTN} px-4 py-2 text-sm`} onClick={openInEditor}>✂️ {t("open_editor", "Otvoriť v Editore")}</button>
        <button className={`${BTN} px-4 py-2 text-sm`} onClick={exportNow} disabled={s.running}>⬇️ {t("export", "Exportovať")}</button>
      </div>
    </div>
  );
}

function SidePanel() {
  const s = useStore();
  const upd = (patch) => store.setState(patch);
  const pickMusic = async () => {
    const f = await api.pickFiles(AUDIO_FILTERS, false);
    if (f) upd({ music: Array.isArray(f) ? f[0] : f });
  };
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("mode", "Režim strihu")}</div>
        <div className="grid grid-cols-3 gap-1">
          {[["strop", t("mode_strop", "Strop")], ["high", t("mode_high", "Highlighty")], ["whole", t("mode_whole", "Celé")]].map(([v, l]) => (
            <button key={v} disabled={s.running}
              className={`py-1.5 rounded-lg text-sm border ${s.mode === v ? "border-accent text-accent" : "border-border text-text-dim"}`}
              onClick={() => upd({ mode: v })}>{l}</button>
          ))}
        </div>
        <div className="text-[11px] text-text-dim mt-1">
          {s.mode === "strop" && t("mode_strop_note", "Kamera na strope: vystrihne manipuláciu (kladenie/dvíhanie), nechá stabilné úseky.")}
          {s.mode === "high" && t("mode_high_note", "Najlepšie momenty podľa pohybu a zvuku.")}
          {s.mode === "whole" && t("mode_whole_note", "Video sa neskracuje — len spojenie a úpravy.")}
        </div>
      </div>

      {s.mode === "high" && (
        <div>
          <div className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("target_len", "Cieľová dĺžka")}</div>
          <div className="grid grid-cols-4 gap-1">
            {[15, 30, 60, 90].map((v) => (
              <button key={v} disabled={s.running}
                className={`py-1.5 rounded-lg text-sm border ${s.targetSecs === v ? "border-accent text-accent" : "border-border text-text-dim"}`}
                onClick={() => upd({ targetSecs: v })}>{v} s</button>
            ))}
          </div>
        </div>
      )}

      {s.mode === "strop" && (
        <div>
          <div className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("margin", "Rezerva strihu")}</div>
          <label className="block text-xs text-text-dim">
            {s.margin.toFixed(1)} s
            <input type="range" min={0} max={40} value={Math.round(s.margin * 10)} disabled={s.running}
              className="w-full" onChange={(e) => upd({ margin: Number(e.target.value) / 10 })} />
          </label>
          <div className="text-[11px] text-text-dim">{t("margin_note", "O koľko sekúnd sa usekne naviac na každej strane stabilného úseku.")}</div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("aspect", "Formát")}</div>
        <div className="grid grid-cols-3 gap-1">
          {[["9:16", "9:16"], ["1:1", "1:1"], ["orig", t("aspect_orig", "Originál")]].map(([v, l]) => (
            <button key={v} disabled={s.running}
              className={`py-1.5 rounded-lg text-sm border ${s.aspect === v ? "border-accent text-accent" : "border-border text-text-dim"}`}
              onClick={() => upd({ aspect: v })}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("music", "Hudba")}</div>
        <button className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-text-dim hover:border-accent/50" onClick={pickMusic} disabled={s.running}>
          {s.music ? `🎵 ${baseName(s.music)}` : `＋ ${t("pick_music", "Vybrať hudbu")}`}
        </button>
        {s.music && (
          <label className="flex items-center gap-2 mt-2 text-xs text-text-dim">
            <input type="checkbox" checked={s.loopMusic} onChange={(e) => upd({ loopMusic: e.target.checked })} disabled={s.running} />
            {t("loop_music", "Opakovať hudbu v slučke")}
          </label>
        )}
        {s.music && <div className="text-[11px] text-text-dim mt-1">{t("music_note", "Hudba nahradí pôvodný zvuk videa.")}</div>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-text-dim uppercase tracking-wider">{t("look", "Obrazový preset")}</div>
          <button className="text-xs text-accent hover:underline disabled:opacity-40" onClick={analyzeLook}
            disabled={s.running || (!s.clips.length && !s.result)} title={t("ai_hint", "Analyzuje snímky a odporučí preset")}>
            ✨ {t("ai_pick", "AI výber")}
          </button>
        </div>
        {s.aiPick && (
          <div className="text-[11px] text-text-dim mb-2">
            AI: {t("preset_" + s.aiPick.presetId, s.aiPick.presetId)} · L={s.aiPick.stats.meanL} σ={s.aiPick.stats.stdL} S={s.aiPick.stats.meanS}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((p) => (
            <button key={p.id} disabled={s.running}
              className={`py-1.5 px-2 rounded-lg text-xs border text-left ${s.presetId === p.id ? "border-accent text-accent" : "border-border text-text-dim"}`}
              onClick={() => upd({ presetId: p.id })}>
              {p.icon} {t("preset_" + p.id, p.id)}
            </button>
          ))}
        </div>
        <label className="block mt-2 text-xs text-text-dim">
          {t("intensity", "Intenzita")}: {Math.round(s.intensity * 100)} %
          <input type="range" min={0} max={100} value={Math.round(s.intensity * 100)} disabled={s.running}
            className="w-full" onChange={(e) => upd({ intensity: Number(e.target.value) / 100 })} />
        </label>
        <div className="text-[11px] text-text-dim">{t("look_note", "Preset sa aplikuje pri otvorení v Editore ako upraviteľný krok.")}</div>
      </div>

      <div>
        <div className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("platform", "Platforma")}</div>
        <div className="grid grid-cols-2 gap-1">
          {[["tiktok", "TikTok"], ["instagram", "Instagram"], ["shorts", "YT Shorts"], ["youtube", "YouTube"]].map(([v, l]) => (
            <button key={v} disabled={s.running}
              className={`py-1.5 rounded-lg text-sm border ${s.platform === v ? "border-accent text-accent" : "border-border text-text-dim"}`}
              onClick={() => upd({ platform: v })}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stránka
// ---------------------------------------------------------------------------
function Reels() {
  const s = useStore();

  useEffect(() => {
    if (s.cfgLoaded) return;
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        if (cfg && typeof cfg === "object") {
          const pick = {};
          for (const k of ["mode", "targetSecs", "margin", "aspect", "loopMusic", "platform", "presetId", "intensity"]) {
            if (cfg[k] !== undefined) pick[k] = cfg[k];
          }
          store.setState({ ...pick, cfgLoaded: true });
        } else {
          store.setState({ cfgLoaded: true });
        }
      } catch { store.setState({ cfgLoaded: true }); }
    })();
  }, [s.cfgLoaded]);

  useEffect(() => {
    if (!s.cfgLoaded) return;
    const cfg = { mode: s.mode, targetSecs: s.targetSecs, margin: s.margin, aspect: s.aspect, loopMusic: s.loopMusic, platform: s.platform, presetId: s.presetId, intensity: s.intensity };
    const tm = setTimeout(() => {
      api.invoke("set_module_config", { id: api.moduleId, config: cfg }).catch(() => {});
    }, 400);
    return () => clearTimeout(tm);
  }, [s.cfgLoaded, s.mode, s.targetSecs, s.margin, s.aspect, s.loopMusic, s.platform, s.presetId, s.intensity]);

  const addClips = async () => {
    const f = await api.pickFiles(VIDEO_FILTERS, true);
    if (!f) return;
    const list = Array.isArray(f) ? f : [f];
    store.setState((st) => ({ clips: [...st.clips, ...list.filter((p) => !st.clips.includes(p))] }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">📱 {t("title", "Reels")}</h1>
        <button className={`${BTN} px-5 py-2.5`} disabled={!s.clips.length || s.running} onClick={runPipeline}>
          {s.running ? (s.stage || "…") : `🚀 ${t("make_reel", "Vytvoriť zostrih")}`}
        </button>
      </div>

      {s.error ? <div className={`${CARD} p-3 text-sm text-red-400`}>❌ {s.error}</div> : null}

      <div className={`${CARD} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">
            {t("clips", "Klipy")} ({s.clips.length})
          </h3>
          <button className="text-sm text-accent hover:underline disabled:opacity-40" onClick={addClips} disabled={s.running}>
            ＋ {t("add_clips", "Pridať videá")}
          </button>
        </div>
        {s.clips.length === 0 ? (
          <button onClick={addClips}
            className="w-full py-10 rounded-xl border border-dashed border-border text-center text-text-dim hover:border-accent/40 transition-colors">
            <div className="text-3xl mb-2">📹</div>
            <div className="text-sm">{t("drop_hint", "Vlož jedno dlhé video alebo viac kratších klipov")}</div>
          </button>
        ) : (
          <div className="space-y-2">
            {s.clips.map((p, i) => (
              <ClipRow key={p} path={p} onRemove={() => store.setState((st) => ({ clips: st.clips.filter((_, j) => j !== i) }))} />
            ))}
            <div className="text-[11px] text-text-dim">
              {s.mode === "strop"
                ? t("strop_hint", "Z každého klipu sa vyberú stabilné úseky (bez kladenia a dvíhania kamery) a spoja sa.")
                : s.clips.length > 1
                  ? t("merge_note", "Klipy sa najprv spoja, potom sa vyberú najlepšie momenty.")
                  : t("one_note", "Z dlhého videa sa vyberú najlepšie momenty.")}
            </div>
          </div>
        )}
      </div>

      <Jobs />
      <ResultView />

      {s.log.length > 0 && (
        <div className={`${CARD} p-4`}>
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{t("log", "Log")}</h3>
          <div className="max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5">
            {s.log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

if (api.registerSidePanel) api.registerSidePanel(SidePanel);

export default Reels;
