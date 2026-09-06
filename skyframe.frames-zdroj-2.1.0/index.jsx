// skyframe.frames v2.0.0 — Extraktor snímok ako nástroj Editora (krok 63)
// Namiesto samostatnej stránky: časové pole s úchytom na časovej osi
// (živý scrub v náhľade) + tlačidlo uloží presne tú snímku, ktorú vidíš
// — cez core command export_editor_frame s aktuálnym pipeline vf (WYSIWYG).
// Nástroj nemení video (buildStep → null), ide o výstupnú akciu.

import React from "react";

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);
const tt = (k, f, vars) => {
  let s = t(k, f);
  for (const [kk, vv] of Object.entries(vars ?? {})) s = s.replaceAll(`{${kk}}`, String(vv));
  return s;
};
const { useState } = React;

// Vlastná komponenta poľa — dostáva { value, onChange, values, ctx }
// ctx: { mediaPath, kind, duration, sourceDuration, timeScale, hasAudio, pipelineVf }
function CaptureButton({ values, ctx }) {
  const [busy, setBusy] = useState(false);
  const [browseBusy, setBrowseBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  async function browse() {
    if (!ctx?.mediaPath || browseBusy) return;
    setBrowseBusy(true); setMsg(""); setErr(false);
    try {
      const res = await api.invoke("extract_editor_second", {
        input: ctx.mediaPath,
        vf: ctx.pipelineVf ?? "",
        timeSec: Number(values?.time) || 0,
      });
      api.showFrames(res.frames ?? [], res.time ?? (Number(values?.time) || 0));
    } catch (e) {
      setErr(true);
      setMsg(tt("failed", "❌ {e}", { e: String(e) }));
    } finally {
      setBrowseBusy(false);
    }
  }

  async function capture() {
    if (!ctx?.mediaPath || busy) return;
    setBusy(true); setMsg(""); setErr(false);
    try {
      const p = await api.invoke("export_editor_frame", {
        input: ctx.mediaPath,
        vf: ctx.pipelineVf ?? "",
        timeSec: Number(values?.time) || 0,
        format: values?.format ?? "jpg",
        outputName: null,
      });
      setMsg(tt("saved", "✅ Uložené: {p}", { p }));
    } catch (e) {
      setErr(true);
      setMsg(tt("failed", "❌ {e}", { e: String(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 10, color: "#a1a1aa" }}>{t("hint", "Nastav pozíciu úchytom na časovej osi — video sa presunie na ňu. Uloží sa presne tá snímka, ktorú vidíš (aj s filtrami a strihom).")}</div>
      <button
        onClick={() => { void capture(); }}
        disabled={!ctx?.mediaPath || busy}
        style={{
          padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: !ctx?.mediaPath || busy ? "#3f3f46" : "#059669",
          color: "#fff", border: "none", cursor: !ctx?.mediaPath || busy ? "default" : "pointer",
          opacity: !ctx?.mediaPath || busy ? 0.6 : 1,
        }}
      >
        {busy ? t("capturing", "⏳ Ukladám…") : t("capture", "📸 Uložiť snímku")}
      </button>
      <button
        onClick={() => { void browse(); }}
        disabled={!ctx?.mediaPath || browseBusy}
        style={{
          padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: "#3f3f46", color: "#fff", border: "none",
          cursor: !ctx?.mediaPath || browseBusy ? "default" : "pointer",
          opacity: !ctx?.mediaPath || browseBusy ? 0.6 : 1,
        }}
      >
        {browseBusy ? t("browsing", "⏳ Extrahujem…") : t("browse", "🎞 Zobraziť snímky sekundy")}
      </button>
      {msg && (
        <div style={{ fontSize: 11, wordBreak: "break-all", color: err ? "#f87171" : "#34d399" }}>{msg}</div>
      )}
    </div>
  );
}

api.registerTool({
  icon: "📸",
  labelKey: "title",
  fields: [
    { id: "time", type: "time", labelKey: "time", default: 0 },
    { id: "format", type: "select", labelKey: "format", default: "jpg",
      options: [
        { value: "jpg", labelKey: "fmt_jpg" },
        { value: "png", labelKey: "fmt_png" },
      ] },
    { id: "capture", type: "custom", component: CaptureButton },
  ],
  // nepridáva krok do pipeline — ide o výstupnú akciu, nie úpravu videa
  buildStep: () => null,
});

export default function FramesToolInfo() {
  return null;
}
