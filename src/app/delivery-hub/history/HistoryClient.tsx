"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import api from "@/lib/api";

type HubOrder = {
  id: string; product: string; qty: string; freeQty: number; buyer: string; seller: string;
  deliveryPoint: string; status: string; distributorName: string | null;
  confirmedAt: string; hubReceivedAt: string | null;
  pickedUpFromHubAt: string | null; arrivedAt: string | null;
  totalAmount: number; winningBid: number;
};

const STATUS_COLORS: Record<string, string> = {
  ARRIVED:  "border-teal-200 bg-teal-50 text-teal-700",
  PICKED_UP:"border-emerald-200 bg-emerald-50 text-emerald-700",
};
const STATUS_LABELS: Record<string, string> = {
  ARRIVED:  "Arrived at Point",
  PICKED_UP:"Picked Up",
};

export default function HubDeliveryHistoryClient() {
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<HubOrder[]>("/api/delivery-hub/orders?status=history")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-3">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-100" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  const q = search.trim().toLowerCase();
  const filtered = q
    ? orders.filter((o) =>
        `${o.product} ${o.buyer} ${o.seller} ${o.id} ${o.deliveryPoint} ${o.distributorName ?? ""}`.toLowerCase().includes(q)
      )
    : orders;

  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const arrived   = orders.filter((o) => o.status === "ARRIVED").length;
  const pickedUp  = orders.filter((o) => o.status === "PICKED_UP").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery History</h1>
          <p className="text-slate-500 text-sm mt-0.5">All orders that have been delivered or arrived at the delivery point.</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-teal-700">{arrived}</p>
            <p className="text-xs text-teal-600">Arrived</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-emerald-700">{pickedUp}</p>
            <p className="text-xs text-emerald-600">Picked Up</p>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-emerald-700">Total Delivered Value</p>
          <p className="text-xl font-bold text-emerald-800">৳ {totalValue.toLocaleString()}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, buyer, seller, order ID…"
          className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none shadow-sm"
        />
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No completed deliveries yet</p>
          <p className="mt-1 text-sm text-slate-400">Orders will appear here once they arrive at the delivery point.</p>
        </div>
      )}

      {filtered.length === 0 && orders.length > 0 && (
        <p className="text-center text-sm text-slate-400 py-8">No orders match your search.</p>
      )}

      {/* Product list table */}
      {filtered.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {filtered.length} order{filtered.length !== 1 ? "s" : ""}
              {q ? ` matching "${search}"` : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Order", "Product", "Qty", "Buyer", "Seller", "Delivery Point", "Distributor", "Hub Received", "Arrived", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{o.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{o.product}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {o.qty}{o.freeQty > 0 ? <span className="ml-1 text-xs font-semibold text-emerald-600">+{o.freeQty} free</span> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{o.buyer}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{o.seller}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[140px] truncate">{o.deliveryPoint}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {o.distributorName ?? <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {o.hubReceivedAt ? new Date(o.hubReceivedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {o.arrivedAt ? new Date(o.arrivedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">
                      ৳ {o.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[o.status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">{filtered.length} orders shown</p>
            <p className="text-sm font-bold text-emerald-700">
              Total: ৳ {filtered.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
