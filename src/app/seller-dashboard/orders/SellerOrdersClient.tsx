"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Search, ChevronDown, ChevronUp, Download } from "lucide-react";

type OrderItem = {
  id: string;
  lotId: string;
  lotTitle: string;
  lotQuantity: number;
  lotUnit: string;
  lotAcceptedQty: number;
  lotAvailableQty: number;
  product: string;
  qty: string;
  freeQty: number;
  qtyNum: number;
  buyer: string;
  buyerPhone: string;
  winningBid: string;
  totalAmount: string;
  confirmedAt: string;
  hub: string;
  status: string;
  sellerStatus: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  delivered: boolean;
  productAmount: number;
  transportCost: number;
  platformFeeRate: number;
  platformFee: number;
  sellerPayable: number;
  actualWeightKg: number | null;
};

type LotGroup = {
  lotId: string;
  lotTitle: string;
  lotQuantity: number;
  lotUnit: string;
  acceptedQty: number;
  orders: OrderItem[];
};

const SELLER_STATUS_CHIP: Record<string, string> = {
  PENDING_SELLER: "bg-amber-100 text-amber-700",
  ACCEPTED:       "bg-emerald-100 text-emerald-700",
  CONFIRMED:      "bg-emerald-100 text-emerald-700",
  DECLINED:       "bg-red-100 text-red-600",
};
const SELLER_STATUS_LABEL: Record<string, string> = {
  PENDING_SELLER: "Pending",
  ACCEPTED:       "Accepted",
  CONFIRMED:      "Auto-confirmed",
  DECLINED:       "Declined",
};

const ORDER_STATUS_CHIP: Record<string, string> = {
  Confirmed:          "bg-orange-50 text-orange-600",
  Dispatched:         "bg-violet-50 text-violet-700",
  "At Hub":           "bg-blue-50 text-blue-700",
  "Out for Delivery": "bg-indigo-50 text-indigo-700",
  Arrived:            "bg-teal-50 text-teal-700",
  Delivered:          "bg-emerald-50 text-emerald-700",
  CANCELLED:          "bg-red-50 text-red-600",
};


type Tab = "pending" | "active" | "all";

