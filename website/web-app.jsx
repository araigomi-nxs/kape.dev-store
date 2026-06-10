// ============ Website Builder · app shell ============

function loadWebCfg() {
  try {
    const raw = localStorage.getItem("kape_web_cfg");
    if (raw) {
      const c = { ...window.WEB_DEFAULT_CFG, ...JSON.parse(raw) };
      if (c.template && !window.WEB_TEMPLATES[c.template]) c.template = null;
      return c;
    }
  } catch (e) {}
  return { ...window.WEB_DEFAULT_CFG };
}

// floating control bar shown while customizing
function TweaksBar({ cfg, r, set, onBack, onReset, onSubmit }) {
  return (
    <div className="wb-bar">
      <button className="wb-btn" onClick={onBack}>← Templates</button>
      <span className="wb-sep" />
      <div className="wb-swatches">
        {window.WEB_ACCENTS.map((c) => (
          <button
            key={c}
            className={"wb-dot" + (r.accent.toLowerCase() === c.toLowerCase() ? " on" : "")}
            style={{ background: c }}
            title={c}
            onClick={() => set({ accent: c })}
          />
        ))}
        <label className="wb-dot custom" title="Custom colour">
          <input type="color" value={r.accent} onChange={(e) => set({ accent: e.target.value })} />
          <span style={{ background: r.accent }}>+</span>
        </label>
      </div>
      <span className="wb-sep" />
      <div className="wb-fonts">
        {Object.entries(window.WEB_FONTS).map(([k, f]) => (
          <button
            key={k}
            className={"wb-font" + (r.fontKey === k ? " on" : "")}
            style={{ fontFamily: f.stack }}
            title={f.name + " · " + f.note}
            onClick={() => set({ font: k })}
          >Ag</button>
        ))}
      </div>
      <span className="wb-sep" />
      <button className="wb-btn" onClick={onReset}>Reset text</button>
      <button className="wb-btn solid" onClick={onSubmit}>Commission this site →</button>
    </div>
  );
}

function App() {
  const [cfg, setCfg] = useState(loadWebCfg);
  const [view, setView] = useState("gallery");
  const [modal, setModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    try { localStorage.setItem("kape_web_cfg", JSON.stringify(cfg)); } catch (e) {}
  }, [cfg]);

  // Esc: first press commits/blurs any text being edited, next press backs out
  // of customize mode (modal handles its own close)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || modal) return;
      const t = e.target;
      if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) { t.blur(); return; }
      setView("gallery");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const toast = (m) => { setToastMsg(m); clearTimeout(window.__wt); window.__wt = setTimeout(() => setToastMsg(null), 2400); };

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const onEdit = (field, value) => setCfg((c) => ({
    ...c,
    content: { ...c.content, [c.template]: { ...(c.content[c.template] || {}), [field]: value } },
  }));

  const pick = (k) => {
    setCfg((c) => (c.template === k ? c : { ...c, template: k, accent: null, font: null, rev: (c.rev || 0) + 1 }));
    setView("edit");
    window.scrollTo(0, 0);
  };

  const resetText = () => {
    setCfg((c) => ({ ...c, content: { ...c.content, [c.template]: {} }, rev: (c.rev || 0) + 1 }));
    toast("Text reset to template copy");
  };

  if (view === "gallery" || !cfg.template) {
    return (
      <>
        <Gallery onPick={pick} resumeKey={Object.keys(cfg.content).some((k) => Object.keys(cfg.content[k] || {}).length) ? cfg.template : null} />
        <div className={"toast" + (toastMsg ? " show" : "")}><span className="ic">✓</span>{toastMsg}</div>
      </>
    );
  }

  const r = window.resolveWeb(cfg);

  return (
    <div className="wb-edit">
      <div className="wb-chip">
        <b>{r.t.name}</b>
        <span>click any text on the page — replace it with your own words</span>
      </div>

      <div className="wb-site">
        <TemplateView cfg={cfg} onEdit={onEdit} />
      </div>

      <TweaksBar
        cfg={cfg} r={r} set={set}
        onBack={() => setView("gallery")}
        onReset={resetText}
        onSubmit={() => setModal(true)}
      />

      {modal && <WebReviewModal cfg={cfg} onClose={() => setModal(false)} toast={toast} />}

      <div className={"toast" + (toastMsg ? " show" : "")}><span className="ic">✓</span>{toastMsg}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
