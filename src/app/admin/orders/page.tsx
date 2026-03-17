"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, Download, ChevronDown, ChevronUp,
  ShoppingCart, Truck, PackageCheck, Clock, CheckCircle2,
  Building2, MapPin, Package, DollarSign, Tag, Zap,
} from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 12;

type Order = {
  id: string;
  orderCode: string;
  lotCode: string;
  product: string;
  qty: string;
  freeQty: number;
  buyer: string;
  seller: string;
  totalAmount: number;
  productAmount: number;
  transportCost: number;
  platformFee: number;
  sellerPayable: number;
  hub: string;
  deliveryPoint: string;
  status: string;
  dispatched: boolean;
  delivered: boolean;
  assignedTruck: string | null;
  confirmedAt: string;
  deliveredAt: string | null;
};

const STATUS_MAP: Record<string, { label: string; dot: string; badge: string }> = {
  CONFIRMED:        { label: "Confirmed",       dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  DISPATCHED:       { label: "Dispatched",      dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  HUB_RECEIVED:     { label: "Hub Received",    dot: "bg-sky-400",     badge: "bg-sky-50 text-sky-700 border-sky-200" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
  ARRIVED:          { label: "Arrived",         dot: "bg-teal-500",    badge: "bg-teal-50 text-teal-700 border-teal-200" },
  PICKED_UP:        { label: "Delivered",       dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DECLINED:         { label: "Declined",        dot: "bg-red-500",     badge: "bg-red-50 text-red-600 border-red-200" },
};

const FILTERS = [
  { key: "All",          match: () => true },
  { key: "Confirmed",    match: (s: string) => s === "CONFIRMED" },
  { key: "Dispatched",   match: (s: string) => s === "DISPATCHED" },
  { key: "In Transit",   match: (s: string) => ["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED"].includes(s) },
  { key: "Delivered",    match: (s: string) => s === "PICKED_UP" },
];

function fmtBDT(n: number) {
  if (n >= 100000) return "৳ " + (n / 100000).toFixed(1) + "L";
  return "৳ " + n.toLocaleString("en-IN");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
}

function downloadCSV(orders: Order[]) {
  const header = "Order,Lot,Product,Qty,Free Qty,Buyer,Seller,Amount,Hub,Delivery Point,Status,Truck,Date";
  const rows = orders.map((o) =>
    [
      o.orderCode, o.lotCode, `"${o.product}"`, o.qty, o.freeQty > 0 ? o.freeQty : "",
      o.buyer, o.seller, o.totalAmount, o.hub, o.deliveryPoint,
      STATUS_MAP[o.status]?.label ?? o.status,
      o.assignedTruck ?? "",
      fmtDate(o.confirmedAt),
    ].join(",")
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
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState("All");
  const [search, setSearch]       = useState("");
  const [hubFilter, setHubFilter] = useState("All");
  const [page, setPage]           = useState(1);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [acting, setActing]       = useState<string | null>(null);

  const load = (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  const handleDispatch = async (id: string) => {
    if (!confirm("Mark this order as dispatched?")) return;
    setActing(id);
    await fetch(`/api/admin/orders/${id}/dispatch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispatched: true }),
    });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "DISPATCHED", dispatched: true } : o));
    setActing(null);
  };

  // Counts per filter
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of FILTERS) c[f.key] = orders.filter((o) => f.match(o.status)).length;
    return c;
  }, [orders]);

  const hubs = useMemo(() => {
    const set = new Set(orders.map((o) => o.hub).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const f = FILTERS.find((f) => f.key === filter);
      if (f && !f.match(o.status)) return false;
      if (hubFilter !== "All" && o.hub !== hubFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.lotCode.toLowerCase().includes(q) ||
        o.buyer.toLowerCase().includes(q) ||
        o.seller.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q) ||
        (o.deliveryPoint || "").toLowerCase().includes(q)
      );
    });
  }, [orders, filter, hubFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalRevenue    = orders.reduce((s, o) => s + o.totalAmount, 0);
  const confirmedCount  = orders.filter((o) => o.status === "CONFIRMED").length;
  const dispatchedCount = orders.filter((o) => o.dispatched).length;
  const deliveredCount  = orders.filter((o) => o.delivered || o.status === "PICKED_UP").length;
  const dispatchRate    = orders.length > 0 ? Math.round((dispatchedCount / orders.length) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-900">All Orders</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading…" : `${orders.length} orders · ${fmtBDT(totalRevenue)} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadCSV(filtered)}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          >
            <Download size={14} />
            Export ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Total Orders",   value: orders.length,    Icon: ShoppingCart,  bg: "bg-white",        text: "text-slate-900",   border: "border-slate-100" },
          { label: "Awaiting Dispatch", value: confirmedCount, Icon: Clock,         bg: "bg-blue-50",      text: "text-blue-700",    border: "border-blue-100" },
          { label: "Dispatched",     value: dispatchedCount,  Icon: Truck,         bg: "bg-amber-50",     text: "text-amber-700",   border: "border-amber-100" },
          { label: "Delivered",      value: deliveredCount,   Icon: CheckCircle2,  bg: "bg-emerald-50",   text: "text-emerald-700", border: "border-emerald-100" },
          { label: "Total Revenue",  value: fmtBDT(totalRevenue), Icon: DollarSign, bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-100" },
        ].map(({ label, value, Icon, bg, text, border }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={text} />
              <span className={`text-xs font-semibold ${text} opacity-70`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold ${text}`}>
              {loading
                ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-current opacity-20" />
                : value}
            </p>
            {label === "Dispatched" && !loading && (
              <p className={`mt-0.5 text-xs ${text} opacity-60`}>{dispatchRate}% dispatch rate</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Search + filters ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order, lot, buyer, seller, point…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none ring-indigo-100 focus:ring-2"
          />
        </div>

        {hubs.length > 2 && (
          <select
            value={hubFilter}
            onChange={(e) => { setHubFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 ring-indigo-100"
          >
            {hubs.map((h) => <option key={h} value={h}>{h === "All" ? "All Hubs" : h}</option>)}
          </select>
        )}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                filter === f.key
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.key}
              {!loading && counts[f.key] > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === f.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {(search || filter !== "All" || hubFilter !== "All") && (
          <button
            type="button"
            onClick={() => { setSearch(""); setFilter("All"); setHubFilter("All"); setPage(1); }}
            className="text-xs font-semibold text-red-500 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Showing count + filtered revenue */}
      {!loading && (
        <p className="text-xs text-slate-400 -mt-2">
          Showing {filtered.length} of {orders.length} orders
          {filtered.length > 0 && (
            <span className="ml-2 font-semibold text-slate-600">
              · {fmtBDT(filtered.reduce((s, o) => s + o.totalAmount, 0))}
            </span>
          )}
        </p>
      )}

      {/* ── Order cards ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-14 text-center text-slate-400 shadow-sm">
          <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((o) => {
            const st = STATUS_MAP[o.status] ?? { label: o.status, dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border-slate-200" };
            const isOpen = expanded === o.id;

            return (
              <div
                key={o.id}
                className={`rounded-2xl border bg-white shadow-sm transition-all ${
                  isOpen ? "border-indigo-200 ring-1 ring-indigo-100" : "border-slate-100 hover:border-slate-200"
                }`}
              >
                {/* Card row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  onKeyDown={(e) => e.key === "Enter" && setExpanded(isOpen ? null : o.id)}
                  className="w-full cursor-pointer px-5 py-4"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

                    {/* Status dot + order code */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${st.dot}`} />
                      <span className="font-mono text-xs font-semibold text-slate-400">{o.orderCode}</span>
                    </div>

                    {/* Product */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-semibold text-slate-900 truncate max-w-[260px]">{o.product}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {o.qty}{o.freeQty > 0 ? ` + ${o.freeQty} free` : ""} · {o.lotCode}
                      </p>
                    </div>

                    {/* Buyer */}
                    <div className="hidden sm:flex flex-col min-w-[110px]">
                      <span className="text-xs text-slate-400">Buyer</span>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[130px]">{o.buyer}</span>
                    </div>

                    {/* Seller */}
                    <div className="hidden md:flex flex-col min-w-[110px]">
                      <span className="text-xs text-slate-400">Seller</span>
                      <span className="text-sm text-slate-600 truncate max-w-[130px]">{o.seller}</span>
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col min-w-[80px]">
                      <span className="text-xs text-slate-400">Amount</span>
                      <span className="text-sm font-bold text-slate-900">{fmtBDT(o.totalAmount)}</span>
                    </div>

                    {/* Delivery point */}
                    <div className="hidden lg:flex flex-col min-w-[100px]">
                      <span className="text-xs text-slate-400">Delivery Point</span>
                      <span className="text-xs text-slate-600 truncate max-w-[120px]">{o.deliveryPoint || "—"}</span>
                    </div>

                    {/* Date */}
                    <div className="hidden xl:flex flex-col min-w-[80px]">
                      <span className="text-xs text-slate-400">Date</span>
                      <span className="text-xs text-slate-600">{fmtDate(o.confirmedAt)}</span>
                    </div>

                    {/* Status badge */}
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.badge}`}>
                      {st.label}
                    </span>

                    {/* Quick dispatch */}
                    {o.status === "CONFIRMED" && (
                      <button
                        type="button"
                        disabled={acting === o.id}
                        onClick={(e) => { e.stopPropagation(); handleDispatch(o.id); }}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        <Zap size={11} />
                        {acting === o.id ? "…" : "Dispatch"}
                      </button>
                    )}

                    {/* Chevron */}
                    <span className="ml-auto text-slate-400">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

                    {/* Financial breakdown */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Product Amount", val: fmtBDT(o.productAmount), color: "text-slate-900" },
                        { label: "Transport Cost",  val: fmtBDT(o.transportCost),  color: "text-slate-700" },
                        { label: "Platform Fee",    val: fmtBDT(o.platformFee),    color: "text-indigo-600" },
                        { label: "Seller Payable",  val: fmtBDT(o.sellerPayable),  color: "text-emerald-700" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
                          <p className={`text-sm font-bold ${color}`}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Logistics details */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {[
                        { Icon: Package,    label: "Product",        val: `${o.product} · ${o.qty}${o.freeQty > 0 ? ` + ${o.freeQty} free` : ""}` },
                        { Icon: Tag,        label: "Lot Code",       val: o.lotCode },
                        { Icon: Building2,  label: "Source Hub",     val: o.hub || "—" },
                        { Icon: MapPin,     label: "Delivery Point", val: o.deliveryPoint || "—" },
                        { Icon: Truck,      label: "Truck",          val: o.assignedTruck || "Not assigned" },
                        { Icon: PackageCheck, label: "Buyer",        val: o.buyer },
                        { Icon: DollarSign, label: "Seller",         val: o.seller },
                        { Icon: Clock,      label: "Order Date",     val: fmtDate(o.confirmedAt) },
                      ].map(({ Icon, label, val }) => (
                        <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={11} className="text-slate-400" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Actions</span>

                      {o.status === "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={acting === o.id}
                          onClick={() => handleDispatch(o.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                          <Truck size={13} />
                          {acting === o.id ? "Dispatching…" : "Mark as Dispatched"}
                        </button>
                      )}

                      {o.status === "DISPATCHED" && (
                        <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                          In Transit to Delivery Hub
                        </span>
                      )}

                      {["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED"].includes(o.status) && (
                        <span className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
                          {st.label} — Last Mile in Progress
                        </span>
                      )}

                      {(o.delivered || o.status === "PICKED_UP") && (
                        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={13} />
                          Delivered{o.deliveredAt ? ` on ${fmtDate(o.deliveredAt)}` : ""}
                        </span>
                      )}

                      <span className="ml-auto text-xs text-slate-400">
                        Confirmed {fmtDate(o.confirmedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
