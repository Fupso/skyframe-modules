const t = window.React;
t.useState;
t.useEffect;
t.useMemo;
t.useRef;
t.useCallback;
const h = window.SkyFrame, a = (s, v) => h.t(s, v), { useState: p, useEffect: te, useMemo: Ze, useRef: I } = window.React, Ge = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], Qe = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }], B = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6"], _e = "#22c55e", Se = "#ef4444", re = 16;
function ne(s) {
  return s.split(/[\\/]/).pop() ?? s;
}
function f(s) {
  const v = Math.max(0, s), C = Math.floor(v / 3600), w = Math.floor(v % 3600 / 60), c = v % 60, k = `${C.toString().padStart(2, "0")}:${w.toString().padStart(2, "0")}:${Math.floor(c).toString().padStart(2, "0")}`, u = Math.round((c - Math.floor(c)) * 10);
  return u ? `${k}.${u}` : k;
}
function Ce(s) {
  const v = s.trim().split(":");
  if (v.length === 3) {
    const [w, c, k] = v.map(parseFloat);
    if ([w, c, k].every((u) => !isNaN(u))) return w * 3600 + c * 60 + k;
  } else if (v.length === 2) {
    const [w, c] = v.map(parseFloat);
    if (!isNaN(w) && !isNaN(c)) return w * 60 + c;
  }
  const C = parseFloat(s);
  return isNaN(C) ? 0 : C;
}
function Re() {
  return Math.random().toString(36).slice(2, 9);
}
function Ye() {
  var Ee;
  const [s, v] = p(null), [C, w] = p(0), [c, k] = p(0), [u, L] = p(0), [F, U] = p(0), [ae, se] = p(!1), [W, oe] = p(null), [b, P] = p([]), [J, le] = p("copy"), [q, Ie] = p(!1), [K, ce] = p(!1), [R, Z] = p(null), [ie, Le] = p(!0), [de, De] = p("cut"), [V, G] = p(""), [O, M] = p([]), [me, Te] = p([]), [ue, $] = p(""), D = I(!1), pe = I(null), be = I(null), xe = I(null), z = I(null), T = I(null), E = (e) => Te((r) => [...r.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), x = (Ee = s == null ? void 0 : s.info) != null && Ee.duration && s.info.duration > 0 ? s.info.duration : C, m = O.some((e) => e.status === "running"), ge = Ze(() => b.reduce((e, r) => e + (r.end - r.start), 0), [b]);
  te(() => {
    h.invoke("get_last_output_dir").then((e) => {
      e && G(e);
    }).catch(() => {
    });
  }, []);
  const Q = () => {
    var e;
    return ((e = be.current) == null ? void 0 : e.querySelector("video")) ?? null;
  }, A = (e) => {
    const r = Q();
    if (r)
      try {
        r.pause(), r.currentTime = Math.max(0, Math.min(x || r.duration || e, e));
      } catch {
      }
    U(Math.max(0, Math.min(x || e, e)));
  };
  te(() => {
    if (!s) return;
    const e = setInterval(() => {
      const r = Q();
      r && (!T.current && !z.current && !isNaN(r.currentTime) && U(r.currentTime), x <= 0 && r.duration && isFinite(r.duration) && (w(r.duration), L((o) => o <= 0 ? r.duration : o)));
    }, 200);
    return () => clearInterval(e);
  }, [s == null ? void 0 : s.path, x]), te(() => {
    if (!s || x <= 0) return;
    let e = !1, r = null, o = null;
    const l = (d) => {
      const n = xe.current;
      if (!n || e) return;
      const i = 960, g = 56;
      n.width = i, n.height = g;
      const N = n.getContext("2d");
      if (!N) return;
      N.fillStyle = "#000", N.fillRect(0, 0, i, g);
      const y = document.createElement("video");
      y.muted = !0, y.preload = "auto";
      const S = i / re, ye = (H) => {
        if (e || H >= re) return;
        const Ke = Math.min(Math.max(0.05, (H + 0.5) / re * x), Math.max(0.05, x - 0.05));
        let Ne = !1;
        const Y = () => {
          if (!Ne) {
            Ne = !0, y.removeEventListener("seeked", we);
            try {
              const j = y.videoWidth, ee = y.videoHeight;
              if (j && ee && !e) {
                const ke = Math.max(S / j, g / ee), $e = j * ke, Me = ee * ke;
                N.drawImage(y, H * S + (S - $e) / 2, (g - Me) / 2, $e, Me);
              }
            } catch {
            }
            ye(H + 1);
          }
        }, we = () => Y();
        y.addEventListener("seeked", we), setTimeout(Y, 900);
        try {
          y.currentTime = Ke;
        } catch {
          Y();
        }
      };
      y.addEventListener("loadeddata", () => ye(0)), y.addEventListener("error", () => {
      }), y.src = d;
    };
    return r = setInterval(() => {
      if (e) {
        r && clearInterval(r);
        return;
      }
      const d = Q();
      d && d.src && (r && clearInterval(r), l(d.src));
    }, 500), o = setTimeout(() => {
      r && clearInterval(r);
    }, 3e4), () => {
      e = !0, r && clearInterval(r), o && clearTimeout(o);
    };
  }, [s == null ? void 0 : s.path, x]);
  const Fe = async () => {
    const e = await h.pickFiles(Ge, !1);
    if (!e || Array.isArray(e)) return;
    let r = null;
    try {
      r = await h.invoke("get_video_info", { path: e });
    } catch {
    }
    v({ path: e, info: r }), w(0), k(0), L((r == null ? void 0 : r.duration) ?? 0), U(0), P([]), M([]), $(""), E(`${a("loaded", "Načítané")}: ${ne(e)}${r ? ` (${f(r.duration)}, ${r.width}×${r.height})` : ""}`);
  }, X = (e) => {
    const r = pe.current;
    if (!r || x <= 0) return 0;
    const o = r.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e - o.left) / o.width)) * x;
  }, Pe = (e) => {
    if (!s || m) return;
    e.preventDefault(), T.current = { startX: e.clientX, moved: !1 };
    const r = X(e.clientX), o = (d) => {
      const n = T.current;
      n && (!n.moved && Math.abs(d.clientX - n.startX) < 4 || (n.moved = !0, se(!0), A(X(d.clientX))));
    }, l = (d) => {
      const n = T.current;
      if (T.current = null, se(!1), window.removeEventListener("pointermove", o), window.removeEventListener("pointerup", l), !n) return;
      const i = X(d.clientX);
      n.moved || (Math.abs(i - c) <= Math.abs(i - u) ? k(Math.min(i, u - 0.1)) : L(Math.max(i, c + 0.1))), A(i);
    };
    window.addEventListener("pointermove", o), window.addEventListener("pointerup", l), A(r);
  }, Ve = (e) => (r) => {
    r.stopPropagation(), r.preventDefault(), z.current = e, oe(e);
    const o = (d) => {
      const n = X(d.clientX);
      z.current === "start" ? k((i) => {
        const g = Math.min(n, u - 0.1);
        return g >= 0 ? g : i;
      }) : L((i) => {
        const g = Math.max(n, c + 0.1);
        return g <= x ? g : i;
      }), A(n);
    }, l = () => {
      z.current = null, oe(null), window.removeEventListener("pointermove", o), window.removeEventListener("pointerup", l);
    };
    window.addEventListener("pointermove", o), window.addEventListener("pointerup", l);
  }, Oe = (e) => k(Math.max(0, Math.min(Ce(e), u - 0.1))), ze = (e) => L(Math.min(x, Math.max(Ce(e), c + 0.1))), Ae = () => {
    if (!(!s || u - c < 0.1)) {
      if (b.some((e) => Math.abs(e.start - c) < 0.5 && Math.abs(e.end - u) < 0.5)) {
        $(a("seg_exists", "Tento úsek už existuje."));
        return;
      }
      $(""), P((e) => [...e, { id: Re(), start: c, end: u }].sort((r, o) => r.start - o.start));
    }
  }, Xe = (e) => P((r) => r.filter((o) => o.id !== e)), fe = (e) => new Promise((r) => {
    let o;
    h.listenJob(e, (l) => {
      M((d) => d.map((n) => n.id === e ? l : n)), l.status !== "running" && (o == null || o(), r(l));
    }).then((l) => {
      o = l;
    });
  }), He = (e) => M((r) => [
    ...r,
    {
      id: `pending-${Re()}`,
      moduleId: h.moduleId,
      label: e,
      status: "running",
      progress: -1,
      message: a("queued", "Čaká v rade"),
      result: null
    }
  ]), Be = (e, r) => M(
    (o) => o.map((l) => l.label === e && l.id.startsWith("pending") ? { ...l, id: r, progress: 0, message: "" } : l)
  ), he = async (e, r, o, l) => {
    He(r);
    const d = await h.invoke("merge_videos", {
      files: e,
      outputName: r,
      music: o,
      moduleId: h.moduleId,
      outputDir: l,
      loopMusic: ie
    });
    Be(r, d), E(`▶ ${r} (${e.length} ${a("pieces", "dielov")}${o ? " + 🎵" : ""})`);
    const n = await fe(d);
    return n.status === "done" && n.result ? (E(`✓ ${n.result}`), n.result) : (n.status === "error" ? ($(n.message), E(`✗ ${n.message}`)) : E(`⊘ ${r}`), null);
  }, Ue = async () => {
    if (!s || b.length === 0) return;
    $(""), D.current = !1;
    const e = de.trim() || "cut", r = V || null, o = K && !!R, l = b.map(
      (n, i) => o || q ? `${e}_${i + 1}_tmp` : `${e}_${i + 1}`
    );
    M(
      b.map((n, i) => ({
        id: `pending-${i}`,
        moduleId: h.moduleId,
        label: l[i],
        status: "running",
        progress: -1,
        message: a("queued", "Čaká v rade"),
        result: null
      }))
    ), E(`${a("export_start", "Exportujem")} ${b.length} ${a("pieces", "dielov")}…`);
    const d = [];
    for (let n = 0; n < b.length && !D.current; n++) {
      const i = b[n];
      try {
        const g = await h.invoke("trim_video", {
          input: s.path,
          start: i.start,
          end: i.end,
          mode: J,
          outputName: l[n],
          outputDir: r,
          moduleId: h.moduleId
        });
        M((y) => {
          const S = [...y];
          return S[n] = { ...S[n], id: g, progress: 0, message: "" }, S;
        }), E(`▶ ${l[n]} (${f(i.start)} → ${f(i.end)})`);
        const N = await fe(g);
        if (N.status === "done" && N.result)
          d.push(N.result), E(`✓ ${N.result}`);
        else if (N.status === "error") {
          E(`✗ ${l[n]}: ${N.message}`), $(N.message);
          return;
        } else {
          E(`⊘ ${l[n]}`);
          return;
        }
      } catch (g) {
        $(String(g)), E(String(g));
        return;
      }
    }
    if (!(D.current || d.length === 0)) {
      try {
        if (q)
          await he(d, `${e}_merged`, o ? R : null, r);
        else if (o)
          for (let n = 0; n < d.length && !D.current; n++)
            await he([d[n]], `${e}_${n + 1}`, R, r);
      } catch (n) {
        $(String(n)), E(String(n));
      }
      E(a("export_done", "Export dokončený."));
    }
  }, We = async () => {
    D.current = !0;
    for (const e of O)
      e.status === "running" && !e.id.startsWith("pending") && await h.cancelJob(e.id);
  }, Je = () => {
    M([]), P([]), v(null), Z(null), ce(!1), $("");
  }, qe = h.PlayerShell, _ = (e) => `${x > 0 ? e / x * 100 : 0}%`, ve = ({ which: e, time: r }) => {
    const o = e === "start" ? _e : Se;
    return /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: Ve(e),
        className: "absolute z-20 cursor-ew-resize touch-none",
        style: { left: `calc(${_(r)} - 11px)`, width: 22, top: -8, bottom: -8 }
      },
      /* @__PURE__ */ t.createElement(
        "div",
        {
          className: "absolute left-1/2 -translate-x-1/2 rounded",
          style: { top: 0, bottom: 0, width: 4, backgroundColor: o, boxShadow: "0 0 6px rgba(0,0,0,0.8)" }
        }
      ),
      /* @__PURE__ */ t.createElement(
        "div",
        {
          className: `absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-[3px] rounded-md border ${W === e ? "scale-110" : ""}`,
          style: {
            top: "50%",
            transform: `translate(-50%, -50%)${W === e ? " scale(1.15)" : ""}`,
            width: 22,
            height: 36,
            backgroundColor: o,
            borderColor: "rgba(255,255,255,0.5)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.6)"
          }
        },
        /* @__PURE__ */ t.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } }),
        /* @__PURE__ */ t.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } }),
        /* @__PURE__ */ t.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } })
      ),
      W === e && /* @__PURE__ */ t.createElement(
        "div",
        {
          className: "absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap pointer-events-none",
          style: { top: -30, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", zIndex: 30 }
        },
        e === "start" ? "▶ " : "◀ ",
        f(r)
      )
    );
  };
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, a("video", "Video")), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Fe,
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    s ? a("change_video", "Zmeniť video") : a("pick_video", "Vybrať video")
  )), s && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, ne(s.path), " · ", f(x), s.info ? ` · ${s.info.width}×${s.info.height} · ${s.info.codec}` : ""), /* @__PURE__ */ t.createElement("div", { ref: be, className: "rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(qe, { src: s.path })), /* @__PURE__ */ t.createElement("div", { className: "pt-3 pb-3" }, /* @__PURE__ */ t.createElement("div", { className: "relative" }, /* @__PURE__ */ t.createElement(
    "canvas",
    {
      ref: xe,
      className: "block w-full h-16 rounded-lg border border-border bg-black"
    }
  ), /* @__PURE__ */ t.createElement(
    "div",
    {
      ref: pe,
      onPointerDown: Pe,
      className: "absolute inset-0 cursor-crosshair select-none touch-none"
    },
    b.map((e, r) => /* @__PURE__ */ t.createElement(
      "div",
      {
        key: e.id,
        className: "absolute top-0 bottom-0 pointer-events-none",
        style: { left: _(e.start), width: _(e.end - e.start), backgroundColor: B[r % B.length], opacity: 0.4 }
      }
    )),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 pointer-events-none",
        style: {
          left: _(c),
          width: _(u - c),
          backgroundColor: "rgba(255,255,255,0.12)",
          borderLeft: `2px solid ${_e}`,
          borderRight: `2px solid ${Se}`
        }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: `absolute w-[2px] bg-white pointer-events-none z-10 ${ae ? "" : "transition-[left] duration-150"}`,
        style: { left: _(F), top: -6, bottom: -6, boxShadow: "0 0 4px rgba(0,0,0,0.9)" }
      }
    ),
    ae && /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute px-2 py-0.5 rounded text-[11px] font-mono pointer-events-none -translate-x-1/2 z-30",
        style: { left: _(F), top: -32, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff" }
      },
      f(F)
    ),
    /* @__PURE__ */ t.createElement(ve, { which: "start", time: c }),
    /* @__PURE__ */ t.createElement(ve, { which: "end", time: u })
  )), /* @__PURE__ */ t.createElement("div", { className: "mt-1 flex justify-between items-center" }, /* @__PURE__ */ t.createElement("p", { className: "text-[10px] text-text-dim" }, a("timeline_hint", "Podrž myš na ose a ťahaj pre živý náhľad. Klik nastaví bližšiu značku.")), /* @__PURE__ */ t.createElement("span", { className: "text-[11px] font-mono text-text-dim" }, f(F), " / ", f(x)))), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-3 gap-3 items-end" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, a("start", "Štart")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: f(c),
      key: `s-${c.toFixed(2)}`,
      onBlur: (e) => Oe(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, a("end", "Koniec")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: f(u),
      key: `e-${u.toFixed(2)}`,
      onBlur: (e) => ze(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim font-mono" }, f(u - c)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ae,
      disabled: m || u - c < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    a("add_cut", "Pridať úsek")
  ))))), b.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-3" }, a("segments", "Úseky"), " (", b.length, ") · ", f(ge)), /* @__PURE__ */ t.createElement("div", { className: "space-y-1.5" }, b.map((e, r) => /* @__PURE__ */ t.createElement("div", { key: e.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: "w-2.5 h-2.5 rounded-full", style: { backgroundColor: B[r % B.length] } }), /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium" }, a("segment", "Úsek"), " ", r + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim" }, f(e.start), " → ", f(e.end)), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, "(", f(e.end - e.start), ")"), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => Xe(e.id),
      disabled: m,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "✕"
  ))))), b.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, a("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("cut_mode", "Režim strihu")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => le("copy"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${J === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    a("mode_copy", "Rýchly (bez prekódovania)")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => le("precise"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${J === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    a("mode_precise", "Presný (prekódovanie)")
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, a("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame."))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: de,
      onChange: (e) => De(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, a("output_dir", "Výstupný priečinok")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await h.pickDirectory();
        e && G(e);
      },
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    V ? a("change", "Zmeniť") : a("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, V || a("default_output", "(predvolený priečinok)")), V && /* @__PURE__ */ t.createElement("button", { onClick: () => G(""), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: q,
      onChange: (e) => Ie(e.target.checked),
      disabled: m,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, a("merge_after", "Úseky aj spojiť do jedného súboru"))), /* @__PURE__ */ t.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: K,
      onChange: (e) => ce(e.target.checked),
      disabled: m,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, a("music", "Hudba"))), K && /* @__PURE__ */ t.createElement("div", { className: "space-y-2 pl-7" }, /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await h.pickFiles(Qe, !1);
        e && !Array.isArray(e) && Z(e);
      },
      disabled: m,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    R ? ne(R) : a("pick_music", "Vybrať hudbu")
  ), R && /* @__PURE__ */ t.createElement("button", { onClick: () => Z(null), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: ie,
      onChange: (e) => Le(e.target.checked),
      disabled: m,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), a("loop_music", "Slučka"))), /* @__PURE__ */ t.createElement("p", { className: "text-[10px] text-text-dim" }, a("music_note", "Hudba sa pridá ku každému výstupu. Končí spolu s videom; ak je kratšia a slučka je vypnutá, video sa skráti na dĺžku hudby."))))), ue && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, ue), b.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, O.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, O.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement(
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
  ))))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: We,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    a("cancel_all", "Zrušiť všetko")
  ), !m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Je,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    a("new_cut", "Nové strihanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ue,
      disabled: m || !s,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    a("export", "Exportovať"),
    " (",
    b.length,
    " ",
    a("pieces", "dielov"),
    " · ",
    f(ge),
    ")"
  )), me.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, a("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, me.map((e, r) => /* @__PURE__ */ t.createElement("div", { key: r }, e))))));
}
export {
  Ye as default
};
