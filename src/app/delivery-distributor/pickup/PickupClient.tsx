"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PackageCheck, Truck } from "lucide-react";
import api from "@/lib/api";

type Order = {
  id: string; product: string; qty: string; buyer: string; seller: string;
  deliveryPoint: string; status: string; totalAmount: number;
  distributorAssignedAt: string | null;
};

export default function PickupClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.get<Order[]>("/api/delivery-distributor/orders?status=active")
      .then((all) => setOrders(all.filter((o) => o.status === "HUB_RECEIVED")))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  async function pickup(orderId: string) {
    setBusy(orderId);
    try {
      await api.patch(`/api/delivery-distributor/orders/${orderId}/pickup`, {});
      toast.success("Picked up! Order is now out for delivery.");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pickup failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pickup Requests</h1>
          <p className="text-slate-500 text-sm mt-0.5">Orders assigned to you — pick them up from the delivery hub.</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-amber-700">{orders.length}</p>
          <p className="text-xs text-amber-500">Pending</p>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <PackageCheck size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No pickup requests</p>
          <p className="mt-1 text-sm text-slate-400">Orders assigned to you will appear here once ready at the hub.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-amber-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="space-y-1">
                <span className="font-mono text-xs text-slate-400">{o.id}</span>
                <p className="text-base font-bold text-slate-900">{o.product}</p>
                <p className="text-sm text-slate-500">{o.qty} → <span className="font-medium text-slate-700">{o.deliveryPoint}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 px-5 pb-4">
              {[
                { label: "Buyer", value: o.buyer },
                { label: "Seller", value: o.seller },
                { label: "Delivery Point", value: o.deliveryPoint },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="text-xs font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
              {o.distributorAssignedAt && (
                <p className="text-xs text-slate-400">
                  Assigned {new Date(o.distributorAssignedAt).toLocaleDateString()}
                </p>
              )}
              <button
                onClick={() => void pickup(o.id)}
                disabled={busy === o.id}
                className="ml-auto flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                {busy === o.id ? "Processing…" : "Pick Up from Hub"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
