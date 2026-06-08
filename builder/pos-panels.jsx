// ============ POS Builder · panels ============

function ThemeToggle() {
  const [dark, setDark] = React.useState(
    document.documentElement.getAttribute("data-theme") !== "light"
  );
  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("kape-theme", next); } catch (e) {}
    setDark(!dark);
  };
  return (
    <button className="btn ghost icon" title="Toggle theme" onClick={flip}>
      {dark ? "☀" : "☾"}
    </button>
  );
}

function TopBar({ cfg, set, onExport, onSubmit }) {
  return (
    <div className="topbar">
      <a className="logo" href="../" title="Back to kape.dev">
        <div className="mark">k</div>
        <div className="txt"><b>POS Builder</b><small>kape.dev // commission studio</small></div>
      </a>
      <div className="tb-divider" />

      <div className="tb-group">
        <span className="mono">Preset</span>
        <div className="seg">
          {window.PRESET_ORDER.map((k) => (
            <button key={k} className={cfg.preset === k ? "on" : ""} onClick={() => set.preset(k)}>
              {window.PRESETS[k].name}
            </button>
          ))}
        </div>
      </div>

      <div className="tb-group">
        <span className="mono">Device</span>
        <div className="seg mini">
          {window.DEVICE_ORDER.map((k) => (
            <button key={k} className={cfg.device === k ? "on" : ""} onClick={() => set.patch({ device: k })}>
              <span className="pg">{window.DEVICES[k].glyph}</span>{window.DEVICES[k].name}
            </button>
          ))}
        </div>
      </div>

      <div className="grow" />
      <ThemeToggle />
      <button className="btn ghost" onClick={onExport}>↧ Export spec</button>
      <button className="btn solid" onClick={onSubmit}>Submit commission →</button>
    </div>
  );
}

// ---------------- Left: layers ----------------
function LeftPanel({ cfg, set }) {
  const cartHidden = cfg.cart === "none";
  const visOf = (id) => {
    if (id === "cart") return !cartHidden && cfg.sections.cart;
    return cfg.sections[id];
  };
  const toggle = (id, def) => {
    if (def.locked) return;
    if (id === "cart") {
      if (cartHidden) set.patch({ cart: "right", sections: { ...cfg.sections, cart: true } });
      else set.patch({ cart: "none" });
      return;
    }
    set.patch({ sections: { ...cfg.sections, [id]: !cfg.sections[id] } });
  };
  return (
    <div className="panel-col left">
      <div className="panel-head"><span className="mono">Sections / layers</span></div>
      <div className="panel-scroll">
        {window.SECTION_DEFS.map((def) => {
          const on = visOf(def.id);
          const sel = cfg.selected === def.id;
          return (
            <div key={def.id}
              className={"layer" + (sel ? " sel" : "") + (on ? "" : " off")}
              onClick={() => set.patch({ selected: def.id })}>
              <button className="eye" title={def.locked ? "always shown" : "show / hide"}
                onClick={(e) => { e.stopPropagation(); toggle(def.id, def); }}>
                {on ? "◉" : "○"}
              </button>
              <span className="name">{def.label}</span>
              {def.locked ? <span className="lock">req</span> : <span className="grip">⠿</span>}
            </div>
          );
        })}
        <button className="addbtn" onClick={() => set.addTab()}>+ add category tab</button>
        <div className="hint">Tap a layer to <b>select</b> it, then edit it in the inspector. The eye toggles visibility live.</div>
      </div>
    </div>
  );
}

// ---------------- Right: inspector ----------------
function Stepper({ value, min, max, step = 1, onChange, suffix }) {
  return (
    <div className="stepper2">
      <button onClick={() => onChange(Math.max(min, value - step))}>–</button>
      <div className="val">{value}{suffix || ""}</div>
      <button onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}

function RadiusRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span className="mono" style={{ flex: 1 }}>{label}</span>
      <Stepper value={value} min={0} max={24} step={2} suffix="px" onChange={onChange} />
    </div>
  );
}

