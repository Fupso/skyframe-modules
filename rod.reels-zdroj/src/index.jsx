// rod.reels v3.0.0 — Reels ako nástroj priamo v Editore (pravý panel)
//
// Tok: otvoríš video v Editore → v paneli Reels označíš tlačidlami I/O
// úseky na pozícii prehrávača → každému spoju zvolíš prechod → preset
// (ručne alebo Automatický) → hudba → všetko sa okamžite aplikuje do
// Editora (setEditorSegments + setEditorStep), takže HLAVNÝ prehrávač
// ukazuje reálny výsledok a náhľad = export. Export ide tlačidlom Export
// v Editore (alebo Exportovať tu — otvorí ten istý dialóg).
//
// Technicky (overené voči core d5be7e7 / 3.44.9):
// - úseky: api.setEditorSegments([{start,end,grade}]) — jadro robí
//   trim+concat v náhľade aj exporte (segments_plan_graph)
// - prechody: grade fragment daného úseku — dip-to-black/white
//   (fade in/out). Skutočný crossfade (xfade) jadro v pláne nepodporuje —
//   fáza 2. Zvuk pri prechode sa nesiabruje (limit plánu).
// - look: api.setEditorStep({label, vf}) — krok pipeline Editora, jadro
//   samo aplikuje HDR→SDR opravu aj colorspace tagy (3.44.6+)
// - hudba: ten istý krok s agraph — kontrakt Editora: [A_IN] vstup,
//   [A_OUT] výstup, vlastné vstupy [I0]; režim zmiešať (amix s pôvodným
//   zvukom) alebo nahradiť (bez [A_IN] — funguje aj pre video bez zvuku)
// - stav sa ukladá per video cez module config (get/set_module_config)

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useRef } = React;

const AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }];
const MIN_SEG = 0.3;

// ---------------------------------------------------------------------------
// Presety — profesionálne ladené looky (krivky kanálov + sýtosť + kontrast +
// vinětka/zrno; intenzita škáluje odchýlku od identity)
// ---------------------------------------------------------------------------
const PRESETS = [
  { id: "film",   r: [[0, 0.02], [0.25, 0.24], [0.5, 0.5], [0.75, 0.77], [1, 0.98]], g: [[0, 0.015], [0.5, 0.5], [1, 0.99]], b: [[0, 0.045], [0.35, 0.36], [0.65, 0.65], [1, 0.94]], sat: 0.94, con: 1.04, vig: 0.25, grain: 3 },
  { id: "reels",  r: [[0, 0], [0.2, 0.16], [0.5, 0.51], [0.8, 0.84], [1, 1]], g: [[0, 0], [0.5, 0.505], [1, 1]], b: [[0, 0], [0.5, 0.49], [1, 0.99]], sat: 1.22, con: 1.10, vig: 0.15, grain: 0 },
  { id: "studio", r: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]], g: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]], b: [[0, 0], [0.25, 0.25], [0.75, 0.76], [1, 1]], sat: 1.03, con: 1.03, vig: 0, grain: 0 },
  { id: "warm",   r: [[0, 0.01], [0.5, 0.53], [1, 1]], g: [[0, 0], [0.5, 0.5], [1, 0.985]], b: [[0, 0], [0.5, 0.45], [1, 0.90]], sat: 1.08, con: 1.02, vig: 0.2, grain: 0 },
  { id: "matte",  r: [[0, 0.07], [0.5, 0.52], [1, 0.96]], g: [[0, 0.065], [0.5, 0.52], [1, 0.96]], b: [[0, 0.075], [0.5, 0.52], [1, 0.96]], sat: 0.85, con: 0.97, vig: 0.3, grain: 2 },
  { id: "noir",   r: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]], g: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]], b: [[0, 0], [0.2, 0.12], [0.5, 0.5], [0.8, 0.88], [1, 1]], sat: 0.35, con: 1.15, vig: 0.4, grain: 5 },
];

// Prechody — cez grade (fade in/out daného úseku). "black"/"white" = dip
// cez čiernu/bielu na spoji; "none" = tvrdý strih.
const TRANSITIONS = ["none", "black", "white"];

function clamp01(v) { return Math.min(1, Math.max(0, v)); }

