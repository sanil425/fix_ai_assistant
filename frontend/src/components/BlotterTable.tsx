// frontend/src/components/BlotterTable.tsx
import React, { useState } from "react";
import { blotter, OrderRow } from "../state/blotter";

const card = "rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4";

export default function BlotterTable() {
  const [rows, setRows] = useState<OrderRow[]>(blotter.all());
  const refresh = () => setRows(blotter.all());
  const empty = rows.length === 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order Blotter</h2>
        <button onClick={refresh} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Refresh</button>
      </div>

      <div className={card}>
        {empty ? (
          <div className="text-sm text-zinc-400">No orders yet. Build one above to see it here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-300">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 text-left">ClOrdID</th>
                  <th className="py-2 text-left">Symbol</th>
                  <th className="py-2 text-left">Side</th>
                  <th className="py-2 text-left">Qty</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Leaves</th>
                  <th className="py-2 text-left">AvgPx</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {rows.map(r => (
                  <tr key={r.clOrdID} className="border-b border-zinc-800">
                    <td className="py-2">{r.clOrdID}</td>
                    <td className="py-2">{r.symbol}</td>
                    <td className="py-2">{r.side}</td>
                    <td className="py-2">{r.qty}</td>
                    <td className="py-2">{r.ordType}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{r.leavesQty}</td>
                    <td className="py-2">{r.avgPx ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
