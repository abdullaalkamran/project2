"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, ChevronDown, Download } from "lucide-react";
import api from "@/lib/api";

type OrderItem = {
  id: string;
  lotCode: string;
  product: string;
  qty: string;
  qtyUnit: string;
  freeQty: number;
  seller: string;
  winningBid: number;
  totalAmount: number;
  hub: string;
  deliveryPoint: string;
  status: string;
  sellerStatus: string;
  confirmedAt: string;
  confirmedAtIso: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  productAmount: number;
  transportCost: number;
  buyerTransportCost: number;
  sellerTransportCost: number;
  transportPaidBy: "BUYER" | "SELLER" | "BOTH" | "NONE";
  platformFee: number;
  buyerTotalPayable: number;
  actualWeightKg: number | null;
  physicallyReceived: boolean;
  qualityChecked: boolean;
  actualQty: number | null;
  actualQtyUnit: string;
  lotStatus: string;
  thumbnail: string | null;
};

function resolveDisplayStatus(status: string, sellerStatus: string) {
  if (status === "CANCELLED" || sellerStatus === "DECLINED") return "CANCELLED";
  if (sellerStatus === "PENDING_SELLER") return "AWAITING_SELLER";
  return status;
}

const STATUS_CHIP: Record<string, string> = {
  AWAITING_SELLER: "bg-amber-50 text-amber-700",
  CONFIRMED:       "bg-orange-50 text-orange-600",
  DISPATCHED:      "bg-violet-50 text-violet-700",
  HUB_RECEIVED:    "bg-blue-50 text-blue-700",
  OUT_FOR_DELIVERY:"bg-indigo-50 text-indigo-700",
  ARRIVED:         "bg-teal-50 text-teal-700",
  PICKED_UP:       "bg-emerald-50 text-emerald-700",
  CANCELLED:       "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  AWAITING_SELLER: "Awaiting Seller",
  CONFIRMED:       "Confirmed",
  DISPATCHED:      "Dispatched",
  HUB_RECEIVED:    "At Delivery Hub",
  OUT_FOR_DELIVERY:"Out for Delivery",
  ARRIVED:         "Arrived",
  PICKED_UP:       "Delivered",
  CANCELLED:       "Cancelled",
};

const STATUS_ACTIVE_CHIP: Record<string, string> = {
  AWAITING_SELLER: "ring-2 ring-amber-400 bg-amber-100 text-amber-800",
  CONFIRMED:       "ring-2 ring-orange-400 bg-orange-100 text-orange-700",
  DISPATCHED:      "ring-2 ring-violet-400 bg-violet-100 text-violet-700",
  HUB_RECEIVED:    "ring-2 ring-blue-400 bg-blue-100 text-blue-700",
  OUT_FOR_DELIVERY:"ring-2 ring-indigo-400 bg-indigo-100 text-indigo-700",
  ARRIVED:         "ring-2 ring-teal-400 bg-teal-100 text-teal-700",
  PICKED_UP:       "ring-2 ring-emerald-500 bg-emerald-100 text-emerald-800",
  CANCELLED:       "ring-2 ring-red-400 bg-red-100 text-red-700",
};

// ── 4-step delivery stepper ─────────────────────────────────────────────────

// ── 10-step delivery stepper ────────────────────────────────────────────────

const DELIVERY_STEPS: { label: string; sublabel: string }[] = [
  { label: "Order Placed",           sublabel: "Waiting for seller" },
  { label: "Order Confirmed",         sublabel: "Seller accepted"    },
  { label: "Goods at Hub",            sublabel: "Arrived at hub"     },
  { label: "Weight & QC Checked",     sublabel: "Hub verified"       },
  { label: "Truck Confirmed",         sublabel: "Vehicle assigned"   },
  { label: "In Transit",              sublabel: "On the way"         },
  { label: "Hub Received",             sublabel: "At delivery hub"       },
  { label: "QTY & Weight Checked",    sublabel: "Delivery man verified" },
  { label: "Ready for Pickup",        sublabel: "Set for collection"    },
  { label: "Delivered",               sublabel: "Picked up by buyer"    },
];

// Returns number of COMPLETED steps (0–10). Step i is done if i < result, active if i === result.
// Step 0: Order Placed        → always done once order exists
// Step 1: Order Confirmed     → sellerStatus ACCEPTED/CONFIRMED
// Step 2: Goods at Hub        → lot.status reached AT_HUB or beyond
// Step 3: Weight & QC Checked → actualWeightKg > 0 (pre-dispatch weight entered) OR lot QC done
// Step 4: Truck Confirmed     → assignedTruck set or loadConfirmed
// Step 5: In Transit          → dispatched / status DISPATCHED
// Step 6: Hub Received        → status HUB_RECEIVED
// Step 7: QTY & Weight Checked → status OUT_FOR_DELIVERY
// Step 8: Ready for Pickup    → status ARRIVED
// Step 9: Delivered           → status PICKED_UP
const LOT_STATUSES_AT_OR_PAST_HUB = [
  "AT_HUB", "IN_QC", "QC_SUBMITTED", "QC_PASSED", "QC_FAILED",
  "LIVE", "AUCTION_ENDED", "SOLD", "DELIVERED",
];