export default function SellerOrdersClient() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sort, setSort] = useState("newest");
  const [collapsedLots, setCollapsedLots] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<{ orders: OrderItem[] }>("/api/seller-dashboard/orders")
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDecision(orderId: string, decision: "ACCEPTED" | "DECLINED") {
    setDeciding(orderId);
    setError(null);
    try {
      await api.patch(`/api/seller-dashboard/orders/${orderId}/decide`, { decision });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, sellerStatus: decision, status: decision === "DECLINED" ? "CANCELLED" : o.status }
            : o
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeciding(null);
    }
  }

  const toggleLot = (lotId: string) => {
    setCollapsedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

  const pendingOrders = orders.filter((o) => o.sellerStatus === "PENDING_SELLER");
  const activeOrders  = orders.filter((o) =>
    (o.sellerStatus === "ACCEPTED" || o.sellerStatus === "CONFIRMED") &&
    o.status !== "Delivered" && o.status !== "CANCELLED"
  );

  const lotGroups: LotGroup[] = [];
  for (const o of pendingOrders) {
    const existing = lotGroups.find((g) => g.lotId === o.lotId);
    if (existing) { existing.orders.push(o); }
    else {
      lotGroups.push({ lotId: o.lotId, lotTitle: o.lotTitle, lotQuantity: o.lotQuantity, lotUnit: o.lotUnit, acceptedQty: o.lotAcceptedQty, orders: [o] });
    }
  }

  const allStatuses = ["All", ...Array.from(new Set(orders.map((o) => o.status)))];

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (filterStatus !== "All" && o.status !== filterStatus) return false;
      if (q && !o.buyer.toLowerCase().includes(q) && !o.product.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q) && !o.lotId.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "oldest") list = [...list].reverse();
    if (sort === "amount_desc") list = [...list].sort((a, b) => parseFloat(b.totalAmount.replace(/[^0-9.]/g, "")) - parseFloat(a.totalAmount.replace(/[^0-9.]/g, "")));
    if (sort === "amount_asc")  list = [...list].sort((a, b) => parseFloat(a.totalAmount.replace(/[^0-9.]/g, "")) - parseFloat(b.totalAmount.replace(/[^0-9.]/g, "")));
    return list;
  }, [orders, search, filterStatus, sort]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending Decisions", count: pendingOrders.length },
    { key: "active",  label: "Active Orders",     count: activeOrders.length },
    { key: "all",     label: "All Orders",         count: orders.length },
  ];

  const counts = {
    Confirmed:  orders.filter((o) => o.status === "Confirmed").length,
    Dispatched: orders.filter((o) => o.status === "Dispatched").length,
    Arrived:    orders.filter((o) => o.status === "Arrived").length,
    Delivered:  orders.filter((o) => o.status === "Delivered").length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Orders & Auction Results</h1>
        <p className="text-slate-500 text-sm">
          Review buyer requests, choose who to sell to, and track each order.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Confirmed",  count: counts.Confirmed,  color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-100" },
          { label: "Dispatched", count: counts.Dispatched, color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-100" },
          { label: "Arrived",    count: counts.Arrived,    color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-100" },
          { label: "Delivered",  count: counts.Delivered,  color: "text-slate-600",  bg: "bg-slate-50",   border: "border-slate-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition
              ${tab === t.key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold
                ${tab === t.key
                  ? t.key === "pending" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600"
                }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ── */}
      {tab === "pending" && (
        <div className="space-y-4">
          {lotGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
              No pending buyer requests.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
                <span className="text-lg">🛒</span>
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">{pendingOrders.length} buyer request{pendingOrders.length !== 1 ? "s" : ""}</span>
                  {" "}across{" "}
                  <span className="font-semibold">{lotGroups.length} product{lotGroups.length !== 1 ? "s" : ""}</span>
                  {" "}— choose who to sell to.
                </p>
              </div>

              {lotGroups.map((group) => {
                const acceptedFromState = orders
                  .filter((o) => o.lotId === group.lotId && o.sellerStatus === "ACCEPTED")
                  .reduce((sum, o) => sum + o.qtyNum, 0);
                const effectiveAccepted = Math.max(group.acceptedQty, acceptedFromState);
                const remaining = Math.max(0, group.lotQuantity - effectiveAccepted);
                const acceptedPct = group.lotQuantity > 0 ? Math.min(100, (effectiveAccepted / group.lotQuantity) * 100) : 0;
                const pendingTotalQty = group.orders.reduce((s, o) => s + o.qtyNum, 0);
                const isCollapsed = collapsedLots.has(group.lotId);

                return (
                  <div key={group.lotId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleLot(group.lotId)}
                      className="w-full border-b border-slate-100 bg-slate-50 px-5 py-4 text-left hover:bg-slate-100 transition"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{group.lotTitle}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">{group.lotId}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">Total: {group.lotQuantity} {group.lotUnit}</span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">Accepted: {effectiveAccepted} {group.lotUnit}</span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">Available: {remaining} {group.lotUnit}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">
                            {group.orders.length} request{group.orders.length !== 1 ? "s" : ""}
                          </span>
                          {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${acceptedPct}%` }} />
                        </div>
                        <p className="text-left text-[10px] text-slate-400">
                          {effectiveAccepted} {group.lotUnit} confirmed · {remaining} {group.lotUnit} available · {pendingTotalQty} {group.lotUnit} requested below
                        </p>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y divide-slate-50">
                        {group.orders.map((o, idx) => {
                          const wouldExceed = effectiveAccepted + o.qtyNum > group.lotQuantity;
                          const currentOrder = orders.find((x) => x.id === o.id) ?? o;
                          const isDecided = currentOrder.sellerStatus !== "PENDING_SELLER";
                          return (
                            <div
                              key={o.id}
                              className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between transition
                                ${isDecided ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900">{o.buyer}</p>
                                  {o.buyerPhone !== "—" && <p className="text-xs text-slate-400">{o.buyerPhone}</p>}
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{o.id}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:ml-4">
                                {[
                                  { label: "Qty", value: `${o.qty}${o.freeQty > 0 ? ` + ${o.freeQty} ${group.lotUnit} free` : ""}` },
                                  { label: "Rate", value: o.winningBid, em: true },
                                  { label: "Total", value: o.totalAmount },
                                  { label: "Hub", value: o.hub },
                                ].map((d) => (
                                  <div key={d.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                                    <p className="text-slate-400">{d.label}</p>
                                    <p className={`font-semibold ${d.em ? "text-emerald-700" : "text-slate-800"}`}>{d.value}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="shrink-0">
                                {currentOrder.sellerStatus === "ACCEPTED" ? (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">✓ Accepted</span>
                                ) : currentOrder.sellerStatus === "DECLINED" ? (
                                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600">✗ Declined</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {wouldExceed && (
                                      <p className="text-center text-[10px] text-red-500">Exceeds remaining {remaining} {group.lotUnit}</p>
                                    )}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleDecision(o.id, "ACCEPTED")}
                                        disabled={deciding === o.id || wouldExceed}
                                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        {deciding === o.id ? "..." : "Accept"}
                                      </button>
                                      <button
                                        onClick={() => handleDecision(o.id, "DECLINED")}
                                        disabled={deciding === o.id}
                                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                      >
                                        {deciding === o.id ? "..." : "Decline"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── ACTIVE TAB ── */}
      {tab === "active" && (
        <div className="space-y-3">
          {activeOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
              No active orders right now.
            </div>
          ) : (
            activeOrders.map((o) => <OrderCard key={o.id} order={o} showProgress />)
          )}
        </div>
      )}

      {/* ── ALL ORDERS TAB ── */}
      {tab === "all" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search buyer, product, order ID…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-emerald-400"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount_desc">Amount ↓</option>
                <option value="amount_asc">Amount ↑</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition
                    ${filterStatus === s
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">{filteredAll.length} of {orders.length} orders</p>
          </div>

          {filteredAll.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-400 shadow-sm">
              No orders match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAll.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  showSellerStatus
                  showProgress={o.sellerStatus !== "DECLINED" && o.status !== "CANCELLED"}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 10-step delivery stepper (mirrors buyer view) ───────────────────────────

const DELIVERY_STEPS: { label: string; sublabel: string }[] = [
  { label: "Order Placed",          sublabel: "Waiting for seller"   },
  { label: "Order Confirmed",        sublabel: "Seller accepted"      },
  { label: "Goods at Hub",           sublabel: "Arrived at hub"       },
  { label: "Weight & QC Checked",    sublabel: "Hub verified"         },
  { label: "Truck Confirmed",        sublabel: "Vehicle assigned"     },
  { label: "In Transit",             sublabel: "On the way"           },
  { label: "Hub Received",           sublabel: "At delivery hub"      },
  { label: "QTY & Weight Checked",   sublabel: "Delivery man verified"},
  { label: "Ready for Pickup",       sublabel: "Set for collection"   },
  { label: "Delivered",              sublabel: "Picked up by buyer"   },
];

// Seller API returns mapped status labels (e.g. "Delivered", "At Hub")
function sellerActiveStep(o: OrderItem): number {
  if (o.status === "Delivered" || o.delivered)   return 10;
  if (o.status === "Arrived")                    return 9;
  if (o.status === "Out for Delivery")           return 8;
  if (o.status === "At Hub")                     return 7;
  if (o.dispatched || o.status === "Dispatched") return 5; // In Transit active
  if (o.assignedTruck || o.loadConfirmed)        return 5; // Truck confirmed, waiting dispatch
  if (o.actualWeightKg != null)                  return 4; // Weight checked, waiting truck
  // Seller must have accepted before order progresses
  const s = o.sellerStatus;
  if (s !== "ACCEPTED" && s !== "CONFIRMED")     return 1; // Awaiting seller decision
  return 3; // Seller accepted — goods are at hub (lot must be LIVE/QC_PASSED to order)
}

function DeliveryProgress({ order: o }: { order: OrderItem }) {
  const active = sellerActiveStep(o);
  const total  = DELIVERY_STEPS.length;
  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <div className="flex items-start" style={{ minWidth: `${total * 72}px` }}>
        {DELIVERY_STEPS.map((step, i) => {
          const isDone   = i < active;
          const isActive = i === active;
          const isLast   = i === total - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              {/* connector + dot row */}
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 transition-colors duration-300 ${
                  i === 0 ? "invisible"
                  : isDone ? "bg-emerald-400"
                  : isActive ? "bg-gradient-to-r from-emerald-400 to-slate-200"
                  : "bg-slate-200"
                }`} />
                <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all duration-300 ${
                  isDone
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                    : isActive
                    ? "border-blue-500 bg-white text-blue-600 shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
                    : "border-slate-200 bg-white text-slate-400"
                }`}>
                  {isDone ? (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className={`h-0.5 flex-1 transition-colors duration-300 ${
                  isLast ? "invisible" : isDone ? "bg-emerald-400" : "bg-slate-200"
                }`} />
              </div>
              {/* labels */}
              <div className="mt-1.5 px-0.5 text-center">
                <p className={`text-[9px] font-semibold leading-tight ${
                  isDone ? "text-emerald-700" : isActive ? "text-blue-700" : "text-slate-400"
                }`}>{step.label}</p>
                <p className={`mt-0.5 text-[8px] leading-tight ${
                  isDone ? "text-emerald-500" : isActive ? "text-blue-400" : "text-slate-300"
                }`}>{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order: o, showSellerStatus, showProgress }: { order: OrderItem; showSellerStatus?: boolean; showProgress?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{o.product}</p>
          <p className="text-xs text-slate-500">{o.lotTitle}</p>
          <p className="font-mono text-[10px] text-slate-400">{o.id}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {showSellerStatus && o.sellerStatus && (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${SELLER_STATUS_CHIP[o.sellerStatus] ?? "bg-slate-100 text-slate-500"}`}>
              {SELLER_STATUS_LABEL[o.sellerStatus] ?? o.sellerStatus}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ORDER_STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-500"}`}>
            {o.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-400">Buyer</p>
          <p className="font-semibold text-slate-800 truncate">{o.buyer}</p>
          {o.buyerPhone !== "—" && <p className="text-slate-400">{o.buyerPhone}</p>}
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-400">Qty</p>
          <p className="font-semibold text-slate-800">{o.qty}</p>
          {o.freeQty > 0 && <p className="text-[10px] font-semibold text-emerald-600">+ {o.freeQty} free</p>}
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-400">Rate / Total</p>
          <p className="font-semibold text-emerald-700">{o.winningBid}</p>
          <p className="text-slate-700">{o.totalAmount}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-400">Hub · Date</p>
          <p className="font-semibold text-slate-700">{o.hub}</p>
          <p className="text-slate-400">{o.confirmedAt}</p>
        </div>
      </div>

      {showProgress && (
        <div className="border-t border-slate-100 pt-3">
          <DeliveryProgress order={o} />
        </div>
      )}

      {/* Financial breakdown */}
      {(o.transportCost > 0 || o.actualWeightKg !== null) && (
        <div className="border-t border-slate-100 pt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Financial Breakdown</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {o.productAmount > 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400">Product Amount</p>
                <p className="text-xs font-semibold text-slate-800">৳ {o.productAmount.toLocaleString()}</p>
              </div>
            )}
            {o.transportCost > 0 && (
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-[10px] text-amber-600">Truck Price</p>
                <p className="text-xs font-semibold text-amber-700">৳ {o.transportCost.toLocaleString()}</p>
                <p className="text-[9px] text-amber-500">Deducted from buyer</p>
              </div>
            )}
            {o.platformFee > 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400">Platform Fee ({o.platformFeeRate}%)</p>
                <p className="text-xs font-semibold text-slate-700">৳ {o.platformFee.toLocaleString()}</p>
              </div>
            )}
            {o.sellerPayable > 0 && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-[10px] text-emerald-600">You Receive</p>
                <p className="text-xs font-bold text-emerald-700">৳ {o.sellerPayable.toLocaleString()}</p>
              </div>
            )}
          </div>
          {o.actualWeightKg !== null && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5">
              <span className="text-[10px] font-semibold text-emerald-600">Verified Weight:</span>
              <span className="text-[10px] font-bold text-emerald-700">{o.actualWeightKg} kg</span>
              <span className="text-[9px] text-emerald-500 ml-1">confirmed at hub</span>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 px-1 pt-3 flex flex-wrap justify-end gap-2">
        {(o.sellerStatus === "ACCEPTED" || o.sellerStatus === "CONFIRMED") && (
          <Link
            href={`/order-confirmation/${o.id}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            <Download size={11} /> Seller Confirmation PDF
          </Link>
        )}
        {o.status === "Delivered" && (
          <Link
            href={`/delivery-receipt/${o.id}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          >
            <Download size={11} /> Download Delivery Receipt
          </Link>
        )}
      </div>
    </div>
  );
}
