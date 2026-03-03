"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type OrderItem = {
  id: string;
  lotCode: string;
  product: string;
  qty: string;
  seller: string;
  winningBid: number;
  totalAmount: number;
  hub: string;
  deliveryPoint: string;
  status: string;
  sellerStatus: string;
  confirmedAt: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
};

// ── Step progress ─────────────────────────────────────────────────────────────
// Steps after seller acceptance
const DELIVERY_STEPS = [
  { key: "CONFIRMED",  label: "Confirmed"  },
  { key: "DISPATCHED", label: "Dispatched" },
  { key: "ARRIVED",   label: "Arrived"    },
  { key: "PICKED_UP", label: "Delivered"  },
];

function deliveryStepIndex(status: string) {
  const i = DELIVERY_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

// Derive a display status for chips and step bar
function resolveDisplayStatus(status: string, sellerStatus: string) {
  if (status === "CANCELLED" || sellerStatus === "DECLINED") return "CANCELLED";
  if (sellerStatus === "PENDING_SELLER") return "AWAITING_SELLER";
  return status; // CONFIRMED / DISPATCHED / ARRIVED / PICKED_UP
}

const STATUS_CHIP: Record<string, string> = {
  AWAITING_SELLER: "bg-amber-50 text-amber-700",
  CONFIRMED:       "bg-orange-50 text-orange-600",
  DISPATCHED:      "bg-violet-50 text-violet-700",
  ARRIVED:         "bg-blue-50 text-blue-700",
  PICKED_UP:       "bg-emerald-50 text-emerald-700",
  CANCELLED:       "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  AWAITING_SELLER: "Awaiting Seller",
  CONFIRMED:       "Confirmed",
  DISPATCHED:      "Dispatched",
  ARRIVED:         "Arrived",
  PICKED_UP:       "Delivered",
  CANCELLED:       "Cancelled",
};

function StepBar({ status, sellerStatus }: { status: string; sellerStatus: string }) {
  const display = resolveDisplayStatus(status, sellerStatus);

  if (display === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2">
        <span className="text-xs font-semibold text-red-500">✕ Order Cancelled by seller</span>
      </div>
    );
  }

  if (display === "AWAITING_SELLER") {
    return (
      <div className="flex items-center gap-3">
        {/* Awaiting node — pulsing */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          </div>
          <span className="mt-0.5 text-[9px] font-medium text-amber-600">Order<br/>Placed</span>
        </div>
        <div className="mb-3 h-px flex-1 border-b border-dashed border-amber-200" />
        {/* Remaining steps — all pending */}
        {DELIVERY_STEPS.map((step, i) => (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-[10px] font-bold text-slate-300">
                {i + 1}
              </div>
              <span className="mt-0.5 text-[9px] font-medium leading-none text-slate-400">{step.label}</span>
            </div>
            {i < DELIVERY_STEPS.length - 1 && (
              <div className="mb-3 h-px flex-1 mx-1 bg-slate-100" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Normal delivery progress
  const current = deliveryStepIndex(status);
  return (
    <div className="flex items-center gap-0 w-full">
      {DELIVERY_STEPS.map((step, i) => {
        const done   = i <= current;
        const active = i === current;
        return (
          <div key={step.key} className="flex flex-1 items-center min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-200 bg-white text-slate-300"
                } ${active ? "ring-2 ring-emerald-200 ring-offset-1" : ""}`}
              >
                {done ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`mt-0.5 text-[9px] font-medium leading-none ${done ? "text-emerald-600" : "text-slate-400"}`}>
                {step.label}
              </span>
            </div>
            {i < DELIVERY_STEPS.length - 1 && (
              <div className={`mb-3 h-px flex-1 mx-1 ${i < current ? "bg-emerald-400" : "bg-slate-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BuyerOrdersClient() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ orders: OrderItem[] }>("/api/buyer-dashboard/orders")
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    "Awaiting Seller": orders.filter((o) => o.sellerStatus === "PENDING_SELLER").length,
    Confirmed:         orders.filter((o) => o.sellerStatus === "ACCEPTED" && o.status === "CONFIRMED").length,
    Dispatched:        orders.filter((o) => o.status === "DISPATCHED").length,
    Delivered:         orders.filter((o) => o.status === "PICKED_UP").length,
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-100" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500">Track seller confirmation and delivery status for all your orders.</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Awaiting Seller", count: counts["Awaiting Seller"], color: "bg-amber-50 text-amber-700"    },
          { label: "Confirmed",       count: counts.Confirmed,          color: "bg-orange-50 text-orange-600"  },
          { label: "Dispatched",      count: counts.Dispatched,         color: "bg-violet-50 text-violet-700"  },
          { label: "Delivered",       count: counts.Delivered,          color: "bg-emerald-50 text-emerald-700" },
        ].map((c) => (
          <span key={c.label} className={`rounded-full px-3 py-1 text-xs font-semibold ${c.color}`}>
            {c.label}: {c.count}
          </span>
        ))}
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-400">No orders yet.</p>
          <p className="mt-1 text-xs text-slate-300">Orders from the marketplace will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const display = resolveDisplayStatus(o.status, o.sellerStatus);
            return (
              <div key={o.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

                {/* Row 1: product meta + status */}
                <div className="flex items-center gap-4 border-b border-slate-50 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-900">{o.product}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{o.lotCode}</span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{o.qty}</span>
                  <span className="shrink-0 text-xs text-slate-400">{o.confirmedAt}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[display] ?? "bg-slate-100 text-slate-500"}`}>
                    {STATUS_LABEL[display] ?? display}
                  </span>
                </div>

                {/* Row 2: step progress bar */}
                <div className="border-b border-slate-50 px-5 py-4">
                  <StepBar status={o.status} sellerStatus={o.sellerStatus} />
                </div>

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
                        <p className={`font-semibold ${o.assignedTruck ? "text-slate-800" : "text-slate-300"}`}>
                          {o.assignedTruck ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-5 py-3">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${o.loadConfirmed ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Load</p>
                        <p className={`font-semibold ${o.loadConfirmed ? "text-emerald-600" : "text-slate-400"}`}>
                          {o.loadConfirmed ? "Confirmed" : "Pending"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-5 py-3">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${o.dispatched ? "bg-violet-500" : "bg-slate-200"}`} />
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Dispatch</p>
                        <p className={`font-semibold ${o.dispatched ? "text-violet-700" : "text-slate-400"}`}>
                          {o.dispatched ? "Dispatched" : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Raw data grid */}
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
                      <p className="mt-0.5 font-semibold text-emerald-700">৳ {o.winningBid.toLocaleString()}/unit</p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                      <p className="mt-0.5 font-bold text-slate-900">৳ {o.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Row 4: order ID footer */}
                <div className="border-t border-slate-50 px-5 py-2 flex items-center gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-300">Order ID</span>
                  <span className="font-mono text-xs text-slate-400">{o.id}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
