const t = window.React, i = t.useState, le = t.useEffect, U = t.useMemo, ne = t.useRef;
t.useCallback;
const c = window.SkyFrame, r = c.t, ve = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], ke = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac"] }], oe = [
  { id: "youtube_4k", label: "YouTube 4K" },
  { id: "youtube_1080", label: "YouTube 1080p" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "email", label: "E-mail (malé)" },
  { id: "archive", label: r("preset_archive", "Archív (bezstratová)") }
];
function z(p) {
  return p.split(/[\\/]/).pop() ?? p;
}
function Ee(p) {
  const h = new Date(p);
  return isNaN(h.getTime()) ? "" : h.toLocaleString();
}
function ye() {
  const [p, h] = i(""), [b, w] = i([]), [x, I] = i([]), [Y, ce] = i([]), [_, L] = i("flights"), [f, q] = i("merged"), [$, G] = i(""), [C, P] = i(!1), [v, T] = i(null), [D, H] = i(!0), [S, W] = i(!1), [M, Q] = i("youtube_1080"), [A, V] = i(null), [k, X] = i(!1), [j, E] = i(""), [ee, de] = i([]), [R, y] = i([]), B = ne(!1), u = (e) => de((a) => [...a.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), [te, ae] = i(!1), F = ne(null);
  le(() => {
    c.invoke("find_media_folders").then((e) => {
      ce(e), e.length && u(r("sd_found", "Nájdené médiá") + `: ${e.length}`);
    }).catch(() => {
    }), (async () => {
      try {
        const e = await c.invoke("get_module_config", { id: c.moduleId }), a = e == null ? void 0 : e.session;
        if (a && ((a.mode === "all" || a.mode === "flights") && L(a.mode), a.outputName && q(a.outputName), P(!!a.musicEnabled), T(a.music ?? null), H(a.loopMusic !== !1), W(!!a.convertAfter), a.preset && Q(a.preset), Array.isArray(a.manual) && I(a.manual.filter((l) => typeof l == "string")), a.folder)) {
          h(a.folder), ae(!0), await Z(a.folder);
          return;
        }
      } catch {
      }
      ae(!0);
    })();
  }, []), le(() => {
    if (!(!te || k))
      return F.current && clearTimeout(F.current), F.current = setTimeout(() => {
        c.invoke("set_module_config", {
          id: c.moduleId,
          config: { session: { folder: p, manual: x, mode: _, outputName: f, musicEnabled: C, music: v, loopMusic: D, convertAfter: S, preset: M } }
        }).catch(() => {
        });
      }, 600), () => {
        F.current && clearTimeout(F.current);
      };
  }, [p, x, _, f, C, v, D, S, M, te, k]);
  const n = R.some((e) => e.status === "running"), J = U(
    () => b.filter((e) => e.checked).flatMap((e) => e.clips.filter((a) => a.checked).map((a) => a.path)),
    [b]
  ), O = U(
    () => [...J, ...x.filter((e) => !J.includes(e))],
    [J, x]
  ), ie = U(
    () => b.filter((e) => e.checked).reduce((e, a) => e + a.clips.filter((l) => l.checked).reduce((l, s) => l + s.size_mb, 0), 0),
    [b]
  ), Z = async (e) => {
    X(!0), E("");
    try {
      const a = await c.invoke("analyze_flights", { folder: e });
      let l = [];
      if (Array.isArray(a))
        l = a;
      else if (a && typeof a == "object" && Array.isArray(a.flights))
        l = a.flights;
      else
        throw u("DEBUG analyze_flights: " + JSON.stringify(a).slice(0, 200)), new Error(r("bad_response", "Neočakávaná odpoveď z core."));
      const s = l.map((o) => ({
        ...o,
        checked: !0,
        clips: (Array.isArray(o.clips) ? o.clips : []).map((d) => ({ ...d, checked: !0 }))
      }));
      w(s), u(`${r("scan_done", "Skenovanie dokončené")}: ${e} — ${s.length} ${r("flights", "letov")}`), s.length || u(r("no_videos", "V priečinku nie sú žiadne videá."));
    } catch (a) {
      E(String(a)), u(String(a));
    } finally {
      X(!1);
    }
  }, me = async () => {
    const e = await c.pickDirectory();
    e && (h(e), await Z(e));
  }, ue = async () => {
    const e = await c.pickFiles(ve, !0);
    if (!e) return;
    const a = Array.isArray(e) ? e : [e];
    I((l) => [...l, ...a.filter((s) => !l.includes(s))]), u(`${r("added_manual", "Pridané ručne")}: ${a.length}`);
  }, be = (e) => w((a) => a.map((l, s) => s === e ? { ...l, checked: !l.checked } : l)), pe = (e, a) => w((l) => l.map((s, o) => o === e ? { ...s, clips: s.clips.map((d, m) => m === a ? { ...d, checked: !d.checked } : d) } : s)), re = (e) => w((a) => a.map((l) => ({ ...l, checked: e, clips: l.clips.map((s) => ({ ...s, checked: e })) }))), se = (e) => new Promise((a) => {
    let l;
    c.listenJob(e, (s) => {
      y((o) => o.map((d) => d.id === e ? s : d)), s.status !== "running" && (l == null || l(), a(s));
    }).then((s) => l = s);
  }), xe = async () => {
    var l;
    E(""), B.current = !1;
    const e = [];
    if (_ === "flights" && b.some((s) => s.checked) ? (b.filter((s) => s.checked).forEach((s, o) => {
      const d = s.clips.filter((m) => m.checked).map((m) => m.path);
      d.length && e.push({ files: d, name: `${f}_flight${o + 1}` });
    }), e.push(...x.length ? [{ files: x, name: `${f}_manual` }] : [])) : e.push({ files: O, name: f }), !e.length || e.every((s) => s.files.length < 1)) {
      E(r("nothing_selected", "Nie je vybrané žiadne video."));
      return;
    }
    u(`${r("start_log", "Spúšťam")} ${e.length} ${r("jobs_word", "úloh")}…`);
    const a = e.map((s, o) => ({
      id: `pending-${o}`,
      moduleId: c.moduleId,
      label: s.name,
      status: "running",
      progress: -1,
      message: r("queued", "Čaká v rade"),
      result: null
    }));
    y(a);
    for (let s = 0; s < e.length && !B.current; s++) {
      const o = e[s];
      try {
        const d = await c.invoke("merge_videos", {
          files: o.files,
          outputName: o.name,
          music: C ? v : null,
          moduleId: c.moduleId,
          outputDir: $ || null,
          loopMusic: D
        });
        y((g) => {
          const N = [...g];
          return N[s] = { ...N[s], id: d, progress: 0, message: "" }, N;
        }), u(`▶ ${o.name} (${o.files.length} ${r("videos_count", "videí")})`);
        const m = await se(d);
        if (m.status === "done" && m.result) {
          if (u(`✓ ${m.result}`), S) {
            u(`${r("converting", "Konvertujem")}: ${(l = oe.find((K) => K.id === M)) == null ? void 0 : l.label}`);
            const g = await c.invoke("convert_video", {
              input: m.result,
              preset: M,
              moduleId: c.moduleId,
              outputDir: $ || null
            });
            y((K) => [...K, {
              id: g,
              moduleId: c.moduleId,
              label: `convert: ${z(m.result)}`,
              status: "running",
              progress: 0,
              message: "",
              result: null
            }]);
            const N = await se(g);
            N.status === "done" && u(`✓ ${N.result}`);
          }
        } else if (m.status === "error")
          u(`✗ ${o.name}: ${m.message}`);
        else if (m.status === "cancelled") {
          u(`⊘ ${o.name}: ${r("cancelled", "zrušené")}`);
          break;
        }
      } catch (d) {
        E(String(d)), u(String(d)), y((m) => {
          const g = [...m];
          return g[s] = { ...g[s], status: "error", message: String(d) }, g;
        });
      }
    }
    u(r("finished_log", "Spracovanie ukončené."));
  }, ge = async () => {
    B.current = !0;
    for (const e of R) e.status === "running" && !e.id.startsWith("pending") && await c.cancelJob(e.id);
  }, he = () => {
    y([]), w([]), I([]), T(null), P(!1), V(null), E("");
  }, fe = c.PlayerShell;
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-4" }, r("source", "Zdroj videí")), /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: me,
      disabled: k || n,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    k ? r("loading", "Načítavam…") : r("scan_folder", "Vybrať priečinok a skenovať")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ue,
      disabled: n,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    r("add_videos", "Pridať videá ručne")
  ), b.length > 0 && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => re(!0),
      disabled: n,
      className: "px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
    },
    r("check_all", "Vybrať všetko")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => re(!1),
      disabled: n,
      className: "px-3 py-2.5 rounded-xl text-xs font-medium text-text-dim border border-border hover:bg-bg-card-hover"
    },
    r("uncheck_all", "Zrušiť výber")
  ))), Y.length > 0 && !b.length && /* @__PURE__ */ t.createElement("div", { className: "mt-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, r("sd_cards", "Nájdené médiá (SD karty)")), /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap gap-2" }, Y.map((e) => /* @__PURE__ */ t.createElement(
    "button",
    {
      key: e.path,
      onClick: () => {
        h(e.path), Z(e.path);
      },
      disabled: k || n,
      className: "px-3 py-2 rounded-xl text-xs font-mono bg-bg border border-border hover:border-accent/40 transition-colors disabled:opacity-50"
    },
    e.path,
    " ",
    /* @__PURE__ */ t.createElement("span", { className: "text-accent" }, "(", e.mp4_count, " mp4)")
  )))), p && /* @__PURE__ */ t.createElement("p", { className: "mt-3 text-xs font-mono text-text-dim break-all" }, p), b.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "mt-4 space-y-3" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider" }, r("flights", "Lety"), " (", b.length, ") · ", ie.toFixed(0), " MB"), b.map((e, a) => /* @__PURE__ */ t.createElement("div", { key: a, className: "rounded-xl border border-border bg-bg overflow-hidden" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 p-3 cursor-pointer hover:bg-bg-card-hover/50" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: e.checked,
      onChange: () => be(a),
      disabled: n,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "font-medium text-sm" }, r("flight", "Let"), " ", a + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, e.clips.length, " ", r("videos_count", "videí"), " · ", e.total_mb.toFixed(0), " MB"), /* @__PURE__ */ t.createElement("span", { className: "ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent" }, e.split_reason)), /* @__PURE__ */ t.createElement("div", { className: "border-t border-border divide-y divide-border" }, e.clips.map((l, s) => /* @__PURE__ */ t.createElement("div", { key: s, className: "flex items-center gap-3 px-3 py-2 pl-9" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: l.checked,
      onChange: () => pe(a, s),
      disabled: n || !e.checked,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "flex-1 text-xs truncate", title: l.path }, z(l.path)), /* @__PURE__ */ t.createElement("span", { className: "text-[10px] text-text-dim font-mono" }, l.size_mb.toFixed(0), " MB"), /* @__PURE__ */ t.createElement("span", { className: "text-[10px] text-text-dim" }, Ee(l.time)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => V(A === l.path ? null : l.path),
      className: `text-[10px] px-2 py-1 rounded border transition-colors ${A === l.path ? "bg-accent text-white border-accent" : "text-text-dim border-border hover:border-accent/40"}`
    },
    r("preview", "Náhľad")
  ))))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "mt-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, r("manual_videos", "Ručne pridané"), " (", x.length, ")"), /* @__PURE__ */ t.createElement("div", { className: "space-y-1" }, x.map((e, a) => /* @__PURE__ */ t.createElement("div", { key: e, className: "flex items-center gap-2 px-3 py-1.5 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: "flex-1 text-xs truncate" }, z(e)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => V(A === e ? null : e),
      className: "text-[10px] px-2 py-1 rounded text-text-dim border border-border hover:border-accent/40"
    },
    r("preview", "Náhľad")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => I((l) => l.filter((s, o) => o !== a)),
      disabled: n,
      className: "text-[10px] px-2 py-1 rounded text-error hover:bg-error/10"
    },
    "✕"
  ))))), A && /* @__PURE__ */ t.createElement("div", { className: "mt-4 rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(fe, { src: A }))), /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-3" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: C,
      onChange: (e) => P(e.target.checked),
      disabled: n,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("music", "Hudba na pozadí"))), C && /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await c.pickFiles(ke, !1);
        e && !Array.isArray(e) && T(e);
      },
      disabled: n,
      className: "px-4 py-2 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    v ? z(v) : r("pick_music", "Vybrať hudobný súbor")
  ), v && /* @__PURE__ */ t.createElement("button", { onClick: () => T(null), disabled: n, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-sm text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: D,
      onChange: (e) => H(e.target.checked),
      disabled: n,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("loop_music", "Opakovať hudbu (slučka)")))), /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("merge_mode", "Režim spájania")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => L("flights"),
      disabled: n,
      className: `flex-1 px-3 py-2.5 text-sm ${_ === "flights" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_flights", "Podľa letov")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => L("all"),
      disabled: n,
      className: `flex-1 px-3 py-2.5 text-sm ${_ === "all" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_all", "Všetko do jedného")
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "text",
      value: f,
      onChange: (e) => q(e.target.value),
      disabled: n,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_dir", "Výstupný priečinok (voliteľné)")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await c.pickDirectory();
        e && G(e);
      },
      disabled: n,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    $ ? r("change", "Zmeniť") : r("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, $ || r("default_output", "(predvolený priečinok aplikácie)")), $ && /* @__PURE__ */ t.createElement("button", { onClick: () => G(""), disabled: n, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer pt-1" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: S,
      onChange: (e) => W(e.target.checked),
      disabled: n,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, r("convert_after", "Po spojení konvertovať")), S && /* @__PURE__ */ t.createElement(
    "select",
    {
      value: M,
      onChange: (e) => Q(e.target.value),
      disabled: n,
      className: "ml-2 px-3 py-1.5 bg-bg rounded-lg border border-border text-sm text-text outline-none"
    },
    oe.map((e) => /* @__PURE__ */ t.createElement("option", { key: e.id, value: e.id }, e.label))
  ))), j && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, j), /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, R.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, R.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement("span", { className: `text-xs font-mono ${e.status === "error" ? "text-error" : e.status === "done" ? "text-success" : "text-text-dim"}` }, e.status === "running" ? e.progress >= 0 ? `${Math.round(e.progress)}%` : e.message || "…" : e.status === "done" ? "✓" : e.status === "cancelled" ? r("cancelled", "zrušené") : e.status === "error" ? r("error", "chyba") : e.message)), /* @__PURE__ */ t.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ t.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${e.status === "error" ? "bg-error" : e.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: e.status === "done" ? "100%" : `${Math.max(2, Math.min(100, e.progress))}%` }
    }
  )), e.result && /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] font-mono text-text-dim break-all" }, e.result)))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, n && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ge,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    r("cancel_all", "Zrušiť všetko")
  ), !n && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: he,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    r("new_merge", "Nové spájanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: xe,
      disabled: O.length < 1 || k,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    r("start_merge", "Spustiť spracovanie"),
    " (",
    O.length,
    " ",
    r("videos_count", "videí"),
    ")"
  )), ee.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, r("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, ee.map((e, a) => /* @__PURE__ */ t.createElement("div", { key: a }, e))))));
}
export {
  ye as default
};
