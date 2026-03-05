"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

type Truck = {
  id: string;        // truckCode
  reg: string;
  type: string;
  capacityKg: number;
  status: string;
  driverName: string | null;
  driverPhone: string | null;
};

type DispatchOrder = {
  id: string;        // orderCode
  lotId: string;
  product: string;
  qty: string;
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
  preDispatch: {
    physicallyReceived: boolean;
    hubManagerConfirmed: boolean;
    qcLeadConfirmed: boolean;
    qualityChecked: boolean;
    packetQty: number;
    grossWeightKg: number;
  };
  packetQr: {
    total: number;
    scanned: number;
  };
};

type PreDispatchForm = {
  physicallyReceived: boolean;
  hubManagerConfirmed: boolean;
  qcLeadConfirmed: boolean;
  qualityChecked: boolean;
  packetQty: string;
  grossWeightKg: string;
};

// ─── Mini step progress inside each order card ─────────────────────────────────

const LOAD_STEPS = ["Truck Assigned", "Load Ready", "Dispatched"];

function loadStep(order: DispatchOrder): number {
  if (order.dispatched) return 3;
  if (order.loadConfirmed) return 2;
  if (order.assignedTruck) return 1;
  return 0;
}

function LoadProgress({ order }: { order: DispatchOrder }) {
  const current = loadStep(order);
  return (
    <div className="flex w-full items-start">
      {LOAD_STEPS.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < current || (step === 3 && current === 3);
        const isCurrent = step === current && current < 3;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={`h-0.5 flex-1 ${step <= current ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-amber-400 text-white ring-2 ring-amber-200 ring-offset-1"
                      : "border-2 border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isCompleted ? "✓" : step}
              </div>
              {i < LOAD_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 ${step < current ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </div>
            <p
              className={`mt-1 text-center text-[9px] font-medium leading-tight ${
                isCompleted
                  ? "text-emerald-600"
                  : isCurrent
                    ? "text-amber-700 font-semibold"
                    : "text-slate-400"
              }`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DispatchClient() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [preForm, setPreForm] = useState<Record<string, PreDispatchForm>>({});
  const [gateSaving, setGateSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      api.get<DispatchOrder[]>("/api/flow/dispatch/orders"),
      api.get<Truck[]>("/api/flow/trucks"),
    ])
      .then(([ordersData, trucksData]) => {
        setOrders(ordersData ?? []);
        setTrucks(trucksData ?? []);
        const nextForm: Record<string, PreDispatchForm> = {};
        (ordersData ?? []).forEach((o) => {
          nextForm[o.id] = {
            physicallyReceived: o.preDispatch?.physicallyReceived ?? false,
            hubManagerConfirmed: o.preDispatch?.hubManagerConfirmed ?? false,
            qcLeadConfirmed: o.preDispatch?.qcLeadConfirmed ?? false,
            qualityChecked: o.preDispatch?.qualityChecked ?? false,
            packetQty: String(o.preDispatch?.packetQty ?? 0),
            grossWeightKg: String(o.preDispatch?.grossWeightKg ?? 0),
          };
        });
        setPreForm(nextForm);
      })
      .finally(() => setLoading(false));
  }, []);

  const availableTrucks = trucks.filter((t) => t.status === "Available");

  async function assignTruck(orderId: string) {
    const truckId = selectedTruck[orderId];
    if (!truckId) return;
    setBusy(orderId);
    try {
      const updated = await api.patch<DispatchOrder>(
        `/api/flow/dispatch/orders/${orderId}`,
        { assignedTruck: truckId }
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } finally {
      setBusy(null);
    }
  }

  async function confirmLoad(orderId: string) {
    setBusy(orderId);
    try {
      const updated = await api.patch<DispatchOrder>(
        `/api/flow/dispatch/orders/${orderId}`,
        { loadConfirmed: true }
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } finally {
      setBusy(null);
    }
  }

  async function dispatchOrder(orderId: string) {
    setBusy(orderId);
    try {
      const updated = await api.patch<DispatchOrder>(
        `/api/flow/dispatch/orders/${orderId}`,
        { dispatched: true }
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    } finally {
      setBusy(null);
    }
  }

  async function savePreDispatch(orderId: string, form?: PreDispatchForm) {
    const effectiveForm = form ?? preForm[orderId];
    if (!effectiveForm) return;
    setGateSaving((prev) => ({ ...prev, [orderId]: true }));
    try {
      const saved = await api.patch<{
        physicallyReceived: boolean;
        hubManagerConfirmed: boolean;
        qcLeadConfirmed: boolean;
        qualityChecked: boolean;
        packetQty: number;
        grossWeightKg: number;
      }>(`/api/flow/dispatch/orders/${orderId}/pre-dispatch`, {
        physicallyReceived: effectiveForm.physicallyReceived,
        hubManagerConfirmed: effectiveForm.hubManagerConfirmed,
        qcLeadConfirmed: effectiveForm.qcLeadConfirmed,
        qualityChecked: effectiveForm.qualityChecked,
        packetQty: Number(effectiveForm.packetQty || 0),
        grossWeightKg: Number(effectiveForm.grossWeightKg || 0),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, preDispatch: saved } : o)),
      );
    } finally {
      setGateSaving((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  const readyCount = orders.filter((o) => !o.dispatched).length;
  const dispatchedCount = orders.filter((o) => o.dispatched).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Dispatch & Truck Loading</h1>
          <p className="text-slate-500">
            Assign trucks, confirm loading, and dispatch orders to delivery points.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-amber-700">{readyCount}</p>
            <p className="text-xs text-amber-600">Pending</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-emerald-700">{dispatchedCount}</p>
            <p className="text-xs text-emerald-600">Dispatched</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-slate-700">{availableTrucks.length}</p>
            <p className="text-xs text-slate-500">Trucks Ready</p>
          </div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="font-medium text-slate-500">No orders awaiting dispatch.</p>
          <p className="mt-1 text-sm text-slate-400">
            Orders appear here after QC approval and auction completion.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((order) => {
          const step = loadStep(order);
          const truck = trucks.find((t) => t.id === order.assignedTruck);
          const isBusy = busy === order.id;
          const form = preForm[order.id] ?? {
            physicallyReceived: false,
            hubManagerConfirmed: false,
            qcLeadConfirmed: false,
            qualityChecked: false,
            packetQty: "0",
            grossWeightKg: "0",
          };
          const gateReady =
            form.physicallyReceived &&
            form.hubManagerConfirmed &&
            form.qcLeadConfirmed &&
            form.qualityChecked &&
            Number(form.packetQty) > 0 &&
            Number(form.grossWeightKg) > 0;
          const qrReady = (order.packetQr?.total ?? 0) > 0;

          return (
            <div
              key={order.id}
              className={`rounded-2xl border bg-white shadow-sm ${
                order.dispatched ? "border-emerald-100" : "border-slate-100"
              }`}
            >
              {/* ── Order info ── */}
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{order.id}</span>
                    <span className="font-mono text-xs text-slate-300">·</span>
                    <span className="font-mono text-xs text-slate-400">{order.lotId}</span>
                    {order.dispatched && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        ✓ Dispatched
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900">{order.product}</p>
                  <p className="text-xs text-slate-500">{order.qty}</p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                    <p className="text-[10px] text-slate-400 font-medium">Winning Bid</p>
                    <p className="text-sm font-bold text-emerald-700">{order.winningBid}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center min-w-[90px]">
                    <p className="text-[10px] text-slate-400 font-medium">Total</p>
                    <p className="text-sm font-bold text-slate-800">{order.totalAmount}</p>
                  </div>
                </div>
              </div>

              {/* ── Parties & delivery ── */}
              <div className="flex flex-wrap gap-3 px-5 pb-4">
                {[
                  { label: "Seller", value: order.seller },
                  { label: "Buyer", value: order.buyer },
                  { label: "Delivery Point", value: order.deliveryPoint },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="text-xs font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* ── Load progress steps ── */}
              <div className="border-t border-slate-50 px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Load Progress
                </p>
                <LoadProgress order={order} />
              </div>

              <div className="mx-5 mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Physical Receive & QC Gate (Required before truck selection)
                </p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {[
                    ["physicallyReceived", "Physically Reached Hub"],
                    ["hubManagerConfirmed", "Hub Manager Confirmed"],
                    ["qcLeadConfirmed", "QC Lead Confirmed"],
                    ["qualityChecked", "Quality Checked"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(form[key as keyof PreDispatchForm])}
                        onChange={(e) => {
                          const next = { ...form, [key]: e.target.checked } as PreDispatchForm;
                          setPreForm((prev) => ({ ...prev, [order.id]: next }));
                          void savePreDispatch(order.id, next);
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    type="number"
                    min={0}
                    value={form.packetQty}
                    onChange={(e) =>
                      setPreForm((prev) => ({
                        ...prev,
                        [order.id]: { ...form, packetQty: e.target.value },
                      }))
                    }
                    onBlur={() => void savePreDispatch(order.id)}
                    placeholder="Packet Qty"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.grossWeightKg}
                    onChange={(e) =>
                      setPreForm((prev) => ({
                        ...prev,
                        [order.id]: { ...form, grossWeightKg: e.target.value },
                      }))
                    }
                    onBlur={() => void savePreDispatch(order.id)}
                    placeholder="Gross Weight (kg)"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400"
                  />
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    {gateSaving[order.id] ? "Saving gate..." : "Gate auto-saves"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs">
                  <p className="text-violet-700">
                    Packet QR: <span className="font-semibold">{order.packetQr?.total ?? 0}</span> generated,
                    {" "}scanned <span className="font-semibold">{order.packetQr?.scanned ?? 0}</span>
                  </p>
                  <a
                    href={`/hub-shipment/${order.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-violet-300 bg-white px-2.5 py-1 font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    Generate / Print Packet QR
                  </a>
                </div>
                {(!gateReady || !qrReady) && (
                  <p className="text-[11px] text-amber-700">
                    Complete gate checks and generate packet QR before assigning truck.
                  </p>
                )}
              </div>

              {/* ── Truck info (if assigned) ── */}
              {order.assignedTruck && (
                <div className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="text-lg">🚛</span>
                  <div className="flex-1 text-xs">
                    {truck ? (
                      <>
                        <span className="font-semibold text-slate-800">{truck.id}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="text-slate-600">{truck.reg}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="text-slate-600">{truck.type}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="text-slate-500">{truck.capacityKg} kg cap.</span>
                        {truck.driverName && (
                          <>
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="text-slate-600">Driver: {truck.driverName}</span>
                            {truck.driverPhone && (
                              <span className="text-slate-400"> ({truck.driverPhone})</span>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <span className="font-semibold text-slate-800">{order.assignedTruck}</span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Action area ── */}
              <div className="border-t border-slate-100 px-5 py-3">
                {step === 0 && (
                  /* Stage 1: Assign truck */
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={selectedTruck[order.id] ?? ""}
                      onChange={(e) =>
                        setSelectedTruck((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 min-w-[200px]"
                    >
                      <option value="">— Select a truck —</option>
                      {availableTrucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} · {t.reg} · {t.type} ({t.capacityKg} kg)
                          {t.driverName ? ` · ${t.driverName}` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => assignTruck(order.id)}
                      disabled={isBusy || !selectedTruck[order.id] || !gateReady || !qrReady}
                      className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-40"
                    >
                      {isBusy ? "Assigning…" : "Assign Truck"}
                    </button>
                  </div>
                )}

                {step === 1 && (
                  /* Stage 2: Confirm load */
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => confirmLoad(order.id)}
                      disabled={isBusy}
                      className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40"
                    >
                      {isBusy ? "Confirming…" : "Confirm Goods Loaded"}
                    </button>
                    <p className="text-xs text-slate-400">Verify the lot is physically loaded onto the truck.</p>
                  </div>
                )}

                {step === 2 && (
                  /* Stage 3: Dispatch */
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => dispatchOrder(order.id)}
                      disabled={isBusy}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                    >
                      {isBusy ? "Dispatching…" : "Dispatch Now →"}
                    </button>
                    <p className="text-xs text-slate-400">
                      Send truck to <span className="font-medium text-slate-600">{order.deliveryPoint}</span>.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  /* Completed */
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ Order dispatched — truck en route to {order.deliveryPoint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Pagination page={page} totalPages={Math.ceil(orders.length / PAGE_SIZE)} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
