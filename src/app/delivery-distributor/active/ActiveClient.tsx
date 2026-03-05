"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Navigation, CheckCircle2, Download } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

type Order = {
  id: string; product: string; qty: string; buyer: string;
  deliveryPoint: string; status: string; totalAmount: number;
  pickedUpFromHubAt: string | null; arrivedAt: string | null;
};

export default function ActiveDeliveriesClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api.get<Order[]>("/api/delivery-distributor/orders?status=active")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  async function confirmArrival(orderId: string) {
    setBusy(orderId);
    try {
      await api.patch(`/api/delivery-distributor/orders/${orderId}/deliver`, {});
      toast.success("Arrival confirmed! Order marked as arrived at delivery point.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm arrival");
    } finally {
      setBusy(null);
    }
  }

  async function markDelivered(orderId: string) {
    setBusy(orderId);
    try {
      await api.patch(`/api/delivery-distributor/orders/${orderId}/complete`, {});
      toast.success("Order marked as delivered! Buyer and seller have been notified.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as delivered");
    } finally {
      setBusy(null);
    }
  }

  const inTransit = orders.filter((o) => o.status === "OUT_FOR_DELIVERY");
  const arrived   = orders.filter((o) => o.status === "ARRIVED");

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Deliveries</h1>
          <p className="text-slate-500 text-sm mt-0.5">Orders in transit and arrived at delivery point.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-2 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-violet-700">{inTransit.length}</p>
            <p className="text-xs text-violet-500">In Transit</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center min-w-[80px]">
            <p className="text-2xl font-bold text-emerald-700">{arrived.length}</p>
            <p className="text-xs text-emerald-500">Arrived</p>
          </div>
        </div>
      </div>

      {/* Arrived — waiting for handover */}
      {arrived.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            Arrived at Delivery Point — Hand Over to Buyer
          </h2>
          {arrived.map((o) => (
            <div key={o.id} className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{o.id}</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Arrived
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">{o.product}</p>
                  <p className="text-sm text-slate-500">{o.qty}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-500">Deliver to: </span>
                  <span className="font-semibold text-slate-800">{o.deliveryPoint}</span>
                  <span className="text-slate-400 ml-2">· Buyer: {o.buyer}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                {o.arrivedAt && (
                  <p className="text-xs text-slate-400">
                    Arrived {new Date(o.arrivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <button
                  onClick={() => void markDelivered(o.id)}
                  disabled={busy === o.id}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {busy === o.id ? "Processing…" : "Mark Delivered to Buyer"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* In Transit */}
      {inTransit.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-violet-600">
            In Transit — Confirm Arrival
          </h2>
          {inTransit.map((o) => (
            <div key={o.id} className="rounded-2xl border border-violet-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{o.id}</span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                      Out for Delivery
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">{o.product}</p>
                  <p className="text-sm text-slate-500">{o.qty}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-500">Deliver to: </span>
                  <span className="font-semibold text-slate-800">{o.deliveryPoint}</span>
                  <span className="text-slate-400 ml-2">· Buyer: {o.buyer}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
                {o.pickedUpFromHubAt && (
                  <p className="text-xs text-slate-400">
                    Picked up {new Date(o.pickedUpFromHubAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <button
                  onClick={() => void confirmArrival(o.id)}
                  disabled={busy === o.id}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
                >
                  {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  {busy === o.id ? "Confirming…" : "Confirm Arrival"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Navigation size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No active deliveries</p>
          <p className="mt-1 text-sm text-slate-400">Pick up orders from the hub to start delivering.</p>
        </div>
      )}
    </div>
  );
}
