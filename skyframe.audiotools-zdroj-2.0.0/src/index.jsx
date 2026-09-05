// skyframe.audiotools v2.0.0 — Zvuk (deklaratívny nástroj Editora, krok 51)
// Žiadna vlastná stránka: polia vykresľuje core v pravom paneli Editora,
// úpravy sa skladajú do zásobníka a aplikujú v JEDNOM exporte spolu
// s ostatnými nástrojmi (filtre, časozber…). Hodnoty sa auto-ukladajú
// v session — pád programu nestratí rozpracovanosť.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

api.registerTool({
  icon: "🔊",
  labelKey: "title",
  fields: [
    { id: "sec_vol", type: "separator", labelKey: "sec_volume" },
    { id: "volume", type: "slider", labelKey: "volume", min: 0, max: 300, step: 1, unit: " %", default: 100 },
    { id: "normalize", type: "checkbox", labelKey: "normalize", default: false },
    { id: "sec_fade", type: "separator", labelKey: "sec_fade" },
    { id: "fadeIn", type: "number", labelKey: "fade_in", min: 0, max: 30, step: 0.5, unit: "s", default: 0 },
    { id: "fadeOut", type: "number", labelKey: "fade_out", min: 0, max: 30, step: 0.5, unit: "s", default: 0 },
    { id: "sec_sil", type: "separator", labelKey: "sec_silence" },
    { id: "removeSilence", type: "checkbox", labelKey: "remove_silence", default: false },
  ],
  buildStep(values, ctx) {
    // fotky nemajú zvukovú stopu
    if (ctx.kind !== "video") return null;

    const chain = [];
    const labels = [];

    if (values.removeSilence) {
      // ticho na začiatku + všetky tiché úseky dlhšie ako 0,5 s
      chain.push("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2");
      chain.push("silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-45dB");
      labels.push(t("lbl_silence", "bez ticha"));
    }

    const vol = Number(values.volume ?? 100);
    if (Math.abs(vol - 100) > 0.01) {
      chain.push(`volume=${(vol / 100).toFixed(4)}`);
      labels.push(`${vol} %`);
    }

    if (values.normalize) {
      chain.push("loudnorm=I=-16:TP=-1.5:LRA=11");
      labels.push(t("lbl_norm", "normalizácia"));
    }

    const fi = Number(values.fadeIn) || 0;
    if (fi > 0) {
      chain.push(`afade=t=in:st=0:d=${fi}`);
      labels.push(`fade in ${fi} s`);
    }

    const fo = Number(values.fadeOut) || 0;
    if (fo > 0 && ctx.duration > fo) {
      chain.push(`afade=t=out:st=${(ctx.duration - fo).toFixed(3)}:d=${fo}`);
      labels.push(`fade out ${fo} s`);
    }

    if (chain.length === 0) return null;
    return { label: `🔊 ${labels.join(", ")}`, af: chain.join(",") };
  },
});

// Loader vyžaduje default export komponentu — nástroj žije v Editore,
// táto stránka sa nezobrazuje (modul má provides: ["editor_tool"]).
export default function AudioToolStub() {
  return React.createElement(
    "div",
    { style: { padding: 24, opacity: 0.7, fontSize: 13 } },
    t("stub", "Nástroj Zvuk nájdeš v Editore — v pravom paneli nástrojov.")
  );
}
