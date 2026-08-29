// skyframe.filters v1.1.0 — Filtre
// Farebné štýly pre video odvodené priamo z referenčnej fotky (~80 % zhoda):
// priemerná farba fotky sa prenáša na kanály R/G/B cez SVG feComponentTransfer
// (naživo na prehrávači), jas/kontrast/sýtosť zo štatistiky fotky.
// Video = aktívne médium z core (napr. výstup Spájača) alebo výber súboru.
// Štýly v pravom paneli core (registerSidePanel), nástroje v toolbare.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useRef, useSyncExternalStore } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }];

// ---------------------------------------------------------------------------
// Modulový store
// ---------------------------------------------------------------------------

const initialState = {
  videoPath: null,      // cesta k videu (aktívne médium / výber)
  activeStyle: null,    // {channels:{r,g,b:{slope,intercept}}, css:{brightness,contrast,saturate}} | null
  activePresetId: null,
  intensity: 80,        // sila štýlu v % (mierni kanálové posuny aj css)
  presets: [],          // {id, name, style, avgColor, favorite, createdAt}[]
  showNewStyle: false,
  analyzing: false,
  tempAnalysis: null,   // {style, avgColor}
  tempPhotoUrl: "",
  presetName: "",
  fromActiveMedia: false,
  restored: false,
};

let state = { ...initialState };
const listeners = new Set();

const store = {
  getState: () => state,
  setState(patch) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
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
// Pomocné funkcie
// ---------------------------------------------------------------------------

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Zostaví SVG feComponentTransfer pre kanálový prenos farby zo štýlu. */
const MAIN_FILTER_ID = "skyframe-style-channels";

/** Aplikuje intenzitu na štýl (1 = plná sila). */
function scaledStyle(style, intensity) {
  const k = clamp(intensity, 0, 100) / 100;
  const ch = {};
  for (const c of ["r", "g", "b"]) {
    ch[c] = {
      slope: 1 + (style.channels[c].slope - 1) * k,
      intercept: style.channels[c].intercept * k,
    };
  }
  const css = {
    brightness: 100 + (style.css.brightness - 100) * k,
    contrast: 100 + (style.css.contrast - 100) * k,
    saturate: 100 + (style.css.saturate - 100) * k,
  };
  return { channels: ch, css };
}

/** Finálny CSS filter reťazec: SVG kanály + jas/kontrast/sýtosť. */
function fullFilterString(style, intensity, filterId = MAIN_FILTER_ID) {
  if (!style) return "";
  const s = scaledStyle(style, intensity);
  return `url(#${filterId}) brightness(${s.css.brightness.toFixed(1)}%) contrast(${s.css.contrast.toFixed(1)}%) saturate(${s.css.saturate.toFixed(1)}%)`;
}

/** Skrytý SVG filter s feComponentTransfer — definícia pre url(#...) vyššie. */
function ChannelFilterDefs({ style, intensity, filterId = MAIN_FILTER_ID }) {
  if (!style) return null;
  const s = scaledStyle(style, intensity);
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id={filterId} colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="linear" slope={s.channels.r.slope.toFixed(4)} intercept={s.channels.r.intercept.toFixed(4)} />
          <feFuncG type="linear" slope={s.channels.g.slope.toFixed(4)} intercept={s.channels.g.intercept.toFixed(4)} />
          <feFuncB type="linear" slope={s.channels.b.slope.toFixed(4)} intercept={s.channels.b.intercept.toFixed(4)} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

async function pickVideo() {
  const f = await api.pickFiles(VIDEO_FILTERS, false);
  if (f && !Array.isArray(f)) {
    store.setState({ videoPath: f, fromActiveMedia: false });
    if (api.setActiveMedia) api.setActiveMedia(f);
  }
}

function savePresets(presets) {
  store.setState({ presets });
  api
    .invoke("set_module_config", { id: api.moduleId, config: { presets } })
    .catch(() => {});
}

/**
 * Analýza fotky -> štýl v2.
 * Kanálové posuny: neutrálna sivá (0.5) sa zobrazí na priemernú farbu fotky,
 * čierna/biela zostanú (intercept = avg - 0.5, obmedzený). Jas/kontrast/sýtosť
 * z globálnej štatistiky fotky.
 */
function analyzePhoto(file) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () {
      const N = 100;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = N;
      canvas.height = N;
      ctx.drawImage(img, 0, 0, N, N);
      const data = ctx.getImageData(0, 0, N, N).data;
      let r = 0, g = 0, b = 0, lumSum = 0, lumSq = 0, satSum = 0;
      const pc = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        r += pr; g += pg; b += pb;
        const lum = (pr + pg + pb) / 3 / 255;
        lumSum += lum;
        lumSq += lum * lum;
        const mx = Math.max(pr, pg, pb), mn = Math.min(pr, pg, pb);
        satSum += mx > 0 ? (mx - mn) / mx : 0;
      }
      const avgR = r / pc / 255, avgG = g / pc / 255, avgB = b / pc / 255;
      const lum = lumSum / pc;
      const std = Math.sqrt(Math.max(0, lumSq / pc - lum * lum));
      const sat = satSum / pc;

      // Kanálový posun — koľko treba pridať, aby sivá (0.5) mala farbu fotky
      const chan = (a) => ({ slope: 1, intercept: clamp(a - 0.5, -0.3, 0.3) });
      const style = {
        channels: { r: chan(avgR), g: chan(avgG), b: chan(avgB) },
        css: {
          brightness: clamp(100 + (lum - 0.5) * 60, 70, 140),
          contrast: clamp(100 + (std - 0.18) * 160, 70, 150),
          saturate: clamp(60 + sat * 200, 60, 180),
        },
      };
      resolve({
        avgColor: { r: Math.round(avgR * 255), g: Math.round(avgG * 255), b: Math.round(avgB * 255) },
        style,
      });
    };
    img.src = URL.createObjectURL(file);
  });
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

