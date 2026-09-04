// skyframe.filters v3.2.1 — Filtre (nástroj SkyFrame Editora)
// Čistý nástroj: žiadny vlastný náhľad ani export. Štýl sa zapíše ako krok
// do zásobníka úprav v core — náhľad aj export robí Editor jednou vetvou
// (WYSIWYG) a kombinuje ho s ostatnými nástrojmi (Portrét…).
//
// Nové v 3.1.0:
//   - miniatúry filtrov = reálny obrázok s aplikovaným filtrom (nie farebný štvorček)
//   - „Filter z fotky" — vyber referenčnú fotku, modul z nej odvodí farebný štýl
//     a uloží ho medzi vlastné filtre
//   - rollovateľný zoznam, rozbaľovacie sekcie: Vlastné (hore) / Vstavané
//
// Krok môže byť:
//   - vf:    jednoduchý filter (štýl na celú snímku)
//   - graph: maskovaný graf „len obloha" (luma maska)
//   - graph + inputs: AI maska oblohy (súbor masky z core, cachovaný)

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useSyncExternalStore } = React;

// ---------------------------------------------------------------------------
// Vstavané štýly (rovnaké ako v 2.x)
// ---------------------------------------------------------------------------

function mkStyle(r, g, b, brightness, contrast, saturate) {
  return {
    channels: { r: { slope: 1, intercept: r }, g: { slope: 1, intercept: g }, b: { slope: 1, intercept: b } },
    css: { brightness, contrast, saturate },
  };
}

function builtin(id, r, g, b, br, ct, st) {
  return { id: `builtin_${id}`, nameKey: `style_${id}`, style: mkStyle(r, g, b, br, ct, st), builtin: true };
}

const BUILTIN_PRESETS = [
  builtin("sunset",      0.14, -0.02, -0.08, 104, 106, 122),
  builtin("cinematic",   0.06, -0.02,  0.05, 100, 118, 108),
  builtin("cold_blue",  -0.10,  0.00,  0.12, 100, 104, 110),
  builtin("forest",     -0.04,  0.10, -0.04,  99, 108, 116),
  builtin("noir",        0.00,  0.00,  0.00, 100, 122,   0),
  builtin("sepia",       0.12,  0.03, -0.10, 102, 100,  88),
  builtin("pink_clouds", 0.15, -0.04,  0.07, 103, 102, 112),
  builtin("summer",      0.04,  0.02, -0.02, 108, 104, 126),
  builtin("winter_fog",  0.00,  0.01,  0.04, 107,  92,  82),
  builtin("drama",       0.00,  0.00,  0.00,  97, 128, 118),
  builtin("golden",      0.16,  0.04, -0.12, 104, 106, 116),
  builtin("blue_hour",  -0.08, -0.02,  0.14,  96, 110, 108),
  builtin("vintage",     0.09,  0.03, -0.07, 105,  92,  90),
  builtin("cyberpunk",   0.10, -0.08,  0.12,  99, 114, 124),
  builtin("emerald",    -0.06,  0.10,  0.06, 100, 108, 114),
  builtin("pastel",      0.02,  0.02,  0.02, 107,  94,  78),
  builtin("contrast",    0.00,  0.00,  0.00, 100, 134, 104),
  builtin("fade",        0.03,  0.03,  0.03, 106,  88,  92),
  builtin("portrait",    0.07,  0.00, -0.03, 102, 103, 110),
  builtin("arctic",     -0.06,  0.02,  0.12, 104, 106, 100),
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  media: null,          // {path, kind} z editora
  activeStyle: null,    // {channels, css}
  activePresetId: null,
  intensity: 80,
  skyOnly: false,
  aiMask: false,
  aiStatus: null,       // {licensed, runtimeInstalled, modelInstalled} | null
  maskPath: "",         // cesta k AI maske pre aktuálne médium
  maskFor: "",          // pre ktoré médium je maska
  maskLoading: false,
  presets: [],          // používateľské štýly z configu
  baseThumb: null,      // HTMLImageElement ukážkovej fotky
  thumbs: {},           // presetId -> dataURL miniatúry s filtrom
  photoBusy: false,     // prebieha analýza fotky
  openCustom: true,     // rozbalená sekcia vlastných filtrov
  openBuiltin: false,   // rozbalená sekcia vstavaných filtrov
  curves: null,         // [[x,y],...] | null (master krivka)
  wheels: { s: [0, 0], m: [0, 0], h: [0, 0] },  // tieň/stredy/svetlá [dx,dy]
  openGrade: true,      // rozbalená sekcia kriviek a koliesok
};

let state = { ...initialState };
const listeners = new Set();
const store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...patch };
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

