"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import api from "@/lib/api";

type Stats = {
  upcoming: number;
  incoming: number;
  hubReceived: number;
  outForDelivery: number;
  delivered: number;
  receivedToday: number;
  dispatchedToday: number;
  activeDistributors: number;
};

type ActionItem = { id: string; label: string; sub: string; href: string };

type RequiredAction = {
  type: string;
  title: string;
  desc: string;
  count: number;
  urgency: "high" | "medium" | "low";
  href: string;
  items: ActionItem[];
};

type OverviewData = Stats & { requiredActions: RequiredAction[] };

type RecentOrder = {
  id: string; product: string; buyer: string; deliveryPoint: string;
  status: string; distributorName: string | null;
};

type Hub = { id: string; name: string; location: string };

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

const URGENCY_STYLES: Record<string, { card: string; badge: string; btn: string }> = {
  high:   { card: "border-rose-200 bg-rose-50",   badge: "bg-rose-100 text-rose-700",   btn: "text-rose-700 hover:text-rose-900"   },
  medium: { card: "border-amber-200 bg-amber-50",  badge: "bg-amber-100 text-amber-700",  btn: "text-amber-700 hover:text-amber-900"  },
  low:    { card: "border-slate-200 bg-slate-50",  badge: "bg-slate-100 text-slate-600",  btn: "text-slate-600 hover:text-slate-900"  },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  upcoming: <Clock       className="h-4 w-4" />,
  receive:  <Truck       className="h-4 w-4" />,
  assign:   <UserCheck   className="h-4 w-4" />,
  deliver:  <PackageCheck className="h-4 w-4" />,
};

export default function DeliveryHubOverviewClient() {
  const [data, setData]     = useState<OverviewData | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [myHubs, setMyHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<OverviewData>("/api/delivery-hub/overview"),
      api.get<RecentOrder[]>("/api/delivery-hub/orders"),
      api.get<{ hubs: Hub[] }>("/api/delivery-hub/my-hubs"),
    ])
      .then(([d, orders, hubData]) => {
        setData(d);
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

  const stats = data;
  const requiredActions = data?.requiredActions ?? [];

  const statCards = [
    { label: "Upcoming Orders",       value: stats?.upcoming ?? 0,           icon: Clock,         color: "text-sky-700",    bg: "bg-sky-50 border-sky-100",      href: "/delivery-hub/dispatch"    },
    { label: "Incoming Shipments",    value: stats?.incoming ?? 0,           icon: Truck,         color: "text-blue-700",   bg: "bg-blue-50 border-blue-100",    href: "/delivery-hub/incoming"    },
    { label: "At Hub (Needs Assign)", value: stats?.hubReceived ?? 0,        icon: Box,           color: "text-amber-700",  bg: "bg-amber-50 border-amber-100",  href: "/delivery-hub/distribution"},
    { label: "Out for Delivery",      value: stats?.outForDelivery ?? 0,     icon: PackageCheck,  color: "text-violet-700", bg: "bg-violet-50 border-violet-100",href: "/delivery-hub/dispatch"    },
    { label: "Active Delivery Men",   value: stats?.activeDistributors ?? 0, icon: Users,         color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-100",href: "/delivery-hub/distribution"},
  ];

  return (
    <div className="space-y-10">
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

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className={`group rounded-2xl border ${bg} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <Icon size={18} className={`${color} opacity-60`} />
            </div>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${color} opacity-0 group-hover:opacity-100 transition`}>
              View <ArrowRight size={11} />
            </div>
          </Link>
        ))}
      </div>

      {/* Today strip */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-500">Received Today</p>
          <p className="text-2xl font-bold text-blue-700">{stats?.receivedToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-500">Dispatched Today</p>
          <p className="text-2xl font-bold text-violet-700">{stats?.dispatchedToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-500">Total Delivered</p>
          <p className="text-2xl font-bold text-emerald-700">{stats?.delivered ?? 0}</p>
        </div>
      </div>

      {/* Required Actions */}
      {requiredActions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Required Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requiredActions.map((action) => {
              const styles = URGENCY_STYLES[action.urgency] ?? URGENCY_STYLES.low;
              return (
                <div key={action.type} className={`rounded-2xl border p-5 ${styles.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{ACTION_ICONS[action.type]}</span>
                      <p className="font-semibold text-slate-900 leading-tight">{action.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles.badge}`}>
                        {action.count}
                      </span>
                      {action.urgency === "high" && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{action.desc}</p>
                  {action.items.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {action.items.map((item) => (
                        <li key={item.id} className="rounded-lg bg-white/70 px-3 py-2 text-xs">
                          <span className="font-medium text-slate-800">{item.label}</span>
                          <span className="ml-1 font-mono text-[10px] text-slate-400">({item.id})</span>
                          <p className="text-slate-500">{item.sub}</p>
                        </li>
                      ))}
                      {action.count > action.items.length && (
                        <li className="px-1 text-[11px] text-slate-400">
                          +{action.count - action.items.length} more
                        </li>
                      )}
                    </ul>
                  )}
                  <Link
                    href={action.href}
                    className={`mt-3 flex items-center gap-1 text-xs font-semibold ${styles.btn}`}
                  >
                    Go <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">All clear — no pending actions right now.</p>
        </div>
      )}

      {/* Recent orders */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent Orders in Pipeline</h2>
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
                  <p className="font-mono text-xs text-slate-400">{o.id} · {o.buyer} → {o.deliveryPoint}</p>
                  {o.distributorName && (
                    <p className="text-xs font-medium text-violet-600">Delivery Man: {o.distributorName}</p>
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

      {/* Quick Links */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Confirm Incoming",    desc: "Mark dispatched orders as received",     href: "/delivery-hub/incoming",    icon: <Truck        className="h-5 w-5 text-blue-600"   /> },
            { label: "Assign Delivery Man", desc: "Assign received orders to delivery men", href: "/delivery-hub/distribution",icon: <UserCheck    className="h-5 w-5 text-amber-600" /> },
            { label: "Track Dispatch",      desc: "Monitor orders out for delivery",        href: "/delivery-hub/dispatch",    icon: <PackageCheck className="h-5 w-5 text-violet-600"/> },
          ].map((a) => (
            <Link key={a.label} href={a.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {a.icon}
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                <p className="text-xs text-slate-400">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
