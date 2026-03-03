"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type Order = {
  id: string;
  orderCode: string;
  product: string;
  qty: string;
  buyer: string;
  seller: string;
  amount: number;
  hub: string;
  deliveryPoint: string;
  status: string;
  dispatched: boolean;
  confirmedAt: string;
};

type SortField = "amount" | "confirmedAt" | null;
type SortDir = "asc" | "desc";

function fmtBDT(n: number) {
  return "৳ " + n.toLocaleString("en-IN");
}

function deriveStatus(o: Order) {
  if (o.dispatched) return "Dispatched";
  if (o.status === "CONFIRMED") return "Confirmed";
  return o.status;
}

const statusColors: Record<string, string> = {
  Confirmed: "bg-blue-50 text-blue-700",
  Dispatched: "bg-emerald-50 text-emerald-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
};

const FILTERS = ["All", "Confirmed", "Dispatched"];

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block text-[10px] ${active ? "text-indigo-600" : "text-slate-300"}`}>
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

function StatusTimeline({ dispatched }: { dispatched: boolean }) {
  const steps = ["Order Placed", "Confirmed", "Dispatched"];
  const currentStep = dispatched ? 2 : 1;
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold
              ${i <= currentStep ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              {i <= currentStep ? "✓" : i + 1}
            </div>
            <span className={`mt-1 text-[10px] whitespace-nowrap ${i <= currentStep ? "text-indigo-700 font-semibold" : "text-slate-400"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-10 mx-1 mb-4 ${i < currentStep ? "bg-indigo-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onDispatch, acting }: {
  order: Order; onClose: () => void; onDispatch: (id: string) => void; acting: boolean;
}) {
  const st = deriveStatus(order);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Order {order.orderCode}</h2>
            <p className="text-xs text-slate-400">Confirmed {order.confirmedAt}</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Timeline */}
        <div className="mb-5 flex justify-center">
          <StatusTimeline dispatched={order.dispatched} />
        </div>

        <div className="space-y-4">
          {/* Amount highlight */}
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-indigo-700">{fmtBDT(order.amount)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[st] ?? "bg-slate-100 text-slate-500"}`}>{st}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Product</p>
              <p className="text-sm font-medium text-slate-900">{order.product}</p>
              <p className="text-xs text-slate-500">Qty: {order.qty}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Order Date</p>
              <p className="text-sm font-medium text-slate-900">{order.confirmedAt}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Buyer</p>
              <p className="text-sm font-medium text-slate-900">{order.buyer}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Seller</p>
              <p className="text-sm font-medium text-slate-900">{order.seller}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Hub</p>
              <p className="text-sm font-medium text-slate-900">{order.hub || "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Delivery Point</p>
              <p className="text-sm font-medium text-slate-900">{order.deliveryPoint || "—"}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {!order.dispatched && (
              <button type="button" disabled={acting} onClick={() => onDispatch(order.id)}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                {acting ? "Dispatching…" : "✓ Mark as Dispatched"}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadOrdersCSV(orders: Order[]) {
  const header = "Order ID,Product,Qty,Buyer,Seller,Amount,Hub,Delivery Point,Status,Date";
  const rows = orders.map((o) =>
    [o.orderCode, `"${o.product}"`, o.qty, o.buyer, o.seller, o.amount, o.hub, o.deliveryPoint, deriveStatus(o), o.confirmedAt].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `paikari-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [hubFilter, setHubFilter] = useState("All");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [acting, setActing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchOrders = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLastUpdated(new Date().toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" }));
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDispatch = async (id: string) => {
    setActing(true);
    try {
      await fetch(`/api/admin/orders/${id}/dispatch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatched: true }),
      });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, dispatched: true } : o));
      if (selectedOrder?.id === id) {
        setSelectedOrder((prev) => prev ? { ...prev, dispatched: true } : prev);
      }
    } catch { /* ignore */ }
    setActing(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  };

  const hubs = useMemo(() => {
    const set = new Set(orders.map((o) => o.hub).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders.filter((o) => {
      const st = deriveStatus(o);
      const matchFilter = filter === "All" || st === filter;
      const matchHub = hubFilter === "All" || o.hub === hubFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.buyer.toLowerCase().includes(q) ||
        o.seller.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q) ||
        (o.deliveryPoint || "").toLowerCase().includes(q);
      return matchFilter && matchHub && matchSearch;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortField === "amount") return (a.amount - b.amount) * mul;
        return a.confirmedAt.localeCompare(b.confirmedAt) * mul;
      });
    }
    return result;
  }, [orders, filter, hubFilter, search, sortField, sortDir]);

  const confirmedCount = orders.filter((o) => !o.dispatched).length;
  const dispatchedCount = orders.filter((o) => o.dispatched).length;
  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  const pendingDispatchRevenue = orders.filter((o) => !o.dispatched).reduce((s, o) => s + o.amount, 0);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)}
          onDispatch={handleDispatch} acting={acting} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">All Orders</h1>
          <p className="text-slate-500 text-sm">
            {loading ? "Loading…" : `${orders.length} total orders across all hubs.`}
            {lastUpdated && <span className="ml-2 text-slate-400 text-xs">Last updated {lastUpdated}</span>}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button type="button" onClick={() => downloadOrdersCSV(filtered)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            ↓ Export CSV ({filtered.length})
          </button>
          <button type="button" onClick={() => fetchOrders(true)} disabled={refreshing}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
            {refreshing ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 p-5 shadow-sm bg-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{orders.length}</p>
            <p className="mt-1 text-xs text-slate-400">All time</p>
          </div>
          <div className="rounded-2xl border border-blue-100 p-5 shadow-sm bg-blue-50">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Awaiting Dispatch</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{confirmedCount}</p>
            <p className="mt-1 text-xs text-blue-400">{fmtBDT(pendingDispatchRevenue)} pending</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 p-5 shadow-sm bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Dispatched</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{dispatchedCount}</p>
            <p className="mt-1 text-xs text-emerald-500">
              {orders.length > 0 ? Math.round((dispatchedCount / orders.length) * 100) : 0}% completed
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100 p-5 shadow-sm bg-indigo-50">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Total Revenue</p>
            <p className="mt-2 text-2xl font-bold text-indigo-700">{fmtBDT(totalRevenue)}</p>
            <p className="mt-1 text-xs text-indigo-400">Across all orders</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search order, buyer, seller, delivery point…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-indigo-100 focus:ring-2"
        />
        {/* Hub filter */}
        <select
          value={hubFilter}
          onChange={(e) => { setHubFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 ring-indigo-100 bg-white"
        >
          {hubs.map((h) => <option key={h} value={h}>{h === "All" ? "All Hubs" : `Hub: ${h}`}</option>)}
        </select>
        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                filter === f
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
              {f !== "All" && (
                <span className="ml-1.5 opacity-70">
                  ({orders.filter((o) => deriveStatus(o) === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
        {(search || filter !== "All" || hubFilter !== "All") && (
          <button type="button"
            onClick={() => { setSearch(""); setFilter("All"); setHubFilter("All"); setPage(1); }}
            className="text-xs font-semibold text-red-500 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Filtered count */}
      {!loading && (
        <p className="text-xs text-slate-400 -mt-4">
          Showing {filtered.length} of {orders.length} orders
          {filtered.length > 0 && (
            <span className="ml-2 font-semibold text-slate-600">
              · Total: {fmtBDT(filtered.reduce((s, o) => s + o.amount, 0))}
            </span>
          )}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 text-left">Order ID</th>
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-left">Buyer</th>
              <th className="px-5 py-3 text-left">Seller</th>
              <th className="px-5 py-3 text-left cursor-pointer hover:text-slate-600 select-none"
                onClick={() => handleSort("amount")}>
                Amount <SortIcon field="amount" active={sortField === "amount"} dir={sortDir} />
              </th>
              <th className="px-5 py-3 text-left">Hub</th>
              <th className="px-5 py-3 text-left">Delivery Point</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left cursor-pointer hover:text-slate-600 select-none"
                onClick={() => handleSort("confirmedAt")}>
                Date <SortIcon field="confirmedAt" active={sortField === "confirmedAt"} dir={sortDir} />
              </th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-slate-400">Loading orders…</td>
              </tr>
            ) : paginated.map((o) => {
              const st = deriveStatus(o);
              return (
                <tr key={o.id} className="hover:bg-indigo-50/30 cursor-pointer transition-colors" onClick={() => setSelectedOrder(o)}>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{o.orderCode}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{o.product}</p>
                    <p className="text-xs text-slate-400">Qty: {o.qty}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{o.buyer}</td>
                  <td className="px-5 py-4 text-slate-500">{o.seller}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{fmtBDT(o.amount)}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{o.hub || "—"}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{o.deliveryPoint || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[st] ?? "bg-slate-100 text-slate-500"}`}>{st}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{o.confirmedAt}</td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {!o.dispatched && (
                        <button type="button" onClick={() => handleDispatch(o.id)}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                          Dispatch
                        </button>
                      )}
                      <button type="button" onClick={() => setSelectedOrder(o)}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-slate-400">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