// ---------------------------------------------------------------------------
// Štýl → ffmpeg (rovnaká matematika ako 2.x)
// ---------------------------------------------------------------------------

function scaledStyle(style, intensity) {
  const k = Math.max(0, Math.min(100, intensity)) / 100;
  const ch = (c) => ({ slope: 1, intercept: c.intercept * k });
  return {
    channels: { r: ch(style.channels.r), g: ch(style.channels.g), b: ch(style.channels.b) },
    css: {
      brightness: 100 + (style.css.brightness - 100) * k,
      contrast: 100 + (style.css.contrast - 100) * k,
      saturate: 100 + (style.css.saturate - 100) * k,
    },
  };
}

function lutEq(style, intensity) {
  const s = scaledStyle(style, intensity);
  const ch = (name, c) => {
    const off = Math.round(c.intercept * 255);
    const sign = off >= 0 ? "+" : "";
    return `${name}='clip(val${sign}${off}\\,0\\,255)'`;
  };
  const lut = `lutrgb=${ch("r", s.channels.r)}:${ch("g", s.channels.g)}:${ch("b", s.channels.b)}`;
  const eq = `eq=brightness=${(((s.css.brightness - 100) / 100) * 0.5).toFixed(3)}:contrast=${(s.css.contrast / 100).toFixed(3)}:saturation=${(s.css.saturate / 100).toFixed(3)}`;
  return `${lut},${eq}`;
}

// ---------------------------------------------------------------------------
// Krivky + farebné kolieska (3.2.0)
// ---------------------------------------------------------------------------

/** Catmull-Rom interpolácia krivky. points = [[x,y],...] zoradené podľa x, x,y ∈ 0..1 */
function evalCurve(points, x) {
  if (!points || points.length < 2) return x;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  let i = 0;
  while (i < points.length - 2 && points[i + 1][0] < x) i++;
  const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
  const t = (x - p1[0]) / Math.max(1e-6, p2[0] - p1[0]);
  const t2 = t * t, t3 = t2 * t;
  const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  return Math.max(0, Math.min(1, y));
}

/** Krivka → ffmpeg curves=master='x/y x/y ...' */
function curveToFfmpeg(points) {
  if (!points || points.length < 3) return null; // 2 body = identita
  const pts = points.map(([x, y]) => `${x.toFixed(3)}/${y.toFixed(3)}`).join(" ");
  return `curves=master='${pts}'`;
}

/** Offset kolieska [dx,dy] (polohy bodky -1..1) → rgb zložky -1..1 (hue kruh). */
function wheelToRgb(off) {
  const [dx, dy] = off;
  const a = Math.min(1, Math.hypot(dx, dy));
  if (a < 0.01) return [0, 0, 0];
  const th = Math.atan2(dy, dx);
  const cl = (v) => Math.max(-1, Math.min(1, v));
  return [
    cl(a * Math.cos(th)),
    cl(a * Math.cos(th - (2 * Math.PI) / 3)),
    cl(a * Math.cos(th + (2 * Math.PI) / 3)),
  ];
}

/** Kolieska {s,m,h: [dx,dy]} → ffmpeg colorbalance filter (alebo null). */
function wheelsToFfmpeg(wheels) {
  if (!wheels) return null;
  const parts = [];
  const keys = [["s", "s"], ["m", "m"], ["h", "h"]];
  let any = false;
  const rgb = {};
  for (const [k] of keys) {
    const [r, g, b] = wheelToRgb(wheels[k] || [0, 0]);
    rgb[k] = [r, g, b];
    if (Math.abs(r) > 0.01 || Math.abs(g) > 0.01 || Math.abs(b) > 0.01) any = true;
  }
  if (!any) return null;
  for (const [k] of keys) {
    const [r, g, b] = rgb[k];
    parts.push(`r${k}=${r.toFixed(3)}:g${k}=${g.toFixed(3)}:b${k}=${b.toFixed(3)}`);
  }
  return `colorbalance=${parts.join(":")}`;
}

/** Je štýl neutrálny (žiadna zmena)? */
function isNeutralStyle(style) {
  if (!style) return true;
  const c = style.channels;
  const off = Math.abs(c.r.intercept) + Math.abs(c.g.intercept) + Math.abs(c.b.intercept);
  return off < 0.005 && style.css.brightness === 100 && style.css.contrast === 100 && style.css.saturate === 100;
}

/** Poskladá celý ffmpeg reťazec: štýl (lut+eq) → colorbalance → curves. */
function buildChain(style, intensity, curves, wheels) {
  const parts = [];
  if (style && !isNeutralStyle(style)) parts.push(lutEq(style, intensity));
  const wb = wheelsToFfmpeg(wheels);
  if (wb) parts.push(wb);
  const cv = curveToFfmpeg(curves);
  if (cv) parts.push(cv);
  return parts.join(",");
}

