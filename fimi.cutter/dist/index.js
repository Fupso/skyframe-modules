const t = window.React;
t.useState;
t.useEffect;
t.useMemo;
t.useRef;
t.useCallback;
const f = window.SkyFrame, a = (n, v) => f.t(n, v), { useState: h, useEffect: pe, useMemo: Le, useRef: S } = window.React, Re = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], Fe = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }], D = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"], W = 16;
function Z(n) {
  return n.split(/[\\/]/).pop() ?? n;
}
function y(n) {
  const v = Math.max(0, n), u = Math.floor(v / 3600), E = Math.floor(v % 3600 / 60), c = v % 60, k = `${u.toString().padStart(2, "0")}:${E.toString().padStart(2, "0")}:${Math.floor(c).toString().padStart(2, "0")}`, i = Math.round((c - Math.floor(c)) * 10);
  return i ? `${k}.${i}` : k;
}
function xe(n) {
  const v = n.trim().split(":");
  if (v.length === 3) {
    const [E, c, k] = v.map(parseFloat);
    if ([E, c, k].every((i) => !isNaN(i))) return E * 3600 + c * 60 + k;
  } else if (v.length === 2) {
    const [E, c] = v.map(parseFloat);
    if (!isNaN(E) && !isNaN(c)) return E * 60 + c;
  }
  const u = parseFloat(n);
  return isNaN(u) ? 0 : u;
}
function De() {
  return Math.random().toString(36).slice(2, 9);
}
function Te() {
  var le;
  const [n, v] = h(null), [u, E] = h(0), [c, k] = h(0), [i, _] = h([]), [T, K] = h("copy"), [V, ge] = h(!1), [P, X] = h(!1), [C, A] = h(null), [G, fe] = h(!0), [Q, he] = h("cut"), [I, z] = h(""), [L, M] = h([]), [Y, ve] = h([]), [j, $] = h(""), R = S(!1), ee = S(null), O = S(null), te = S(null), B = S(null), N = (e) => ve((r) => [...r.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), p = ((le = n == null ? void 0 : n.info) == null ? void 0 : le.duration) ?? 0, b = L.some((e) => e.status === "running"), re = Le(() => i.reduce((e, r) => e + (r.end - r.start), 0), [i]);
  pe(() => {
    f.invoke("get_last_output_dir").then((e) => {
      e && z(e);
    }).catch(() => {
    });
  }, []);
  const ae = (e) => {
    var o;
    const r = (o = O.current) == null ? void 0 : o.querySelector("video");
    if (r)
      try {
        r.pause(), r.currentTime = Math.max(0, Math.min(p || r.duration || e, e));
      } catch {
      }
  };
  pe(() => {
    if (!n || p <= 0) return;
    let e = !1, r = null, o = null;
    const x = (s) => {
      const l = te.current;
      if (!l || e) return;
      const m = 960, d = 56;
      l.width = m, l.height = d;
      const w = l.getContext("2d");
      if (!w) return;
      w.fillStyle = "#000", w.fillRect(0, 0, m, d);
      const g = document.createElement("video");
      g.muted = !0, g.preload = "auto";
      const H = m / W, ce = (F) => {
        if (e || F >= W) return;
        const Ie = Math.min(Math.max(0.05, (F + 0.5) / W * p), Math.max(0.05, p - 0.05));
        let de = !1;
        const q = () => {
          if (!de) {
            de = !0, g.removeEventListener("seeked", ie);
            try {
              const J = g.videoWidth, U = g.videoHeight;
              if (J && U && !e) {
                const me = Math.max(H / J, d / U), ue = J * me, be = U * me;
                w.drawImage(g, F * H + (H - ue) / 2, (d - be) / 2, ue, be);
              }
            } catch {
            }
            ce(F + 1);
          }
        }, ie = () => q();
        g.addEventListener("seeked", ie), setTimeout(q, 900);
        try {
          g.currentTime = Ie;
        } catch {
          q();
        }
      };
      g.addEventListener("loadeddata", () => ce(0)), g.addEventListener("error", () => {
      }), g.src = s;
    };
    return r = setInterval(() => {
      var l;
      if (e) {
        r && clearInterval(r);
        return;
      }
      const s = (l = O.current) == null ? void 0 : l.querySelector("video");
      s && s.src && (r && clearInterval(r), x(s.src));
    }, 500), o = setTimeout(() => {
      r && clearInterval(r);
    }, 3e4), () => {
      e = !0, r && clearInterval(r), o && clearTimeout(o);
    };
  }, [n == null ? void 0 : n.path, p]);
  const Ee = async () => {
    const e = await f.pickFiles(Re, !1);
    if (!e || Array.isArray(e)) return;
    let r = null;
    try {
      r = await f.invoke("get_video_info", { path: e });
    } catch {
    }
    v({ path: e, info: r }), E(0), k((r == null ? void 0 : r.duration) ?? 0), _([]), M([]), $(""), N(`${a("loaded", "Načítané")}: ${Z(e)}${r ? ` (${y(r.duration)}, ${r.width}×${r.height})` : ""}`);
  }, ne = (e) => {
    const r = ee.current;
    if (!r || p <= 0) return 0;
    const o = r.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e - o.left) / o.width)) * p;
  }, Ne = (e) => {
    if (!n || b) return;
    const r = ne(e.clientX);
    Math.abs(r - u) <= Math.abs(r - c) ? E(Math.min(r, c - 0.1)) : k(Math.max(r, u + 0.1)), ae(r);
  }, se = (e) => (r) => {
    r.stopPropagation(), r.preventDefault(), B.current = e;
    const o = (s) => {
      const l = ne(s.clientX);
      B.current === "start" ? E((m) => {
        const d = Math.min(l, c - 0.1);
        return d >= 0 ? d : m;
      }) : k((m) => {
        const d = Math.max(l, u + 0.1);
        return d <= p ? d : m;
      }), ae(l);
    }, x = () => {
      B.current = null, window.removeEventListener("pointermove", o), window.removeEventListener("pointerup", x);
    };
    window.addEventListener("pointermove", o), window.addEventListener("pointerup", x);
  }, ye = (e) => E(Math.max(0, Math.min(xe(e), c - 0.1))), ke = (e) => k(Math.min(p, Math.max(xe(e), u + 0.1))), we = () => {
    if (!(!n || c - u < 0.1)) {
      if (i.some((e) => Math.abs(e.start - u) < 0.5 && Math.abs(e.end - c) < 0.5)) {
        $(a("seg_exists", "Tento úsek už existuje."));
        return;
      }
      $(""), _((e) => [...e, { id: De(), start: u, end: c }].sort((r, o) => r.start - o.start));
    }
  }, $e = (e) => _((r) => r.filter((o) => o.id !== e)), oe = (e) => new Promise((r) => {
    let o;
    f.listenJob(e, (x) => {
      M((s) => s.map((l) => l.id === e ? x : l)), x.status !== "running" && (o == null || o(), r(x));
    }).then((x) => {
      o = x;
    });
  }), Me = async () => {
    if (!n || i.length === 0) return;
    $(""), R.current = !1;
    const e = Q.trim() || "cut", r = I || null, o = i.map((s, l) => `${e}_${l + 1}`);
    M(
      i.map((s, l) => ({
        id: `pending-${l}`,
        moduleId: f.moduleId,
        label: o[l],
        status: "running",
        progress: -1,
        message: a("queued", "Čaká v rade"),
        result: null
      }))
    ), N(`${a("export_start", "Exportujem")} ${i.length} ${a("pieces", "dielov")}…`);
    const x = [];
    for (let s = 0; s < i.length && !R.current; s++) {
      const l = i[s];
      try {
        const m = await f.invoke("trim_video", {
          input: n.path,
          start: l.start,
          end: l.end,
          mode: T,
          outputName: o[s],
          outputDir: r,
          moduleId: f.moduleId
        });
        M((w) => {
          const g = [...w];
          return g[s] = { ...g[s], id: m, progress: 0, message: "" }, g;
        }), N(`▶ ${o[s]} (${y(l.start)} → ${y(l.end)})`);
        const d = await oe(m);
        if (d.status === "done" && d.result)
          x.push(d.result), N(`✓ ${d.result}`);
        else if (d.status === "error") {
          N(`✗ ${o[s]}: ${d.message}`), $(d.message);
          return;
        } else {
          N(`⊘ ${o[s]}`);
          return;
        }
      } catch (m) {
        $(String(m)), N(String(m));
        return;
      }
    }
    if (V && x.length > 0 && !R.current)
      try {
        const s = `${e}_merged`;
        M((d) => [
          ...d,
          {
            id: "pending-merge",
            moduleId: f.moduleId,
            label: s,
            status: "running",
            progress: -1,
            message: a("queued", "Čaká v rade"),
            result: null
          }
        ]);
        const l = await f.invoke("merge_videos", {
          files: x,
          outputName: s,
          music: P ? C : null,
          moduleId: f.moduleId,
          outputDir: r,
          loopMusic: G
        });
        M((d) => d.map((w) => w.id === "pending-merge" ? { ...w, id: l, progress: 0, message: "" } : w)), N(`▶ ${s} (${x.length} ${a("pieces", "dielov")})`);
        const m = await oe(l);
        m.status === "done" && m.result ? N(`✓ ${m.result}`) : m.status === "error" && ($(m.message), N(`✗ ${m.message}`));
      } catch (s) {
        $(String(s)), N(String(s));
      }
    N(a("export_done", "Export dokončený."));
  }, Se = async () => {
    R.current = !0;
    for (const e of L)
      e.status === "running" && !e.id.startsWith("pending") && await f.cancelJob(e.id);
  }, _e = () => {
    M([]), _([]), v(null), A(null), X(!1), $("");
  }, Ce = f.PlayerShell;
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, a("video", "Video")), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ee,
      disabled: b,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    n ? a("change_video", "Zmeniť video") : a("pick_video", "Vybrať video")
  )), n && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, Z(n.path), " · ", y(p), n.info ? ` · ${n.info.width}×${n.info.height} · ${n.info.codec}` : ""), /* @__PURE__ */ t.createElement("div", { ref: O, className: "rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(Ce, { src: n.path })), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("div", { className: "relative" }, /* @__PURE__ */ t.createElement(
    "canvas",
    {
      ref: te,
      className: "block w-full h-14 rounded-lg border border-border bg-black"
    }
  ), /* @__PURE__ */ t.createElement(
    "div",
    {
      ref: ee,
      onClick: Ne,
      className: "absolute inset-0 cursor-pointer select-none"
    },
    i.map((e, r) => /* @__PURE__ */ t.createElement(
      "div",
      {
        key: e.id,
        className: `absolute top-0 bottom-0 opacity-40 ${D[r % D.length]}`,
        style: { left: `${e.start / p * 100}%`, width: `${(e.end - e.start) / p * 100}%` }
      }
    )),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 bg-accent/30 border-x-2 border-accent",
        style: { left: `${u / p * 100}%`, width: `${(c - u) / p * 100}%` }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: se("start"),
        className: "absolute top-0 bottom-0 w-3 bg-accent cursor-ew-resize rounded-l",
        style: { left: `calc(${u / p * 100}% - 4px)` }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: se("end"),
        className: "absolute top-0 bottom-0 w-3 bg-accent cursor-ew-resize rounded-r",
        style: { left: `calc(${c / p * 100}% - 4px)` }
      }
    )
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, a("timeline_hint", "Klikni na os alebo ťahaj značky — prehrávač ukáže daný čas.")), /* @__PURE__ */ t.createElement("div", { className: "mt-3 grid grid-cols-3 gap-3 items-end" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, a("start", "Štart")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: y(u),
      key: `s-${u.toFixed(2)}`,
      onBlur: (e) => ye(e.target.value),
      disabled: b,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, a("end", "Koniec")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: y(c),
      key: `e-${c.toFixed(2)}`,
      onBlur: (e) => ke(e.target.value),
      disabled: b,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim font-mono" }, y(c - u)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: we,
      disabled: b || c - u < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    a("add_cut", "Pridať úsek")
  )))))), i.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-3" }, a("segments", "Úseky"), " (", i.length, ") · ", y(re)), /* @__PURE__ */ t.createElement("div", { className: "space-y-1.5" }, i.map((e, r) => /* @__PURE__ */ t.createElement("div", { key: e.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: `w-2.5 h-2.5 rounded-full ${D[r % D.length]}` }), /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium" }, a("segment", "Úsek"), " ", r + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim" }, y(e.start), " → ", y(e.end)), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, "(", y(e.end - e.start), ")"), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => $e(e.id),
      disabled: b,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "✕"
  ))))), i.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, a("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("cut_mode", "Režim strihu")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => K("copy"),
      disabled: b,
      className: `flex-1 px-3 py-2.5 text-sm ${T === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    a("mode_copy", "Rýchly (bez prekódovania)")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => K("precise"),
      disabled: b,
      className: `flex-1 px-3 py-2.5 text-sm ${T === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    a("mode_precise", "Presný (prekódovanie)")
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, a("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame."))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: Q,
      onChange: (e) => he(e.target.value),
      disabled: b,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("output_dir", "Výstupný priečinok")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await f.pickDirectory();
        e && z(e);
      },
      disabled: b,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    I ? a("change", "Zmeniť") : a("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, I || a("default_output", "(predvolený priečinok)")), I && /* @__PURE__ */ t.createElement("button", { onClick: () => z(""), disabled: b, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: V,
      onChange: (e) => ge(e.target.checked),
      disabled: b,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, a("merge_after", "Úseky aj spojiť do jedného súboru"))), V && /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2 pl-7" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: P,
      onChange: (e) => X(e.target.checked),
      disabled: b,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), a("music", "Hudba")), P && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await f.pickFiles(Fe, !1);
        e && !Array.isArray(e) && A(e);
      },
      disabled: b,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    C ? Z(C) : a("pick_music", "Vybrať hudbu")
  ), C && /* @__PURE__ */ t.createElement("button", { onClick: () => A(null), disabled: b, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: G,
      onChange: (e) => fe(e.target.checked),
      disabled: b,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), a("loop_music", "Slučka"))))), j && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, j), i.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, L.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, L.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement(
    "span",
    {
      className: `text-xs font-mono ${e.status === "error" ? "text-error" : e.status === "done" ? "text-success" : "text-text-dim"}`
    },
    e.status === "running" ? e.progress >= 0 ? `${Math.round(e.progress)}%${e.message ? ` · ${e.message}` : ""}` : e.message || "…" : e.status === "done" ? "✓" : e.status === "cancelled" ? a("cancelled", "zrušené") : e.status === "error" ? a("error", "chyba") : e.message
  )), /* @__PURE__ */ t.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ t.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${e.status === "error" ? "bg-error" : e.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: e.status === "done" ? "100%" : `${Math.max(2, Math.min(100, e.progress))}%` }
    }
  ))))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, b && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Se,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    a("cancel_all", "Zrušiť všetko")
  ), !b && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: _e,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    a("new_cut", "Nové strihanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Me,
      disabled: b || !n,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    a("export", "Exportovať"),
    " (",
    i.length,
    " ",
    a("pieces", "dielov"),
    " · ",
    y(re),
    ")"
  )), Y.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, a("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, Y.map((e, r) => /* @__PURE__ */ t.createElement("div", { key: r }, e))))));
}
export {
  Te as default
};
