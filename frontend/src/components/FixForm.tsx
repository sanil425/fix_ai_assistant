import React, { useEffect, useState } from "react";
import { buildNewOrderMessage, buildCancel, buildReplace, buildExecReport } from "../fix/fixBuilder";
import { fieldMeta } from "../fix/fixSpec";
import { blotter } from "../state/blotter";

// Optional: Let builder/blotter react to AI actions
// If you have a builder component, add a passive listener like this (non-breaking):

type Tab = "NEW" | "REPLACE" | "CANCEL";

const card = "rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4";
const labelCls = "text-sm text-zinc-300";
const inputCls = "mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500";
const selectCls = inputCls;
const btn = "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium";
const btnPrimary = `${btn} bg-zinc-100 text-zinc-900 hover:bg-white`;
const btnTab = (active:boolean) => `${btn} border border-zinc-700 ${active ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"}`;

export default function FixForm() {
  const [version, setVersion] = useState(localStorage.getItem("fixVersion") || "FIX.4.4");
  const [tab, setTab] = useState<Tab>("NEW");

  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fixSessionProfile_v1") || "{}"); } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem("fixVersion", version); }, [version]);
  useEffect(() => { localStorage.setItem("fixSessionProfile_v1", JSON.stringify(session)); }, [session]);

  // Optional: Listen for AI actions (non-breaking)
  useEffect(() => {
    function onAIAction(e) {
      const action = e.detail;
      if (!action || !action.type) return;

      if (action.type === "build_fix" && action.payload) {
        // Example: prefill fields / rendered string if your component supports it
        // setFields(action.payload.fields || []);
        // setRendered(action.payload.rendered || "");
        console.log("[FixForm] AI suggested:", action.payload);
      } else if (action.type === "validate_fix" && action.payload) {
        // Example: surface issues to the UI
        // setValidation(action.payload.issues || []);
        console.log("[FixForm] AI validation:", action.payload);
      }
    }
    window.addEventListener("fix:aiAction", onAIAction);
    return () => window.removeEventListener("fix:aiAction", onAIAction);
  }, []);

  // state per tab
  const [newFields, setNewFields] = useState<Record<string,string>>({"11":"", "55":"", "54":"", "38":"", "40":"", "44":"", "59":"", "60":""});
  const [repFields, setRepFields] = useState<Record<string,string>>({"41":"", "11":"", "55":"", "54":"", "38":"", "40":"", "44":"", "59":"", "60":""});
  const [canFields, setCanFields] = useState<Record<string,string>>({"41":"", "11":"", "55":"", "54":"", "60":""});

  const [output, setOutput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const header = { BeginString: version, ...session };
  const up = (setter: any) => (tag: string, val: string) => setter((f: any) => ({ ...f, [tag]: val }));
  const showPrice = (fields: Record<string,string>) => ["2","4"].includes(fields["40"]);

  function simulateAndBlotter(kind: Tab, built: {display:string; raw:string; errors:string[]}, fields: Record<string,string>) {
    setErrors(built.errors);
    setOutput(built.display);

    const ts = new Date().toISOString();
    if (kind === "NEW" && !built.errors.length) {
      const clOrdID = fields["11"];
      const qty = Number(fields["38"]||0);
      blotter.upsert({
        clOrdID,
        symbol: fields["55"],
        side: fields["54"],
        qty,
        ordType: fields["40"],
        price: fields["44"] ? Number(fields["44"]) : undefined,
        status: "A", // PendingNew
        cumQty: 0,
        leavesQty: qty,
        history: [{ ts, msgType: "D", display: built.display, note: "Submitted New" }],
      });
      const ack = buildExecReport({
        "11": clOrdID, "55": fields["55"], "54": fields["54"], "38": String(qty),
        "150": "0", "39": "0", "14": "0", "151": String(qty)
      }, header);
      blotter.log(clOrdID, { ts, msgType: "8", display: ack.display, note: "Ack New" });
      const row = blotter.get(clOrdID)!; row.status = "0"; blotter.upsert(row);
    }

    if (kind === "REPLACE" && !built.errors.length) {
      const clOrdID = fields["11"];
      const orig = blotter.get(fields["41"]);
      if (orig) {
        const qty = Number(fields["38"] || orig.qty);
        const leaves = Math.max(qty - orig.cumQty, 0);
        const ack = buildExecReport({
          "11": clOrdID, "55": fields["55"] || orig.symbol, "54": fields["54"] || orig.side,
          "38": String(qty), "150": "5", "39": "5", "14": String(orig.cumQty), "151": String(leaves),
        }, header);
        blotter.upsert({
          clOrdID,
          symbol: fields["55"] || orig.symbol,
          side: fields["54"] || orig.side,
          qty,
          ordType: fields["40"] || orig.ordType,
          price: fields["44"] ? Number(fields["44"]) : orig.price,
          status: "5",
          cumQty: orig.cumQty,
          leavesQty: leaves,
          history: [...orig.history, { ts, msgType: "G", display: built.display, note: "Replace" }, { ts, msgType: "8", display: ack.display, note: "Ack Replace" }],
        });
      }
    }

    if (kind === "CANCEL" && !built.errors.length) {
      const orig = blotter.get(fields["41"]);
      if (orig) {
        const ack = buildExecReport({
          "11": fields["11"], "55": orig.symbol, "54": orig.side,
          "38": String(orig.qty), "150": "4", "39": "4", "14": String(orig.cumQty), "151": "0",
        }, header);
        orig.status = "4"; orig.leavesQty = 0;
        blotter.log(orig.clOrdID, { ts: new Date().toISOString(), msgType: "F", display: built.display, note: "Cancel" });
        blotter.log(orig.clOrdID, { ts: new Date().toISOString(), msgType: "8", display: ack.display, note: "Ack Cancel" });
        blotter.upsert(orig);
      }
    }
  }

  const buildNew = () => simulateAndBlotter("NEW", buildNewOrderMessage(newFields, header), newFields);
  const buildRep = () => simulateAndBlotter("REPLACE", buildReplace(repFields, header), repFields);
  const buildCan = () => simulateAndBlotter("CANCEL", buildCancel(canFields, header), canFields);

  const Field = ({tag, state, setState, type="text", label, placeholder}:{tag:string; state:Record<string,string>; setState:any; type?:string; label?:string; placeholder?:string}) => (
    <div>
      <label className={labelCls}>{label || `${fieldMeta[tag]?.label || tag} (${tag})`}</label>
      <input className={inputCls} type={type} value={state[tag]||""} onChange={e=>setState(tag, e.target.value)} placeholder={placeholder || ""} title={fieldMeta[tag]?.help||""}/>
    </div>
  );

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FIX Message Builder</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">FIX Version</span>
          <select className={selectCls} style={{width:140}} value={version} onChange={e=>setVersion(e.target.value)}>
            <option>FIX.4.4</option><option>FIX.5.0</option><option>FIXT.1.1</option>
          </select>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={btnTab(tab==="NEW")} onClick={()=>setTab("NEW")}>New (35=D)</button>
        <button className={btnTab(tab==="REPLACE")} onClick={()=>setTab("REPLACE")}>Replace (35=G)</button>
        <button className={btnTab(tab==="CANCEL")} onClick={()=>setTab("CANCEL")}>Cancel (35=F)</button>
      </div>

      {/* Session Card */}
      <div className={card}>
        <div className="mb-3 text-sm font-medium text-zinc-200">Session (optional)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>SenderCompID (49)</label>
            <input className={inputCls} value={session.SenderCompID || ""} onChange={e=>setSession((s:any)=>({ ...s, SenderCompID: e.target.value }))}/>
          </div>
          <div>
            <label className={labelCls}>TargetCompID (56)</label>
            <input className={inputCls} value={session.TargetCompID || ""} onChange={e=>setSession((s:any)=>({ ...s, TargetCompID: e.target.value }))}/>
          </div>
          <div>
            <label className={labelCls}>MsgSeqNum (34)</label>
            <input className={inputCls} value={session.MsgSeqNum || ""} onChange={e=>setSession((s:any)=>({ ...s, MsgSeqNum: e.target.value }))}/>
          </div>
          <div>
            <label className={labelCls}>SendingTime (52)</label>
            <input className={inputCls} placeholder="YYYYMMDD-HH:MM:SS.sss" value={session.SendingTime || ""} onChange={e=>setSession((s:any)=>({ ...s, SendingTime: e.target.value }))}/>
          </div>
        </div>
      </div>

      {/* Order Card */}
      <div className={card}>
        <div className="mb-3 text-sm font-medium text-zinc-200">
          {tab==="NEW" ? "New Order Single (35=D)" : tab==="REPLACE" ? "Order Cancel/Replace Request (35=G)" : "Order Cancel Request (35=F)"}
        </div>

        {/* NEW */}
        {tab==="NEW" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field tag="11" state={newFields} setState={up(setNewFields)} label="ClOrdID (11)"/>
            <Field tag="55" state={newFields} setState={up(setNewFields)} label="Symbol (55)"/>
            <div>
              <label className={labelCls}>Side (54)</label>
              <select className={selectCls} value={newFields["54"]} onChange={e=>up(setNewFields)("54", e.target.value)}>
                <option value=""></option><option value="1">Buy</option><option value="2">Sell</option>
              </select>
            </div>
            <Field tag="38" state={newFields} setState={up(setNewFields)} type="number" label="OrderQty (38)"/>
            <div>
              <label className={labelCls}>OrdType (40)</label>
              <select className={selectCls} value={newFields["40"]} onChange={e=>up(setNewFields)("40", e.target.value)}>
                <option value=""></option><option value="1">Market</option><option value="2">Limit</option><option value="3">Stop</option><option value="4">StopLimit</option>
              </select>
            </div>
            {showPrice(newFields) && <Field tag="44" state={newFields} setState={up(setNewFields)} type="number" label="Price (44) — Required only for limit/stop-limit"/>}
            <div>
              <label className={labelCls}>TimeInForce (59)</label>
              <select className={selectCls} value={newFields["59"]} onChange={e=>up(setNewFields)("59", e.target.value)}>
                <option value=""></option><option value="0">Day</option><option value="1">GTC</option><option value="3">IOC</option><option value="4">FOK</option>
              </select>
            </div>
            <Field tag="60" state={newFields} setState={up(setNewFields)} label="TransactTime UTC (60)" placeholder="YYYYMMDD-HH:MM:SS.sss"/>
          </div>
        )}

        {/* REPLACE */}
        {tab==="REPLACE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field tag="41" state={repFields} setState={up(setRepFields)} label="OrigClOrdID (41)"/>
            <Field tag="11" state={repFields} setState={up(setRepFields)} label="New ClOrdID (11)"/>
            <Field tag="55" state={repFields} setState={up(setRepFields)} label="Symbol (55)"/>
            <div>
              <label className={labelCls}>Side (54)</label>
              <select className={selectCls} value={repFields["54"]} onChange={e=>up(setRepFields)("54", e.target.value)}>
                <option value=""></option><option value="1">Buy</option><option value="2">Sell</option>
              </select>
            </div>
            <Field tag="38" state={repFields} setState={up(setRepFields)} type="number" label="OrderQty (38)"/>
            <div>
              <label className={labelCls}>OrdType (40)</label>
              <select className={selectCls} value={repFields["40"]} onChange={e=>up(setRepFields)("40", e.target.value)}>
                <option value=""></option><option value="1">Market</option><option value="2">Limit</option><option value="3">Stop</option><option value="4">StopLimit</option>
              </select>
            </div>
            {showPrice(repFields) && <Field tag="44" state={repFields} setState={up(setRepFields)} type="number" label="Price (44) — Required only for limit/stop-limit"/>}
            <Field tag="59" state={repFields} setState={up(setRepFields)} label="TimeInForce (59)"/>
            <Field tag="60" state={repFields} setState={up(setRepFields)} label="TransactTime UTC (60)" placeholder="YYYYMMDD-HH:MM:SS.sss"/>
          </div>
        )}

        {/* CANCEL */}
        {tab==="CANCEL" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field tag="41" state={canFields} setState={up(setCanFields)} label="OrigClOrdID (41)"/>
            <Field tag="11" state={canFields} setState={up(setCanFields)} label="Cancel ClOrdID (11)"/>
            <Field tag="55" state={canFields} setState={up(setCanFields)} label="Symbol (55)"/>
            <div>
              <label className={labelCls}>Side (54)</label>
              <select className={selectCls} value={canFields["54"]} onChange={e=>up(setCanFields)("54", e.target.value)}>
                <option value=""></option><option value="1">Buy</option><option value="2">Sell</option>
              </select>
            </div>
            <Field tag="60" state={canFields} setState={up(setCanFields)} label="TransactTime UTC (60)" placeholder="YYYYMMDD-HH:MM:SS.sss"/>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          {tab==="NEW" && <button onClick={buildNew} className={btnPrimary}>Build & Ack New (D→8)</button>}
          {tab==="REPLACE" && <button onClick={buildRep} className={btnPrimary}>Build & Ack Replace (G→8)</button>}
          {tab==="CANCEL" && <button onClick={buildCan} className={btnPrimary}>Build & Ack Cancel (F→8)</button>}
          {errors.length > 0 && <div className="text-sm text-red-400">{errors.join(" • ")}</div>}
        </div>

        <div className="mt-4">
          <label className={labelCls}>FIX Output (display with pipes)</label>
          <textarea className={`${inputCls} font-mono min-h-[140px]`} readOnly value={output} />
        </div>
      </div>
    </section>
  );
}
