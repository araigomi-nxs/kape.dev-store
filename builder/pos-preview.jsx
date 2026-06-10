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

// ---- Boutique skin ----------------------------------------------------------
// A distinct "café" design (greeting hero · pill tabs · icon cards · order rail).
// Driven by cfg so theme/font/corners stay customizable; used in both the
// ready-made modal and the live builder canvas, so they always match.
function BoutiqueLive({ cfg }) {
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
      <div className="bq-header">
        <div className={"bq-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="bq-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="bq-headright"><span className="bq-clock">09:41 AM</span><span className="bq-avatar" /></div>
      </div>
      <div className="bq-body">
      <div className="bq-main">
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
      <div className="bq-side">
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
function TerminalLive({ cfg }) {
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
      <div className="cp-header">
        <div className={"cp-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="cp-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="cp-headright"><span className="cp-clock">09:41 AM</span><span className="cp-avatar" /></div>
      </div>
      <div className="cp-body">
        <div className="cp-main">
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
        <div className="cp-side">
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
function GalleryLive({ cfg }) {
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
      <div className="gl-header">
        <div className={"gl-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="gl-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="gl-headright"><span className="gl-clock">09:41 AM</span><span className="gl-avatar" /></div>
      </div>
      <div className="gl-body">
        <div className="gl-main">
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
        <div className="gl-side">
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
function ConsoleLive({ cfg }) {
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
      <div className="cn-header">
        <div className={"cn-logo" + (cfg.logo ? " has-img" : "")}>
          {cfg.logo ? <img src={cfg.logo} alt="logo" /> : (cfg.initials || "·")}
        </div>
        <div className="cn-brand">{cfg.business || "Your Business"}<small>// powered by kape.dev</small></div>
        <div className="cn-headright"><span className="cn-clock">09:41 AM</span><span className="cn-avatar" /></div>
      </div>
      <div className="cn-body">
        <div className="cn-main">
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
        <div className="cn-side">
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
function SkinView({ cfg }) {
  const C = SKINS[cfg.skin];
  return C ? <C cfg={cfg} /> : null;
}

// Renders a skin at its true device width (so container queries reflow for
// tablet/phone), scaled to fit the canvas like the generic device preview.
function SkinStage({ cfg, compact }) {
  const dev = window.DEVICES[cfg.device] || window.DEVICES.tablet;
  const [ref, scale] = useFit(dev.w, dev.h, compact ? 24 : 48);
  return (
    <div className="canvas-stage" ref={ref} style={compact ? { padding: 10, width: "100%", height: "100%" } : undefined}>
      <div className="skin-frame" style={{ width: dev.w * scale, height: dev.h * scale }}>
        <div className="skin-scaler" style={{ width: dev.w, height: dev.h, transform: `scale(${scale})` }}>
          <SkinView cfg={cfg} />
        </div>
      </div>
    </div>
  );
}

function POSPreview({ cfg, pickMode, onPick, compact, onResize }) {
  if (cfg.skin && SKINS[cfg.skin]) {
    return <SkinStage cfg={cfg} compact={compact} />;
  }
  const pal = window.resolvePalette(cfg);
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

          {/* search */}
          {S.search && (
            <Zone id="search" picked={cfg.selected === "search"} pickMode={pickMode} onPick={onPick} tag="search bar" style={{ flex: "none" }}>
              <div className="pos-search">
                <span className="pos-search-ic">⌕</span>
                <span className="pos-search-ph">Search the menu…</span>
              </div>
            </Zone>
          )}

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

Object.assign(window, { POSPreview, BoutiqueLive, TerminalLive, GalleryLive, ConsoleLive, SKINS, SkinView, FitBox, useFit });
