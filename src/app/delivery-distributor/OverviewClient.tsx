"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PackageCheck, Truck, Clock, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

type Stats = { assigned: number; outForDelivery: number; delivered: number; deliveredToday: number };

type Order = {
  id: string; product: string; qty: string; buyer: string;
  deliveryPoint: string; status: string; totalAmount: number;
  distributorAssignedAt: string | null; pickedUpFromHubAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  HUB_RECEIVED: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  ARRIVED: "Arrived",
  PICKED_UP: "Delivered",
};
const STATUS_COLORS: Record<string, string> = {
  HUB_RECEIVED:     "border-amber-200 bg-amber-50 text-amber-700",
  OUT_FOR_DELIVERY: "border-violet-200 bg-violet-50 text-violet-700",
  ARRIVED:          "border-emerald-200 bg-emerald-50 text-emerald-700",
  PICKED_UP:        "border-slate-200 bg-slate-50 text-slate-600",
};

export default function DistributorOverviewClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>("/api/delivery-distributor/overview"),
      api.get<Order[]>("/api/delivery-distributor/orders"),
    ])
      .then(([s, o]) => { setStats(s); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );

  const pending = orders.filter((o) => o.status === "HUB_RECEIVED");
  const active  = orders.filter((o) => o.status === "OUT_FOR_DELIVERY");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Distributor Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your assigned deliveries and performance summary.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pending Pickup",  value: stats?.assigned ?? 0,       color: "text-amber-700",   bg: "bg-amber-50 border-amber-100",   href: "/delivery-distributor/pickup",  icon: <Clock size={18} /> },
          { label: "Out for Delivery", value: stats?.outForDelivery ?? 0, color: "text-violet-700",  bg: "bg-violet-50 border-violet-100", href: "/delivery-distributor/active",  icon: <Truck size={18} /> },
          { label: "Total Delivered",  value: stats?.delivered ?? 0,       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", href: "/delivery-distributor/history", icon: <CheckCircle2 size={18} /> },
          { label: "Delivered Today",  value: stats?.deliveredToday ?? 0,  color: "text-blue-700",    bg: "bg-blue-50 border-blue-100",      href: "/delivery-distributor/history", icon: <PackageCheck size={18} /> },
        ].map(({ label, value, color, bg, href, icon }) => (
          <Link key={label} href={href} className={`rounded-2xl border ${bg} p-5 shadow-sm hover:shadow-md transition-shadow block`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className={`${color} opacity-60`}>{icon}</span>
            </div>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </Link>
        ))}
      </div>

      {/* Quick action banners */}
      {(pending.length > 0 || active.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.length > 0 && (
            <Link href="/delivery-distributor/pickup"
              className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition">
              <div>
                <p className="text-sm font-semibold text-amber-800">Ready to Pick Up</p>
                <p className="text-xs text-amber-600 mt-0.5">{pending.length} order{pending.length !== 1 ? "s" : ""} waiting at the hub</p>
              </div>
              <span className="rounded-full bg-amber-500 text-white text-sm font-bold px-3 py-1">{pending.length}</span>
            </Link>
          )}
          {active.length > 0 && (
            <Link href="/delivery-distributor/active"
              className="flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 hover:bg-violet-100 transition">
              <div>
                <p className="text-sm font-semibold text-violet-800">In Transit</p>
                <p className="text-xs text-violet-600 mt-0.5">{active.length} order{active.length !== 1 ? "s" : ""} out for delivery</p>
              </div>
              <span className="rounded-full bg-violet-500 text-white text-sm font-bold px-3 py-1">{active.length}</span>
            </Link>
          )}
        </div>
      )}

      {/* Recent orders */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">My Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <PackageCheck size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">No orders assigned yet</p>
            <p className="mt-1 text-sm text-slate-400">Orders will appear here once the hub assigns them to you.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{o.id}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[o.status] ?? ""}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{o.product}</p>
                  <p className="text-xs text-slate-500">{o.qty} → {o.deliveryPoint}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        {orders.length > 8 && (
          <div className="border-t border-slate-50 px-5 py-3 text-center">
            <Link href="/delivery-distributor/orders" className="text-xs font-medium text-violet-600 hover:underline">
              View all {orders.length} orders →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
