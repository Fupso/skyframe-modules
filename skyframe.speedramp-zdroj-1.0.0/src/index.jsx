// skyframe.speedramp 1.0.0 — Rampa rýchlosti (nástroj Editora, krok 73)
// Vybraná sekcia videa sa spomalí alebo zrýchli, zvyšok beží normálne —
// klasický „speed ramp". Video aj zvuk sa rozdelia na 3 úseky (pred /
// sekcia / po), sekcia dostane faktor a všetko sa zreťazí (concat),
// takže zvuk ostáva v synchronizácii s obrazom.
//
// Technicky: filter_complex graf s placeholdermi [IN]/[OUT] (video) a
// [A_IN]/[A_OUT] (zvuk). Prázdne úseky (sekcia na začiatku/konci) sa
// vynechajú — concat by na nich zlyhal.

const api = window.SkyFrame;
const t = (k, f) => api.t(k, f);

// atempo akceptuje len 0.5–100 (staršie ffmpeg len 0.5–2.0) → reťazíme
function atempoChain(f) {
  const parts = [];
  let r = f;
  while (r > 2) { parts.push("atempo=2"); r /= 2; }
  while (r < 0.5) { parts.push("atempo=0.5"); r /= 0.5; }
  parts.push(`atempo=${r.toFixed(4)}`);
  return parts.join(",");
}

// posledná známa efektívna dĺžka z buildStep — affectsDuration ju potrebuje
// na výpočet násobku dĺžky (dostane len values + sourceDuration)
let lastDur = 0;

function segments(start, dur, D) {
  // vráti zoznam úsekov {from, to, f} — f=1 je normálna rýchlosť
  const T0 = Math.max(0, Math.min(start, D));
  const T1 = Math.max(T0, Math.min(start + dur, D));
  const segs = [];
  if (T0 > 0.01) segs.push({ from: 0, to: T0, f: 1 });
  if (T1 - T0 > 0.01) segs.push({ from: T0, to: T1, f: "ramp" });
  if (D - T1 > 0.01) segs.push({ from: T1, to: D, f: 1 });
  return segs;
}

api.registerTool({
  icon: "⏩",
  labelKey: "title",
  fields: [
    { id: "enabled", type: "checkbox", labelKey: "enabled", default: true },
    { id: "start", type: "number", labelKey: "start", min: 0, step: 0.1, unit: "s", default: 0 },
    { id: "duration", type: "number", labelKey: "duration", min: 0.1, step: 0.1, unit: "s", default: 2 },
    { id: "factor", type: "slider", labelKey: "factor", min: 0.25, max: 4, step: 0.25, unit: "×", default: 0.5 },
    { id: "hint", type: "separator", labelKey: "hint" },
  ],
  affectsDuration(values) {
    if (values.enabled === false) return 1;
    const f = Number(values.factor) || 1;
    if (Math.abs(f - 1) < 0.001) return 1;
    const D = lastDur > 0 ? lastDur : 1;
    const segs = segments(Number(values.start) || 0, Number(values.duration) || 0, D);
    let nd = 0;
    for (const s of segs) nd += (s.to - s.from) / (s.f === "ramp" ? f : 1);
    return D > 0 ? nd / D : 1;
  },
  buildStep(values, ctx) {
    if (!ctx.mediaPath || ctx.kind !== "video") return null;
    if (values.enabled === false) { lastDur = ctx.duration; return null; }
    const f = Number(values.factor) || 1;
    const D = ctx.duration > 0 ? ctx.duration : ctx.sourceDuration;
    lastDur = D;
    if (Math.abs(f - 1) < 0.001 || D <= 0) return null;
    const start = Number(values.start) || 0;
    const dur = Number(values.duration) || 0;
    if (dur < 0.05 || start >= D - 0.01) return null;

    const segs = segments(start, dur, D);
    if (segs.length === 0) return null;

    // ── Video graf ──
    const vParts = [`[IN]split=${segs.length}${segs.map((_, i) => `[rs${i}]`).join("")}`];
    segs.forEach((s, i) => {
      const eff = s.f === "ramp" ? f : 1;
      const trim = s.to >= D - 0.001
        ? `trim=start=${s.from.toFixed(3)}`
        : `trim=start=${s.from.toFixed(3)}:end=${s.to.toFixed(3)}`;
      const pts = eff === 1 ? "setpts=PTS-STARTPTS" : `setpts=(PTS-STARTPTS)/${eff.toFixed(4)}`;
      vParts.push(`[rs${i}]${trim},${pts}[rv${i}]`);
    });
    vParts.push(`${segs.map((_, i) => `[rv${i}]`).join("")}concat=n=${segs.length}:v=1:a=0[OUT]`);
    const graph = vParts.join(";");

    // ── Zvukový graf (rovnaké úseky, sekcia s atempo) ──
    let agraph = null;
    if (ctx.hasAudio) {
      const aParts = [`[A_IN]asplit=${segs.length}${segs.map((_, i) => `[ras${i}]`).join("")}`];
      segs.forEach((s, i) => {
        const eff = s.f === "ramp" ? f : 1;
        const atrim = s.to >= D - 0.001
          ? `atrim=start=${s.from.toFixed(3)}`
          : `atrim=start=${s.from.toFixed(3)}:end=${s.to.toFixed(3)}`;
        const tail = eff === 1 ? "" : `,${atempoChain(eff)}`;
        aParts.push(`[ras${i}]${atrim},asetpts=PTS-STARTPTS${tail}[ra${i}]`);
      });
      aParts.push(`${segs.map((_, i) => `[ra${i}]`).join("")}concat=n=${segs.length}:v=0:a=1[A_OUT]`);
      agraph = aParts.join(";");
    }

    const dir = f < 1 ? t("slow", "spomalenie") : t("fast", "zrýchlenie");
    const T0 = Math.max(0, Math.min(start, D));
    const T1 = Math.max(T0, Math.min(start + dur, D));
    return {
      label: `⏩ ${f}× (${dir}) ${T0.toFixed(1)}–${T1.toFixed(1)} s`,
      graph,
      agraph,
    };
  },
});

export default function SpeedRampInfo() { return null; }
