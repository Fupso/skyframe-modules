// fimi.style-transfer v1.0.0 — Filtre
// Náhľad filtrov na videu naživo (CSS filter), vlastné štýly z fotky.
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
  activeFilters: null,  // {brightness, contrast, saturate, sepia, hueRotate} | null
  activePresetId: null,
  presets: [],          // {id, name, filters, avgColor, favorite, createdAt}[]
  showNewStyle: false,
  analyzing: false,
  tempAnalysis: null,   // {filters, avgColor}
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

function filterString(f) {
  if (!f) return "";
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg)`;
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

/** Analýza fotky -> odvodený filter (rovnaký algoritmus ako pôvodný draft). */
function analyzePhoto(file) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;
      let r = 0, g = 0, b = 0, warm = 0, cool = 0, sat = 0, bright = 0, dark = 0;
      const pc = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        r += pr; g += pg; b += pb;
        if (pr > pb + 20) warm++; else if (pb > pr + 20) cool++;
        const mx = Math.max(pr, pg, pb), mn = Math.min(pr, pg, pb);
        sat += (mx - mn) / 255;
        const br = (pr + pg + pb) / 3;
        if (br > 180) bright++; else if (br < 75) dark++;
      }
      const avgSat = (sat / pc) * 100, wm = warm / pc, cl = cool / pc, br = ((r + g + b) / 3 / pc / 255) * 100;
      const f = {
        brightness: Math.round(90 + (br - 50) * 0.4),
        contrast: Math.round(100 + (avgSat - 50) * 0.8),
        saturate: Math.round(80 + avgSat * 0.8),
        sepia: Math.round(wm * 60),
        hueRotate: wm > 0.4 ? Math.round(wm * -15) : cl > 0.4 ? Math.round(cl * 10) : 0,
      };
      if (bright > 0.3 && dark > 0.2) f.contrast = Math.min(f.contrast + 20, 150);
      resolve({
        avgColor: { r: Math.round(r / pc), g: Math.round(g / pc), b: Math.round(b / pc) },
        filters: f,
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
      onClick: () => store.setState({ activeFilters: null, activePresetId: null }),
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
            ? { activeFilters: null, activePresetId: null }
            : { activeFilters: preset.filters, activePresetId: preset.id },
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
      {/* Aktívny filter */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-dim">
          {s.activeFilters ? t("filter_on", "Filter aktívny") : t("filter_off", "Žiadny filter")}
        </span>
        {s.activeFilters && (
          <button
            onClick={() => store.setState({ activeFilters: null, activePresetId: null })}
            className="px-2 py-1 rounded text-[10px] text-text-dim border border-border hover:border-accent/40"
          >
            {t("clear", "Zrušiť filter")}
          </button>
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
        if (Array.isArray(cfg?.presets)) store.setState({ presets: cfg.presets });
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
      filters: st.tempAnalysis.filters,
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
                style={{ filter: filterString(s.activeFilters) }}
              >
                <PlayerShell src={s.videoPath} />
              </div>
              {s.activeFilters && (
                <p className="mt-2 text-[11px] font-mono text-text-dim">{filterString(s.activeFilters)}</p>
              )}
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
                  <img src={s.tempPhotoUrl} alt="" className="rounded-lg mb-3" style={{ width: "100%", height: 120, objectFit: "cover" }} />
                )}
                <p className="text-[11px] font-mono text-text-dim mb-3">{filterString(s.tempAnalysis.filters)}</p>
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
