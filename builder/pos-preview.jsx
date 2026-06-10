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

// Scales a fixed-width child down to fit its container (both axes). Used to show
// the boutique skin flexibly inside small preview boxes (review modal, etc.)
// without cropping or scrollbars. The child stays at natural width so PNG
// capture remains full-resolution.
function FitBox({ width = 1040, max = 1, children }) {
  const box = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const fit = () => {
      const o = box.current, i = inner.current;
      if (!o || !i) return;
      const cw = o.clientWidth, ch = o.clientHeight;
      const nh = i.offsetHeight || 1;
      const s = Math.min(cw / width, ch / nh, max);
      setScale(s > 0.04 ? s : 0.2);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width, max]);
  return (
    <div className="fitbox" ref={box}>
      <div className="fitbox-in" ref={inner} style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
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

function Cart({ cfg, layout, width, height }) {
  const showNotes = cfg.sections.notes;
  const bottom = layout === "bottom";
  return (
    <div className={"pos-cart" + (bottom ? " bottom" : "")} style={bottom ? (height ? { height, flex: "none" } : undefined) : { width }}>
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

// per-component scale (CSS zoom), stored in cfg.zoneScale
const zoneZoom = (cfg, id) => (cfg.zoneScale || {})[id] || 1;
const zStyle = (cfg, id) => {
  const z = zoneZoom(cfg, id);
  return z !== 1 ? { zoom: z } : undefined;
};

// generic scale drag: diagonal pointer movement (screen px → device px via
// `scale`) maps onto a 0.7–1.5 zoom factor
function startScaleDrag(e, scale, cur, apply) {
  e.preventDefault();
  e.stopPropagation();
  const sx = e.clientX, sy = e.clientY;
  const move = (ev) => {
    const d = ((ev.clientX - sx) + (ev.clientY - sy)) / (2 * (scale || 1));
    const nv = Math.round(Math.max(0.7, Math.min(1.5, cur + d / 200)) * 100) / 100;
    apply(nv);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    document.body.style.cursor = "";
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  document.body.style.cursor = "nwse-resize";
}

function Zone({ id, picked, pickMode, onPick, tag, children, style, grip, gripTitle, zoom, scaleStart, scaleReset }) {
  const st = zoom && zoom !== 1 ? { ...(style || {}), zoom } : style;
  return (
    <div
      data-zone={id}
      className={(picked ? "picked " : "") + (pickMode ? "pickable" : "")}
      style={st}
      onClick={pickMode ? (e) => { e.stopPropagation(); onPick(id); } : undefined}
    >
      {picked && <span className="zone-tag">{tag}</span>}
      {pickMode && grip && (
        <span
          className="zone-grip"
          title={gripTitle || "Drag to move"}
          onPointerDown={grip}
          onClick={(e) => e.stopPropagation()}
        >⠿</span>
      )}
      {pickMode && scaleStart && (
        <span
          className="zone-scale"
          title="Drag to scale · double-click to reset"
          onPointerDown={scaleStart}
          onDoubleClick={(e) => { e.stopPropagation(); scaleReset && scaleReset(); }}
          onClick={(e) => e.stopPropagation()}
        >⤡</span>
      )}
      {children}
    </div>
  );
}

// Shared by the four ready-made skins: the order panel docks left/right
// (cfg.skinCart) and resizes (cfg.skinCartW) — `edit` is provided by SkinStage
// only inside the live builder canvas.
const skinLeft = (cfg) => (cfg.skinCart || "right") === "left";
const skinBodyCls = (cfg) => (skinLeft(cfg) ? " cart-left" : "");
const skinSideCls = (cfg) => (skinLeft(cfg) ? " dock-left" : "");
const skinSideStyle = (cfg) => (cfg.skinCartW ? { "--skin-cart-w": cfg.skinCartW + "px" } : undefined);
function SideGrip({ edit }) {
  if (!edit) return null;
  return (
    <span className="zone-grip" title="Drag to dock left · right"
      onPointerDown={edit.dock} onClick={(e) => e.stopPropagation()}>⠿</span>
  );
}

// corner handle that scales a skin component (header / menu / order panel)
function ScaleHandle({ edit, id, pos }) {
  if (!edit || !edit.scaleStart) return null;
  return (
    <span className={"zone-scale" + (pos ? " " + pos : "")}
      title="Drag to scale · double-click to reset"
      onPointerDown={edit.scaleStart(id)}
      onDoubleClick={(e) => { e.stopPropagation(); edit.scaleReset(id); }}
      onClick={(e) => e.stopPropagation()}>⤡</span>
  );
}

// ---- Boutique skin ----------------------------------------------------------
// A distinct "café" design (greeting hero · pill tabs · icon cards · order rail).
// Driven by cfg so theme/font/corners stay customizable; used in both the
// ready-made modal and the live builder canvas, so they always match.
function BoutiqueLive({ cfg, edit }) {
  const pal = window.resolvePalette(cfg);
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const accent = pal.accent;
  const surface = pal.surface;
  const mix = (c, pct, base) => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
  const tabs = (cfg.tabs || []).slice(0, 4);
  const tabCls = ["", "yellow", "lav"];
  const vars = {
    "--bq-accent": accent,
    "--bq-accent-grad": pal.grad || accent,
    "--bq-on-accent": pal.onAccent || window.onAccentFor(accent),
    "--bq-text": pal.text,
    "--bq-sub": pal.sub,
    "--bq-line": pal.line,
    "--bq-surface": surface,
    "--bq-bg": pal.bg,
    "--bq-soft": mix(accent, 14, surface),
    "--bq-chip": mix(accent, 9, surface),
    "--bq-hero": `linear-gradient(120deg, ${mix(accent, 22, surface)} 0%, ${mix(accent, 8, surface)} 100%)`,
    "--bq-r-card": (cfg.radiusCard ?? 16) + "px",
    "--bq-r-btn": (cfg.radiusButton ?? 14) + "px",
    "--bq-r-panel": (cfg.radiusPanel ?? 16) + "px",
    fontFamily: font.stack,
  };
  const cards1 = [
    { ic: "🍵", icbg: "#e9ddf9", name: "Hot Green Tea", desc: "Premium ceremonial grade", price: "$6.50" },
    { ic: "🍵", icbg: "#d8efe0", name: "Matcha Latte", desc: "Silky smooth oat milk base", price: "$6.50", badge: "hot" },
    { ic: "🧋", icbg: "#f7dcec", name: "Milk Tea", desc: "Earl Grey with honey pearls", price: "$4.75" },
  ];
  const cards2 = [
    { ic: "🥐", icbg: "#f3e6cf", name: "Butter Croissant", desc: "Flaky, baked fresh daily", price: "$3.25" },
    { ic: "🧁", icbg: "#f7dcec", name: "Berry Muffin", desc: "Wild blueberry compote", price: "$3.75" },
    { ic: "🍰", icbg: "#e9ddf9", name: "Basque Cheesecake", desc: "Burnt-top, creamy centre", price: "$5.50", badge: "LIMITED EDITION", gold: true },
  ];
  const Card = (c, i) => (
    <div className="bq-card" key={i}>
      <div className="bq-card-top">
        <span className="bq-ic" style={{ background: mix(c.icbg, 62, surface) }}>{c.ic}</span>
        {c.badge && <span className={"bq-badge" + (c.gold ? " gold" : "")}>{c.badge}</span>}
      </div>
      <h4 className="bq-nm">{c.name}</h4>
      <p className="bq-desc">{c.desc}</p>
      <div className="bq-cardfoot"><span className="bq-price">{c.price}</span><span className="bq-add">+</span></div>
    </div>
  );
  return (
    <div className="bq skin-screen" style={vars}>
      <div className="bq-header" style={zStyle(cfg, "header")}>
        <ScaleHandle edit={edit} id="header" />
        <div className={"bq-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="bq-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="bq-headright"><span className="bq-clock">09:41 AM</span><span className="bq-avatar" /></div>
      </div>
      <div className={"bq-body" + skinBodyCls(cfg)}>
      <div className="bq-main" style={zStyle(cfg, "menu")}>
        <ScaleHandle edit={edit} id="menu" pos="tr" />
        <div className="bq-hero">
          <h2>Good morning,<br />Cashier!</h2>
          <p>Ready to serve some warmth? Explore our fresh pastry selection and seasonal teas.</p>
        </div>
        <div className="bq-tabs">
          <span className="bq-tab dark">All Items</span>
          {tabs.map((t, i) => (<span className={("bq-tab " + tabCls[i % 3]).trim()} key={t + i}>{t}</span>))}
        </div>
        <div className="bq-sec"><i />Tea Classics</div>
        <div className="bq-grid">{cards1.map(Card)}</div>
        <div className="bq-sec"><i />Fresh Pastries</div>
        <div className="bq-grid">{cards2.map(Card)}</div>
      </div>
      {edit && edit.splitter(236)}
      <div className={"bq-side" + skinSideCls(cfg)} style={{ ...(skinSideStyle(cfg) || {}), ...(zStyle(cfg, "cart") || {}) }}>
        <SideGrip edit={edit} />
          <ScaleHandle edit={edit} id="cart" />
        <div className="bq-side-head"><h3>Current Order</h3><span className="bq-order-no">#A12</span></div>
        <div className="bq-modes"><span className="bq-mode on">Dine in</span><span className="bq-mode">To go</span></div>
        <div className="bq-line">
          <div className="bq-line-info"><span className="bq-line-nm">Matcha Latte</span><span className="bq-line-sub">x1 · $6.50</span></div>
          <div className="bq-stepper"><span>−</span><b>1</b><span>+</span></div>
        </div>
        <div className="bq-totals">
          <div className="bq-trow"><span>Subtotal</span><span>$5.50</span></div>
          <div className="bq-trow"><span>Tax (5%)</span><span>$0.28</span></div>
          <div className="bq-trow tot"><span>Total</span><span>$5.78</span></div>
        </div>
        <div className="bq-checkout">🛒 Checkout</div>
      </div>
      </div>
    </div>
  );
}

// ---- Terminal skin ----------------------------------------------------------
// A precise "counter terminal" design: product grid with SKU IDs + mono specs,
// and an order ticket with subtotal/tax + park/checkout. Palette/font/corner
// driven, so it stays customizable and matches across modal + canvas.
function TerminalLive({ cfg, edit }) {
  const pal = window.resolvePalette(cfg);
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const accent = pal.accent;
  const surface = pal.surface;
  const mix = (c, pct, base) => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
  const tabs = (cfg.tabs || []).slice(0, 5);
  const vars = {
    "--cp-accent": accent,
    "--cp-accent-grad": pal.grad || accent,
    "--cp-on-accent": pal.onAccent || window.onAccentFor(accent),
    "--cp-text": pal.text,
    "--cp-sub": pal.sub,
    "--cp-line": pal.line,
    "--cp-surface": surface,
    "--cp-bg": pal.bg,
    "--cp-soft": mix(accent, 14, surface),
    "--cp-chip": mix(accent, 7, surface),
    "--cp-r-card": (cfg.radiusCard ?? 10) + "px",
    "--cp-r-btn": (cfg.radiusButton ?? 8) + "px",
    "--cp-r-panel": (cfg.radiusPanel ?? 10) + "px",
    fontFamily: font.stack,
  };
  const items = [
    { id: "T-001", ic: "🍵", name: "Hot Green Tea", spec: "250ml / steamed", price: "$4.50" },
    { id: "T-005", ic: "🧋", name: "Milk Tea", spec: "500ml / ice 50%", price: "$6.25", on: true },
    { id: "T-012", ic: "🍵", name: "Matcha", spec: "ceremonial grade", price: "$5.75" },
    { id: "T-007", ic: "🫖", name: "Earl Grey", spec: "bergamot infusion", price: "$4.00" },
    { id: "T-003", ic: "🌼", name: "Chamomile", spec: "decaf / calm", price: "$4.25" },
    { id: "T-006", ic: "🌸", name: "Jasmine", spec: "floral / green", price: "$4.50" },
    { id: "T-009", ic: "🍂", name: "Oolong", spec: "roasted / smooth", price: "$4.75" },
    { id: "T-011", ic: "🌺", name: "Hibiscus", spec: "tart / vitamin c", price: "$4.50" },
    { id: "T-014", ic: "🌿", name: "Lemongrass", spec: "citrus / herbal", price: "$4.00" },
  ];
  return (
    <div className="cp skin-screen" style={vars}>
      <div className="cp-header" style={zStyle(cfg, "header")}>
        <ScaleHandle edit={edit} id="header" />
        <div className={"cp-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="cp-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="cp-headright"><span className="cp-clock">09:41 AM</span><span className="cp-avatar" /></div>
      </div>
      <div className={"cp-body" + skinBodyCls(cfg)}>
        <div className="cp-main" style={zStyle(cfg, "menu")}>
        <ScaleHandle edit={edit} id="menu" pos="tr" />
          <div className="cp-tabs">
            {tabs.map((t, i) => (<span className={"cp-tab" + (i === 0 ? " on" : "")} key={t + i}>{t}</span>))}
          </div>
          <div className="cp-grid">
            {items.map((it, i) => (
              <div className={"cp-card" + (it.on ? " on" : "")} key={i}>
                <span className="cp-id">ID: {it.id}</span>
                <div className="cp-thumb">{it.ic}</div>
                <div className="cp-nm">{it.name}</div>
                <div className="cp-cardfoot"><span className="cp-spec">{it.spec}</span><span className="cp-price">{it.price}</span></div>
              </div>
            ))}
          </div>
        </div>
        {edit && edit.splitter(250)}
        <div className={"cp-side" + skinSideCls(cfg)} style={{ ...(skinSideStyle(cfg) || {}), ...(zStyle(cfg, "cart") || {}) }}>
          <SideGrip edit={edit} />
          <ScaleHandle edit={edit} id="cart" />
          <div className="cp-side-head"><h3>Current Order</h3><span className="cp-meta">TS_ID 9926-6A · TABLE 12</span></div>
          <div className="cp-ticket">
            <div className="cp-tline">
              <span className="cp-q">2x</span>
              <div className="cp-tinfo"><span className="cp-tnm">Milk Tea</span><span className="cp-tadd">+ large cup · + boba pearls</span></div>
              <span className="cp-tpr">$12.50</span>
            </div>
            <div className="cp-tline">
              <span className="cp-q">1x</span>
              <div className="cp-tinfo"><span className="cp-tnm">Matcha</span><span className="cp-tadd">+ oat milk</span></div>
              <span className="cp-tpr">$5.75</span>
            </div>
          </div>
          <div className="cp-totals">
            <div className="cp-trow"><span>Subtotal</span><span>$18.25</span></div>
            <div className="cp-trow"><span>Tax (8%)</span><span>$1.46</span></div>
            <div className="cp-trow tot"><span>Total</span><span>$19.71</span></div>
          </div>
          <div className="cp-actions">
            <div className="cp-park">Park order</div>
            <div className="cp-checkout">🛒 Checkout</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Gallery skin -----------------------------------------------------------
// A modern storefront design: photo-style product cards with badges, an order
// rail with item thumbnails, quantity steppers, an order-notes field and a
// floating add button. Palette/font/corner driven.
function GalleryLive({ cfg, edit }) {
  const pal = window.resolvePalette(cfg);
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const accent = pal.accent;
  const surface = pal.surface;
  const mix = (c, pct, base) => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
  const tabs = (cfg.tabs || []).slice(0, 4);
  const vars = {
    "--gl-accent": accent,
    "--gl-accent-grad": pal.grad || accent,
    "--gl-on-accent": pal.onAccent || window.onAccentFor(accent),
    "--gl-text": pal.text,
    "--gl-sub": pal.sub,
    "--gl-line": pal.line,
    "--gl-surface": surface,
    "--gl-bg": pal.bg,
    "--gl-soft": mix(accent, 13, surface),
    "--gl-chip": mix(accent, 7, surface),
    "--gl-r-card": (cfg.radiusCard ?? 16) + "px",
    "--gl-r-btn": (cfg.radiusButton ?? 12) + "px",
    "--gl-r-panel": (cfg.radiusPanel ?? 16) + "px",
    fontFamily: font.stack,
  };
  const items = [
    { name: "Hot Green Tea", price: "$4.50", tag: "VEGAN", tk: "veg", grad: "linear-gradient(135deg,#d7e8cf,#a8c79f)", dot: true },
    { name: "Matcha Latte", price: "$5.75", tag: "POPULAR", tk: "pop", grad: "linear-gradient(135deg,#dcecd2,#b0d2a3)" },
    { name: "Milk Tea", price: "$6.25", tag: "NEW", tk: "new", grad: "linear-gradient(135deg,#eddcc6,#ccae8d)" },
    { name: "Caramel Macchiato", price: "$6.00", ic: "🥤" },
    { name: "Butter Croissant", price: "$3.25", ic: "🥐" },
    { name: "Taro Swirl", price: "$5.50", ic: "🧋" },
    { name: "Thai Iced Tea", price: "$5.25", grad: "linear-gradient(135deg,#f3d9b0,#dfa86a)", tag: "VEGAN", tk: "veg" },
    { name: "Brown Sugar Boba", price: "$6.50", tag: "POPULAR", tk: "pop", grad: "linear-gradient(135deg,#e7cdb0,#b98c5e)" },
    { name: "Mango Smoothie", price: "$5.75", ic: "🥭" },
  ];
  const order = [
    { name: "Hot Green Tea", opt: "2x Large, Honey (+$0.00)", qty: "02", price: "$9.00", grad: "linear-gradient(135deg,#d7e8cf,#a8c79f)" },
    { name: "Matcha Latte", opt: "1x Regular, Oat Milk (+$0.75)", qty: "01", price: "$5.75", grad: "linear-gradient(135deg,#dcecd2,#b0d2a3)" },
  ];
  return (
    <div className="gl skin-screen" style={vars}>
      <div className="gl-header" style={zStyle(cfg, "header")}>
        <ScaleHandle edit={edit} id="header" />
        <div className={"gl-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="gl-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="gl-headright"><span className="gl-clock">09:41 AM</span><span className="gl-avatar" /></div>
      </div>
      <div className={"gl-body" + skinBodyCls(cfg)}>
        <div className="gl-main" style={zStyle(cfg, "menu")}>
        <ScaleHandle edit={edit} id="menu" pos="tr" />
          <div className="gl-tabs">
            <span className="gl-tab on">All Items</span>
            {tabs.map((t, i) => (<span className="gl-tab" key={t + i}>{t}</span>))}
          </div>
          <div className="gl-grid">
            {items.map((it, i) => (
              <div className="gl-card" key={i}>
                <div className={"gl-thumb" + (it.grad ? " photo" : "")} style={it.grad ? { backgroundImage: it.grad } : undefined}>
                  {it.dot && <span className="gl-dot" />}
                  {!it.grad && <span className="gl-thumb-ic">{it.ic}</span>}
                </div>
                <div className="gl-cardfoot">
                  <div className="gl-info"><span className="gl-nm">{it.name}</span><span className="gl-price">{it.price}</span></div>
                  {it.tag && <span className={"gl-badge " + it.tk}>{it.tag}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="gl-fab">+</div>
        </div>
        {edit && edit.splitter(280)}
        <div className={"gl-side" + skinSideCls(cfg)} style={{ ...(skinSideStyle(cfg) || {}), ...(zStyle(cfg, "cart") || {}) }}>
          <SideGrip edit={edit} />
          <ScaleHandle edit={edit} id="cart" />
          <div className="gl-side-head"><h3>Current Order</h3><span className="gl-clear">Clear cart</span></div>
          <div className="gl-order">
            {order.map((o, i) => (
              <div className="gl-oitem" key={i}>
                <span className="gl-othumb" style={{ backgroundImage: o.grad }} />
                <div className="gl-oinfo"><span className="gl-onm">{o.name}</span><span className="gl-osub">{o.opt}</span></div>
                <div className="gl-ostep"><span>−</span><b>{o.qty}</b><span>+</span></div>
                <span className="gl-opr">{o.price}</span>
              </div>
            ))}
          </div>
          <div className="gl-notes">
            <span className="gl-notes-lb">Order notes</span>
            <div className="gl-notes-in">Add specific instructions…</div>
          </div>
          <div className="gl-totals">
            <div className="gl-trow"><span>Subtotal</span><span>$14.75</span></div>
            <div className="gl-trow"><span>Tax (5%)</span><span>$1.18</span></div>
            <div className="gl-trow tot"><span>Total</span><span>$15.93</span></div>
          </div>
          <div className="gl-checkout">Checkout · $15.93</div>
        </div>
      </div>
    </div>
  );
}

// ---- Console skin -----------------------------------------------------------
// A dark "developer console" POS: snake_case mono labels, object IDs, a faint
// watermark and an EXECUTE_PAYMENT action. Palette/font/corner driven.
function ConsoleLive({ cfg, edit }) {
  const pal = window.resolvePalette(cfg);
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const accent = pal.accent;
  const surface = pal.surface;
  const mix = (c, pct, base) => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
  const code = (s) => (s || "").toUpperCase().replace(/\s+/g, "_");
  const tabs = (cfg.tabs || []).slice(0, 4);
  const vars = {
    "--cn-accent": accent,
    "--cn-accent-grad": pal.grad || accent,
    "--cn-on-accent": pal.onAccent || window.onAccentFor(accent),
    "--cn-text": pal.text,
    "--cn-sub": pal.sub,
    "--cn-line": pal.line,
    "--cn-surface": surface,
    "--cn-bg": pal.bg,
    "--cn-soft": mix(accent, 22, surface),
    "--cn-chip": mix(accent, 10, surface),
    "--cn-r-card": (cfg.radiusCard ?? 10) + "px",
    "--cn-r-btn": (cfg.radiusButton ?? 8) + "px",
    fontFamily: font.stack,
  };
  const items = [
    { id: "OBJ_01", grad: "linear-gradient(135deg,#3a5a40,#1f3a2a)", name: "Hot Green Tea", spec: "250ML / STEAMED", price: "$4.50" },
    { id: "OBJ_02", grad: "linear-gradient(135deg,#4a6b3a,#2a3f24)", name: "Matcha Latte", spec: "OAT / 16OZ", price: "$5.75" },
    { id: "OBJ_03", grad: "linear-gradient(135deg,#6b4a3a,#3a281f)", name: "Milk Tea", spec: "BOBA / 50%", price: "$6.20", qty: "3", on: true },
    { id: "OBJ_04", grad: "linear-gradient(135deg,#5a4632,#33271b)", name: "Espresso", spec: "DOPPIO", price: "$3.25" },
    { id: "OBJ_05", grad: "linear-gradient(135deg,#3a4f6b,#22303f)", name: "Cold Brew", spec: "18HR STEEP", price: "$4.75" },
    { id: "OBJ_06", grad: "linear-gradient(135deg,#6b5232,#3a2c1a)", name: "Caramel Macchiato", spec: "CARAMEL / 16OZ", price: "$6.00" },
    { id: "OBJ_07", grad: "linear-gradient(135deg,#6b3a3a,#3a2020)", name: "Chai Latte", spec: "SPICED / OAT", price: "$5.25" },
    { id: "OBJ_08", grad: "linear-gradient(135deg,#445a6b,#26343f)", name: "Iced Americano", spec: "2-SHOT / ICE", price: "$3.75" },
  ];
  const order = [
    { name: "Milk Tea", code: "82 · UNIT_3.10", qty: "02", price: "$12.40" },
    { name: "Matcha Latte", code: "81 · UNIT_5.75", qty: "01", price: "$5.75" },
  ];
  const watermark = ((cfg.initials || cfg.business || "S").trim()[0] || "S").toUpperCase();
  return (
    <div className="cn skin-screen" style={vars}>
      <div className="cn-header" style={zStyle(cfg, "header")}>
        <ScaleHandle edit={edit} id="header" />
        <div className={"cn-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="cn-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="cn-headright"><span className="cn-clock">09:41 AM</span><span className="cn-avatar" /></div>
      </div>
      <div className={"cn-body" + skinBodyCls(cfg)}>
        <div className="cn-main" style={zStyle(cfg, "menu")}>
        <ScaleHandle edit={edit} id="menu" pos="tr" />
          <div className="cn-tabs">
            <span className="cn-tab on">ALL_ITEMS</span>
            {tabs.map((t, i) => (<span className="cn-tab" key={t + i}>{code(t)}</span>))}
            <span className="cn-status">DISPLAYING_{items.length}_OBJECTS</span>
          </div>
          <div className="cn-gridwrap">
            <span className="cn-watermark">{watermark}</span>
            <div className="cn-grid">
              {items.map((it, i) => (
                <div className={"cn-card" + (it.on ? " on" : "")} key={i}>
                  {it.qty && <span className="cn-qbadge">{it.qty}</span>}
                  <span className="cn-id">{it.id}</span>
                  <div className="cn-thumb" style={{ backgroundImage: it.grad }} />
                  <div className="cn-nm">{it.name}</div>
                  <div className="cn-cardfoot"><span className="cn-spec">{it.spec}</span><span className="cn-price">{it.price}</span></div>
                </div>
              ))}
              <div className="cn-add"><span className="cn-plus">+</span>ADD_CUSTOM_ENTRY</div>
            </div>
          </div>
        </div>
        {edit && edit.splitter(262)}
        <div className={"cn-side" + skinSideCls(cfg)} style={{ ...(skinSideStyle(cfg) || {}), ...(zStyle(cfg, "cart") || {}) }}>
          <SideGrip edit={edit} />
          <ScaleHandle edit={edit} id="cart" />
          <div className="cn-side-head"><h3>CURRENT_ORDER</h3><span className="cn-clear">⌫ CLEAR</span></div>
          <div className="cn-ticket">
            {order.map((o, i) => (
              <div className="cn-tline" key={i}>
                <div className="cn-tinfo"><span className="cn-tnm">{o.name}</span><span className="cn-tcode">{o.code}</span></div>
                <div className="cn-tstep"><span>−</span><b>{o.qty}</b><span>+</span></div>
                <span className="cn-tpr">{o.price}</span>
              </div>
            ))}
          </div>
          <div className="cn-totals">
            <div className="cn-trow"><span>SUBTOTAL_NET</span><span>$18.15</span></div>
            <div className="cn-trow"><span>TAX_PERCENT_10</span><span>$1.82</span></div>
            <div className="cn-trow tot"><span>TOTAL_AMOUNT</span><span>$19.97</span></div>
          </div>
          <div className="cn-actions">
            <div className="cn-void">VOID_ORDER</div>
            <div className="cn-exec">⚡ EXECUTE_PAYMENT</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// skin registry — maps cfg.skin → component (classic = generic builder preview)
const SKINS = { boutique: BoutiqueLive, terminal: TerminalLive, gallery: GalleryLive, console: ConsoleLive };
function SkinView({ cfg, edit }) {
  const C = SKINS[cfg.skin];
  return C ? <C cfg={cfg} edit={edit} /> : null;
}

// Renders a skin at its true device width (so container queries reflow for
// tablet/phone), scaled to fit the canvas like the generic device preview.
// In the builder it also provides the `edit` kit: a width splitter and a
// drag-to-dock grip for the skin's order panel.
function SkinStage({ cfg, compact, pickMode, onResize }) {
  const dev = window.DEVICES[cfg.device] || window.DEVICES.tablet;
  const [ref, scale] = useFit(dev.w, dev.h, compact ? 24 : 48);
  const resizable = pickMode && typeof onResize === "function" && !dev.portrait;
  const [dockHint, setDockHint] = useState(null);
  const dockRef = useRef(null);
  const frameRef = useRef(null);

  const startDock = (e) => {
    if (!resizable) return;
    e.preventDefault(); e.stopPropagation();
    const move = (ev) => {
      const f = frameRef.current;
      if (!f) return;
      const r = f.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const dock = x < 0.45 ? "left" : x > 0.55 ? "right" : null;
      dockRef.current = dock;
      setDockHint({ dock });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      const dock = dockRef.current;
      if (dock && dock !== (cfg.skinCart || "right")) onResize({ skinCart: dock });
      dockRef.current = null;
      setDockHint(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "grabbing";
    dockRef.current = null;
    setDockHint({ dock: null });
  };

  const edit = resizable ? {
    dock: startDock,
    splitter: (defW) => (
      <Splitter axis="x" scale={scale} value={cfg.skinCartW ?? defW} def={defW}
        min={190} max={Math.round(dev.w * 0.45)}
        sign={cfg.skinCart === "left" ? 1 : -1}
        onChange={(v) => onResize({ skinCartW: v })} />
    ),
    scaleStart: (id) => (e) =>
      startScaleDrag(e, scale, zoneZoom(cfg, id), (nv) =>
        onResize({ zoneScale: { ...(cfg.zoneScale || {}), [id]: nv } })),
    scaleReset: (id) => onResize({ zoneScale: { ...(cfg.zoneScale || {}), [id]: 1 } }),
  } : null;

  // drag affordances pick up the design's own accent (theme-aware)
  const pal = window.resolvePalette(cfg);
  return (
    <div className="canvas-stage" ref={ref} style={compact ? { padding: 10, width: "100%", height: "100%" } : undefined}>
      <div className="skin-frame" ref={frameRef}
        style={{ width: dev.w * scale, height: dev.h * scale, "--drag-accent": pal.accent, "--drag-on": pal.onAccent || "#fff" }}>
        <div className="skin-scaler" style={{ width: dev.w, height: dev.h, transform: `scale(${scale})` }}>
          <SkinView cfg={cfg} edit={edit} />
        </div>
        {dockHint && (
          <div className="pos-docks">
            <div className={"pos-dock left" + (dockHint.dock === "left" ? " on" : "")}><span>⟵ dock left</span></div>
            <div className={"pos-dock right" + (dockHint.dock === "right" ? " on" : "")}><span>dock right ⟶</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

const STACK_ROWS = ["header", "search", "tabs", "main", "pay"];

function POSPreview({ cfg, pickMode, onPick, compact, onResize }) {
  const pal = window.resolvePalette(cfg);
  const dev = window.DEVICES[cfg.device];
  const preset = window.PRESETS[cfg.preset];
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  // all hooks run before the skin early-return so the hook count never changes
  // when the user switches between a ready-made skin and the classic preview
  const [ref, scale] = useFit(dev.w, dev.h, compact ? 24 : 40);
  const S = cfg.sections;
  const phone = dev.portrait;
  const resizable = pickMode && typeof onResize === "function";

  // ---- drag state: row reordering + cart docking ----
  const stackRef = useRef(null);
  const [rowDrag, setRowDrag] = useState(null);   // { id, over } — over = visible slot index
  const rowDragRef = useRef(null);
  const [cartDock, setCartDock] = useState(null); // { dock } while dragging the cart
  const cartDockRef = useRef(null);

  if (cfg.skin && SKINS[cfg.skin]) {
    return <SkinStage cfg={cfg} compact={compact} pickMode={pickMode} onResize={onResize} />;
  }

  // saved order, tolerant of older configs / future rows
  const saved = Array.isArray(cfg.stackOrder) ? cfg.stackOrder : STACK_ROWS;
  const stackOrder = [
    ...saved.filter((id) => STACK_ROWS.includes(id)),
    ...STACK_ROWS.filter((id) => !saved.includes(id)),
  ];

  const startRowDrag = (id) => (e) => {
    if (!resizable) return;
    e.preventDefault(); e.stopPropagation();
    const move = (ev) => {
      const stack = stackRef.current;
      if (!stack) return;
      const slots = Array.from(stack.children).filter((el) => el.hasAttribute("data-row"));
      let over = slots.length;
      for (let i = 0; i < slots.length; i++) {
        const r = slots[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) { over = i; break; }
      }
      rowDragRef.current = { id, over };
      setRowDrag({ id, over });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      const d = rowDragRef.current;
      if (d && d.over != null) {
        // map the visible slot index back into the full stack order
        const vis = stackOrder.filter((rid) => rowVisible[rid]);
        const from = vis.indexOf(d.id);
        let at = Math.min(d.over, vis.length);
        if (from >= 0 && from < at) at -= 1;
        const without = vis.filter((rid) => rid !== d.id);
        const newVis = [...without.slice(0, at), d.id, ...without.slice(at)];
        const visSet = new Set(vis);
        let vi = 0;
        const next = stackOrder.map((rid) => (visSet.has(rid) ? newVis[vi++] : rid));
        if (next.join() !== stackOrder.join()) onResize({ stackOrder: next });
      }
      rowDragRef.current = null;
      setRowDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "grabbing";
    rowDragRef.current = { id, over: null };
    setRowDrag({ id, over: null });
  };

  // per-zone scale handles (corner ⤡ on hover)
  const startScale = (id) => (e) => {
    if (!resizable) return;
    startScaleDrag(e, scale, zoneZoom(cfg, id), (nv) =>
      onResize({ zoneScale: { ...(cfg.zoneScale || {}), [id]: nv } }));
  };
  const resetScale = (id) => () => onResize({ zoneScale: { ...(cfg.zoneScale || {}), [id]: 1 } });

  const startCartDrag = (e) => {
    if (!resizable) return;
    e.preventDefault(); e.stopPropagation();
    const move = (ev) => {
      const stack = stackRef.current;
      if (!stack) return;
      const r = stack.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      const dock = y > 0.72 ? "bottom" : x < 0.42 ? "left" : x > 0.58 ? "right" : null;
      cartDockRef.current = dock;
      setCartDock({ dock });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      const dock = cartDockRef.current;
      if (dock && dock !== cfg.cart) onResize({ cart: dock, selected: "cart" });
      cartDockRef.current = null;
      setCartDock(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "grabbing";
    cartDockRef.current = null;
    setCartDock({ dock: null });
  };

  const cartPos = cfg.cart; // right | left | bottom | none
  const cartW = cfg.cartW ?? 240;
  const railW = cfg.railW ?? 118;
  const posVars = {
    "--pos-accent": pal.accent, "--pos-accent-grad": pal.grad || pal.accent, "--pos-bg": pal.bg, "--pos-surface": pal.surface,
    "--pos-text": pal.text, "--pos-sub": pal.sub, "--pos-line": pal.line,
    "--pos-on-accent": pal.onAccent || "#fff",
    "--pos-font": font.stack,
    "--pos-r-panel": (cfg.radiusPanel ?? 14) + "px",
    "--pos-r-card": (cfg.radiusCard ?? 12) + "px",
    "--pos-r-btn": (cfg.radiusButton ?? 11) + "px",
  };

  const menu = S.menu && (
    <Zone id="menu" picked={cfg.selected === "menu"} pickMode={pickMode} onPick={onPick} tag="menu grid"
      style={{ flex: 1, minWidth: 0, display: "flex" }}
      zoom={zoneZoom(cfg, "menu")} scaleStart={startScale("menu")} scaleReset={resetScale("menu")}>
      <MenuGrid cfg={cfg} pal={pal} cols={phone ? 2 : cfg.menuCols} />
    </Zone>
  );

  const cartSide = !(cartPos === "bottom" || phone);
  const cartH = cfg.cartH ?? 150;
  const cart = S.cart && cartPos !== "none" && (
    <Zone id="cart" picked={cfg.selected === "cart"} pickMode={pickMode} onPick={onPick} tag="order cart"
      style={ cartSide ? { flex: "none", display: "flex" } : { flex: "none" } }
      grip={!phone ? startCartDrag : null} gripTitle="Drag to dock left · right · bottom"
      zoom={zoneZoom(cfg, "cart")} scaleStart={startScale("cart")} scaleReset={resetScale("cart")}>
      <Cart cfg={cfg} layout={cartSide ? "side" : "bottom"} width={cartW}
        height={!cartSide && !phone ? cartH : undefined} />
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
  const cartHSplit = resizable && cart && cartPos === "bottom" && !phone && (
    <Splitter axis="y" scale={scale} value={cartH} def={150} min={104} max={Math.round(dev.h * 0.45)}
      sign={-1} onChange={(v) => onResize({ cartH: v })} />
  );

  // main arrangement
  let mainClass = "pos-main";
  let mainKids;
  if (phone) {
    mainClass += " phone";
    mainKids = <>{menu}{cart}</>;
  } else if (cartPos === "bottom") {
    mainClass += " bottom";
    mainKids = <>{rail ? <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>{rail}{railSplit}{menu}</div> : menu}{cartHSplit}{cart}</>;
  } else if (cartPos === "left") {
    mainKids = <>{cart}{cartSplit("left")}{rail}{railSplit}{menu}</>;
  } else {
    mainKids = <>{rail}{railSplit}{menu}{cartSplit("right")}{cart}</>;
  }

  // every stack row, keyed — rendered in cfg.stackOrder, draggable via grips
  const rowEls = {
    header: (
      <Zone id="header" picked={cfg.selected === "header"} pickMode={pickMode} onPick={onPick} tag="header"
        grip={startRowDrag("header")} gripTitle="Drag up · down to reorder"
        zoom={zoneZoom(cfg, "header")} scaleStart={startScale("header")} scaleReset={resetScale("header")}>
        <div className="pos-header">
          {(() => {
            const b = Math.max(30, Math.min(56, Math.round((cfg.logoSize ?? 46) * 0.82)));
            return (
              <div className={"pos-logo" + (cfg.logo ? " has-img" : "")}
                style={cfg.logo ? { width: b, height: b, background: "transparent" } : undefined}>
                {cfg.logo
                  ? <img src={cfg.logo} alt="logo" style={{ width: b, height: b, objectFit: "contain", borderRadius: "inherit", display: "block" }} />
                  : (cfg.initials || "·")}
              </div>
            );
          })()}
          <div className="pos-brand">{cfg.business || "Your Business"}
            <small>// powered by kape.dev</small></div>
          <div className="pos-headright">
            <span className="pos-clock">09:41 AM</span>
            <span className="pos-avatar" />
          </div>
        </div>
      </Zone>
    ),
    search: S.search && (
      <Zone id="search" picked={cfg.selected === "search"} pickMode={pickMode} onPick={onPick} tag="search bar"
        grip={startRowDrag("search")} gripTitle="Drag up · down to reorder"
        zoom={zoneZoom(cfg, "search")} scaleStart={startScale("search")} scaleReset={resetScale("search")}>
        <div className="pos-search">
          <span className="pos-search-ic">⌕</span>
          <span className="pos-search-ph">Search the menu…</span>
        </div>
      </Zone>
    ),
    tabs: S.tabs && (
      <Zone id="tabs" picked={cfg.selected === "tabs"} pickMode={pickMode} onPick={onPick} tag="category tabs"
        grip={startRowDrag("tabs")} gripTitle="Drag up · down to reorder"
        zoom={zoneZoom(cfg, "tabs")} scaleStart={startScale("tabs")} scaleReset={resetScale("tabs")}>
        <div className="pos-tabs">
          {cfg.tabs.map((t, i) => (
            <div className={"pos-tab" + (i === 0 ? " on" : "")} key={t + i}>{t}</div>
          ))}
        </div>
      </Zone>
    ),
    main: <div className={mainClass}>{mainKids}</div>,
    pay: S.pay && cartPos === "none" && (
      <Zone id="pay" picked={cfg.selected === "pay"} pickMode={pickMode} onPick={onPick} tag="quick-pay bar"
        grip={startRowDrag("pay")} gripTitle="Drag up · down to reorder"
        zoom={zoneZoom(cfg, "pay")} scaleStart={startScale("pay")} scaleReset={resetScale("pay")}>
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--pos-line)", background: "var(--pos-surface)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--pos-sub)" }}>3 items</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 17, marginLeft: "auto", color: "var(--pos-text)" }}>₱505</span>
          <div className="pos-pay" style={{ padding: "10px 22px" }}>Charge</div>
        </div>
      </Zone>
    ),
  };
  const rowVisible = {};
  STACK_ROWS.forEach((id) => { rowVisible[id] = !!rowEls[id]; });
  const renderedIds = stackOrder.filter((id) => rowVisible[id]);

  return (
    <div className="canvas-stage" ref={ref} style={compact ? { padding: 10, width: "100%", height: "100%" } : undefined} onClick={pickMode ? () => onPick(null) : undefined}>
      <div className="pos-frame" style={{ width: dev.w * scale, height: dev.h * scale }}>
        <div className="pos-scaler" style={{ width: dev.w, height: dev.h, transform: `scale(${scale})` }}>
          <div className={"pos-bezel" + (phone ? " portrait" : "")} />
        <div className="pos" style={posVars} ref={stackRef}>
          {renderedIds.map((id, i) => (
            <div
              key={id}
              data-row={id}
              className={
                "pos-slot" +
                (rowDrag && rowDrag.id === id ? " dragging" : "") +
                (rowDrag && rowDrag.over === i ? " over" : "")
              }
              style={id === "main" ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : { flex: "none" }}
            >
              {rowEls[id]}
            </div>
          ))}
          {rowDrag && rowDrag.over === renderedIds.length && <div className="pos-drop-end" />}

          {/* dock hints while dragging the cart */}
          {cartDock && (
            <div className="pos-docks">
              <div className={"pos-dock left" + (cartDock.dock === "left" ? " on" : "")}><span>⟵ dock left</span></div>
              <div className={"pos-dock right" + (cartDock.dock === "right" ? " on" : "")}><span>dock right ⟶</span></div>
              <div className={"pos-dock bottom" + (cartDock.dock === "bottom" ? " on" : "")}><span>dock bottom ⟱</span></div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { POSPreview, BoutiqueLive, TerminalLive, GalleryLive, ConsoleLive, SKINS, SkinView, FitBox, useFit });
