"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import api from "@/lib/api";

type Order = {
  id: string; product: string; qty: string; buyer: string;
  deliveryPoint: string; status: string; totalAmount: number;
  distributorAssignedAt: string | null; pickedUpFromHubAt: string | null; arrivedAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  HUB_RECEIVED:     "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  ARRIVED:          "Arrived",
  PICKED_UP:        "Delivered",
};
const STATUS_COLORS: Record<string, string> = {
  HUB_RECEIVED:     "border-amber-200 bg-amber-50 text-amber-700",
  OUT_FOR_DELIVERY: "border-violet-200 bg-violet-50 text-violet-700",
  ARRIVED:          "border-emerald-200 bg-emerald-50 text-emerald-700",
  PICKED_UP:        "border-slate-200 bg-slate-100 text-slate-500",
};

const ALL_STATUSES = ["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED", "PICKED_UP"];

export default function AssignedOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    api.get<Order[]>("/api/delivery-distributor/orders")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assigned Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">All orders assigned to you across all stages.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-slate-700">{orders.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === value
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
            {value !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({orders.filter((o) => o.status === value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Package size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No orders found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((o) => (
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
                <p className="text-xs text-slate-400">Buyer: {o.buyer}</p>
              </div>
              <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
              {o.distributorAssignedAt && (
                <span>Assigned: {new Date(o.distributorAssignedAt).toLocaleDateString()}</span>
              )}
              {o.pickedUpFromHubAt && (
                <span>Picked up: {new Date(o.pickedUpFromHubAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {o.arrivedAt && (
                <span>Arrived: {new Date(o.arrivedAt).toLocaleString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
