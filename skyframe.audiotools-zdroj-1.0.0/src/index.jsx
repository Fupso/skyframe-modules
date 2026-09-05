// skyframe.audiotools v1.0.0 — Audio nástroje
// Hlasitosť, normalizácia (EBU R128), fade in/out, odstránenie ticha,
// hudobný podmaz (mix/replace) a extrakcia audia do MP3.
// Funguje na videách aj na čistých audio súboroch.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const { useState, useEffect, useRef, useSyncExternalStore } = React;

const MEDIA_FILTERS = [
  { name: "Video / Audio", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v", "mp3", "wav", "aac", "m4a", "ogg", "flac"] },
];
const MUSIC_FILTERS = [
  { name: "Audio", extensions: ["mp3", "wav", "aac", "m4a", "ogg", "flac"] },
];
const AUDIO_EXTS = ["mp3", "wav", "aac", "m4a", "ogg", "flac"];

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
function extOf(p) {
  const m = /\.([^.\\/]+)$/.exec(p);
  return m ? m[1].toLowerCase() : "";
}
function isAudioPath(p) {
  return AUDIO_EXTS.includes(extOf(p));
}
function fmtDur(sec) {
  if (!sec || !isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} s`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  media: null,
  duration: 0,
  volume: 100,          // %
  normalize: false,
  fadeIn: 0,
  fadeOut: 0,
  removeSilence: false,
  music: null,
  musicMode: "mix",     // mix | replace
  musicVolume: 100,     // %
  extractAudio: false,
  busy: false,
  progress: -1,
  busyLabel: "",
  result: "",
  error: "",
  log: [],
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

function log(line) {
  const ts = new Date().toLocaleTimeString();
  store.setState((s) => ({ log: [`[${ts}] ${line}`, ...s.log].slice(0, 100) }));
}

function watchJob(jobId, onProgress) {
  return new Promise((resolve) => {
    let unlisten;
    api.listenJob(jobId, (job) => {
      onProgress?.(job);
      if (job.status !== "running") {
        unlisten?.();
        resolve(job);
      }
    }).then((u) => { unlisten = u; });
  });
}

// ---------------------------------------------------------------------------
// Akcie
// ---------------------------------------------------------------------------

async function pickMedia() {
  const f = await api.pickFiles(MEDIA_FILTERS, false);
  const path = Array.isArray(f) ? f[0] : f;
  if (!path) return;
  store.setState({ media: path, result: "", error: "", duration: 0 });
  try {
    const info = await api.invoke("get_video_info", { path });
    store.setState({ duration: info.duration ?? 0 });
  } catch { /* audio súbory nemusia mať video info */ }
}

async function pickMusic() {
  const f = await api.pickFiles(MUSIC_FILTERS, false);
  const path = Array.isArray(f) ? f[0] : f;
  if (!path) return;
  store.setState({ music: path, error: "" });
}

function hasAnyEdit(s) {
  if (s.extractAudio) return true;
  return (
    Math.abs(s.volume - 100) > 0.01 ||
    s.normalize ||
    s.fadeIn > 0 ||
    s.fadeOut > 0 ||
    s.removeSilence ||
    !!s.music
  );
}

async function run() {
  const s = store.getState();
  if (!s.media) {
    store.setState({ error: t("err_no_media", "Najprv vyber video alebo audio") });
    return;
  }
  if (!hasAnyEdit(s)) {
    store.setState({ error: t("err_no_edit", "Nezvolená žiadna úprava") });
    return;
  }
  store.setState({ busy: true, progress: -1, busyLabel: "", error: "", result: "" });
  log(`🔊 ${baseName(s.media)}${s.extractAudio ? " → MP3" : ""}`);
  try {
    const opts = {
      volume: s.volume,
      normalize: s.normalize,
      fade_in: s.fadeIn > 0 ? s.fadeIn : null,
      fade_out: s.fadeOut > 0 ? s.fadeOut : null,
      remove_silence: s.removeSilence,
      music_path: s.extractAudio ? null : s.music,
      music_mode: s.music ? s.musicMode : null,
      music_volume: s.music ? s.musicVolume : null,
      extract_audio: s.extractAudio,
    };
    const jobId = await api.invoke("audio_tools", { input: s.media, opts, moduleId: api.moduleId });
    const res = await watchJob(jobId, (j) => store.setState({ progress: j.progress ?? -1, busyLabel: j.message || "" }));
    if (res.status === "done" && res.result) {
      store.setState({ result: res.result, busy: false });
      log(`✓ ${t("done", "Hotovo")}: ${baseName(res.result)}`);
    } else if (res.status === "cancelled") {
      store.setState({ busy: false });
      log("⊘ zrušené");
    } else {
      store.setState({ busy: false, error: res.message || "?" });
      log("✗ " + (res.message || "?"));
    }
  } catch (e) {
    store.setState({ busy: false, error: String(e) });
    log("✗ " + String(e));
  }
}

async function openFolder() {
  const r = store.getState().result;
  if (!r) return;
  try {
    await api.invoke("open_in_file_manager", { path: r });
  } catch (e) {
    store.setState({ error: String(e) });
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const btnStyle = {
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600,
};
const btnGhost = { ...btnStyle, background: "rgba(255,255,255,0.08)", color: "inherit" };
const inputStyle = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)", color: "inherit", width: 80,
};
const sectionStyle = {
  background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px",
  display: "flex", flexDirection: "column", gap: 10,
};
const rowStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const labelStyle = { fontSize: 13, opacity: 0.8, minWidth: 130 };

function Check({ checked, onChange, label, disabled }) {
  return (
    <label style={{ ...rowStyle, gap: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </label>
  );
}

function Preview({ src, volume }) {
  // video → core prehrávač (auto-transcode); audio → natívny <audio>
  if (isAudioPath(src)) {
    return <audio src={api.fileSrc(src)} controls style={{ width: "100%" }} />;
  }
  const VP = api.VideoPlayer;
  if (VP) {
    return <VP src={src} style={{ width: "100%", maxHeight: 380, borderRadius: 12 }} />;
  }
  return <video src={api.fileSrc(src)} controls style={{ width: "100%", maxHeight: 380, background: "#000", borderRadius: 12 }} />;
}

function AudioToolsPage() {
  const s = useStore();
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((x) => x + 1)), []);

  const inputIsAudio = s.media ? isAudioPath(s.media) : false;
  const dis = s.busy || s.extractAudio;

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>🔊 {t("title", "Audio nástroje")}</h2>

      <div style={rowStyle}>
        <button style={s.media ? btnGhost : btnStyle} onClick={pickMedia} disabled={s.busy}>
          {s.media ? t("change", "Zmeniť") : t("pick_media", "Vybrať video / audio")}
        </button>
        {s.media && (
          <span style={{ opacity: 0.7, fontSize: 13 }}>
            {baseName(s.media)}{s.duration > 0 ? ` · ${fmtDur(s.duration)}` : ""}
          </span>
        )}
      </div>

      {!s.media && (
        <div style={{ opacity: 0.6, padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12 }}>
          {t("empty", "Vyber video alebo audio — hlasitosť, normalizácia, fade, ticho, podmaz, extrakcia MP3")}
        </div>
      )}

      {s.media && (
        <>
          <Preview src={s.media} volume={s.volume} />

          {/* hlasitosť */}
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <span style={labelStyle}>{t("volume", "Hlasitosť")}</span>
              <input
                type="range" min="0" max="300" step="1"
                value={s.volume}
                disabled={s.busy}
                onChange={(e) => store.setState({ volume: parseInt(e.target.value, 10) })}
                style={{ flex: 1, minWidth: 140 }}
              />
              <input
                type="number" min="0" max="300" step="5"
                value={s.volume}
                disabled={s.busy}
                onChange={(e) => store.setState({ volume: Math.max(0, Math.min(300, parseInt(e.target.value, 10) || 0)) })}
                style={inputStyle}
              />
              <span style={{ fontSize: 13, opacity: 0.6 }}>%</span>
            </div>
            <Check
              checked={s.normalize}
              disabled={s.busy}
              onChange={(v) => store.setState({ normalize: v })}
              label={t("normalize", "Normalizovať hlasitosť (EBU R128)")}
            />
          </div>

          {/* fade + ticho */}
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <span style={labelStyle}>{t("fade", "Fade in / out (s)")}</span>
              <input
                type="number" min="0" max="30" step="0.5"
                value={s.fadeIn}
                disabled={dis}
                onChange={(e) => store.setState({ fadeIn: Math.max(0, parseFloat(e.target.value) || 0) })}
                style={inputStyle}
                title="fade in"
              />
              <input
                type="number" min="0" max="30" step="0.5"
                value={s.fadeOut}
                disabled={dis}
                onChange={(e) => store.setState({ fadeOut: Math.max(0, parseFloat(e.target.value) || 0) })}
                style={inputStyle}
                title="fade out"
              />
            </div>
            <Check
              checked={s.removeSilence}
              disabled={dis}
              onChange={(v) => store.setState({ removeSilence: v })}
              label={t("remove_silence", "Odstrániť ticho (-45 dB, min. 0,5 s)")}
            />
          </div>

          {/* podmaz */}
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <span style={labelStyle}>{t("music", "Hudobný podmaz")}</span>
              <button style={s.music ? btnGhost : { ...btnGhost, border: "1px dashed rgba(255,255,255,0.25)" }}
                onClick={pickMusic} disabled={dis}>
                {s.music ? baseName(s.music) : t("pick_music", "Vybrať hudbu…")}
              </button>
              {s.music && (
                <button style={{ ...btnGhost, padding: "6px 10px" }} disabled={dis}
                  onClick={() => store.setState({ music: null })}>✕</button>
              )}
            </div>
            {s.music && (
              <>
                <div style={rowStyle}>
                  <label style={{ ...rowStyle, gap: 6, cursor: "pointer" }}>
                    <input type="radio" name="mmode" checked={s.musicMode === "mix"} disabled={dis}
                      onChange={() => store.setState({ musicMode: "mix" })} />
                    <span style={{ fontSize: 13 }}>{t("mode_mix", "Zmiešať s pôvodným zvukom")}</span>
                  </label>
                  <label style={{ ...rowStyle, gap: 6, cursor: inputIsAudio ? "default" : "pointer", opacity: inputIsAudio ? 0.45 : 1 }}>
                    <input type="radio" name="mmode" checked={s.musicMode === "replace"} disabled={dis || inputIsAudio}
                      onChange={() => store.setState({ musicMode: "replace" })} />
                    <span style={{ fontSize: 13 }}>{t("mode_replace", "Nahradiť zvuk videa")}</span>
                  </label>
                </div>
                <div style={rowStyle}>
                  <span style={{ ...labelStyle, minWidth: 0 }}>{t("music_volume", "Hlasitosť podmazu")}</span>
                  <input
                    type="range" min="0" max="200" step="1"
                    value={s.musicVolume}
                    disabled={dis}
                    onChange={(e) => store.setState({ musicVolume: parseInt(e.target.value, 10) })}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <span style={{ fontSize: 13, opacity: 0.6, minWidth: 42 }}>{s.musicVolume} %</span>
                </div>
              </>
            )}
          </div>

          {/* extrakcia */}
          <div style={sectionStyle}>
            <Check
              checked={s.extractAudio}
              disabled={s.busy}
              onChange={(v) => store.setState({ extractAudio: v })}
              label={t("extract", "Len extrahovať audio do MP3")}
            />
            {s.extractAudio && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {t("extract_note", "Ostatné úpravy okrem hlasitosti sa pri extrakcii nepoužijú")}
              </div>
            )}
          </div>

          {/* spustiť */}
          <div style={rowStyle}>
            <button style={btnStyle} disabled={s.busy || !hasAnyEdit(s)} onClick={() => void run()}>
              {s.busy
                ? `${t("working", "Spracúvam…")}${s.progress >= 0 ? ` ${Math.round(s.progress)} %` : ""}`
                : t("apply", "🔊 Použiť úpravy")}
            </button>
            {s.busy && s.busyLabel && <span style={{ fontSize: 12, opacity: 0.6 }}>{s.busyLabel}</span>}
          </div>

          {s.error && (
            <div style={{ color: "#f87171", fontSize: 13, background: "rgba(248,113,113,0.08)", borderRadius: 8, padding: "8px 12px", whiteSpace: "pre-wrap" }}>
              {s.error}
            </div>
          )}

          {s.result && (
            <div style={{ ...sectionStyle, background: "rgba(34,197,94,0.08)" }}>
              <div style={{ fontSize: 13 }}>✓ {t("done", "Hotovo")}: <b>{baseName(s.result)}</b></div>
              <div style={rowStyle}>
                {!isAudioPath(s.result) && (
                  <button style={btnStyle} onClick={() => api.editMedia?.(s.result)}>
                    🖌️ {t("open_editor", "Otvoriť v Editore")}
                  </button>
                )}
                <button style={btnGhost} onClick={openFolder}>
                  📂 {t("open_folder", "Otvoriť priečinok")}
                </button>
              </div>
            </div>
          )}

          {/* záznam */}
          {s.log.length > 0 && (
            <div style={sectionStyle}>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{t("log_title", "Záznam")}</span>
              <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8, maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {s.log.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AudioToolsPage;
