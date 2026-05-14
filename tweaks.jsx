/* global React, ReactDOM */
const { useState, useEffect } = React;

function Tweaks() {
  const [open, setOpen] = useState(false);
  const initial = window.__siteTweaks || {};
  const [t, setT] = useState(initial);

  useEffect(() => {
    function onMsg(e) {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setOpen(true);
      else if (d.type === "__deactivate_edit_mode") setOpen(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function update(k, v) {
    const next = { ...t, [k]: v };
    setT(next);
    window.__applyTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
  }

  function close() {
    setOpen(false);
    window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*");
  }

  if (!open) return null;

  const accents = [
    { id: "warm", label: "warm", color: "oklch(0.64 0.19 35)" },
    { id: "indigo", label: "indigo", color: "oklch(0.55 0.18 265)" },
    { id: "moss", label: "moss", color: "oklch(0.55 0.14 145)" },
    { id: "ink", label: "ink", color: "oklch(0.30 0.02 60)" },
  ];
  const densities = ["cozy", "comfy", "airy"];
  const bgs = ["plain", "grid", "dots", "lines"];

  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span className="tweaks-title">Tweaks</span>
        <button className="tweaks-close" onClick={close} aria-label="close">×</button>
      </div>

      <div className="tweaks-sec">
        <div className="tweaks-label">accent</div>
        <div className="tweaks-swatches">
          {accents.map(a => (
            <button
              key={a.id}
              className={"tweaks-swatch" + (t.accent === a.id ? " current" : "")}
              onClick={() => update("accent", a.id)}
              title={a.label}
            >
              <span className="dot" style={{ background: a.color }}></span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tweaks-sec">
        <div className="tweaks-label">density</div>
        <div className="tweaks-seg">
          {densities.map(d => (
            <button
              key={d}
              className={"tweaks-seg-btn" + (t.density === d ? " current" : "")}
              onClick={() => update("density", d)}
            >{d}</button>
          ))}
        </div>
      </div>

      <div className="tweaks-sec">
        <div className="tweaks-label">background</div>
        <div className="tweaks-seg">
          {bgs.map(b => (
            <button
              key={b}
              className={"tweaks-seg-btn" + (t.background === b ? " current" : "")}
              onClick={() => update("background", b)}
            >{b}</button>
          ))}
        </div>
      </div>

      <div className="tweaks-sec">
        <div className="tweaks-label">cursor follow</div>
        <div className="tweaks-seg">
          <button
            className={"tweaks-seg-btn" + (t.cursor ? " current" : "")}
            onClick={() => update("cursor", true)}
          >on</button>
          <button
            className={"tweaks-seg-btn" + (!t.cursor ? " current" : "")}
            onClick={() => update("cursor", false)}
          >off</button>
        </div>
      </div>

      <div className="tweaks-foot">
        <span className="tweaks-hint">⇧ toggle from toolbar</span>
      </div>
    </div>
  );
}

const mount = document.getElementById("tweaks-root");
if (mount) ReactDOM.createRoot(mount).render(<Tweaks />);
