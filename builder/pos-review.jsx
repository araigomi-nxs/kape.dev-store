// ============ POS Builder · review + capture ============

function buildSpec(cfg) {
  const pal = window.resolvePalette(cfg);
  const dev = window.DEVICES[cfg.device];
  const preset = window.PRESETS[cfg.preset];
  const font = window.FONTS[cfg.font] || window.FONTS.inter;
  const cartMap = { right: "Right side", left: "Left side", bottom: "Bottom bar", none: "Hidden" };
  const sideCart = cfg.cart === "right" || cfg.cart === "left";
  const proportions = [
    sideCart ? `cart ${cfg.cartW ?? 240}px` : null,
    preset.rail ? `rail ${cfg.railW ?? 118}px` : null,
  ].filter(Boolean).join(" · ") || "default";
  const corners = `panels ${cfg.radiusPanel ?? 14}px · cards ${cfg.radiusCard ?? 12}px · buttons ${cfg.radiusButton ?? 11}px`;
  const menuLayout = cfg.menuLayout || "grid";
  const menuLayoutName = { grid: "Grid", list: "List", compact: "Compact" }[menuLayout] || "Grid";
  const menuDesc = menuLayout === "list" ? "List" : `${menuLayoutName} · ${cfg.menuCols} cols`;
  const onSecs = window.SECTION_DEFS.filter((s) => {
    if (s.id === "cart") return cfg.cart !== "none" && cfg.sections.cart;
    return cfg.sections[s.id];
  }).map((s) => s.label);
  const rc = cfg.receipt || window.RECEIPT_DEFAULTS;
  const rcPaper = (window.RECEIPT_PAPERS[rc.paper] || window.RECEIPT_PAPERS["80mm"]).name;
  const rcBlocks = window.RECEIPT_DEFS.filter((d) => rc.elements && rc.elements[d.id]).map((d) => d.label);
  return {
    rows: [
      { k: "Layout", v: <span>{preset.name} <span style={{ color: "var(--cream-mute)", fontFamily: "var(--font-mono)", fontSize: 11 }}>· {preset.tagline}</span></span> },
      { k: "Device", v: `${dev.name} (${dev.w}×${dev.h})` },
      { k: "Colour", v: <span><span className="dotc" style={{ background: pal.accent }} />{pal.name} · {pal.accent}{pal.custom && <span style={{ color: "var(--cream-mute)", fontFamily: "var(--font-mono)", fontSize: 11 }}> · bg {pal.bg} · text {pal.text}</span>}</span> },
      { k: "Typeface", v: <span style={{ fontFamily: font.stack }}>{font.name} <span style={{ color: "var(--cream-mute)", fontFamily: "var(--font-mono)", fontSize: 11 }}>· {font.note}</span></span> },
      { k: "Order cart", v: cartMap[cfg.cart] },
      { k: "Menu", v: menuDesc },
      { k: "Proportions", v: proportions },
      { k: "Corners", v: corners },
      { k: "Sections", v: <span>{onSecs.map((s) => <span className="tg" key={s}>{s}</span>)}</span> },
      { k: "Tabs", v: <span>{cfg.tabs.map((t) => <span className="tg" key={t}>{t}</span>)}</span> },
      { k: "Business", v: cfg.business || "—" },
      { k: "Logo", v: cfg.logo ? <span><img src={cfg.logo} alt="logo" style={{ height: 22, width: "auto", maxWidth: 60, verticalAlign: "-6px", marginRight: 8, borderRadius: 4 }} />Custom image (included)</span> : `Initials "${cfg.initials}" (file to follow)` },
      { k: "Receipt", v: <span>{rcPaper} · {rcBlocks.map((b) => <span className="tg" key={b}>{b}</span>)}</span> },
    ],
    text: specText(cfg, pal, dev, preset, cartMap, onSecs, proportions, corners, menuDesc, font, rc, rcPaper, rcBlocks),
  };
}

