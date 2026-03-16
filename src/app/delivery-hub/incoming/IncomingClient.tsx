"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Phone, Truck, UserCheck } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import DeliveryStepBar from "@/components/DeliveryStepBar";

type HubOrder = {
  id: string; product: string; qty: string; freeQty: number; buyer: string; seller: string;
  deliveryPoint: string; assignedTruck: string | null; status: string;
  loadConfirmed: boolean; dispatched: boolean;
  confirmedAt: string; hubReceivedAt: string | null;
  distributorName: string | null; totalAmount: number;
  buyerPhone: string | null;
  sellerPhone: string | null;
  truckDriverName: string | null;
  truckDriverPhone: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  DISPATCHED:   "border-blue-200 bg-blue-50 text-blue-700",
  HUB_RECEIVED: "border-amber-200 bg-amber-50 text-amber-700",
};
const STATUS_LABELS: Record<string, string> = {
  DISPATCHED:   "In Transit",
  HUB_RECEIVED: "Received at Hub",
};

export default function HubIncomingClient() {
  const [incoming, setIncoming] = useState<HubOrder[]>([]);
  const [needsAssign, setNeedsAssign] = useState<HubOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    Promise.all([
      api.get<HubOrder[]>("/api/delivery-hub/orders?status=DISPATCHED"),
      api.get<HubOrder[]>("/api/delivery-hub/orders?status=HUB_RECEIVED"),
    ])
      .then(([dispatched, hubReceived]) => {
        setIncoming(dispatched);
        setNeedsAssign(hubReceived.filter((o) => !o.distributorName));
      })
      .catch(() => { setIncoming([]); setNeedsAssign([]); })
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  async function receive(orderId: string) {
    setBusy(orderId);
    try {
      await api.patch(`/api/delivery-hub/orders/${orderId}/receive`, {});
      toast.success("Order received at hub!");
      setIncoming((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to receive order");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>;

  const total = incoming.length + needsAssign.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incoming Shipments</h1>
          <p className="text-slate-500 text-sm mt-0.5">Orders arriving at your hub and those waiting for a delivery man.</p>
        </div>
        <div className="flex gap-2">
          {incoming.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center min-w-[72px]">
              <p className="text-2xl font-bold text-blue-700">{incoming.length}</p>
              <p className="text-xs text-blue-500">In Transit</p>
            </div>
          )}
          {needsAssign.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-center min-w-[72px]">
              <p className="text-2xl font-bold text-amber-700">{needsAssign.length}</p>
              <p className="text-xs text-amber-500">Needs Assign</p>
            </div>
          )}
        </div>
      </div>

      {/* Required Actions */}
      {needsAssign.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-4">
          <UserCheck size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">
              {needsAssign.length} order{needsAssign.length > 1 ? "s" : ""} waiting for delivery man assignment
            </p>
            <p className="text-xs text-amber-600 mt-0.5">These orders have been received at the hub but no delivery man has been assigned yet.</p>
            <ul className="mt-2 space-y-0.5">
              {needsAssign.slice(0, 4).map((o) => (
                <li key={o.id} className="text-xs text-amber-700">
                  <span className="font-semibold">{o.id}</span> · {o.product} → {o.deliveryPoint}
                </li>
              ))}
              {needsAssign.length > 4 && (
                <li className="text-xs text-amber-500">+{needsAssign.length - 4} more…</li>
              )}
            </ul>
          </div>
          <Link
            href="/delivery-hub/distribution"
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition"
          >
            Assign Now →
          </Link>
        </div>
      )}

      {total === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Truck size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No incoming shipments</p>
          <p className="mt-1 text-sm text-slate-400">Orders dispatched from the main hub will appear here.</p>
        </div>
      )}

      {/* Arriving — need receipt confirmation */}
      {incoming.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Arriving — Confirm Receipt</p>
          {incoming.map((o) => (
            <OrderCard key={o.id} o={o} busy={busy} onReceive={receive} />
          ))}
        </div>
      )}

      {/* At hub — need delivery man assigned */}
      {needsAssign.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">At Hub — Awaiting Delivery Man Assignment</p>
            <Link href="/delivery-hub/distribution" className="text-xs font-semibold text-amber-700 hover:underline">
              Go to Distribution →
            </Link>
          </div>
          {needsAssign.map((o) => (
            <OrderCard key={o.id} o={o} busy={busy} onReceive={receive} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  o, busy, onReceive,
}: {
  o: HubOrder;
  busy: string | null;
  onReceive: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{o.id}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[o.status] ?? ""}`}>
              {STATUS_LABELS[o.status] ?? o.status}
            </span>
          </div>
          <p className="text-base font-bold text-slate-900">{o.product}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-right">
          <p className="text-[10px] text-slate-400">Total Amount</p>
          <p className="text-sm font-bold text-emerald-700">৳ {o.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-5 pb-4">
        {[
          { label: "Buyer", value: o.buyer },
          { label: "Seller", value: o.seller },
          { label: "Delivery Point", value: o.deliveryPoint },
          { label: "Qty", value: o.qty },
          ...(o.freeQty > 0 ? [{ label: "Free Qty", value: `+ ${o.freeQty}` }] : []),
          { label: "Truck", value: o.assignedTruck ?? "Not assigned yet" },
          { label: "Dispatch", value: o.dispatched ? "Dispatched from source hub" : "Pending dispatch" },
          { label: "Load", value: o.loadConfirmed ? "Loaded on truck" : "Load not confirmed" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-xs font-semibold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Contact details */}
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {o.buyerPhone && (
          <a href={`tel:${o.buyerPhone}`}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition">
            <Phone size={12} /> Buyer: {o.buyer} · {o.buyerPhone}
          </a>
        )}
        {o.sellerPhone && (
          <a href={`tel:${o.sellerPhone}`}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">
            <Phone size={12} /> Seller: {o.seller} · {o.sellerPhone}
          </a>
        )}
        {o.truckDriverName && (
          <a href={o.truckDriverPhone ? `tel:${o.truckDriverPhone}` : undefined}
            className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
            <Truck size={12} /> Driver: {o.truckDriverName}{o.truckDriverPhone ? ` · ${o.truckDriverPhone}` : ""}
          </a>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 pt-3 pb-2">
        <DeliveryStepBar status={o.status} distributorName={o.distributorName} />
      </div>

      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          {o.hubReceivedAt
            ? `Received ${new Date(o.hubReceivedAt).toLocaleDateString()}`
            : `Dispatched ${new Date(o.confirmedAt).toLocaleDateString()}`}
        </p>
        {o.status === "DISPATCHED" && (
          <button
            onClick={() => onReceive(o.id)}
            disabled={busy === o.id}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {busy === o.id ? "Confirming…" : "Confirm Receipt"}
          </button>
        )}
        {o.status === "HUB_RECEIVED" && (
          <Link
            href="/delivery-hub/distribution"
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition"
          >
            <UserCheck size={14} /> Assign Delivery Man
          </Link>
        )}
      </div>
    </div>
  );
}
