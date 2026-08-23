const t = window.React, d = t.useState, pe = t.useEffect, B = t.useMemo, xe = t.useRef;
t.useCallback;
const m = window.SkyFrame, a = m.t, ge = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], he = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }], X = [
  { id: "youtube_4k", label: "YouTube 4K" },
  { id: "youtube_1080", label: "YouTube 1080p" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "email", label: "E-mail (malé)" },
  { id: "archive", label: a("preset_archive", "Archív (bezstratová)") }
];
function S(x) {
  return x.split(/[\\/]/).pop() ?? x;
}
function fe(x) {
  const k = new Date(x);
  return isNaN(k.getTime()) ? "" : k.toLocaleString();
}
function ve() {
  const [x, k] = d(""), [b, E] = d([]), [g, M] = d([]), [J, j] = d([]), [F, O] = d("flights"), [w, ee] = d("merged"), [N, Z] = d(""), [A, K] = d(!1), [_, I] = d(null), [U, te] = d(!0), [D, ae] = d(!1), [z, re] = d("youtube_1080"), [y, L] = d(null), [$, Y] = d(!1), [q, h] = d(""), [G, se] = d([]), [C, f] = d([]), P = xe(!1), u = (e) => se((s) => [...s.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]);
  pe(() => {
    m.invoke("find_media_folders").then((e) => {
      j(e), e.length && u(a("sd_found", "Nájdené médiá") + `: ${e.length}`);
    }).catch(() => {
    });
  }, []);
  const n = C.some((e) => e.status === "running"), R = B(
    () => b.filter((e) => e.checked).flatMap((e) => e.clips.filter((s) => s.checked).map((s) => s.path)),
    [b]
  ), T = B(
    () => [...R, ...g.filter((e) => !R.includes(e))],
    [R, g]
  ), le = B(
    () => b.filter((e) => e.checked).reduce((e, s) => e + s.clips.filter((l) => l.checked).reduce((l, r) => l + r.size_mb, 0), 0),
    [b]
  ), H = async (e) => {
    Y(!0), h("");
    try {
      const s = await m.invoke("analyze_flights", { folder: e });
      let l = [];
      if (Array.isArray(s))
        l = s;
      else if (s && typeof s == "object" && Array.isArray(s.flights))
        l = s.flights;
      else
        throw u("DEBUG analyze_flights: " + JSON.stringify(s).slice(0, 200)), new Error(a("bad_response", "Neočakávaná odpoveď z core."));
      const r = l.map((o) => ({
        ...o,
        checked: !0,
        clips: (Array.isArray(o.clips) ? o.clips : []).map((c) => ({ ...c, checked: !0 }))
      }));
      E(r), u(`${a("scan_done", "Skenovanie dokončené")}: ${e} — ${r.length} ${a("flights", "letov")}`), r.length || u(a("no_videos", "V priečinku nie sú žiadne videá."));
    } catch (s) {
      h(String(s)), u(String(s));
    } finally {
      Y(!1);
    }
  }, ne = async () => {
    const e = await m.pickDirectory();
    e && (k(e), await H(e));
  }, oe = async () => {
    const e = await m.pickFiles(ge, !0);
    if (!e) return;
    const s = Array.isArray(e) ? e : [e];
    M((l) => [...l, ...s.filter((r) => !l.includes(r))]), u(`${a("added_manual", "Pridané ručne")}: ${s.length}`);
  }, ce = (e) => E((s) => s.map((l, r) => r === e ? { ...l, checked: !l.checked } : l)), de = (e, s) => E((l) => l.map((r, o) => o === e ? { ...r, clips: r.clips.map((c, i) => i === s ? { ...c, checked: !c.checked } : c) } : r)), W = (e) => E((s) => s.map((l) => ({ ...l, checked: e, clips: l.clips.map((r) => ({ ...r, checked: e })) }))), Q = (e) => new Promise((s) => {
    let l;
    m.listenJob(e, (r) => {
      f((o) => o.map((c) => c.id === e ? r : c)), r.status !== "running" && (l == null || l(), s(r));
    }).then((r) => l = r);
  }), ie = async () => {
    var l;
    h(""), P.current = !1;
    const e = [];
    if (F === "flights" && b.some((r) => r.checked) ? (b.filter((r) => r.checked).forEach((r, o) => {
      const c = r.clips.filter((i) => i.checked).map((i) => i.path);
      c.length && e.push({ files: c, name: `${w}_flight${o + 1}` });
    }), e.push(...g.length ? [{ files: g, name: `${w}_manual` }] : [])) : e.push({ files: T, name: w }), !e.length || e.every((r) => r.files.length < 1)) {
      h(a("nothing_selected", "Nie je vybrané žiadne video."));
      return;
    }
    u(`${a("start_log", "Spúšťam")} ${e.length} ${a("jobs_word", "úloh")}…`);
    const s = e.map((r, o) => ({
      id: `pending-${o}`,
      moduleId: m.moduleId,
      label: r.name,
      status: "running",
      progress: -1,
      message: a("queued", "Čaká v rade"),
      result: null
    }));
    f(s);
    for (let r = 0; r < e.length && !P.current; r++) {
      const o = e[r];
      try {
        const c = await m.invoke("merge_videos", {
          files: o.files,
          outputName: o.name,
          music: A ? _ : null,
          moduleId: m.moduleId,
          outputDir: N || null,
          loopMusic: U
        });
        f((p) => {
          const v = [...p];
          return v[r] = { ...v[r], id: c, progress: 0, message: "" }, v;
        }), u(`▶ ${o.name} (${o.files.length} ${a("videos_count", "videí")})`);
        const i = await Q(c);
        if (i.status === "done" && i.result) {
          if (u(`✓ ${i.result}`), D) {
            u(`${a("converting", "Konvertujem")}: ${(l = X.find((V) => V.id === z)) == null ? void 0 : l.label}`);
            const p = await m.invoke("convert_video", {
              input: i.result,
              preset: z,
              moduleId: m.moduleId,
              outputDir: N || null
            });
            f((V) => [...V, {
              id: p,
              moduleId: m.moduleId,
              label: `convert: ${S(i.result)}`,
              status: "running",
              progress: 0,
              message: "",
              result: null
            }]);
            const v = await Q(p);
            v.status === "done" && u(`✓ ${v.result}`);
          }
        } else if (i.status === "error")
          u(`✗ ${o.name}: ${i.message}`);
        else if (i.status === "cancelled") {
          u(`⊘ ${o.name}: ${a("cancelled", "zrušené")}`);
          break;
        }
      } catch (c) {
        h(String(c)), u(String(c)), f((i) => {
          const p = [...i];
          return p[r] = { ...p[r], status: "error", message: String(c) }, p;
        });
      }
    }
    u(a("finished_log", "Spracovanie ukončené."));
  }, me = async () => {
    P.current = !0;
    for (const e of C) e.status === "running" && !e.id.startsWith("pending") && await m.cancelJob(e.id);
  }, ue = () => {
    f([]), E([]), M([]), I(null), K(!1), L(null), h("");
  }, be = m.PlayerShell;
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-4" }, a("source", "Zdroj videí")), /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ne,
      disabled: $ || n,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    $ ? a("loading", "Načítavam…") : a("scan_folder", "Vybrať priečinok a skenovať")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: oe,
      disabled: n,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    a("add_videos", "Pridať videá ručne")
  ), b.length > 0 && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => W(!0),
      disabled: n,
      className: "px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
    },
    a("check_all", "Vybrať všetko")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => W(!1),
      disabled: n,
      className: "px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
    },
    a("uncheck_all", "Zrušiť výber")
  ))), J.length > 0 && !b.length && /* @__PURE__ */ t.createElement("div", { className: "mt-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, a("sd_cards", "Nájdené médiá (SD karty)")), /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap gap-2" }, J.map((e) => /* @__PURE__ */ t.createElement(
    "button",
    {
      key: e.path,
      onClick: () => {
        k(e.path), H(e.path);
      },
      disabled: $ || n,
      className: "px-3 py-2 rounded-xl text-xs font-mono bg-bg border border-border hover:border-accent/40 transition-colors disabled:opacity-50"
    },
    e.path,
    " ",
    /* @__PURE__ */ t.createElement("span", { className: "text-accent" }, "(", e.mp4_count, " mp4)")
  )))), x && /* @__PURE__ */ t.createElement("p", { className: "mt-3 text-xs font-mono text-text-dim break-all" }, x), b.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "mt-4 space-y-3" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, a("flights", "Lety"), " (", b.length, ") · ", le.toFixed(0), " MB"), b.map((e, s) => /* @__PURE__ */ t.createElement("div", { key: s, className: "rounded-xl border border-border bg-bg overflow-hidden" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 p-3 cursor-pointer hover:bg-bg-card-hover/50" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: e.checked,
      onChange: () => ce(s),
      disabled: n,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "font-medium text-sm" }, a("flight", "Let"), " ", s + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, e.clips.length, " ", a("videos_count", "videí"), " · ", e.total_mb.toFixed(0), " MB"), /* @__PURE__ */ t.createElement("span", { className: "ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent" }, e.split_reason)), /* @__PURE__ */ t.createElement("div", { className: "border-t border-border divide-y divide-border" }, e.clips.map((l, r) => /* @__PURE__ */ t.createElement("div", { key: r, className: "flex items-center gap-3 px-3 py-2 pl-9" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: l.checked,
      onChange: () => de(s, r),
      disabled: n || !e.checked,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "flex-1 text-xs truncate", title: l.path }, S(l.path)), /* @__PURE__ */ t.createElement("span", { className: "text-[10px] text-text-dim font-mono" }, l.size_mb.toFixed(0), " MB"), /* @__PURE__ */ t.createElement("span", { className: "text-[10px] text-text-dim" }, fe(l.time)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => L(y === l.path ? null : l.path),
      className: `text-[10px] px-2 py-1 rounded border transition-colors ${y === l.path ? "bg-accent text-white border-accent" : "text-text-dim border-border hover:border-accent/40"}`
    },
    a("preview", "Náhľad")
  ))))))), g.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "mt-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, a("manual_videos", "Ručne pridané"), " (", g.length, ")"), /* @__PURE__ */ t.createElement("div", { className: "space-y-1" }, g.map((e, s) => /* @__PURE__ */ t.createElement("div", { key: e, className: "flex items-center gap-2 px-3 py-1.5 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: "flex-1 text-xs truncate" }, S(e)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => L(y === e ? null : e),
      className: "text-[10px] px-2 py-1 rounded text-text-dim border border-border hover:border-accent/40"
    },
    a("preview", "Náhľad")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => M((l) => l.filter((r, o) => o !== s)),
      disabled: n,
      className: "text-[10px] px-2 py-1 rounded text-error hover:bg-error/10"
    },
    "✕"
  ))))), y && /* @__PURE__ */ t.createElement("div", { className: "mt-4 rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(be, { src: y }))), /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-3" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: A,
      onChange: (e) => K(e.target.checked),
      disabled: n,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, a("music", "Hudba na pozadí"))), A && /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await m.pickFiles(he, !1);
        e && !Array.isArray(e) && I(e);
      },
      disabled: n,
      className: "px-4 py-2 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    _ ? S(_) : a("pick_music", "Vybrať hudobný súbor")
  ), _ && /* @__PURE__ */ t.createElement("button", { onClick: () => I(null), disabled: n, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-sm text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: U,
      onChange: (e) => te(e.target.checked),
      disabled: n,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), a("loop_music", "Opakovať hudbu (slučka)")))), /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, a("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("merge_mode", "Režim spájania")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => O("flights"),
      disabled: n,
      className: `flex-1 px-3 py-2.5 text-sm ${F === "flights" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    a("mode_flights", "Podľa letov")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => O("all"),
      disabled: n,
      className: `flex-1 px-3 py-2.5 text-sm ${F === "all" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    a("mode_all", "Všetko do jedného")
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "text",
      value: w,
      onChange: (e) => ee(e.target.value),
      disabled: n,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("output_dir", "Výstupný priečinok (voliteľné)")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await m.pickDirectory();
        e && Z(e);
      },
      disabled: n,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    N ? a("change", "Zmeniť") : a("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, N || a("default_output", "(predvolený priečinok aplikácie)")), N && /* @__PURE__ */ t.createElement("button", { onClick: () => Z(""), disabled: n, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer pt-1" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: D,
      onChange: (e) => ae(e.target.checked),
      disabled: n,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, a("convert_after", "Po spojení konvertovať")), D && /* @__PURE__ */ t.createElement(
    "select",
    {
      value: z,
      onChange: (e) => re(e.target.value),
      disabled: n,
      className: "ml-2 px-3 py-1.5 bg-bg rounded-lg border border-border text-sm text-text outline-none"
    },
    X.map((e) => /* @__PURE__ */ t.createElement("option", { key: e.id, value: e.id }, e.label))
  ))), q && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, q), /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, C.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, C.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement("span", { className: `text-xs font-mono ${e.status === "error" ? "text-error" : e.status === "done" ? "text-success" : "text-text-dim"}` }, e.status === "running" ? e.progress >= 0 ? `${Math.round(e.progress)}%` : e.message || "…" : e.status === "done" ? "✓" : e.status === "cancelled" ? a("cancelled", "zrušené") : e.status === "error" ? a("error", "chyba") : e.message)), /* @__PURE__ */ t.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ t.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${e.status === "error" ? "bg-error" : e.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: e.status === "done" ? "100%" : `${Math.max(2, Math.min(100, e.progress))}%` }
    }
  )), e.result && /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] font-mono text-text-dim break-all" }, e.result)))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, n && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: me,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    a("cancel_all", "Zrušiť všetko")
  ), !n && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ue,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    a("new_merge", "Nové spájanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ie,
      disabled: T.length < 1 || $,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    a("start_merge", "Spustiť spracovanie"),
    " (",
    T.length,
    " ",
    a("videos_count", "videí"),
    ")"
  )), G.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, a("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, G.map((e, s) => /* @__PURE__ */ t.createElement("div", { key: s }, e))))));
}
export {
  ve as default
};
