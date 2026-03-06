"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatItem = { label: string; value: string; sub: string; href: string; color: string; bg: string };

type Revenue = {
  thisMonth: number; lastMonth: number; allTime: number;
  platformFees: number; growth: number;
};

type UserBreakdown = {
  total: number; sellers: number; buyers: number;
  suspended: number; pending: number; newThisMonth: number;
};

type PlatformHealth = {
  hubCount: number; pendingPayments: number;
  deliveredOrders: number; lotBreakdown: Record<string, number>;
};

type HubStat = { id: string; name: string; location: string; type: string; lots: number };

type RecentUser  = { id: string; name: string; email: string; role: string; status: string; joined: string };
type RecentLot   = { id: string; lotCode: string; title: string; seller: string; status: string; createdAt: string };
type RecentOrder = { id: string; orderCode: string; buyer: string; seller: string; product: string; amount: number; status: string; date: string };

// ── Colour maps ───────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-orange-50 text-orange-600",
  SUSPENDED: "bg-red-50 text-red-600",
};

const orderStatusColors: Record<string, string> = {
  CONFIRMED: "bg-blue-50 text-blue-700",
  DISPATCHED: "bg-amber-50 text-amber-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
};

const lotStatusColors: Record<string, string> = {
  LIVE: "bg-emerald-50 text-emerald-700",
  QC_PASSED: "bg-blue-50 text-blue-700",
  IN_QC: "bg-orange-50 text-orange-600",
  QC_SUBMITTED: "bg-violet-50 text-violet-700",
  QC_FAILED: "bg-red-50 text-red-600",
  AUCTION_ENDED: "bg-slate-100 text-slate-500",
  PENDING_DELIVERY: "bg-slate-50 text-slate-600",
  AT_HUB: "bg-sky-50 text-sky-700",
};

const roleColors: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700",
  seller: "bg-emerald-50 text-emerald-700",
  buyer: "bg-sky-50 text-sky-700",
  hub_manager: "bg-amber-50 text-amber-700",
  qc_leader: "bg-teal-50 text-teal-700",
  qc_checker: "bg-teal-50 text-teal-600",
  delivery_hub_manager: "bg-indigo-50 text-indigo-700",
  delivery_distributor: "bg-indigo-50 text-indigo-600",
};

const hubTypeColors: Record<string, string> = {
  BOTH: "bg-indigo-50 text-indigo-700",
  RECEIVING: "bg-amber-50 text-amber-700",
  DELIVERY: "bg-teal-50 text-teal-700",
};

