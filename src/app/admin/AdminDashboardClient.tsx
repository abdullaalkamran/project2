"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type StatItem = {
  label: string;
  value: string;
  sub: string;
  href: string;
  color: string;
  bg: string;
};

type Revenue = {
  thisMonth: number;
  lastMonth: number;
  growth: number;
};

type UserBreakdown = {
  total: number;
  suspended: number;
  pending: number;
  newThisMonth: number;
};

type RecentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
};

type RecentLot = {
  id: string;
  title: string;
  seller: string;
  status: string;
  createdAt: string;
};

type RecentOrder = {
  id: string;
  orderCode: string;
  buyer: string;
  seller: string;
  product: string;
  amount: number;
  status: string;
  date: string;
};

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
  QC_SUBMITTED: "bg-orange-50 text-orange-600",
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
};

function fmtBDT(n: number) {
  return "৳ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function Avatar({ name }: { name: string }) {
  const palette = [
    "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-sky-500", "bg-violet-500", "bg-teal-500", "bg-orange-500",
  ];
  const idx = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${palette[idx]}`}>
      {initials}
    </span>
  );
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [userBreakdown, setUserBreakdown] = useState<UserBreakdown | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentLots, setRecentLots] = useState<RecentLot[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState<"users" | "lots" | "orders">("orders");

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    api
      .get<{
        stats: StatItem[];
        revenue: Revenue;
        userBreakdown: UserBreakdown;
        recentUsers: RecentUser[];
        recentLots: RecentLot[];
        recentOrders: RecentOrder[];
      }>("/api/admin/overview")
      .then((data) => {
        setStats(data.stats);
        setRevenue(data.revenue);
        setUserBreakdown(data.userBreakdown);
        setRecentUsers(data.recentUsers);
        setRecentLots(data.recentLots);
        setRecentOrders(data.recentOrders);
        setLastUpdated(new Date());
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const alerts = [
    userBreakdown && userBreakdown.pending > 0
      ? { type: "warn", msg: `${userBreakdown.pending} account${userBreakdown.pending > 1 ? "s" : ""} pending approval`, href: "/admin/users" }
      : null,
    stats.find((s) => s.label === "Open Disputes" && parseInt(s.value) > 0)
      ? { type: "error", msg: `${stats.find((s) => s.label === "Open Disputes")?.value} open dispute${parseInt(stats.find((s) => s.label === "Open Disputes")?.value ?? "0") > 1 ? "s" : ""} need attention`, href: "/admin/disputes" }
      : null,
    stats.find((s) => s.label === "QC Pending" && parseInt(s.value) > 0)
      ? { type: "info", msg: `${stats.find((s) => s.label === "QC Pending")?.value} lots awaiting QC inspection`, href: "/admin/qc-reports" }
      : null,
  ].filter(Boolean) as { type: string; msg: string; href: string }[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">Platform-wide health at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-90 ${
              a.type === "error" ? "bg-red-50 text-red-700 border border-red-100"
              : a.type === "warn" ? "bg-amber-50 text-amber-700 border border-amber-100"
              : "bg-sky-50 text-sky-700 border border-sky-100"
            }`}>
              <span className="text-base">
                {a.type === "error" ? "⚠️" : a.type === "warn" ? "🔔" : "ℹ️"}
              </span>
              {a.msg}
              <span className="ml-auto text-xs opacity-60">View →</span>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Manage Users", href: "/admin/users", primary: true },
          { label: "Auction Control", href: "/admin/auctions", primary: true },
          { label: "QC Reports", href: "/admin/qc-reports", primary: false },
          { label: "Finance", href: "/admin/finance", primary: false },
          { label: "Disputes", href: "/admin/disputes", primary: false },
          { label: "Settings", href: "/admin/settings", primary: false },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              a.primary
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {/* Revenue + User Breakdown Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Card */}
        {revenue && (
          <div className="col-span-1 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
              Revenue This Month
            </p>
            <p className="mt-2 text-3xl font-bold">{fmtBDT(revenue.thisMonth)}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${revenue.growth >= 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
                {revenue.growth >= 0 ? "+" : ""}{revenue.growth}%
              </span>
              <span className="text-xs text-indigo-200">vs last month ({fmtBDT(revenue.lastMonth)})</span>
            </div>
            <Link href="/admin/finance" className="mt-4 inline-block text-xs text-indigo-200 hover:text-white hover:underline">
              View Finance →
            </Link>
          </div>
        )}

        {/* User Breakdown */}
        {userBreakdown && (
          <div className="col-span-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Users", value: userBreakdown.total, color: "text-slate-900", bg: "bg-white border border-slate-100" },
              { label: "New This Month", value: userBreakdown.newThisMonth, color: "text-indigo-700", bg: "bg-indigo-50" },
              { label: "Pending", value: userBreakdown.pending, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Suspended", value: userBreakdown.suspended, color: "text-red-600", bg: "bg-red-50" },
            ].map((card) => (
              <Link key={card.label} href="/admin/users"
                className={`flex flex-col justify-between rounded-2xl p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.bg}`}>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl border border-slate-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.bg}`}
          >
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Activity Section with Tabs */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Tab Header */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-5 pt-4">
          {(["orders", "users", "lots"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                activeSection === tab
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Recent {tab === "lots" ? "Auctions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div className="ml-auto pb-2">
            <Link
              href={activeSection === "orders" ? "/admin/orders" : activeSection === "users" ? "/admin/users" : "/admin/auctions"}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
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
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">No orders yet</td>
                  </tr>
                ) : recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{o.orderCode}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{o.product}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={o.buyer} />
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
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">No users yet</td>
                  </tr>
                ) : recentUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50 transition">
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
                        {u.status}
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
                  <th className="px-5 py-3 text-left">Lot ID</th>
                  <th className="px-5 py-3 text-left">Title</th>
                  <th className="px-5 py-3 text-left">Seller</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">No lots yet</td>
                  </tr>
                ) : recentLots.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{l.id}</td>
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
