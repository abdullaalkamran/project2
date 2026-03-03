"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { FlowOrder } from "@/lib/product-flow";

export default function DPArrivalsPage() {
  const [orderId, setOrderId] = useState("");
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<FlowOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      const rows = await api.get<FlowOrder[]>("/api/flow/delivery/incoming");
      setIncoming(rows.filter((o) => o.status === "DISPATCHED"));
    };
    void load();
  }, []);

  const handleConfirm = () => {
    const run = async () => {
      const id = orderId.trim();
      if (!id) return;
      await api.patch(`/api/flow/delivery/orders/${id}/arrive`, {});
      setConfirmed((prev) => [id, ...prev]);
      setIncoming((prev) => prev.filter((o) => o.id !== id));
      setOrderId("");
    };
    void run();
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Confirm Arrival</h1>
        <p className="text-slate-500">Scan or enter an order ID to mark it as arrived at this delivery point.</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        {incoming.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dispatched Orders</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {incoming.map((o) => (
                <li key={o.id}>{o.id} - {o.product} - {o.qty}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Order ID</label>
          <div className="flex gap-3">
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              placeholder="e.g. ORD-5501"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
            />
            <button type="button" onClick={handleConfirm} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Mark Arrived
            </button>
          </div>
        </div>
        {confirmed.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmed This Session</p>
            <ul className="space-y-2">
              {confirmed.map((id, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                  <span>✓</span> {id} — Arrived
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
