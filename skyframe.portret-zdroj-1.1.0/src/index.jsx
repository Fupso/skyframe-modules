// skyframe.portret v1.1.0 — Portrét
// Portrétové úpravy fotiek: jemnosť pleti, rozjasnenie, teplota, sýtosť,
// vyostrenie, vignetácia. Fotka = aktívne médium z core (zdieľané s Filtre
// a ďalšími modulmi) — prepneš modul a fotka tu už čaká, nič nevyberáš.
//
// EDIT CHAIN (krok 21): svoje nastavenia zapisuje do core ako ffmpeg krok.
// Náhľad aj export používajú ZREŤAZENÝ filter všetkých modulov — vo Filtroch
// nastavíš štýl, prepneš sem a fotku vidíš AJ so štýlom. Export je jeden,
// výsledok jedna fotka. Náhľad sa renderuje cez ffmpeg (video_thumbnail s vf),
// takže je IDENTICKÝ s exportom (WYSIWYG).

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useSyncExternalStore } = React;

const PHOTO_EXT = ["jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"];
function isPhotoPath(p) {
  if (!p) return false;
  return PHOTO_EXT.includes(p.split(".").pop().toLowerCase());
}

const PICK_FILTERS = [{ name: "Foto", extensions: PHOTO_EXT }];

// Parametre úprav — východzie hodnoty sú NEUTRÁLNE (všetko 0). Dôležité:
// modul zapisuje svoj krok do edit chainu len keď používateľ niečo zmení;
// inak by sa jeho úpravy aplikovali aj keď ho nikdy neotvoril.
const DEFAULTS = { smooth: 0, brighten: 0, warmth: 0, saturation: 0, sharpen: 0, vignette: 0 };