/** Graf „len obloha" — luma maska. Placeholdery [IN]/[OUT] dosadí core. */
function skyGraphLuma(chain) {
  return `[IN]split=3[base][t][mm];[t]${chain}[tinted];[mm]format=gray,curves=all='0/0 0.55/0 0.75/1 1/1'[mask];[tinted][mask]alphamerge[ta];[base][ta]overlay[OUT]`;
}

/** Graf „AI obloha" — maska zo súboru [I0] (core ju dodá ako vstup). */
function skyGraphAi(chain) {
  return `[IN]split=2[base][t];[t]${chain}[tinted];[I0][tinted]scale2ref[mask][ti];[ti][mask]alphamerge[ta];[base][ta]overlay[OUT]`;
}

function presetName(p) {
  return p.nameKey ? t(p.nameKey, p.id) : p.name || p.id;
}

// ---------------------------------------------------------------------------
// Miniatúry — reálny obrázok s aplikovaným filtrom (canvas, rovnaká
// matematika ako lutEq: najprv offset kanálov, potom jas/kontrast/sýtosť)
// ---------------------------------------------------------------------------

const THUMB_W = 300;
const THUMB_H = 200;

function applyStyleToPixels(data, style, curves, wheels) {
  const or = style.channels.r.intercept * 255;
  const og = style.channels.g.intercept * 255;
  const ob = style.channels.b.intercept * 255;
  const br = ((style.css.brightness - 100) / 100) * 0.5 * 255;
  const ct = style.css.contrast / 100;
  const st = style.css.saturate / 100;
  // kolieska → rgb offsety a váhy podľa luminancie (approx colorbalance)
  const wS = wheels ? wheelToRgb(wheels.s || [0, 0]) : [0, 0, 0];
  const wM = wheels ? wheelToRgb(wheels.m || [0, 0]) : [0, 0, 0];
  const wH = wheels ? wheelToRgb(wheels.h || [0, 0]) : [0, 0, 0];
  const hasW = wS.some((v) => Math.abs(v) > 0.01) || wM.some((v) => Math.abs(v) > 0.01) || wH.some((v) => Math.abs(v) > 0.01);
  const hasC = curves && curves.length >= 3;
  // LUT krivky (256 bodov) — rýchlejšie než počítať spline na pixel
  let lut = null;
  if (hasC) {
    lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) lut[v] = Math.round(evalCurve(curves, v / 255) * 255);
  }
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + or, g = data[i + 1] + og, b = data[i + 2] + ob;
    r += br; g += br; b += br;
    r = (r - 128) * ct + 128; g = (g - 128) * ct + 128; b = (b - 128) * ct + 128;
    let l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * st; g = l + (g - l) * st; b = l + (b - l) * st;
    if (hasW) {
      const ln = Math.max(0, Math.min(1, l / 255));
      const sW = Math.max(0, 1 - ln * 2);
      const mW = Math.max(0, 1 - Math.abs(ln - 0.5) * 2);
      const hW = Math.max(0, ln * 2 - 1);
      r += 128 * (wS[0] * sW + wM[0] * mW + wH[0] * hW);
      g += 128 * (wS[1] * sW + wM[1] * mW + wH[1] * hW);
      b += 128 * (wS[2] * sW + wM[2] * mW + wH[2] * hW);
    }
    if (lut) {
      r = lut[Math.max(0, Math.min(255, Math.round(r)))];
      g = lut[Math.max(0, Math.min(255, Math.round(g)))];
      b = lut[Math.max(0, Math.min(255, Math.round(b)))];
    }
    data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}

/** Vyrobí dataURL miniatúru: baseImg s aplikovaným štýlom. */
function makeThumb(baseImg, style, curves, wheels) {
  const cv = document.createElement("canvas");
  cv.width = THUMB_W; cv.height = THUMB_H;
  const ctx = cv.getContext("2d");
  // cover-crop 3:2
  const ir = baseImg.width / baseImg.height, tr = THUMB_W / THUMB_H;
  let sw = baseImg.width, sh = baseImg.height, sx = 0, sy = 0;
  if (ir > tr) { sw = baseImg.height * tr; sx = (baseImg.width - sw) / 2; }
  else { sh = baseImg.width / tr; sy = (baseImg.height - sh) / 2; }
  ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, THUMB_W, THUMB_H);
  const id = ctx.getImageData(0, 0, THUMB_W, THUMB_H);
  applyStyleToPixels(id.data, style, curves, wheels);
  ctx.putImageData(id, 0, 0);
  return cv.toDataURL("image/jpeg", 0.82);
}

