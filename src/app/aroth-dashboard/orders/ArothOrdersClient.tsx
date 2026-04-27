"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type ArothOrder = {
  orderCode: string;
  product: string;
  qty: string;
  buyerName: string;
  sellerName: string;
  winningBid: number;
  totalAmount: number;
  confirmedAt: string;
  arothStatus: string | null;
  arothSaleAmount: number | null;
  arothCommissionRate: number | null;
  arothCommission: number | null;
  arothNetAmount: number | null;
  arothPaymentSentAt: string | null;
  arothPaymentConfirmedAt: string | null;
  arothSettledAt: string | null;
  arothHubId: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pending Receipt",     color: "bg-amber-100 text-amber-700"   },
  RECEIVED:      { label: "Received",             color: "bg-blue-100 text-blue-700"     },
  SOLD:          { label: "Sold — Payment Due",   color: "bg-violet-100 text-violet-700" },
  PAYMENT_SENT:  { label: "Payment Sent",         color: "bg-orange-100 text-orange-700" },
  SETTLED:       { label: "Settled",              color: "bg-emerald-100 text-emerald-700" },
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-BD", { dateStyle: "medium" });

export default function ArothOrdersClient() {
  const [orders, setOrders] = useState<ArothOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [saleInputs, setSaleInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api.get<ArothOrder[]>("/api/aroth-dashboard/orders")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function doAction(orderCode: string, path: string, body?: object) {
    setBusy(orderCode);
    setError(null);
    try {
      await api.patch(`/api/aroth-dashboard/orders/${orderCode}/${path}`, body ?? {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const active = orders.filter((o) => o.arothStatus !== "SETTLED");
  const settled = orders.filter((o) => o.arothStatus === "SETTLED");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  function OrderCard({ order }: { order: ArothOrder }) {
    const status = order.arothStatus ?? "PENDING";
    const badge = STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
    const isBusy = busy === order.orderCode;
    const saleVal = saleInputs[order.orderCode] ?? "";

    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{order.orderCode}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-base font-bold text-slate-900">{order.product}</p>
            <p className="text-xs text-slate-500">{order.qty} · Buyer: {order.buyerName}</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>Winning bid: <span className="font-semibold text-slate-700">{bdt(order.winningBid)}</span></p>
            <p>Ordered: {fmt(order.confirmedAt)}</p>
          </div>
        </div>

        {/* Financial summary if sold */}
        {order.arothSaleAmount != null && (
          <div className="mx-5 mb-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <div>
              <p className="text-slate-400">Sale Amount</p>
              <p className="font-bold text-slate-900">{bdt(order.arothSaleAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Commission ({order.arothCommissionRate}%)</p>
              <p className="font-bold text-emerald-700">{bdt(order.arothCommission ?? 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Net to Platform</p>
              <p className="font-bold text-violet-700">{bdt(order.arothNetAmount ?? 0)}</p>
            </div>
          </div>
        )}

        {/* Action area */}
        <div className="border-t border-slate-100 px-5 py-3">
          {status === "PENDING" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => doAction(order.orderCode, "receive")}
                disabled={isBusy}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                {isBusy ? "Marking…" : "Mark Received"}
              </button>
              <p className="text-xs text-slate-400">Confirm you have received the goods.</p>
            </div>
          )}

          {status === "RECEIVED" && (
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                placeholder="Sale amount (৳)"
                value={saleVal}
                onChange={(e) => setSaleInputs((p) => ({ ...p, [order.orderCode]: e.target.value }))}
                className="w-44 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <button
                onClick={() => doAction(order.orderCode, "sold", { saleAmount: parseFloat(saleVal) })}
                disabled={isBusy || !saleVal || parseFloat(saleVal) <= 0}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
              >
                {isBusy ? "Saving…" : "Report Sale"}
              </button>
              <p className="text-xs text-slate-400">Enter the amount you sold it for in the local market.</p>
            </div>
          )}

          {status === "SOLD" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => doAction(order.orderCode, "payment-sent")}
                disabled={isBusy}
                className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
              >
                {isBusy ? "Sending…" : "Confirm Payment Sent"}
              </button>
              <p className="text-xs text-slate-400">
                Send <span className="font-semibold text-slate-700">{bdt(order.arothNetAmount ?? 0)}</span> to the hub bank account and click to confirm.
              </p>
            </div>
          )}

          {status === "PAYMENT_SENT" && (
            <p className="text-xs font-medium text-orange-600">
              Payment sent on {order.arothPaymentSentAt ? fmt(order.arothPaymentSentAt) : "—"} — awaiting hub confirmation.
            </p>
          )}

          {status === "SETTLED" && (
            <p className="text-xs font-semibold text-emerald-700">
              ✓ Settled on {order.arothSettledAt ? fmt(order.arothSettledAt) : "—"}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500">Orders routed to you by buyers for local market sale.</p>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      )}

      {active.length === 0 && settled.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="font-medium text-slate-500">No orders routed to you yet.</p>
          <p className="mt-1 text-sm text-slate-400">Buyers will route orders here after winning an auction.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active Orders</h2>
          {active.map((o) => <OrderCard key={o.orderCode} order={o} />)}
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recently Settled</h2>
          {settled.slice(0, 5).map((o) => <OrderCard key={o.orderCode} order={o} />)}
        </section>
      )}
    </div>
  );
}
