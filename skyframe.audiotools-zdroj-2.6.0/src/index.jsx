// skyframe.audiotools v2.6.0 — Zvuk (deklaratívny nástroj Editora)
// Žiadna vlastná stránka: polia vykresľuje core v pravom paneli Editora,
// úpravy sa skladajú do zásobníka a aplikujú v JEDNOM exporte spolu
// s ostatnými nástrojmi (filtre, časozber…). Hodnoty sa auto-ukladajú
// v session — pád programu nestratí rozpracovanosť.
// v2.5.0: čistenie zvuku — klasické FFT (afftdn) alebo AI hlas (RNNoise/
// arnndn, model bd.rnnn sa stiahne raz cez core príkaz ensure_denoise_model).
// Čistenie ide v reťazci PRVÉ (denoise pred normalizáciou — inak loudnorm
// zdvihne aj šum).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

// AI model sa sťahuje lenivo — až keď používateľ režim AI naozaj použije
let denoiseModelPath = null;
let denoiseModelRequested = false;
function ensureDenoiseModel() {
  if (denoiseModelRequested || !api.invoke) return;
  denoiseModelRequested = true;
  api.invoke("ensure_denoise_model")
    .then((p) => { if (typeof p === "string" && p) denoiseModelPath = p.replace(/\\/g, "/"); })
    .catch(() => { /* offline / zlyhal download — AI režim použije klasický fallback */ });
}

