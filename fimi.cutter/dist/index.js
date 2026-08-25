const t = window.React;
t.useState;
t.useEffect;
t.useMemo;
t.useRef;
t.useCallback;
const p = window.SkyFrame, o = (s, v) => p.t(s, v), { useState: b, useEffect: G, useMemo: Ye, useRef: I } = window.React, je = [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi"] }], et = [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }], Q = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6"], Pe = "#22c55e", De = "#ef4444", le = 16;
function Y(s) {
  return s.split(/[\\/]/).pop() ?? s;
}
function f(s) {
  const v = Math.max(0, s), R = Math.floor(v / 3600), k = Math.floor(v % 3600 / 60), l = v % 60, w = `${R.toString().padStart(2, "0")}:${k.toString().padStart(2, "0")}:${Math.floor(l).toString().padStart(2, "0")}`, u = Math.round((l - Math.floor(l)) * 10);
  return u ? `${w}.${u}` : w;
}
function Fe(s) {
  const v = s.trim().split(":");
  if (v.length === 3) {
    const [k, l, w] = v.map(parseFloat);
    if ([k, l, w].every((u) => !isNaN(u))) return k * 3600 + l * 60 + w;
  } else if (v.length === 2) {
    const [k, l] = v.map(parseFloat);
    if (!isNaN(k) && !isNaN(l)) return k * 60 + l;
  }
  const R = parseFloat(s);
  return isNaN(R) ? 0 : R;
}
function ce() {
  return Math.random().toString(36).slice(2, 9);
}
function tt() {
  var _e;
  const [s, v] = b(null), [R, k] = b(0), [l, w] = b(0), [u, L] = b(0), [z, j] = b(0), [ie, de] = b(!1), [me, ue] = b(null), [x, T] = b([]), [P, ee] = b("copy"), [D, pe] = b(!1), [F, te] = b(!1), [M, X] = b(null), [H, be] = b(!0), [B, xe] = b("cut"), [U, re] = b(""), [W, _] = b([]), [fe, Ve] = b([]), [ge, $] = b(""), [he, ve] = b(!1), V = I(!1), Ee = I(null), ye = I(null), Ne = I(null), J = I(null), A = I(null), O = I(null), E = (e) => Ve((r) => [...r.slice(-199), `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`]), g = (_e = s == null ? void 0 : s.info) != null && _e.duration && s.info.duration > 0 ? s.info.duration : R, m = W.some((e) => e.status === "running"), we = Ye(() => x.reduce((e, r) => e + (r.end - r.start), 0), [x]);
  G(() => {
    p.invoke("get_last_output_dir").then((e) => {
      e && re(e);
    }).catch(() => {
    }), (async () => {
      try {
        const e = await p.invoke("get_module_config", { id: p.moduleId }), r = e == null ? void 0 : e.session;
        if (!r) {
          ve(!0);
          return;
        }
        if (w(r.selStart ?? 0), L(r.selEnd ?? 0), T((r.segments ?? []).map((a) => ({ id: ce(), start: a.start, end: a.end }))), (r.mode === "copy" || r.mode === "precise") && ee(r.mode), pe(!!r.mergeAfter), te(!!r.withMusic), X(r.music ?? null), be(r.loopMusic !== !1), r.outputName && xe(r.outputName), r.videoPath) {
          let a = null;
          try {
            a = await p.invoke("get_video_info", { path: r.videoPath });
          } catch {
          }
          a && (v({ path: r.videoPath, info: a }), E(`${o("loaded", "Načítané")}: ${Y(r.videoPath)} (${f(a.duration)})`));
        }
      } catch {
      }
      ve(!0);
    })();
  }, []), G(() => {
    if (!(!he || m))
      return O.current && clearTimeout(O.current), O.current = setTimeout(() => {
        const e = {
          videoPath: (s == null ? void 0 : s.path) ?? null,
          selStart: l,
          selEnd: u,
          segments: x.map((r) => ({ start: r.start, end: r.end })),
          mode: P,
          mergeAfter: D,
          withMusic: F,
          music: M,
          loopMusic: H,
          outputName: B
        };
        p.invoke("set_module_config", { id: p.moduleId, config: { session: e } }).catch(() => {
        });
      }, 600), () => {
        O.current && clearTimeout(O.current);
      };
  }, [s, l, u, x, P, D, F, M, H, B, he, m]);
  const ne = () => {
    var e;
    return ((e = ye.current) == null ? void 0 : e.querySelector("video")) ?? null;
  }, q = (e) => {
    const r = ne();
    if (r)
      try {
        r.pause(), r.currentTime = Math.max(0, Math.min(g || r.duration || e, e));
      } catch {
      }
    j(Math.max(0, Math.min(g || e, e)));
  };
  G(() => {
    if (!s) return;
    const e = setInterval(() => {
      const r = ne();
      r && (!A.current && !J.current && !isNaN(r.currentTime) && j(r.currentTime), g <= 0 && r.duration && isFinite(r.duration) && (k(r.duration), L((a) => a <= 0 ? r.duration : a)));
    }, 200);
    return () => clearInterval(e);
  }, [s == null ? void 0 : s.path, g]), G(() => {
    if (!s || g <= 0) return;
    let e = !1, r = null, a = null;
    const c = (d) => {
      const n = Ne.current;
      if (!n || e) return;
      const i = 960, h = 56;
      n.width = i, n.height = h;
      const N = n.getContext("2d");
      if (!N) return;
      N.fillStyle = "#000", N.fillRect(0, 0, i, h);
      const y = document.createElement("video");
      y.muted = !0, y.preload = "auto";
      const C = i / le, Se = (Z) => {
        if (e || Z >= le) return;
        const Qe = Math.min(Math.max(0.05, (Z + 0.5) / le * g), Math.max(0.05, g - 0.05));
        let Ce = !1;
        const ae = () => {
          if (!Ce) {
            Ce = !0, y.removeEventListener("seeked", Ie);
            try {
              const se = y.videoWidth, oe = y.videoHeight;
              if (se && oe && !e) {
                const Re = Math.max(C / se, h / oe), Le = se * Re, Te = oe * Re;
                N.drawImage(y, Z * C + (C - Le) / 2, (h - Te) / 2, Le, Te);
              }
            } catch {
            }
            Se(Z + 1);
          }
        }, Ie = () => ae();
        y.addEventListener("seeked", Ie), setTimeout(ae, 900);
        try {
          y.currentTime = Qe;
        } catch {
          ae();
        }
      };
      y.addEventListener("loadeddata", () => Se(0)), y.addEventListener("error", () => {
      }), y.src = d;
    };
    return r = setInterval(() => {
      if (e) {
        r && clearInterval(r);
        return;
      }
      const d = ne();
      d && d.src && (r && clearInterval(r), c(d.src));
    }, 500), a = setTimeout(() => {
      r && clearInterval(r);
    }, 3e4), () => {
      e = !0, r && clearInterval(r), a && clearTimeout(a);
    };
  }, [s == null ? void 0 : s.path, g]);
  const Ae = async () => {
    const e = await p.pickFiles(je, !1);
    if (!e || Array.isArray(e)) return;
    let r = null;
    try {
      r = await p.invoke("get_video_info", { path: e });
    } catch {
    }
    v({ path: e, info: r }), k(0), w(0), L((r == null ? void 0 : r.duration) ?? 0), j(0), T([]), _([]), $(""), E(`${o("loaded", "Načítané")}: ${Y(e)}${r ? ` (${f(r.duration)}, ${r.width}×${r.height})` : ""}`);
  }, K = (e) => {
    const r = Ee.current;
    if (!r || g <= 0) return 0;
    const a = r.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e - a.left) / a.width)) * g;
  }, Oe = (e) => {
    if (!s || m) return;
    e.preventDefault(), A.current = { startX: e.clientX, moved: !1 };
    const r = K(e.clientX), a = (d) => {
      const n = A.current;
      n && (!n.moved && Math.abs(d.clientX - n.startX) < 4 || (n.moved = !0, de(!0), q(K(d.clientX))));
    }, c = (d) => {
      const n = A.current;
      if (A.current = null, de(!1), window.removeEventListener("pointermove", a), window.removeEventListener("pointerup", c), !n) return;
      const i = K(d.clientX);
      n.moved || (Math.abs(i - l) <= Math.abs(i - u) ? w(Math.min(i, u - 0.1)) : L(Math.max(i, l + 0.1))), q(i);
    };
    window.addEventListener("pointermove", a), window.addEventListener("pointerup", c), q(r);
  }, ze = (e) => (r) => {
    r.stopPropagation(), r.preventDefault(), J.current = e, ue(e);
    const a = (d) => {
      const n = K(d.clientX);
      J.current === "start" ? w((i) => {
        const h = Math.min(n, u - 0.1);
        return h >= 0 ? h : i;
      }) : L((i) => {
        const h = Math.max(n, l + 0.1);
        return h <= g ? h : i;
      }), q(n);
    }, c = () => {
      J.current = null, ue(null), window.removeEventListener("pointermove", a), window.removeEventListener("pointerup", c);
    };
    window.addEventListener("pointermove", a), window.addEventListener("pointerup", c);
  }, Xe = (e) => w(Math.max(0, Math.min(Fe(e), u - 0.1))), He = (e) => L(Math.min(g, Math.max(Fe(e), l + 0.1))), Be = () => {
    if (!(!s || u - l < 0.1)) {
      if (x.some((e) => Math.abs(e.start - l) < 0.5 && Math.abs(e.end - u) < 0.5)) {
        $(o("seg_exists", "Tento úsek už existuje."));
        return;
      }
      $(""), T((e) => [...e, { id: ce(), start: l, end: u }].sort((r, a) => r.start - a.start));
    }
  }, Ue = (e) => T((r) => r.filter((a) => a.id !== e)), ke = (e) => new Promise((r) => {
    let a;
    p.listenJob(e, (c) => {
      _((d) => d.map((n) => n.id === e ? c : n)), c.status !== "running" && (a == null || a(), r(c));
    }).then((c) => {
      a = c;
    });
  }), We = (e) => _((r) => [
    ...r,
    {
      id: `pending-${ce()}`,
      moduleId: p.moduleId,
      label: e,
      status: "running",
      progress: -1,
      message: o("queued", "Čaká v rade"),
      result: null
    }
  ]), Je = (e, r) => _(
    (a) => a.map((c) => c.label === e && c.id.startsWith("pending") ? { ...c, id: r, progress: 0, message: "" } : c)
  ), $e = async (e, r, a, c) => {
    We(r);
    const d = await p.invoke("merge_videos", {
      files: e,
      outputName: r,
      music: a,
      moduleId: p.moduleId,
      outputDir: c,
      loopMusic: H
    });
    Je(r, d), E(`▶ ${r} (${e.length} ${o("pieces", "dielov")}${a ? " + hudba" : ""})`);
    const n = await ke(d);
    return n.status === "done" && n.result ? (E(`✓ ${n.result}`), n.result) : (n.status === "error" ? ($(n.message), E(`✗ ${n.message}`)) : E(`⊘ ${r}`), null);
  }, qe = async () => {
    if (!s || x.length === 0) return;
    $(""), V.current = !1;
    const e = B.trim() || "cut", r = U || null, a = F && !!M, c = x.map(
      (n, i) => a || D ? `${e}_${i + 1}_tmp` : `${e}_${i + 1}`
    );
    _(
      x.map((n, i) => ({
        id: `pending-${i}`,
        moduleId: p.moduleId,
        label: c[i],
        status: "running",
        progress: -1,
        message: o("queued", "Čaká v rade"),
        result: null
      }))
    ), E(`${o("export_start", "Exportujem")} ${x.length} ${o("pieces", "dielov")}…`);
    const d = [];
    for (let n = 0; n < x.length && !V.current; n++) {
      const i = x[n];
      try {
        const h = await p.invoke("trim_video", {
          input: s.path,
          start: i.start,
          end: i.end,
          mode: P,
          outputName: c[n],
          outputDir: r,
          moduleId: p.moduleId
        });
        _((y) => {
          const C = [...y];
          return C[n] = { ...C[n], id: h, progress: 0, message: "" }, C;
        }), E(`▶ ${c[n]} (${f(i.start)} → ${f(i.end)})`);
        const N = await ke(h);
        if (N.status === "done" && N.result)
          d.push(N.result), E(`✓ ${N.result}`);
        else if (N.status === "error") {
          E(`✗ ${c[n]}: ${N.message}`), $(N.message);
          return;
        } else {
          E(`⊘ ${c[n]}`);
          return;
        }
      } catch (h) {
        $(String(h)), E(String(h));
        return;
      }
    }
    if (!(V.current || d.length === 0)) {
      try {
        if (D)
          await $e(d, `${e}_merged`, a ? M : null, r);
        else if (a)
          for (let n = 0; n < d.length && !V.current; n++)
            await $e([d[n]], `${e}_${n + 1}`, M, r);
      } catch (n) {
        $(String(n)), E(String(n));
      }
      E(o("export_done", "Export dokončený."));
    }
  }, Ke = async () => {
    V.current = !0;
    for (const e of W)
      e.status === "running" && !e.id.startsWith("pending") && await p.cancelJob(e.id);
  }, Ze = () => {
    _([]), T([]), v(null), X(null), te(!1), $("");
  }, Ge = p.PlayerShell, S = (e) => `${g > 0 ? e / g * 100 : 0}%`, Me = ({ which: e, time: r }) => {
    const a = e === "start" ? Pe : De;
    return /* @__PURE__ */ t.createElement(
      "div",
      {
        onPointerDown: ze(e),
        className: "absolute z-20 cursor-ew-resize touch-none",
        style: { left: `calc(${S(r)} - 11px)`, width: 22, top: -8, bottom: -8 }
      },
      /* @__PURE__ */ t.createElement(
        "div",
        {
          className: "absolute left-1/2 -translate-x-1/2 rounded",
          style: { top: 0, bottom: 0, width: 4, backgroundColor: a, boxShadow: "0 0 6px rgba(0,0,0,0.8)" }
        }
      ),
      /* @__PURE__ */ t.createElement(
        "div",
        {
          className: "absolute left-1/2 flex flex-col items-center justify-center gap-[3px] rounded-md border",
          style: {
            top: "50%",
            transform: `translate(-50%, -50%)${me === e ? " scale(1.15)" : ""}`,
            width: 22,
            height: 36,
            backgroundColor: a,
            borderColor: "rgba(255,255,255,0.5)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.6)"
          }
        },
        /* @__PURE__ */ t.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } }),
        /* @__PURE__ */ t.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } }),
        /* @__PURE__ */ t.createElement("div", { style: { width: 10, height: 2, backgroundColor: "#fff", borderRadius: 2 } })
      ),
      me === e && /* @__PURE__ */ t.createElement(
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
  return /* @__PURE__ */ t.createElement("div", { className: "p-6" }, /* @__PURE__ */ t.createElement("div", { className: "max-w-4xl mx-auto space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, o("video", "Video")), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ae,
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
    },
    s ? o("change_video", "Zmeniť video") : o("pick_video", "Vybrať video")
  )), s && /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("p", { className: "text-xs font-mono text-text-dim break-all" }, Y(s.path), " · ", f(g), s.info ? ` · ${s.info.width}×${s.info.height} · ${s.info.codec}` : ""), /* @__PURE__ */ t.createElement("div", { ref: ye, className: "rounded-xl overflow-hidden border border-border bg-black" }, /* @__PURE__ */ t.createElement(Ge, { src: s.path })), /* @__PURE__ */ t.createElement("div", { className: "pt-3 pb-3" }, /* @__PURE__ */ t.createElement("div", { className: "relative" }, /* @__PURE__ */ t.createElement(
    "canvas",
    {
      ref: Ne,
      className: "block w-full h-16 rounded-lg border border-border bg-black"
    }
  ), /* @__PURE__ */ t.createElement(
    "div",
    {
      ref: Ee,
      onPointerDown: Oe,
      className: "absolute inset-0 cursor-crosshair select-none touch-none"
    },
    x.map((e, r) => /* @__PURE__ */ t.createElement(
      "div",
      {
        key: e.id,
        className: "absolute top-0 bottom-0 pointer-events-none",
        style: { left: S(e.start), width: S(e.end - e.start), backgroundColor: Q[r % Q.length], opacity: 0.4 }
      }
    )),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 pointer-events-none",
        style: {
          left: S(l),
          width: S(u - l),
          backgroundColor: "rgba(255,255,255,0.12)",
          borderLeft: `2px solid ${Pe}`,
          borderRight: `2px solid ${De}`
        }
      }
    ),
    /* @__PURE__ */ t.createElement(
      "div",
      {
        className: `absolute w-[2px] bg-white pointer-events-none z-10 ${ie ? "" : "transition-[left] duration-150"}`,
        style: { left: S(z), top: -6, bottom: -6, boxShadow: "0 0 4px rgba(0,0,0,0.9)" }
      }
    ),
    ie && /* @__PURE__ */ t.createElement(
      "div",
      {
        className: "absolute px-2 py-0.5 rounded text-[11px] font-mono pointer-events-none -translate-x-1/2 z-30",
        style: { left: S(z), top: -32, backgroundColor: "rgba(0,0,0,0.85)", color: "#fff" }
      },
      f(z)
    ),
    /* @__PURE__ */ t.createElement(Me, { which: "start", time: l }),
    /* @__PURE__ */ t.createElement(Me, { which: "end", time: u })
  )), /* @__PURE__ */ t.createElement("div", { className: "mt-1 flex justify-between items-center" }, /* @__PURE__ */ t.createElement("p", { className: "text-[10px] text-text-dim" }, o("timeline_hint", "Podrž myš na ose a ťahaj pre živý náhľad. Klik nastaví bližšiu značku.")), /* @__PURE__ */ t.createElement("span", { className: "text-[11px] font-mono text-text-dim" }, f(z), " / ", f(g)))), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-3 gap-3 items-end" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, o("start", "Štart")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: f(l),
      key: `s-${l.toFixed(2)}`,
      onBlur: (e) => Xe(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1" }, o("end", "Koniec")), /* @__PURE__ */ t.createElement(
    "input",
    {
      defaultValue: f(u),
      key: `e-${u.toFixed(2)}`,
      onBlur: (e) => He(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2 bg-bg rounded-lg border border-border text-sm font-mono text-text outline-none focus:border-accent/50 disabled:opacity-40"
    }
  )), /* @__PURE__ */ t.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim font-mono" }, f(u - l)), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Be,
      disabled: m || u - l < 0.1,
      className: "px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    "+ ",
    o("add_cut", "Pridať úsek")
  ))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold mb-3" }, o("segments", "Úseky"), " (", x.length, ") · ", f(we)), /* @__PURE__ */ t.createElement("div", { className: "space-y-1.5" }, x.map((e, r) => /* @__PURE__ */ t.createElement("div", { key: e.id, className: "flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border" }, /* @__PURE__ */ t.createElement("span", { className: "w-2.5 h-2.5 rounded-full", style: { backgroundColor: Q[r % Q.length] } }), /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium" }, o("segment", "Úsek"), " ", r + 1), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim" }, f(e.start), " → ", f(e.end)), /* @__PURE__ */ t.createElement("span", { className: "text-xs text-text-dim" }, "(", f(e.end - e.start), ")"), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => Ue(e.id),
      disabled: m,
      className: "ml-auto px-2 py-1 rounded text-error hover:bg-error/10 text-xs disabled:opacity-30"
    },
    "✕"
  ))))), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, /* @__PURE__ */ t.createElement("h2", { className: "text-lg font-semibold" }, o("output", "Výstup")), /* @__PURE__ */ t.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, o("cut_mode", "Režim strihu")), /* @__PURE__ */ t.createElement("div", { className: "flex rounded-xl border border-border overflow-hidden" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => ee("copy"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${P === "copy" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    o("mode_copy", "Rýchly (bez prekódovania)")
  ), /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: () => ee("precise"),
      disabled: m,
      className: `flex-1 px-3 py-2.5 text-sm ${P === "precise" ? "bg-accent text-white" : "bg-bg text-text-dim hover:bg-bg-card-hover"}`
    },
    o("mode_precise", "Presný (prekódovanie)")
  )), /* @__PURE__ */ t.createElement("p", { className: "mt-1 text-[10px] text-text-dim" }, o("mode_hint", "Rýchly = bez re-enkódu (keyframe). Presný = pomalší, na frame."))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, o("output_name", "Názov súboru")), /* @__PURE__ */ t.createElement(
    "input",
    {
      value: B,
      onChange: (e) => xe(e.target.value),
      disabled: m,
      className: "w-full px-3 py-2.5 bg-bg rounded-xl border border-border text-sm text-text outline-none focus:border-accent/50"
    }
  ))), /* @__PURE__ */ t.createElement("div", null, /* @__PURE__ */ t.createElement("label", { className: "block text-xs text-text-dim mb-1.5" }, o("output_dir", "Výstupný priečinok")), /* @__PURE__ */ t.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await p.pickDirectory();
        e && re(e);
      },
      disabled: m,
      className: "px-4 py-2.5 rounded-xl text-sm bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    U ? o("change", "Zmeniť") : o("browse", "Vybrať…")
  ), /* @__PURE__ */ t.createElement("span", { className: "text-xs font-mono text-text-dim truncate flex-1" }, U || o("default_output", "(predvolený priečinok)")), U && /* @__PURE__ */ t.createElement("button", { onClick: () => re(""), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded" }, "✕"))), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: D,
      onChange: (e) => pe(e.target.checked),
      disabled: m,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, o("merge_after", "Úseky aj spojiť do jedného súboru"))), /* @__PURE__ */ t.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: F,
      onChange: (e) => te(e.target.checked),
      disabled: m,
      className: "w-4 h-4 accent-[#6366f1]"
    }
  ), /* @__PURE__ */ t.createElement("span", { className: "text-sm" }, o("music", "Hudba"))), F && /* @__PURE__ */ t.createElement("div", { className: "space-y-2 pl-7" }, /* @__PURE__ */ t.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: async () => {
        const e = await p.pickFiles(et, !1);
        e && !Array.isArray(e) && X(e);
      },
      disabled: m,
      className: "px-3 py-1.5 rounded-lg text-xs bg-bg-card-hover text-text-dim border border-border hover:text-text transition-colors"
    },
    M ? Y(M) : o("pick_music", "Vybrať hudbu")
  ), M && /* @__PURE__ */ t.createElement("button", { onClick: () => X(null), disabled: m, className: "px-2 py-1 text-error hover:bg-error/10 rounded text-xs" }, "✕"), /* @__PURE__ */ t.createElement("label", { className: "flex items-center gap-2 text-xs text-text-dim" }, /* @__PURE__ */ t.createElement(
    "input",
    {
      type: "checkbox",
      checked: H,
      onChange: (e) => be(e.target.checked),
      disabled: m,
      className: "w-3.5 h-3.5 accent-[#6366f1]"
    }
  ), o("loop_music", "Slučka (opakovať hudbu)"))), /* @__PURE__ */ t.createElement("p", { className: "text-[10px] text-text-dim" }, o("music_note", "Hudba sa pridá ku každému výstupu. Končí spolu s videom; ak je kratšia a slučka je vypnutá, video sa skráti na dĺžku hudby."))))), ge && /* @__PURE__ */ t.createElement("div", { className: "bg-error/10 border border-error/30 rounded-2xl p-4 text-sm text-error" }, ge), x.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-6 space-y-4" }, W.length > 0 ? /* @__PURE__ */ t.createElement(t.Fragment, null, /* @__PURE__ */ t.createElement("div", { className: "space-y-3" }, W.map((e) => /* @__PURE__ */ t.createElement("div", { key: e.id }, /* @__PURE__ */ t.createElement("div", { className: "flex justify-between items-center mb-1.5" }, /* @__PURE__ */ t.createElement("span", { className: "text-sm font-medium truncate" }, e.label), /* @__PURE__ */ t.createElement(
    "span",
    {
      className: `text-xs font-mono ${e.status === "error" ? "text-error" : e.status === "done" ? "text-success" : "text-text-dim"}`
    },
    e.status === "running" ? e.progress >= 0 ? `${Math.round(e.progress)}%${e.message ? ` · ${e.message}` : ""}` : e.message || "…" : e.status === "done" ? "✓" : e.status === "cancelled" ? o("cancelled", "zrušené") : e.status === "error" ? o("error", "chyba") : e.message
  )), /* @__PURE__ */ t.createElement("div", { className: "w-full h-2 bg-bg rounded-full overflow-hidden border border-border" }, /* @__PURE__ */ t.createElement(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${e.status === "error" ? "bg-error" : e.status === "done" ? "bg-success" : "bg-accent"}`,
      style: { width: e.status === "done" ? "100%" : `${Math.max(2, Math.min(100, e.progress))}%` }
    }
  ))))), /* @__PURE__ */ t.createElement("div", { className: "flex gap-2" }, m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ke,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
    },
    o("cancel_all", "Zrušiť všetko")
  ), !m && /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: Ze,
      className: "px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
    },
    o("new_cut", "Nové strihanie")
  ))) : /* @__PURE__ */ t.createElement(
    "button",
    {
      onClick: qe,
      disabled: m || !s,
      className: "w-full px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-dim transition-colors disabled:opacity-40"
    },
    o("export", "Exportovať"),
    " (",
    x.length,
    " ",
    o("pieces", "dielov"),
    " · ",
    f(we),
    ")"
  )), fe.length > 0 && /* @__PURE__ */ t.createElement("div", { className: "bg-bg-card rounded-2xl border border-border p-4" }, /* @__PURE__ */ t.createElement("h3", { className: "text-xs font-semibold text-text-dim uppercase tracking-wider mb-2" }, o("log", "Log")), /* @__PURE__ */ t.createElement("div", { className: "max-h-40 overflow-y-auto text-[11px] font-mono text-text-dim space-y-0.5" }, fe.map((e, r) => /* @__PURE__ */ t.createElement("div", { key: r }, e))))));
}
export {
  tt as default
};
