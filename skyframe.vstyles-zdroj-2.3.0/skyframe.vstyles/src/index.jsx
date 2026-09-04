// skyframe.vstyles 2.0.0 — Štýly videa (nástroj SkyFrame Editora)
// AI štýl = prvý krok v zásobníku Editora (per-frame ONNX v core), potom
// ostatné nástroje (Filtre, Portrét). Náhľad aj export robí Editor.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect } = React;

const STYLES = [
  { id: "style-paprika",  mb: 8.6 },
  { id: "style-hayao-hd", mb: 8.6 },
  { id: "style-shinkai-hd", mb: 8.6 },
  { id: "style-hayao",    mb: 4.2 },
  { id: "style-shinkai",  mb: 4.2 },
  { id: "style-hayao2",   mb: 4.2 },
  { id: "style-shinkai2", mb: 4.2 },
  { id: "style-hayao3",   mb: 4.2 },
  { id: "style-ghibli",   mb: 7.0 },
  { id: "style-skica",    mb: 4.2 },
  { id: "style-jpanime",  mb: 6.1 },
  { id: "style-cartoon",  mb: 17.0 },
  { id: "style-mozaika",  mb: 6.6 },
  { id: "style-candy",    mb: 6.6 },
  { id: "style-dazd",     mb: 6.6 },
  { id: "style-udnie",    mb: 6.6 },
  { id: "style-pointil",  mb: 6.6 },
];

let state = {
  media: null, installed: {}, previews: {}, aiOk: null,
  selected: null, intensity: 100, fps: 24, resolution: "original", keepAudio: true,
};
const listeners = new Set();
const store = {
  getState: () => state,
  setState(p) { state = { ...state, ...p }; listeners.forEach((l) => l()); },
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
};
function useStore() {
  const [s, setS] = useState(store.getState());
  useEffect(() => store.subscribe(() => setS(store.getState())), []);
  return s;
}

async function refreshInstalled() {
  try {
    const list = await api.invoke("style_models_status", {});
    const map = {};
    for (const m of list) map[m.id] = m.installed;
    store.setState({ installed: map });
  } catch {}
}

async function loadPreviewImage(styleId) {
  if (store.getState().previews[styleId]) return;
  try {
    const bytes = await api.readModuleFile(`assets/previews/${styleId}.jpg`);
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    store.setState({ previews: { ...store.getState().previews, [styleId]: url } });
  } catch {}
}

// Zápis kroku do Editora (debounce)
let writeTimer = null;
function writeStep() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const s = store.getState();
    if (!s.selected || !s.media) {
      api.setEditorStep(null);
      return;
    }
    const label = `${t(s.selected, s.selected)} ${s.intensity} %`;
    api.setEditorStep({
      label,
      style: {
        modelId: s.selected,
        intensity: s.intensity / 100,
        fps: s.fps,
        resolution: s.resolution,
        keepAudio: s.keepAudio,
      },
    });
  }, 300);
}

