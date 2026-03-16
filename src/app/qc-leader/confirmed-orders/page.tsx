"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { ChevronDown, ChevronUp } from "lucide-react";
import PreDispatchGate, { gateReadyForDispatch, roleActionNeeded, type GateData } from "@/components/PreDispatchGate";

type Truck = {
  id: string;
  reg: string;
  type: string;
  capacityKg: number;
  status: string;
  driverName: string | null;
};

type DispatchOrder = {
  id: string;
  lotId: string;
  product: string;
  qty: string;
  freeQty: number;
  seller: string;
  buyer: string;
  deliveryPoint: string;
  winningBid: string;
  totalAmount: string;
  confirmedAt: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  status: string;
  sellerStatus: string;
  preDispatch: GateData;
  packetQr: { total: number; scanned: number };
};

const STATUS_CHIP: Record<string, string> = {
  CONFIRMED:  "bg-emerald-50 text-emerald-700",
  DISPATCHED: "bg-blue-50 text-blue-700",
  PICKED_UP:  "bg-slate-100 text-slate-500",
};

export default function QCLeaderConfirmedOrdersPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<Record<string, string>>({});
  const [gateOpen, setGateOpen] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    const [ordersData, trucksData] = await Promise.all([
      api.get<DispatchOrder[]>("/api/flow/dispatch/orders"),
      api.get<Truck[]>("/api/flow/trucks"),
    ]);
    setOrders(ordersData ?? []);
    setTrucks(trucksData ?? []);
  }, []);

  useEffect(() => {
    void loadData()
      .catch(() => {})
      .finally(() => setLoading(false));
    const id = setInterval(() => {
      void loadData().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [loadData]);

  const availableTrucks = trucks.filter((t) => t.status === "Available");

  async function assignTruck(orderId: string) {
    const truckId = selectedTruck[orderId];
    if (!truckId) return;
    setBusy(orderId);
    setAssignError((p) => ({ ...p, [orderId]: "" }));
    try {
      const updated = await api.patch<DispatchOrder>(`/api/flow/dispatch/orders/${orderId}`, { assignedTruck: truckId });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } catch (e) {
      setAssignError((p) => ({ ...p, [orderId]: e instanceof Error ? e.message : "Failed to assign truck" }));
    } finally {
      setBusy(null);
    }
  }

  async function confirmLoad(orderId: string) {
    setBusy(orderId);
    try {
      const updated = await api.patch<DispatchOrder>(`/api/flow/dispatch/orders/${orderId}`, { loadConfirmed: true });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } finally {
      setBusy(null);
    }
  }

  async function dispatchOrder(orderId: string) {
    setBusy(orderId);
    try {
      const updated = await api.patch<DispatchOrder>(`/api/flow/dispatch/orders/${orderId}`, { dispatched: true });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } finally {
      setBusy(null);
    }
  }

  const pending = orders.filter((o) => roleActionNeeded(o.preDispatch, "qc_leader")).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Confirmed Orders</h1>
          <p className="text-slate-500">Complete gate steps, generate QR, and assign trucks for dispatch.</p>
        </div>
        {pending > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-teal-700">{pending}</p>
            <p className="text-xs text-teal-600">Awaiting your action</p>
          </div>
        )}
      </div>

      {pending > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
            <span className="text-sm font-bold text-teal-600">{pending}</span>
          </div>
          <div>
            <p className="font-semibold text-teal-800">{pending} order{pending > 1 ? "s" : ""} need your action</p>
            <p className="mt-0.5 text-sm text-teal-600">
              Complete weight/quality check, set truck price, and give final confirmation.
            </p>
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
          <p className="font-medium text-slate-500">No confirmed orders yet.</p>
          <p className="mt-1 text-sm text-slate-400">Orders appear here once sellers accept bids.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((o) => {
          const pd = o.preDispatch;
          const myActionNeeded = roleActionNeeded(pd, "qc_leader");
          const gateReady = gateReadyForDispatch(pd);
          const qrReady = (o.packetQr?.total ?? 0) > 0;
          const isBusy = busy === o.id;

          // Truck assignment step index
          const truckStep = o.dispatched ? 3 : o.loadConfirmed ? 2 : o.assignedTruck ? 1 : 0;

          return (
            <div
              key={o.id}
              className={`rounded-2xl border bg-white shadow-sm ${myActionNeeded ? "border-teal-200" : "border-slate-100"}`}
            >
              {/* Order header */}
              <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{o.id}</span>
                    <span className="font-mono text-xs text-slate-400">{o.lotId}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {o.status}
                    </span>
                    {myActionNeeded && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                        ACTION NEEDED
                      </span>
                    )}
                    {o.dispatched && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        ✓ Dispatched
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900">{o.product}</p>
                  <p className="text-xs text-slate-500">
                    {o.qty}{o.freeQty > 0 && <span className="ml-1 font-semibold text-emerald-600">+ {o.freeQty} free</span>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                    <p className="text-[10px] text-slate-400 font-medium">Winning Bid</p>
                    <p className="text-sm font-bold text-emerald-700">{o.winningBid}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                    <p className="text-[10px] text-slate-400 font-medium">Total</p>
                    <p className="text-sm font-bold text-slate-800">{o.totalAmount}</p>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="flex flex-wrap gap-3 px-5 pb-4">
                {[
                  { label: "Seller", value: o.seller },
                  { label: "Buyer", value: o.buyer },
                  { label: "Delivery Point", value: o.deliveryPoint },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="text-xs font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* Pre-dispatch gate — collapsible */}
              {(() => {
                const isGateOpen = o.id in gateOpen ? gateOpen[o.id] : myActionNeeded;
                return (
                  <div className="mx-5 mb-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setGateOpen((p) => ({ ...p, [o.id]: !isGateOpen }))}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pre-Dispatch Gate</span>
                        {gateReady ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ Complete</span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">Action Required</span>
                        )}
                      </div>
                      {isGateOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>
                    {isGateOpen && (
                      <div className="border-t border-slate-200 p-4">
                        <PreDispatchGate
                          orderCode={o.id}
                          orderedQty={o.qty}
                          role="qc_leader"
                          initialData={o.preDispatch}
                          onUpdate={(updated) =>
                            setOrders((prev) =>
                              prev.map((order) => (order.id === o.id ? { ...order, preDispatch: updated } : order))
                            )
                          }
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs">
                          <p className="text-violet-700">
                            Packet QR: <span className="font-semibold">{o.packetQr?.total ?? 0}</span> generated,{" "}
                            scanned <span className="font-semibold">{o.packetQr?.scanned ?? 0}</span>
                          </p>
                          <a href={`/hub-shipment/${o.id}`} target="_blank" rel="noreferrer"
                            className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-700 hover:bg-violet-100 transition">
                            Generate / Print Packet QR →
                          </a>
                        </div>
                        {(!gateReady || !qrReady) && (
                          <p className="mt-2 text-[11px] text-amber-700">
                            Complete all 4 gate steps and generate packet QR to unlock truck assignment.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Truck assignment — shown once gate + QR are ready */}
              <div className="border-t border-slate-100 px-5 py-4">
                {!gateReady || !qrReady ? (
                  <p className="text-[11px] text-amber-700">
                    Complete all 4 gate steps and generate packet QR to unlock truck assignment.
                  </p>
                ) : (
                  <>
                    {truckStep === 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Assign Truck</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={selectedTruck[o.id] ?? ""}
                            onChange={(e) => setSelectedTruck((p) => ({ ...p, [o.id]: e.target.value }))}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 min-w-[200px]"
                          >
                            <option value="">— Select a truck —</option>
                            {availableTrucks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.id} · {t.reg} · {t.type} ({t.capacityKg} kg){t.driverName ? ` · ${t.driverName}` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => assignTruck(o.id)}
                            disabled={isBusy || !selectedTruck[o.id]}
                            className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-40 transition"
                          >
                            {isBusy ? "Assigning…" : "Assign Truck"}
                          </button>
                        </div>
                        {assignError[o.id] && (
                          <p className="text-xs text-red-600">{assignError[o.id]}</p>
                        )}
                      </div>
                    )}

                    {truckStep === 1 && (
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-slate-500">
                          Truck <span className="font-semibold text-slate-800">{o.assignedTruck}</span> assigned.
                        </p>
                        <button
                          onClick={() => confirmLoad(o.id)}
                          disabled={isBusy}
                          className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition"
                        >
                          {isBusy ? "Confirming…" : "Confirm Goods Loaded"}
                        </button>
                      </div>
                    )}

                    {truckStep === 2 && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => dispatchOrder(o.id)}
                          disabled={isBusy}
                          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                        >
                          {isBusy ? "Dispatching…" : "Dispatch Now →"}
                        </button>
                        <p className="text-xs text-slate-400">
                          Send truck to <span className="font-medium text-slate-600">{o.deliveryPoint}</span>.
                        </p>
                      </div>
                    )}

                    {truckStep === 3 && (
                      <p className="text-xs font-semibold text-emerald-700">
                        ✓ Dispatched — truck en route to {o.deliveryPoint}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
