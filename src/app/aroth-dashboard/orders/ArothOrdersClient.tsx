"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

type ArothOrder = {
  orderCode: string;
  product: string;
  qty: string;
  freeQty: number;
  buyerName: string;
  sellerName: string;
  winningBid: number;
  totalAmount: number;
  productAmount: number;
  platformFee: number;
  platformFeeRate: number;
  buyerTransportCost: number;
  qtyNum: number;
  qtyUnit: string;
  unitCost: number;
  confirmedAt: string;
  // Delivery tracking
  status: string;
  sellerStatus: string;
  assignedTruck: string | null;
  loadConfirmed: boolean;
  dispatched: boolean;
  physicallyReceived: boolean;
  qualityChecked: boolean;
  actualWeightKg: number | null;
  // Aroth fields
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

// ── 10-step delivery progress (same logic as buyer page) ─────────────────────

const DELIVERY_STEPS: { label: string; sublabel: string }[] = [
  { label: "Order Placed",        sublabel: "Waiting for seller"    },
  { label: "Order Confirmed",     sublabel: "Seller accepted"       },
  { label: "Goods at Hub",        sublabel: "Arrived at hub"        },
  { label: "Weight & QC",         sublabel: "Hub verified"          },
  { label: "Truck Confirmed",     sublabel: "Vehicle assigned"      },
  { label: "In Transit",          sublabel: "On the way"            },
  { label: "Hub Received",        sublabel: "At delivery hub"       },
  { label: "QTY & Weight",        sublabel: "Delivery verified"     },
  { label: "Ready for Pickup",    sublabel: "Set for collection"    },
  { label: "Delivered",           sublabel: "Picked up by buyer"    },
];

function deliveryActiveStep(o: ArothOrder): number {
  if (o.status === "PICKED_UP")                                              return 10;
  if (o.status === "ARRIVED")                                                return 9;
  if (o.status === "OUT_FOR_DELIVERY")                                       return 8;
  if (o.status === "HUB_RECEIVED")                                           return 7;
  if (o.dispatched || o.status === "DISPATCHED")                             return 6;
  if (o.assignedTruck && o.loadConfirmed)                                    return 5;
  if (o.qualityChecked && o.actualWeightKg != null && o.actualWeightKg > 0) return 4;
  if (o.physicallyReceived)                                                  return 3;
  if (o.sellerStatus !== "PENDING_SELLER")                                   return 2;
  return 1;
}

function DeliveryStepBar({ o }: { o: ArothOrder }) {
  const active = deliveryActiveStep(o);
  const total  = DELIVERY_STEPS.length;
  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <div className="flex items-start" style={{ minWidth: `${total * 68}px` }}>
        {DELIVERY_STEPS.map((step, i) => {
          const isDone   = i < active;
          const isActive = i === active;
          const isLast   = i === total - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${i === 0 ? "invisible" : isDone ? "bg-emerald-400" : isActive ? "bg-gradient-to-r from-emerald-400 to-slate-200" : "bg-slate-200"}`} />
                <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold ${
                  isDone  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : isActive ? "border-blue-500 bg-white text-blue-600 shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
                  : "border-slate-200 bg-white text-slate-400"
                }`}>
                  {isDone ? (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className={`h-0.5 flex-1 ${isLast ? "invisible" : isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
              </div>
              <div className="mt-1.5 px-0.5 text-center">
                <p className={`text-[9px] font-semibold leading-tight ${isDone ? "text-emerald-700" : isActive ? "text-blue-700" : "text-slate-400"}`}>
                  {step.label}
                </p>
                <p className={`mt-0.5 text-[8px] leading-tight ${isDone ? "text-emerald-500" : isActive ? "text-blue-400" : "text-slate-300"}`}>
                  {step.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Aroth status ──────────────────────────────────────────────────────────────

const AROTH_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:      { label: "Awaiting Your Response", color: "bg-amber-100 text-amber-700"    },
  ACCEPTED:     { label: "Accepted — Awaiting Delivery", color: "bg-blue-100 text-blue-700" },
  RECEIVED:     { label: "Received",               color: "bg-teal-100 text-teal-700"     },
  SOLD:         { label: "Sold — Payment Due",     color: "bg-violet-100 text-violet-700"  },
  PAYMENT_SENT: { label: "Payment Sent",           color: "bg-orange-100 text-orange-700"  },
  SETTLED:      { label: "Settled",                color: "bg-emerald-100 text-emerald-700"},
  CANCELLED:    { label: "Declined",               color: "bg-red-100 text-red-600"        },
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-BD", { dateStyle: "medium" });

// ── Invoice Modal ─────────────────────────────────────────────────────────────

function InvoiceModal({
  order: o,
  soldQty,
  sellingPerUnit,
  arothName,
  onClose,
}: {
  order: ArothOrder;
  soldQty: number;
  sellingPerUnit: number;
  arothName: string;
  onClose: () => void;
}) {
  const receivedQty = o.qtyNum + o.freeQty;
  const buyingTotal = o.productAmount + o.platformFee + o.buyerTransportCost;

  // Use actual saved values if sale already submitted, else use inputs
  const effectiveSoldQty = o.arothSaleAmount != null ? receivedQty : soldQty;
  const spUnit    = o.arothSaleAmount != null && effectiveSoldQty > 0
    ? o.arothSaleAmount / effectiveSoldQty
    : sellingPerUnit;
  const totalSale  = Math.round(spUnit * effectiveSoldQty);
  const commRate   = o.arothCommissionRate ?? 0;
  const commission = o.arothCommission ?? Math.round(totalSale * commRate / 100);
  const netAmount  = o.arothNetAmount  ?? (totalSale - commission);
  const isDraft    = o.arothSaleAmount == null;
  const today      = new Date().toLocaleDateString("en-BD", { dateStyle: "long" });

  function handlePrint() {
    const style = document.createElement("style");
    style.id = "__inv_print";
    style.textContent = `@media print{body>*{visibility:hidden}#__inv_root,#__inv_root *{visibility:visible}#__inv_root{position:fixed;top:0;left:0;width:100%;padding:32px;background:#fff}}`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById("__inv_print")?.remove(), 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Sale Invoice</h2>
            {isDraft && <p className="text-[11px] text-amber-600">Draft preview — submit sale to finalise</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
              Print / Save PDF
            </button>
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">✕</button>
          </div>
        </div>

        {/* Invoice body */}
        <div id="__inv_root" className="overflow-y-auto p-6 space-y-5 text-sm">

          {/* Branding + ref */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-extrabold tracking-tight text-emerald-700">Paikari</p>
              <p className="text-[11px] text-slate-500">Issued by: <span className="font-semibold text-slate-700">{arothName}</span></p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-semibold text-slate-600">INV-{o.orderCode}</p>
              <p className="text-[11px] text-slate-400">{today}</p>
              {isDraft && <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">DRAFT</span>}
            </div>
          </div>

          {/* Order meta */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
            <div><p className="text-slate-400">Product</p><p className="font-semibold text-slate-800">{o.product}</p></div>
            <div><p className="text-slate-400">Order Date</p><p className="font-semibold text-slate-800">{fmt(o.confirmedAt)}</p></div>
            <div><p className="text-slate-400">Total Received</p><p className="font-semibold text-slate-800">{receivedQty} {o.qtyUnit}</p></div>
            <div><p className="text-slate-400">Sold Qty</p><p className="font-semibold text-slate-800">{effectiveSoldQty > 0 ? `${effectiveSoldQty} ${o.qtyUnit}` : "—"}</p></div>
          </div>

          {/* Sale table */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sale Details</p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-500">Total Buying Price</td>
                  <td className="py-1.5 text-right font-medium text-slate-800">{bdt(Math.round(buyingTotal))}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-500">Selling Price / {o.qtyUnit}</td>
                  <td className="py-1.5 text-right font-medium text-slate-800">{spUnit > 0 ? bdt(Math.round(spUnit)) : "—"}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-500">Total Sale Amount ({effectiveSoldQty} {o.qtyUnit})</td>
                  <td className="py-1.5 text-right font-medium text-slate-800">{totalSale > 0 ? bdt(totalSale) : "—"}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-red-500">Commission ({commRate}%)</td>
                  <td className="py-1.5 text-right font-medium text-red-600">{commission > 0 ? `−${bdt(commission)}` : "—"}</td>
                </tr>
                <tr className="bg-emerald-50">
                  <td className="rounded-l-lg py-2 pl-3 font-bold text-emerald-800">Net Payable to Platform</td>
                  <td className="rounded-r-lg py-2 pr-3 text-right font-bold text-emerald-700">{netAmount > 0 ? bdt(netAmount) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
            {arothName} · Paikari · {today}{isDraft ? " · DRAFT" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ArothOrdersClient() {
  const { user }   = useAuth();
  const arothName  = user?.name ?? "Aroth";

  const [orders,         setOrders]         = useState<ArothOrder[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [busy,           setBusy]           = useState<string | null>(null);
  const [saleInputs,     setSaleInputs]     = useState<Record<string, string>>({});
  const [soldQtyInputs,  setSoldQtyInputs]  = useState<Record<string, string>>({});
  const [error,          setError]          = useState<string | null>(null);
  const [invoice,        setInvoice]        = useState<{ order: ArothOrder; unitPrice: number; soldQty: number } | null>(null);
  const [editMode,       setEditMode]       = useState<string | null>(null);

  const load = useCallback(() =>
    api.get<ArothOrder[]>("/api/aroth-dashboard/orders")
      .then(setOrders)
      .finally(() => setLoading(false))
  , []);

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

  const active   = orders.filter((o) => o.arothStatus !== "SETTLED" && o.arothStatus !== "CANCELLED");
  const settled  = orders.filter((o) => o.arothStatus === "SETTLED");
  const cancelled = orders.filter((o) => o.arothStatus === "CANCELLED");

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
      {[1,2,3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
  );

  function OrderCard({ order: o }: { order: ArothOrder }) {
    const arothStatus = o.arothStatus ?? "PENDING";
    const badge       = AROTH_STATUS[arothStatus] ?? { label: arothStatus, color: "bg-slate-100 text-slate-600" };
    const isBusy      = busy === o.orderCode;
    const saleVal     = saleInputs[o.orderCode]    ?? "";
    const soldQtyVal  = soldQtyInputs[o.orderCode] ?? "";
    const delivStep   = deliveryActiveStep(o);

    // Aroth can only confirm receipt once goods have arrived at the delivery hub (step 6 = HUB_RECEIVED)
    const hubArrived  = delivStep >= 6;

    const totalQty   = o.qtyNum + o.freeQty;
    const totalPrice = o.productAmount + o.platformFee + o.buyerTransportCost;
    const unitPrice  = o.qtyNum > 0 ? Math.round((totalPrice / o.qtyNum) * 100) / 100 : 0;

    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400">{o.orderCode}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}>{badge.label}</span>
            </div>
            <p className="text-base font-bold text-slate-900">{o.product}</p>
            <p className="text-xs text-slate-500">{totalQty} {o.qtyUnit} · Buyer: {o.buyerName}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs font-bold text-slate-800">{bdt(Math.round(totalPrice))}</p>
            <p className="text-[10px] text-slate-400">{bdt(unitPrice)} / {o.qtyUnit}</p>
            <p className="text-[10px] text-slate-400">Ordered: {fmt(o.confirmedAt)}</p>
          </div>
        </div>

        {/* Price & commission summary */}
        <div className="border-t border-slate-50 px-5 py-3 bg-slate-50/60">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px] rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold text-emerald-100">Total Price</p>
              <p className="text-lg font-bold text-white">{bdt(Math.round(totalPrice))}</p>
              <p className="mt-0.5 text-[10px] text-emerald-200">{totalQty} {o.qtyUnit}</p>
            </div>
            <div className="flex-1 min-w-[120px] rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-500">Unit Price</p>
              <p className="text-lg font-bold text-slate-800">{bdt(unitPrice)}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">per {o.qtyUnit}</p>
            </div>
            <div className="flex-1 min-w-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-500">Commission</p>
              {o.arothCommission != null ? (
                <>
                  <p className="text-sm font-bold text-red-600">−{bdt(o.arothCommission)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Net: {bdt(o.arothNetAmount ?? 0)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700">{o.arothCommissionRate != null ? `${o.arothCommissionRate}%` : "—"}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Deducted after selling</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 10-step delivery progress */}
        <div className="border-t border-slate-50 px-5 py-4">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Delivery Progress</p>
          <DeliveryStepBar o={o} />
        </div>

        {/* Financial summary if sold */}
        {o.arothSaleAmount != null && (
          <div className="mx-5 mb-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <div>
              <p className="text-slate-400">Sale Amount</p>
              <p className="font-bold text-slate-900">{bdt(o.arothSaleAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Commission ({o.arothCommissionRate}%)</p>
              <p className="font-bold text-emerald-700">{bdt(o.arothCommission ?? 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Net to Platform</p>
              <p className="font-bold text-violet-700">{bdt(o.arothNetAmount ?? 0)}</p>
            </div>
          </div>
        )}

        {/* Action area */}
        <div className="border-t border-slate-100 px-5 py-4">
          {arothStatus === "PENDING" && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => doAction(o.orderCode, "accept")}
                disabled={isBusy}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
              >
                {isBusy ? "Accepting…" : "Accept Order"}
              </button>
              <button
                onClick={() => doAction(o.orderCode, "cancel")}
                disabled={isBusy}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-40"
              >
                {isBusy ? "Declining…" : "Decline"}
              </button>
              <p className="text-xs text-slate-400">Accept to take this order, or decline to let the buyer re-route.</p>
            </div>
          )}

          {arothStatus === "ACCEPTED" && (
            hubArrived ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => doAction(o.orderCode, "receive")}
                  disabled={isBusy}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  {isBusy ? "Confirming…" : "Confirm Receipt"}
                </button>
                <p className="text-xs text-slate-500">Goods have arrived. Confirm receipt to proceed with the sale.</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
                <p className="text-xs font-medium text-amber-700">
                  Waiting for delivery — confirm receipt once the goods arrive at the hub.
                  {delivStep >= 5 ? " Shipment is in transit." : delivStep >= 4 ? " Truck confirmed." : " Not yet dispatched."}
                </p>
              </div>
            )
          )}

          {arothStatus === "RECEIVED" && (() => {
            const perUnit  = parseFloat(saleVal)    || 0;
            const soldQty  = parseFloat(soldQtyVal) || 0;
            const saleTotal = Math.round(perUnit * soldQty);
            const canSubmit = perUnit > 0 && soldQty > 0;
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    placeholder={`Sold qty (${o.qtyUnit})`}
                    value={soldQtyVal}
                    onChange={(e) => setSoldQtyInputs((p) => ({ ...p, [o.orderCode]: e.target.value }))}
                    className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">৳</span>
                    <input
                      type="number"
                      placeholder={`Price / ${o.qtyUnit}`}
                      value={saleVal}
                      onChange={(e) => setSaleInputs((p) => ({ ...p, [o.orderCode]: e.target.value }))}
                      className="w-36 rounded-xl border border-slate-200 py-2 pl-7 pr-3 text-sm outline-none focus:border-violet-400"
                    />
                  </div>
                  <button
                    onClick={() => doAction(o.orderCode, "sold", { saleAmount: saleTotal })}
                    disabled={isBusy || !canSubmit}
                    className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
                  >
                    {isBusy ? "Saving…" : "Report Sale"}
                  </button>
                </div>
                {canSubmit && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-xs">
                    <span className="text-slate-500">{bdt(perUnit)} × {soldQty} {o.qtyUnit}</span>
                    <span className="font-bold text-violet-700">= {bdt(saleTotal)}</span>
                    <button
                      onClick={() => setInvoice({ order: o, unitPrice: perUnit, soldQty })}
                      className="ml-auto rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition"
                    >
                      Preview Invoice
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400">Enter how many {o.qtyUnit} you sold and the price per {o.qtyUnit}.</p>
              </div>
            );
          })()}

          {arothStatus === "SOLD" && (() => {
            const isEditing = editMode === o.orderCode;
            const perUnit   = parseFloat(saleVal)    || 0;
            const soldQty   = parseFloat(soldQtyVal) || 0;
            const saleTotal = Math.round(perUnit * soldQty);
            const canSave   = perUnit > 0 && soldQty > 0;
            return isEditing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    placeholder={`Sold qty (${o.qtyUnit})`}
                    value={soldQtyVal}
                    onChange={(e) => setSoldQtyInputs((p) => ({ ...p, [o.orderCode]: e.target.value }))}
                    className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">৳</span>
                    <input
                      type="number"
                      placeholder={`Price / ${o.qtyUnit}`}
                      value={saleVal}
                      onChange={(e) => setSaleInputs((p) => ({ ...p, [o.orderCode]: e.target.value }))}
                      className="w-36 rounded-xl border border-slate-200 py-2 pl-7 pr-3 text-sm outline-none focus:border-violet-400"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      await doAction(o.orderCode, "sold", { saleAmount: saleTotal });
                      setEditMode(null);
                    }}
                    disabled={isBusy || !canSave}
                    className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
                  >
                    {isBusy ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditMode(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
                {canSave && (
                  <p className="text-xs text-violet-600 font-medium">
                    {bdt(perUnit)} × {soldQty} {o.qtyUnit} = {bdt(saleTotal)}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => doAction(o.orderCode, "payment-sent")}
                  disabled={isBusy}
                  className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
                >
                  {isBusy ? "Sending…" : "Confirm Payment Sent"}
                </button>
                <button
                  onClick={() => setEditMode(o.orderCode)}
                  className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  Edit Sale
                </button>
                <button
                  onClick={() => setInvoice({ order: o, unitPrice: 0, soldQty: 0 })}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  View Invoice
                </button>
                <p className="w-full text-xs text-slate-400">
                  Send <span className="font-semibold text-slate-700">{bdt(o.arothNetAmount ?? 0)}</span> to the hub bank account and click to confirm.
                </p>
              </div>
            );
          })()}

          {arothStatus === "PAYMENT_SENT" && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-medium text-orange-600">
                Payment sent on {o.arothPaymentSentAt ? fmt(o.arothPaymentSentAt) : "—"} — awaiting hub confirmation.
              </p>
              <button
                onClick={() => setInvoice({ order: o, unitPrice: 0, soldQty: 0 })}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                View Invoice
              </button>
            </div>
          )}

          {arothStatus === "SETTLED" && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold text-emerald-700">
                ✓ Settled on {o.arothSettledAt ? fmt(o.arothSettledAt) : "—"}
              </p>
              <button
                onClick={() => setInvoice({ order: o, unitPrice: 0, soldQty: 0 })}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                View Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    {invoice && (
      <InvoiceModal
        order={invoice.order}
        soldQty={invoice.soldQty}
        sellingPerUnit={invoice.unitPrice}
        arothName={arothName}
        onClose={() => setInvoice(null)}
      />
    )}
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500">Orders routed to you for local market sale.</p>
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

      {cancelled.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Declined</h2>
          {cancelled.slice(0, 5).map((o) => <OrderCard key={o.orderCode} order={o} />)}
        </section>
      )}
    </div>
    </>
  );
}
