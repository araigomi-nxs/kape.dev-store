// ============ POS Builder · app ============
const { useState: useS, useEffect: useE } = React;

function loadCfg() {
  try {
    const raw = localStorage.getItem("kape_pos_cfg");
    if (raw) return { ...window.DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...window.DEFAULT_CONFIG };
}

function App() {
  const [cfg, setCfg] = useS(loadCfg);
  const [modal, setModal] = useS(null); // null | 'submit' | 'export'
  const [toastMsg, setToastMsg] = useS(null);

  useE(() => {
    try { localStorage.setItem("kape_pos_cfg", JSON.stringify(cfg)); } catch (e) {}
  }, [cfg]);

  const toast = (m) => { setToastMsg(m); clearTimeout(window.__t); window.__t = setTimeout(() => setToastMsg(null), 2400); };

  const set = {
    patch: (o) => setCfg((c) => ({ ...c, ...o })),
    preset: (k) => setCfg((c) => {
      const p = window.PRESETS[k];
      return { ...c, preset: k, cart: p.cart, menuCols: p.menuCols, sections: { ...c.sections, cart: p.cart !== "none" } };
    }),
    availableTabs: () => window.ALL_TABS.filter((t) => !cfg.tabs.includes(t)),
    addTab: (t) => setCfg((c) => {
      const avail = window.ALL_TABS.filter((x) => !c.tabs.includes(x));
      const add = t || avail[0];
      if (!add || c.tabs.length >= 6) return c;
      return { ...c, tabs: [...c.tabs, add], sections: { ...c.sections, tabs: true }, selected: "tabs" };
    }),
    removeTab: (i) => setCfg((c) => c.tabs.length <= 1 ? c : { ...c, tabs: c.tabs.filter((_, j) => j !== i) }),
  };

  const onPick = (id) => set.patch({ selected: id });

  const sel = cfg.selected ? (window.SECTION_DEFS.find((s) => s.id === cfg.selected) || {}).label : null;

  return (
    <div className="app">
      <TopBar cfg={cfg} set={set} onExport={() => setModal("export")} onSubmit={() => setModal("submit")} />
      <div className="body">
        <LeftPanel cfg={cfg} set={set} />

        <div className="canvas">
          <div className="canvas-top">
            <span className="pill"><b>{window.PRESETS[cfg.preset].name}</b> · {window.DEVICES[cfg.device].name}</span>
            <span className="pill">{sel ? <>selected: <b>{sel}</b></> : <>click an element to select →</>}</span>
            <div className="grow" />
            <span className="pill">live preview · saves automatically</span>
          </div>
          <POSPreview cfg={cfg} pickMode={true} onPick={onPick} onResize={set.patch} />
        </div>

        <Inspector cfg={cfg} set={set} />
      </div>

      {modal && <ReviewModal cfg={cfg} mode={modal} onClose={() => setModal(null)} toast={toast} />}

      <div className={"toast" + (toastMsg ? " show" : "")}>
        <span className="ic">✓</span>{toastMsg}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
