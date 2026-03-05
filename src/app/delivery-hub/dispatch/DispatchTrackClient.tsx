"use client";

import { useEffect, useState } from "react";
import { Loader2, Navigation, PackageCheck } from "lucide-react";
import api from "@/lib/api";

type TrackOrder = {
  id: string; product: string; qty: string; buyer: string;
  deliveryPoint: string; status: string; distributorName: string | null;
  distributorPhone: string | null; pickedUpFromHubAt: string | null; totalAmount: number;
};

const STATUS_COLORS: Record<string, string> = {
  OUT_FOR_DELIVERY: "border-violet-200 bg-violet-50 text-violet-700",
  ARRIVED:          "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const STATUS_LABELS: Record<string, string> = {
  OUT_FOR_DELIVERY: "Out for Delivery",
  ARRIVED: "Arrived at Point",
};

export default function DispatchTrackClient() {
  const [orders, setOrders] = useState<TrackOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TrackOrder[]>("/api/delivery-hub/orders?status=OUT_FOR_DELIVERY")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch Tracking</h1>
          <p className="text-slate-500 text-sm mt-0.5">Orders currently out for delivery by distributors.</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-violet-700">{orders.length}</p>
          <p className="text-xs text-violet-500">In Transit</p>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Navigation size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No orders out for delivery</p>
          <p className="mt-1 text-sm text-slate-400">Orders will appear here once distributors pick them up.</p>
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
                <p className="text-base font-bold text-slate-900">{o.product}</p>
                <p className="text-sm text-slate-500">{o.qty} → <span className="font-medium text-slate-700">{o.deliveryPoint}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {o.distributorName && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5">
                <PackageCheck size={14} className="text-violet-600" />
                <div className="text-xs">
                  <span className="font-semibold text-violet-800">{o.distributorName}</span>
                  {o.distributorPhone && <span className="text-violet-600 ml-2">· {o.distributorPhone}</span>}
                  {o.pickedUpFromHubAt && (
                    <span className="text-slate-400 ml-2">· Picked up {new Date(o.pickedUpFromHubAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