const PRESETS = [
  { id: "natural",  nameKey: "preset_natural",  p: { smooth: 25, brighten: 5,  warmth: 5,   saturation: 5,   sharpen: 10, vignette: 0  } },
  { id: "softskin", nameKey: "preset_softskin", p: { smooth: 60, brighten: 10, warmth: 8,   saturation: 4,   sharpen: 5,  vignette: 0  } },
  { id: "golden",   nameKey: "preset_golden",   p: { smooth: 35, brighten: 8,  warmth: 35,  saturation: 15,  sharpen: 10, vignette: 20 } },
  { id: "studio",   nameKey: "preset_studio",   p: { smooth: 20, brighten: 15, warmth: 0,   saturation: 0,   sharpen: 25, vignette: 15 } },
  { id: "bw",       nameKey: "preset_bw",       p: { smooth: 30, brighten: 8,  warmth: 0,   saturation: -100, sharpen: 20, vignette: 25 } },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  photoPath: null,
  photoUrl: "",
  params: { ...DEFAULTS },
  chainTick: 0, // zvýši sa pri zmene edit chainu
  job: null,    // {status:"running"|"done"|"error", message, result}
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
// Prevod parametrov → ffmpeg vf fragment (vlastný krok modulu)
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
    const temp = Math.round(6500 - p.warmth * 22); // teplejšie = nižšia teplota
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

// ---------------------------------------------------------------------------
// Akcie
// ---------------------------------------------------------------------------

async function pickPhoto() {
  const f = await api.pickFiles(PICK_FILTERS, false);
  if (f && !Array.isArray(f)) {
    store.setState({ photoPath: f, job: null });
    if (api.setActiveMedia) api.setActiveMedia(f);
  }
}

async function exportPhoto() {
  const s = store.getState();
  if (!s.photoPath || s.job?.status === "running") return;
  // Export = CELÝ edit chain (vlastné parametre + kroky ostatných modulov).
  // Jeden export → jedna fotka s kompletným stavom.
  const vf = api.getEditChainVf ? (api.getEditChainVf() || buildVf(s.params)) : buildVf(s.params);
  store.setState({ job: { status: "running", message: "", result: null } });
  try {
    const result = await api.invoke("filter_image", {
      input: s.photoPath,
      vf: vf || null,
      filterComplex: null,
      outputName: null,
      outputDir: null,
    });
    store.setState({ job: { status: "done", message: "", result } });
    if (api.setActiveMedia) api.setActiveMedia(result);
  } catch (e) {
    store.setState({ job: { status: "error", message: String(e), result: null } });
  }
}

// ---------------------------------------------------------------------------
// Bočný panel — parametre
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

function SidePanel() {
  const s = useStore();
  const set = (k) => (v) => store.setState({ params: { ...s.params, [k]: v } });

  return (
    <div style={{ padding: 12, overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
        {t("presets", "Predvoľby")}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {PRESETS.map((pr) => (
          <button
            key={pr.id}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
            onClick={() => store.setState({ params: { ...pr.p } })}
          >
            {t(pr.nameKey, pr.id)}
          </button>
        ))}
      </div>

      <Slider label={`✨ ${t("smooth", "Jemnosť pleti")}`}   value={s.params.smooth}     min={0}    max={100} onChange={set("smooth")} />
      <Slider label={`💡 ${t("brighten", "Rozjasnenie")}`}    value={s.params.brighten}   min={0}    max={100} onChange={set("brighten")} />
      <Slider label={`🌡️ ${t("warmth", "Teplota")}`}          value={s.params.warmth}     min={-100} max={100} onChange={set("warmth")} />
      <Slider label={`🎨 ${t("saturation", "Sýtosť")}`}       value={s.params.saturation} min={-100} max={100} onChange={set("saturation")} />
      <Slider label={`🔍 ${t("sharpen", "Vyostrenie")}`}      value={s.params.sharpen}    min={0}    max={100} onChange={set("sharpen")} />
      <Slider label={`🌑 ${t("vignette", "Vignetácia")}`}     value={s.params.vignette}   min={0}    max={100} onChange={set("vignette")} />

      <button
        className="w-full mt-1 px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
        onClick={() => store.setState({ params: { ...DEFAULTS } })}
      >
        ↩️ {t("reset", "Obnoviť predvolené")}
      </button>

      <button
        className="w-full mt-3 px-3 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        disabled={!s.photoPath || s.job?.status === "running"}
        onClick={() => void exportPhoto()}
      >
        {s.job?.status === "running" ? `⏳ ${t("exporting", "Exportujem…")}` : `💾 ${t("export_photo", "Exportovať fotku")}`}
      </button>

      {s.job?.status === "done" && s.job.result && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#34d399", wordBreak: "break-all" }}>
          ✅ {s.job.result}
        </div>
      )}
      {s.job?.status === "error" && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#f87171", wordBreak: "break-all" }}>
          ❌ {s.job.message}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hlavný komponent
// ---------------------------------------------------------------------------

function Portret() {
  const s = useStore();

  // Aktívne médium z core (zdieľané s Filtre a ďalšími modulmi)
  useEffect(() => {
    if (api.getActiveMedia) {
      const active = api.getActiveMedia();
      if (active && isPhotoPath(active)) store.setState({ photoPath: active });
    }
    if (api.onActiveMedia) {
      return api.onActiveMedia((path) => {
        if (path && isPhotoPath(path)) store.setState({ photoPath: path, job: null });
      });
    }
  }, []);

  // Edit chain — zapíš svoj krok do core (debounce 250 ms pri ťahaní posuvníka)
  useEffect(() => {
    if (!api.setEditStep) return;
    const timer = setTimeout(() => {
      if (s.photoPath) {
        api.setEditStep({ vf: buildVf(s.params), label: "Portrét" });
      } else {
        api.setEditStep(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [s.params, s.photoPath]);

  // Iný modul zmenil svoje kroky → prekresli náhľad
  useEffect(() => {
    if (!api.onEditChain) return;
    return api.onEditChain(() => {
      store.setState({ chainTick: store.getState().chainTick + 1 });
    });
  }, []);

  // Náhľad fotky cez video_thumbnail s KOMPLETNÝM edit chainom —
  // ffmpeg render, takže náhľad je identický s exportom (WYSIWYG)
  useEffect(() => {
    if (!s.photoPath) {
      if (store.getState().photoUrl) store.setState({ photoUrl: "" });
      return;
    }
    let dead = false;
    const vf = api.getEditChainVf ? (api.getEditChainVf() || null) : null;
    (async () => {
      try {
        const bytes = await api.invoke("video_thumbnail", { path: s.photoPath, atSeconds: 0, maxWidth: 1920, vf });
        if (dead) return;
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
        store.setState({ photoUrl: url });
      } catch (e) {
        if (!dead) store.setState({ job: { status: "error", message: String(e), result: null } });
      }
    })();
    return () => { dead = true; };
  }, [s.photoPath, s.chainTick]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#111" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {s.photoUrl ? (
          <img
            src={s.photoUrl}
            alt=""
            draggable={false}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ textAlign: "center", opacity: 0.7 }}>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              {t("no_photo", "Žiadna fotka — pridaj fotku, alebo ju najprv otvor vo Filtroch a prepni sem.")}
            </p>
            <button
              className="px-4 py-2 text-sm rounded bg-zinc-700 hover:bg-zinc-600"
              onClick={() => void pickPhoto()}
            >
              📁 {t("pick_file", "Pridať fotku")}
            </button>
          </div>
        )}
      </div>

      {s.photoPath && (
        <div style={{ padding: "6px 12px", fontSize: 11, opacity: 0.6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.photoPath}</span>
          <button className="text-xs underline" onClick={() => void pickPhoto()}>
            🔄 {t("change_file", "Iná fotka")}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar + registrácia
// ---------------------------------------------------------------------------

if (api.registerToolbar) {
  api.registerToolbar([
    { id: "open", icon: "📂", labelKey: "tool_open", onClick: () => void pickPhoto() },
    { id: "export", icon: "💾", labelKey: "tool_export", onClick: () => void exportPhoto() },
  ]);
}

if (api.registerSidePanel) {
  api.registerSidePanel(SidePanel);
}

export default Portret;
