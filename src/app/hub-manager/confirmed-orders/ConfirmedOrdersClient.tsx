"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, Phone } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import Pagination from "@/components/Pagination";
import LotLifecycleTracker from "@/components/LotLifecycleTracker";

const PAGE_SIZE = 15;

type Order = {
  id: string;
  lotId: string;
  product: string;
  qty: string;
  freeQty: number;
  seller: string;
  sellerPhone: string | null;
  buyer: string;
  deliveryPoint: string;
  winningBid: string;
  totalAmount: string;
  confirmedAt: string;
  qcLeader: string;
  qcChecker: string;
  sellerStatus: string;
  status: string;
  dispatched: boolean;
  assignedTruck: string | null;
};

type Tab = "All" | "Awaiting Seller" | "Accepted";

const SELLER_STATUS_CHIP: Record<string, string> = {
  PENDING_SELLER: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACCEPTED:       "bg-blue-50 text-blue-700 border-blue-200",
  DECLINED:       "bg-red-50 text-red-600 border-red-200",
};

const SELLER_STATUS_LABEL: Record<string, string> = {
  PENDING_SELLER: "Awaiting Seller",
  CONFIRMED:      "Auto-Confirmed",
  ACCEPTED:       "Seller Accepted",
  DECLINED:       "Seller Declined",
};

const STATUS_CHIP: Record<string, string> = {
  CONFIRMED:        "bg-slate-50 text-slate-600",
  DISPATCHED:       "bg-blue-50 text-blue-700",
  HUB_RECEIVED:     "bg-violet-50 text-violet-700",
  OUT_FOR_DELIVERY: "bg-amber-50 text-amber-700",
  ARRIVED:          "bg-emerald-50 text-emerald-700",
  PICKED_UP:        "bg-slate-100 text-slate-500",
};

export default function ConfirmedOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

  const load = () => {
    api.get<Order[]>("/api/hub-manager/confirmed-orders")
      .then(setOrders)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [tab]);

  const filtered = orders.filter((o) => {
    if (tab === "Awaiting Seller") return o.sellerStatus === "PENDING_SELLER";
    if (tab === "Accepted") return ["ACCEPTED", "CONFIRMED"].includes(o.sellerStatus);
    return true;
  });

  const pendingCount = orders.filter((o) => o.sellerStatus === "PENDING_SELLER").length;
  const acceptedCount = orders.filter((o) => ["ACCEPTED", "CONFIRMED"].includes(o.sellerStatus)).length;

  const handleReject = async (id: string) => {
    setRejecting(id);
    try {
      await api.patch(`/api/hub-manager/pending-orders/${id}`, { action: "REJECT" });
      setConfirmReject(null);
      load();
    } catch {
      // ignore
    } finally {
      setRejecting(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Confirmed Orders</h1>
          <p className="text-slate-500 text-sm">All auction and fixed-price orders at your hub.</p>
        </div>
        <Link href="/hub-manager/dispatch"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
          Go to Dispatch →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {(["All", "Awaiting Seller", "Accepted"] as Tab[]).map((t) => {
          const count = t === "All" ? orders.length : t === "Awaiting Seller" ? pendingCount : acceptedCount;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition flex items-center gap-2 ${
                tab === t
                  ? t === "Awaiting Seller"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t ? "bg-white/30 text-white" : t === "Awaiting Seller" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
          {tab === "Awaiting Seller" ? "No orders are waiting for seller approval." : "No orders found."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o) => {
            const isReady = ["ACCEPTED", "CONFIRMED"].includes(o.sellerStatus);
            const isPending = o.sellerStatus === "PENDING_SELLER";
            return (
              <div key={o.id} className={`rounded-2xl border bg-white shadow-sm p-5 space-y-4 ${
                isPending ? "border-amber-200" : isReady && !o.dispatched ? "border-emerald-200" : "border-slate-100"
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{o.id}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SELLER_STATUS_CHIP[o.sellerStatus] ?? "bg-slate-100 text-slate-500"}`}>
                        {SELLER_STATUS_LABEL[o.sellerStatus] ?? o.sellerStatus}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {o.dispatched ? "Dispatched" : o.status === "CONFIRMED" ? "Confirmed" : o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-900">{o.product}</p>
                    <p className="text-xs text-slate-500">
                      {o.qty}{o.freeQty > 0 ? ` + ${o.freeQty} free` : ""} · {o.confirmedAt}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Seller card with phone */}
                    <div className={`rounded-xl border px-3 py-2 text-xs space-y-0.5 min-w-[140px] ${isPending ? "border-amber-100 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
                      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Seller</p>
                      <p className="font-semibold text-slate-800">{o.seller}</p>
                      {o.sellerPhone && (
                        <a href={`tel:${o.sellerPhone}`} className="flex items-center gap-1 text-blue-600 font-semibold">
                          <Phone size={10} /> {o.sellerPhone}
                        </a>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs space-y-0.5 min-w-[140px]">
                      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Buyer</p>
                      <p className="font-semibold text-slate-800">{o.buyer}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs">
                    <p className="text-emerald-600">Winning Bid · Total</p>
                    <p className="mt-0.5 font-bold text-emerald-700">{o.winningBid} · {o.totalAmount}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
                    <p className="text-slate-400">Delivery Point</p>
                    <p className="mt-0.5 font-semibold text-slate-700">{o.deliveryPoint}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
                    <p className="text-slate-400">QC Team</p>
                    <p className="mt-0.5 font-semibold text-slate-700">Leader: {o.qcLeader}</p>
                    <p className="text-slate-500">Checker: {o.qcChecker}</p>
                  </div>
                </div>

                <LotLifecycleTracker lotStatus="LIVE" orderStatus={o.status} dispatched={o.dispatched} compact orderOnly />

                {isPending && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <span>⏳</span>
                      <span>Waiting for seller to accept this order. Call the seller to follow up.</span>
                    </div>
                    {confirmReject === o.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-700 font-medium">Confirm reject order {o.id}?</span>
                        <button type="button"
                          onClick={() => void handleReject(o.id)}
                          disabled={rejecting === o.id}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                          {rejecting === o.id ? "Rejecting…" : "Yes, Reject"}
                        </button>
                        <button type="button" onClick={() => setConfirmReject(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmReject(o.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Reject Order
                      </button>
                    )}
                  </div>
                )}

                {isReady && !o.dispatched && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
                    <div className="flex items-center gap-2">
                      <Truck size={13} />
                      <span>Ready for dispatch. Go to the <Link href="/hub-manager/dispatch" className="font-semibold underline">Dispatch page</Link> to assign a truck.</span>
                    </div>
                    <Link
                      href={`/hub-shipment/${o.id}`}
                      target="_blank"
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      Print Shipment PDF
                    </Link>
                  </div>
                )}

                {o.dispatched && (
                  <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
                    <Truck size={13} />
                    <span>Dispatched{o.assignedTruck ? ` on truck ${o.assignedTruck}` : ""} to {o.deliveryPoint}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
