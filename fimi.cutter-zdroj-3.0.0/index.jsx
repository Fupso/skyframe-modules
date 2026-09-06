// fimi.cutter v3.0.0 — Strihač ako nástroj Editora (krok 60)
// Strih (od–do) je krok v zásobníku úprav: trim/atrim + reset časovej osi.
// Skladá sa s ostatnými nástrojmi do JEDNÉHO exportu — video strihneš,
// pridáš filtre/zvuk a ide do výstupu jedným tlačidlom. Úchyty začiatku
// a konca sa ťahajú priamo na časovej osi dole.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

function fmt(s) {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  const sec = v % 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

api.registerTool({
  icon: "✂️",
  labelKey: "title",
  fields: [
    { id: "start", type: "time", labelKey: "start", min: 0, step: 0.1, unit: "s", default: 0 },
    { id: "endCut", type: "time", labelKey: "end_cut", min: 0, step: 0.1, unit: "s", default: 0, fromEnd: true },
  ],
  // strih mení dĺžku média — nástroje ZA ním (fade od konca, titulky…)
  // dostanú prepočítanú dĺžku
  affectsDuration(values, sourceDuration) {
    const s = Math.max(0, Number(values.start) || 0);
    const e = Math.max(0, Number(values.endCut) || 0);
    if (sourceDuration <= 0 || (s <= 0 && e <= 0)) return 1;
    const dur = Math.max(0.1, sourceDuration - s - e);
    return dur / sourceDuration;
  },
  buildStep(values, ctx) {
    if (ctx.kind !== "video") return null;
    const s = Math.max(0, Number(values.start) || 0);
    const e = Math.max(0, Number(values.endCut) || 0);
    if (s <= 0 && e <= 0) return null;
    const dur = ctx.duration - s - e;
    if (dur <= 0.05) return null; // strih by zabil celé video

    const st = s.toFixed(3), du = dur.toFixed(3);
    const step = {
      label: `✂️ ${fmt(s)} – ${fmt(s + dur)}`,
      vf: `trim=start=${st}:duration=${du},setpts=PTS-STARTPTS`,
    };
    if (ctx.hasAudio !== false) {
      step.af = `atrim=start=${st}:duration=${du},asetpts=PTS-STARTPTS`;
    }
    return step;
  },
});

// Loader vyžaduje default export — nástroj žije v Editore.
export default function CutterToolStub() {
  return React.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "Nástroj Strihač nájdeš v Editore — v pravom paneli nástrojov.")
  );
}
