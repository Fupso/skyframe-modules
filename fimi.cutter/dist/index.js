const t = window.React;
t.useState;
t.useEffect;
t.useMemo;
t.useRef;
t.useCallback;
const v = window.SkyFrame, r = (a, E) => v.t(a, E), { useState: g, useEffect: Q, useMemo: Ve, useRef: S } = window.React, Ae = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], Xe = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }], X = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"], Y = 16;
function j(a) {
  return a.split(/[\\/]/).pop() ?? a;
}
function h(a) {
  const E = Math.max(0, a), u = Math.floor(E / 3600), N = Math.floor(E % 3600 / 60), i = E % 60, w = `${u.toString().padStart(2, "0")}:${N.toString().padStart(2, "0")}:${Math.floor(i).toString().padStart(2, "0")}`, $ = Math.round((i - Math.floor(i)) * 10);
  return $ ? `${w}.${$}` : w;
}
function Ne(a) {
  const E = a.trim().split(":");
  if (E.length === 3) {
    const [N, i, w] = E.map(parseFloat);
    if ([N, i, w].every(($) => !isNaN($))) return N * 3600 + i * 60 + w;
  } else if (E.length === 2) {
    const [N, i] = E.map(parseFloat);
    if (!isNaN(N) && !isNaN(i)) return N * 60 + i;
  }
  const u = parseFloat(a);
  return isNaN(u) ? 0 : u;
}
function ze() {
  return Math.random().toString(36).slice(2, 9);
}
function Oe() {
  var be;
  const [a, E] = g(null), [u, N] = g(0), [i, w] = g(0), [$, z] = g(0), [ee, te] = g(!1), [x, R] = g([]), [O, ne] = g("copy"), [B, ye] = g(!1), [H, re] = g(!1), [D, U] = g(null), [ae, we] = g(!0), [se, ke] = g("cut"), [T, J] = g(""), [F, _] = g([]), [oe, $e] = g([]), [le, M] = g(""), P = S(!1), ce = S(null), ie = S(null), de = S(null), V = S(null), C = S(null), y = (e) => $e((n) => [...n.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), m = ((be = a == null ? void 0 : a.info) == null ? void 0 : be.duration) ?? 0, p = F.some((e) => e.status === "running"), me = Ve(() => x.reduce((e, n) => e + (n.end - n.start), 0), [x]);
  Q(() => {
    v.invoke("get_last_output_dir").then((e) => {
      e && J(e);
    }).catch(() => {
    });
  }, []);
  const W = () => {
    var e;
    return ((e = ie.current) == null ? void 0 : e.querySelector("video")) ?? null;
  }, I = (e) => {
    const n = W();
    if (n)
      try {
        n.pause(), n.currentTime = Math.max(0, Math.min(m || n.duration || e, e));
      } catch {
      }
    z(Math.max(0, Math.min(m || e, e)));
  };
  Q(() => {
    if (!a) return;
    const e = setInterval(() => {
      if (C.current || V.current) return;
      const n = W();
      n && !isNaN(n.currentTime) && z(n.currentTime);
    }, 200);
    return () => clearInterval(e);
  }, [a == null ? void 0 : a.path]), Q(() => {
    if (!a || m <= 0) return;
    let e = !1, n = null, l = null;
    const b = (s) => {
      const o = de.current;
      if (!o || e) return;
      const c = 960, d = 56;
      o.width = c, o.height = d;
      const k = o.getContext("2d");
      if (!k) return;
      k.fillStyle = "#000", k.fillRect(0, 0, c, d);
      const f = document.createElement("video");
      f.muted = !0, f.preload = "auto";
      const q = c / Y, xe = (A) => {
        if (e || A >= Y) return;
        const Pe = Math.min(Math.max(0.05, (A + 0.5) / Y * m), Math.max(0.05, m - 0.05));
        let ge = !1;
        const Z = () => {
          if (!ge) {
            ge = !0, f.removeEventListener("seeked", fe);
            try {
              const K = f.videoWidth, G = f.videoHeight;
              if (K && G && !e) {
                const he = Math.max(q / K, d / G), ve = K * he, Ee = G * he;
                k.drawImage(f, A * q + (q - ve) / 2, (d - Ee) / 2, ve, Ee);
              }
            } catch {
            }
            xe(A + 1);
          }
        }, fe = () => Z();
        f.addEventListener("seeked", fe), setTimeout(Z, 900);
        try {
          f.currentTime = Pe;
        } catch {
          Z();
        }
      };
      f.addEventListener("loadeddata", () => xe(0)), f.addEventListener("error", () => {
      }), f.src = s;
    };
    return n = setInterval(() => {
      if (e) {
        n && clearInterval(n);
        return;
      }
      const s = W();
      s && s.src && (n && clearInterval(n), b(s.src));
    }, 500), l = setTimeout(() => {
      n && clearInterval(n);
    }, 3e4), () => {
      e = !0, n && clearInterval(n), l && clearTimeout(l);
    };
  }, [a == null ? void 0 : a.path, m]);
  const Me = async () => {
    const e = await v.pickFiles(Ae, !1);
    if (!e || Array.isArray(e)) return;
    let n = null;
    try {
      n = await v.invoke("get_video_info", { path: e });
    } catch {
    }
    E({ path: e, info: n }), N(0), w((n == null ? void 0 : n.duration) ?? 0), z(0), R([]), _([]), M(""), y(`${r("loaded", "Načítané")}: ${j(e)}${n ? ` (${h(n.duration)}, ${n.width}×${n.height})` : ""}`);
  }, L = (e) => {
    const n = ce.current;
    if (!n || m <= 0) return 0;
    const l = n.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e - l.left) / l.width)) * m;
  }, _e = (e) => {
    if (!a || p) return;
    e.preventDefault(), C.current = { startX: e.clientX, moved: !1 };
    const n = L(e.clientX), l = (s) => {
      const o = C.current;
      o && (!o.moved && Math.abs(s.clientX - o.startX) < 4 || (o.moved = !0, te(!0), I(L(s.clientX))));
    }, b = (s) => {
      const o = C.current;
      if (C.current = null, te(!1), window.removeEventListener("pointermove", l), window.removeEventListener("pointerup", b), !!o)
        if (o.moved)
          I(L(s.clientX));
        else {
          const c = L(s.clientX);
          Math.abs(c - u) <= Math.abs(c - i) ? N(Math.min(c, i - 0.1)) : w(Math.max(c, u + 0.1)), I(c);
        }
    };
    window.addEventListener("pointermove", l), window.addEventListener("pointerup", b), I(n);
  }, ue = (e) => (n) => {
    n.stopPropagation(), n.preventDefault(), V.current = e;
    const l = (s) => {
      const o = L(s.clientX);
      V.current === "start" ? N((c) => {
        const d = Math.min(o, i - 0.1);
        return d >= 0 ? d : c;
      }) : w((c) => {
        const d = Math.max(o, u + 0.1);
        return d <= m ? d : c;
      }), I(o);
    }, b = () => {
      V.current = null, window.removeEventListener("pointermove", l), window.removeEventListener("pointerup", b);
    };
    window.addEventListener("pointermove", l), window.addEventListener("pointerup", b);
  }, Se = (e) => N(Math.max(0, Math.min(Ne(e), i - 0.1))), Ce = (e) => w(Math.min(m, Math.max(Ne(e), u + 0.1))), Ie = () => {
    if (!(!a || i - u < 0.1)) {
      if (x.some((e) => Math.abs(e.start - u) < 0.5 && Math.abs(e.end - i) < 0.5)) {
        M(r("seg_exists", "Tento úsek už existuje."));
        return;
      }
      M(""), R((e) => [...e, { id: ze(), start: u, end: i }].sort((n, l) => n.start - l.start));
    }
  }, Le = (e) => R((n) => n.filter((l) => l.id !== e)), pe = (e) => new Promise((n) => {
    let l;
    v.listenJob(e, (b) => {
      _((s) => s.map((o) => o.id === e ? b : o)), b.status !== "running" && (l == null || l(), n(b));
    }).then((b) => {
      l = b;
    });
  }), Re = async () => {
    if (!a || x.length === 0) return;
    M(""), P.current = !1;
    const e = se.trim() || "cut", n = T || null, l = x.map((s, o) => `${e}_${o + 1}`);
    _(
      x.map((s, o) => ({
        id: `pending-${o}`,
        moduleId: v.moduleId,
        label: l[o],
        status: "running",
        progress: -1,
        message: r("queued", "Čaká v rade"),
        result: null
      }))
    ), y(`${r("export_start", "Exportujem")} ${x.length} ${r("pieces", "dielov")}…`);
    const b = [];
    for (let s = 0; s < x.length && !P.current; s++) {
      const o = x[s];
      try {
        const c = await v.invoke("trim_video", {
          input: a.path,
          start: o.start,
          end: o.end,
          mode: O,
          outputName: l[s],
          outputDir: n,
          moduleId: v.moduleId
        });
        _((k) => {
          const f = [...k];
          return f[s] = { ...f[s], id: c, progress: 0, message: "" }, f;
        }), y(`▶ ${l[s]} (${h(o.start)} → ${h(o.end)})`);
        const d = await pe(c);
        if (d.status === "done" && d.result)
          b.push(d.result), y(`✓ ${d.result}`);
        else if (d.status === "error") {
          y(`✗ ${l[s]}: ${d.message}`), M(d.message);
          return;
        } else {
          y(`⊘ ${l[s]}`);
          return;
        }
      } catch (c) {
        M(String(c)), y(String(c));
        return;
      }
    }
    if (B && b.length > 0 && !P.current)
      try {
        const s = `${e}_merged`;
        _((d) => [
          ...d,
          {
            id: "pending-merge",
            moduleId: v.moduleId,
            label: s,
            status: "running",
            progress: -1,
            message: r("queued", "Čaká v rade"),
            result: null
          }
        ]);
        const o = await v.invoke("merge_videos", {
          files: b,
          outputName: s,
          music: H ? D : null,
          moduleId: v.moduleId,
          outputDir: n,
          loopMusic: ae
        });
        _((d) => d.map((k) => k.id === "pending-merge" ? { ...k, id: o, progress: 0, message: "" } : k)), y(`▶ ${s} (${b.length} ${r("pieces", "dielov")})`);
        const c = await pe(o);
        c.status === "done" && c.result ? y(`✓ ${c.result}`) : c.status === "error" && (M(c.message), y(`✗ ${c.message}`));
      } catch (s) {
        M(String(s)), y(String(s));
      }
    y(r("export_done", "Export dokončený."));
  }, De = async () => {
    P.current = !0;
    for (const e of F)
      e.status === "running" && !e.id.startsWith("pending") && await v.cancelJob(e.id);
  }, Te = () => {
    _([]), R([]), E(null), U(null), re(!1), M("");
  }, Fe = v.PlayerShell;
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("video", "Video")), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Me,
      disabled: p,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    a ? r("change_video", "Zmeniť video") : r("pick_video", "Vybrať video")
  )), a && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, j(a.path), " · ", h(m), a.info ? ` · ${a.info.width}×${a.info.height} · ${a.info.codec}` : ""), /* @__PURE__ */ t.createElement("div", { ref: ie, className: "rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(Fe, { src: a.path })), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("div", { className: "relative" }, /* @__PURE__ */ t.createElement(
    "canvas",
    {
      ref: de,
      className: "block w-full h-14 rounded-lg border border-border bg-black"
    }
  ), /* @__PURE__ */ t.createElement(
    "div",
    {
      ref: ce,
      onPointerDown: _e,
      className: "absolute inset-0 cursor-pointer select-none touch-none"
    },
    x.map((e, n) => /* @__PURE__ */ t.createElement(
      "div",
      {
        key: e.id,
        className: `absolute top-0 bottom-0 opacity-40 pointer-events-none ${X[n % X.length]}`,
        style: { left: `${e.start / m * 100}%`, width: `${(e.end - e.start) / m * 100}%` }
      }
    )),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 bg-accent/30 border-x-2 border-accent pointer-events-none",
        style: { left: `${u / m * 100}%`, width: `${(i - u) / m * 100}%` }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: `absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.9)] pointer-events-none ${ee ? "" : "transition-[left] duration-150"}`,
        style: { left: `${$ / m * 100}%` }
      }
    ),
    ee && /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute -top-7 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] font-mono pointer-events-none -translate-x-1/2",
        style: { left: `${$ / m * 100}%` }
      },
      h($)
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: ue("start"),
        className: "absolute top-0 bottom-0 w-3 bg-accent cursor-ew-resize rounded-l",
        style: { left: `calc(${u / m * 100}% - 4px)` }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: ue("end"),
        className: "absolute top-0 bottom-0 w-3 bg-accent cursor-ew-resize rounded-r",
        style: { left: `calc(${i / m * 100}% - 4px)` }
      }
    )
  )), /* @__PURE__ */ t.createElement("div", { className: "mt-1 flex justify-between items-center" }, /* @__PURE__ */ t.createElement("p", { className: "text-[10px] text-text-dim" }, r("timeline_hint", "Klikni na os alebo ťahaj značky — prehrávač ukáže daný čas.")), /* @__PURE__ */ t.createElement("span", { className: "text-[11px] font-mono text-text-dim" }, h($), " / ", h(m))), /* @__PURE__ */ t.createElement("div", { className: "mt-3 grid grid-cols-3 gap-3 items-end" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, r("start", "Štart")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: h(u),
      key: `s-${u.toFixed(2)}`,
      onBlur: (e) => Se(e.target.value),
      disabled: p,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, r("end", "Koniec")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: h(i),
      key: `e-${i.toFixed(2)}`,
      onBlur: (e) => Ce(e.target.value),
      disabled: p,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim font-mono" }, h(i - u)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ie,
      disabled: p || i - u < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    r("add_cut", "Pridať úsek")
  )))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-3" }, r("segments", "Úseky"), " (", x.length, ") · ", h(me)), /* @__PURE__ */ t.createElement("div", { className: "space-y-1.5" }, x.map((e, n) => /* @__PURE__ */ t.createElement("div", { key: e.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: `w-2.5 h-2.5 rounded-full ${X[n % X.length]}` }), /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium" }, r("segment", "Úsek"), " ", n + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim" }, h(e.start), " → ", h(e.end)), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, "(", h(e.end - e.start), ")"), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => Le(e.id),
      disabled: p,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "✕"
  ))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("cut_mode", "Režim strihu")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => ne("copy"),
      disabled: p,
      className: `flex-1 px-3 py-2.5 text-sm ${O === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_copy", "Rýchly (bez prekódovania)")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => ne("precise"),
      disabled: p,
      className: `flex-1 px-3 py-2.5 text-sm ${O === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_precise", "Presný (prekódovanie)")
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, r("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame."))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: se,
      onChange: (e) => ke(e.target.value),
      disabled: p,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_dir", "Výstupný priečinok")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await v.pickDirectory();
        e && J(e);
      },
      disabled: p,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    T ? r("change", "Zmeniť") : r("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, T || r("default_output", "(predvolený priečinok)")), T && /* @__PURE__ */ t.createElement("button", { onClick: () => J(""), disabled: p, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: B,
      onChange: (e) => ye(e.target.checked),
      disabled: p,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, r("merge_after", "Úseky aj spojiť do jedného súboru"))), B && /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2 pl-7" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: H,
      onChange: (e) => re(e.target.checked),
      disabled: p,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("music", "Hudba")), H && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await v.pickFiles(Xe, !1);
        e && !Array.isArray(e) && U(e);
      },
      disabled: p,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    D ? j(D) : r("pick_music", "Vybrať hudbu")
  ), D && /* @__PURE__ */ t.createElement("button", { onClick: () => U(null), disabled: p, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: ae,
      onChange: (e) => we(e.target.checked),
      disabled: p,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("loop_music", "Slučka"))))), le && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, le), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, F.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, F.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement(
    "span",
    {
      className: `text-xs font-mono ${e.status === "error" ? "text-error" : e.status === "done" ? "text-success" : "text-text-dim"}`
    },
    e.status === "running" ? e.progress >= 0 ? `${Math.round(e.progress)}%${e.message ? ` · ${e.message}` : ""}` : e.message || "…" : e.status === "done" ? "✓" : e.status === "cancelled" ? r("cancelled", "zrušené") : e.status === "error" ? r("error", "chyba") : e.message
  )), /* @__PURE__ */ t.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ t.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${e.status === "error" ? "bg-error" : e.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: e.status === "done" ? "100%" : `${Math.max(2, Math.min(100, e.progress))}%` }
    }
  ))))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, p && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: De,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    r("cancel_all", "Zrušiť všetko")
  ), !p && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Te,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    r("new_cut", "Nové strihanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Re,
      disabled: p || !a,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    r("export", "Exportovať"),
    " (",
    x.length,
    " ",
    r("pieces", "dielov"),
    " · ",
    h(me),
    ")"
  )), oe.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, r("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, oe.map((e, n) => /* @__PURE__ */ t.createElement("div", { key: n }, e))))));
}
export {
  Oe as default
};
