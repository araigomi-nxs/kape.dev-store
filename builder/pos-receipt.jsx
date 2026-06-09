// ============ POS Builder · receipt designer ============
// A printed-receipt preview + controls. Reuses brand (name, initials,
// accent, font) from the top-level config so the receipt stays on-brand.

const peso = (n) => "₱" + n.toFixed(2);

// Lightweight faux-QR: finder squares in three corners + a deterministic fill.
function FauxQR({ size = 58 }) {
  const N = 11;
  const inBox = (r, c, br, bc) => r >= br && r < br + 3 && c >= bc && c < bc + 3;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const finder = inBox(r, c, 0, 0) || inBox(r, c, 0, N - 3) || inBox(r, c, N - 3, 0);
      cells.push(finder || ((r * 7 + c * 13 + r * c) % 3 === 0));
    }
  }
  return (
    <div className="rcpt-qr" style={{ gridTemplateColumns: `repeat(${N},1fr)`, width: size, height: size }}>
      {cells.map((on, i) => <i key={i} className={on ? "on" : ""} />)}
    </div>
  );
}

function ReceiptPreview({ cfg, compact }) {
  const pal = window.PALETTES[cfg.palette];
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const r = cfg.receipt || window.RECEIPT_DEFAULTS;
  const el = r.elements || {};
  const paper = window.RECEIPT_PAPERS[r.paper] || window.RECEIPT_PAPERS["80mm"];

  const items = [
    { q: 2, n: "Cappuccino", u: 130 },
    { q: 1, n: "Croissant", u: 85 },
    { q: 1, n: "Spanish Latte", u: 160 },
  ];
  const subtotal = items.reduce((s, it) => s + it.q * it.u, 0);
  const tax = Math.round(subtotal * 0.12 * 100) / 100;
  const total = subtotal + tax;
  const cash = 600;

  const rule = <div className="rcpt-rule" />;

  return (
    <div className={"rcpt-stage" + (compact ? " compact" : "")}>
      <div className="rcpt-capture">
        <div
          className="rcpt-paper"
          style={{
            width: paper.w,
            fontFamily: "var(--font-mono)",
            "--r-accent": pal.accent,
          }}
        >
          {/* logo + business name */}
          {el.logo && (
            <div className="rcpt-head">
              <div className={"rcpt-logo" + (cfg.logo ? " has-img" : "")}
                style={cfg.logo
                  ? { height: "auto", width: "auto", borderRadius: 4, background: "transparent" }
                  : { background: pal.accent, fontFamily: font.stack }}>
                {cfg.logo
                  ? <img src={cfg.logo} alt="logo" style={{ height: cfg.logoSize ?? 46, width: "auto", maxWidth: "100%", objectFit: "contain", display: "block" }} />
                  : (cfg.initials || "·")}
              </div>
              <div className="rcpt-biz" style={{ fontFamily: font.stack }}>{cfg.business || "Your Business"}</div>
            </div>
          )}

          {/* address & phone */}
          {el.contact && (
            <div className="rcpt-contact">
              <div>{r.address}</div>
              <div>{r.phone}</div>
            </div>
          )}

          {(el.logo || el.contact) && rule}

          {/* order meta */}
          {el.meta && (
            <>
              <div className="rcpt-meta">
                <span>Order #0042</span><span>Jun 09, 2026</span>
              </div>
              <div className="rcpt-meta">
                <span>Cashier: Maria</span><span>Table 4</span>
              </div>
              {rule}
            </>
          )}

          {/* items */}
          <div className="rcpt-cols"><span>QTY ITEM</span><span>AMOUNT</span></div>
          <div className="rcpt-items">
            {items.map((it, i) => (
              <div className="rcpt-item" key={i}>
                <span className="rq">{it.q}</span>
                <span className="rn">{it.n}<small>{peso(it.u)} ea</small></span>
                <span className="ra">{peso(it.q * it.u)}</span>
              </div>
            ))}
          </div>
          {rule}

          {/* totals */}
          <div className="rcpt-tot"><span>Subtotal</span><span>{peso(subtotal)}</span></div>
          <div className="rcpt-tot"><span>{r.taxLabel}</span><span>{peso(tax)}</span></div>
          <div className={"rcpt-tot grand" + (r.accentTotal ? " accent" : "")}>
            <span>TOTAL</span><span>{peso(total)}</span>
          </div>

          {/* payment */}
          {el.payment && (
            <>
              {rule}
              <div className="rcpt-tot"><span>CASH</span><span>{peso(cash)}</span></div>
              <div className="rcpt-tot"><span>CHANGE</span><span>{peso(cash - total)}</span></div>
            </>
          )}

          {/* footer */}
          {el.footer && (
            <>
              {rule}
              <div className="rcpt-footer">{r.footer}</div>
              {r.social && <div className="rcpt-social">{r.social}</div>}
            </>
          )}

          {/* qr */}
          {el.qr && (
            <div className="rcpt-qrwrap">
              <FauxQR />
              <div className="rcpt-qrcap">Scan to reorder</div>
            </div>
          )}

          <div className="rcpt-perf" />
        </div>
      </div>
    </div>
  );
}

