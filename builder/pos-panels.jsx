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

function TopBar({ cfg, set, canUndo, canRedo, onUndo, onRedo, onReset, onReadyMade, onExport, onSubmit }) {
  return (
    <div className="topbar">
      <a className="logo" href="../" title="Back to kape.dev">
        <div className="mark">k</div>
        <div className="txt"><b>POS Builder</b><small>kape.dev // commission studio</small></div>
      </a>
      <div className="tb-divider" />

      <div className="tb-group">
        <span className="mono">View</span>
        <div className="seg">
          <button className={cfg.canvasMode !== "receipt" ? "on" : ""} onClick={() => set.mode("screen")}>Screen</button>
          <button className={cfg.canvasMode === "receipt" ? "on" : ""} onClick={() => set.mode("receipt")}>Receipt</button>
        </div>
      </div>

      {cfg.canvasMode !== "receipt" && (
        <>
          <div className="tb-group">
            <span className="mono">Ready-made</span>
            <button className="btn ghost rm-btn" onClick={onReadyMade}>✦ Browse designs</button>
          </div>

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
        </>
      )}

      <div className="grow" />
      <div className="seg">
        <button title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>↶</button>
        <button title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>↷</button>
      </div>
      <button className="btn ghost" title="Reset to defaults" onClick={onReset}>↺ Reset</button>
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

// ---------------- Shared: logo upload ----------------
// Reads an image file, downscales it to <= 256px (keeps localStorage small),
// and stores it as a PNG data-URL in cfg.logo. Used in screen + receipt inspectors.
function LogoField({ cfg, set }) {
  const inputRef = useRef(null);
  const [err, setErr] = useState("");

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) { setErr("Pick an image file"); return; }
    if (file.size > 6 * 1024 * 1024) { setErr("Image too large (max 6MB)"); return; }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        try { set.patch({ logo: cv.toDataURL("image/png") }); }
        catch (_) { setErr("Couldn't process that image"); }
      };
      img.onerror = () => setErr("Couldn't read that image");
      img.src = reader.result;
    };
    reader.onerror = () => setErr("Couldn't read that file");
    reader.readAsDataURL(file);
  };

  return (
    <div className="field">
      <span className="mono">Logo image</span>
      <div className="logo-up">
        <div className="logo-prev">
          {cfg.logo
            ? <img src={cfg.logo} alt="logo" />
            : <span className="logo-ph">{cfg.initials || "·"}</span>}
        </div>
        <div className="logo-acts">
          <button className="btn ghost" onClick={() => inputRef.current && inputRef.current.click()}>
            {cfg.logo ? "Replace…" : "↥ Upload logo"}
          </button>
          {cfg.logo && <button className="btn ghost" onClick={() => set.patch({ logo: null })}>Remove</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {cfg.logo && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <span className="mono" style={{ flex: 1 }}>Logo size</span>
          <Stepper value={cfg.logoSize ?? 46} min={24} max={120} step={4} suffix="px"
            onChange={(v) => set.patch({ logoSize: v })} />
        </div>
      )}
      {err && <span className="err-msg">{err}</span>}
      <div className="hint">PNG/JPG/SVG · shows on the screen header &amp; receipt. We auto-scale it; transparent PNG looks best. No upload? The <b>initials</b> are used instead.</div>
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

function ColorRow({ label, value, onChange, warn }) {
  const norm = (v) => { v = (v || "").trim(); if (v && v[0] !== "#") v = "#" + v; return v; };
  return (
    <div className={"color-row" + (warn ? " has-warn" : "")}>
      <span className="mono">{label}</span>
      {warn && <span className="contrast-warn" title={warn}>⚠ low contrast</span>}
      <label className="color-ctl">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input className="hexinp" value={value} maxLength={7} spellCheck={false}
          onChange={(e) => onChange(norm(e.target.value))} />
      </label>
    </div>
  );
}

function Inspector({ cfg, set }) {
  const pal = window.resolvePalette(cfg);
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

          {/* custom theme */}
          {(() => {
            const cp = cfg.customPalette || window.DEFAULT_CUSTOM;
            const isCustom = cfg.palette === "custom";
            const resolved = window.buildCustom(cp);
            // WCAG AA: 4.5:1 for body text, 3:1 for large/button text.
            const textOnBg = window.contrastRatio(cp.text, cp.bg);
            const textOnSurface = window.contrastRatio(cp.text, cp.surface);
            const btnText = window.contrastRatio(resolved.onAccent, cp.accent);
            const textLow = textOnBg < 4.5 || textOnSurface < 4.5;
            const rowWarn = {
              accent: btnText < 3 ? "Button labels are hard to read on this accent — pick a darker or lighter accent" : "",
              bg: textOnBg < 4.5 ? "Your text colour is hard to read on this background" : "",
              surface: textOnSurface < 4.5 ? "Your text colour is hard to read on cards / panels (surface)" : "",
              text: textLow ? "This text colour is too low-contrast against your background / surface" : "",
            };
            const anyWarn = !!(rowWarn.accent || textLow);
            return (
              <div className="sw-group">
                <span className="sw-grp-label">Custom</span>
                <div className="swatches">
                  <button className={"sw cust" + (isCustom ? " on" : "")}
                    style={{ background: cp.surface }} title="Custom theme" onClick={set.useCustom}>
                    <span className="dot" style={{ background: cp.accent }} />
                    <span className="nm">Custom</span>
                  </button>
                </div>
                {isCustom && (
                  <div className="custom-edit">
                    {[["accent", "Accent"], ["bg", "Background"], ["surface", "Surface"], ["text", "Text"]].map(([k, lb]) => (
                      <ColorRow key={k} label={lb} value={cp[k]} warn={rowWarn[k]} onChange={(v) => set.customColor(k, v)} />
                    ))}
                    <div className="hint">
                      Sub-text, hairlines &amp; button text auto-adjust. {anyWarn
                        ? <b className="warn-txt">⚠ Some colours are hard to read (see badges above) — text needs ~4.5:1 contrast.</b>
                        : "Contrast looks good ✓"}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* typeface */}
        <div className="insp-sec">
          <span className="mono">Typeface</span>
          <div className="fontlist">
            {window.FONT_ORDER.map((k) => {
              const f = window.FONTS[k];
              return (
                <button key={k} className={"fontchip" + ((cfg.font || "inter") === k ? " on" : "")}
                  style={{ fontFamily: f.stack }} onClick={() => set.patch({ font: k })}>
                  <span className="fnm">{f.name}</span>
                  <span className="fpv">Espresso ₱90</span>
                  <span className="fnote">{f.note}</span>
                </button>
              );
            })}
          </div>
          <div className="hint">Sets the typeface across your POS — brand, tabs, menu &amp; cart. Mono labels (clock, captions) stay fixed.</div>
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
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="mono">Logo initials</span>
            <input className="inp" value={cfg.initials} maxLength={3} style={{ width: 90 }}
              onChange={(e) => set.patch({ initials: e.target.value.toUpperCase() })} placeholder="JC" />
          </label>
          <LogoField cfg={cfg} set={set} />
        </div>

      </div>
    </div>
  );
}

function labelFor(id) {
  const d = window.SECTION_DEFS.find((s) => s.id === id);
  return d ? d.label : "—";
}

Object.assign(window, { TopBar, LeftPanel, Inspector, LogoField });
