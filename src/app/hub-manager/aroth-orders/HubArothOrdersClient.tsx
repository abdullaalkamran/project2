"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type ArothOrder = {
  orderCode: string;
  product: string;
  qty: string;
  buyerName: string;
  arothName: string | null;
  arothHubId: string | null;
  arothStatus: string | null;
  arothSaleAmount: number | null;
  arothCommissionRate: number | null;
  arothCommission: number | null;
  arothNetAmount: number | null;
  arothPaymentSentAt: string | null;
  arothPaymentConfirmedAt: string | null;
  arothSettledAt: string | null;
  confirmedAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pending Receipt",   color: "bg-amber-100 text-amber-700"   },
  RECEIVED:      { label: "Received",           color: "bg-blue-100 text-blue-700"     },
  SOLD:          { label: "Sold",               color: "bg-violet-100 text-violet-700" },
  PAYMENT_SENT:  { label: "Payment Sent",       color: "bg-orange-100 text-orange-700" },
  SETTLED:       { label: "Settled",            color: "bg-emerald-100 text-emerald-700" },
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-BD", { dateStyle: "medium" });

export default function HubArothOrdersClient() {
  const [orders, setOrders] = useState<ArothOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() =>
    api.get<ArothOrder[]>("/api/hub-manager/aroth-orders")
      .then(setOrders)
      .finally(() => setLoading(false)),
    []
  );

  useEffect(() => { void load(); }, [load]);

  async function confirmPayment(orderCode: string) {
    setBusy(orderCode);
    try {
      await api.patch(`/api/hub-manager/aroth-orders/${orderCode}/confirm-payment`, {});
      await load();
    } finally {
      setBusy(null);
    }
  }

  const pending   = orders.filter((o) => o.arothStatus !== "SETTLED");
  const settled   = orders.filter((o) => o.arothStatus === "SETTLED");
  const awaitingPayment = orders.filter((o) => o.arothStatus === "PAYMENT_SENT").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Aroth Orders</h1>
          <p className="text-slate-500">Monitor and confirm payment from aroths in your hub.</p>
        </div>
        {awaitingPayment > 0 && (
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-orange-700">{awaitingPayment}</p>
            <p className="text-xs text-orange-600">Awaiting Confirmation</p>
          </div>
        )}
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">No aroth-routed orders yet.</p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-left">Aroth</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-right">Net to Hub</th>
                  <th className="px-4 py-3 text-left">Payment Sent</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pending.map((o) => {
                  const badge = STATUS_LABELS[o.arothStatus ?? "PENDING"] ?? { label: o.arothStatus, color: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={o.orderCode} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{o.product}</p>
                        <p className="font-mono text-[10px] text-slate-400">{o.orderCode}</p>
                        <p className="text-[10px] text-slate-400">{o.qty}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.buyerName}</td>
                      <td className="px-4 py-3 text-slate-600">{o.arothName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {o.arothSaleAmount != null ? bdt(o.arothSaleAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-700">
                        {o.arothNetAmount != null ? bdt(o.arothNetAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {o.arothPaymentSentAt ? fmt(o.arothPaymentSentAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {o.arothStatus === "PAYMENT_SENT" && (
                          <button
                            onClick={() => confirmPayment(o.orderCode)}
                            disabled={busy === o.orderCode}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                          >
                            {busy === o.orderCode ? "Confirming…" : "Confirm Payment"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Settled</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-left">Aroth</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Net Received</th>
                  <th className="px-4 py-3 text-left">Settled On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {settled.map((o) => (
                  <tr key={o.orderCode} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{o.product}</p>
                      <p className="font-mono text-[10px] text-slate-400">{o.orderCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.buyerName}</td>
                    <td className="px-4 py-3 text-slate-600">{o.arothName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{bdt(o.arothSaleAmount ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{bdt(o.arothCommission ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-violet-700">{bdt(o.arothNetAmount ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.arothSettledAt ? fmt(o.arothSettledAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