function ToolPanel() {
  const s = useStore();
  const isVideo = s.media && s.media.kind === "video";

  useEffect(() => {
    refreshInstalled();
    api.invoke("ai_status", {})
      .then((st) => store.setState({ aiOk: !!(st && (st.licensed || st.trial)) }))
      .catch(() => store.setState({ aiOk: false }));
    if (api.getEditorMedia) store.setState({ media: api.getEditorMedia() });
    let un = null;
    if (api.onEditorMedia) un = api.onEditorMedia((m) => store.setState({ media: m }));
    STYLES.forEach((st) => loadPreviewImage(st.id));
    return () => { if (un) un(); };
  }, []);

  // zapíš krok pri zmene výberu/parametrov/média
  useEffect(() => { writeStep(); }, [s.selected, s.intensity, s.fps, s.resolution, s.keepAudio, s.media]);

  // pri odmountovaní panela krok nechávame (stav drží core — ako Photoshop)

  return (
    <div className="p-3 flex flex-col gap-3 text-sm">
      {!s.media && (
        <div className="text-xs text-text-dim bg-bg-card border border-border rounded-lg p-2">
          {t("hint_media", "Otvor fotku alebo video v Editore — štýl sa aplikuje naň.")}
        </div>
      )}
      {s.aiOk === false && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          ⚠ {t("need_ai", "AI štýly vyžadujú AI licenciu a ONNX Runtime — aktivuj ich v AI centre.")}
        </div>
      )}

      {/* Grid štýlov */}
      <div className="grid grid-cols-2 gap-2">
        {STYLES.map((st) => (
          <Card key={st.id} style={st} active={s.selected === st.id} installed={!!s.installed[st.id]} img={s.previews[st.id]} />
        ))}
      </div>

      {s.selected && (
        <>
          <button
            onClick={() => store.setState({ selected: null })}
            className="self-start text-xs px-2.5 py-1 rounded-lg border border-border text-text-dim hover:text-red-400"
          >
            ✕ {t("off", "Vypnúť štýl")}
          </button>

          <label className="text-xs text-text-dim flex flex-col gap-1">
            {t("intensity", "Intenzita")} — {s.intensity} %
            <input type="range" min={10} max={100} value={s.intensity}
              onChange={(e) => store.setState({ intensity: +e.target.value })} />
          </label>

          {isVideo && (
            <div className="flex flex-wrap gap-3 text-xs text-text-dim">
              <label className="flex flex-col gap-1">
                FPS
                <select value={s.fps} onChange={(e) => store.setState({ fps: +e.target.value })}
                  className="bg-bg border border-border rounded px-2 py-1">
                  <option value={24}>24</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                {t("resolution", "Rozlíšenie")}
                <select value={s.resolution} onChange={(e) => store.setState({ resolution: e.target.value })}
                  className="bg-bg border border-border rounded px-2 py-1">
                  <option value="original">{t("res_orig", "Originál")}</option>
                  <option value="2160p">4K</option>
                  <option value="1080p">1080p</option>
                  <option value="1024p">1024p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </label>
              <label className="flex items-end gap-1.5 pb-1">
                <input type="checkbox" checked={s.keepAudio} onChange={(e) => store.setState({ keepAudio: e.target.checked })} />
                {t("keep_audio", "Zvuk")}
              </label>
            </div>
          )}

          <div className="text-[11px] text-text-dim leading-snug border-t border-border pt-2">
            💡 {t("how", "Štýl je prvý krok zásobníka — potom môžeš pridať Filtre alebo Portrét. Export je jeden súbor.")}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ style, active, installed, img }) {
  const [dl, setDl] = useState(null);
  const select = () => store.setState({ selected: style.id });

  const download = async (e) => {
    e.stopPropagation();
    try {
      const jobId = await api.invoke("ensure_style_model", { modelId: style.id });
      if (!jobId) { await refreshInstalled(); return; }
      setDl({ pct: 0 });
      const un = await api.listenJob(jobId, (j) => {
        setDl({ pct: Math.max(0, j.progress) });
        if (j.status === "done") { setDl(null); refreshInstalled(); un(); }
        if (j.status === "error") { setDl(null); un(); }
      });
    } catch { /* chyba sa ukáže v statuse */ }
  };

  return (
    <div
      onClick={installed ? select : undefined}
      className={`rounded-lg border overflow-hidden transition-all ${
        active ? "border-accent ring-2 ring-accent/30" : "border-border"
      } ${installed ? "cursor-pointer hover:border-accent/60" : ""}`}
    >
      <div className="relative aspect-[3/2] bg-bg">
        {img ? (
          <img src={img} alt={style.id} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-dim">…</div>
        )}
        {!installed && (
          <button
            onClick={download}
            className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-0.5 text-white hover:bg-black/45"
          >
            {dl ? (
              <span className="text-[10px]">{Math.round(dl.pct)} %</span>
            ) : (
              <>
                <span>⬇</span>
                <span className="text-[9px]">{style.mb} MB</span>
              </>
            )}
          </button>
        )}
        {active && installed && <div className="absolute top-1 right-1 bg-accent text-white text-[9px] px-1 py-0.5 rounded">✓</div>}
      </div>
      <div className="px-1.5 py-1 bg-bg-card">
        <div className="text-[10px] font-medium truncate">{t(style.id, style.id)}</div>
      </div>
    </div>
  );
}

// registrácia panela nástroja do Editora
if (api.registerEditorPanel) {
  api.registerEditorPanel(ToolPanel);
}

export default function VStylesInfo() {
  return (
    <div className="p-4 text-sm text-text-dim">
      🎬 {t("info", "Štýly videa sú nástroj Editora — otvor Editor (🎛️) a vyber ich vpravo.")}
    </div>
  );
}