api.registerTool({
  icon: "🔊",
  labelKey: "title",
  fields: [
    { id: "sec_denoise", type: "separator", labelKey: "sec_denoise" },
    {
      id: "denoiseMode", type: "select", labelKey: "denoise_mode", default: "off",
      options: [
        { value: "off", labelKey: "denoise_mode_off" },
        { value: "fft", labelKey: "denoise_mode_fft" },
        { value: "ai", labelKey: "denoise_mode_ai" },
      ],
    },
    { id: "denoiseStrength", type: "slider", labelKey: "denoise_strength", min: 1, max: 30, step: 1, unit: " dB", default: 12 },
    { id: "aiMix", type: "slider", labelKey: "ai_mix", min: 0, max: 100, step: 5, unit: " %", default: 85 },
    { id: "sec_vol", type: "separator", labelKey: "sec_volume" },
    { id: "volume", type: "slider", labelKey: "volume", min: 0, max: 300, step: 1, unit: " %", default: 100 },
    { id: "normalize", type: "checkbox", labelKey: "normalize", default: false },
    { id: "sec_fade", type: "separator", labelKey: "sec_fade" },
    { id: "fadeIn", type: "time", labelKey: "fade_in", min: 0, max: 30, step: 0.5, unit: "s", default: 0 },
    { id: "fadeOut", type: "time", labelKey: "fade_out", min: 0, max: 30, step: 0.5, unit: "s", default: 0, fromEnd: true },
    { id: "sec_sil", type: "separator", labelKey: "sec_silence" },
    { id: "removeSilence", type: "checkbox", labelKey: "remove_silence", default: false },
    { id: "sec_fx", type: "separator", labelKey: "sec_fx" },
    { id: "bass", type: "slider", labelKey: "fx_bass", min: -20, max: 20, step: 1, unit: " dB", default: 0 },
    { id: "treble", type: "slider", labelKey: "fx_treble", min: -20, max: 20, step: 1, unit: " dB", default: 0 },
    { id: "echo", type: "checkbox", labelKey: "fx_echo", default: false },
    { id: "reverb", type: "checkbox", labelKey: "fx_reverb", default: false },
    { id: "chorus", type: "checkbox", labelKey: "fx_chorus", default: false },
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
    {
      id: "musicLoop", type: "select", labelKey: "music_loop", default: "loop",
      options: [
        { value: "loop", labelKey: "music_loop_loop" },
        { value: "once", labelKey: "music_loop_once" },
      ],
    },
    { id: "musicVolume", type: "slider", labelKey: "music_volume", min: 0, max: 200, step: 1, unit: " %", default: 100 },
  ],
  buildStep(values, ctx) {
    // fotky nemajú zvukovú stopu
    if (ctx.kind !== "video") return null;
    // zdroj bez zvukovej stopy (dron): reťazec na pôvodnom zvuku nedáva zmysel
    const hasAudio = ctx.hasAudio !== false;

    // reťazec úprav pôvodného zvuku
    const chain = [];
    const labels = [];

    // ── Čistenie zvuku — PRVÉ v reťazci (pred normalizáciou!) ────────────
    const dm = typeof values.denoiseMode === "string" ? values.denoiseMode : "off";
    if (dm === "ai") {
      ensureDenoiseModel();
      if (denoiseModelPath) {
        // arnndn akceptuje len 48 kHz; mix < 100 % zachová prirodzenosť
        const mix = Math.max(0, Math.min(100, Number(values.aiMix ?? 85))) / 100;
        chain.push(`aresample=48000,arnndn=m='${denoiseModelPath}':mix=${mix.toFixed(2)}`);
        labels.push(t("lbl_denoise_ai", "AI čistenie"));
      } else {
        // model sa ešte sťahuje (alebo download zlyhal) — klasický fallback,
        // export nesmie skrachovať len kvôli chýbajúcemu modelu
        const nr = Math.max(1, Math.min(30, Number(values.denoiseStrength ?? 12)));
        chain.push(`afftdn=nr=${nr}:nf=-45`);
        labels.push(t("lbl_denoise_fft", "čistenie šumu"));
      }
    } else if (dm === "fft") {
      const nr = Math.max(1, Math.min(30, Number(values.denoiseStrength ?? 12)));
      chain.push(`afftdn=nr=${nr}:nf=-45`);
      labels.push(t("lbl_denoise_fft", "čistenie šumu"));
    }

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

    const bass = Number(values.bass ?? 0);
    if (Math.abs(bass) > 0.01) {
      chain.push(`bass=g=${bass.toFixed(1)}`);
      labels.push(`bass ${bass > 0 ? "+" : ""}${bass} dB`);
    }

    const treble = Number(values.treble ?? 0);
    if (Math.abs(treble) > 0.01) {
      chain.push(`treble=g=${treble.toFixed(1)}`);
      labels.push(`treble ${treble > 0 ? "+" : ""}${treble} dB`);
    }

    if (values.echo) {
      chain.push("aecho=0.7:0.7:50:0.35");
      labels.push(t("lbl_echo", "echo"));
    }
    if (values.reverb) {
      chain.push("aecho=0.8:0.9:40|50|60|70:0.4|0.32|0.25|0.2");
      labels.push(t("lbl_reverb", "ozvena"));
    }
    if (values.chorus) {
      chain.push("chorus=0.6:0.9:50:0.4:0.25:2");
      labels.push(t("lbl_chorus", "chorus"));
    }

    const music = typeof values.musicPath === "string" && values.musicPath.trim() ? values.musicPath.trim() : null;
    if (!music) {
      if (chain.length === 0 || !hasAudio) return null;
      return { label: `🔊 ${labels.join(", ")}`, af: chain.join(",") };
    }

    // hudobný podmaz — audio graf s druhým vstupom [I0]
    const mv = Math.max(0, Math.min(200, Number(values.musicVolume ?? 100))) / 100;
    // 2.6.0 — loop je VOĽBA: „loop" = smyčka do konca videa (ako doteraz),
    // „once" = hudba sa prehrá raz a skončí, aj keď je video dlhšie.
    const loopOn = values.musicLoop !== "once";
    const loop = `${loopOn ? "aloop=loop=-1:size=2000000000," : ""}volume=${mv.toFixed(4)}`;
    const mode = values.musicMode === "replace" ? "replace" : "mix";

    // 2.6.0 — na hudbu sa aplikujú LEN prechody (fade in/out). Hlasitosť
    // hudby rieši výhradne posuvník „Hlasitosť hudby" a hlavný posuvník
    // „Hlasitosť pôvodného zvuku" patrí pôvodnej stope — žiadne dvojité
    // pôsobenie dvoch posuvníkov na to isté.
    const musicFx = [];
    if (fi > 0) musicFx.push(`afade=t=in:st=0:d=${fi}`);
    if (fo > 0 && ctx.duration > fo) musicFx.push(`afade=t=out:st=${(ctx.duration - fo).toFixed(3)}:d=${fo}`);
    const musicTail = (ctx.duration > 0 ? [`atrim=0:${ctx.duration.toFixed(3)}`] : []).concat(musicFx);
    const tailStr = musicTail.length ? "," + musicTail.join(",") : "";

    if (mode === "replace") {
      // pôvodný zvuk sa zahodí
      const g = `[I0]${loop}${tailStr}[A_OUT]`;
      labels.push(t("lbl_music_replace", "hudba namiesto zvuku"));
      return { label: `🔊 ${labels.join(", ")}`, agraph: g, aInputs: [music] };
    }

    if (!hasAudio) {
      // zdroj nemá zvuk — mix by zlyhal ([0:a:0] neexistuje); hudba hrá samotná
      const g = `[I0]${loop}${tailStr}[A_OUT]`;
      labels.push(t("lbl_music_only", "hudba (zdroj bez zvuku)"));
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
