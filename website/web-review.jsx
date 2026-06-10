// ============ Website Builder · review + commission submit ============
// Mirrors the POS builder flow: spec sheet + contact form → Supabase
// `commissions` table, with a best-effort PNG snapshot upload.

function webSpec(cfg) {
  const r = window.resolveWeb(cfg);
  const edited = Object.keys((cfg.content || {})[cfg.template] || {});
  const rows = [
    { k: "Template", v: <span>{r.t.name} <span className="dim">· {r.t.tagline}</span></span> },
    { k: "Vibe", v: r.t.vibe },
    { k: "Accent", v: <span><span className="dotc" style={{ background: r.accent }} />{r.accent}{!cfg.accent && <span className="dim"> · template default</span>}</span> },
    { k: "Headline font", v: <span style={{ fontFamily: r.font.stack }}>{r.font.name} <span className="dim">· {r.font.note}</span></span> },
    { k: "Sections", v: <span>{r.t.sections.map((s) => <span className="tg" key={s}>{s}</span>)}</span> },
    { k: "Site name", v: r.data.brand },
    { k: "Custom text", v: edited.length ? `${edited.length} field${edited.length > 1 ? "s" : ""} rewritten` : "Template copy (placeholder)" },
  ];
  const text = [
    "kape.dev — WEBSITE COMMISSION SPEC",
    "==================================",
    "",
    `Template      : ${r.t.name} (${r.t.tagline})`,
    `Vibe          : ${r.t.vibe}`,
    `Accent colour : ${r.accent}${cfg.accent ? "" : " (template default)"}`,
    `Headline font : ${r.font.name}`,
    `Sections      : ${r.t.sections.join(", ")}`,
    `Site name     : ${r.data.brand}`,
    "",
    "CONTENT",
    "-------",
    ...Object.entries(r.data).map(([k, v]) => `${k.padEnd(12)}: ${v}`),
    "",
    "Generated " + new Date().toLocaleString(),
  ].join("\n");
  return { rows, text, r };
}

function webDownload(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function WebField({ label, req, value, onChange, err, placeholder, full, area }) {
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

function WebReviewModal({ cfg, onClose, toast }) {
  const spec = webSpec(cfg);
  const capRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", business: spec.r.data.brand || "", email: "", contact: "", notes: "" });
  const [errs, setErrs] = useState({});
  const upd = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const staticCfg = { ...cfg };

  const captureNode = () => capRef.current && capRef.current.firstChild;

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

        // PNG snapshot of the customized site (best-effort — never blocks submit)
        let snapshot_url = null;
        try {
          const node = captureNode();
          if (node && window.htmlToImage) {
            const dataUrl = await window.htmlToImage.toPng(node, { pixelRatio: 1, width: 1280 });
            const blob = await (await fetch(dataUrl)).blob();
            const fname = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
            const up = await sb.storage.from("commission-snapshots").upload(fname, blob, { contentType: "image/png", upsert: false });
            if (!up.error) snapshot_url = sb.storage.from("commission-snapshots").getPublicUrl(fname).data.publicUrl;
          }
        } catch (_) { /* optional */ }

        const { error } = await sb.from("commissions").insert({
          name: form.name.trim(),
          business: form.business.trim() || null,
          email: form.email.trim(),
          contact: form.contact.trim() || null,
          notes: form.notes.trim() || null,
          preset: "Website · " + spec.r.t.name,
          device: "Responsive website",
          palette: spec.r.accent,
          font: spec.r.font.name,
          spec: spec.text,
          design: cfg,
          snapshot_url,
        });
        if (error) throw error;
      } else {
        webDownload("kape-website-commission.json", JSON.stringify(payload, null, 2), "application/json");
      }
    } catch (e) {
      toast("Couldn't reach the server — saved a local copy instead");
      webDownload("kape-website-commission.json", JSON.stringify(payload, null, 2), "application/json");
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
                <h2>Review &amp; send your commission</h2>
                <span className="mono">// this is exactly what kape.dev receives to build</span>
              </div>
              <button className="modal-x" onClick={onClose}>✕</button>
            </div>

            <div className="modal-body">
              <div className="review-left">
                <span className="mono lblrow">Site snapshot</span>
                <div className="snap-wrap">
                  <div className="snap-mini">
                    <TemplateView cfg={staticCfg} onEdit={null} />
                  </div>
                </div>
                <div className="snap-cap">{spec.r.t.name} · {spec.r.accent} · {spec.r.font.name}</div>
                <button className="btn ghost wfull" onClick={() => { webDownload("kape-website-spec.txt", spec.text); toast("Spec sheet downloaded"); }}>
                  ↧ Download spec .txt
                </button>
              </div>

              <div className="review-right">
                <span className="mono lblrow">Design spec</span>
                <div className="spec">
                  {spec.rows.map((r) => (
                    <div className="spec-row" key={r.k}><span className="k">{r.k}</span><span className="v">{r.v}</span></div>
                  ))}
                </div>

                <span className="mono lblrow" style={{ marginTop: 18 }}>Your details</span>
                <div className="form-grid">
                  <WebField label="Your name" req value={form.name} onChange={upd("name")} err={errs.name} placeholder="Juan dela Cruz" />
                  <WebField label="Business" value={form.business} onChange={upd("business")} placeholder="Juan's Café" />
                  <WebField label="Email" req value={form.email} onChange={upd("email")} err={errs.email} placeholder="you@email.com" />
                  <WebField label="Phone / Messenger" value={form.contact} onChange={upd("contact")} placeholder="+63 · @handle" />
                  <WebField label="Notes for the build" full area value={form.notes} onChange={upd("notes")} placeholder="Pages you need, photos you have, deadline…" />
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <span className="note">// we reply within 2 days · no payment yet</span>
              <div className="grow" />
              <button className="btn solid" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send commission →"}</button>
            </div>

            {/* hidden full-width render captured for the snapshot */}
            <div ref={capRef} aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, width: 1280, pointerEvents: "none" }}>
              <TemplateView cfg={staticCfg} onEdit={null} />
            </div>
          </>
        ) : (
          <div className="success">
            <div className="ring">✓</div>
            <h2>Commission sent ☕</h2>
            <p>Thanks, {form.name.split(" ")[0] || "friend"}! Your <b>{spec.r.t.name}</b> website design has landed in the kape.dev crew's dashboard. We'll reach out at <b>{form.email}</b> within 2 days.</p>
            <div className="success-row">
              <button className="btn ghost" onClick={() => webDownload("kape-website-spec.txt", spec.text)}>↧ Save spec copy</button>
              <button className="btn solid" onClick={onClose}>Back to builder</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { WebReviewModal, webSpec });