if (api.registerToolbar) {
  api.registerToolbar([
    {
      id: "open",
      icon: "📂",
      labelKey: "tool_open",
      onClick: () => void pickVideo(),
    },
    {
      id: "new_style",
      icon: "🎨",
      labelKey: "tool_new_style",
      onClick: () => store.setState({ showNewStyle: true }),
    },
    {
      id: "clear",
      icon: "🚫",
      labelKey: "tool_clear",
      onClick: () => store.setState({ activeStyle: null, activePresetId: null }),
    },
  ]);
}

// ---------------------------------------------------------------------------
// Karta štýlu
// ---------------------------------------------------------------------------

function PresetCard({ preset }) {
  const s = useStore();
  const isActive = s.activePresetId === preset.id;
  const isFav = preset.favorite;

  return (
    <div
      onClick={() =>
        store.setState(
          isActive
            ? { activeStyle: null, activePresetId: null }
            : { activeStyle: preset.style, activePresetId: preset.id },
        )
      }
      className={`rounded-xl border p-2 text-center transition-colors cursor-pointer relative ${
        isActive ? "border-accent bg-accent/10" : "border-border bg-bg hover:border-accent/40"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          savePresets(s.presets.map((p) => (p.id === preset.id ? { ...p, favorite: !p.favorite } : p)));
        }}
        style={{ position: "absolute", top: 2, right: 4 }}
        className="text-xs"
        title={t("favorite", "Obľúbené")}
      >
        {isFav ? "⭐" : "☆"}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          savePresets(s.presets.filter((p) => p.id !== preset.id));
        }}
        style={{ position: "absolute", top: 2, left: 4 }}
        className="text-[10px] text-error"
        title={t("delete", "Zmazať")}
      >
        ✕
      </button>
      <div
        style={{
          width: 34, height: 34, borderRadius: "50%", margin: "4px auto 6px",
          backgroundColor: `rgb(${preset.avgColor.r},${preset.avgColor.g},${preset.avgColor.b})`,
          border: "2px solid rgba(255,255,255,0.15)",
        }}
      />
      <p className="text-[11px] truncate">{preset.name}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bočný panel — štýly
// ---------------------------------------------------------------------------

function SidePanel() {
  const s = useStore();
  const favorites = s.presets.filter((p) => p.favorite);
  const others = s.presets.filter((p) => !p.favorite);

  return (
    <div className="space-y-4 px-1">
      {/* Aktívny filter + intenzita */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-dim">
            {s.activeStyle ? t("filter_on", "Filter aktívny") : t("filter_off", "Žiadny filter")}
          </span>
          {s.activeStyle && (
            <button
              onClick={() => store.setState({ activeStyle: null, activePresetId: null })}
              className="px-2 py-1 rounded text-[10px] text-text-dim border border-border hover:border-accent/40"
            >
              {t("clear", "Zrušiť filter")}
            </button>
          )}
        </div>
        {s.activeStyle && (
          <div>
            <label className="block text-xs text-text-dim mb-1">
              {t("intensity", "Intenzita")}: {s.intensity} %
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={s.intensity}
              onChange={(e) => store.setState({ intensity: Number(e.target.value) })}
              className="w-full accent-[#6366f1]"
            />
          </div>
        )}
      </div>

      <button
        onClick={() => store.setState({ showNewStyle: true })}
        className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-accent/10 text-accent border border-accent/20 border-dashed hover:bg-accent/20 transition-colors"
      >
        + {t("new_style", "Nový štýl z fotky")}
      </button>

      {favorites.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">
            ⭐ {t("favorites", "Obľúbené")} ({favorites.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {favorites.map((p) => <PresetCard key={p.id} preset={p} />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">
          ✨ {t("all_styles", "Všetky štýly")} ({s.presets.length})
        </h3>
        {others.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {others.map((p) => <PresetCard key={p.id} preset={p} />)}
          </div>
        ) : (
          !favorites.length && (
            <p className="text-xs text-text-dim">{t("no_styles", "Zatiaľ žiadne štýly — pridaj prvý z fotky.")}</p>
          )
        )}
      </div>
    </div>
  );
}

if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}

// ---------------------------------------------------------------------------
// Hlavný komponent — prehrávač + modal nového štýlu
// ---------------------------------------------------------------------------

function Filters() {
  const s = useStore();
  const fileInputRef = useRef(null);
  const PlayerShell = api.PlayerShell;

  // Načítanie presetov + napojenie na aktívne médium
  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.invoke("get_module_config", { id: api.moduleId });
        // iba presety nového formátu (so style.channels)
        if (Array.isArray(cfg?.presets)) {
          store.setState({ presets: cfg.presets.filter((p) => p && p.style && p.style.channels) });
        }
      } catch {}
      store.setState({ restored: true });
    })();

    // Aktívne médium z core (napr. výstup Spájača)
    if (api.getActiveMedia) {
      const active = api.getActiveMedia();
      if (active) store.setState({ videoPath: active, fromActiveMedia: true });
    }
    if (api.onActiveMedia) {
      const off = api.onActiveMedia((path) => {
        if (path) store.setState({ videoPath: path, fromActiveMedia: true });
      });
      return off;
    }
  }, []);

  const handleStylePhoto = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    store.setState({ tempPhotoUrl: URL.createObjectURL(f), analyzing: true });
    const a = await analyzePhoto(f);
    store.setState({ tempAnalysis: a, analyzing: false });
  };

  const savePreset = () => {
    const st = store.getState();
    if (!st.presetName.trim() || !st.tempAnalysis) return;
    const np = {
      id: Date.now().toString(),
      name: st.presetName.trim(),
      style: st.tempAnalysis.style,
      avgColor: st.tempAnalysis.avgColor,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    savePresets([...st.presets, np]);
    store.setState({ presetName: "", tempAnalysis: null, tempPhotoUrl: "", showNewStyle: false });
  };

  const closeModal = () =>
    store.setState({ showNewStyle: false, tempAnalysis: null, presetName: "", tempPhotoUrl: "" });

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Definícia SVG filtra pre aktívny štýl */}
      <ChannelFilterDefs style={s.activeStyle} intensity={s.intensity} />

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">🎨 {t("title", "Filtre")}</h2>
            <button
              onClick={pickVideo}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {s.videoPath ? `🔄 ${t("change_video", "Iné video")}` : `🎬 ${t("pick_video", "Vybrať video")}`}
            </button>
          </div>

          {s.videoPath ? (
            <>
              {s.fromActiveMedia && (
                <p className="text-[11px] text-text-dim mb-2">
                  🔗 {t("from_active", "Aktívne médium")}: <span className="font-mono">{baseName(s.videoPath)}</span>
                </p>
              )}
              {/* Filter sa aplikuje na obal — filtruje video vnútri PlayerShell */}
              <div
                className="rounded-xl overflow-hidden border border-border bg-black"
                style={{ filter: fullFilterString(s.activeStyle, s.intensity) }}
              >
                <PlayerShell src={s.videoPath} />
              </div>
            </>
          ) : (
            <div
              onClick={pickVideo}
              className="rounded-xl border border-dashed border-border hover:border-accent/40 transition-colors cursor-pointer py-16 text-center"
            >
              <div className="text-5xl mb-3">🎬</div>
              <p className="text-sm font-medium">{t("pick_video", "Vybrať video")}</p>
              <p className="text-xs text-text-dim mt-1">
                {t("hint_active", "Alebo najprv spoj videá v Spájači — výstup sa tu objaví sám.")}
              </p>
            </div>
          )}
        </div>

        {/* Fallback: starší core bez pravého panelu */}
        {!api.registerSidePanel && (
          <div className="bg-bg-card rounded-2xl border border-border p-6">
            <SidePanel />
          </div>
        )}
      </div>

      {/* Modal: nový štýl z fotky */}
      {s.showNewStyle && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card border border-border rounded-2xl p-6"
            style={{ width: 400, maxWidth: "90%" }}
          >
            <h3 className="text-base font-semibold mb-4">📷 {t("new_style", "Nový štýl z fotky")}</h3>
            {!s.tempAnalysis ? (
              <div>
                <p className="text-xs text-text-dim mb-3">
                  {t("photo_hint", "Nahraj fotku s požadovanými farbami — filter sa odvodí z nej.")}
                </p>
                {s.analyzing ? (
                  <p className="text-accent text-sm">{t("analyzing", "Analyzujem…")}</p>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors"
                  >
                    📁 {t("pick_photo", "Vybrať fotku")}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleStylePhoto} />
              </div>
            ) : (
              <div>
                {s.tempPhotoUrl && (
                  <div className="flex gap-2 mb-3">
                    <img src={s.tempPhotoUrl} alt="" className="rounded-lg" style={{ width: "48%", height: 100, objectFit: "cover" }} />
                    <img
                      src={s.tempPhotoUrl}
                      alt=""
                      className="rounded-lg"
                      style={{ width: "48%", height: 100, objectFit: "cover", filter: fullFilterString(s.tempAnalysis.style, s.intensity, "skyframe-style-preview") }}
                    />
                  </div>
                )}
                {s.tempAnalysis && (
                  <>
                    <ChannelFilterDefs style={s.tempAnalysis.style} intensity={s.intensity} filterId="skyframe-style-preview" />
                    <p className="text-[10px] text-text-dim mb-2 -mt-1">{t("preview_compare", "Vľavo originál, vpravo odvodený tón")}</p>
                  </>
                )}
                <input
                  type="text"
                  value={s.presetName}
                  onChange={(e) => store.setState({ presetName: e.target.value })}
                  placeholder={t("style_name", "Názov štýlu…")}
                  className="w-full px-3 py-2 mb-3 bg-bg rounded-lg border border-border text-sm text-text outline-none focus:border-accent/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
                  >
                    {t("cancel", "Zrušiť")}
                  </button>
                  <button
                    onClick={savePreset}
                    disabled={!s.presetName.trim()}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
                  >
                    💾 {t("save", "Uložiť")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Filters;
