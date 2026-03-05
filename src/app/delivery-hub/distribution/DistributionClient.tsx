"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Users, UserCheck } from "lucide-react";
import api from "@/lib/api";

type HubOrder = {
  id: string; product: string; qty: string; buyer: string; seller: string;
  deliveryPoint: string; status: string; confirmedAt: string; hubReceivedAt: string | null;
  distributorName: string | null; distributorPhone: string | null;
  distributorAssignedAt: string | null; totalAmount: number;
};

type DeliveryMan = { id: string; name: string; phone: string; hubId: string | null };

export default function DistributionClient() {
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get<HubOrder[]>("/api/delivery-hub/orders?status=HUB_RECEIVED"),
      api.get<DeliveryMan[]>("/api/delivery-hub/distributors"),
    ])
      .then(([o, d]) => { setOrders(o); setDeliveryMen(d); })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  async function assign(orderId: string) {
    const distId = selected[orderId];
    if (!distId) return;
    const dist = deliveryMen.find((d) => d.id === distId);
    if (!dist) return;
    setBusy(orderId);
    try {
      await api.patch(`/api/delivery-hub/orders/${orderId}/assign`, {
        distributorId: dist.id,
        distributorName: dist.name,
        distributorPhone: dist.phone,
      });
      toast.success(`Assigned to ${dist.name}`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, distributorName: dist.name, distributorPhone: dist.phone, distributorAssignedAt: new Date().toISOString() }
            : o
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}</div>;

  const pending = orders.filter((o) => !o.distributorName);
  const assigned = orders.filter((o) => o.distributorName);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Delivery Man</h1>
          <p className="text-slate-500 text-sm mt-0.5">Orders received at hub — assign a delivery man for last-mile handover.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-amber-700">{pending.length}</p>
            <p className="text-xs text-amber-600">Unassigned</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-emerald-700">{assigned.length}</p>
            <p className="text-xs text-emerald-600">Assigned</p>
          </div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No orders at hub yet</p>
          <p className="mt-1 text-sm text-slate-400">Confirm incoming shipments first to see orders here.</p>
        </div>
      )}

      {/* Pending assignment */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600">Pending Assignment ({pending.length})</h2>
          {pending.map((o) => (
            <div key={o.id} className="rounded-2xl border border-amber-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <span className="font-mono text-xs text-slate-400">{o.id}</span>
                  <p className="text-base font-bold text-slate-900">{o.product}</p>
                  <p className="text-sm text-slate-500">{o.qty} · {o.buyer} → <span className="font-medium text-slate-700">{o.deliveryPoint}</span></p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  At Hub
                </span>
              </div>

              <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-3">
                <select
                  value={selected[o.id] ?? ""}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [o.id]: e.target.value }))}
                  className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">— Select delivery man —</option>
                  {deliveryMen.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} · {d.phone}</option>
                  ))}
                </select>
                <button
                  onClick={() => void assign(o.id)}
                  disabled={busy === o.id || !selected[o.id]}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition"
                >
                  {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                  {busy === o.id ? "Assigning…" : "Assign"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Assigned */}
      {assigned.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Assigned ({assigned.length})</h2>
          {assigned.map((o) => (
            <div key={o.id} className="rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <span className="font-mono text-xs text-slate-400">{o.id}</span>
                  <p className="text-base font-bold text-slate-900">{o.product}</p>
                  <p className="text-sm text-slate-500">{o.qty} · {o.buyer} → <span className="font-medium text-slate-700">{o.deliveryPoint}</span></p>
                  <p className="text-xs font-semibold text-violet-700">
                    Delivery Man: {o.distributorName} {o.distributorPhone ? `· ${o.distributorPhone}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  ✓ Assigned
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