// ---------------------------------------------------------------------------
// Filter z fotky — analýza farebného štýlu referenčnej fotky
// ---------------------------------------------------------------------------

async function loadImageFromPath(path) {
  const url = api.fileSrc ? api.fileSrc(path) : path;
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Z fotky odvodí štýl {channels, css}: posun kanálov z priemerov,
 *  jas z luminancie, sýtosť z farebnosti (Hasler–Süsstrunk). */
function analyzePhotoStyle(img) {
  const S = 128; // malá vzorka stačí
  const cv = document.createElement("canvas");
  const k = Math.min(1, S / Math.max(img.width, img.height));
  cv.width = Math.max(8, Math.round(img.width * k));
  cv.height = Math.max(8, Math.round(img.height * k));
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let sr = 0, sg = 0, sb = 0, n = d.length / 4;
  let srg = 0, syb = 0, srg2 = 0, syb2 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    sr += r; sg += g; sb += b;
    const rg = r - g, yb = 0.5 * (r + g) - b;
    srg += rg; syb += yb; srg2 += rg * rg; syb2 += yb * yb;
  }
  const mr = sr / n, mg = sg / n, mb = sb / n;
  const luma = (0.299 * mr + 0.587 * mg + 0.114 * mb) / 255;
  // farebnosť (Hasler–Süsstrunk)
  const mrg = srg / n, myb = syb / n;
  const vrg = srg2 / n - mrg * mrg, vyb = syb2 / n - myb * myb;
  const cf = Math.sqrt(Math.max(0, vrg) + Math.max(0, vyb)) + 0.3 * Math.sqrt(mrg * mrg + myb * myb);

  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const SOFT = 0.55; // posuny stlmíme, aby filter nebol extrémny
  const style = mkStyle(
    cl((mr / 255 - 0.5) * SOFT, -0.18, 0.18),
    cl((mg / 255 - 0.5) * SOFT, -0.18, 0.18),
    cl((mb / 255 - 0.5) * SOFT, -0.18, 0.18),
    Math.round(cl(100 + (luma - 0.45) * 45, 90, 114)),
    106,
    Math.round(cl(88 + (cf - 18) * 1.6, 85, 135)),
  );
  return style;
}

// ---------------------------------------------------------------------------
// Uloženie vlastných štýlov do configu modulu
// ---------------------------------------------------------------------------

async function savePresets(presets) {
  try {
    await api.invoke("set_module_config", { id: api.moduleId, config: { presets } });
  } catch (e) {
    console.error("[filtre] ukladanie štýlov:", e);
  }
}

// ---------------------------------------------------------------------------
// Panel nástroja
// ---------------------------------------------------------------------------

