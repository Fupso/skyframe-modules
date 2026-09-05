// skyframe.audiotools v2.2.0 — Zvuk (deklaratívny nástroj Editora, kroky 51+53)
// Žiadna vlastná stránka: polia vykresľuje core v pravom paneli Editora,
// úpravy sa skladajú do zásobníka a aplikujú v JEDNOM exporte spolu
// s ostatnými nástrojmi (filtre, časozber…). Hodnoty sa auto-ukladajú
// v session — pád programu nestratí rozpracovanosť.
// v2.2.0: hudobný podmaz cez audio graf (druhý vstup) — mix alebo náhrada
// pôvodného zvuku, hudba sa automaticky loopuje na dĺžku videa.

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
    { id: "fadeIn", type: "time", labelKey: "fade_in", min: 0, max: 30, step: 0.5, unit: "s", default: 0 },
    { id: "fadeOut", type: "time", labelKey: "fade_out", min: 0, max: 30, step: 0.5, unit: "s", default: 0, fromEnd: true },
    { id: "sec_sil", type: "separator", labelKey: "sec_silence" },
    { id: "removeSilence", type: "checkbox", labelKey: "remove_silence", default: false },
    { id: "sec_music", type: "separator", labelKey: "sec_music" },
    {
      id: "musicPath", type: "file", labelKey: "music_file",
      filters: [{ name: "Audio", extensions: ["mp3", "wav", "aac", "m4a", "ogg", "flac", "wma"] }],
    },
    {
      id: "musicMode", type: "select", labelKey: "music_mode", default: "mix",
      options: [
        { value: "mix", labelKey: "music_mode_mix" },
        { value: "replace", labelKey: "music_mode_replace" },
      ],
    },
    { id: "musicVolume", type: "slider", labelKey: "music_volume", min: 0, max: 200, step: 1, unit: " %", default: 100 },
  ],
  buildStep(values, ctx) {
    // fotky nemajú zvukovú stopu
    if (ctx.kind !== "video") return null;

    // reťazec úprav pôvodného zvuku
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

    const music = typeof values.musicPath === "string" && values.musicPath.trim() ? values.musicPath.trim() : null;
    if (!music) {
      if (chain.length === 0) return null;
      return { label: `🔊 ${labels.join(", ")}`, af: chain.join(",") };
    }

    // hudobný podmaz — audio graf s druhým vstupom [I0]
    const mv = Math.max(0, Math.min(200, Number(values.musicVolume ?? 100))) / 100;
    const loop = `aloop=loop=-1:size=2000000000,volume=${mv.toFixed(4)}`;
    const mode = values.musicMode === "replace" ? "replace" : "mix";

    if (mode === "replace") {
      // pôvodný zvuk sa zahodí — reťazec (hlasitosť/fade…) sa aplikuje na hudbu
      const tail = ctx.duration > 0 ? `atrim=0:${ctx.duration.toFixed(3)}` : "";
      const extra = chain.length ? "," + chain.join(",") : "";
      const g = `[I0]${loop}${tail ? "," + tail : ""}${extra}[A_OUT]`;
      labels.push(t("lbl_music_replace", "hudba namiesto zvuku"));
      return { label: `🔊 ${labels.join(", ")}`, agraph: g, aInputs: [music] };
    }

    // mix: pôvodný zvuk (s reťazcom) + loopovaná hudba
    const main = chain.length ? chain.join(",") : "anull";
    const g = `[A_IN]${main}[ax0];[I0]${loop}[mx0];[ax0][mx0]amix=inputs=2:duration=first:dropout_transition=2[A_OUT]`;
    labels.push(`${t("lbl_music_mix", "podmaz")} ${Math.round(mv * 100)} %`);
    return { label: `🔊 ${labels.join(", ")}`, agraph: g, aInputs: [music] };
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
