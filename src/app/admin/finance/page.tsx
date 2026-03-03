"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type SellerRevenue = { seller: string; revenue: number; orders: number };
type RecentOrder = {
  orderCode: string;
  lotCode: string;
  seller: string;
  buyer: string;
  product: string;
  amount: number;
  status: string;
  dispatched: boolean;
  date: string;
};

type PaymentReq = {
  id: string;
  paymentCode: string;
  sellerId: string | null;
  sellerName: string;
  amount: number;
  method: string;
  bankDetails: string | null;
  note: string | null;
  status: string;
  rejectedReason: string | null;
  transactionRef: string | null;
  processedBy: string | null;
  processedAt: string | null;
  requestedAt: string;
};

function fmtBDT(n: number) {
  if (n >= 10000000) return "৳ " + (n / 100000).toFixed(0) + " L";
  if (n >= 100000) return "৳ " + (n / 100000).toFixed(2) + " L";
  return "৳ " + n.toLocaleString("en-IN");
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-BD", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type SortKey = "seller" | "orders" | "revenue" | "avg";
type SortDir = "asc" | "desc";

function downloadCSV(orders: RecentOrder[]) {
  const header = "Order,Lot,Seller,Buyer,Product,Amount,Status,Date";
  const rows = orders.map((o) =>
    [o.orderCode, o.lotCode, o.seller, o.buyer, `"${o.product}"`, o.amount, o.dispatched ? "Dispatched" : "Confirmed", o.date].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `paikari-finance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPayoutCSV(rows: PayoutRow[]) {
  const header = "Seller,Total Orders,Dispatched Orders,Total Earned,Dispatched Revenue,Pending Revenue,Dispatch Rate";
  const csvRows = rows.map((r) =>
    [r.seller, r.totalOrders, r.dispatchedOrders, r.totalRevenue, r.dispatchedRevenue, r.pendingRevenue,
      r.totalOrders > 0 ? ((r.dispatchedOrders / r.totalOrders) * 100).toFixed(1) + "%" : "0%"].join(",")
  );
  const csv = [header, ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `paikari-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type PayoutRow = {
  seller: string;
  totalOrders: number;
  dispatchedOrders: number;
  totalRevenue: number;
  dispatchedRevenue: number;
  pendingRevenue: number;
};

const ORDER_FILTERS = ["All", "Confirmed", "Dispatched"];

export default function AdminFinancePage() {
  const [data, setData] = useState<{
    totalRevenue: number;
    monthRevenue: number;
    sellerRevenue: SellerRevenue[];
    recentOrders: RecentOrder[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "payouts" | "payments" | "history" | "orders">("overview");

  // Payment requests
  const [payments, setPayments] = useState<PaymentReq[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [paymentPage, setPaymentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState<PaymentReq | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [txnRef, setTxnRef] = useState("");
  const [showTxnInput, setShowTxnInput] = useState(false);

  // Seller table sort
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [sellerSearch, setSellerSearch] = useState("");

  // Order table search + filter + pagination
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");
  const [sellerFilter, setSellerFilter] = useState("All");
  const [orderPage, setOrderPage] = useState(1);

  // Payout sort
  const [payoutSort, setPayoutSort] = useState<"pendingRevenue" | "dispatchedRevenue" | "totalRevenue" | "seller">("pendingRevenue");
  const [payoutDir, setPayoutDir] = useState<SortDir>("desc");
  const [payoutSearch, setPayoutSearch] = useState("");

  // Date range filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch("/api/admin/finance")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        setData(d);
        setLastUpdated(new Date().toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(() => {
        setData({ totalRevenue: 0, monthRevenue: 0, sellerRevenue: [], recentOrders: [] });
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchData(); fetchPayments(); }, []);

  const fetchPayments = useCallback(() => {
    setPaymentsLoading(true);
    fetch("/api/admin/finance/payment-requests")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (Array.isArray(d)) setPayments(d); })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, []);

  const updatePaymentStatus = async (id: string, status: string, reason?: string, transactionRef?: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/finance/payment-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectedReason: reason, transactionRef }),
      });
      fetchPayments();
      if (showDetailModal?.id === id) {
        setShowDetailModal(null);
      }
    } catch { /* ignore */ }
    setActionLoading(false);
    setShowRejectInput(false);
    setRejectReason("");
    setShowTxnInput(false);
    setTxnRef("");
  };

  const deletePayment = async (id: string) => {
    if (!confirm("Delete this payment request?")) return;
    await fetch(`/api/admin/finance/payment-requests/${id}`, { method: "DELETE" });
    fetchPayments();
    if (showDetailModal?.id === id) setShowDetailModal(null);
  };

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentStatusFilter !== "All" && p.status !== paymentStatusFilter) return false;
      if (paymentSearch) {
        const q = paymentSearch.toLowerCase();
        return p.paymentCode.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q);
      }
      return true;
    });
  }, [payments, paymentSearch, paymentStatusFilter]);

  const paymentTotalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const paginatedPayments = filteredPayments.slice((paymentPage - 1) * PAGE_SIZE, paymentPage * PAGE_SIZE);

  // Payment stats
  const paymentStats = useMemo(() => {
    const pending = payments.filter((p) => p.status === "PENDING");
    const approved = payments.filter((p) => p.status === "APPROVED");
    const paid = payments.filter((p) => p.status === "PAID");
    const rejected = payments.filter((p) => p.status === "REJECTED");
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, p) => s + p.amount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((s, p) => s + p.amount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s, p) => s + p.amount, 0),
      rejectedCount: rejected.length,
      total: payments.length,
      totalAmount: payments.reduce((s, p) => s + p.amount, 0),
    };
  }, [payments]);

  // Payment history = paid + rejected
  const paymentHistory = useMemo(() => {
    return payments
      .filter((p) => p.status === "PAID" || p.status === "REJECTED")
      .sort((a, b) => new Date(b.processedAt || b.requestedAt).getTime() - new Date(a.processedAt || a.requestedAt).getTime());
  }, [payments]);

  // Payout tracker — per seller dispatched vs pending
  const payoutRows = useMemo((): PayoutRow[] => {
    if (!data) return [];
    const map: Record<string, PayoutRow> = {};
    for (const o of data.recentOrders) {
      if (!map[o.seller]) {
        map[o.seller] = { seller: o.seller, totalOrders: 0, dispatchedOrders: 0, totalRevenue: 0, dispatchedRevenue: 0, pendingRevenue: 0 };
      }
      map[o.seller].totalOrders++;
      map[o.seller].totalRevenue += o.amount;
      if (o.dispatched) {
        map[o.seller].dispatchedOrders++;
        map[o.seller].dispatchedRevenue += o.amount;
      } else {
        map[o.seller].pendingRevenue += o.amount;
      }
    }
    let rows = Object.values(map);
    if (payoutSearch) rows = rows.filter((r) => r.seller.toLowerCase().includes(payoutSearch.toLowerCase()));
    return [...rows].sort((a, b) => {
      const mul = payoutDir === "asc" ? 1 : -1;
      if (payoutSort === "seller") return a.seller.localeCompare(b.seller) * mul;
      return (a[payoutSort] - b[payoutSort]) * mul;
    });
  }, [data, payoutSort, payoutDir, payoutSearch]);

  const sortedSellers = useMemo(() => {
    if (!data) return [];
    let sellers = data.sellerRevenue;
    if (sellerSearch) sellers = sellers.filter((s) => s.seller.toLowerCase().includes(sellerSearch.toLowerCase()));
    return [...sellers].sort((a, b) => {
      const avgA = a.orders > 0 ? a.revenue / a.orders : 0;
      const avgB = b.orders > 0 ? b.revenue / b.orders : 0;
      if (sortKey === "avg") return sortDir === "asc" ? avgA - avgB : avgB - avgA;
      const va = a[sortKey as Exclude<SortKey, "avg">] ?? 0;
      const vb = b[sortKey as Exclude<SortKey, "avg">] ?? 0;
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [data, sortKey, sortDir, sellerSearch]);

  const sellerNames = useMemo(() => {
    if (!data) return ["All"];
    return ["All", ...Array.from(new Set(data.recentOrders.map((o) => o.seller))).sort()];
  }, [data]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return data.recentOrders.filter((o) => {
      const st = o.dispatched ? "Dispatched" : "Confirmed";
      if (orderFilter !== "All" && st !== orderFilter) return false;
      if (sellerFilter !== "All" && o.seller !== sellerFilter) return false;
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        if (
          !o.orderCode.toLowerCase().includes(q) &&
          !o.lotCode.toLowerCase().includes(q) &&
          !o.seller.toLowerCase().includes(q) &&
          !o.buyer.toLowerCase().includes(q) &&
          !o.product.toLowerCase().includes(q)
        ) return false;
      }
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });
  }, [data, orderSearch, orderFilter, sellerFilter, dateFrom, dateTo]);

  const orderTotalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE);
  const filteredTotal = filteredOrders.reduce((sum, o) => sum + o.amount, 0);

  const handleSortSeller = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handlePayoutSort = (key: typeof payoutSort) => {
    if (payoutSort === key) setPayoutDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setPayoutSort(key); setPayoutDir("desc"); }
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : " ⇅";

  const payoutArrow = (key: typeof payoutSort) =>
    payoutSort === key ? (payoutDir === "asc" ? " ↑" : " ↓") : " ⇅";

  // Derived metrics
  const dispatchedRevenue = data?.recentOrders.filter((o) => o.dispatched).reduce((s, o) => s + o.amount, 0) ?? 0;
  const pendingRevenue = data?.recentOrders.filter((o) => !o.dispatched).reduce((s, o) => s + o.amount, 0) ?? 0;
  const totalFromOrders = dispatchedRevenue + pendingRevenue;
  const avgOrderValue = data && data.recentOrders.length > 0 ? totalFromOrders / data.recentOrders.length : 0;
  const dispatchedCount = data?.recentOrders.filter((o) => o.dispatched).length ?? 0;
  const dispatchPct = data && data.recentOrders.length > 0
    ? Math.round((dispatchedCount / data.recentOrders.length) * 100) : 0;
  const totalPendingPayout = payoutRows.reduce((s, r) => s + r.pendingRevenue, 0);

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "payouts", label: "Payout Tracker" },
    { key: "payments", label: `Payment Requests${paymentStats.pendingCount ? ` (${paymentStats.pendingCount})` : ""}` },
    { key: "history", label: "Payment History" },
    { key: "orders", label: "Orders" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Revenue &amp; Payouts</h1>
          <p className="text-slate-500 text-sm">
            Platform-wide financial overview.
            {lastUpdated && <span className="ml-2 text-slate-400 text-xs">Last updated {lastUpdated}</span>}
          </p>
        </div>
        <button type="button" onClick={() => fetchData(true)} disabled={refreshing}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
          {refreshing ? "…" : "↻ Refresh"}
        </button>
      </div>

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : (
        <>
          {/* 6 Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">All-Time Revenue</p>
              <p className="mt-2 text-2xl font-bold text-indigo-700">{fmtBDT(data!.totalRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">This Month</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{fmtBDT(data!.monthRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Dispatched Rev.</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{fmtBDT(dispatchedRevenue)}</p>
              <p className="mt-1 text-[11px] text-emerald-500">{dispatchPct}% of orders</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Pending Payout</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{fmtBDT(totalPendingPayout)}</p>
              <p className="mt-1 text-[11px] text-amber-500">Not yet dispatched</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Orders</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{data!.recentOrders.length}</p>
              <p className="mt-1 text-[11px] text-slate-400">{data!.sellerRevenue.length} sellers</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm xl:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">Avg Order Value</p>
              <p className="mt-2 text-2xl font-bold text-violet-700">{fmtBDT(Math.round(avgOrderValue))}</p>
            </div>
          </div>

          {/* Revenue split bar */}
          {totalFromOrders > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Revenue Split (Recent Orders)</p>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />Dispatched {fmtBDT(dispatchedRevenue)}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />Pending {fmtBDT(pendingRevenue)}</span>
                </div>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(dispatchedRevenue / totalFromOrders) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${(pendingRevenue / totalFromOrders) * 100}%` }} />
              </div>
              <div className="mt-2 flex gap-6 text-xs text-slate-400">
                <span>{dispatchPct}% dispatched</span>
                <span>{100 - dispatchPct}% pending</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-100">
            {TABS.map((t) => (
              <button key={t.key} type="button"
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px ${
                  activeTab === t.key
                    ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB: Overview — seller breakdown */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Seller Revenue Breakdown</p>
                <input type="text" placeholder="Search seller…" value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 ring-indigo-100 w-48" />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left w-8">#</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handleSortSeller("seller")}>Seller{sortArrow("seller")}</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handleSortSeller("orders")}>Orders{sortArrow("orders")}</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handleSortSeller("revenue")}>Total Revenue{sortArrow("revenue")}</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handleSortSeller("avg")}>Avg/Order{sortArrow("avg")}</th>
                      <th className="px-5 py-3 text-left">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedSellers.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No sellers found.</td></tr>
                    )}
                    {sortedSellers.map((s, idx) => {
                      const pct = data!.totalRevenue > 0 ? ((s.revenue / data!.totalRevenue) * 100).toFixed(1) : "0";
                      const avg = s.orders > 0 ? Math.round(s.revenue / s.orders) : 0;
                      return (
                        <tr key={s.seller} className="hover:bg-indigo-50/30">
                          <td className="px-5 py-4 text-xs font-bold text-slate-300">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-900">{s.seller}</td>
                          <td className="px-5 py-4 text-slate-500">{s.orders}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(s.revenue)}</td>
                          <td className="px-5 py-4 text-slate-500">{fmtBDT(avg)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Payout Tracker */}
          {activeTab === "payouts" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Per-Seller Payout Tracker</p>
                  <p className="text-xs text-slate-400 mt-0.5">Based on recent orders. Pending = not yet dispatched.</p>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Search seller…" value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 ring-indigo-100 w-40" />
                  <button type="button" onClick={() => downloadPayoutCSV(payoutRows)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                    ↓ Export CSV
                  </button>
                </div>
              </div>

              {/* Payout summary banner */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-emerald-500">Dispatched (Earned)</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{fmtBDT(dispatchedRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-amber-500">Pending Payout</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">{fmtBDT(totalPendingPayout)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Sellers with Pending</p>
                  <p className="mt-1 text-xl font-bold text-slate-700">{payoutRows.filter((r) => r.pendingRevenue > 0).length}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handlePayoutSort("seller")}>Seller{payoutArrow("seller")}</th>
                      <th className="px-5 py-3 text-left">Orders</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handlePayoutSort("totalRevenue")}>Total Earned{payoutArrow("totalRevenue")}</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handlePayoutSort("dispatchedRevenue")}>Dispatched{payoutArrow("dispatchedRevenue")}</th>
                      <th className="px-5 py-3 text-left cursor-pointer select-none hover:text-slate-600"
                        onClick={() => handlePayoutSort("pendingRevenue")}>Pending Payout{payoutArrow("pendingRevenue")}</th>
                      <th className="px-5 py-3 text-left">Dispatch Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payoutRows.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No data.</td></tr>
                    )}
                    {payoutRows.map((r) => {
                      const rate = r.totalOrders > 0 ? Math.round((r.dispatchedOrders / r.totalOrders) * 100) : 0;
                      return (
                        <tr key={r.seller} className="hover:bg-amber-50/30">
                          <td className="px-5 py-4 font-medium text-slate-900">{r.seller}</td>
                          <td className="px-5 py-4 text-slate-500">
                            <span className="text-emerald-600 font-semibold">{r.dispatchedOrders}</span>
                            <span className="text-slate-400"> / {r.totalOrders}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(r.totalRevenue)}</td>
                          <td className="px-5 py-4 text-emerald-700 font-semibold">{fmtBDT(r.dispatchedRevenue)}</td>
                          <td className="px-5 py-4">
                            <span className={`font-semibold ${r.pendingRevenue > 0 ? "text-amber-600" : "text-slate-400"}`}>
                              {fmtBDT(r.pendingRevenue)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Payment Requests */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              {/* Detail Modal */}
              {showDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{showDetailModal.paymentCode}</h3>
                        <p className="text-xs text-slate-400">Requested {fmtDateTime(showDetailModal.requestedAt)}</p>
                      </div>
                      <button type="button" onClick={() => { setShowDetailModal(null); setShowRejectInput(false); setRejectReason(""); setShowTxnInput(false); setTxnRef(""); }}
                        className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-400 uppercase">Amount</p>
                        <p className="text-2xl font-bold text-indigo-700">{fmtBDT(showDetailModal.amount)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        showDetailModal.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                        showDetailModal.status === "APPROVED" ? "bg-blue-50 text-blue-700" :
                        showDetailModal.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                        "bg-red-50 text-red-700"
                      }`}>{showDetailModal.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Seller</p>
                        <p className="text-sm font-medium text-slate-900">{showDetailModal.sellerName}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Method</p>
                        <p className="text-sm font-medium text-slate-900">{showDetailModal.method}</p>
                      </div>
                      {showDetailModal.bankDetails && (
                        <div className="rounded-xl bg-slate-50 p-3 col-span-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Bank / Mobile Details</p>
                          <p className="text-sm text-slate-700">{showDetailModal.bankDetails}</p>
                        </div>
                      )}
                      {showDetailModal.note && (
                        <div className="rounded-xl bg-slate-50 p-3 col-span-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Note</p>
                          <p className="text-sm text-slate-700">{showDetailModal.note}</p>
                        </div>
                      )}
                      {showDetailModal.processedBy && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Processed By</p>
                          <p className="text-sm text-slate-700">{showDetailModal.processedBy}</p>
                        </div>
                      )}
                      {showDetailModal.processedAt && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Processed At</p>
                          <p className="text-sm text-slate-700">{fmtDateTime(showDetailModal.processedAt)}</p>
                        </div>
                      )}
                      {showDetailModal.rejectedReason && (
                        <div className="rounded-xl bg-red-50 p-3 col-span-2">
                          <p className="text-[10px] font-semibold text-red-400 uppercase">Rejection Reason</p>
                          <p className="text-sm text-red-700">{showDetailModal.rejectedReason}</p>
                        </div>
                      )}
                      {showDetailModal.transactionRef && (
                        <div className="rounded-xl bg-emerald-50 p-3 col-span-2">
                          <p className="text-[10px] font-semibold text-emerald-400 uppercase">Transaction Reference</p>
                          <p className="text-sm font-medium text-emerald-700">{showDetailModal.transactionRef}</p>
                        </div>
                      )}
                    </div>

                    {/* Transaction ref input for marking as paid */}
                    {showTxnInput && (
                      <div className="space-y-2">
                        <input type="text" value={txnRef} onChange={(e) => setTxnRef(e.target.value)}
                          placeholder="Bank transaction reference number…"
                          className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-emerald-100" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updatePaymentStatus(showDetailModal.id, "PAID", undefined, txnRef)}
                            disabled={actionLoading}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                            {actionLoading ? "…" : "Confirm Payment"}
                          </button>
                          <button type="button" onClick={() => { setShowTxnInput(false); setTxnRef(""); }}
                            className="text-xs text-slate-500 hover:underline">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Reject reason input */}
                    {showRejectInput && (
                      <div className="space-y-2">
                        <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection…"
                          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-red-100" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updatePaymentStatus(showDetailModal.id, "REJECTED", rejectReason)}
                            disabled={actionLoading}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition">
                            {actionLoading ? "…" : "Confirm Reject"}
                          </button>
                          <button type="button" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                            className="text-xs text-slate-500 hover:underline">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {showDetailModal.status === "PENDING" && !showRejectInput && !showTxnInput && (
                        <>
                          <button type="button" onClick={() => updatePaymentStatus(showDetailModal.id, "APPROVED")}
                            disabled={actionLoading}
                            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                            {actionLoading ? "…" : "Approve"}
                          </button>
                          <button type="button" onClick={() => setShowRejectInput(true)}
                            className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition">Reject</button>
                        </>
                      )}
                      {showDetailModal.status === "APPROVED" && !showTxnInput && (
                        <button type="button" onClick={() => { setShowTxnInput(true); setTxnRef(""); }}
                          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                          Mark as Paid
                        </button>
                      )}
                      <button type="button" onClick={() => deletePayment(showDetailModal.id)}
                        className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-200 transition">Delete</button>
                      <button type="button" onClick={() => { setShowDetailModal(null); setShowRejectInput(false); setShowTxnInput(false); setTxnRef(""); }}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Close</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Payment Requests Management</p>
                  <p className="text-xs text-slate-400 mt-0.5">Review, approve, reject, and track seller payment requests.</p>
                </div>
                <button type="button" onClick={fetchPayments}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">↻ Refresh</button>
              </div>

              {/* Stat cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-amber-500">Pending</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">{paymentStats.pendingCount}</p>
                  <p className="text-xs text-amber-500">{fmtBDT(paymentStats.pendingAmount)}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-blue-500">Approved</p>
                  <p className="mt-1 text-xl font-bold text-blue-700">{paymentStats.approvedCount}</p>
                  <p className="text-xs text-blue-500">{fmtBDT(paymentStats.approvedAmount)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-emerald-500">Paid</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{paymentStats.paidCount}</p>
                  <p className="text-xs text-emerald-500">{fmtBDT(paymentStats.paidAmount)}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-red-400">Rejected</p>
                  <p className="mt-1 text-xl font-bold text-red-700">{paymentStats.rejectedCount}</p>
                  <p className="text-xs text-red-400">of {paymentStats.total} total</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Search payment code, seller, method…" value={paymentSearch}
                  onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
                  className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 ring-indigo-100" />
                {["All", "PENDING", "APPROVED", "PAID", "REJECTED"].map((f) => (
                  <button key={f} type="button" onClick={() => { setPaymentStatusFilter(f); setPaymentPage(1); }}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                      paymentStatusFilter === f
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>{f === "All" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}</button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Code</th>
                      <th className="px-5 py-3 text-left">Seller</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">Method</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Requested</th>
                      <th className="px-5 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paymentsLoading && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
                    )}
                    {!paymentsLoading && paginatedPayments.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No payment requests found.</td></tr>
                    )}
                    {!paymentsLoading && paginatedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-indigo-50/20 cursor-pointer" onClick={() => setShowDetailModal(p)}>
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">{p.paymentCode}</td>
                        <td className="px-5 py-4 font-medium text-slate-900">{p.sellerName}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(p.amount)}</td>
                        <td className="px-5 py-4 text-slate-500">{p.method}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            p.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                            p.status === "APPROVED" ? "bg-blue-50 text-blue-700" :
                            p.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                            "bg-red-50 text-red-700"
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{fmtDate(p.requestedAt)}</td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {p.status === "PENDING" && (
                              <>
                                <button type="button" onClick={() => updatePaymentStatus(p.id, "APPROVED")}
                                  className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition">Approve</button>
                                <button type="button" onClick={() => { setShowDetailModal(p); setShowRejectInput(true); }}
                                  className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition">Reject</button>
                              </>
                            )}
                            {p.status === "APPROVED" && (
                              <button type="button" onClick={() => { setShowDetailModal(p); setShowTxnInput(true); setTxnRef(""); }}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">Mark Paid</button>
                            )}
                            <button type="button" onClick={() => setShowDetailModal(p)}
                              className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition">View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={paymentPage} totalPages={paymentTotalPages} onPageChange={setPaymentPage} className="mt-2" />
            </div>
          )}

          {/* TAB: Payment History */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Payment History</p>
                  <p className="text-xs text-slate-400 mt-0.5">Completed and rejected payments.</p>
                </div>
                <p className="text-xs text-slate-500">
                  {paymentHistory.length} records · Total paid: <span className="font-semibold text-emerald-700">{fmtBDT(paymentStats.paidAmount)}</span>
                </p>
              </div>

              {/* History summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-emerald-500">Total Paid</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{fmtBDT(paymentStats.paidAmount)}</p>
                  <p className="text-xs text-emerald-500">{paymentStats.paidCount} payments</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-red-400">Total Rejected</p>
                  <p className="mt-1 text-xl font-bold text-red-700">{paymentStats.rejectedCount}</p>
                  <p className="text-xs text-red-400">requests</p>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-indigo-400">All-Time Requests</p>
                  <p className="mt-1 text-xl font-bold text-indigo-700">{paymentStats.total}</p>
                  <p className="text-xs text-indigo-400">{fmtBDT(paymentStats.totalAmount)} total</p>
                </div>
              </div>

              {/* History table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Code</th>
                      <th className="px-5 py-3 text-left">Seller</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">Method</th>
                      <th className="px-5 py-3 text-left">Result</th>
                      <th className="px-5 py-3 text-left">Processed By</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paymentHistory.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No payment history yet. Complete or reject a payment request to see it here.</td></tr>
                    )}
                    {paymentHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setShowDetailModal(p)}>
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">{p.paymentCode}</td>
                        <td className="px-5 py-4 font-medium text-slate-900">{p.sellerName}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(p.amount)}</td>
                        <td className="px-5 py-4 text-slate-500">{p.method}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            p.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>{p.status === "PAID" ? "Paid" : "Rejected"}</span>
                          {p.rejectedReason && (
                            <p className="text-[11px] text-red-500 mt-0.5">{p.rejectedReason}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{p.processedBy || "—"}</td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{p.processedAt ? fmtDate(p.processedAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Orders */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Orders
                  {filteredOrders.length !== data!.recentOrders.length &&
                    ` · ${filteredOrders.length} filtered · ${fmtBDT(filteredTotal)}`}
                </p>
                <button type="button" onClick={() => downloadCSV(filteredOrders)}
                  className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                  ↓ Export CSV ({filteredOrders.length})
                </button>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Search order, lot, seller, buyer, product…" value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                  className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2" />
                <select value={sellerFilter} onChange={(e) => { setSellerFilter(e.target.value); setOrderPage(1); }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 ring-indigo-100 bg-white">
                  {sellerNames.map((s) => <option key={s} value={s}>{s === "All" ? "All Sellers" : s}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                  {ORDER_FILTERS.map((f) => (
                    <button key={f} type="button" onClick={() => { setOrderFilter(f); setOrderPage(1); }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                        orderFilter === f
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>{f}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="text-xs">From</span>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setOrderPage(1); }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400" />
                  <span className="text-xs">To</span>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setOrderPage(1); }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400" />
                  {(dateFrom || dateTo) && (
                    <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setOrderPage(1); }}
                      className="text-xs text-red-500 hover:underline">Clear</button>
                  )}
                </div>
                {(orderSearch || orderFilter !== "All" || sellerFilter !== "All" || dateFrom || dateTo) && (
                  <button type="button"
                    onClick={() => { setOrderSearch(""); setOrderFilter("All"); setSellerFilter("All"); setDateFrom(""); setDateTo(""); setOrderPage(1); }}
                    className="text-xs font-semibold text-red-500 hover:underline">Clear all</button>
                )}
              </div>

              {filteredOrders.length > 0 && (
                <p className="text-xs text-slate-400">
                  Showing {filteredOrders.length} orders · Revenue: <span className="font-semibold text-slate-700">{fmtBDT(filteredTotal)}</span>
                  {" "}· Dispatched: <span className="font-semibold text-emerald-700">{fmtBDT(filteredOrders.filter(o => o.dispatched).reduce((s, o) => s + o.amount, 0))}</span>
                  {" "}· Pending: <span className="font-semibold text-amber-600">{fmtBDT(filteredOrders.filter(o => !o.dispatched).reduce((s, o) => s + o.amount, 0))}</span>
                </p>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Order / Lot</th>
                      <th className="px-5 py-3 text-left">Product</th>
                      <th className="px-5 py-3 text-left">Seller</th>
                      <th className="px-5 py-3 text-left">Buyer</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedOrders.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No orders match your filters.</td></tr>
                    )}
                    {paginatedOrders.map((o) => (
                      <tr key={o.orderCode} className="hover:bg-indigo-50/20">
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-semibold text-slate-600">{o.orderCode}</p>
                          <p className="text-[11px] text-slate-400">{o.lotCode}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{o.product}</td>
                        <td className="px-5 py-4 text-slate-700">{o.seller}</td>
                        <td className="px-5 py-4 text-slate-500">{o.buyer}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(o.amount)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.dispatched ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                            {o.dispatched ? "Dispatched" : "Confirmed"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={orderPage} totalPages={orderTotalPages} onPageChange={setOrderPage} className="mt-2" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