function Inspector({ cfg, set }) {
  const pal = window.PALETTES[cfg.palette];
  const dragTab = useRef(null);

  const cartChoice = cfg.cart; // right|left|bottom|none
  const setCart = (v) => {
    if (v === "none") set.patch({ cart: "none", selected: "cart" });
    else set.patch({ cart: v, sections: { ...cfg.sections, cart: true }, selected: "cart" });
  };

  const onTabDrop = (i) => {
    const from = dragTab.current;
    if (from == null || from === i) return;
    const t = [...cfg.tabs];
    const [m] = t.splice(from, 1);
    t.splice(i, 0, m);
    set.patch({ tabs: t });
    dragTab.current = null;
  };

  return (
    <div className="panel-col right">
      <div className="panel-head"><span className="mono">Inspector</span>
        <span className="mono acc" style={{ marginLeft: "auto" }}>{labelFor(cfg.selected)}</span></div>
      <div className="panel-scroll">

        {/* theme */}
        <div className="insp-sec">
          <span className="mono">Colour theme</span>
          {[["Light", false], ["Dark", true]].map(([grpLabel, isDark]) => (
            <div key={grpLabel} className="sw-group">
              <span className="sw-grp-label">{grpLabel}</span>
              <div className="swatches">
                {Object.keys(window.PALETTES).filter((k) => !!window.PALETTES[k].dark === isDark).map((k) => {
                  const p = window.PALETTES[k];
                  return (
                    <button key={k} className={"sw" + (cfg.palette === k ? " on" : "")}
                      style={{ background: p.surface }} title={p.name} onClick={() => set.patch({ palette: k })}>
                      <span className="dot" style={{ background: p.accent }} />
                      <span className="nm">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* corner radius */}
        <div className="insp-sec">
          <span className="mono">Corner radius</span>
          <RadiusRow label="Panels" value={cfg.radiusPanel ?? 14} onChange={(v) => set.patch({ radiusPanel: v })} />
          <RadiusRow label="Cards" value={cfg.radiusCard ?? 12} onChange={(v) => set.patch({ radiusCard: v })} />
          <RadiusRow label="Buttons" value={cfg.radiusButton ?? 11} onChange={(v) => set.patch({ radiusButton: v })} />
          <div className="hint">Rounds the order cart &amp; rail (<b>panels</b>), menu tiles (<b>cards</b>), and pay / tab / logo (<b>buttons</b>). 0px = sharp corners.</div>
        </div>

        {/* layout / position */}
        <div className="insp-sec">
          <span className="mono">Layout · order cart</span>
          <div className="posgrid">
            {[["left", "⫷", "Left"], ["right", "⫸", "Right"], ["bottom", "⬓", "Bottom"], ["none", "⊘", "Hidden"]].map(([v, ic, lb]) => (
              <div key={v} className={"poschip" + (cartChoice === v ? " on" : "")} onClick={() => setCart(v)}>
                <span className="ic">{ic}</span>{lb}
              </div>
            ))}
          </div>
          <div className="mono" style={{ margin: "16px 0 8px" }}>Menu items</div>
          <div className="posgrid three">
            {[["grid", "▦", "Grid"], ["list", "☰", "List"], ["compact", "▤", "Compact"]].map(([v, ic, lb]) => (
              <div key={v} className={"poschip" + ((cfg.menuLayout || "grid") === v ? " on" : "")}
                onClick={() => set.patch({ menuLayout: v, selected: "menu" })}>
                <span className="ic">{ic}</span>{lb}
              </div>
            ))}
          </div>
          {(cfg.menuLayout || "grid") !== "list" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <span className="mono" style={{ flex: 1 }}>Menu columns</span>
              <Stepper value={cfg.menuCols} min={2} max={4} onChange={(v) => set.patch({ menuCols: v, selected: "menu" })} />
            </div>
          )}
          <div className="hint"><b>Grid</b> = tiles · <b>List</b> = full-width rows · <b>Compact</b> = dense, no photos. Drag the <b>dividers</b> in the preview to resize zones. <b>Phone</b> auto-stacks.</div>
        </div>

        {/* tabs */}
        <div className="insp-sec">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 11 }}>
            <span className="mono" style={{ marginBottom: 0 }}>Category tabs</span>
            <span className="mono" style={{ marginLeft: "auto", marginBottom: 0 }}>{cfg.tabs.length}</span>
          </div>
          <div className="chips">
            {cfg.tabs.map((t, i) => (
              <div key={t + i} className="chip on" draggable
                onDragStart={() => (dragTab.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onTabDrop(i)}>
                {t}<button className="x" onClick={() => set.removeTab(i)}>×</button>
              </div>
            ))}
          </div>
          {set.availableTabs().length > 0 && (
            <>
              <div className="mono" style={{ margin: "13px 0 8px" }}>Add a category</div>
              <div className="chips">
                {set.availableTabs().map((t) => (
                  <button key={t} className="chip" onClick={() => set.addTab(t)}>+ {t}</button>
                ))}
              </div>
            </>
          )}
          <div className="hint">Drag chips to reorder · first tab shows as active in the preview.</div>
        </div>

        {/* brand */}
        <div className="insp-sec">
          <span className="mono">Brand</span>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="mono">Business name</span>
            <input className="inp" value={cfg.business} maxLength={26}
              onChange={(e) => set.patch({ business: e.target.value })} placeholder="e.g. Juan's Café" />
          </label>
          <label className="field">
            <span className="mono">Logo initials</span>
            <input className="inp" value={cfg.initials} maxLength={3} style={{ width: 90 }}
              onChange={(e) => set.patch({ initials: e.target.value.toUpperCase() })} placeholder="JC" />
          </label>
          <div className="hint">Send your real logo file with the commission — we'll drop it in.</div>
        </div>

      </div>
    </div>
  );
}

function labelFor(id) {
  const d = window.SECTION_DEFS.find((s) => s.id === id);
  return d ? d.label : "—";
}

Object.assign(window, { TopBar, LeftPanel, Inspector });