function specText(cfg, pal, dev, preset, cartMap, onSecs, proportions, corners, menuDesc, font, rc, rcPaper, rcBlocks) {
  return [
    "kape.dev — CUSTOM POS COMMISSION SPEC",
    "=====================================",
    "",
    `Layout preset : ${preset.name} (${preset.tagline})`,
    `Device        : ${dev.name} — ${dev.w}x${dev.h}`,
    `Colour theme  : ${pal.name} (accent ${pal.accent}, bg ${pal.bg}, surface ${pal.surface}, text ${pal.text})`,
    `Typeface      : ${font.name} (${font.stack})`,
    `Order cart    : ${cartMap[cfg.cart]}`,
    `Menu layout   : ${menuDesc}`,
    `Proportions   : ${proportions}`,
    `Corners       : ${corners}`,
    `Sections on   : ${onSecs.join(", ")}`,
    `Category tabs : ${cfg.tabs.join(", ")}`,
    `Business name : ${cfg.business}`,
    `Logo          : ${cfg.logo ? "Custom image uploaded (in design payload)" : `Initials "${cfg.initials}"`}`,
    "",
    "RECEIPT",
    "-------",
    `Paper width   : ${rcPaper}`,
    `Blocks on     : ${rcBlocks.join(", ")}`,
    `Address       : ${rc.address}`,
    `Phone         : ${rc.phone}`,
    `Tax label     : ${rc.taxLabel}`,
    `Footer        : ${rc.footer}`,
    `Social handle : ${rc.social}`,
    `Accent total  : ${rc.accentTotal ? "yes" : "no"}`,
    "",
    "Generated " + new Date().toLocaleString(),
  ].join("\n");
}

