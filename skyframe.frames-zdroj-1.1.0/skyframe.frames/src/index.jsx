// skyframe.frames v1.1.0 — Extraktor snímok
// Zadaj čas (napr. 25. sekunda) → zobrazia sa všetky snímky tej sekundy
// v plnom rozlíšení → klikneš na vybranú → veľký náhľad →
// „Editovať v Editore" (filtre, krivky, kolieska — WYSIWYG export)
// alebo „Uložiť do výstupu".

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const tt = (k, f, vars) => {
  let s = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) s = s.replaceAll(`{${kk}}`, String(vv));
  return s;
};
const { useState, useEffect, useRef, useSyncExternalStore, useCallback } = React;

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] }];

function baseName(p) {
  return p.split(/[\\/]/).pop() ?? p;
}

// "25" | "25.5" | "1:25" | "1:25.5" → sekundy
function parseTime(str) {
  const s = String(str).trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(s);
  if (m) return parseInt(m[1], 10) * 60 + parseFloat(m[2]);
  return null;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState = {
  video: null,          // path
  curTime: 0,           // aktuálna pozícia prehrávača (s)
  timeStr: "",
  frames: [],           // cesty k snímkam
  fps: 0,
  time: 0,              // použitá sekunda
  selected: -1,         // index vybranej snímky
  busy: false,
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

// ---------------------------------------------------------------------------
// Akcie
// ---------------------------------------------------------------------------

async function pickVideo() {
  const f = await api.pickFiles(VIDEO_FILTERS, false);
  if (f && f[0]) {
    store.setState({ video: f[0], frames: [], selected: -1, error: "" });
  }
}

async function extract(secOverride) {
  const s = store.getState();
  if (!s.video) {
    store.setState({ error: t("err_no_video", "Najprv vyber video") });
    return;
  }
  const sec = secOverride != null ? secOverride : parseTime(s.timeStr);
  if (sec == null || sec < 0) {
    store.setState({ error: t("err_time", "Zadaj platný čas (sekundy alebo mm:ss)") });
    return;
  }
  store.setState({ busy: true, error: "", frames: [], selected: -1 });
  try {
    const res = await api.invoke("extract_second_frames", { input: s.video, timeSec: sec });
    store.setState({
      busy: false,
      frames: res.frames ?? [],
      fps: res.fps ?? 0,
      time: res.time ?? sec,
    });
    log(tt("frames_of", "Snímky z {t}. sekundy ({n} ks, {fps} fps)", {
      t: Math.floor(res.time ?? sec),
      n: (res.frames ?? []).length,
      fps: Math.round((res.fps ?? 0) * 100) / 100,
    }));
  } catch (e) {
    store.setState({ busy: false, error: String(e) });
    log("Chyba: " + String(e));
  }
}

async function saveSelected() {
  const s = store.getState();
  const frame = s.frames[s.selected];
  if (!frame) return;
  const stem = baseName(s.video ?? "video").replace(/\.[^.]+$/, "");
  const name = `${stem}_${Math.floor(s.time)}s_sn${s.selected + 1}`;
  try {
    const p = await api.invoke("export_frame", { framePath: frame, outputName: name });
    log(tt("saved", "Snímka uložená: {p}", { p }));
  } catch (e) {
    log("Chyba: " + String(e));
  }
}

async function editSelected() {
  const s = store.getState();
  const frame = s.frames[s.selected];
  if (!frame) return;
  // najprv ulož do výstupu (trvalý súbor, nie cache) — Editor z neho pracuje
  const stem = baseName(s.video ?? "video").replace(/\.[^.]+$/, "");
  const name = `${stem}_${Math.floor(s.time)}s_sn${s.selected + 1}`;
  try {
    const p = await api.invoke("export_frame", { framePath: frame, outputName: name });
    log(tt("edit_sent", "Snímka odoslaná do Editora"));
    api.editMedia?.(p);
  } catch (e) {
    log("Chyba: " + String(e));
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const btnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
const btnGhost = { ...btnStyle, background: "rgba(255,255,255,0.08)", color: "inherit" };
const inputStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
  width: 140,
};

function fmtClock(sec) {
  const mm = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// Core prehrávač (api.VideoPlayer) — rovnaký ako v Editore, s krokovaním po snímkach
function PlayerSection({ busy }) {
  const s = useStore();
  const CorePlayer = api.VideoPlayer;

  const onTime = useCallback((tm) => {
    store.setState({ curTime: tm });
  }, []);

  const extractHere = () => void extract(store.getState().curTime);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {CorePlayer
        ? <CorePlayer src={s.video} title={baseName(s.video)} onTimeUpdate={onTime} />
        : <video src={api.fileSrc(s.video)} controls onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)}
            style={{ width: "100%", maxHeight: 420, background: "#000", borderRadius: 12 }} />}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontSize: 14, background: "rgba(255,255,255,0.06)", padding: "6px 10px", borderRadius: 8 }}>
          {fmtClock(s.curTime)} <span style={{ opacity: 0.6 }}>({s.curTime.toFixed(2)} s)</span>
        </span>
        <button style={btnStyle} disabled={busy} onClick={extractHere}>
          {busy ? t("extracting", "Extrahujem…") : t("extract_here", "🎞️ Snímky z aktuálnej pozície")}
        </button>
        <span style={{ opacity: 0.5, fontSize: 12 }}>{t("or_manual", "alebo zadaj čas ručne:")}</span>
        <input
          style={{ ...inputStyle, width: 110 }}
          value={s.timeStr}
          placeholder={t("time_hint", "napr. 25 alebo 1:25")}
          onChange={(e) => store.setState({ timeStr: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && !busy) void extract(); }}
        />
        <button style={btnGhost} disabled={busy} onClick={() => void extract()}>
          {t("extract", "Zobraziť snímky")}
        </button>
      </div>
    </div>
  );
}

