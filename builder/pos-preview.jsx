// ============ POS Builder · live preview ============
const { useRef, useState, useEffect, useLayoutEffect } = React;

// Scale the device frame (incl. bezel) to fit its container's content box
function useFit(w, h, bezel = 36) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const cs = getComputedStyle(el);
      const availW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - bezel;
      const availH = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - bezel;
      const s = Math.min(availW / w, availH / h, 1.15);
      setScale(s > 0.05 ? s : 0.2);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h, bezel]);
  return [ref, scale];
}

function MenuGrid({ cfg, pal, cols }) {
  const active = cfg.tabs[0] || "Coffee";
  const items = (window.SAMPLE[active] || window.SAMPLE.Coffee);
  const layout = cfg.menuLayout || "grid";

  if (layout === "list") {
    return (
      <div className="pos-menu list">
        {items.map((it, i) => (
          <div className="pos-row" key={i}>
            <div className="thumb" />
            <div className="rnm">{it[0]}<small>house favourite</small></div>
            <div className="pr">{it[1]}</div>
          </div>
        ))}
      </div>
    );
  }

  const compact = layout === "compact";
  return (
    <div className={"pos-menu" + (compact ? " compact" : "")} style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
      {items.map((it, i) => (
        <div className="pos-card" key={i}>
          {!compact && <div className="thumb" />}
          <div className="nm">{it[0]}</div>
          <div className="pr">{it[1]}</div>
        </div>
      ))}
    </div>
  );
}

