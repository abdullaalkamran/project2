"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Box, Loader2, PackageCheck, Truck, Users } from "lucide-react";
import api from "@/lib/api";

type Stats = {
  incoming: number;
  hubReceived: number;
  outForDelivery: number;
  delivered: number;
  receivedToday: number;
  dispatchedToday: number;
  activeDistributors: number;
};

const STATUS_COLORS: Record<string, string> = {
  DISPATCHED:       "bg-blue-50 text-blue-700 border-blue-200",
  HUB_RECEIVED:     "bg-amber-50 text-amber-700 border-amber-200",
  OUT_FOR_DELIVERY: "bg-violet-50 text-violet-700 border-violet-200",
  ARRIVED:          "bg-emerald-50 text-emerald-700 border-emerald-200",
  PICKED_UP:        "bg-slate-50 text-slate-700 border-slate-200",
};
const STATUS_LABELS: Record<string, string> = {
  DISPATCHED:       "Incoming",
  HUB_RECEIVED:     "At Hub",
  OUT_FOR_DELIVERY: "Out for Delivery",
  ARRIVED:          "Arrived",
  PICKED_UP:        "Delivered",
};

type RecentOrder = {
  id: string; product: string; buyer: string; deliveryPoint: string;
  status: string; distributorName: string | null;
};

type Hub = { id: string; name: string; location: string };

export default function DeliveryHubOverviewClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [myHubs, setMyHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>("/api/delivery-hub/overview"),
      api.get<RecentOrder[]>("/api/delivery-hub/orders"),
      api.get<{ hubs: Hub[] }>("/api/delivery-hub/my-hubs"),
    ])
      .then(([s, orders, hubData]) => {
        setStats(s);
        setRecent(orders.slice(0, 8));
        setMyHubs(hubData.hubs ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  const statCards = [
    { label: "Incoming Shipments", value: stats?.incoming ?? 0, icon: Truck, color: "text-blue-700", bg: "bg-blue-50 border-blue-100", href: "/delivery-hub/incoming" },
    { label: "At Hub (Pending Assign)", value: stats?.hubReceived ?? 0, icon: Box, color: "text-amber-700", bg: "bg-amber-50 border-amber-100", href: "/delivery-hub/distribution" },
    { label: "Out for Delivery", value: stats?.outForDelivery ?? 0, icon: PackageCheck, color: "text-violet-700", bg: "bg-violet-50 border-violet-100", href: "/delivery-hub/dispatch" },
    { label: "Active Delivery Men", value: stats?.activeDistributors ?? 0, icon: Users, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", href: "/delivery-hub/distribution" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Hub Overview</h1>
        <p className="text-slate-500 text-sm">Manage incoming shipments, assign delivery men, and track deliveries.</p>
      </div>

      {/* Your Hubs banner */}
      {myHubs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Your Hubs</span>
          {myHubs.map((h) => (
            <span key={h.id} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700">
              {h.name} <span className="text-blue-400">· {h.location}</span>
            </span>
          ))}
        </div>
      )}

      {/* Today banner */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
          <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Received Today</p>
          <p className="text-2xl font-bold text-blue-700">{stats?.receivedToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-5 py-3">
          <p className="text-xs font-medium text-violet-500 uppercase tracking-wide">Dispatched Today</p>
          <p className="text-2xl font-bold text-violet-700">{stats?.dispatchedToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3">
          <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Total Delivered</p>
          <p className="text-2xl font-bold text-emerald-700">{stats?.delivered ?? 0}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className={`group rounded-2xl border ${bg} p-5 shadow-sm transition hover:shadow-md`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className={`mt-1.5 text-3xl font-bold ${color}`}>{value}</p>
              </div>
              <div className={`rounded-xl p-2 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${color} opacity-0 group-hover:opacity-100 transition`}>
              View <ArrowRight size={11} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent Orders in Hub</h2>
          <Link href="/delivery-hub/incoming" className="text-xs font-semibold text-blue-600 hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No orders in hub pipeline yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-800">{o.product}</p>
                  <p className="text-xs text-slate-400 font-mono">{o.id} · {o.buyer} → {o.deliveryPoint}</p>
                  {o.distributorName && (
                    <p className="text-xs text-violet-600 font-medium">Delivery Man: {o.distributorName}</p>
                  )}
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[o.status] ?? "bg-slate-50 text-slate-600"}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Confirm Incoming", desc: "Mark dispatched orders as received at hub", href: "/delivery-hub/incoming/confirm", color: "bg-blue-600 hover:bg-blue-700" },
          { label: "Assign Delivery Man", desc: "Assign received orders to delivery men", href: "/delivery-hub/distribution", color: "bg-amber-500 hover:bg-amber-600" },
          { label: "Track Dispatch", desc: "Monitor orders out for delivery", href: "/delivery-hub/dispatch", color: "bg-violet-600 hover:bg-violet-700" },
        ].map((a) => (
          <Link key={a.label} href={a.href} className={`rounded-2xl ${a.color} p-5 text-white transition shadow-sm`}>
            <p className="text-sm font-bold">{a.label}</p>
            <p className="mt-1 text-xs opacity-80">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