function Section({ title, open, onToggle, count, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, textTransform: "uppercase", opacity: 0.75,
          background: "none", border: "none", cursor: "pointer", padding: "4px 0",
          color: "inherit",
        }}
      >
        <span style={{ display: "inline-block", transition: "transform 120ms", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
        <span>{title}</span>
        <span style={{ opacity: 0.6 }}>({count})</span>
      </button>
      {open && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor krivky — canvas, klik = pridať bod, ťahaj = posun, dvojklik = zmazať
// ---------------------------------------------------------------------------

const CURVE_W = 232;
const CURVE_H = 150;

function CurveEditor({ points, onChange }) {
  const ref = React.useRef(null);
  const drag = React.useRef(-1);

  const draw = (cv, pts) => {
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, CURVE_W, CURVE_H);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, CURVE_W, CURVE_H);
    // mriežka
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo((CURVE_W / 4) * i, 0); ctx.lineTo((CURVE_W / 4) * i, CURVE_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (CURVE_H / 4) * i); ctx.lineTo(CURVE_W, (CURVE_H / 4) * i); ctx.stroke();
    }
    // diagonála (identita)
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, CURVE_H); ctx.lineTo(CURVE_W, 0); ctx.stroke();
    ctx.setLineDash([]);
    // krivka
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= CURVE_W; px += 2) {
      const y = evalCurve(pts, px / CURVE_W);
      const py = CURVE_H - y * CURVE_H;
      if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // body
    for (const [x, y] of pts) {
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x * CURVE_W, CURVE_H - y * CURVE_H, 5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  };

  React.useEffect(() => {
    if (ref.current) draw(ref.current, points);
  }, [points]);

  const toXY = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    return [x, y];
  };

  const nearest = (x, y) => {
    let best = -1, bd = 0.06;
    points.forEach(([px, py], i) => {
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };

  const onDown = (e) => {
    const [x, y] = toXY(e);
    const hit = nearest(x, y);
    if (hit >= 0) {
      drag.current = hit;
    } else {
      const pts = [...points, [x, y]].sort((a, b) => a[0] - b[0]);
      drag.current = pts.findIndex((pt) => pt[0] === x && pt[1] === y);
      onChange(pts);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (drag.current < 0) return;
    let [x, y] = toXY(e);
    const pts = points.map((pt) => [...pt]);
    const i = drag.current;
    // koncové body sa hýbu len zvislo
    if (i === 0) x = pts[0][0];
    if (i === pts.length - 1) x = pts[pts.length - 1][0];
    const minX = i > 0 ? pts[i - 1][0] + 0.02 : 0;
    const maxX = i < pts.length - 1 ? pts[i + 1][0] - 0.02 : 1;
    x = Math.max(minX, Math.min(maxX, x));
    pts[i] = [x, y];
    onChange(pts);
  };
  const onUp = () => { drag.current = -1; };
  const onDbl = (e) => {
    const [x, y] = toXY(e);
    const hit = nearest(x, y);
    if (hit > 0 && hit < points.length - 1 && points.length > 3) {
      onChange(points.filter((_, i) => i !== hit));
    }
  };

  return (
    <canvas
      ref={ref}
      width={CURVE_W}
      height={CURVE_H}
      style={{ width: "100%", borderRadius: 8, cursor: "crosshair", touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onDoubleClick={onDbl}
    />
  );
}

// ---------------------------------------------------------------------------
// Farebné koliesko — kruh, bodka = smer a množstvo farby
// ---------------------------------------------------------------------------

const WHEEL_R = 34;

function Wheel({ value, onChange, label }) {
  const ref = React.useRef(null);
  const dragging = React.useRef(false);

  const draw = (cv, [dx, dy]) => {
    const S = WHEEL_R * 2 + 8;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2;
    // farebný kruh (hue)
    const grad = ctx.createConicGradient ? ctx.createConicGradient(0, cx, cy) : null;
    if (grad) {
      for (let i = 0; i <= 360; i += 60) grad.addColorStop(i / 360, `hsl(${i}, 70%, 45%)`);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
    }
    ctx.beginPath(); ctx.arc(cx, cy, WHEEL_R, 0, Math.PI * 2); ctx.fill();
    // stmavenie okraja → stred jasnejší
    const rad = ctx.createRadialGradient(cx, cy, 2, cx, cy, WHEEL_R);
    rad.addColorStop(0, "rgba(20,20,24,0.85)");
    rad.addColorStop(1, "rgba(20,20,24,0.15)");
    ctx.fillStyle = rad;
    ctx.beginPath(); ctx.arc(cx, cy, WHEEL_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();
    // bodka
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + dx * (WHEEL_R - 7), cy + dy * (WHEEL_R - 7), 5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  };

  React.useEffect(() => {
    if (ref.current) draw(ref.current, value);
  }, [value]);

  const set = (e) => {
    const r = ref.current.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 7);
    let dy = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 7);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    onChange([Math.round(dx * 100) / 100, Math.round(dy * 100) / 100]);
  };

  const S = WHEEL_R * 2 + 8;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <canvas
        ref={ref}
        width={S}
        height={S}
        style={{ cursor: "crosshair", touchAction: "none" }}
        onPointerDown={(e) => { dragging.current = true; set(e); e.currentTarget.setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (dragging.current) set(e); }}
        onPointerUp={() => { dragging.current = false; }}
        onDoubleClick={() => onChange([0, 0])}
      />
      <span style={{ fontSize: 10, opacity: 0.7 }}>{label}</span>
    </div>
  );
}

function ToolPanel() {
  const s = useStore();

  // Médium editora
  useEffect(() => {
    if (api.getEditorMedia) store.setState({ media: api.getEditorMedia() });
    if (api.onEditorMedia) {
      return api.onEditorMedia((media) => store.setState({ media }));
    }
  }, []);

  // AI stav + používateľské štýly + ukážková fotka pre miniatúry
  useEffect(() => {
    (async () => {
      try {
        const st = await api.invoke("ai_status", {});
        store.setState({ aiStatus: st });
      } catch {
        store.setState({ aiStatus: null });
      }
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        if (Array.isArray(cfg?.presets)) {
          store.setState({ presets: cfg.presets.filter((p) => p && p.style && p.style.channels) });
        }
      } catch {}
      if (api.readModuleFile) {
        try {
          const bytes = await api.readModuleFile("assets/preview-base.jpg");
          const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
          const img = await new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im); im.onerror = rej; im.src = url;
          });
          store.setState({ baseThumb: img });
        } catch { /* bez miniatúr sa zobrazia len názvy */ }
      }
    })();
  }, []);

  // Miniatúry vstavaných + vlastných štýlov (raz na štýl)
  useEffect(() => {
    if (!s.baseThumb) return;
    const all = [...BUILTIN_PRESETS, ...s.presets];
    const missing = all.filter((p) => !s.thumbs[p.id]);
    if (!missing.length) return;
    const next = { ...s.thumbs };
    for (const p of missing) {
      try { next[p.id] = makeThumb(s.baseThumb, p.style, p.curves || null, p.wheels || null); } catch {}
    }
    store.setState({ thumbs: next });
  }, [s.baseThumb, s.presets]);

  // AI maska: spočítaj raz na médium (core cachuje súbor)
  useEffect(() => {
    if (!s.aiMask || !s.media || s.media.kind !== "photo") return;
    if (s.maskFor === s.media.path && s.maskPath) return;
    let dead = false;
    store.setState({ maskLoading: true });
    (async () => {
      try {
        const path = await api.invoke("ai_sky_mask_file", { input: s.media.path });
        if (!dead) store.setState({ maskPath: path, maskFor: s.media.path, maskLoading: false });
      } catch (e) {
        if (!dead) store.setState({ maskLoading: false, maskPath: "", maskFor: "" });
        console.error("[filtre] ai maska:", e);
      }
    })();
    return () => { dead = true; };
  }, [s.aiMask, s.media, s.maskFor, s.maskPath]);

  // Zápis kroku do editora (debounce 250 ms)
  useEffect(() => {
    if (!api.setEditorStep) return;
    const timer = setTimeout(() => {
      const st = store.getState();
      const chain = st.activeStyle || st.curves || wheelsToFfmpeg(st.wheels)
        ? buildChain(st.activeStyle, st.intensity, st.curves, st.wheels)
        : "";
      if (!st.media || !chain) {
        api.setEditorStep(null);
        return;
      }
      const name = st.activePresetId ? presetName({ id: st.activePresetId, nameKey: st.activePresetId.startsWith("builtin_") ? `style_${st.activePresetId.slice(8)}` : undefined, name: st.activePresetName }) : t("grade_only", "Farebná úprava");
      const extras = `${st.curves ? " · krivky" : ""}${wheelsToFfmpeg(st.wheels) ? " · kolieska" : ""}`;
      const label = `🎨 ${name}${st.activeStyle ? ` ${st.intensity}%` : ""}${st.skyOnly ? (st.aiMask ? " · AI obloha" : " · obloha") : ""}${extras}`;
      if (!st.skyOnly) {
        api.setEditorStep({ label, vf: chain });
      } else if (!st.aiMask) {
        api.setEditorStep({ label, graph: skyGraphLuma(chain) });
      } else if (st.media.kind === "photo" && st.maskPath && st.maskFor === st.media.path) {
        api.setEditorStep({ label, graph: skyGraphAi(chain), inputs: [st.maskPath] });
      } else {
        api.setEditorStep(null); // maska sa počíta / nie je podporovaná
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [s.activeStyle, s.intensity, s.skyOnly, s.aiMask, s.media, s.maskPath, s.maskFor, s.curves, s.wheels]);

  const pick = (p) => {
    if (s.activePresetId === p.id) {
      store.setState({ activeStyle: null, activePresetId: null, activePresetName: null, curves: null, wheels: { s: [0, 0], m: [0, 0], h: [0, 0] } });
    } else {
      store.setState({
        activeStyle: p.style,
        activePresetId: p.id,
        activePresetName: p.name || null,
        curves: p.curves ? p.curves.map((pt) => [...pt]) : null,
        wheels: p.wheels ? { s: [...(p.wheels.s || [0, 0])], m: [...(p.wheels.m || [0, 0])], h: [...(p.wheels.h || [0, 0])] } : { s: [0, 0], m: [0, 0], h: [0, 0] },
      });
    }
  };

  // ➕ Filter z fotky
  const addFromPhoto = async () => {
    if (s.photoBusy || !api.pickFiles) return;
    const picked = await api.pickFiles(
      [{ name: t("photos", "Fotky"), extensions: ["jpg", "jpeg", "png", "webp", "bmp"] }],
      false,
    );
    const path = Array.isArray(picked) ? picked[0] : picked;
    if (!path) return;
    store.setState({ photoBusy: true });
    try {
      const img = await loadImageFromPath(path);
      const style = analyzePhotoStyle(img);
      const st = store.getState();
      const id = `custom_${Date.now()}`;
      const name = `${t("custom_prefix", "Z fotky")} ${st.presets.length + 1}`;
      const photoPath = path;
      const thumb = makeThumb(st.baseThumb || img, style); // ak nie je base, aspoň samotná fotka
      const presets = [...st.presets, { id, name, style, photoPath }];
      store.setState({ presets, thumbs: { ...st.thumbs, [id]: thumb }, openCustom: true });
      savePresets(presets);
    } catch (e) {
      console.error("[filtre] filter z fotky:", e);
    } finally {
      store.setState({ photoBusy: false });
    }
  };

  const removePreset = (id) => {
    const presets = store.getState().presets.filter((p) => p.id !== id);
    const patch = { presets };
    if (s.activePresetId === id) {
      patch.activeStyle = null; patch.activePresetId = null; patch.activePresetName = null;
    }
    store.setState(patch);
    savePresets(presets);
  };

  const ai = s.aiStatus;

  const card = (p) => {
    const active = s.activePresetId === p.id;
    const thumb = s.thumbs[p.id];
    return (
      <div key={p.id} style={{ position: "relative" }}>
        <button
          onClick={() => pick(p)}
          style={{
            width: "100%",
            border: active ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: 4, background: "rgba(255,255,255,0.04)",
            cursor: "pointer", textAlign: "center",
          }}
        >
          {thumb ? (
            <img
              src={thumb} alt={presetName(p)} draggable={false}
              style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 4 }}
            />
          ) : (
            <div style={{ width: "100%", aspectRatio: "3/2", borderRadius: 6, marginBottom: 4, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.4 }}>…</div>
          )}
          <span style={{ fontSize: 11 }}>{presetName(p)}</span>
        </button>
        {!p.builtin && (
          <button
            onClick={() => removePreset(p.id)}
            title={t("delete_preset", "Zmazať filter")}
            style={{
              position: "absolute", top: 6, right: 6, width: 20, height: 20,
              borderRadius: 6, border: "none", cursor: "pointer",
              background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, lineHeight: 1,
            }}
          >✕</button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {!s.media && (
        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          {t("tool_no_media", "V Editore nie je otvorený žiadny súbor.")}
        </p>
      )}

      {/* Intenzita */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
          <span>{t("intensity", "Intenzita")}</span>
          <span>{s.intensity} %</span>
        </div>
        <input
          type="range" min={0} max={100} value={s.intensity}
          onChange={(e) => store.setState({ intensity: parseInt(e.target.value, 10) })}
          style={{ width: "100%" }}
        />
      </div>

      {/* Len obloha + AI maska */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={s.skyOnly}
          onChange={(e) => store.setState({ skyOnly: e.target.checked })}
        />
        ☁️ {t("sky_only", "Len svetlé partie (obloha)")}
      </label>
      {s.skyOnly && (
        <div style={{ marginLeft: 4, marginBottom: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={s.aiMask}
              disabled={!ai?.licensed}
              onChange={(e) => store.setState({ aiMask: e.target.checked })}
            />
            🤖 {t("ai_mask", "AI maska (presnejšia)")}
          </label>
          {s.aiMask && s.media?.kind === "video" && (
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
              ⚠️ {t("ai_video_note", "AI maska na videu zatiaľ nie je v Editore podporovaná — použi luma masku.")}
            </p>
          )}
          {s.aiMask && s.maskLoading && (
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>⏳ {t("mask_loading", "Počítam AI masku…")}</p>
          )}
          {!ai?.licensed && (
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
              🔒 {t("ai_locked", "AI maska vyžaduje AI licenciu — aktivuj ju v AI centre.")}
            </p>
          )}
        </div>
      )}

      {/* Krivky + farebné kolieska */}
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => store.setState({ openGrade: !s.openGrade })}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, textTransform: "uppercase", opacity: 0.75,
            background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            color: "inherit",
          }}
        >
          <span style={{ display: "inline-block", transition: "transform 120ms", transform: s.openGrade ? "rotate(90deg)" : "none" }}>▶</span>
          <span>{t("grade_section", "Krivky a farby")}</span>
        </button>
        {s.openGrade && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 10 }}>
            <CurveEditor
              points={s.curves || [[0, 0], [1, 1]]}
              onChange={(pts) => {
                // identita (2 body rovno) = žiadna krivka
                const identity = pts.length === 2 && Math.abs(pts[0][1] - pts[0][0]) < 0.01 && Math.abs(pts[1][1] - pts[1][0]) < 0.01;
                store.setState({ curves: identity ? null : pts });
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                className="px-2 py-1 text-[11px] rounded bg-zinc-700 hover:bg-zinc-600"
                onClick={() => store.setState({ curves: null })}
              >
                ↺ {t("curve_reset", "Reset krivky")}
              </button>
              <span style={{ fontSize: 10, opacity: 0.5, alignSelf: "center" }}>
                {t("curve_hint", "klik = bod · dvojklik = zmazať")}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <Wheel label={t("wheel_shadows", "Tiene")} value={s.wheels.s} onChange={(v) => store.setState({ wheels: { ...s.wheels, s: v } })} />
              <Wheel label={t("wheel_midtones", "Stredy")} value={s.wheels.m} onChange={(v) => store.setState({ wheels: { ...s.wheels, m: v } })} />
              <Wheel label={t("wheel_highlights", "Svetlá")} value={s.wheels.h} onChange={(v) => store.setState({ wheels: { ...s.wheels, h: v } })} />
            </div>
            <span style={{ fontSize: 10, opacity: 0.5, textAlign: "center" }}>
              {t("wheel_hint", "ťahaj bodku · dvojklik = reset kolieska")}
            </span>
            <button
              className="w-full px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
              onClick={() => {
                const st = store.getState();
                if (!st.curves && !wheelsToFfmpeg(st.wheels) && !st.activeStyle) return;
                const id = `custom_${Date.now()}`;
                const name = `${t("custom_grade_prefix", "Úprava")} ${st.presets.length + 1}`;
                const preset = {
                  id,
                  name,
                  style: st.activeStyle || mkStyle(0, 0, 0, 100, 100, 100),
                  curves: st.curves ? st.curves.map((pt) => [...pt]) : undefined,
                  wheels: wheelsToFfmpeg(st.wheels) ? { s: [...st.wheels.s], m: [...st.wheels.m], h: [...st.wheels.h] } : undefined,
                };
                let thumb = null;
                try { if (st.baseThumb) thumb = makeThumb(st.baseThumb, preset.style, preset.curves || null, preset.wheels || null); } catch {}
                const presets = [...st.presets, preset];
                store.setState({
                  presets,
                  thumbs: thumb ? { ...st.thumbs, [id]: thumb } : st.thumbs,
                  openCustom: true,
                });
                savePresets(presets);
              }}
            >
              💾 {t("save_grade", "Uložiť ako vlastný filter")}
            </button>
          </div>
        )}
      </div>

      {/* ➕ Filter z fotky */}
      <button
        className="w-full mb-2 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
        onClick={() => void addFromPhoto()}
        disabled={s.photoBusy}
      >
        {s.photoBusy ? `⏳ ${t("photo_analyzing", "Analyzujem fotku…")}` : `➕ ${t("add_from_photo", "Nový filter z fotky")}`}
      </button>

      {/* Rollovateľný zoznam filtrov v sekciách */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
        <Section
          title={t("custom_filters", "Vlastné filtre")}
          count={s.presets.length}
          open={s.openCustom}
          onToggle={() => store.setState({ openCustom: !s.openCustom })}
        >
          {s.presets.length === 0 ? (
            <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 8px" }}>
              {t("no_custom", "Zatiaľ žiadne — vytvor si vlastný z fotky tlačidlom vyššie.")}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {s.presets.map(card)}
            </div>
          )}
        </Section>

        <Section
          title={t("builtin_filters", "Vstavané filtre")}
          count={BUILTIN_PRESETS.length}
          open={s.openBuiltin}
          onToggle={() => store.setState({ openBuiltin: !s.openBuiltin })}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {BUILTIN_PRESETS.map(card)}
          </div>
        </Section>
      </div>

      {(s.activeStyle || s.curves || wheelsToFfmpeg(s.wheels)) && (
        <button
          className="w-full mt-2 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
          onClick={() => store.setState({ activeStyle: null, activePresetId: null, activePresetName: null, curves: null, wheels: { s: [0, 0], m: [0, 0], h: [0, 0] } })}
        >
          ✕ {t("clear_style", "Zrušiť všetko")}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrácia + info karta pre tab modulu
// ---------------------------------------------------------------------------

if (api.registerEditorPanel) {
  api.registerEditorPanel(ToolPanel);
}

function FiltersInfo() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm rounded-2xl border border-border bg-bg-card p-8">
        <div className="text-5xl mb-4">🎨</div>
        <h2 className="text-lg font-semibold mb-2">{t("title", "Filtre")}</h2>
        <p className="text-sm text-text-dim">
          {t("editor_tool_info", "Tento modul je nástroj SkyFrame Editora. Otvor Editor (ikona 🎛️ vľavo), nahraj súbor a tento nástroj nájdeš v pravom stĺpci.")}
        </p>
      </div>
    </div>
  );
}

export default FiltersInfo;