function deliveryActiveStep(o: OrderItem): number {
  // Order-level delivery statuses — these only exist after full flow starts
  if (o.status === "PICKED_UP")                  return 10;
  if (o.status === "ARRIVED")                    return 9;
  if (o.status === "OUT_FOR_DELIVERY")           return 8;
  if (o.status === "HUB_RECEIVED")               return 7;
  if (o.dispatched || o.status === "DISPATCHED") return 5;
  if (o.assignedTruck || o.loadConfirmed)        return 5;
  if (o.qualityChecked && o.actualWeightKg != null && o.actualWeightKg > 0) return 4;

  // Seller must accept BEFORE lot-level progress can advance order steps
  const s = o.sellerStatus;
  if (s !== "ACCEPTED" && s !== "CONFIRMED") return 1;

  // Seller accepted — lot goods are physically at hub if lot reached AT_HUB or beyond
  if (LOT_STATUSES_AT_OR_PAST_HUB.includes(o.lotStatus)) return 3;
  return 2;
}

function DeliveryStepBar({ o }: { o: OrderItem }) {
  const active = deliveryActiveStep(o);
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

const TRANSPORT_PAYER_LABEL: Record<OrderItem["transportPaidBy"], string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  BOTH: "Buyer + Seller",
  NONE: "Not applied",
};


// ── Filter helpers ────────────────────────────────────────────────────────────
type StatusFilter = "ALL" | "AWAITING_SELLER" | "CONFIRMED" | "DISPATCHED" | "HUB_RECEIVED" | "OUT_FOR_DELIVERY" | "ARRIVED" | "PICKED_UP" | "CANCELLED";
type DateFilter   = "ALL" | "7D" | "30D" | "90D";
type SortOption   = "NEWEST" | "OLDEST" | "AMOUNT_HIGH" | "AMOUNT_LOW";

const DATE_LABELS: Record<DateFilter, string>  = { ALL: "All time", "7D": "Last 7 days", "30D": "Last 30 days", "90D": "Last 90 days" };
const SORT_LABELS: Record<SortOption, string>  = { NEWEST: "Newest first", OLDEST: "Oldest first", AMOUNT_HIGH: "Highest amount", AMOUNT_LOW: "Lowest amount" };


