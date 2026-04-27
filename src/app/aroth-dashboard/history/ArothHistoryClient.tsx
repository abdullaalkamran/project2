"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type ArothOrder = {
  orderCode: string;
  product: string;
  qty: string;
  buyerName: string;
  arothStatus: string | null;
  arothSaleAmount: number | null;
  arothCommissionRate: number | null;
  arothCommission: number | null;
  arothNetAmount: number | null;
  arothSettledAt: string | null;
  confirmedAt: string;
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-BD", { dateStyle: "medium" });

export default function ArothHistoryClient() {
  const [orders, setOrders] = useState<ArothOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ArothOrder[]>("/api/aroth-dashboard/orders")
      .then((all) => setOrders(all.filter((o) => o.arothStatus === "SETTLED")))
      .finally(() => setLoading(false));
  }, []);

  const totalSale = orders.reduce((s, o) => s + (o.arothSaleAmount ?? 0), 0);
  const totalCommission = orders.reduce((s, o) => s + (o.arothCommission ?? 0), 0);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Settled History</h1>
        <p className="text-slate-500">All orders confirmed settled by the hub.</p>
      </div>

      {orders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Sales</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{bdt(totalSale)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Commission Earned</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{bdt(totalCommission)}</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">No settled orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Buyer</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-right">Sale Amount</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Net Sent</th>
                <th className="px-4 py-3 text-left">Settled On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o) => (
                <tr key={o.orderCode} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{o.product}</p>
                    <p className="font-mono text-[10px] text-slate-400">{o.orderCode}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{o.buyerName}</td>
                  <td className="px-4 py-3 text-slate-500">{o.qty}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{bdt(o.arothSaleAmount ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{bdt(o.arothCommission ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-700">{bdt(o.arothNetAmount ?? 0)}</td>
                  <td className="px-4 py-3 text-slate-500">{o.arothSettledAt ? fmt(o.arothSettledAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
