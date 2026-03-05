"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import api from "@/lib/api";

type HubOrder = {
  id: string; product: string; qty: string; buyer: string; seller: string;
  deliveryPoint: string; assignedTruck: string | null; status: string;
  loadConfirmed: boolean; dispatched: boolean;
  confirmedAt: string; hubReceivedAt: string | null;
  distributorName: string | null; totalAmount: number;
};

const STATUS_COLORS: Record<string, string> = {
  DISPATCHED:       "border-blue-200 bg-blue-50 text-blue-700",
  HUB_RECEIVED:     "border-amber-200 bg-amber-50 text-amber-700",
  OUT_FOR_DELIVERY: "border-violet-200 bg-violet-50 text-violet-700",
};
const STATUS_LABELS: Record<string, string> = {
  DISPATCHED: "In Transit", HUB_RECEIVED: "Received at Hub", OUT_FOR_DELIVERY: "Out for Delivery",
};

export default function HubIncomingClient() {
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api.get<HubOrder[]>("/api/delivery-hub/orders?status=DISPATCHED")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  async function receive(orderId: string) {
    setBusy(orderId);
    try {
      await api.patch(`/api/delivery-hub/orders/${orderId}/receive`, {});
      toast.success("Order received at hub!");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to receive order");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incoming Shipments</h1>
          <p className="text-slate-500 text-sm mt-0.5">Orders dispatched from main hub, awaiting your receipt confirmation.</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-blue-700">{orders.length}</p>
          <p className="text-xs text-blue-500">Incoming</p>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Truck size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No incoming shipments</p>
          <p className="mt-1 text-sm text-slate-400">Orders dispatched from the main hub will appear here.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{o.id}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[o.status] ?? ""}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-base font-bold text-slate-900">{o.product}</p>
                <p className="text-sm text-slate-500">{o.qty}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-right">
                <p className="text-[10px] text-slate-400">Total Amount</p>
                <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 px-5 pb-4">
              {[
                { label: "Buyer", value: o.buyer },
                { label: "Seller", value: o.seller },
                { label: "Delivery Point", value: o.deliveryPoint },
                { label: "Truck", value: o.assignedTruck ?? "Not assigned yet" },
                { label: "Dispatch", value: o.dispatched ? "Dispatched from source hub" : "Pending dispatch" },
                { label: "Load", value: o.loadConfirmed ? "Loaded on truck" : "Load not confirmed" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="text-xs font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Dispatched {new Date(o.confirmedAt).toLocaleDateString()}</p>
              {o.status === "DISPATCHED" && (
                <button
                  onClick={() => void receive(o.id)}
                  disabled={busy === o.id}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {busy === o.id ? "Confirming…" : "Confirm Receipt"}
                </button>
              )}
              {o.status !== "DISPATCHED" && (
                <span className="text-xs font-semibold text-amber-700">✓ Received at {o.hubReceivedAt ? new Date(o.hubReceivedAt).toLocaleDateString() : "hub"}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
