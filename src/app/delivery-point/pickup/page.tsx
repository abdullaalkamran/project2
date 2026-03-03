"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { FlowOrder } from "@/lib/product-flow";

type ReadyOrder = {
  id: string;
  buyer: string;
  lots: string;
  category: string;
  weight: string;
  arrivedAt: string;
};

function toReady(o: FlowOrder): ReadyOrder {
  return {
    id: o.id,
    buyer: o.buyer,
    lots: o.lotId,
    category: o.product,
    weight: o.qty,
    arrivedAt: o.arrivedAt ? new Date(o.arrivedAt).toLocaleString() : "-",
  };
}

export default function DPPickupPage() {
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [verify, setVerify] = useState<Record<string, string>>({});

  const load = async () => {
    const rows = await api.get<FlowOrder[]>("/api/flow/delivery/pickup");
    setReadyOrders(rows.map(toReady));
  };

  useEffect(() => {
    void load();
  }, []);

  const confirmPickup = (id: string) => {
    const run = async () => {
      await api.patch(`/api/flow/delivery/orders/${id}/pickup`, {});
      await load();
    };
    void run();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Buyer Pickup</h1>
        <p className="text-slate-500">Orders ready for buyer collection. Confirm pickup with buyer ID.</p>
      </div>
      {readyOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">No orders waiting for pickup.</div>
      ) : (
        <div className="space-y-4">
          {readyOrders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{o.id}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Buyer: {o.buyer} · {o.category} · {o.weight}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Arrived: {o.arrivedAt}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Buyer NID / Phone for verification"
                  value={verify[o.id] ?? ""}
                  onChange={(e) => setVerify((p) => ({ ...p, [o.id]: e.target.value }))}
                  className="min-w-48 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-400 focus:outline-none"
                />
                <button type="button" onClick={() => confirmPickup(o.id)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Confirm Pickup</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

