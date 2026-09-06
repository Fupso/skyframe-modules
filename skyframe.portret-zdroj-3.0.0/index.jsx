// skyframe.portret v3.0.0 — Portrét (deklaratívny nástroj Editora, krok 66)
// Migrácia z legacy registerEditorPanel/setEditorStep na registerTool:
// hodnoty drží core v session (prežijú reštart), krok zásobníka skladá
// buildStep. UI je jedno custom pole (predvoľby + posuvníky).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

// Východzie hodnoty NEUTRÁLNE — nič sa nepripočíta, kým používateľ nezmení
const DEFAULTS = { smooth: 0, brighten: 0, warmth: 0, saturation: 0, sharpen: 0, vignette: 0 };

const PRESETS = [
  { id: "natural",  nameKey: "preset_natural",  p: { smooth: 25, brighten: 5,  warmth: 5,   saturation: 5,   sharpen: 10, vignette: 0  } },
  { id: "softskin", nameKey: "preset_softskin", p: { smooth: 60, brighten: 10, warmth: 8,   saturation: 4,   sharpen: 5,  vignette: 0  } },
  { id: "golden",   nameKey: "preset_golden",   p: { smooth: 35, brighten: 8,  warmth: 35,  saturation: 15,  sharpen: 10, vignette: 20 } },
  { id: "studio",   nameKey: "preset_studio",   p: { smooth: 20, brighten: 15, warmth: 0,   saturation: 0,   sharpen: 25, vignette: 15 } },
  { id: "bw",       nameKey: "preset_bw",       p: { smooth: 30, brighten: 8,  warmth: 0,   saturation: -100, sharpen: 20, vignette: 25 } },
];

// ---------------------------------------------------------------------------
// Parametre → ffmpeg vf fragment
// ---------------------------------------------------------------------------

function buildVf(p) {
  const chain = [];
  if (p.smooth > 0) {
    const lr = (0.5 + (p.smooth / 100) * 2.0).toFixed(2);
    const ls = (-(p.smooth / 100)).toFixed(2);
    chain.push(`smartblur=lr=${lr}:ls=${ls}:lt=0`);
  }
  const br = ((p.brighten / 100) * 0.35).toFixed(3);
  const sat = (1 + p.saturation / 100).toFixed(3);
  if (p.brighten !== 0 || p.saturation !== 0) {
    chain.push(`eq=brightness=${br}:saturation=${sat}`);
  }
  if (p.warmth !== 0) {
    const temp = Math.round(6500 - p.warmth * 22);
    chain.push(`colortemperature=temperature=${Math.max(1000, Math.min(12000, temp))}`);
  }
  if (p.sharpen > 0) {
    chain.push(`unsharp=5:5:${((p.sharpen / 100) * 1.5).toFixed(2)}`);
  }
  if (p.vignette > 0) {
    chain.push(`vignette=angle=${((p.vignette / 100) * 0.78).toFixed(3)}`);
  }
  return chain.join(",");
}

function isNeutral(p) {
  return Object.keys(DEFAULTS).every((k) => (p?.[k] ?? DEFAULTS[k]) === DEFAULTS[k]);
}

function stepLabel(p) {
  const parts = [];
  if (p.smooth) parts.push(`${t("smooth", "Jemnosť pleti")} ${p.smooth}`);
  if (p.brighten) parts.push(`+${t("brighten", "Rozjasnenie")} ${p.brighten}`);
  if (p.warmth) parts.push(`${t("warmth", "Teplota")} ${p.warmth > 0 ? "+" : ""}${p.warmth}`);
  if (p.saturation) parts.push(`${t("saturation", "Sýtosť")} ${p.saturation > 0 ? "+" : ""}${p.saturation}`);
  if (p.sharpen) parts.push(`${t("sharpen", "Vyostrenie")} ${p.sharpen}`);
  if (p.vignette) parts.push(`${t("vignette", "Vignetácia")} ${p.vignette}`);
  return `🧑 ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Custom pole — predvoľby + posuvníky (hodnota = objekt params v session)
// ---------------------------------------------------------------------------

function Slider({ label, value, min, max, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

function PortretField({ value, onChange }) {
  const p = { ...DEFAULTS, ...(value ?? {}) };
  const set = (k) => (v) => onChange({ ...p, [k]: v });

  return (
    <div>
      <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
        {t("presets", "Predvoľby")}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {PRESETS.map((pr) => (
          <button
            key={pr.id}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
            onClick={() => onChange({ ...pr.p })}
          >
            {t(pr.nameKey, pr.id)}
          </button>
        ))}
      </div>

      <Slider label={`✨ ${t("smooth", "Jemnosť pleti")}`}   value={p.smooth}     min={0}    max={100} onChange={set("smooth")} />
      <Slider label={`💡 ${t("brighten", "Rozjasnenie")}`}    value={p.brighten}   min={0}    max={100} onChange={set("brighten")} />
      <Slider label={`🌡️ ${t("warmth", "Teplota")}`}          value={p.warmth}     min={-100} max={100} onChange={set("warmth")} />
      <Slider label={`🎨 ${t("saturation", "Sýtosť")}`}       value={p.saturation} min={-100} max={100} onChange={set("saturation")} />
      <Slider label={`🔍 ${t("sharpen", "Vyostrenie")}`}      value={p.sharpen}    min={0}    max={100} onChange={set("sharpen")} />
      <Slider label={`🌑 ${t("vignette", "Vignetácia")}`}     value={p.vignette}   min={0}    max={100} onChange={set("vignette")} />

      <button
        className="w-full mt-1 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
        onClick={() => onChange({ ...DEFAULTS })}
      >
        ↩️ {t("reset", "Obnoviť predvolené")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deklaratívna registrácia
// ---------------------------------------------------------------------------

api.registerTool({
  icon: "🧑",
  labelKey: "title",
  fields: [{ id: "params", type: "custom", component: PortretField }],
  buildStep(values, ctx) {
    if (!ctx.mediaPath) return null;
    const p = values.params;
    if (!p || isNeutral(p)) return null;
    return { label: stepLabel(p), vf: buildVf(p) };
  },
});

function PortretInfo() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm rounded-2xl border border-border bg-bg-card p-8">
        <div className="text-5xl mb-4">🧑</div>
        <h2 className="text-lg font-semibold mb-2">{t("title", "Portrét")}</h2>
        <p className="text-sm text-text-dim">
          {t("editor_tool_info", "Tento modul je nástroj SkyFrame Editora. Otvor Editor (ikona 🎛️ vľavo), nahraj súbor a tento nástroj nájdeš v pravom stĺpci.")}
        </p>
      </div>
    </div>
  );
}

export default PortretInfo;
