// skyframe.stabil v1.0.0 — Stabilizácia (nástroj Editora, krok 70)
// Vyhladzuje trasúce sa zábery (ruka, vietor, chôdza) cez ffmpeg deshake:
// jednoduchý jedno-prechodový algoritmus, ktorý hľadá posun medzi snímkami
// a kompenzuje ho. Funguje priamo v pipeline → WYSIWYG náhľad aj export.
// Hrany po kompenzácii sa vyplnia (zrkadlenie/čierna/pôvodné/opakovanie).

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

api.registerTool({
  icon: "🎥",
  labelKey: "title",
  fields: [
    { id: "enabled", type: "checkbox", labelKey: "enabled", default: true },
    { id: "rx", type: "slider", labelKey: "rx", min: 1, max: 64, step: 1, unit: "px", default: 16 },
    { id: "ry", type: "slider", labelKey: "ry", min: 1, max: 64, step: 1, unit: "px", default: 16 },
    { id: "blocksize", type: "slider", labelKey: "blocksize", min: 4, max: 32, step: 4, default: 8, hintKey: "blocksize_hint" },
    {
      id: "edge", type: "select", labelKey: "edge", default: "mirror",
      options: [
        { value: "mirror", labelKey: "edge_mirror" },
        { value: "blank", labelKey: "edge_blank" },
        { value: "original", labelKey: "edge_original" },
        { value: "clamp", labelKey: "edge_clamp" },
      ],
    },
  ],
  buildStep(values, ctx) {
    if (!ctx.mediaPath || ctx.kind !== "video") return null;
    if (values.enabled === false) return null;
    const rx = Math.round(Math.max(1, Math.min(64, Number(values.rx) || 16)));
    const ry = Math.round(Math.max(1, Math.min(64, Number(values.ry) || 16)));
    const bs = Math.round(Math.max(4, Math.min(32, Number(values.blocksize) || 8)));
    const edgeMap = { blank: 0, original: 1, clamp: 2, mirror: 3 };
    const edge = edgeMap[values.edge] ?? 3;
    const vf = `deshake=rx=${rx}:ry=${ry}:edge=${edge}:blocksize=${bs}`;
    return { label: `🎥 ${t("title", "Stabilizácia")} ±${rx}/${ry}px`, vf };
  },
});

export default function StabilInfo() { return null; }
