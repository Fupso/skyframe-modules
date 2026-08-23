const t = window.React, p = t.useState, pe = t.useEffect, xe = t.useMemo, O = t.useRef;
t.useCallback;
const b = window.SkyFrame, r = b.t, ge = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], he = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }];
function T(n) {
  return n.split(/[\\/]/).pop() ?? n;
}
function f(n) {
  const E = Math.max(0, n), i = Math.floor(E / 3600), g = Math.floor(E % 3600 / 60), s = E % 60, y = `${i.toString().padStart(2, "0")}:${g.toString().padStart(2, "0")}:${Math.floor(s).toString().padStart(2, "0")}`, l = Math.round((s - Math.floor(s)) * 10);
  return l ? `${y}.${l}` : y;
}
function j(n) {
  const E = n.trim().split(":");
  if (E.length === 3) {
    const [g, s, y] = E.map(parseFloat);
    if ([g, s, y].every((l) => !isNaN(l))) return g * 3600 + s * 60 + y;
  } else if (E.length === 2) {
    const [g, s] = E.map(parseFloat);
    if (!isNaN(g) && !isNaN(s)) return g * 60 + s;
  }
  const i = parseFloat(n);
  return isNaN(i) ? 0 : i;
}
function fe() {
  return Math.random().toString(36).slice(2, 9);
}
const R = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];
function Ee() {
  var Y;
  const [n, E] = p(null), [i, g] = p(0), [s, y] = p(0), [l, M] = p([]), [I, Z] = p("copy"), [L, ee] = p(!1), [J, te] = p("cut"), [_, D] = p(""), [P, q] = p(!1), [S, V] = p(null), [H, ae] = p(!0), [C, w] = p([]), [K, re] = p([]), [X, k] = p(""), F = O(!1), B = O(null), A = O(null), h = (e) => re((a) => [...a.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), v = ((Y = n == null ? void 0 : n.info) == null ? void 0 : Y.duration) ?? 0, m = C.some((e) => e.status === "running"), G = xe(() => l.reduce((e, a) => e + (a.end - a.start), 0), [l]);
  pe(() => {
    b.invoke("get_last_output_dir").then((e) => {
      e && D(e);
    }).catch(() => {
    });
  }, []);
  const ne = async () => {
    const e = await b.pickFiles(ge, !1);
    if (!e || Array.isArray(e)) return;
    let a = null;
    try {
      a = await b.invoke("get_video_info", { path: e });
    } catch {
    }
    E({ path: e, info: a }), g(0), y((a == null ? void 0 : a.duration) ?? 0), M([]), w([]), k(""), h(`${r("loaded", "Načítané")}: ${T(e)}${a ? ` (${f(a.duration)}, ${a.width}×${a.height})` : ""}`);
  }, U = (e) => {
    const a = B.current;
    if (!a || v <= 0) return 0;
    const c = a.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e - c.left) / c.width)) * v;
  }, se = (e) => {
    if (!n || m) return;
    const a = U(e.clientX);
    Math.abs(a - i) <= Math.abs(a - s) ? g(Math.min(a, s - 0.1)) : y(Math.max(a, i + 0.1));
  }, W = (e) => (a) => {
    a.stopPropagation(), A.current = e;
    const c = (o) => {
      const d = U(o.clientX);
      A.current === "start" ? g((u) => Math.min(d, s - 0.1) >= 0 ? Math.min(d, s - 0.1) : u) : y((u) => Math.max(d, i + 0.1) <= v ? Math.max(d, i + 0.1) : u);
    }, x = () => {
      A.current = null, window.removeEventListener("pointermove", c), window.removeEventListener("pointerup", x);
    };
    window.addEventListener("pointermove", c), window.addEventListener("pointerup", x);
  }, oe = (e) => g(Math.max(0, Math.min(j(e), s - 0.1))), le = (e) => y(Math.min(v, Math.max(j(e), i + 0.1))), ce = () => {
    if (!(!n || s - i < 0.1)) {
      if (l.some((e) => Math.abs(e.start - i) < 0.5 && Math.abs(e.end - s) < 0.5)) {
        k(r("seg_exists", "Tento úsek už existuje."));
        return;
      }
      k(""), M((e) => [...e, { id: fe(), start: i, end: s }].sort((a, c) => a.start - c.start));
    }
  }, de = (e) => M((a) => a.filter((c) => c.id !== e)), Q = (e) => new Promise((a) => {
    let c;
    b.listenJob(e, (x) => {
      w((o) => o.map((d) => d.id === e ? x : d)), x.status !== "running" && (c == null || c(), a(x));
    }).then((x) => c = x);
  }), ie = async () => {
    if (!n || l.length === 0) return;
    k(""), F.current = !1;
    const e = J.trim() || "cut", a = _ || null, c = l.map((o, d) => `${e}_${d + 1}`);
    w(l.map((o, d) => ({
      id: `pending-${d}`,
      moduleId: b.moduleId,
      label: c[d],
      status: "running",
      progress: -1,
      message: r("queued", "Čaká v rade"),
      result: null
    }))), h(`${r("export_start", "Exportujem")} ${l.length} ${r("pieces", "dielov")}…`);
    const x = [];
    for (let o = 0; o < l.length && !F.current; o++) {
      const d = l[o];
      try {
        const u = await b.invoke("trim_video", {
          input: n.path,
          start: d.start,
          end: d.end,
          mode: I,
          outputName: c[o],
          outputDir: a,
          moduleId: b.moduleId
        });
        w(($) => {
          const z = [...$];
          return z[o] = { ...z[o], id: u, progress: 0, message: "" }, z;
        }), h(`▶ ${c[o]} (${f(d.start)} → ${f(d.end)})`);
        const N = await Q(u);
        if (N.status === "done" && N.result)
          x.push(N.result), h(`✓ ${N.result}`);
        else if (N.status === "error") {
          h(`✗ ${c[o]}: ${N.message}`), k(N.message);
          return;
        } else {
          h(`⊘ ${c[o]}`);
          return;
        }
      } catch (u) {
        k(String(u)), h(String(u));
        return;
      }
    }
    if (L && x.length > 0 && !F.current)
      try {
        const o = `${e}_merged`;
        w((N) => [...N, {
          id: "pending-merge",
          moduleId: b.moduleId,
          label: o,
          status: "running",
          progress: -1,
          message: r("queued", "Čaká v rade"),
          result: null
        }]);
        const d = await b.invoke("merge_videos", {
          files: x,
          outputName: o,
          music: P ? S : null,
          moduleId: b.moduleId,
          outputDir: a,
          loopMusic: H
        });
        w((N) => N.map(($) => $.id === "pending-merge" ? { ...$, id: d, progress: 0, message: "" } : $)), h(`▶ ${o} (${x.length} ${r("pieces", "dielov")})`);
        const u = await Q(d);
        u.status === "done" && u.result ? h(`✓ ${u.result}`) : u.status === "error" && (k(u.message), h(`✗ ${u.message}`));
      } catch (o) {
        k(String(o)), h(String(o));
      }
    h(r("export_done", "Export dokončený."));
  }, me = async () => {
    F.current = !0;
    for (const e of C) e.status === "running" && !e.id.startsWith("pending") && await b.cancelJob(e.id);
  }, ue = () => {
    w([]), M([]), E(null), V(null), q(!1), k("");
  }, be = b.PlayerShell;
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("video", "Video")), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ne,
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    n ? r("change_video", "Zmeniť video") : r("pick_video", "Vybrať video")
  )), n && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, T(n.path), " · ", f(v), n.info ? ` · ${n.info.width}×${n.info.height} · ${n.info.codec}` : ""), /* @__PURE__ */ t.createElement("div", { className: "rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(be, { src: n.path })), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement(
    "div",
    {
      ref: B,
      onClick: se,
      className: "relative h-10 bg-bg rounded-lg border border-border cursor-pointer select-none overflow-hidden"
    },
    l.map((e, a) => /* @__PURE__ */ t.createElement(
      "div",
      {
        key: e.id,
        className: `absolute top-0 bottom-0 opacity-40 ${R[a % R.length]}`,
        style: { left: `${e.start / v * 100}%`, width: `${(e.end - e.start) / v * 100}%` }
      }
    )),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 bg-accent/30 border-x-2 border-accent",
        style: { left: `${i / v * 100}%`, width: `${(s - i) / v * 100}%` }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: W("start"),
        className: "absolute top-0 bottom-0 w-3 bg-accent cursor-ew-resize rounded-l",
        style: { left: `calc(${i / v * 100}% - 4px)` }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: W("end"),
        className: "absolute top-0 bottom-0 w-3 bg-accent cursor-ew-resize rounded-r",
        style: { left: `calc(${s / v * 100}% - 4px)` }
      }
    )
  ), /* @__PURE__ */ t.createElement("p", { className: "mt-1.5 text-[11px] text-text-dim" }, r("timeline_hint", "Klikni na os alebo ťahaj značky. Zelené polia = už pridané úseky.")), /* @__PURE__ */ t.createElement("div", { className: "mt-3 flex flex-wrap items-end gap-3" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, r("start", "Začiatok")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: f(i),
      onChange: (e) => oe(e.target.value),
      disabled: m,
      className: "w-28 px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50"
    }
  )), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, r("end", "Koniec")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: f(s),
      onChange: (e) => le(e.target.value),
      disabled: m,
      className: "w-28 px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50"
    }
  )), /* @__PURE__ */ t.createElement("div", { className: "text-xs text-text-dim pb-2.5" }, r("length", "Dĺžka"), ": ", f(s - i)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ce,
      disabled: m || !n || s - i < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    r("add_cut", "Pridať úsek")
  ))))), l.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-3" }, r("segments", "Úseky"), " (", l.length, ") · ", f(G)), /* @__PURE__ */ t.createElement("div", { className: "space-y-1.5" }, l.map((e, a) => /* @__PURE__ */ t.createElement("div", { key: e.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: `w-2.5 h-2.5 rounded-full ${R[a % R.length]}` }), /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium" }, r("segment", "Úsek"), " ", a + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim" }, f(e.start), " → ", f(e.end)), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, "(", f(e.end - e.start), ")"), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => de(e.id),
      disabled: m,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "✕"
  ))))), l.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("cut_mode", "Režim strihu")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => Z("copy"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${I === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_copy", "Rýchly")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => Z("precise"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${I === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_precise", "Presný")
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, r("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame."))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: J,
      onChange: (e) => te(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_dir", "Výstupný priečinok")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await b.pickDirectory();
        e && D(e);
      },
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    _ ? r("change", "Zmeniť") : r("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, _ || r("default_output", "(predvolený priečinok)")), _ && /* @__PURE__ */ t.createElement("button", { onClick: () => D(""), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: L,
      onChange: (e) => ee(e.target.checked),
      disabled: m,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, r("merge_after", "Úseky aj spojiť do jedného súboru"))), L && /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2 pl-7" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: P,
      onChange: (e) => q(e.target.checked),
      disabled: m,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("music", "Hudba")), P && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await b.pickFiles(he, !1);
        e && !Array.isArray(e) && V(e);
      },
      disabled: m,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    S ? T(S) : r("pick_music", "Vybrať hudbu")
  ), S && /* @__PURE__ */ t.createElement("button", { onClick: () => V(null), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: H,
      onChange: (e) => ae(e.target.checked),
      disabled: m,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("loop_music", "Slučka"))))), X && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, X), l.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, C.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, C.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement("span", { className: `text-xs font-mono ${e.status === "error" ? "text-error" : e.status === "done" ? "text-success" : "text-text-dim"}` }, e.status === "running" ? e.progress >= 0 ? `${Math.round(e.progress)}%` : e.message || "…" : e.status === "done" ? "✓" : e.status === "cancelled" ? r("cancelled", "zrušené") : e.status === "error" ? r("error", "chyba") : e.message)), /* @__PURE__ */ t.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ t.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${e.status === "error" ? "bg-error" : e.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: e.status === "done" ? "100%" : `${Math.max(2, Math.min(100, e.progress))}%` }
    }
  ))))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: me,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    r("cancel_all", "Zrušiť všetko")
  ), !m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ue,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    r("new_cut", "Nové strihanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ie,
      disabled: m || !n,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    r("export", "Exportovať"),
    " (",
    l.length,
    " ",
    r("pieces", "dielov"),
    " · ",
    f(G),
    ")"
  )), K.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, r("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, K.map((e, a) => /* @__PURE__ */ t.createElement("div", { key: a }, e))))));
}
export {
  Ee as default
};
