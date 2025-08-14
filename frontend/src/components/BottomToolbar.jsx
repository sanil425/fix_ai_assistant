/** quick note: FIX message builder toolbar. builds orders and saves to blotter. embedded at bottom of chat page. */
// src/components/BottomToolbar.jsx
import { useEffect, useMemo, useState } from "react";
import { buildNewOrderSingle, validateNewOrder } from "../utils/fix";

const LS_KEY_BUILDER = "fix_builder_state_v1";
const LS_KEY_BLOTTER = "fix_blotter_v1";

const initialBuilder = {
  version: localStorage.getItem("fixVersion") || "4.4",
  symbol: "",
  side: "1",
  qty: "",
  ordType: "2",
  price: "",
  tif: "0",
  clOrdID: "",
};

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]); // persist to localStorage
  return [state, setState];
}

export default function BottomToolbar({ variant = "fixed" }) {
  const [builder, setBuilder] = useLocalStorage(LS_KEY_BUILDER, initialBuilder);
  const [blotter, setBlotter] = useLocalStorage(LS_KEY_BLOTTER, []);
  const [rendered, setRendered] = useState("");
  const [issues, setIssues] = useState([]);
  const [open, setOpen] = useState(true);

  // Persist chosen version globally (to match prior app behavior)
  useEffect(() => {
    localStorage.setItem("fixVersion", builder.version || "4.4");
  }, [builder.version]);

  const canBuild = useMemo(() => {
    const errs = validateNewOrder(builder);
    return errs.filter((x) => x.severity === "error").length === 0;
  }, [builder]);

  function onChange(e) {
    const { name, value } = e.target;
    setBuilder((s) => ({ ...s, [name]: value }));
  }

  function build() {
    const v = validateNewOrder(builder);
    setIssues(v);
    if (v.some((x) => x.severity === "error")) {
      setRendered("");
      return;
    }
    const { rendered } = buildNewOrderSingle(builder);
    setRendered(rendered);
  }

  function copyRendered() {
    if (rendered) navigator.clipboard.writeText(rendered);
  }

  function saveToBlotter() {
    if (!rendered) return;
    setBlotter((b) => [
      { id: Date.now(), ts: new Date().toLocaleString(), message: rendered },
      ...b,
    ]);
  }

  function clearBuilder() {
    setBuilder(initialBuilder);
    setIssues([]);
    setRendered("");
  }

  function clearBlotter() {
    if (!confirm("Clear blotter?")) return;
    setBlotter([]);
  }

  return (
    <div className={`bottom-toolbar ${variant === "inline" ? "inline" : ""} ${open ? "open" : "closed"}`}>
      <div className="bt-header">
        <div className="bt-title">FIX Message Builder (Bottom Toolbar)</div>
        <div className="bt-actions">
          <button onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"}</button>
        </div>
      </div>

      {open && (
        <div className="bt-body">
          <div className="bt-grid">
            <div className="bt-field">
              <label>Version</label>
              <select name="version" value={builder.version} onChange={onChange}>
                <option value="4.4">FIX 4.4</option>
                <option value="5.0">FIX 5.0</option>
                <option value="5.0SP2">FIX 5.0 SP2</option>
              </select>
            </div>

            <div className="bt-field">
              <label>Symbol (55)</label>
              <input name="symbol" value={builder.symbol} onChange={onChange} placeholder="AAPL" />
            </div>

            <div className="bt-field">
              <label>Side (54)</label>
              <select name="side" value={builder.side} onChange={onChange}>
                <option value="1">Buy</option>
                <option value="2">Sell</option>
                <option value="5">Sell Short</option>
              </select>
            </div>

            <div className="bt-field">
              <label>Qty (38)</label>
              <input name="qty" value={builder.qty} onChange={onChange} placeholder="100" />
            </div>

            <div className="bt-field">
              <label>OrdType (40)</label>
              <select name="ordType" value={builder.ordType} onChange={onChange}>
                <option value="1">Market</option>
                <option value="2">Limit</option>
              </select>
            </div>

            <div className="bt-field">
              <label>Price (44)</label>
              <input
                name="price"
                value={builder.price}
                onChange={onChange}
                placeholder={builder.ordType === "2" ? "Required for Limit" : "Leave blank for Market"}
              />
            </div>

            <div className="bt-field">
              <label>TimeInForce (59)</label>
              <select name="tif" value={builder.tif} onChange={onChange}>
                <option value="0">DAY</option>
                <option value="1">GTC</option>
                <option value="3">IOC</option>
              </select>
            </div>

            <div className="bt-field">
              <label>ClOrdID (11)</label>
              <input name="clOrdID" value={builder.clOrdID} onChange={onChange} placeholder="auto if blank" />
            </div>
          </div>

          {issues.length > 0 && (
            <div className="bt-issues">
              {issues.map((x, i) => (
                <div key={i} className={`bt-issue ${x.severity}`}>{x.severity.toUpperCase()}: {x.message}</div>
              ))}
            </div>
          )}

          <div className="bt-controls">
            <button onClick={build} disabled={!canBuild}>Build</button>
            <button onClick={copyRendered} disabled={!rendered}>Copy</button>
            <button onClick={saveToBlotter} disabled={!rendered}>Save to Blotter</button>
            <button onClick={clearBuilder}>Clear</button>
          </div>

          <textarea className="bt-output" rows={3} readOnly value={rendered} placeholder="Rendered FIX will appear here..." />

          <div className="bt-blotter">
            <div className="bt-blotter-head">
              <div className="bt-blotter-title">Blotter</div>
              <button onClick={clearBlotter} disabled={blotter.length === 0}>Clear blotter</button>
            </div>
            {blotter.length === 0 ? (
              <div className="bt-blotter-empty">No saved messages yet.</div>
            ) : (
              <ul className="bt-blotter-list">
                {blotter.map(item => (
                  <li key={item.id} className="bt-blotter-item">
                    <div className="bt-blotter-meta">{item.ts}</div>
                    <div className="bt-blotter-msg">{item.message}</div>
                    <button onClick={() => navigator.clipboard.writeText(item.message)}>Copy</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
