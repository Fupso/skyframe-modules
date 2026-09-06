// skyframe.timelapse v2.0.0 — Časozber ako nástroj Editora (krok 54)
// Namiesto samostatnej stránky s vlastným jobom sa zrýchlenie stáva
// krokom v zásobníku Editora: setpts (video) + atempo (zvuk) sa skladá
// s ostatnými úpravami a aplikuje v JEDNOM exporte. Hodnoty sa
// auto-ukladajú v session (pád programu nestratí rozpracovanosť).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

// atempo podporuje 0.5–100 — väčšie faktory reťazíme
function atempoChain(f) {
  const parts = [];
  let rest = f;
  while (rest > 100) {
    parts.push("atempo=100");
    rest /= 100;
  }
  parts.push(`atempo=${rest.toFixed(4)}`);
  return parts;
}

api.registerTool({
  icon: "⏩",
  labelKey: "title",
  fields: [
    { id: "factor", type: "slider", labelKey: "speed", min: 1, max: 60, step: 1, unit: "×", default: 1 },
    { id: "factorHi", type: "number", labelKey: "speed_hi", min: 1, max: 240, step: 1, default: 0 },
    { id: "target", type: "number", labelKey: "target_len", min: 0, step: 1, unit: "s", default: 0 },
    { id: "audio", type: "select", labelKey: "audio_mode", default: "speed",
      options: [
        { value: "speed", labelKey: "audio_speed" },
        { value: "mute", labelKey: "audio_mute" },
      ] },
  ],
  // core podľa toho prepočíta ctx.duration nástrojov ZA časozberom
  affectsDuration(values, sourceDuration) {
    let f = Number(values.factor) || 1;
    const hi = Number(values.factorHi) || 0;
    if (hi > 1) f = Math.min(240, hi);
    const tgt = Number(values.target) || 0;
    if (tgt > 0 && sourceDuration > 0) f = Math.max(1, sourceDuration / tgt);
    if (f <= 1.001) return 1;
    return 1 / Math.min(240, f);
  },
  buildStep(values, ctx) {
    if (ctx.kind !== "video") return null;

    let f = Number(values.factor) || 1;
    const hi = Number(values.factorHi) || 0;
    if (hi > 1) f = Math.min(240, hi);
    const tgt = Number(values.target) || 0;
    if (tgt > 0 && ctx.duration > 0) f = Math.max(1, ctx.duration / tgt);
    if (f <= 1.001) return null;
    f = Math.min(240, f);

    const outLen = ctx.duration > 0 ? ctx.duration / f : 0;
    const fr = Math.round(f);
    const fmt = (sec) => {
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s} s`;
    };
    const label = outLen > 0
      ? `⏩ ${fr}× (≈ ${fmt(outLen)})`
      : `⏩ ${fr}×`;

    if (ctx.hasAudio === false) {
      // zdroj nemá zvukovú stopu (dron) — af by zhodil render
      return { label, vf: `setpts=PTS/${f.toFixed(6)}` };
    }
    if (values.audio === "mute") {
      // zvuk úplne vypnúť (jednoduché a bezpečné pri každej dĺžke)
      return { label: `${label} · ${t("lbl_mute", "bez zvuku")}`, vf: `setpts=PTS/${f.toFixed(6)}`, af: "volume=0" };
    }
    // zrýchlený zvuk — atempo reťazený podľa faktora
    return { label, vf: `setpts=PTS/${f.toFixed(6)}`, af: atempoChain(f).join(",") };
  },
});

// Loader vyžaduje default export — nástroj žije v Editore.
export default function TimelapseToolStub() {
  return React.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "Nástroj Časozber nájdeš v Editore — v pravom paneli nástrojov.")
  );
}
