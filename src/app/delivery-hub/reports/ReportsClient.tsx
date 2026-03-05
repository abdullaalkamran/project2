"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import api from "@/lib/api";

type Stats = {
  incoming: number; hubReceived: number; outForDelivery: number;
  delivered: number; receivedToday: number; dispatchedToday: number; activeDistributors: number;
};

type HubOrder = {
  id: string; product: string; qty: string; buyer: string; deliveryPoint: string;
  status: string; distributorName: string | null; totalAmount: number; confirmedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  DISPATCHED: "In Transit to Hub", HUB_RECEIVED: "At Hub",
  OUT_FOR_DELIVERY: "Out for Delivery", ARRIVED: "Arrived", PICKED_UP: "Delivered",
};

export default function HubReportsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>("/api/delivery-hub/overview"),
      api.get<HubOrder[]>("/api/delivery-hub/orders"),
    ])
      .then(([s, o]) => { setStats(s); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>;

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1; return acc;
  }, {});

  const byDistributor = orders.reduce<Record<string, number>>((acc, o) => {
    if (o.distributorName) { acc[o.distributorName] = (acc[o.distributorName] ?? 0) + 1; }
    return acc;
  }, {});

  const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Delivery Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Summary of hub operations and delivery performance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Received Today", value: stats?.receivedToday ?? 0, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
          { label: "Dispatched Today", value: stats?.dispatchedToday ?? 0, color: "text-violet-700", bg: "bg-violet-50 border-violet-100" },
          { label: "Active Distributors", value: stats?.activeDistributors ?? 0, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
          { label: "Total Delivered", value: stats?.delivered ?? 0, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl border ${bg} p-5 shadow-sm`}>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`mt-1.5 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 flex items-center justify-between">
        <p className="text-sm font-medium text-emerald-700">Total Order Value in Pipeline</p>
        <p className="text-xl font-bold text-emerald-800">৳ {totalAmount.toLocaleString()}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By status */}
        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Orders by Status</h2>
          </div>
          <div className="divide-y divide-slate-50 p-2">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center justify-between px-3 py-2.5">
                <p className="text-sm text-slate-700">{label}</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {byStatus[status] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* By distributor */}
        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Orders by Distributor</h2>
          </div>
          {Object.keys(byDistributor).length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No distributors assigned yet.</p>
          ) : (
            <div className="divide-y divide-slate-50 p-2">
              {Object.entries(byDistributor).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between px-3 py-2.5">
                  <p className="text-sm text-slate-700">{name}</p>
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
