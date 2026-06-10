// ============ Website Builder · templates ============
// Each template is a real mini-site. Text marked with <E k="..."/> is
// contentEditable in customize mode and plain text in previews/captures.

function Editable({ value, onChange, editable, tag = "span", className, style }) {
  const Tag = tag;
  const ref = useRef(null);
  // uncontrolled: write the text once on mount so the caret never jumps.
  useEffect(() => { if (ref.current) ref.current.innerText = value; }, []);
  if (!editable) return <Tag className={className} style={style}>{value}</Tag>;
  return (
    <Tag
      ref={ref}
      className={"wb-txt" + (className ? " " + className : "")}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => onChange(e.currentTarget.innerText.replace(/\n+/g, " ").trim() || value)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
    />
  );
}

// per-template hook: resolves cfg and returns an <E> bound to that template's content
function useTpl(cfg, onEdit) {
  const r = window.resolveWeb(cfg);
  const E = ({ k, tag, className, style }) => (
    <Editable
      key={r.key + ":" + k + ":" + (cfg.rev || 0)}
      tag={tag} className={className} style={style}
      value={r.data[k]}
      editable={!!onEdit}
      onChange={(v) => onEdit && onEdit(k, v)}
    />
  );
  return { ...r, E };
}

/* ---------------- 1 · Atelier — light editorial portfolio ---------------- */
function TplMinimal({ cfg, onEdit }) {
  const { E, accent, font } = useTpl(cfg, onEdit);
  return (
    <div className="tm" style={{ "--a": accent, "--hf": font.stack }}>
      <nav className="tm-nav">
        <E k="brand" className="tm-brand" />
        <div className="tm-links">
          <E k="navA" /><E k="navB" /><E k="navC" />
          <E k="navCta" className="tm-navcta" />
        </div>
      </nav>

      <header className="tm-hero">
        <E k="kicker" tag="p" className="tm-kicker" />
        <h1 className="tm-h1"><E k="heroA" tag="span" /><br /><em><E k="heroB" tag="span" /></em></h1>
        <E k="heroSub" tag="p" className="tm-sub" />
        <div className="tm-btns">
          <E k="btnA" className="tm-btn solid" />
          <E k="btnB" className="tm-btn" />
        </div>
      </header>

      <section className="tm-work">
        <E k="workTitle" tag="h2" className="tm-h2" />
        <div className="tm-grid">
          {[["w1t", "w1c", "lin1"], ["w2t", "w2c", "lin2"], ["w3t", "w3c", "lin3"]].map(([t, c, g]) => (
            <figure className="tm-card" key={t}>
              <div className={"tm-thumb " + g}><span className="tm-glyph">✳</span></div>
              <figcaption><E k={t} className="tm-wt" /><E k={c} className="tm-wc" /></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="tm-about">
        <div>
          <E k="aboutTitle" tag="h2" className="tm-h2 big" />
          <E k="aboutBody" tag="p" className="tm-sub" />
        </div>
        <div className="tm-stats">
          {[["s1n", "s1l"], ["s2n", "s2l"], ["s3n", "s3l"]].map(([n, l]) => (
            <div className="tm-stat" key={n}><E k={n} className="tm-num" /><E k={l} className="tm-lbl" /></div>
          ))}
        </div>
      </section>

      <section className="tm-cta">
        <E k="ctaTitle" tag="h2" className="tm-h2 big" />
        <E k="ctaLink" tag="p" className="tm-mail" />
      </section>

      <footer className="tm-foot"><E k="foot" /><span>Made with kape.dev ☕</span></footer>
    </div>
  );
}

/* ---------------- 2 · Loudhouse — dark agency, massive type ---------------- */
function TplBold({ cfg, onEdit }) {
  const { E, accent, font, data } = useTpl(cfg, onEdit);
  return (
    <div className="tb" style={{ "--a": accent, "--hf": font.stack }}>
      <nav className="tb-nav">
        <E k="brand" className="tb-brand" />
        <div className="tb-links"><E k="navA" /><E k="navB" /><E k="navC" /></div>
      </nav>

      <header className="tb-hero">
        <h1 className="tb-h1">
          <E k="heroA" tag="span" /><br />
          <E k="heroX" tag="span" className="tb-x" /> <E k="heroB" tag="span" />
        </h1>
        <E k="heroSub" tag="p" className="tb-sub" />
      </header>

      <div className="tb-marquee" aria-hidden="true">
        <div className="tb-mtrack">
          {[0, 1, 2, 3].map((i) => <span key={i}>{data.marquee}&nbsp;</span>)}
        </div>
      </div>

      <section className="tb-serv">
        {[["01", "s1t", "s1d"], ["02", "s2t", "s2d"], ["03", "s3t", "s3d"]].map(([n, t, d]) => (
          <div className="tb-row" key={t}>
            <span className="tb-idx">{n}</span>
            <E k={t} tag="h3" className="tb-st" />
            <E k={d} tag="p" className="tb-sd" />
          </div>
        ))}
      </section>

      <section className="tb-tiles">
        <div className="tb-tile a" /><div className="tb-tile b" />
        <div className="tb-tile c" /><div className="tb-tile d" />
      </section>

      <section className="tb-cta">
        <E k="ctaTitle" tag="h2" className="tb-ct" />
        <div className="tb-cta-row">
          <E k="ctaBtn" className="tb-btn" />
          <E k="ctaMail" className="tb-mail" />
        </div>
      </section>

      <footer className="tb-foot"><E k="foot" /><span>Made with kape.dev ☕</span></footer>
    </div>
  );
}

/* ---------------- 3 · Northpeak — clean corporate consultancy ---------------- */
function TplConsult({ cfg, onEdit }) {
  const { E, accent, font } = useTpl(cfg, onEdit);
  return (
    <div className="tc" style={{ "--a": accent, "--hf": font.stack }}>
      <nav className="tc-nav">
        <E k="brand" className="tc-brand" />
        <div className="tc-links">
          <E k="navA" /><E k="navB" /><E k="navC" />
          <E k="navCta" className="tc-pill" />
        </div>
      </nav>

      <header className="tc-hero">
        <div className="tc-hero-l">
          <E k="kicker" tag="p" className="tc-kicker" />
          <E k="heroTitle" tag="h1" className="tc-h1" />
          <E k="heroSub" tag="p" className="tc-sub" />
          <div className="tc-btns">
            <E k="btnA" className="tc-btn solid" />
            <E k="btnB" className="tc-btn" />
          </div>
        </div>
        <div className="tc-hero-r">
          <div className="tc-card main">
            <E k="card1n" className="tc-cnum" />
            <E k="card1l" className="tc-clbl" />
            <div className="tc-bars">{[34, 52, 44, 66, 58, 82, 95].map((h, i) => <i key={i} style={{ height: h + "%" }} />)}</div>
          </div>
          <div className="tc-card mini">
            <E k="card2n" className="tc-cnum sm" />
            <E k="card2l" className="tc-clbl" />
          </div>
        </div>
      </header>

      <div className="tc-trust">
        <E k="trust" className="tc-trust-t" />
        <div className="tc-logos"><span>VERTEX</span><span>Mango&nbsp;Co.</span><span>RAMOS</span><span>bluefin</span><span>ALTA+</span></div>
      </div>

      <section className="tc-serv">
        <E k="servTitle" tag="h2" className="tc-h2" />
        <div className="tc-grid">
          {[["◆", "s1t", "s1d"], ["▲", "s2t", "s2d"], ["●", "s3t", "s3d"]].map(([ic, t, d]) => (
            <div className="tc-scard" key={t}>
              <span className="tc-ic">{ic}</span>
              <E k={t} tag="h3" className="tc-st" />
              <E k={d} tag="p" className="tc-sd" />
            </div>
          ))}
        </div>
      </section>

      <section className="tc-quote">
        <E k="quote" tag="blockquote" className="tc-q" />
        <E k="quoteBy" tag="p" className="tc-qb" />
      </section>

      <footer className="tc-foot"><E k="foot" /><span>Made with kape.dev ☕</span></footer>
    </div>
  );
}

/* ---------------- 4 · Devfolio — dark developer portfolio ---------------- */
function TplFolio({ cfg, onEdit }) {
  const { E, accent, font } = useTpl(cfg, onEdit);
  return (
    <div className="tp" style={{ "--a": accent, "--hf": font.stack }}>
      <nav className="tp-nav">
        <E k="brand" className="tp-brand" />
        <div className="tp-links"><E k="navA" /><E k="navB" /><E k="navC" /></div>
      </nav>

      <header className="tp-hero">
        <E k="kicker" tag="p" className="tp-kicker" />
        <h1 className="tp-h1"><E k="heroA" tag="span" /><br /><span className="tp-dim"><E k="heroB" tag="span" /></span></h1>
        <E k="heroSub" tag="p" className="tp-sub" />
        <div className="tp-btns">
          <E k="btnA" className="tp-btn solid" />
          <E k="btnB" className="tp-btn" />
        </div>
      </header>

      <section className="tp-proj">
        <E k="projTitle" tag="h2" className="tp-h2" />
        <div className="tp-grid">
          {[["p1t", "p1d", "p1g"], ["p2t", "p2d", "p2g"], ["p3t", "p3d", "p3g"]].map(([t, d, g], i) => (
            <div className="tp-card" key={t}>
              <span className="tp-num">{"0" + (i + 1)}</span>
              <E k={t} tag="h3" className="tp-pt" />
              <E k={d} tag="p" className="tp-pd" />
              <E k={g} className="tp-pg" />
            </div>
          ))}
        </div>
      </section>

      <section className="tp-stack">
        <E k="skillsTitle" tag="h2" className="tp-h2" />
        <E k="skills" tag="p" className="tp-skills" />
      </section>

      <section className="tp-exp">
        <E k="expTitle" tag="h2" className="tp-h2" />
        {[["e1r", "e1c", "e1d"], ["e2r", "e2c", "e2d"]].map(([r, c, d]) => (
          <div className="tp-row" key={r}>
            <E k={r} className="tp-er" /><E k={c} className="tp-ec" /><E k={d} className="tp-ed" />
          </div>
        ))}
      </section>

      <section className="tp-cta">
        <E k="ctaTitle" tag="h2" className="tp-ct" />
        <E k="ctaLink" tag="p" className="tp-mail" />
      </section>

      <footer className="tp-foot"><E k="foot" /><span>Made with kape.dev ☕</span></footer>
    </div>
  );
}

/* ---------------- 5 · Curriculum — classic paper resume / CV ---------------- */
function TplResume({ cfg, onEdit }) {
  const { E, accent, font } = useTpl(cfg, onEdit);
  return (
    <div className="tr" style={{ "--a": accent, "--hf": font.stack }}>
      <div className="tr-page">
        <header className="tr-head">
          <div>
            <E k="name" tag="h1" className="tr-name" />
            <E k="role" tag="p" className="tr-role" />
          </div>
          <E k="contactLine" tag="p" className="tr-contact" />
        </header>

        <section className="tr-block">
          <E k="summaryTitle" tag="h2" className="tr-h2" />
          <E k="summary" tag="p" className="tr-body" />
        </section>

        <div className="tr-cols">
          <section className="tr-block">
            <E k="expTitle" tag="h2" className="tr-h2" />
            {[["e1r", "e1c", "e1d", "e1b"], ["e2r", "e2c", "e2d", "e2b"], ["e3r", "e3c", "e3d", "e3b"]].map(([r, c, d, b]) => (
              <div className="tr-exp" key={r}>
                <div className="tr-exp-top">
                  <span><E k={r} className="tr-er" /> · <E k={c} className="tr-ec" /></span>
                  <E k={d} className="tr-ed" />
                </div>
                <E k={b} tag="p" className="tr-body" />
              </div>
            ))}
          </section>

          <aside>
            <section className="tr-block">
              <E k="skillsTitle" tag="h2" className="tr-h2" />
              <ul className="tr-list">
                {["sk1", "sk2", "sk3", "sk4", "sk5"].map((k) => <li key={k}><E k={k} /></li>)}
              </ul>
            </section>
            <section className="tr-block">
              <E k="eduTitle" tag="h2" className="tr-h2" />
              <E k="edu1" tag="p" className="tr-er" />
              <E k="edu1s" tag="p" className="tr-ed" />
            </section>
            <section className="tr-block">
              <E k="refTitle" tag="h2" className="tr-h2" />
              <ul className="tr-list links">
                <li><E k="ref1" /></li>
                <li><E k="ref2" /></li>
              </ul>
            </section>
          </aside>
        </div>

        <footer className="tr-foot"><E k="foot" /><span>Made with kape.dev ☕</span></footer>
      </div>
    </div>
  );
}

/* ---------------- 6 · Akihiko — monochrome Tokyo art-director portfolio ---------------- */
function TplTokyo({ cfg, onEdit }) {
  const { E, accent, font, data } = useTpl(cfg, onEdit);
  return (
    <div className="tk" style={{ "--a": accent, "--hf": font.stack }}>
      <nav className="tk-nav">
        <E k="brand" tag="p" className="tk-brand" />
        <div className="tk-nav-col">
          <span className="tk-nav-h">Quick Links</span>
          <E k="navLinks" tag="p" />
        </div>
        <div className="tk-nav-col right">
          <E k="basedIn" tag="span" className="tk-nav-h" />
          <E k="roleTop" tag="p" />
        </div>
      </nav>

      <header className="tk-hero">
        <E k="heroTitle" tag="h1" className="tk-h1" />
        <div className="tk-photo a"><span>✦</span></div>
      </header>

      <div className="tk-word"><E k="wordmark" tag="span" /><sup>™</sup></div>

      <div className="tk-meta">
        <E k="metaA" className="tk-meta-dot" /><E k="metaB" /><E k="metaC" />
      </div>

      <section className="tk-bio">
        <div className="tk-photo b"><span>✦</span></div>
        <div>
          <E k="bioTitle" tag="h2" className="tk-bt" />
          <E k="bioCta" className="tk-pill" />
        </div>
      </section>

      <div className="tk-marquee" aria-hidden="true">
        <div className="tk-mtrack">{[0, 1, 2, 3].map((i) => <span key={i}>{data.marquee}&nbsp;</span>)}</div>
      </div>

      <section className="tk-tiles">
        {["c1", "c2", "c3", "c4", "c5"].map((k) => (
          <div className="tk-tile" key={k}><E k={k} /></div>
        ))}
      </section>

      <footer className="tk-foot"><E k="footA" /><E k="footB" /><E k="footC" /></footer>
    </div>
  );
}

// dispatcher — onEdit=null renders a static (non-editable) site
function TemplateView({ cfg, onEdit }) {
  const k = cfg.template;
  if (k === "bold") return <TplBold cfg={cfg} onEdit={onEdit} />;
  if (k === "consult") return <TplConsult cfg={cfg} onEdit={onEdit} />;
  if (k === "folio") return <TplFolio cfg={cfg} onEdit={onEdit} />;
  if (k === "resume") return <TplResume cfg={cfg} onEdit={onEdit} />;
  if (k === "tokyo") return <TplTokyo cfg={cfg} onEdit={onEdit} />;
  return <TplMinimal cfg={cfg} onEdit={onEdit} />;
}

Object.assign(window, { TemplateView, Editable });
