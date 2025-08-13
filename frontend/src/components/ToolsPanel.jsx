import { useEffect, useMemo, useState } from "react";
import { fetchNosSchema, requiredNow } from "../lib/fixSchema.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

/**
 * Slide-in Tools panel. Separate from chat.
 * Props: { open:boolean, onClose:fn, version:string }
 */
export default function ToolsPanel({ open, onClose, version }) {
  const [schema, setSchema] = useState(null);
  const [schemaErr, setSchemaErr] = useState("");
  const [form, setForm] = useState({
    ClOrdID: "",
    Symbol: "",
    Side: "1",      // 1=Buy, 2=Sell
    OrderQty: "",
    OrdType: "1",   // 1=Market, 2=Limit
    Price: ""
  });
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);

  // Reset when panel opens or version changes
  useEffect(() => {
    if (!open) return;
    setSchema(null);
    setSchemaErr("");
    setResult(null);
  }, [open, version]);

  // For conditional logic: OrdType tag is 40
  const tagValues = useMemo(() => ({ "40": form.OrdType }), [form.OrdType]);

  const requiredTags = useMemo(() => {
    if (!schema) return [];
    return requiredNow(schema, tagValues);
  }, [schema, tagValues]);

  const missing = useMemo(() => {
    const need = new Set(["ClOrdID","Symbol","Side","OrderQty","OrdType"]);
    if (form.OrdType === "2") need.add("Price");
    const m = [];
    for (const k of need) if (!String(form[k] || "").trim()) m.push(k);
    return m;
  }, [form]);

  const loadSchema = async () => {
    try {
      setSchemaErr("");
      const s = await fetchNosSchema(version);
      setSchema(s);
    } catch (e) {
      setSchemaErr(String(e?.message || e));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setResult(null);
    setBuilding(true);
    try {
      const r = await fetch(`${API_BASE}/tools/build-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, msgType: "D", params: form })
      });
      const data = await r.json();
      setResult(data);
    } catch (e) {
      setResult({ error: String(e?.message || e) });
    } finally {
      setBuilding(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="tools-panel">
      <div className="tools-header">
        <h3>Tools</h3>
        <div className="spacer" />
        <div className="version-pill">FIX {version}</div>
        <button className="close-btn" onClick={onClose} aria-label="Close Tools">×</button>
      </div>

      <div className="tools-section">
        <button onClick={loadSchema}>Load NOS schema (35=D)</button>
        {schemaErr && <div className="error">Schema error: {schemaErr}</div>}
        {schema && (
          <div className="schema-box">
            <div className="schema-name"><b>{schema.name}</b> (35=D)</div>
            <div className="schema-req"><b>Required tags:</b> {schema.required.join(", ")}</div>
            {schema.notes && <div className="schema-note">{schema.notes}</div>}
          </div>
        )}
      </div>

      <form className="tools-form" onSubmit={submit}>
        <label>ClOrdID
          <input value={form.ClOrdID} onChange={e=>setForm(f=>({...f, ClOrdID:e.target.value}))} />
        </label>
        <label>Symbol
          <input value={form.Symbol} onChange={e=>setForm(f=>({...f, Symbol:e.target.value}))} />
        </label>
        <label>Side
          <select value={form.Side} onChange={e=>setForm(f=>({...f, Side:e.target.value}))}>
            <option value="1">1 (Buy)</option>
            <option value="2">2 (Sell)</option>
          </select>
        </label>
        <label>OrderQty
          <input value={form.OrderQty} onChange={e=>setForm(f=>({...f, OrderQty:e.target.value}))} />
        </label>
        <label>OrdType
          <select value={form.OrdType} onChange={e=>setForm(f=>({...f, OrdType:e.target.value}))}>
            <option value="1">1 (Market)</option>
            <option value="2">2 (Limit)</option>
          </select>
        </label>
        <label>Price
          <input
            value={form.Price}
            onChange={e=>setForm(f=>({...f, Price:e.target.value}))}
            placeholder={form.OrdType==="2" ? "required for limit" : "ignored unless limit"}
          />
        </label>

        {missing.length > 0 && (
          <div className="warn">Missing: {missing.join(", ")}</div>
        )}

        <button type="submit" disabled={building}>
          {building ? "Building…" : "Build FIX"}
        </button>
      </form>

      {result && (
        <div className="result">
          {result.error && <div className="error">{result.error}</div>}
          {result.fix_string && (
            <>
              <div className="result-title"><b>FIX string</b></div>
              <code className="fix-out">{result.fix_string}</code>
              {!!(result.missing?.length) && (
                <div className="warn">Backend missing: {result.missing.join(", ")}</div>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
