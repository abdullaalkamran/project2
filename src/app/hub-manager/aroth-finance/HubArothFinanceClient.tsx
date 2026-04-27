"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp, Percent, CheckCircle2, Clock, ShieldCheck,
  ReceiptText, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import api from "@/lib/api";

type Summary = {
  totalOrders: number;
  activeOrders: number;
  settledOrders: number;
  awaitingConfirmation: number;
  totalSales: number;
  totalCommission: number;
  totalNetReceived: number;
  pendingAmount: number;
};

type ArothAccount = {
  arothId: string;
  arothName: string;
  isVerified: boolean;
  commissionRate: number;
  orders: number;
  activeOrders: number;
  awaitingPayment: number;
  totalSales: number;
  totalCommission: number;
  totalNetAmount: number;
  settledOrders: number;
  lastActivity: string | null;
};

type ArothOrder = {
  orderCode: string;
  product: string;
  qty: string;
  totalAmount: number;
  buyerName: string;
  arothId: string | null;
  arothName: string | null;
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

type FinanceData = {
  summary: Summary;
  arothAccounts: ArothAccount[];
  orders: ArothOrder[];
};

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:      { label: "Pending Receipt",  color: "bg-amber-100 text-amber-700"    },
  RECEIVED:     { label: "Received",         color: "bg-blue-100 text-blue-700"      },
  SOLD:         { label: "Sold",             color: "bg-violet-100 text-violet-700"  },
  PAYMENT_SENT: { label: "Payment Sent",     color: "bg-orange-100 text-orange-700"  },
  SETTLED:      { label: "Settled",          color: "bg-emerald-100 text-emerald-700"},
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-BD", { dateStyle: "medium" }) : "—";

export default function HubArothFinanceClient() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAroth, setExpandedAroth] = useState<string | null>(null);
  const [filterAroth, setFilterAroth] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = useCallback(() =>
    api.get<FinanceData>("/api/hub-manager/aroth-finance")
      .then(setData)
      .finally(() => setLoading(false)),
    []
  );

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const { summary, arothAccounts, orders } = data!;

  const filteredOrders = orders.filter((o) => {
    const matchAroth = filterAroth === "all" || o.arothId === filterAroth;
    const matchStatus = filterStatus === "all" || o.arothStatus === filterStatus;
    return matchAroth && matchStatus;
  });

  const arothOrdersMap: Record<string, ArothOrder[]> = {};
  for (const o of orders) {
    const id = o.arothId ?? "unknown";
    if (!arothOrdersMap[id]) arothOrdersMap[id] = [];
    arothOrdersMap[id].push(o);
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Aroth Finance</h1>
        <p className="text-slate-500">Accounts, order details, and financial overview for all aroths in your hub.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Total Sales</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-800">{bdt(summary.totalSales)}</p>
          <p className="mt-0.5 text-xs text-emerald-600">{summary.settledOrders} settled orders</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600">
            <Percent size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Commission Earned</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-800">{bdt(summary.totalCommission)}</p>
          <p className="mt-0.5 text-xs text-violet-600">From settled orders only</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <ReceiptText size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Net Received</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-800">{bdt(summary.totalNetReceived)}</p>
          <p className="mt-0.5 text-xs text-blue-600">After commission deduction</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600">
            <Clock size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Pending Confirmation</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-800">{bdt(summary.pendingAmount)}</p>
          <p className="mt-0.5 text-xs text-orange-600">{summary.awaitingConfirmation} payments awaiting</p>
        </div>
      </div>

      {/* Aroth Accounts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Aroth Accounts</h2>
        </div>

        {arothAccounts.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">No aroth accounts found for your hub.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {arothAccounts.map((a) => {
              const isOpen = expandedAroth === a.arothId;
              const subOrders = arothOrdersMap[a.arothId] ?? [];
              return (
                <div key={a.arothId} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  {/* Account header */}
                  <button
                    type="button"
                    onClick={() => setExpandedAroth(isOpen ? null : a.arothId)}
                    className="w-full flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                        {a.arothName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{a.arothName}</p>
                          {a.isVerified ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <ShieldCheck size={9} /> Verified
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              Unverified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{a.commissionRate}% commission · {a.orders} total orders</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total Sales</p>
                        <p className="font-bold text-slate-800">{bdt(a.totalSales)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Commission</p>
                        <p className="font-bold text-violet-700">{bdt(a.totalCommission)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Net Received</p>
                        <p className="font-bold text-emerald-700">{bdt(a.totalNetAmount)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        {a.awaitingPayment > 0 && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {a.awaitingPayment} pending
                          </span>
                        )}
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                  </button>

                  {/* Per-aroth orders */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {subOrders.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400">No orders yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[680px] text-sm">
                            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              <tr>
                                <th className="px-4 py-2.5 text-left">Order / Product</th>
                                <th className="px-4 py-2.5 text-left">Buyer</th>
                                <th className="px-4 py-2.5 text-left">Status</th>
                                <th className="px-4 py-2.5 text-right">Sale Amount</th>
                                <th className="px-4 py-2.5 text-right">Commission</th>
                                <th className="px-4 py-2.5 text-right">Net</th>
                                <th className="px-4 py-2.5 text-left">Timeline</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {subOrders.map((o) => {
                                const badge = STATUS[o.arothStatus ?? "PENDING"] ?? { label: o.arothStatus, color: "bg-slate-100 text-slate-600" };
                                return (
                                  <tr key={o.orderCode} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-slate-800">{o.product}</p>
                                      <p className="font-mono text-[10px] text-slate-400">{o.orderCode}</p>
                                      <p className="text-[10px] text-slate-400">{o.qty} · Buyer paid {bdt(o.totalAmount)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">{o.buyerName}</td>
                                    <td className="px-4 py-3">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>{badge.label}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                      {o.arothSaleAmount != null ? bdt(o.arothSaleAmount) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-violet-700">
                                      {o.arothCommission != null ? bdt(o.arothCommission) : "—"}
                                      {o.arothCommissionRate != null && (
                                        <span className="ml-1 text-[10px] text-slate-400">({o.arothCommissionRate}%)</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">
                                      {o.arothNetAmount != null ? bdt(o.arothNetAmount) : "—"}
                                    </td>
                                    <td className="px-4 py-3 space-y-0.5 text-[10px] text-slate-400">
                                      <p>Routed: {fmt(o.confirmedAt)}</p>
                                      {o.arothPaymentSentAt && <p>Paid: {fmt(o.arothPaymentSentAt)}</p>}
                                      {o.arothSettledAt && (
                                        <p className="font-semibold text-emerald-600 flex items-center gap-1">
                                          <CheckCircle2 size={9} /> Settled: {fmt(o.arothSettledAt)}
                                        </p>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* All Orders Table */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText size={16} className="text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">All Orders</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterAroth}
              onChange={(e) => setFilterAroth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-amber-400 transition"
            >
              <option value="all">All Aroths</option>
              {arothAccounts.map((a) => (
                <option key={a.arothId} value={a.arothId}>{a.arothName}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-amber-400 transition"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">No orders match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Order / Product</th>
                  <th className="px-4 py-3 text-left">Aroth</th>
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Buyer Paid</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Net to Hub</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map((o) => {
                  const badge = STATUS[o.arothStatus ?? "PENDING"] ?? { label: o.arothStatus, color: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={o.orderCode} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{o.product}</p>
                        <p className="font-mono text-[10px] text-slate-400">{o.orderCode}</p>
                        <p className="text-[10px] text-slate-400">{o.qty}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{o.arothName ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{o.buyerName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{bdt(o.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {o.arothSaleAmount != null ? bdt(o.arothSaleAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-700">
                        {o.arothCommission != null ? bdt(o.arothCommission) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        {o.arothNetAmount != null ? bdt(o.arothNetAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <p>{fmt(o.confirmedAt)}</p>
                        {o.arothSettledAt && (
                          <p className="text-emerald-600 font-semibold">✓ {fmt(o.arothSettledAt)}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-100 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-500">
                    {filteredOrders.length} orders shown
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">
                    {bdt(filteredOrders.reduce((s, o) => s + (o.arothSaleAmount ?? 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-violet-700">
                    {bdt(filteredOrders.reduce((s, o) => s + (o.arothCommission ?? 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                    {bdt(filteredOrders.reduce((s, o) => s + (o.arothNetAmount ?? 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
