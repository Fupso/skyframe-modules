// skyframe.filters v3.0.0 — Filtre (nástroj SkyFrame Editora)
// Čistý nástroj: žiadny vlastný náhľad ani export. Štýl sa zapíše ako krok
// do zásobníka úprav v core — náhľad aj export robí Editor jednou vetvou
// (WYSIWYG) a kombinuje ho s ostatnými nástrojmi (Portrét…).
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
function mkAvg(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round((0.5 + v) * 255)));
  return { r: c(r), g: c(g), b: c(b) };
}
function builtin(id, r, g, b, br, ct, st) {
  return { id: `builtin_${id}`, nameKey: `style_${id}`, style: mkStyle(r, g, b, br, ct, st), avgColor: mkAvg(r, g, b), builtin: true };
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

/** Graf „len obloha" — luma maska. Placeholdery [IN]/[OUT] dosadí core. */
function skyGraphLuma(style, intensity) {
  const le = lutEq(style, intensity);
  return `[IN]split=3[base][t][mm];[t]${le}[tinted];[mm]format=gray,curves=all='0/0 0.55/0 0.75/1 1/1'[mask];[tinted][mask]alphamerge[ta];[base][ta]overlay[OUT]`;
}

/** Graf „AI obloha" — maska zo súboru [I0] (core ju dodá ako vstup). */
function skyGraphAi(style, intensity) {
  const le = lutEq(style, intensity);
  return `[IN]split=2[base][t];[t]${le}[tinted];[I0][tinted]scale2ref[mask][ti];[ti][mask]alphamerge[ta];[base][ta]overlay[OUT]`;
}

function presetName(p) {
  return p.nameKey ? t(p.nameKey, p.id) : p.name || p.id;
}

// ---------------------------------------------------------------------------
// Panel nástroja
// ---------------------------------------------------------------------------

function ToolPanel() {
  const s = useStore();

  // Médium editora
  useEffect(() => {
    if (api.getEditorMedia) store.setState({ media: api.getEditorMedia() });
    if (api.onEditorMedia) {
      return api.onEditorMedia((media) => store.setState({ media }));
    }
  }, []);

  // AI stav + používateľské štýly
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
    })();
  }, []);

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
      if (!st.media || !st.activeStyle) {
        api.setEditorStep(null);
        return;
      }
      const name = st.activePresetId ? presetName({ id: st.activePresetId, nameKey: st.activePresetId.startsWith("builtin_") ? `style_${st.activePresetId.slice(8)}` : undefined, name: st.activePresetName }) : "Štýl";
      const label = `🎨 ${name} ${st.intensity}%${st.skyOnly ? (st.aiMask ? " · AI obloha" : " · obloha") : ""}`;
      if (!st.skyOnly) {
        api.setEditorStep({ label, vf: lutEq(st.activeStyle, st.intensity) });
      } else if (!st.aiMask) {
        api.setEditorStep({ label, graph: skyGraphLuma(st.activeStyle, st.intensity) });
      } else if (st.media.kind === "photo" && st.maskPath && st.maskFor === st.media.path) {
        api.setEditorStep({ label, graph: skyGraphAi(st.activeStyle, st.intensity), inputs: [st.maskPath] });
      } else {
        api.setEditorStep(null); // maska sa počíta / nie je podporovaná
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [s.activeStyle, s.intensity, s.skyOnly, s.aiMask, s.media, s.maskPath, s.maskFor]);

  const pick = (p) => {
    if (s.activePresetId === p.id) {
      store.setState({ activeStyle: null, activePresetId: null, activePresetName: null });
    } else {
      store.setState({ activeStyle: p.style, activePresetId: p.id, activePresetName: p.name || null });
    }
  };

  const allPresets = [...BUILTIN_PRESETS, ...s.presets];
  const ai = s.aiStatus;

  return (
    <div style={{ padding: 12 }}>
      {!s.media && (
        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          {t("tool_no_media", "V Editore nie je otvorený žiadny súbor.")}
        </p>
      )}

      {/* Intenzita */}
      <div style={{ marginBottom: 14 }}>
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

      {/* Štýly */}
      <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.6, margin: "10px 0 8px" }}>
        {t("styles", "Štýly")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {allPresets.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p)}
            style={{
              border: s.activePresetId === p.id ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: 6, background: "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "center",
            }}
          >
            <div
              style={{
                height: 36, borderRadius: 6, marginBottom: 4,
                background: `rgb(${p.avgColor.r},${p.avgColor.g},${p.avgColor.b})`,
              }}
            />
            <span style={{ fontSize: 11 }}>{presetName(p)}</span>
          </button>
        ))}
      </div>

      {s.activeStyle && (
        <button
          className="w-full mt-3 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
          onClick={() => store.setState({ activeStyle: null, activePresetId: null, activePresetName: null })}
        >
          ✕ {t("clear_style", "Zrušiť filter")}
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
