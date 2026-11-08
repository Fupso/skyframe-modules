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
var { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = react_shim_default;
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
function ReelsPanel() {
  const [media, setMedia] = useState2(() => api.getEditorMedia());
  const [info, setInfo] = useState2(null);
  const [thumbs, setThumbs] = useState2(null);
  const [segments, setSegments] = useState2([]);
  const [cuts, setCuts] = useState2([]);
  const [pendingIn, setPendingIn] = useState2(null);
  const [sel, setSel] = useState2(-1);
  const [presetId, setPresetId] = useState2("none");
  const [intensity, setIntensity] = useState2(0.75);
  const [music, setMusic] = useState2(null);
  const [msg, setMsg] = useState2("");
  const [autoBusy, setAutoBusy] = useState2(false);
  const [applied, setApplied] = useState2("");
  const cfgTimer = useRef2(null);
  const duration = info?.duration || 0;
  const path = media?.path || null;
  useEffect2(() => {
    const off = api.onEditorMedia((m) => setMedia(m));
    return off;
  }, []);
  useEffect2(() => {
    let dead = false;
    setInfo(null);
    setThumbs(null);
    setMsg("");
    if (!path || media.kind !== "video") {
      setSegments([]);
      setCuts([]);
      setPendingIn(null);
      return;
    }
    (async () => {
      try {
        const inf = await api.invoke("get_video_info", { path });
        if (dead) return;
        setInfo(inf);
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
            setSegments([]);
            setCuts([]);
            setPresetId("none");
            setIntensity(0.75);
            setMusic(null);
          }
        } catch {
        }
        try {
          const th = await api.invoke("video_thumbs_strip", { path, count: 120 });
          if (!dead) setThumbs(th);
        } catch {
        }
      } catch (e) {
        if (!dead) setMsg(String(e));
      }
    })();
    return () => {
      dead = true;
    };
  }, [path]);
  useEffect2(() => {
    if (!path) return;
    clearTimeout(cfgTimer.current);
    cfgTimer.current = setTimeout(() => {
      api.invoke("get_module_config", { id: api.moduleId }).then((cfg) => {
        const reels = { ...cfg?.reels || {} };
        reels[path] = { segments, cuts, presetId, intensity, music };
        return api.invoke("set_module_config", { id: api.moduleId, config: { ...cfg || {}, reels } });
      }).catch(() => {
      });
    }, 600);
    return () => clearTimeout(cfgTimer.current);
  }, [path, segments, cuts, presetId, intensity, music]);
  useEffect2(() => {
    const segs = segments.length ? segments.map((s, i) => ({
      start: s.start,
      end: s.end,
      grade: segGrade(cuts[i - 1], cuts[i], s.end - s.start) || void 0
    })) : null;
    api.setEditorSegments(segs);
    const vf = buildPresetVf(presetId, intensity);
    let agraph, aInputs;
    const total2 = segments.length ? segments.reduce((a, s) => a + (s.end - s.start), 0) : duration;
    if (music?.path && total2 > 0) {
      const v = clamp01((music.volume ?? 30) / 100).toFixed(3);
      if (music.mode === "replace" || info?.has_audio === false) {
        agraph = `[I0]aloop=loop=-1:size=2000000000,atrim=0:${total2.toFixed(3)},asetpts=PTS-STARTPTS,volume=${v}[A_OUT]`;
      } else {
        agraph = `[A_IN]volume=1.0[oa];[I0]aloop=loop=-1:size=2000000000,volume=${v}[ma];[oa][ma]amix=inputs=2:duration=first:normalize=0[A_OUT]`;
      }
      aInputs = [music.path];
    }
    if (vf || agraph) {
      api.setEditorStep({ label: "Reels", vf: vf || void 0, agraph, aInputs });
    } else {
      api.setEditorStep(null);
    }
    const parts = [];
    if (segments.length) parts.push(`${segments.length} ${t("segs_unit", "\xFAseky")}`);
    if (vf) parts.push(t("preset_" + presetId, presetId));
    if (music?.path) parts.push("\u266A");
    setApplied(parts.join(" \xB7 "));
  }, [segments, cuts, presetId, intensity, music, duration, info]);
  const markIn = () => {
    const pos = api.getPlayerPosition();
    if (pos == null) return;
    setPendingIn(pos);
    setMsg("");
  };
  const markOut = () => {
    const pos = api.getPlayerPosition();
    if (pos == null) return;
    if (pendingIn == null) {
      setMsg(t("err_no_in", "Najprv ozna\u010D za\u010Diatok (I)."));
      return;
    }
    let start = Math.min(pendingIn, pos), end = Math.max(pendingIn, pos);
    if (end - start < MIN_SEG) {
      setMsg(t("err_short", "\xDAsek je pr\xEDli\u0161 kr\xE1tky."));
      return;
    }
    const overlap = segments.some((s) => start < s.end - 1e-3 && end > s.start + 1e-3);
    if (overlap) {
      setMsg(t("err_overlap", "\xDAsek sa prekr\xFDva s in\xFDm \xFAsekom."));
      return;
    }
    const idx = segments.findIndex((s) => s.start > start);
    const at = idx === -1 ? segments.length : idx;
    const ns = [...segments];
    ns.splice(at, 0, { start, end });
    const nc = [...cuts];
    nc.splice(at, 0, "none");
    setSegments(ns);
    setCuts(nc);
    setPendingIn(null);
    setSel(at);
    setMsg("");
  };
  const cancelDraft = () => {
    setPendingIn(null);
    setMsg("");
  };
  const removeSeg = (i) => {
    const ns = segments.filter((_, k) => k !== i);
    const nc = [...cuts];
    nc.splice(Math.min(i, nc.length - 1), 1);
    if (nc.length !== Math.max(0, ns.length - 1)) nc.length = Math.max(0, ns.length - 1);
    setSegments(ns);
    setCuts(nc);
    setSel(-1);
  };
  const updateSeg = (i, key, val) => {
    const v = Math.max(0, Math.min(duration || val, val));
    const ns = segments.map((s2, k) => k === i ? { ...s2, [key]: v } : s2);
    const s = ns[i];
    if (s.end - s.start < MIN_SEG) {
      setMsg(t("err_short", "\xDAsek je pr\xEDli\u0161 kr\xE1tky."));
      return;
    }
    setMsg("");
    setSegments(ns);
  };
  const setCut = (i, id) => {
    const nc = [...cuts];
    nc[i] = id;
    setCuts(nc);
  };
  const resetAll = () => {
    setSegments([]);
    setCuts([]);
    setPendingIn(null);
    setSel(-1);
    setPresetId("none");
    setIntensity(0.75);
    setMusic(null);
    setMsg("");
  };
  const pickMusic = async () => {
    const p = await api.pickFiles(AUDIO_FILTERS, false);
    const file = Array.isArray(p) ? p[0] : p;
    if (file) setMusic({ path: file, volume: music?.volume ?? 30, mode: music?.mode || "mix" });
  };
  const analyzeAuto = async () => {
    if (!path || autoBusy) return;
    setAutoBusy(true);
    setMsg(t("auto_analyzing", "Analyzujem z\xE1bery\u2026"));
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
      setPresetId(pid);
      setIntensity(+clamp01(it).toFixed(2));
      setMsg(`\u2728 ${t("preset_" + pid, pid)} ${Math.round(clamp01(it) * 100)} %`);
    } catch (e) {
      setMsg(t("err_frames", "Sn\xEDmky videa sa nepodarilo na\u010D\xEDta\u0165."));
    } finally {
      setAutoBusy(false);
    }
  };
  const btn = "px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40";
  const btnA = "px-2 py-1 rounded-md text-[11px] font-medium bg-accent hover:bg-accent/90 text-white disabled:opacity-40";
  const inp = "w-16 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]";
  if (!path || media?.kind !== "video") {
    return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-3 text-[11px] text-text-dim" }, "\u{1F3AC} ", /* @__PURE__ */ react_shim_default.createElement("b", null, "Reels"), /* @__PURE__ */ react_shim_default.createElement("p", { className: "mt-2" }, t("no_media", "Najprv otvor video v Editore.")));
  }
  const total = segments.reduce((a, s) => a + (s.end - s.start), 0);
  return /* @__PURE__ */ react_shim_default.createElement("div", { className: "p-3 flex flex-col gap-3 text-[11px]" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("span", null, "\u{1F3AC} ", /* @__PURE__ */ react_shim_default.createElement("b", null, "Reels")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1 truncate text-text-dim", title: path }, baseName(path))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "relative h-12 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 select-none" }, thumbs ? /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute inset-0 flex" }, Array.from({ length: Math.min(thumbs.count || 0, 24) }).map((_, i) => /* @__PURE__ */ react_shim_default.createElement(
    "img",
    {
      key: i,
      src: api.fileSrc(`${thumbs.dir}/t${String(Math.floor(i * (thumbs.count / Math.min(thumbs.count, 24))) + 1).padStart(4, "0")}.jpg`),
      className: "h-full flex-1 object-cover min-w-0",
      draggable: false,
      alt: ""
    }
  ))) : /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute inset-0 bg-zinc-900" }), duration > 0 && segments.map((s, i) => /* @__PURE__ */ react_shim_default.createElement(
    "div",
    {
      key: i,
      onClick: () => setSel(i),
      className: `absolute top-0 bottom-0 border-y-2 cursor-pointer ${sel === i ? "bg-accent/40 border-accent" : "bg-emerald-500/30 border-emerald-500"}`,
      style: { left: `${s.start / duration * 100}%`, width: `${(s.end - s.start) / duration * 100}%` }
    }
  )), pendingIn != null && duration > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "absolute top-0 bottom-0 w-0.5 bg-yellow-400", style: { left: `${pendingIn / duration * 100}%` } })), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: markIn, title: t("io_in_hint", "Ozna\u010D\xED za\u010Diatok \xFAseku na poz\xEDcii prehr\xE1va\u010Da") }, "I \xB7 ", t("io_in", "Za\u010Diatok")), /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: markOut, disabled: pendingIn == null, title: t("io_out_hint", "Uzavrie \xFAsek na poz\xEDcii prehr\xE1va\u010Da") }, "O \xB7 ", t("io_out", "Koniec")), /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: cancelDraft, disabled: pendingIn == null }, "\u2715"), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1" }), /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: resetAll, disabled: !segments.length && presetId === "none" && !music }, t("reset", "Reset"))), msg ? /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-amber-400" }, msg) : null, segments.length > 0 && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-text-dim" }, t("segments", "\xDAseky"), " \xB7 ", fmtTime(total)), segments.map((s, i) => /* @__PURE__ */ react_shim_default.createElement("div", { key: i, className: `rounded-md border px-2 py-1.5 ${sel === i ? "border-accent bg-accent/10" : "border-zinc-800"}` }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-1.5 cursor-pointer", onClick: () => setSel(sel === i ? -1 : i) }, /* @__PURE__ */ react_shim_default.createElement("b", null, i + 1, "."), /* @__PURE__ */ react_shim_default.createElement("span", null, fmtTime(s.start), " \u2013 ", fmtTime(s.end)), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1" }), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-red-400 hover:text-red-300", onClick: (e) => {
    e.stopPropagation();
    removeSeg(i);
  } }, "\u2715")), sel === i && /* @__PURE__ */ react_shim_default.createElement("div", { className: "mt-1.5 flex flex-col gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("start", "Za\u010Diatok")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "number", step: "0.1", min: "0", className: inp, value: s.start.toFixed(1), onChange: (e) => updateSeg(i, "start", parseFloat(e.target.value)) }), /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("end", "Koniec")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "number", step: "0.1", min: "0", className: inp, value: s.end.toFixed(1), onChange: (e) => updateSeg(i, "end", parseFloat(e.target.value)) })), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("transition", "Prechod za \xFAsekom")), /* @__PURE__ */ react_shim_default.createElement("select", { className: "flex-1 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]", value: cuts[i] || "none", onChange: (e) => setCut(i, e.target.value), disabled: i >= segments.length - 1 }, TRANSITIONS.map((id) => /* @__PURE__ */ react_shim_default.createElement("option", { key: id, value: id }, t("tr_" + id, id))))))))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-col gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim" }, t("presets", "Look")), /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1" }), /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: analyzeAuto, disabled: autoBusy }, "\u2728 ", t("auto", "Automatick\xFD"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "grid grid-cols-3 gap-1" }, ["none", ...PRESETS.map((p) => p.id)].map((id) => /* @__PURE__ */ react_shim_default.createElement(
    "button",
    {
      key: id,
      onClick: () => setPresetId(id),
      className: `px-1 py-1.5 rounded-md border text-[10px] ${presetId === id ? "border-accent bg-accent/15 text-accent" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`
    },
    t("preset_" + id, id)
  ))), presetId !== "none" && /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("intensity", "Intenzita")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "range", min: "10", max: "100", value: Math.round(intensity * 100), className: "flex-1", onChange: (e) => setIntensity(parseInt(e.target.value, 10) / 100) }), /* @__PURE__ */ react_shim_default.createElement("span", { className: "w-8 text-right" }, Math.round(intensity * 100), " %"))), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex flex-col gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "text-text-dim" }, t("music", "Hudba")), music?.path ? /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ react_shim_default.createElement("span", { className: "flex-1 truncate", title: music.path }, "\u266A ", baseName(music.path)), /* @__PURE__ */ react_shim_default.createElement("button", { className: "text-red-400 hover:text-red-300", onClick: () => setMusic(null) }, "\u2715")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ react_shim_default.createElement("label", { className: "text-text-dim" }, t("music_volume", "Hlasitos\u0165")), /* @__PURE__ */ react_shim_default.createElement("input", { type: "range", min: "0", max: "100", value: music.volume ?? 30, className: "flex-1", onChange: (e) => setMusic({ ...music, volume: parseInt(e.target.value, 10) }) }), /* @__PURE__ */ react_shim_default.createElement("span", { className: "w-8 text-right" }, music.volume ?? 30, " %")), /* @__PURE__ */ react_shim_default.createElement("select", { className: "px-1.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-[11px]", value: music.mode || "mix", onChange: (e) => setMusic({ ...music, mode: e.target.value }) }, /* @__PURE__ */ react_shim_default.createElement("option", { value: "mix" }, t("music_mix", "Zmie\u0161a\u0165 s p\xF4vodn\xFDm zvukom")), /* @__PURE__ */ react_shim_default.createElement("option", { value: "replace" }, t("music_replace", "Nahradi\u0165 zvuk")))) : /* @__PURE__ */ react_shim_default.createElement("button", { className: btn, onClick: pickMusic }, "\u266A ", t("music_pick", "Vybra\u0165 hudbu\u2026"))), applied && /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-emerald-400" }, "\u2713 ", t("applied", "Aplikovan\xE9 v Editore"), ": ", applied), /* @__PURE__ */ react_shim_default.createElement("button", { className: btnA, onClick: () => api.exportEditor() }, t("export", "Exportova\u0165\u2026")), /* @__PURE__ */ react_shim_default.createElement("div", { className: "text-text-dim text-[10px]" }, t("hint", "Zmeny sa aplikuj\xFA okam\u017Eite \u2014 n\xE1h\u013Ead Editora ukazuje re\xE1lny v\xFDsledok.")));
}
api.registerEditorPanel(ReelsPanel);
