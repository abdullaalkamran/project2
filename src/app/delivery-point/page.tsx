"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type Stats = {
  incoming: number;
  atPoint: number;
  pendingPickup: number;
  pickupCompleted: number;
};

type Order = {
  orderId: string;
  buyer: string;
  lot: string;
  status: string;
  eta: string;
};

const statusColors: Record<string, string> = {
  "En Route": "bg-blue-50 text-blue-700",
  "At Hub": "bg-sky-50 text-sky-700",
  "Out for Delivery": "bg-amber-50 text-amber-700",
  "Pending Pickup": "bg-orange-50 text-orange-600",
  "Picked Up": "bg-purple-50 text-purple-700",
};

export default function DeliveryPointOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<{ stats: Stats; orders: Order[] }>("/api/delivery-point/overview");
        setStats(data.stats);
        setOrders(data.orders);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const statCards = stats
    ? [
        { label: "Incoming Today", value: stats.incoming, sub: "En route to this point", href: "/delivery-point/incoming", color: "text-blue-700", bg: "bg-blue-50" },
        { label: "At Point", value: stats.atPoint, sub: "Ready for pickup", href: "/delivery-point/arrivals", color: "text-emerald-700", bg: "bg-emerald-50" },
        { label: "Pending Pickup", value: stats.pendingPickup, sub: "Buyer not yet collected", href: "/delivery-point/pickup", color: "text-orange-600", bg: "bg-orange-50" },
        { label: "Pickup Completed", value: stats.pickupCompleted, sub: "Collected from delivery point", href: "/delivery-point/pickup", color: "text-purple-700", bg: "bg-purple-50" },
      ]
    : [];

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Point Overview</h1>
        <p className="text-slate-500">Live order handover status at your delivery point.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Link key={s.label} href={s.href}
              className={`rounded-2xl border border-slate-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg}`}>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live Order Board</h2>
          <Link href="/delivery-point/incoming" className="text-xs font-semibold text-blue-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No active orders at this delivery point.</div>
          ) : (
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Order ID</th>
                  <th className="px-5 py-3 text-left">Buyer</th>
                  <th className="px-5 py-3 text-left">Lot</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">ETA / Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{o.orderId}</td>
                    <td className="px-5 py-4 text-slate-700">{o.buyer}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{o.lot}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[o.status] ?? "bg-slate-100 text-slate-600"}`}>{o.status}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{o.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