function buildPresetVf(presetId, intensity) {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return "";
  const it = clamp01(intensity);
  const chan = (pts) => pts.map(([x, y]) => `${x.toFixed(3)}/${(x + (y - x) * it).toFixed(3)}`).join(" ");
  const parts = [`curves=r='${chan(p.r)}':g='${chan(p.g)}':b='${chan(p.b)}'`];
  const eqBits = [];
  const sat = 1 + (p.sat - 1) * it, con = 1 + (p.con - 1) * it;
  if (Math.abs(sat - 1) > 0.004) eqBits.push(`saturation=${sat.toFixed(3)}`);
  if (Math.abs(con - 1) > 0.004) eqBits.push(`contrast=${con.toFixed(3)}`);
  if (eqBits.length) parts.push(`eq=${eqBits.join(":")}`);
  const vig = p.vig * it;
  if (vig > 0.02) parts.push(`vignette=a=${(Math.PI / 5 * vig).toFixed(4)}`);
  const gr = Math.round((p.grain || 0) * it);
  if (gr > 0) parts.push(`noise=alls=${gr}:allf=t`);
  return parts.join(",");
}

// grade fragment úseku: fin = prechod zo spoja pred, fout = prechod do spoja za
function segGrade(fin, fout, len) {
  const parts = [];
  const mk = (id, dir) => {
    const d = Math.min(0.4, len / 2 * 0.9);
    if (d < 0.05) return null;
    const col = id === "white" ? ":color=white" : "";
    return dir === "in"
      ? `fade=t=in:st=0:d=${d.toFixed(3)}${col}`
      : `fade=t=out:st=${(len - d).toFixed(3)}:d=${d.toFixed(3)}${col}`;
  };
  if (fin && fin !== "none") { const f = mk(fin, "in"); if (f) parts.push(f); }
  if (fout && fout !== "none") { const f = mk(fout, "out"); if (f) parts.push(f); }
  return parts.join(",");
}

