const t = window.React;
t.useState;
t.useEffect;
t.useMemo;
t.useRef;
t.useCallback;
const v = window.SkyFrame, r = (a, E) => v.t(a, E), { useState: b, useEffect: ee, useMemo: Be, useRef: C } = window.React, Ue = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], Je = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }], H = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"], te = 16;
function ne(a) {
  return a.split(/[\\/]/).pop() ?? a;
}
function f(a) {
  const E = Math.max(0, a), S = Math.floor(E / 3600), w = Math.floor(E % 3600 / 60), i = E % 60, y = `${S.toString().padStart(2, "0")}:${w.toString().padStart(2, "0")}:${Math.floor(i).toString().padStart(2, "0")}`, u = Math.round((i - Math.floor(i)) * 10);
  return u ? `${y}.${u}` : y;
}
function Me(a) {
  const E = a.trim().split(":");
  if (E.length === 3) {
    const [w, i, y] = E.map(parseFloat);
    if ([w, i, y].every((u) => !isNaN(u))) return w * 3600 + i * 60 + y;
  } else if (E.length === 2) {
    const [w, i] = E.map(parseFloat);
    if (!isNaN(w) && !isNaN(i)) return w * 60 + i;
  }
  const S = parseFloat(a);
  return isNaN(S) ? 0 : S;
}
function We() {
  return Math.random().toString(36).slice(2, 9);
}
function qe() {
  var ve;
  const [a, E] = b(null), [S, w] = b(0), [i, y] = b(0), [u, I] = b(0), [R, B] = b(0), [re, ae] = b(!1), [se, oe] = b(null), [x, F] = b([]), [U, le] = b("copy"), [J, _e] = b(!1), [W, ce] = b(!1), [D, q] = b(null), [ie, Se] = b(!0), [de, Ce] = b("cut"), [T, Z] = b(""), [P, M] = b([]), [me, Ie] = b([]), [ue, $] = b(""), V = C(!1), pe = C(null), be = C(null), xe = C(null), z = C(null), L = C(null), N = (e) => Ie((n) => [...n.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), g = (ve = a == null ? void 0 : a.info) != null && ve.duration && a.info.duration > 0 ? a.info.duration : S, m = P.some((e) => e.status === "running"), ge = Be(() => x.reduce((e, n) => e + (n.end - n.start), 0), [x]);
  ee(() => {
    v.invoke("get_last_output_dir").then((e) => {
      e && Z(e);
    }).catch(() => {
    });
  }, []);
  const K = () => {
    var e;
    return ((e = be.current) == null ? void 0 : e.querySelector("video")) ?? null;
  }, A = (e) => {
    const n = K();
    if (n)
      try {
        n.pause(), n.currentTime = Math.max(0, Math.min(g || n.duration || e, e));
      } catch {
      }
    B(Math.max(0, Math.min(g || e, e)));
  };
  ee(() => {
    if (!a) return;
    const e = setInterval(() => {
      const n = K();
      n && (!L.current && !z.current && !isNaN(n.currentTime) && B(n.currentTime), g <= 0 && n.duration && isFinite(n.duration) && (w(n.duration), I((l) => l <= 0 ? n.duration : l)));
    }, 200);
    return () => clearInterval(e);
  }, [a == null ? void 0 : a.path, g]), ee(() => {
    if (!a || g <= 0) return;
    let e = !1, n = null, l = null;
    const p = (s) => {
      const o = xe.current;
      if (!o || e) return;
      const c = 960, d = 56;
      o.width = c, o.height = d;
      const k = o.getContext("2d");
      if (!k) return;
      k.fillStyle = "#000", k.fillRect(0, 0, c, d);
      const h = document.createElement("video");
      h.muted = !0, h.preload = "auto";
      const G = c / te, Ee = (O) => {
        if (e || O >= te) return;
        const He = Math.min(Math.max(0.05, (O + 0.5) / te * g), Math.max(0.05, g - 0.05));
        let Ne = !1;
        const Q = () => {
          if (!Ne) {
            Ne = !0, h.removeEventListener("seeked", we);
            try {
              const Y = h.videoWidth, j = h.videoHeight;
              if (Y && j && !e) {
                const ye = Math.max(G / Y, d / j), ke = Y * ye, $e = j * ye;
                k.drawImage(h, O * G + (G - ke) / 2, (d - $e) / 2, ke, $e);
              }
            } catch {
            }
            Ee(O + 1);
          }
        }, we = () => Q();
        h.addEventListener("seeked", we), setTimeout(Q, 900);
        try {
          h.currentTime = He;
        } catch {
          Q();
        }
      };
      h.addEventListener("loadeddata", () => Ee(0)), h.addEventListener("error", () => {
      }), h.src = s;
    };
    return n = setInterval(() => {
      if (e) {
        n && clearInterval(n);
        return;
      }
      const s = K();
      s && s.src && (n && clearInterval(n), p(s.src));
    }, 500), l = setTimeout(() => {
      n && clearInterval(n);
    }, 3e4), () => {
      e = !0, n && clearInterval(n), l && clearTimeout(l);
    };
  }, [a == null ? void 0 : a.path, g]);
  const Le = async () => {
    const e = await v.pickFiles(Ue, !1);
    if (!e || Array.isArray(e)) return;
    let n = null;
    try {
      n = await v.invoke("get_video_info", { path: e });
    } catch {
    }
    E({ path: e, info: n }), w(0), y(0), I((n == null ? void 0 : n.duration) ?? 0), B(0), F([]), M([]), $(""), N(`${r("loaded", "Načítané")}: ${ne(e)}${n ? ` (${f(n.duration)}, ${n.width}×${n.height})` : ""}`);
  }, X = (e) => {
    const n = pe.current;
    if (!n || g <= 0) return 0;
    const l = n.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e - l.left) / l.width)) * g;
  }, Re = (e) => {
    if (!a || m) return;
    e.preventDefault(), L.current = { startX: e.clientX, moved: !1 };
    const n = X(e.clientX), l = (s) => {
      const o = L.current;
      o && (!o.moved && Math.abs(s.clientX - o.startX) < 4 || (o.moved = !0, ae(!0), A(X(s.clientX))));
    }, p = (s) => {
      const o = L.current;
      if (L.current = null, ae(!1), window.removeEventListener("pointermove", l), window.removeEventListener("pointerup", p), !o) return;
      const c = X(s.clientX);
      o.moved || (Math.abs(c - i) <= Math.abs(c - u) ? y(Math.min(c, u - 0.1)) : I(Math.max(c, i + 0.1))), A(c);
    };
    window.addEventListener("pointermove", l), window.addEventListener("pointerup", p), A(n);
  }, Fe = (e) => (n) => {
    n.stopPropagation(), n.preventDefault(), z.current = e, oe(e);
    const l = (s) => {
      const o = X(s.clientX);
      z.current === "start" ? y((c) => {
        const d = Math.min(o, u - 0.1);
        return d >= 0 ? d : c;
      }) : I((c) => {
        const d = Math.max(o, i + 0.1);
        return d <= g ? d : c;
      }), A(o);
    }, p = () => {
      z.current = null, oe(null), window.removeEventListener("pointermove", l), window.removeEventListener("pointerup", p);
    };
    window.addEventListener("pointermove", l), window.addEventListener("pointerup", p);
  }, De = (e) => y(Math.max(0, Math.min(Me(e), u - 0.1))), Te = (e) => I(Math.min(g, Math.max(Me(e), i + 0.1))), Pe = () => {
    if (!(!a || u - i < 0.1)) {
      if (x.some((e) => Math.abs(e.start - i) < 0.5 && Math.abs(e.end - u) < 0.5)) {
        $(r("seg_exists", "Tento úsek už existuje."));
        return;
      }
      $(""), F((e) => [...e, { id: We(), start: i, end: u }].sort((n, l) => n.start - l.start));
    }
  }, Ve = (e) => F((n) => n.filter((l) => l.id !== e)), fe = (e) => new Promise((n) => {
    let l;
    v.listenJob(e, (p) => {
      M((s) => s.map((o) => o.id === e ? p : o)), p.status !== "running" && (l == null || l(), n(p));
    }).then((p) => {
      l = p;
    });
  }), ze = async () => {
    if (!a || x.length === 0) return;
    $(""), V.current = !1;
    const e = de.trim() || "cut", n = T || null, l = x.map((s, o) => `${e}_${o + 1}`);
    M(
      x.map((s, o) => ({
        id: `pending-${o}`,
        moduleId: v.moduleId,
        label: l[o],
        status: "running",
        progress: -1,
        message: r("queued", "Čaká v rade"),
        result: null
      }))
    ), N(`${r("export_start", "Exportujem")} ${x.length} ${r("pieces", "dielov")}…`);
    const p = [];
    for (let s = 0; s < x.length && !V.current; s++) {
      const o = x[s];
      try {
        const c = await v.invoke("trim_video", {
          input: a.path,
          start: o.start,
          end: o.end,
          mode: U,
          outputName: l[s],
          outputDir: n,
          moduleId: v.moduleId
        });
        M((k) => {
          const h = [...k];
          return h[s] = { ...h[s], id: c, progress: 0, message: "" }, h;
        }), N(`▶ ${l[s]} (${f(o.start)} → ${f(o.end)})`);
        const d = await fe(c);
        if (d.status === "done" && d.result)
          p.push(d.result), N(`✓ ${d.result}`);
        else if (d.status === "error") {
          N(`✗ ${l[s]}: ${d.message}`), $(d.message);
          return;
        } else {
          N(`⊘ ${l[s]}`);
          return;
        }
      } catch (c) {
        $(String(c)), N(String(c));
        return;
      }
    }
    if (J && p.length > 0 && !V.current)
      try {
        const s = `${e}_merged`;
        M((d) => [
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
          files: p,
          outputName: s,
          music: W ? D : null,
          moduleId: v.moduleId,
          outputDir: n,
          loopMusic: ie
        });
        M((d) => d.map((k) => k.id === "pending-merge" ? { ...k, id: o, progress: 0, message: "" } : k)), N(`▶ ${s} (${p.length} ${r("pieces", "dielov")})`);
        const c = await fe(o);
        c.status === "done" && c.result ? N(`✓ ${c.result}`) : c.status === "error" && ($(c.message), N(`✗ ${c.message}`));
      } catch (s) {
        $(String(s)), N(String(s));
      }
    N(r("export_done", "Export dokončený."));
  }, Ae = async () => {
    V.current = !0;
    for (const e of P)
      e.status === "running" && !e.id.startsWith("pending") && await v.cancelJob(e.id);
  }, Xe = () => {
    M([]), F([]), E(null), q(null), ce(!1), $("");
  }, Oe = v.PlayerShell, _ = (e) => `${g > 0 ? e / g * 100 : 0}%`, he = ({ which: e, time: n }) => /* @__PURE__ */ t.createElement(
    "div",
    {
      onPointerDown: Fe(e),
      className: "absolute top-0 bottom-0 z-20 cursor-ew-resize touch-none",
      style: { left: `calc(${_(n)} - 9px)`, width: 18 }
    },
    /* @__PURE__ */ t.createElement("div", { className: `absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded ${e === "start" ? "bg-emerald-400" : "bg-rose-400"}` }),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: `absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[18px] h-8 rounded-md shadow-lg border flex flex-col items-center justify-center gap-[3px] ${e === "start" ? "bg-emerald-500 border-emerald-300" : "bg-rose-500 border-rose-300"} ${se === e ? "scale-110 ring-2 ring-white/40" : ""}`
      },
      /* @__PURE__ */ t.createElement("div", { className: "w-2 h-[2px] bg-white/90 rounded-full" }),
      /* @__PURE__ */ t.createElement("div", { className: "w-2 h-[2px] bg-white/90 rounded-full" }),
      /* @__PURE__ */ t.createElement("div", { className: "w-2 h-[2px] bg-white/90 rounded-full" })
    ),
    se === e && /* @__PURE__ */ t.createElement("div", { className: "absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/85 text-white text-[11px] font-mono whitespace-nowrap pointer-events-none" }, e === "start" ? "▶ " : "◀ ", f(n))
  );
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("video", "Video")), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Le,
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    a ? r("change_video", "Zmeniť video") : r("pick_video", "Vybrať video")
  )), a && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, ne(a.path), " · ", f(g), a.info ? ` · ${a.info.width}×${a.info.height} · ${a.info.codec}` : ""), /* @__PURE__ */ t.createElement("div", { ref: be, className: "rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(Oe, { src: a.path })), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("div", { className: "relative" }, /* @__PURE__ */ t.createElement(
    "canvas",
    {
      ref: xe,
      className: "block w-full h-16 rounded-lg border border-border bg-black"
    }
  ), /* @__PURE__ */ t.createElement(
    "div",
    {
      ref: pe,
      onPointerDown: Re,
      className: "absolute inset-0 cursor-crosshair select-none touch-none"
    },
    x.map((e, n) => /* @__PURE__ */ t.createElement(
      "div",
      {
        key: e.id,
        className: `absolute top-0 bottom-0 opacity-40 pointer-events-none ${H[n % H.length]}`,
        style: { left: _(e.start), width: _(e.end - e.start) }
      }
    )),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 bg-white/10 border-x border-white/40 pointer-events-none",
        style: { left: _(i), width: _(u - i) }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: `absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_4px_rgba(0,0,0,0.9)] pointer-events-none z-10 ${re ? "" : "transition-[left] duration-150"}`,
        style: { left: _(R) }
      }
    ),
    re && /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute -top-8 px-2 py-0.5 rounded bg-black/85 text-white text-[11px] font-mono pointer-events-none -translate-x-1/2 z-30",
        style: { left: _(R) }
      },
      f(R)
    ),
    /* @__PURE__ */ t.createElement(he, { which: "start", time: i }),
    /* @__PURE__ */ t.createElement(he, { which: "end", time: u })
  )), /* @__PURE__ */ t.createElement("div", { className: "mt-1 flex justify-between items-center" }, /* @__PURE__ */ t.createElement("p", { className: "text-[10px] text-text-dim" }, r("timeline_hint", "Podrž myš na ose a ťahaj pre živý náhľad. Klik nastaví bližšiu značku.")), /* @__PURE__ */ t.createElement("span", { className: "text-[11px] font-mono text-text-dim" }, f(R), " / ", f(g))), /* @__PURE__ */ t.createElement("div", { className: "mt-3 grid grid-cols-3 gap-3 items-end" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, r("start", "Štart")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: f(i),
      key: `s-${i.toFixed(2)}`,
      onBlur: (e) => De(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, r("end", "Koniec")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: f(u),
      key: `e-${u.toFixed(2)}`,
      onBlur: (e) => Te(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim font-mono" }, f(u - i)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Pe,
      disabled: m || u - i < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    r("add_cut", "Pridať úsek")
  )))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-3" }, r("segments", "Úseky"), " (", x.length, ") · ", f(ge)), /* @__PURE__ */ t.createElement("div", { className: "space-y-1.5" }, x.map((e, n) => /* @__PURE__ */ t.createElement("div", { key: e.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: `w-2.5 h-2.5 rounded-full ${H[n % H.length]}` }), /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium" }, r("segment", "Úsek"), " ", n + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim" }, f(e.start), " → ", f(e.end)), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, "(", f(e.end - e.start), ")"), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => Ve(e.id),
      disabled: m,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "✕"
  ))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, r("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("cut_mode", "Režim strihu")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => le("copy"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${U === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_copy", "Rýchly (bez prekódovania)")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => le("precise"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${U === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    r("mode_precise", "Presný (prekódovanie)")
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, r("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame."))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: de,
      onChange: (e) => Ce(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, r("output_dir", "Výstupný priečinok")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await v.pickDirectory();
        e && Z(e);
      },
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    T ? r("change", "Zmeniť") : r("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, T || r("default_output", "(predvolený priečinok)")), T && /* @__PURE__ */ t.createElement("button", { onClick: () => Z(""), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: J,
      onChange: (e) => _e(e.target.checked),
      disabled: m,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, r("merge_after", "Úseky aj spojiť do jedného súboru"))), J && /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2 pl-7" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: W,
      onChange: (e) => ce(e.target.checked),
      disabled: m,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("music", "Hudba")), W && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await v.pickFiles(Je, !1);
        e && !Array.isArray(e) && q(e);
      },
      disabled: m,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    D ? ne(D) : r("pick_music", "Vybrať hudbu")
  ), D && /* @__PURE__ */ t.createElement("button", { onClick: () => q(null), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: ie,
      onChange: (e) => Se(e.target.checked),
      disabled: m,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), r("loop_music", "Slučka"))))), ue && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, ue), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, P.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, P.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement(
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
  ))))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ae,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    r("cancel_all", "Zrušiť všetko")
  ), !m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Xe,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    r("new_cut", "Nové strihanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: ze,
      disabled: m || !a,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    r("export", "Exportovať"),
    " (",
    x.length,
    " ",
    r("pieces", "dielov"),
    " · ",
    f(ge),
    ")"
  )), me.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, r("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, me.map((e, n) => /* @__PURE__ */ t.createElement("div", { key: n }, e))))));
}
export {
  qe as default
};
