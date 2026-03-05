"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";

type Order = {
  id: string; product: string; qty: string; buyer: string;
  deliveryPoint: string; status: string; totalAmount: number;
  distributorAssignedAt: string | null; pickedUpFromHubAt: string | null; arrivedAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  ARRIVED:  "Arrived at Point",
  PICKED_UP: "Delivered",
};
const STATUS_COLORS: Record<string, string> = {
  ARRIVED:  "border-emerald-200 bg-emerald-50 text-emerald-700",
  PICKED_UP: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function DeliveryHistoryClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>("/api/delivery-distributor/orders?status=history")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery History</h1>
          <p className="text-slate-500 text-sm mt-0.5">Completed deliveries you have made.</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-emerald-700">{orders.length}</p>
          <p className="text-xs text-emerald-500">Completed</p>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-emerald-700">Total Delivered Value</p>
          <p className="text-xl font-bold text-emerald-800">৳ {totalValue.toLocaleString()}</p>
        </div>
      )}

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No deliveries completed yet</p>
          <p className="mt-1 text-sm text-slate-400">Completed deliveries will appear here.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{o.id}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[o.status] ?? ""}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">{o.product}</p>
                <p className="text-xs text-slate-500">{o.qty} → <span className="font-medium text-slate-700">{o.deliveryPoint}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
              {o.pickedUpFromHubAt && (
                <span>Picked up: {new Date(o.pickedUpFromHubAt).toLocaleString()}</span>
              )}
              {o.arrivedAt && (
                <span>Arrived: {new Date(o.arrivedAt).toLocaleString()}</span>
              )}
              <span>Buyer: <span className="font-medium text-slate-600">{o.buyer}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