function fmtTime(sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
function baseName(p) { return (p || "").split(/[\\/]/).pop() ?? p; }

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
function ReelsPanel() {
  const [media, setMedia] = useState(() => api.getEditorMedia());
  const [info, setInfo] = useState(null);
  const [thumbs, setThumbs] = useState(null); // {dir, count}
  const [segments, setSegments] = useState([]); // [{start,end}]
  const [cuts, setCuts] = useState([]);         // cuts[i] = prechod medzi úsekom i a i+1
  const [pendingIn, setPendingIn] = useState(null);
  const [sel, setSel] = useState(-1);
  const [presetId, setPresetId] = useState("none");
  const [intensity, setIntensity] = useState(0.75);
  const [music, setMusic] = useState(null);     // {path, volume, mode}
  const [msg, setMsg] = useState("");
  const [autoBusy, setAutoBusy] = useState(false);
  const [applied, setApplied] = useState("");
  const cfgTimer = useRef(null);

  const duration = info?.duration || 0;
  const path = media?.path || null;

  // načítanie média z Editora + uloženého stavu
  useEffect(() => {
    const off = api.onEditorMedia((m) => setMedia(m));
    return off;
  }, []);

  useEffect(() => {
    let dead = false;
    setInfo(null); setThumbs(null); setMsg("");
    if (!path || media.kind !== "video") { setSegments([]); setCuts([]); setPendingIn(null); return; }
    (async () => {
      try {
        const inf = await api.invoke("get_video_info", { path });
        if (dead) return;
        setInfo(inf);
        // uložený stav pre toto video
        try {
          const cfg = await api.invoke("get_module_config", { id: api.moduleId });
          const saved = cfg?.reels?.[path];
          if (saved && !dead) {
            setSegments(saved.segments || []);
            setCuts(saved.cuts || []);
            setPresetId(saved.presetId || "none");
            setIntensity(saved.intensity ?? 0.75);
            setMusic(saved.music || null);
          } else if (!dead) {
            setSegments([]); setCuts([]); setPresetId("none"); setIntensity(0.75); setMusic(null);
          }
        } catch { /* config nie je kritický */ }
        // miniatúry pásu
        try {
          const th = await api.invoke("video_thumbs_strip", { path, count: 120 });
          if (!dead) setThumbs(th);
        } catch { /* pás nie je kritický */ }
      } catch (e) {
        if (!dead) setMsg(String(e));
      }
    })();
    return () => { dead = true; };
  }, [path]);

  // uloženie stavu (debounce)
  useEffect(() => {
    if (!path) return;
    clearTimeout(cfgTimer.current);
    cfgTimer.current = setTimeout(() => {
      api.invoke("get_module_config", { id: api.moduleId }).then((cfg) => {
        const reels = { ...(cfg?.reels || {}) };
        reels[path] = { segments, cuts, presetId, intensity, music };
        return api.invoke("set_module_config", { id: api.moduleId, config: { ...(cfg || {}), reels } });
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(cfgTimer.current);
  }, [path, segments, cuts, presetId, intensity, music]);

  // aplikácia do Editora — náhľad aj export idú z jadra
  useEffect(() => {
    const segs = segments.length
      ? segments.map((s, i) => ({
          start: s.start,
          end: s.end,
          grade: segGrade(cuts[i - 1], cuts[i], s.end - s.start) || undefined,
        }))
      : null;
    api.setEditorSegments(segs);

    const vf = buildPresetVf(presetId, intensity);
    let agraph, aInputs;
    const total = segments.length
      ? segments.reduce((a, s) => a + (s.end - s.start), 0)
      : duration;
    if (music?.path && total > 0) {
      const v = clamp01((music.volume ?? 30) / 100).toFixed(3);
      if (music.mode === "replace" || info?.has_audio === false) {
        agraph = `[I0]aloop=loop=-1:size=2000000000,atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${v}[A_OUT]`;
      } else {
        agraph = `[A_IN]volume=1.0[oa];[I0]aloop=loop=-1:size=2000000000,volume=${v}[ma];[oa][ma]amix=inputs=2:duration=first:normalize=0[A_OUT]`;
      }
      aInputs = [music.path];
    }
    if (vf || agraph) {
      api.setEditorStep({ label: "Reels", vf: vf || undefined, agraph, aInputs });
    } else {
      api.setEditorStep(null);
    }
    const parts = [];
    if (segments.length) parts.push(`${segments.length} ${t("segs_unit", "úseky")}`);
    if (vf) parts.push(t("preset_" + presetId, presetId));
    if (music?.path) parts.push("♪");
    setApplied(parts.join(" · "));
  }, [segments, cuts, presetId, intensity, music, duration, info]);

  // -------------------------------------------------------------------------
  const markIn = () => {
    const pos = api.getPlayerPosition();
    if (pos == null) return;
    setPendingIn(pos);
    setMsg("");
  };
  const markOut = () => {
    const pos = api.getPlayerPosition();
    if (pos == null) return;
    if (pendingIn == null) { setMsg(t("err_no_in", "Najprv označ začiatok (I).")); return; }
    let start = Math.min(pendingIn, pos), end = Math.max(pendingIn, pos);
    if (end - start < MIN_SEG) { setMsg(t("err_short", "Úsek je príliš krátky.")); return; }
    const overlap = segments.some((s) => start < s.end - 0.001 && end > s.start + 0.001);
    if (overlap) { setMsg(t("err_overlap", "Úsek sa prekrýva s iným úsekom.")); return; }
    const idx = segments.findIndex((s) => s.start > start);
    const at = idx === -1 ? segments.length : idx;
    const ns = [...segments]; ns.splice(at, 0, { start, end });
    const nc = [...cuts]; nc.splice(at, 0, "none"); // spoj za novým úsekom
    setSegments(ns); setCuts(nc); setPendingIn(null); setSel(at); setMsg("");
  };
  const cancelDraft = () => { setPendingIn(null); setMsg(""); };
  const removeSeg = (i) => {
    const ns = segments.filter((_, k) => k !== i);
    const nc = [...cuts];
    nc.splice(Math.min(i, nc.length - 1), 1); // zahoď spoj pred/za
    if (nc.length !== Math.max(0, ns.length - 1)) nc.length = Math.max(0, ns.length - 1);
    setSegments(ns); setCuts(nc); setSel(-1);
  };
  const updateSeg = (i, key, val) => {
    const v = Math.max(0, Math.min(duration || val, val));
    const ns = segments.map((s, k) => (k === i ? { ...s, [key]: v } : s));
    const s = ns[i];
    if (s.end - s.start < MIN_SEG) { setMsg(t("err_short", "Úsek je príliš krátky.")); return; }
    setMsg("");
    setSegments(ns);
  };
  const setCut = (i, id) => { const nc = [...cuts]; nc[i] = id; setCuts(nc); };
  const resetAll = () => {
    setSegments([]); setCuts([]); setPendingIn(null); setSel(-1);
    setPresetId("none"); setIntensity(0.75); setMusic(null); setMsg("");
  };
  const pickMusic = async () => {
    const p = await api.pickFiles(AUDIO_FILTERS, false);
    const file = Array.isArray(p) ? p[0] : p;
    if (file) setMusic({ path: file, volume: music?.volume ?? 30, mode: music?.mode || "mix" });
  };

  // Auto preset — analýza náhľadových snímok (jas/kontrast/sýtosť/teplota)
  const analyzeAuto = async () => {
    if (!path || autoBusy) return;
    setAutoBusy(true); setMsg(t("auto_analyzing", "Analyzujem zábery…"));
    try {
      const segs = segments.length ? segments : [{ start: 0, end: duration || 10 }];
      const samples = [];
      for (const seg of segs.slice(0, 4)) {
        samples.push(seg.start + (seg.end - seg.start) * 0.3, (seg.start + seg.end) / 2, seg.start + (seg.end - seg.start) * 0.7);
      }
      let sumL = 0, sumL2 = 0, sumS = 0, sumW = 0, n = 0;
      for (const ts of samples.slice(0, 6)) {
        const raw = await api.invoke("video_thumbnail", { path, atSeconds: ts, maxWidth: 160, vf: null });
        if (!raw) continue;
        const url = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" }));
        const img = new Image();
        img.src = url;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        URL.revokeObjectURL(url);
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const cx = c.getContext("2d", { willReadFrequently: true });
        cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < d.length; i += 16) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          sumL += L; sumL2 += L * L; sumW += r - b; n++;
          if (mx > 8) sumS += (mx - mn) / mx;
        }
      }
      if (!n) throw new Error("no frames");
      const meanL = sumL / n, stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
      const meanS = sumS / n, warm = sumW / n;
      let pid, it;
      if (stdL < 40) { pid = "reels"; it = 0.7 + (40 - stdL) / 60; }
      else if (meanS < 0.24) { pid = "reels"; it = 0.8; }
      else if (meanL < 80) { pid = "matte"; it = 0.7; }
      else if (warm > 25) { pid = "studio"; it = 0.65; }
      else if (warm < -15) { pid = "warm"; it = 0.6; }
      else { pid = "film"; it = 0.65; }
      setPresetId(pid); setIntensity(+clamp01(it).toFixed(2));
      setMsg(`✨ ${t("preset_" + pid, pid)} ${Math.round(clamp01(it) * 100)} %`);
    } catch (e) {
      setMsg(t("err_frames", "Snímky videa sa nepodarilo načítať."));
    } finally {
      setAutoBusy(false);
    }
  };

  // -------------------------------------------------------------------------
  const btn = "px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40";
  const btnA = "px-2 py-1 rounded-md text-[11px] font-medium bg-accent hover:bg-accent/90 text-white disabled:opacity-40";
  const inp = "w-16 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]";

  if (!path || media?.kind !== "video") {
    return (
      <div className="p-3 text-[11px] text-text-dim">
        🎬 <b>Reels</b>
        <p className="mt-2">{t("no_media", "Najprv otvor video v Editore.")}</p>
      </div>
    );
  }

  const total = segments.reduce((a, s) => a + (s.end - s.start), 0);

  return (
    <div className="p-3 flex flex-col gap-3 text-[11px]">
      <div className="flex items-center gap-2">
        <span>🎬 <b>Reels</b></span>
        <span className="flex-1 truncate text-text-dim" title={path}>{baseName(path)}</span>
      </div>

      {/* pás osi s miniatúrami + úseky */}
      <div className="relative h-12 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 select-none">
        {thumbs ? (
          <div className="absolute inset-0 flex">
            {Array.from({ length: Math.min(thumbs.count || 0, 24) }).map((_, i) => (
              <img
                key={i}
                src={api.fileSrc(`${thumbs.dir}/t${String(Math.floor(i * (thumbs.count / Math.min(thumbs.count, 24))) + 1).padStart(4, "0")}.jpg`)}
                className="h-full flex-1 object-cover min-w-0"
                draggable={false}
                alt=""
              />
            ))}
          </div>
        ) : <div className="absolute inset-0 bg-zinc-900" />}
        {duration > 0 && segments.map((s, i) => (
          <div
            key={i}
            onClick={() => setSel(i)}
            className={`absolute top-0 bottom-0 border-y-2 cursor-pointer ${sel === i ? "bg-accent/40 border-accent" : "bg-emerald-500/30 border-emerald-500"}`}
            style={{ left: `${(s.start / duration) * 100}%`, width: `${((s.end - s.start) / duration) * 100}%` }}
          />
        ))}
        {pendingIn != null && duration > 0 && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: `${(pendingIn / duration) * 100}%` }} />
        )}
      </div>

      {/* I/O tlačidlá */}
      <div className="flex gap-1.5">
        <button className={btnA} onClick={markIn} title={t("io_in_hint", "Označí začiatok úseku na pozícii prehrávača")}>I · {t("io_in", "Začiatok")}</button>
        <button className={btnA} onClick={markOut} disabled={pendingIn == null} title={t("io_out_hint", "Uzavrie úsek na pozícii prehrávača")}>O · {t("io_out", "Koniec")}</button>
        <button className={btn} onClick={cancelDraft} disabled={pendingIn == null}>✕</button>
        <span className="flex-1" />
        <button className={btn} onClick={resetAll} disabled={!segments.length && presetId === "none" && !music}>{t("reset", "Reset")}</button>
      </div>

      {msg ? <div className="text-amber-400">{msg}</div> : null}

      {/* zoznam úsekov */}
      {segments.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-text-dim">{t("segments", "Úseky")} · {fmtTime(total)}</div>
          {segments.map((s, i) => (
            <div key={i} className={`rounded-md border px-2 py-1.5 ${sel === i ? "border-accent bg-accent/10" : "border-zinc-800"}`}>
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setSel(sel === i ? -1 : i)}>
                <b>{i + 1}.</b>
                <span>{fmtTime(s.start)} – {fmtTime(s.end)}</span>
                <span className="flex-1" />
                <button className="text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); removeSeg(i); }}>✕</button>
              </div>
              {sel === i && (
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-text-dim">{t("start", "Začiatok")}</label>
                    <input type="number" step="0.1" min="0" className={inp} value={s.start.toFixed(1)} onChange={(e) => updateSeg(i, "start", parseFloat(e.target.value))} />
                    <label className="text-text-dim">{t("end", "Koniec")}</label>
                    <input type="number" step="0.1" min="0" className={inp} value={s.end.toFixed(1)} onChange={(e) => updateSeg(i, "end", parseFloat(e.target.value))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-text-dim">{t("transition", "Prechod za úsekom")}</label>
                    <select className="flex-1 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]" value={cuts[i] || "none"} onChange={(e) => setCut(i, e.target.value)} disabled={i >= segments.length - 1}>
                      {TRANSITIONS.map((id) => <option key={id} value={id}>{t("tr_" + id, id)}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* presety */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-text-dim">{t("presets", "Look")}</span>
          <span className="flex-1" />
          <button className={btn} onClick={analyzeAuto} disabled={autoBusy}>✨ {t("auto", "Automatický")}</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {["none", ...PRESETS.map((p) => p.id)].map((id) => (
            <button
              key={id}
              onClick={() => setPresetId(id)}
              className={`px-1 py-1.5 rounded-md border text-[10px] ${presetId === id ? "border-accent bg-accent/15 text-accent" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}
            >
              {t("preset_" + id, id)}
            </button>
          ))}
        </div>
        {presetId !== "none" && (
          <div className="flex items-center gap-2">
            <label className="text-text-dim">{t("intensity", "Intenzita")}</label>
            <input type="range" min="10" max="100" value={Math.round(intensity * 100)} className="flex-1" onChange={(e) => setIntensity(parseInt(e.target.value, 10) / 100)} />
            <span className="w-8 text-right">{Math.round(intensity * 100)} %</span>
          </div>
        )}
      </div>

      {/* hudba */}
      <div className="flex flex-col gap-1.5">
        <span className="text-text-dim">{t("music", "Hudba")}</span>
        {music?.path ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="flex-1 truncate" title={music.path}>♪ {baseName(music.path)}</span>
              <button className="text-red-400 hover:text-red-300" onClick={() => setMusic(null)}>✕</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-text-dim">{t("music_volume", "Hlasitosť")}</label>
              <input type="range" min="0" max="100" value={music.volume ?? 30} className="flex-1" onChange={(e) => setMusic({ ...music, volume: parseInt(e.target.value, 10) })} />
              <span className="w-8 text-right">{music.volume ?? 30} %</span>
            </div>
            <select className="px-1.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-[11px]" value={music.mode || "mix"} onChange={(e) => setMusic({ ...music, mode: e.target.value })}>
              <option value="mix">{t("music_mix", "Zmiešať s pôvodným zvukom")}</option>
              <option value="replace">{t("music_replace", "Nahradiť zvuk")}</option>
            </select>
          </>
        ) : (
          <button className={btn} onClick={pickMusic}>♪ {t("music_pick", "Vybrať hudbu…")}</button>
        )}
      </div>

      {/* stav + export */}
      {applied && <div className="text-emerald-400">✓ {t("applied", "Aplikované v Editore")}: {applied}</div>}
      <button className={btnA} onClick={() => api.exportEditor()}>{t("export", "Exportovať…")}</button>
      <div className="text-text-dim text-[10px]">{t("hint", "Zmeny sa aplikujú okamžite — náhľad Editora ukazuje reálny výsledok.")}</div>
    </div>
  );
}

api.registerEditorPanel(ReelsPanel);