// ---------------- Left: receipt layers ----------------
function ReceiptLayers({ cfg, set }) {
  const r = cfg.receipt || window.RECEIPT_DEFAULTS;
  const el = r.elements || {};
  return (
    <div className="panel-col left">
      <div className="panel-head"><span className="mono">Receipt blocks</span></div>
      <div className="panel-scroll">
        {window.RECEIPT_DEFS.map((def) => {
          const on = !!el[def.id];
          return (
            <div key={def.id}
              className={"layer" + (on ? "" : " off")}
              onClick={() => set.receiptEl(def.id)}>
              <button className="eye" title={def.locked ? "always prints" : "show / hide"}
                onClick={(e) => { e.stopPropagation(); set.receiptEl(def.id); }}>
                {on ? "◉" : "○"}
              </button>
              <span className="name">{def.label}</span>
              {def.locked ? <span className="lock">req</span> : <span className="grip">⠿</span>}
            </div>
          );
        })}
        <div className="hint">Toggle what prints on the customer's receipt. <b>Logo</b>, <b>items</b> and <b>totals</b> always print. Brand name, colour &amp; typeface come from the screen design.</div>
      </div>
    </div>
  );
}

// ---------------- Right: receipt inspector ----------------
function ReceiptInspector({ cfg, set }) {
  const r = cfg.receipt || window.RECEIPT_DEFAULTS;
  const field = (k) => (e) => set.receipt({ [k]: e.target.value });
  return (
    <div className="panel-col right">
      <div className="panel-head"><span className="mono">Inspector</span>
        <span className="mono acc" style={{ marginLeft: "auto" }}>Receipt</span></div>
      <div className="panel-scroll">

        {/* paper width */}
        <div className="insp-sec">
          <span className="mono">Paper width</span>
          <div className="posgrid">
            {window.RECEIPT_PAPER_ORDER.map((k) => {
              const p = window.RECEIPT_PAPERS[k];
              return (
                <div key={k} className={"poschip" + (r.paper === k ? " on" : "")}
                  onClick={() => set.receipt({ paper: k })}>
                  <span className="ic">{"▤"}</span>{p.name}
                  <span style={{ display: "block", fontSize: 10, color: "var(--cream-mute)", marginTop: 2 }}>{p.tagline}</span>
                </div>
              );
            })}
          </div>
          <div className="hint">58mm = compact handheld printers · 80mm = standard countertop printers.</div>
        </div>

        {/* store details */}
        <div className="insp-sec">
          <span className="mono">Store details</span>
          <div style={{ marginBottom: 14 }}><LogoField cfg={cfg} set={set} /></div>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="mono">Address</span>
            <input className="inp" value={r.address} maxLength={48}
              onChange={field("address")} placeholder="123 Brew St., Quezon City" />
          </label>
          <label className="field">
            <span className="mono">Phone</span>
            <input className="inp" value={r.phone} maxLength={28}
              onChange={field("phone")} placeholder="+63 917 000 0000" />
          </label>
        </div>

        {/* tax */}
        <div className="insp-sec">
          <span className="mono">Tax line</span>
          <label className="field">
            <span className="mono">Tax label</span>
            <input className="inp" value={r.taxLabel} maxLength={20}
              onChange={field("taxLabel")} placeholder="VAT (12%)" />
          </label>
          <div className="hint">Shown on the totals block. Use your country's tax name &amp; rate.</div>
        </div>

        {/* footer */}
        <div className="insp-sec">
          <span className="mono">Footer</span>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="mono">Thank-you message</span>
            <textarea className="inp" value={r.footer} maxLength={80}
              onChange={field("footer")} placeholder="Thank you! Come back soon" />
          </label>
          <label className="field">
            <span className="mono">Social handle</span>
            <input className="inp" value={r.social} maxLength={28}
              onChange={field("social")} placeholder="@yourcafe" />
          </label>
        </div>

        {/* accent total */}
        <div className="insp-sec">
          <span className="mono">Style</span>
          <div className="posgrid">
            {[[true, "On"], [false, "Off"]].map(([v, lb]) => (
              <div key={lb} className={"poschip" + (!!r.accentTotal === v ? " on" : "")}
                onClick={() => set.receipt({ accentTotal: v })}>{lb}</div>
            ))}
          </div>
          <div className="hint">Highlights the <b>TOTAL</b> line in your brand accent colour.</div>
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { ReceiptPreview, ReceiptLayers, ReceiptInspector });