const hubTypeLabels: Record<string, string> = {
  BOTH: "Receiving & Delivery",
  RECEIVING: "Receiving Only",
  DELIVERY: "Delivery Only",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBDT(n: number) {
  if (n >= 10_000_000) return "৳ " + (n / 10_000_000).toFixed(1) + "Cr";
  if (n >= 100_000) return "৳ " + (n / 100_000).toFixed(1) + "L";
  return "৳ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboardClient() {
  const [stats, setStats]               = useState<StatItem[]>([]);
  const [revenue, setRevenue]           = useState<Revenue | null>(null);
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdown | null>(null);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [hubs, setHubs]                 = useState<HubStat[]>([]);
  const [recentUsers, setRecentUsers]   = useState<RecentUser[]>([]);
  const [recentLots, setRecentLots]     = useState<RecentLot[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState<"orders" | "users" | "lots">("orders");

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    api.get<{
      stats: StatItem[]; revenue: Revenue; userBreakdown: UserBreakdown;
      platformHealth: PlatformHealth; hubs: HubStat[];
      recentUsers: RecentUser[]; recentLots: RecentLot[]; recentOrders: RecentOrder[];
    }>("/api/admin/overview")
      .then(data => {
        setStats(data.stats);
        setRevenue(data.revenue);
        setUserBreakdown(data.userBreakdown);
        setPlatformHealth(data.platformHealth);
        setHubs(data.hubs ?? []);
        setRecentUsers(data.recentUsers);
        setRecentLots(data.recentLots);
        setRecentOrders(data.recentOrders);
        setLastUpdated(new Date());
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-slate-100" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
        </div>
        <div className="h-64 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const pendingUsers = userBreakdown?.pending ?? 0;
  const pendingPayments = platformHealth?.pendingPayments ?? 0;
  const openDisputesVal = parseInt(stats.find(s => s.label === "Open Disputes")?.value ?? "0");
  const pendingQCVal = parseInt(stats.find(s => s.label === "QC Pending")?.value ?? "0");

  const alerts = [
    pendingUsers > 0
      ? { type: "warn",  msg: `${pendingUsers} account${pendingUsers > 1 ? "s" : ""} pending approval`, href: "/admin/users" }
      : null,
    openDisputesVal > 0
      ? { type: "error", msg: `${openDisputesVal} open dispute${openDisputesVal > 1 ? "s" : ""} need attention`, href: "/admin/disputes" }
      : null,
    pendingQCVal > 0
      ? { type: "info",  msg: `${pendingQCVal} lots awaiting QC inspection`, href: "/admin/qc-reports" }
      : null,
    pendingPayments > 0
      ? { type: "info",  msg: `${pendingPayments} seller payment request${pendingPayments > 1 ? "s" : ""} pending`, href: "/admin/finance" }
      : null,
  ].filter(Boolean) as { type: string; msg: string; href: string }[];

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400">Super Admin</p>
          <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">Real-time health across all operations</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button type="button" onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
            <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-90 ${
                a.type === "error" ? "bg-red-50 text-red-700 border border-red-100"
                : a.type === "warn" ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-sky-50 text-sky-700 border border-sky-100"
              }`}>
              <span className="text-base leading-none">
                {a.type === "error" ? "⚠️" : a.type === "warn" ? "🔔" : "ℹ️"}
              </span>
              {a.msg}
              <span className="ml-auto text-xs opacity-60">View →</span>
            </Link>
          ))}
        </div>
      )}

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      {revenue && userBreakdown && platformHealth && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "This Month",    value: fmtBDT(revenue.thisMonth),    sub: `${revenue.growth >= 0 ? "+" : ""}${revenue.growth}% vs last month`, href: "/admin/finance",  grad: "from-indigo-600 to-violet-600", text: "text-white", sub2: "text-indigo-200" },
            { label: "All-Time Revenue", value: fmtBDT(revenue.allTime),   sub: "Total GMV",    href: "/admin/finance",  grad: "from-slate-700 to-slate-800", text: "text-white", sub2: "text-slate-300" },
            { label: "Platform Fees", value: fmtBDT(revenue.platformFees), sub: "Commission earned", href: "/admin/finance",  grad: "from-emerald-500 to-teal-600", text: "text-white", sub2: "text-emerald-100" },
            { label: "Sellers",       value: String(userBreakdown.sellers), sub: "Registered",   href: "/admin/users/sellers", grad: "from-amber-400 to-orange-500", text: "text-white", sub2: "text-amber-100" },
            { label: "Buyers",        value: String(userBreakdown.buyers),  sub: "Registered",   href: "/admin/users/buyers",  grad: "from-sky-400 to-blue-500",    text: "text-white", sub2: "text-sky-100" },
            { label: "Active Hubs",   value: String(platformHealth.hubCount), sub: "Operating",  href: "/admin/hubs",          grad: "from-teal-500 to-cyan-600",   text: "text-white", sub2: "text-teal-100" },
          ].map(c => (
            <Link key={c.label} href={c.href}
              className={`rounded-2xl bg-gradient-to-br ${c.grad} p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${c.sub2}`}>{c.label}</p>
              <p className={`mt-1 text-xl font-bold ${c.text}`}>{c.value}</p>
              <p className={`mt-0.5 text-[10px] ${c.sub2}`}>{c.sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Users",        href: "/admin/users",        icon: "👥", primary: true },
          { label: "Auctions",     href: "/admin/auctions",     icon: "🔨", primary: true },
          { label: "Orders",       href: "/admin/orders",       icon: "📦", primary: false },
          { label: "QC Reports",   href: "/admin/qc-reports",   icon: "🔬", primary: false },
          { label: "Finance",      href: "/admin/finance",      icon: "💰", primary: false },
          { label: "Disputes",     href: "/admin/disputes",     icon: "⚖️",  primary: false },
          { label: "Hubs",         href: "/admin/hubs",         icon: "🏭", primary: false },
          { label: "Settings",     href: "/admin/settings",     icon: "⚙️",  primary: false },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              a.primary
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}>
            <span className="text-base leading-none">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className={`rounded-2xl border border-slate-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg}`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── User Breakdown + Lot Status ────────────────────────────────────── */}
      {userBreakdown && platformHealth && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* User Breakdown */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">User Breakdown</p>
              <Link href="/admin/users" className="text-xs font-semibold text-indigo-600 hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total",     value: userBreakdown.total,         color: "text-slate-900",   bg: "bg-slate-50" },
                { label: "Sellers",   value: userBreakdown.sellers,       color: "text-amber-700",   bg: "bg-amber-50" },
                { label: "Buyers",    value: userBreakdown.buyers,        color: "text-sky-700",     bg: "bg-sky-50" },
                { label: "New / Mo",  value: userBreakdown.newThisMonth,  color: "text-indigo-700",  bg: "bg-indigo-50" },
                { label: "Pending",   value: userBreakdown.pending,       color: "text-orange-700",  bg: "bg-orange-50" },
                { label: "Suspended", value: userBreakdown.suspended,     color: "text-red-600",     bg: "bg-red-50" },
              ].map(c => (
                <div key={c.label} className={`rounded-xl ${c.bg} p-3 text-center`}>
                  <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lot Status Breakdown */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Lot Status Breakdown</p>
              <Link href="/admin/auctions" className="text-xs font-semibold text-indigo-600 hover:underline">View all →</Link>
            </div>
            <div className="space-y-2">
              {[
                { key: "PENDING_DELIVERY", label: "Pending Delivery" },
                { key: "AT_HUB",           label: "At Hub" },
                { key: "IN_QC",            label: "In QC" },
                { key: "QC_SUBMITTED",     label: "QC Submitted" },
                { key: "QC_PASSED",        label: "QC Passed" },
                { key: "LIVE",             label: "Live Auction" },
                { key: "AUCTION_ENDED",    label: "Auction Ended" },
                { key: "QC_FAILED",        label: "QC Failed" },
              ]
                .filter(s => (platformHealth.lotBreakdown[s.key] ?? 0) > 0)
                .map(s => {
                  const count = platformHealth.lotBreakdown[s.key] ?? 0;
                  const total = Object.values(platformHealth.lotBreakdown).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className={`w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${lotStatusColors[s.key] ?? "bg-slate-100 text-slate-500"}`}>
                        {s.label}
                      </span>
                      <div className="flex-1 rounded-full bg-slate-100 h-2">
                        <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold text-slate-700">{count}</span>
                    </div>
                  );
                })
              }
              {Object.keys(platformHealth.lotBreakdown).length === 0 && (
                <p className="text-sm text-slate-400">No lots yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Hub Status ─────────────────────────────────────────────────────── */}
      {hubs.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">Hub Status</p>
            <Link href="/admin/hubs" className="text-xs font-semibold text-indigo-600 hover:underline">Manage hubs →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map(h => (
              <div key={h.id} className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{h.name}</p>
                  <p className="text-xs text-slate-400 truncate">{h.location}</p>
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${hubTypeColors[h.type] ?? "bg-slate-100 text-slate-600"}`}>
                    {hubTypeLabels[h.type] ?? h.type}
                  </span>
                </div>
                <div className="ml-3 text-right shrink-0">
                  <p className="text-lg font-bold text-slate-800">{h.lots}</p>
                  <p className="text-[10px] text-slate-400">lots</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Activity Tabs ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Tab header */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-5 pt-4">
          {(["orders", "users", "lots"] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveSection(tab)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                activeSection === tab
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              Recent {tab === "lots" ? "Auctions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div className="ml-auto pb-2">
            <Link href={activeSection === "orders" ? "/admin/orders" : activeSection === "users" ? "/admin/users" : "/admin/auctions"}
              className="text-xs font-semibold text-indigo-700 hover:underline">
              View all →
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        {activeSection === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Order</th>
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-left">Buyer</th>
                  <th className="px-5 py-3 text-left">Seller</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No orders yet</td></tr>
                ) : recentOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-mono text-xs text-indigo-600">{o.orderCode}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{o.product}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={o.buyer} size="sm" />
                        <span className="text-slate-600">{o.buyer}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{o.seller}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{fmtBDT(o.amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusColors[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Users */}
        {activeSection === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No users yet</td></tr>
                ) : recentUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <Link href={`/admin/users/${u.id}`} className="font-medium text-slate-900 hover:text-indigo-700 hover:underline">
                          {u.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleColors[u.role] ?? "bg-slate-100 text-slate-500"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[u.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {u.status.charAt(0) + u.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{u.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Lots */}
        {activeSection === "lots" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Lot Code</th>
                  <th className="px-5 py-3 text-left">Title</th>
                  <th className="px-5 py-3 text-left">Seller</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLots.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No lots yet</td></tr>
                ) : recentLots.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-mono text-xs text-indigo-600">{l.lotCode}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{l.title}</td>
                    <td className="px-5 py-4 text-slate-500">{l.seller}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lotStatusColors[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{l.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