// Draggable divider. Converts screen-pixel drag into device-space px via `scale`.
function Splitter({ axis, scale, value, def, min, max, sign, onChange }) {
  const [active, setActive] = useState(false);
  const onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isX = axis === "x";
    const startCoord = isX ? e.clientX : e.clientY;
    const startVal = value;
    const s = scale || 1;
    setActive(true);
    const move = (ev) => {
      const cur = isX ? ev.clientX : ev.clientY;
      const d = (cur - startCoord) / s;
      let nv = Math.round(startVal + sign * d);
      nv = Math.max(min, Math.min(max, nv));
      onChange(nv);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      setActive(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = isX ? "col-resize" : "row-resize";
  };
  return (
    <div
      className={"pos-split " + axis + (active ? " active" : "")}
      title="Drag to resize · double-click to reset"
      onPointerDown={onDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => { e.stopPropagation(); onChange(def); }}
    />
  );
}

function Cart({ cfg, layout, width }) {
  const showNotes = cfg.sections.notes;
  const bottom = layout === "bottom";
  return (
    <div className={"pos-cart" + (bottom ? " bottom" : "")} style={bottom ? undefined : { width }}>
      {!bottom && <div className="ch">Current order · Table 4</div>}
      <div className="pos-items">
        <div className="pos-line"><span className="q">2</span><span className="lnm">Cappuccino</span><span className="lpr">₱260</span></div>
        <div className="pos-line"><span className="q">1</span><span className="lnm">Croissant</span><span className="lpr">₱85</span></div>
        {!bottom && <div className="pos-line"><span className="q">1</span><span className="lnm">Spanish Latte</span><span className="lpr">₱160</span></div>}
      </div>
      {showNotes && !bottom && <div className="pos-note">“No sugar, extra hot” — note for barista</div>}
      <div className="pos-total"><span className="lbl">Total</span><span className="amt">₱505</span></div>
      <div className="pos-pay">Charge ₱505</div>
    </div>
  );
}

function Zone({ id, picked, pickMode, onPick, tag, children, style }) {
  return (
    <div
      data-zone={id}
      className={(picked ? "picked " : "") + (pickMode ? "pickable" : "")}
      style={style}
      onClick={pickMode ? (e) => { e.stopPropagation(); onPick(id); } : undefined}
    >
      {picked && <span className="zone-tag">{tag}</span>}
      {children}
    </div>
  );
}

function POSPreview({ cfg, pickMode, onPick, compact, onResize }) {
  const pal = window.PALETTES[cfg.palette];
  const dev = window.DEVICES[cfg.device];
  const preset = window.PRESETS[cfg.preset];
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const [ref, scale] = useFit(dev.w, dev.h, compact ? 24 : 40);
  const S = cfg.sections;
  const phone = dev.portrait;
  const resizable = pickMode && typeof onResize === "function";

  const cartPos = cfg.cart; // right | left | bottom | none
  const cartW = cfg.cartW ?? 240;
  const railW = cfg.railW ?? 118;
  const posVars = {
    "--pos-accent": pal.accent, "--pos-bg": pal.bg, "--pos-surface": pal.surface,
    "--pos-text": pal.text, "--pos-sub": pal.sub, "--pos-line": pal.line,
    "--pos-font": font.stack,
    "--pos-r-panel": (cfg.radiusPanel ?? 14) + "px",
    "--pos-r-card": (cfg.radiusCard ?? 12) + "px",
    "--pos-r-btn": (cfg.radiusButton ?? 11) + "px",
  };

  const menu = S.menu && (
    <Zone id="menu" picked={cfg.selected === "menu"} pickMode={pickMode} onPick={onPick} tag="menu grid"
      style={{ flex: 1, minWidth: 0, display: "flex" }}>
      <MenuGrid cfg={cfg} pal={pal} cols={phone ? 2 : cfg.menuCols} />
    </Zone>
  );

  const cartSide = !(cartPos === "bottom" || phone);
  const cart = S.cart && cartPos !== "none" && (
    <Zone id="cart" picked={cfg.selected === "cart"} pickMode={pickMode} onPick={onPick} tag="order cart"
      style={ cartSide ? { flex: "none", display: "flex" } : { flex: "none" } }>
      <Cart cfg={cfg} layout={cartSide ? "side" : "bottom"} width={cartW} />
    </Zone>
  );

  const rail = preset.rail && !phone && (
    <div className="pos-rail" style={{ width: railW }}>
      {["All", ...cfg.tabs.slice(0, 4)].map((t, i) => (
        <div className={"ri" + (i === 1 ? " on" : "")} key={i}>{t}</div>
      ))}
    </div>
  );

  // resizable dividers (device-space px; min/max keep zones usable)
  const railSplit = resizable && rail && (
    <Splitter axis="x" scale={scale} value={railW} def={118} min={84} max={240} sign={1}
      onChange={(v) => onResize({ railW: v })} />
  );
  const cartSplit = (dir) => resizable && cart && cartSide && (
    <Splitter axis="x" scale={scale} value={cartW} def={240} min={170} max={Math.round(dev.w * 0.6)}
      sign={dir === "left" ? 1 : -1} onChange={(v) => onResize({ cartW: v })} />
  );

  // main arrangement
  let mainClass = "pos-main";
  let mainKids;
  if (phone) {
    mainClass += " phone";
    mainKids = <>{menu}{cart}</>;
  } else if (cartPos === "bottom") {
    mainClass += " bottom";
    mainKids = <>{rail ? <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>{rail}{railSplit}{menu}</div> : menu}{cart}</>;
  } else if (cartPos === "left") {
    mainKids = <>{cart}{cartSplit("left")}{rail}{railSplit}{menu}</>;
  } else {
    mainKids = <>{rail}{railSplit}{menu}{cartSplit("right")}{cart}</>;
  }

  return (
    <div className="canvas-stage" ref={ref} style={compact ? { padding: 10, width: "100%", height: "100%" } : undefined} onClick={pickMode ? () => onPick(null) : undefined}>
      <div className="pos-frame" style={{ width: dev.w * scale, height: dev.h * scale }}>
        <div className="pos-scaler" style={{ width: dev.w, height: dev.h, transform: `scale(${scale})` }}>
          <div className={"pos-bezel" + (phone ? " portrait" : "")} />
        <div className="pos" style={posVars}>
          {/* header */}
          <Zone id="header" picked={cfg.selected === "header"} pickMode={pickMode} onPick={onPick} tag="header" style={{ flex: "none" }}>
            <div className="pos-header">
              <div className="pos-logo">{cfg.initials || "·"}</div>
              <div className="pos-brand">{cfg.business || "Your Business"}
                <small>// powered by kape.dev</small></div>
              <div className="pos-headright">
                <span className="pos-clock">09:41 AM</span>
                <span className="pos-avatar" />
              </div>
            </div>
          </Zone>

          {/* tabs */}
          {S.tabs && (
            <Zone id="tabs" picked={cfg.selected === "tabs"} pickMode={pickMode} onPick={onPick} tag="category tabs" style={{ flex: "none" }}>
              <div className="pos-tabs">
                {cfg.tabs.map((t, i) => (
                  <div className={"pos-tab" + (i === 0 ? " on" : "")} key={t + i}>{t}</div>
                ))}
              </div>
            </Zone>
          )}

          {/* main */}
          <div className={mainClass}>{mainKids}</div>

          {/* quick pay bar */}
          {S.pay && cartPos === "none" && (
            <Zone id="pay" picked={cfg.selected === "pay"} pickMode={pickMode} onPick={onPick} tag="quick-pay bar" style={{ flex: "none" }}>
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--pos-line)", background: "var(--pos-surface)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--pos-sub)" }}>3 items</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 17, marginLeft: "auto", color: "var(--pos-text)" }}>₱505</span>
                <div className="pos-pay" style={{ padding: "10px 22px" }}>Charge</div>
              </div>
            </Zone>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { POSPreview, useFit });
