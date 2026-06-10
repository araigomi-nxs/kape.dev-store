// ============ POS Builder · 3D orbital gallery ============
// Same template-selector page as the Website Builder: ready-made designs float
// as tilted cards in a centered orbit. Scrolling (or ← →, or the dots) rotates
// the orbit; clicking a background card brings it to the front; clicking the
// front card sends it flying toward you and applies the design. Mouse movement
// parallaxes the whole stack.

function Gallery({ cfg, onPick, onBack }) {
  const sceneRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const [going, setGoing] = useState(null);
  const order = window.TEMPLATE_ORDER;
  const n = order.length;
  const wheelAcc = useRef(0);
  const wheelLock = useRef(0);

  // each card previews the template merged over the current cfg, so the
  // customer's business name & logo carry into every design
  const previewCfg = (k) => {
    const t = window.TEMPLATES[k];
    return { ...cfg, ...t.cfg, sections: { ...cfg.sections, ...t.cfg.sections }, selected: null };
  };

  // mouse parallax
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    const leave = () => { el.style.setProperty("--mx", 0); el.style.setProperty("--my", 0); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, []);

  // orbit on scroll + arrow keys (disabled on mobile, where the deck scrolls normally)
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (window.matchMedia("(max-width: 880px)").matches) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLock.current) return;
      wheelAcc.current += e.deltaY + e.deltaX;
      if (Math.abs(wheelAcc.current) > 50) {
        // read the direction before resetting — the updater runs after this
        // handler finishes, so it must not touch wheelAcc itself
        const dir = wheelAcc.current > 0 ? 1 : -1;
        wheelAcc.current = 0;
        wheelLock.current = now + 420;
        setIdx((i) => i + dir);
      }
    };
    const onKey = (e) => {
      if (e.key === "ArrowRight") setIdx((i) => i + 1);
      else if (e.key === "ArrowLeft") setIdx((i) => i - 1);
      else if (e.key === "Escape" && onBack) onBack();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); };
  }, []);

  // signed distance from the front slot, in [-n/2, n/2]
  const offOf = (i) => {
    let off = (((i - idx) % n) + n) % n;
    if (off > n / 2) off -= n;
    return off;
  };

  const click = (k, off) => {
    if (going) return;
    // on the mobile vertical deck there is no orbit — every card opens directly
    const mobile = window.matchMedia("(max-width: 880px)").matches;
    if (off !== 0 && !mobile) { setIdx((i) => i + off); return; }
    setGoing(k);
    setTimeout(() => onPick(k), 420);
  };

  const frontKey = order[((idx % n) + n) % n];
  const frontT = window.TEMPLATES[frontKey];

  return (
    <div className={"gal" + (going ? " gal-out" : "")} ref={sceneRef}>
      <div className="gal-bg"><div className="gal-slab" /><div className="gal-blob a" /><div className="gal-blob b" /></div>

      <header className="gal-head">
        {onBack
          ? <button className="gal-back" onClick={onBack}>← back to builder</button>
          : <a className="gal-back" href="../">← kape.dev store</a>}
        <p className="gal-kicker">// pos commissions</p>
        <h1>Pick your<br /><span>counter.</span></h1>
        <p className="gal-sub">Ready-made POS designs by the kape.dev crew — cafés, terminals, galleries, consoles. Spin the orbit, claim one, and tune every panel for your shop.</p>
      </header>

      <div className="gal-scene">
        <div className="gal-stack">
          {order.map((k, i) => {
            const t = window.TEMPLATES[k];
            const off = offOf(i);
            const a = Math.abs(off);
            return (
              <div
                key={k}
                className={"gal-card" + (off === 0 ? " front" : "") + (going === k ? " go" : "")}
                style={{
                  // wide spread keeps background cards clickable past the front card
                  "--tx": (off * 430) + "px",
                  "--ty": (a * -58) + "px",
                  "--tz": (off === 0 ? 170 : -150 - a * 165) + "px",
                  "--par": (30 - a * 8) + "px",
                  zIndex: 10 + (n - a),
                }}
                onClick={() => click(k, off)}
              >
                <div className="gal-tilt">
                  <div className="gal-float" style={{ animationDelay: (i * -2.3) + "s" }}>
                    <div className="gal-frame">
                      <div className="gal-mini">
                        <SkinView cfg={previewCfg(k)} />
                      </div>
                      <div className="gal-sheen" />
                    </div>
                    <div className="gal-tag">
                      <div>
                        <b>{t.name}</b>
                        <span>{t.tagline}</span>
                      </div>
                      <em>{off === 0 ? (cfg.skin === k ? "resume →" : "customize →") : "bring to front"}</em>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gal-dock">
        <button className="gal-arrow" onClick={() => setIdx((i) => i - 1)} aria-label="Previous design">←</button>
        <div className="gal-dots">
          {order.map((k, i) => (
            <button
              key={k}
              className={"gal-dotn" + (offOf(i) === 0 ? " on" : "")}
              title={window.TEMPLATES[k].name}
              onClick={() => setIdx((x) => x + offOf(i))}
            />
          ))}
        </div>
        <button className="gal-arrow" onClick={() => setIdx((i) => i + 1)} aria-label="Next design">→</button>
        <span className="gal-dock-name">{frontT.name} <i>· {frontT.tagline}</i></span>
      </div>

      <footer className="gal-hint">
        <span>scroll to orbit</span><i>·</i><span>click the front card to claim it</span><i>·</i><span>every panel becomes yours</span>
      </footer>
    </div>
  );
}

Object.assign(window, { Gallery });
