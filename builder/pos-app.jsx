// ============ POS Builder · app ============
const { useState: useS, useEffect: useE } = React;

function loadCfg() {
  try {
    const raw = localStorage.getItem("kape_pos_cfg");
    if (raw) {
      const c = { ...window.DEFAULT_CONFIG, ...JSON.parse(raw) };
      // guard against stale values from older builds (e.g. a removed preset)
      if (!window.PRESETS[c.preset]) c.preset = window.DEFAULT_CONFIG.preset;
      return c;
    }
  } catch (e) {}
  return { ...window.DEFAULT_CONFIG };
}

// Undo history lives in a past/present/future model. `setCfg` keeps the exact
// signature the rest of the app expects (value or updater fn), so every set.*
// method records history for free. Changes that only move the `selected`
// highlight are treated as transient — they update the view but don't create an
// undo step, so Undo never feels like a no-op.
const HIST_MAX = 60;
const _stripSel = (c) => { const { selected, ...rest } = c; return rest; };
const selectionOnlyChange = (a, b) =>
  JSON.stringify(_stripSel(a)) === JSON.stringify(_stripSel(b));

function App() {
  const [hist, setHist] = useS(() => ({ past: [], present: loadCfg(), future: [] }));
  const cfg = hist.present;
  const [modal, setModal] = useS(null); // null | 'submit' | 'export'
  const [view, setView] = useS("gallery"); // gallery (full-page template selector — the landing view) | builder
  const [visited, setVisited] = useS(false); // gallery reopened from inside the builder
  const [toastMsg, setToastMsg] = useS(null);

  const setCfg = (updater) => setHist((h) => {
    const next = typeof updater === "function" ? updater(h.present) : updater;
    if (next === h.present) return h; // genuine no-op (e.g. guarded updaters)
    if (selectionOnlyChange(next, h.present)) return { ...h, present: next };
    return { past: [...h.past, h.present].slice(-HIST_MAX), present: next, future: [] };
  });

  const undo = () => setHist((h) => h.past.length
    ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future].slice(0, HIST_MAX) }
    : h);
  const redo = () => setHist((h) => h.future.length
    ? { past: [...h.past, h.present].slice(-HIST_MAX), present: h.future[0], future: h.future.slice(1) }
    : h);
  const reset = () => setHist((h) => ({ past: [...h.past, h.present].slice(-HIST_MAX), present: { ...window.DEFAULT_CONFIG }, future: [] }));

  useE(() => {
    try { localStorage.setItem("kape_pos_cfg", JSON.stringify(cfg)); } catch (e) {}
  }, [cfg]);

  // Ctrl/Cmd+Z undo · Ctrl+Shift+Z / Ctrl+Y redo — but let inputs keep native text undo.
  useE(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toast = (m) => { setToastMsg(m); clearTimeout(window.__t); window.__t = setTimeout(() => setToastMsg(null), 2400); };

  const set = {
    patch: (o) => setCfg((c) => ({ ...c, ...o })),
    preset: (k) => setCfg((c) => {
      const p = window.PRESETS[k];
      return { ...c, skin: "classic", preset: k, cart: p.cart, menuCols: p.menuCols, sections: { ...c.sections, cart: p.cart !== "none" } };
    }),
    applyTemplate: (k) => setCfg((c) => {
      const t = window.TEMPLATES[k];
      if (!t) return c;
      return { ...c, ...t.cfg, sections: { ...c.sections, ...t.cfg.sections } };
    }),
    availableTabs: () => window.ALL_TABS.filter((t) => !cfg.tabs.includes(t)),
    addTab: (t) => setCfg((c) => {
      const avail = window.ALL_TABS.filter((x) => !c.tabs.includes(x));
      const add = t || avail[0];
      if (!add || c.tabs.length >= 6) return c;
      return { ...c, tabs: [...c.tabs, add], sections: { ...c.sections, tabs: true }, selected: "tabs" };
    }),
    removeTab: (i) => setCfg((c) => c.tabs.length <= 1 ? c : { ...c, tabs: c.tabs.filter((_, j) => j !== i) }),
    mode: (m) => setCfg((c) => ({ ...c, canvasMode: m })),
    useCustom: () => setCfg((c) => {
      if (c.palette === "custom") return c;
      const p = window.PALETTES[c.palette] || window.PALETTES.coffee;
      const seed = c.customPalette || { accent: p.accent, bg: p.bg, surface: p.surface, text: p.text };
      return { ...c, palette: "custom", customPalette: seed };
    }),
    customColor: (k, v) => setCfg((c) => ({ ...c, palette: "custom", customPalette: { ...(c.customPalette || window.DEFAULT_CUSTOM), [k]: v } })),
    receipt: (o) => setCfg((c) => ({ ...c, receipt: { ...(c.receipt || window.RECEIPT_DEFAULTS), ...o } })),
    receiptEl: (id) => setCfg((c) => {
      const def = window.RECEIPT_DEFS.find((d) => d.id === id);
      if (def && def.locked) return c;
      const rc = c.receipt || window.RECEIPT_DEFAULTS;
      return { ...c, receipt: { ...rc, elements: { ...rc.elements, [id]: !rc.elements[id] } } };
    }),
  };

  const onPick = (id) => set.patch({ selected: id });

  const sel = cfg.selected ? (window.SECTION_DEFS.find((s) => s.id === cfg.selected) || {}).label : null;
  const receiptMode = cfg.canvasMode === "receipt";

  // full-page orbital template selector — same page as the website builder.
  // It's the landing view; "back to builder" only appears once the user has
  // actually been in the builder (otherwise the link points home, to the store).
  if (view === "gallery") {
    return (
      <>
        <Gallery
          cfg={cfg}
          onBack={visited ? () => setView("builder") : null}
          onPick={(k) => {
            // picking the already-applied design just resumes — re-applying
            // would wipe the customer's saved tweaks (palette, font, sections)
            if (cfg.skin !== k) {
              set.applyTemplate(k);
              toast(window.TEMPLATES[k].name + " applied — customize away");
            }
            setView("builder");
          }}
        />
        <div className={"toast" + (toastMsg ? " show" : "")}><span className="ic">✓</span>{toastMsg}</div>
      </>
    );
  }

  return (
    <div className="app">
      <TopBar cfg={cfg} set={set}
        canUndo={hist.past.length > 0} canRedo={hist.future.length > 0}
        onUndo={undo} onRedo={redo}
        onReset={() => { reset(); toast("Reset to defaults · press Undo to restore"); }}
        onReadyMade={() => { setVisited(true); setView("gallery"); }} onExport={() => setModal("export")} onSubmit={() => setModal("submit")} />
      <div className="body">
        {receiptMode ? <ReceiptLayers cfg={cfg} set={set} /> : <LeftPanel cfg={cfg} set={set} />}

        <div className="canvas">
          <div className="canvas-top">
            {receiptMode ? (
              <>
                <span className="pill"><b>Receipt</b> · {(window.RECEIPT_PAPERS[(cfg.receipt || {}).paper] || window.RECEIPT_PAPERS["80mm"]).name}</span>
                <span className="pill">printed receipt preview</span>
              </>
            ) : (
              <>
                <span className="pill"><b>{cfg.skin && window.SKINS[cfg.skin] ? (cfg.skin[0].toUpperCase() + cfg.skin.slice(1)) : window.PRESETS[cfg.preset].name}</b> · {window.DEVICES[cfg.device].name}</span>
                <span className="pill">{cfg.skin && window.SKINS[cfg.skin] ? <>ready-made design · edit theme &amp; font →</> : sel ? <>selected: <b>{sel}</b></> : <>click an element to select →</>}</span>
              </>
            )}
            <div className="grow" />
            <span className="pill">live preview · saves automatically</span>
          </div>
          {receiptMode
            ? <ReceiptPreview cfg={cfg} />
            : <POSPreview cfg={cfg} pickMode={true} onPick={onPick} onResize={set.patch} />}
        </div>

        {receiptMode ? <ReceiptInspector cfg={cfg} set={set} /> : <Inspector cfg={cfg} set={set} />}
      </div>

      {(modal === "submit" || modal === "export") && <ReviewModal cfg={cfg} mode={modal} onClose={() => setModal(null)} toast={toast} />}

      <div className={"toast" + (toastMsg ? " show" : "")}>
        <span className="ic">✓</span>{toastMsg}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