function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── Dropdown component ────────────────────────────────────────────────────────
function Dropdown<T extends string>({
  value, options, onChange,
}: { value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        {options[value]}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
            {(Object.entries(options) as [T, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { onChange(k); setOpen(false); }}
                className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${k === value ? "font-semibold text-emerald-700" : "text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BuyerOrdersClient() {
  const [orders,    setOrders]    = useState<OrderItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState<StatusFilter>("ALL");
  const [dateRange, setDateRange] = useState<DateFilter>("ALL");
  const [sort,      setSort]      = useState<SortOption>("NEWEST");

  useEffect(() => {
    api
      .get<{ orders: OrderItem[] }>("/api/buyer-dashboard/orders")
      .then((data) => setOrders(data.orders ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  // ── derived counts for chips ──
  const counts = useMemo(() => ({
    AWAITING_SELLER: orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "AWAITING_SELLER").length,
    CONFIRMED:       orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "CONFIRMED").length,
    DISPATCHED:      orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "DISPATCHED").length,
    HUB_RECEIVED:    orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "HUB_RECEIVED").length,
    OUT_FOR_DELIVERY:orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "OUT_FOR_DELIVERY").length,
    ARRIVED:         orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "ARRIVED").length,
    PICKED_UP:       orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "PICKED_UP").length,
    CANCELLED:       orders.filter((o) => resolveDisplayStatus(o.status, o.sellerStatus) === "CANCELLED").length,
  }), [orders]);

  // ── filtered + sorted list ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = dateRange === "7D" ? daysAgo(7) : dateRange === "30D" ? daysAgo(30) : dateRange === "90D" ? daysAgo(90) : null;

    let list = orders.filter((o) => {
      const display = resolveDisplayStatus(o.status, o.sellerStatus);

      if (status !== "ALL" && display !== status) return false;
      if (cutoff && new Date(o.confirmedAtIso ?? o.confirmedAt) < cutoff) return false;
      if (q) {
        const hay = `${o.product} ${o.seller} ${o.id} ${o.lotCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "NEWEST")      return new Date(b.confirmedAtIso ?? b.confirmedAt).getTime() - new Date(a.confirmedAtIso ?? a.confirmedAt).getTime();
      if (sort === "OLDEST")      return new Date(a.confirmedAtIso ?? a.confirmedAt).getTime() - new Date(b.confirmedAtIso ?? b.confirmedAt).getTime();
      if (sort === "AMOUNT_HIGH") return b.totalAmount - a.totalAmount;
      if (sort === "AMOUNT_LOW")  return a.totalAmount - b.totalAmount;
      return 0;
    });

    return list;
  }, [orders, search, status, dateRange, sort]);

  const hasFilters = search !== "" || status !== "ALL" || dateRange !== "ALL" || sort !== "NEWEST";
  const clearFilters = () => { setSearch(""); setStatus("ALL"); setDateRange("ALL"); setSort("NEWEST"); };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-100" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-16 text-center gap-2">
        <p className="text-sm font-semibold text-red-600">Failed to load orders</p>
        <p className="text-xs text-red-400">{error}</p>
        <button type="button" onClick={() => { setError(null); setLoading(true); api.get<{ orders: OrderItem[] }>("/api/buyer-dashboard/orders").then(d => setOrders(d.orders ?? [])).catch(e => setError(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false)); }}
          className="mt-2 rounded-lg border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="text-slate-500">Track seller confirmation and delivery status for all your orders.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          {orders.length} total order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Smart filter bar ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">

        {/* Row 1: search + sort + date */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, seller, order ID…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none transition"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <Dropdown value={dateRange} options={DATE_LABELS} onChange={setDateRange} />
          <Dropdown value={sort}      options={SORT_LABELS}  onChange={setSort}      />

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>

        {/* Row 2: status chips (also work as summary) */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatus("ALL")}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${status === "ALL" ? "border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-300" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
          >
            <SlidersHorizontal size={10} /> All <span className="opacity-60">({orders.length})</span>
          </button>
          {([
            { key: "AWAITING_SELLER",  label: "Awaiting Seller",  count: counts.AWAITING_SELLER  },
            { key: "CONFIRMED",        label: "Confirmed",         count: counts.CONFIRMED        },
            { key: "DISPATCHED",       label: "Dispatched",        count: counts.DISPATCHED       },
            { key: "HUB_RECEIVED",     label: "At Hub",            count: counts.HUB_RECEIVED     },
            { key: "OUT_FOR_DELIVERY", label: "Out for Delivery",  count: counts.OUT_FOR_DELIVERY },
            { key: "ARRIVED",          label: "Arrived",           count: counts.ARRIVED          },
            { key: "PICKED_UP",        label: "Delivered",         count: counts.PICKED_UP        },
            { key: "CANCELLED",        label: "Cancelled",         count: counts.CANCELLED        },
          ] as { key: StatusFilter; label: string; count: number }[]).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatus((prev) => prev === c.key ? "ALL" : c.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                status === c.key
                  ? STATUS_ACTIVE_CHIP[c.key]
                  : `${STATUS_CHIP[c.key]} border-transparent hover:opacity-80`
              }`}
            >
              {c.label} <span className="opacity-60">({c.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results meta */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {filtered.length === orders.length
            ? `Showing all ${orders.length} order${orders.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${orders.length} order${orders.length !== 1 ? "s" : ""} match filters`}
        </span>
        {hasFilters && filtered.length === 0 && (
          <button type="button" onClick={clearFilters} className="text-emerald-600 font-semibold hover:underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-400">No orders yet.</p>
          <p className="mt-1 text-xs text-slate-300">Orders from the marketplace will appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center gap-2">
          <Search size={24} className="text-slate-300" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-500">No orders match your filters.</p>
          <button type="button" onClick={clearFilters} className="text-xs text-emerald-600 font-semibold hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const display = resolveDisplayStatus(o.status, o.sellerStatus);
            return (
              <div key={o.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

                {/* Row 1: product image + meta + status */}
                <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-3">
                  {/* Thumbnail */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {o.thumbnail ? (
                      <img
                        src={o.thumbnail}
                        alt={o.product}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M3.75 3h16.5A2.25 2.25 0 0122.5 5.25v13.5A2.25 2.25 0 0120.25 21H3.75A2.25 2.25 0 011.5 18.75V5.25A2.25 2.25 0 013.75 3z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Meta */}
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-900">{o.product}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{o.lotCode}</span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {o.qty}{o.freeQty > 0 ? ` + ${o.freeQty} free` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{o.confirmedAt}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[display] ?? "bg-slate-100 text-slate-500"}`}>
                    {STATUS_LABEL[display] ?? display}
                  </span>
                </div>

                {/* Row 2: 10-step delivery progress bar */}
                {display === "CANCELLED" ? (
                  <div className="border-b border-slate-50 px-5 py-3">
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2">
                      <span className="text-xs font-semibold text-red-500">✕ Order Cancelled</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-slate-50 px-5 py-5">
                    <DeliveryStepBar o={o} />
                  </div>
                )}

                {/* Row 3: truck/load + product data */}
                <div className="grid grid-cols-1 divide-y divide-slate-50 sm:grid-cols-[auto_1fr] sm:divide-x sm:divide-y-0">

                  {/* Truck / load strip */}
                  <div className="flex items-center divide-x divide-slate-100 text-xs">
                    <div className="flex items-center gap-2 px-5 py-3 min-w-[120px]">
                      <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16l2 .001M13 16H9m4 0h2m0 0h2a1 1 0 001-1v-3.65a1 1 0 00-.22-.624l-3.48-4.35A1 1 0 0016.52 6H13" />
                      </svg>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Truck</p>
                        <p className={`font-semibold ${o.assignedTruck ? "text-slate-800" : "text-slate-300"}`}>{o.assignedTruck ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-5 py-3">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${o.loadConfirmed ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Load</p>
                        <p className={`font-semibold ${o.loadConfirmed ? "text-emerald-600" : "text-slate-400"}`}>{o.loadConfirmed ? "Confirmed" : "Pending"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-5 py-3">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${o.dispatched ? "bg-violet-500" : "bg-slate-200"}`} />
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Dispatch</p>
                        <p className={`font-semibold ${o.dispatched ? "text-violet-700" : "text-slate-400"}`}>{o.dispatched ? "Dispatched" : "Pending"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Data grid */}
                  <div className="grid grid-cols-2 divide-x divide-slate-50 text-xs sm:grid-cols-4">
                    <div className="px-5 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Seller</p>
                      <p className="mt-0.5 font-medium text-slate-800 truncate">{o.seller}</p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Delivery Hub</p>
                      <p className="mt-0.5 text-slate-700 truncate flex items-center gap-1">
                        <svg className="h-3 w-3 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {o.deliveryPoint}
                      </p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Rate</p>
                      <p className="mt-0.5 font-semibold text-emerald-700">৳ {o.winningBid.toLocaleString()}/{o.qtyUnit}</p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                      <p className="mt-0.5 font-bold text-slate-900">৳ {o.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Financial breakdown — always shown */}
                {(o.productAmount > 0 || o.buyerTotalPayable > 0) && (
                  <div className="border-t border-slate-50 px-5 py-3">
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Cost Breakdown</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {o.productAmount > 0 && (
                        <div className="rounded-lg bg-slate-50 px-3 py-2 min-w-[90px]">
                          <p className="text-[10px] text-slate-400">Product</p>
                          <p className="font-semibold text-slate-700">৳ {o.productAmount.toLocaleString()}</p>
                        </div>
                      )}
                      {o.transportCost > 0 && (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 min-w-[90px]">
                          <p className="text-[10px] text-amber-600">Truck Price</p>
                          <p className="font-semibold text-amber-700">৳ {o.transportCost.toLocaleString()}</p>
                          <p className="text-[9px] text-amber-500">Paid by: {TRANSPORT_PAYER_LABEL[o.transportPaidBy]}</p>
                        </div>
                      )}
                      {o.platformFee > 0 && (
                        <div className="rounded-lg bg-slate-50 px-3 py-2 min-w-[90px]">
                          <p className="text-[10px] text-slate-400">Platform Fee</p>
                          <p className="font-semibold text-slate-700">৳ {o.platformFee.toLocaleString()}</p>
                        </div>
                      )}
                      {o.actualQty != null && o.actualQty > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 min-w-[90px]">
                          <p className="text-[10px] text-emerald-600">Actual Quantity</p>
                          <p className="font-semibold text-emerald-700">{o.actualQty} {o.actualQtyUnit}</p>
                          <p className="text-[9px] text-emerald-500">Verified at hub</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-emerald-600 px-3 py-2 min-w-[90px]">
                        <p className="text-[10px] text-emerald-100">Total Paid from Wallet</p>
                        <p className="font-bold text-white">৳ {o.buyerTotalPayable.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order ID footer */}
                <div className="border-t border-slate-50 px-5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-300">Order ID</span>
                    <span className="font-mono text-xs text-slate-400">{o.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(o.sellerStatus === "ACCEPTED" || o.sellerStatus === "CONFIRMED") && (
                      <Link
                        href={`/order-confirmation/${o.id}`}
                        target="_blank"
                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <Download size={11} /> Confirmation PDF
                      </Link>
                    )}
                    {o.status === "PICKED_UP" && (
                      <Link
                        href={`/delivery-receipt/${o.id}`}
                        target="_blank"
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <Download size={11} /> Delivery Receipt
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