function FramesExtractor() {
  const s = useStore();
  const [, force] = useState(0);
  useEffect(() => {
    const u = store.subscribe(() => force((x) => x + 1));
    return u;
  }, []);

  const selFrame = s.selected >= 0 ? s.frames[s.selected] : null;

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>🎞️ {t("title", "Extraktor snímok")}</h2>

      {/* výber videa + čas */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button style={s.video ? btnGhost : btnStyle} onClick={pickVideo}>
          {s.video ? t("change", "Zmeniť") : t("pick_video", "Vybrať video")}
        </button>
        {s.video && <span style={{ opacity: 0.7, fontSize: 13 }}>{baseName(s.video)}</span>}
      </div>

      {s.video && <PlayerSection busy={s.busy} />}

      {s.error && <div style={{ color: "#f87171", fontSize: 13 }}>{s.error}</div>}

      {!s.video && (
        <div style={{ opacity: 0.6, padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 12 }}>
          {t("empty", "Vyber video a zadaj čas — zobrazia sa všetky snímky tej sekundy")}
        </div>
      )}

      {/* mriežka snímok */}
      {s.frames.length > 0 && (
        <>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {tt("frames_of", "Snímky z {t}. sekundy ({n} ks, {fps} fps)", {
              t: Math.floor(s.time), n: s.frames.length, fps: Math.round(s.fps * 100) / 100,
            })}
            {" — "}{t("pick_frame", "Klikni na snímku, ktorú chceš vybrať")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {s.frames.map((f, i) => (
              <div
                key={f}
                onClick={() => store.setState({ selected: i })}
                style={{
                  border: i === s.selected ? "2px solid #3b82f6" : "2px solid transparent",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                  background: "#000",
                }}
              >
                <img src={api.fileSrc(f)} style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }} />
                <span style={{
                  position: "absolute", left: 4, top: 4, fontSize: 11,
                  background: "rgba(0,0,0,0.65)", color: "#fff", padding: "1px 6px", borderRadius: 6,
                }}>
                  {tt("frame_no", "Snímka č. {n} ({t} s)", {
                    n: i + 1,
                    t: (s.time + (s.fps ? i / s.fps : 0)).toFixed(2),
                  })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* veľký náhľad vybranej snímky */}
      {selFrame && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{t("selected", "Vybraná snímka")}</div>
          <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", textAlign: "center" }}>
            <img src={api.fileSrc(selFrame)} style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnStyle} onClick={() => void editSelected()}>
              {t("edit", "🖌️ Editovať v Editore")}
            </button>
            <button style={btnGhost} onClick={() => void saveSelected()}>
              {t("save", "💾 Uložiť do výstupu")}
            </button>
          </div>
        </div>
      )}

      {/* záznam */}
      {s.log.length > 0 && (
        <div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{t("log_title", "Záznam")}</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", opacity: 0.75, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 10, maxHeight: 140, overflowY: "auto" }}>
            {s.log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default FramesExtractor;
