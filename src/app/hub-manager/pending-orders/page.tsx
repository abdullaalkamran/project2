"use client";

import { useEffect, useState } from "react";
import { Phone, RefreshCw, XCircle, Clock, Package, User, AlertTriangle } from "lucide-react";

type PendingOrder = {
  id: string;
  orderCode: string;
  lotCode: string;
  product: string;
  qty: string;
  freeQty: number;
  buyer: string;
  seller: string;
  sellerId: string | null;
  sellerPhone: string | null;
  hub: string;
  totalAmount: number;
  confirmedAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hub-manager/pending-orders");
      const data = await res.json() as PendingOrder[];
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleReject = async (id: string) => {
    setRejecting(id);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/hub-manager/pending-orders/${id}`, { method: "PATCH" });
      if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setRejecting(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pending Seller Acceptance</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Orders placed by buyers waiting for seller to accept. Call seller if delayed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Count badge */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            {orders.length} order{orders.length > 1 ? "s" : ""} awaiting seller response
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center">
          <Package size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">No pending orders</p>
          <p className="mt-1 text-sm text-slate-400">All orders have been responded to by sellers.</p>
        </div>
      )}

      {/* Order cards */}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between bg-amber-50 px-4 py-2.5 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-700">Awaiting Seller</span>
                <span className="text-[10px] text-amber-500">{timeAgo(o.confirmedAt)}</span>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-500">{o.orderCode}</span>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Product row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{o.product}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {o.qty}{o.freeQty > 0 ? ` + ${o.freeQty} free` : ""} · Lot {o.lotCode} · {o.hub}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900">Tk {o.totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">order value</p>
                </div>
              </div>

              {/* Buyer & seller row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                    <User size={10} /> Buyer
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{o.buyer}</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500 flex items-center gap-1">
                    <User size={10} /> Seller — Call to Accept
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{o.seller}</p>
                  {o.sellerPhone ? (
                    <a
                      href={`tel:${o.sellerPhone}`}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-600"
                    >
                      <Phone size={10} /> {o.sellerPhone}
                    </a>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">No phone on record</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Clock size={10} />
                  Placed {new Date(o.confirmedAt).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {confirmId === o.id ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-rose-600">Confirm reject?</p>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReject(o.id)}
                      disabled={rejecting === o.id}
                      className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50"
                    >
                      <XCircle size={12} />
                      {rejecting === o.id ? "Rejecting…" : "Yes, Reject"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(o.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <XCircle size={13} />
                    Reject Order
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject confirmation modal */}
      {confirmId && (
        <div />
      )}
    </div>
  );
}
