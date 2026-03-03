"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { FlowOrder } from "@/lib/product-flow";

type Row = {
  id: string;
  buyer: string;
  lots: string;
  category: string;
  weight: string;
  hub: string;
  dispatchedAt: string;
  eta: string;
  status: "In Transit" | "Arrived";
};

const statusColors: Record<Row["status"], string> = {
  "In Transit": "bg-amber-50 text-amber-700",
  Arrived: "bg-emerald-50 text-emerald-700",
};

function toRow(o: FlowOrder): Row {
  return {
    id: o.id,
    buyer: o.buyer,
    lots: o.lotId,
    category: o.product,
    weight: o.qty,
    hub: "Hub Dispatch",
    dispatchedAt: new Date(o.confirmedAt).toLocaleString(),
    eta: o.arrivedAt ? new Date(o.arrivedAt).toLocaleString() : "Pending",
    status: o.status === "ARRIVED" || o.status === "PICKED_UP" ? "Arrived" : "In Transit",
  };
}

export default function DPIncomingPage() {
  const [orders, setOrders] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const rows = await api.get<FlowOrder[]>("/api/flow/delivery/incoming");
      setOrders(rows.map(toRow));
    };
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Incoming Orders</h1>
        <p className="text-slate-500">Orders dispatched from hubs to this delivery point.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {["Order", "Buyer", "Lot", "Category", "Weight", "Hub", "Dispatched", "ETA", "Status"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{o.id}</td>
                <td className="px-4 py-3 text-slate-700">{o.buyer}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.lots}</td>
                <td className="px-4 py-3 text-slate-600">{o.category}</td>
                <td className="px-4 py-3 text-slate-600">{o.weight}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{o.hub}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{o.dispatchedAt}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{o.eta}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[o.status]}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
