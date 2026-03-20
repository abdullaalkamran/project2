"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  ArrowRight, BarChart3, Bell,
  Building2, DollarSign, Gavel, Globe, Info, Loader2,
  MapPin, Package, RefreshCw, ShieldAlert, ShoppingCart,
  TrendingUp, Truck, Users, Wallet, Warehouse, Wrench,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatItem    = { label: string; value: string; sub: string; href: string; color: string; bg: string };
type Revenue     = { thisMonth: number; lastMonth: number; allTime: number; platformFees: number; growth: number };
type UserBreakdown  = { total: number; sellers: number; buyers: number; suspended: number; pending: number; newThisMonth: number };
type PlatformHealth = { hubCount: number; pendingPayments: number; deliveredOrders: number; lotBreakdown: Record<string, number> };
type HubStat     = { id: string; name: string; location: string; type: string; lots: number };
type RecentUser  = { id: string; name: string; email: string; role: string; status: string; joined: string };
type RecentLot   = { id: string; lotCode: string; title: string; seller: string; status: string; createdAt: string };
type RecentOrder = { id: string; orderCode: string; buyer: string; seller: string; product: string; amount: number; status: string; date: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBDT(n: number) {
  if (n >= 10_000_000) return "৳" + (n / 10_000_000).toFixed(1) + "Cr";
  if (n >= 100_000)    return "৳" + (n / 100_000).toFixed(1) + "L";
  return "৳" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const palette = ["bg-indigo-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-sky-500","bg-violet-500","bg-teal-500","bg-orange-500"];
  const idx = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${palette[idx]} ${sz}`}>
      {initials}
    </span>
  );
}

const LOT_STATUS_COLORS: Record<string, string> = {
  LIVE: "bg-emerald-100 text-emerald-700", QC_PASSED: "bg-blue-100 text-blue-700",
  IN_QC: "bg-orange-100 text-orange-700", QC_SUBMITTED: "bg-violet-100 text-violet-700",
  QC_FAILED: "bg-red-100 text-red-600", AUCTION_ENDED: "bg-slate-100 text-slate-500",
  PENDING_DELIVERY: "bg-slate-100 text-slate-600", AT_HUB: "bg-sky-100 text-sky-700",
};
const LOT_STATUS_LABELS: Record<string, string> = {
  PENDING_DELIVERY: "Pending Delivery", AT_HUB: "At Hub", IN_QC: "In QC",
  QC_SUBMITTED: "QC Submitted", QC_PASSED: "QC Passed", QC_FAILED: "QC Failed",
  LIVE: "Live", AUCTION_ENDED: "Ended",
};
const ORDER_STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700", DISPATCHED: "bg-amber-100 text-amber-700",
  HUB_RECEIVED: "bg-sky-100 text-sky-700", OUT_FOR_DELIVERY: "bg-violet-100 text-violet-700",
  ARRIVED: "bg-teal-100 text-teal-700", PICKED_UP: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700", seller: "bg-emerald-100 text-emerald-700",
  buyer: "bg-sky-100 text-sky-700", hub_manager: "bg-amber-100 text-amber-700",
  qc_leader: "bg-teal-100 text-teal-700", qc_checker: "bg-teal-100 text-teal-600",
  delivery_hub_manager: "bg-indigo-100 text-indigo-700", delivery_distributor: "bg-indigo-100 text-indigo-600",
};

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { label: "Users",        href: "/admin/users",            Icon: Users        },
  { label: "Auctions",     href: "/admin/auctions",         Icon: Gavel        },
  { label: "Orders",       href: "/admin/orders",           Icon: ShoppingCart },
  { label: "Finance",      href: "/admin/finance",          Icon: DollarSign   },
  { label: "Deposits",     href: "/admin/deposit-requests", Icon: Wallet       },
  { label: "QC Reports",   href: "/admin/qc-reports",       Icon: BarChart3    },
  { label: "Disputes",     href: "/admin/disputes",         Icon: ShieldAlert  },
  { label: "Hubs",         href: "/admin/hubs",             Icon: Warehouse    },
  { label: "Districts",    href: "/admin/districts",        Icon: MapPin       },
  { label: "Delivery Pts", href: "/admin/delivery-points",  Icon: MapPin       },
  { label: "Fleet",        href: "/admin/hubs",             Icon: Truck        },
  { label: "CMS",          href: "/admin/cms",              Icon: Globe        },
  { label: "Settings",     href: "/admin/settings",         Icon: Wrench       },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboardClient() {
  const [revenue, setRevenue]               = useState<Revenue | null>(null);
  const [userBreakdown, setUserBreakdown]   = useState<UserBreakdown | null>(null);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [hubs, setHubs]                     = useState<HubStat[]>([]);
  const [stats, setStats]                   = useState<StatItem[]>([]);
  const [recentUsers, setRecentUsers]       = useState<RecentUser[]>([]);
  const [recentLots, setRecentLots]         = useState<RecentLot[]>([]);
  const [recentOrders, setRecentOrders]     = useState<RecentOrder[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [tab, setTab]                       = useState<"orders" | "users" | "lots">("orders");

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    api.get<{
      stats: StatItem[]; revenue: Revenue; userBreakdown: UserBreakdown;
      platformHealth: PlatformHealth; hubs: HubStat[];
      recentUsers: RecentUser[]; recentLots: RecentLot[]; recentOrders: RecentOrder[];
      badges?: { pendingDeposits: number; pendingPayments: number };
    }>("/api/admin/overview")
      .then(d => {
        setStats(d.stats); setRevenue(d.revenue); setUserBreakdown(d.userBreakdown);
        setPlatformHealth(d.platformHealth); setHubs(d.hubs ?? []);
        setRecentUsers(d.recentUsers); setRecentLots(d.recentLots); setRecentOrders(d.recentOrders);
        setPendingDeposits(d.badges?.pendingDeposits ?? 0);
        setLastUpdated(new Date());
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(() => fetchData(true), 60_000); return () => clearInterval(id); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const pendingUsers     = userBreakdown?.pending ?? 0;
  const pendingPayments  = platformHealth?.pendingPayments ?? 0;
  const openDisputes     = parseInt(stats.find(s => s.label === "Open Disputes")?.value ?? "0");
  const pendingQC        = parseInt(stats.find(s => s.label === "QC Pending")?.value ?? "0");

  const alerts = [
    openDisputes    > 0 ? { Icon: ShieldAlert, msg: `${openDisputes} open dispute${openDisputes > 1 ? "s" : ""} need attention`,        href: "/admin/disputes",         cls: "border-red-200 bg-red-50 text-red-700"       } : null,
    pendingUsers    > 0 ? { Icon: Bell,         msg: `${pendingUsers} account${pendingUsers > 1 ? "s" : ""} pending approval`,            href: "/admin/users",            cls: "border-amber-200 bg-amber-50 text-amber-700" } : null,
    pendingDeposits > 0 ? { Icon: Wallet,       msg: `${pendingDeposits} deposit request${pendingDeposits > 1 ? "s" : ""} awaiting approval`, href: "/admin/deposit-requests", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" } : null,
    pendingPayments > 0 ? { Icon: DollarSign,   msg: `${pendingPayments} seller payment${pendingPayments > 1 ? "s" : ""} pending`,         href: "/admin/finance",          cls: "border-sky-200 bg-sky-50 text-sky-700"       } : null,
    pendingQC       > 0 ? { Icon: Info,         msg: `${pendingQC} lot${pendingQC > 1 ? "s" : ""} awaiting QC inspection`,                href: "/admin/qc-reports",       cls: "border-violet-200 bg-violet-50 text-violet-700" } : null,
  ].filter(Boolean) as { Icon: React.ElementType; msg: string; href: string; cls: string }[];

  const lotBreakdown = platformHealth?.lotBreakdown ?? {};
  const lotTotal = Object.values(lotBreakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-7">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Super Admin</p>
          <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
          {lastUpdated && <p className="mt-0.5 text-xs text-slate-400">Last updated {lastUpdated.toLocaleTimeString()}</p>}
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition hover:opacity-90 ${a.cls}`}>
              <a.Icon size={15} className="shrink-0" />
              <span className="flex-1">{a.msg}</span>
              <ArrowRight size={13} className="shrink-0 opacity-60" />
            </Link>
          ))}
        </div>
      )}

      {/* ── Revenue Strip ──────────────────────────────────────────────────── */}
      {revenue && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/admin/finance"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
            <TrendingUp size={40} className="absolute -right-3 -top-3 text-indigo-400/30" />
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">This Month</p>
            <p className="mt-1 text-3xl font-bold text-white">{fmtBDT(revenue.thisMonth)}</p>
            <p className={`mt-1 text-xs font-medium ${revenue.growth >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {revenue.growth >= 0 ? "▲" : "▼"} {Math.abs(revenue.growth)}% vs last month
            </p>
          </Link>
          <Link href="/admin/finance"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
            <BarChart3 size={40} className="absolute -right-3 -top-3 text-slate-600/40" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">All-Time GMV</p>
            <p className="mt-1 text-3xl font-bold text-white">{fmtBDT(revenue.allTime)}</p>
            <p className="mt-1 text-xs text-slate-400">Total trade value</p>
          </Link>
          <Link href="/admin/finance"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
            <DollarSign size={40} className="absolute -right-3 -top-3 text-emerald-300/30" />
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">Platform Fees</p>
            <p className="mt-1 text-3xl font-bold text-white">{fmtBDT(revenue.platformFees)}</p>
            <p className="mt-1 text-xs text-emerald-100">Commission earned</p>
          </Link>
        </div>
      )}

      {/* ── Quick Nav ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-12">
        {NAV.map(({ label, href, Icon }) => (
          <Link key={label} href={href}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
            <Icon size={18} className="text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-600">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Operational Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Main Grid: Activity + Breakdown ────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Activity Table — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-1 border-b border-slate-100 px-5 pt-4">
            {(["orders","users","lots"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                  tab === t ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-400 hover:text-slate-700"
                }`}>
                {t === "lots" ? "Auctions" : t === "orders" ? "Orders" : "Users"}
              </button>
            ))}
            <Link href={tab === "orders" ? "/admin/orders" : tab === "users" ? "/admin/users" : "/admin/auctions"}
              className="ml-auto mb-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {tab === "orders" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Buyer</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No orders yet</td></tr>
                  ) : recentOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-indigo-600">{o.orderCode}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{o.product}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={o.buyer} size="sm" />
                          <span className="text-slate-600 text-xs">{o.buyer}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{fmtBDT(o.amount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ORDER_STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{o.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No users yet</td></tr>
                  ) : recentUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" />
                          <Link href={`/admin/users/${u.id}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline text-sm">
                            {u.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-500"}`}>
                          {u.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
                          : u.status === "PENDING" ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-600"
                        }`}>
                          {u.status.charAt(0) + u.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{u.joined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "lots" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Lot</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Seller</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentLots.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No lots yet</td></tr>
                  ) : recentLots.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-indigo-600">{l.lotCode}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{l.title}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{l.seller}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${LOT_STATUS_COLORS[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {LOT_STATUS_LABELS[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{l.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right sidebar — 1/3 */}
        <div className="space-y-4">

          {/* User Breakdown */}
          {userBreakdown && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-800">Users</p>
                </div>
                <Link href="/admin/users" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                  Manage <ArrowRight size={10} />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total",     value: userBreakdown.total,        color: "text-slate-800",  bg: "bg-slate-50"  },
                  { label: "Sellers",   value: userBreakdown.sellers,      color: "text-amber-700",  bg: "bg-amber-50"  },
                  { label: "Buyers",    value: userBreakdown.buyers,       color: "text-sky-700",    bg: "bg-sky-50"    },
                  { label: "New/Mo",    value: userBreakdown.newThisMonth, color: "text-indigo-700", bg: "bg-indigo-50" },
                  { label: "Pending",   value: userBreakdown.pending,      color: "text-orange-700", bg: "bg-orange-50" },
                  { label: "Suspended", value: userBreakdown.suspended,    color: "text-red-600",    bg: "bg-red-50"    },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl ${c.bg} p-2.5 text-center`}>
                    <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-[10px] text-slate-500">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {(pendingDeposits > 0 || pendingPayments > 0) && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Bell size={14} className="text-amber-500" />
                <p className="text-sm font-bold text-amber-800">Pending Requests</p>
              </div>
              <div className="space-y-2">
                {pendingDeposits > 0 && (
                  <Link href="/admin/deposit-requests"
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2.5 transition hover:bg-emerald-50">
                    <div className="flex items-center gap-2">
                      <Wallet size={14} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">Buyer Deposits</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{pendingDeposits}</span>
                      <ArrowRight size={11} className="text-slate-400" />
                    </div>
                  </Link>
                )}
                {pendingPayments > 0 && (
                  <Link href="/admin/finance"
                    className="flex items-center justify-between rounded-xl border border-sky-200 bg-white px-3 py-2.5 transition hover:bg-sky-50">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-sky-600" />
                      <span className="text-xs font-semibold text-slate-700">Seller Payouts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">{pendingPayments}</span>
                      <ArrowRight size={11} className="text-slate-400" />
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Lot Pipeline */}
          {platformHealth && Object.keys(lotBreakdown).length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-800">Lot Pipeline</p>
                </div>
                <Link href="/admin/auctions" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                  View <ArrowRight size={10} />
                </Link>
              </div>
              <div className="space-y-2.5">
                {[
                  "PENDING_DELIVERY","AT_HUB","IN_QC","QC_SUBMITTED",
                  "QC_PASSED","LIVE","AUCTION_ENDED","QC_FAILED",
                ].filter(k => (lotBreakdown[k] ?? 0) > 0).map(k => {
                  const count = lotBreakdown[k] ?? 0;
                  const pct = Math.round((count / lotTotal) * 100);
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className={`w-24 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${LOT_STATUS_COLORS[k] ?? "bg-slate-100 text-slate-500"}`}>
                        {LOT_STATUS_LABELS[k] ?? k}
                      </span>
                      <div className="flex-1 rounded-full bg-slate-100 h-1.5">
                        <div className="h-1.5 rounded-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-5 text-right text-xs font-bold text-slate-600">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hubs */}
          {hubs.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-800">Hubs</p>
                </div>
                <Link href="/admin/hubs" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                  Manage <ArrowRight size={10} />
                </Link>
              </div>
              <div className="space-y-2">
                {hubs.map(h => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{h.location}</p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-base font-bold text-slate-700">{h.lots}</p>
                      <p className="text-[9px] text-slate-400">lots</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