function download(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Field({ label, req, value, onChange, err, placeholder, full, area }) {
  return (
    <label className={"field" + (full ? " full" : "")}>
      <span className="mono">{label}{req && <span className="req"> *</span>}</span>
      {area
        ? <textarea className={"inp" + (err ? " err" : "")} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input className={"inp" + (err ? " err" : "")} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
      {err && <span className="err-msg">{err}</span>}
    </label>
  );
}

function ReviewModal({ cfg, mode, onClose, toast }) {
  const spec = buildSpec(cfg);
  const snapRef = useRef(null);
  const capRef = useRef(null); // hidden full-size boutique render — captured at natural width
  const isSkin = cfg.skin && window.SKINS[cfg.skin] && cfg.canvasMode !== "receipt";
  const skinName = cfg.skin ? cfg.skin[0].toUpperCase() + cfg.skin.slice(1) : "";
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", business: cfg.business || "", email: "", contact: "", notes: "" });
  const [errs, setErrs] = useState({});
  const upd = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // boutique is responsive — capture a dedicated full-width node so the layout
  // doesn't collapse; everything else captures the scaled device screen.
  const captureNode = () =>
    (isSkin && capRef.current && capRef.current.querySelector(".skin-screen")) ||
    (snapRef.current && snapRef.current.querySelector(".pos, .skin-screen, .rcpt-capture"));

  const captureImage = async () => {
    // capture the full device-resolution screen (.pos), not the scaled-down frame, for a crisp PNG
    const node = captureNode();
    if (!node || !window.htmlToImage) { toast("Image export unavailable offline — spec downloaded instead"); download("kape-pos-spec.txt", spec.text); return; }
    try {
      setBusy(true);
      const dataUrl = await window.htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: window.resolvePalette(cfg).bg });
      const a = document.createElement("a"); a.href = dataUrl; a.download = "kape-pos-layout.png"; a.click();
      toast("Layout image downloaded");
    } catch (e) { toast("Couldn't render image — try the spec download"); }
    finally { setBusy(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Enter a valid email";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    const payload = { contact: form, design: cfg, spec: spec.text };
    try {
      const ready = window.supabase && window.SUPABASE_URL && !window.SUPABASE_URL.includes("YOUR-PROJECT");
      if (ready) {
        const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

        // render + upload a PNG snapshot of the chosen layout (best-effort)
        let snapshot_url = null;
        try {
          const node = captureNode();
          if (node && window.htmlToImage) {
            const dataUrl = await window.htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: window.resolvePalette(cfg).bg });
            const blob = await (await fetch(dataUrl)).blob();
            const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
            const up = await sb.storage.from("commission-snapshots").upload(fname, blob, { contentType: "image/png", upsert: false });
            if (!up.error) snapshot_url = sb.storage.from("commission-snapshots").getPublicUrl(fname).data.publicUrl;
          }
        } catch (_) { /* snapshot is optional — keep going */ }

        // upload the customer's logo image to storage (best-effort)
        let logo_url = null;
        try {
          if (cfg.logo && cfg.logo.startsWith("data:")) {
            const blob = await (await fetch(cfg.logo)).blob();
            const ext = (blob.type.split("/")[1] || "png").replace("+xml", "");
            const fname = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const up = await sb.storage.from("commission-snapshots").upload(fname, blob, { contentType: blob.type || "image/png", upsert: false });
            if (!up.error) logo_url = sb.storage.from("commission-snapshots").getPublicUrl(fname).data.publicUrl;
          }
        } catch (_) { /* logo is optional — keep going */ }

        const { error } = await sb.from("commissions").insert({
          name: form.name.trim(),
          business: form.business.trim() || null,
          email: form.email.trim(),
          contact: form.contact.trim() || null,
          notes: form.notes.trim() || null,
          preset: window.PRESETS[cfg.preset]?.name || null,
          device: window.DEVICES[cfg.device]?.name || null,
          palette: window.resolvePalette(cfg)?.name || null,
          font: (window.FONTS[cfg.font] || window.FONTS.inter).name,
          custom_palette: cfg.palette === "custom" ? (cfg.customPalette || window.DEFAULT_CUSTOM) : null,
          receipt: cfg.receipt || window.RECEIPT_DEFAULTS,
          spec: spec.text,
          design: cfg,
          snapshot_url,
          logo_url,
        });
        if (error) throw error;
      } else {
        // no backend configured — fall back to a local copy
        download("kape-pos-commission.json", JSON.stringify(payload, null, 2), "application/json");
      }
    } catch (e) {
      toast("Couldn't reach the server — saved a local copy instead");
      download("kape-pos-commission.json", JSON.stringify(payload, null, 2), "application/json");
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {!sent ? (
          <>
            <div className="modal-head">
              <div>
                <h2>{mode === "submit" ? "Review & send your commission" : "Export your spec"}</h2>
                <span className="mono">// this is exactly what kape.dev receives to build</span>
              </div>
              <button className="modal-x" onClick={onClose}>✕</button>
            </div>

            <div className="modal-body">
              {/* left: snapshot */}
              <div className="review-left">
                <span className="mono" style={{ display: "block", marginBottom: 10 }}>Layout snapshot</span>
                <div className={"snap-wrap" + (isSkin ? " custom" : "")} ref={snapRef} style={{ height: 240 }}>
                  {cfg.canvasMode === "receipt"
                    ? <ReceiptPreview cfg={cfg} compact={true} />
                    : isSkin
                      ? <FitBox><SkinView cfg={{ ...cfg, selected: null }} /></FitBox>
                      : <POSPreview cfg={{ ...cfg, selected: null }} pickMode={false} onPick={() => {}} compact={true} />}
                </div>
                {isSkin && (
                  <div ref={capRef} aria-hidden="true"
                    style={{ position: "fixed", left: -99999, top: 0, width: 1040, pointerEvents: "none" }}>
                    <SkinView cfg={{ ...cfg, selected: null }} />
                  </div>
                )}
                <div className="snap-cap">
                  {cfg.canvasMode === "receipt"
                    ? <>Receipt · {(window.RECEIPT_PAPERS[(cfg.receipt || {}).paper] || window.RECEIPT_PAPERS["80mm"]).name} · {window.resolvePalette(cfg).name}</>
                    : <>{window.DEVICES[cfg.device].name} · {isSkin ? skinName : window.PRESETS[cfg.preset].name} · {window.resolvePalette(cfg).name}</>}
                </div>

                <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
                  <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={captureImage} disabled={busy}>
                    {busy ? "Rendering…" : "↧ PNG"}
                  </button>
                  <button className="btn ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => { download("kape-pos-spec.txt", spec.text); toast("Spec sheet downloaded"); }}>
                    ↧ Spec .txt
                  </button>
                </div>
              </div>

              {/* right: spec + form */}
              <div className="review-right">
                <span className="mono" style={{ display: "block", marginBottom: 8 }}>Design spec</span>
                <div className="spec">
                  {spec.rows.map((r) => (
                    <div className="spec-row" key={r.k}><span className="k">{r.k}</span><span className="v">{r.v}</span></div>
                  ))}
                </div>

                {mode === "submit" && (
                  <>
                    <span className="mono" style={{ display: "block", margin: "20px 0 10px" }}>Your details</span>
                    <div className="form-grid">
                      <Field label="Your name" req value={form.name} onChange={upd("name")} err={errs.name} placeholder="Juan dela Cruz" />
                      <Field label="Business" value={form.business} onChange={upd("business")} placeholder="Juan's Café" />
                      <Field label="Email" req value={form.email} onChange={upd("email")} err={errs.email} placeholder="you@email.com" />
                      <Field label="Phone / Messenger" value={form.contact} onChange={upd("contact")} placeholder="+63 · @handle" />
                      <Field label="Notes for the build" full area value={form.notes} onChange={upd("notes")} placeholder="Anything special — hardware, printer, must-have features…" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modal-foot">
              <span className="note">// {mode === "submit" ? "we reply within 2 days · no payment yet" : "download the spec or submit when ready"}</span>
              <div className="grow" />
              {mode === "submit"
                ? <button className="btn solid" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send commission →"}</button>
                : <button className="btn solid" onClick={() => { download("kape-pos-spec.txt", spec.text); toast("Spec sheet downloaded"); }}>↧ Download spec</button>}
            </div>
          </>
        ) : (
          <div className="success">
            <div className="ring">✓</div>
            <h2>Commission sent ☕</h2>
            <p>Thanks, {form.name.split(" ")[0] || "friend"}! Your <b>{window.PRESETS[cfg.preset].name}</b> POS design has landed in the kape.dev crew's dashboard. We'll reach out at <b>{form.email}</b> within 2 days.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="btn ghost" onClick={() => { download("kape-pos-spec.txt", spec.text); }}>↧ Save spec copy</button>
              <button className="btn solid" onClick={onClose}>Back to builder</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ready-made template browser. Shows the design preview only; "Next →" cycles
// to the next ready-made design, "Customize it" applies the one on screen.
// Applying merges the template over the current cfg, so the customer's business
// name & logo are preserved.
function ReadyMadeModal({ cfg, set, onClose, toast }) {
  const keys = window.TEMPLATE_ORDER;
  const [idx, setIdx] = useState(0);
  const k = keys[idx];
  const t = window.TEMPLATES[k];
  const previewCfg = { ...cfg, ...t.cfg, sections: { ...cfg.sections, ...t.cfg.sections }, selected: null };
  const custom = previewCfg.skin && previewCfg.skin !== "classic";

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal rm-modal">
        <div className="modal-head">
          <div>
            <h2>Ready-made designs</h2>
            <span className="mono">// {t.name} · {idx + 1} of {keys.length}</span>
          </div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body rm-body">
          <div className={"snap-wrap rm-snap" + (custom ? " custom" : "")}>
            {custom
              ? <FitBox><SkinView cfg={previewCfg} /></FitBox>
              : <POSPreview cfg={previewCfg} pickMode={false} onPick={() => {}} compact={true} />}
          </div>
        </div>

        <div className="modal-foot">
          <span className="note">// {t.name} — {t.tagline}</span>
          <div className="grow" />
          {keys.length > 1 && (
            <button className="btn ghost" onClick={() => setIdx((i) => (i - 1 + keys.length) % keys.length)}>← Previous</button>
          )}
          <button className="btn ghost" onClick={() => { set.applyTemplate(k); toast(t.name + " applied — customize away"); onClose(); }}>Customize it</button>
          {keys.length > 1 && (
            <button className="btn solid" onClick={() => setIdx((i) => (i + 1) % keys.length)}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ReviewModal, ReadyMadeModal, buildSpec });
