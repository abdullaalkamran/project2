import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { toSellerStatusLabel } from "@/lib/lot-status";
import QuickMessageModal from "./QuickMessageModal";
import DeactivateButton from "./DeactivateButton";
import type { Order } from "@prisma/client";

type PageProps = {
  params: Promise<{ id: string }>;
};


// ── Lot phase progress bar (Create Lot → Live in Market) ─────────────────────

const LOT_PHASES = [
  { label: "Lot Created",       sublabel: "Seller submitted"       },
  { label: "Received at Hub",   sublabel: "Hub manager accepted"   },
  { label: "QC Inspection",     sublabel: "Quality check"          },
  { label: "QC Approved",       sublabel: "Grade & price set"      },
  { label: "Listed in Market",  sublabel: "Buyers can order"       },
  { label: "Orders Active",     sublabel: "Qty being fulfilled"    },
];

function lotPhaseActive(status: string, saleType: string, soldQty: number): number {
  if (soldQty > 0 || status === "SOLD" || status === "DELIVERED") return 6;
  if (status === "LIVE" || status === "AUCTION_ENDED" || status === "AUCTION_UNSOLD") return 5;
  if (status === "QC_PASSED" && saleType === "FIXED_PRICE") return 5;
  if (status === "FIXED_PRICE_REVIEW") return 4;
  if (status === "QC_PASSED") return 4;
  if (status === "QC_SUBMITTED") return 3;
  if (status === "IN_QC") return 2;
  if (status === "AT_HUB") return 1;
  return 0;
}

function LotPhaseBar({ status, saleType, soldQty }: { status: string; saleType: string; soldQty: number }) {
  const active = lotPhaseActive(status, saleType, soldQty);
  const total  = LOT_PHASES.length;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start" style={{ minWidth: `${total * 88}px` }}>
        {LOT_PHASES.map((step, i) => {
          const isDone   = i < active;
          const isActive = i === active;
          const isLast   = i === total - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${
                  i === 0 ? "invisible" : isDone ? "bg-emerald-400" : isActive ? "bg-gradient-to-r from-emerald-400 to-slate-200" : "bg-slate-200"
                }`} />
                <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all ${
                  isDone ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : isActive ? "border-emerald-500 bg-white text-emerald-600 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                  : "border-slate-200 bg-white text-slate-400"
                }`}>
                  {isDone ? (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className={`h-0.5 flex-1 ${ isLast ? "invisible" : isDone ? "bg-emerald-400" : "bg-slate-200" }`} />
              </div>
              <div className="mt-1.5 px-0.5 text-center">
                <p className={`text-[9px] font-semibold leading-tight ${ isDone ? "text-emerald-700" : isActive ? "text-emerald-700" : "text-slate-400" }`}>{step.label}</p>
                <p className={`mt-0.5 text-[8px] leading-tight ${ isDone ? "text-emerald-500" : isActive ? "text-emerald-500" : "text-slate-300" }`}>{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 10-step individual order progress bar ─────────────────────────────────────

const ORDER_STEPS = [
  { label: "Order Placed",         sublabel: "Waiting for seller"    },
  { label: "Order Confirmed",      sublabel: "Seller accepted"       },
  { label: "Goods at Hub",         sublabel: "Arrived at hub"        },
  { label: "Weight & QC Checked",  sublabel: "Hub verified"          },
  { label: "Truck Confirmed",      sublabel: "Vehicle assigned"      },
  { label: "In Transit",           sublabel: "On the way"            },
  { label: "Hub Received",         sublabel: "At delivery hub"       },
  { label: "QTY & Weight Checked", sublabel: "Delivery man verified" },
  { label: "Ready for Pickup",     sublabel: "Set for collection"    },
  { label: "Delivered",            sublabel: "Picked up by buyer"    },
];

function orderStepActive(order: Order): number {
  if (order.status === "PICKED_UP" || order.pickedUpAt) return 10;
  if (order.status === "ARRIVED")                       return 9;
  if (order.status === "OUT_FOR_DELIVERY")              return 8;
  if (order.status === "HUB_RECEIVED")                  return 7;
  if (order.dispatched || order.status === "DISPATCHED") return 6;
  if (order.assignedTruck)                              return 5;
  if (order.deliveryWeightKg != null)                   return 4;
  if (order.loadConfirmed)                              return 3;
  const s = order.sellerStatus;
  if (s === "ACCEPTED" || s === "CONFIRMED" || order.status === "CONFIRMED") return 2;
  return 1;
}

function OrderStepBar({ order }: { order: Order }) {
  const active = orderStepActive(order);
  const total  = ORDER_STEPS.length;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start" style={{ minWidth: `${total * 72}px` }}>
        {ORDER_STEPS.map((step, i) => {
          const isDone   = i < active;
          const isActive = i === active;
          const isLast   = i === total - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${
                  i === 0 ? "invisible" : isDone ? "bg-emerald-400" : isActive ? "bg-gradient-to-r from-emerald-400 to-slate-200" : "bg-slate-200"
                }`} />
                <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all ${
                  isDone ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : isActive ? "border-blue-500 bg-white text-blue-600 shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
                  : "border-slate-200 bg-white text-slate-400"
                }`}>
                  {isDone ? (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className={`h-0.5 flex-1 ${ isLast ? "invisible" : isDone ? "bg-emerald-400" : "bg-slate-200" }`} />
              </div>
              <div className="mt-1.5 px-0.5 text-center">
                <p className={`text-[9px] font-semibold leading-tight ${ isDone ? "text-emerald-700" : isActive ? "text-blue-700" : "text-slate-400" }`}>{step.label}</p>
                <p className={`mt-0.5 text-[8px] leading-tight ${ isDone ? "text-emerald-500" : isActive ? "text-blue-400" : "text-slate-300" }`}>{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function SellerStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_SELLER: "bg-amber-50 text-amber-700 border-amber-200",
    ACCEPTED:       "bg-emerald-50 text-emerald-700 border-emerald-200",
    DECLINED:       "bg-rose-50 text-rose-600 border-rose-200",
  };
  const label: Record<string, string> = {
    PENDING_SELLER: "Awaiting Your Decision",
    ACCEPTED:       "Accepted",
    DECLINED:       "Declined",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {label[status] ?? status}
    </span>
  );
}

export default async function SellerLotDetailsPage({ params }: PageProps) {
  const session = await getSessionUser();
  if (!session) notFound();

  const { id } = await params;

  const lot = await prisma.lot.findFirst({
    where: {
      lotCode: id,
      OR: [{ sellerId: session.userId }, { sellerName: session.name }],
    },
  });

  if (!lot) notFound();

  // Fetch all orders for this lot
  const orders = await prisma.order.findMany({
    where: { lotId: lot.id, status: { not: "CANCELLED" } },
    orderBy: { id: "asc" },
  });

  // Quantity breakdown
  const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };
  const totalQty = lot.quantity;
  const acceptedQty = orders
    .filter((o) => o.sellerStatus === "ACCEPTED")
    .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);
  const pendingQty = orders
    .filter((o) => o.sellerStatus === "PENDING_SELLER")
    .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);
  const dispatchedQty = orders
    .filter((o) => o.sellerStatus === "ACCEPTED" && o.dispatched)
    .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);
  const availableQty = Math.max(0, totalQty - acceptedQty - pendingQty);

  const rows = [
    { label: "Lot ID",        value: lot.lotCode },
    { label: "Product",       value: lot.title },
    { label: "Category",      value: lot.category },
    { label: "Status",        value: toSellerStatusLabel(lot.status) },
    { label: "Total Qty",     value: `${lot.quantity.toLocaleString()} ${lot.unit}` },
    { label: "Grade",         value: lot.grade },
    { label: "Hub",           value: lot.hubId },
    { label: "Storage",       value: lot.storageType || "N/A" },
    { label: "Packaging",     value: lot.baggageType || "N/A" },
    { label: "Packages",      value: String(lot.baggageQty) },
    { label: "Base Price",    value: `৳ ${lot.basePrice.toLocaleString()}` },
    { label: "Asking Price",  value: `৳ ${lot.askingPricePerKg.toLocaleString()}/kg` },
    { label: "Min Bid Rate",  value: lot.minBidRate ? `৳ ${lot.minBidRate.toLocaleString()}` : "Not set" },
    {
      label: "Added On",
      value: lot.createdAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
    },
    { label: "QC Verdict",         value: lot.verdict ?? "Pending" },
    { label: "QC Leader Decision",  value: lot.leaderDecision ?? "Pending" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lot Details</h1>
          <p className="text-slate-500">Full details, order breakdown and dispatch progress for this lot.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeactivateButton
            lotCode={lot.lotCode}
            lotStatus={lot.status}
            hasPendingOrders={orders.some((o) => o.sellerStatus === "PENDING_SELLER")}
          />
          <Link
            href="/seller-dashboard/lots"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to My Lots
          </Link>
        </div>
      </div>

      {/* Lot info — compact inline table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Lot Information</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0 divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5">
              <span className="text-[11px] text-slate-400">{row.label}</span>
              <span className="text-[11px] font-semibold text-slate-800">{row.value}</span>
            </div>
          ))}
        </div>
        {lot.description && (
          <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-400 uppercase tracking-wide mr-2">Note:</span>
            {lot.description}
          </p>
        )}
      </div>

      {/* Quantity breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Quantity Breakdown</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalQty.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500">{lot.unit} Total</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{acceptedQty.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500">{lot.unit} Accepted / Sold</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingQty.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500">{lot.unit} Pending Decision</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{availableQty.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500">{lot.unit} Still Available</p>
          </div>
        </div>

        {/* Visual stock bar */}
        {totalQty > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, (acceptedQty / totalQty) * 100)}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${Math.min(100 - (acceptedQty / totalQty) * 100, (pendingQty / totalQty) * 100)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Accepted
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Pending
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-200" /> Available
              </span>
              {dispatchedQty > 0 && (
                <span className="ml-auto text-slate-500">
                  {dispatchedQty.toLocaleString()} {lot.unit} dispatched
                </span>
              )}
            </div>
          </div>
        )}

        {/* Lot phase step bar */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Lot Phase</p>
          <LotPhaseBar status={lot.status} saleType={lot.saleType} soldQty={acceptedQty} />
        </div>
      </div>

      {/* Per-buyer order cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Orders for This Lot ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">No orders yet for this lot.</p>
            <p className="mt-1 text-xs text-slate-400">Orders placed by buyers will appear here.</p>
          </div>
        ) : (
          orders.map((order, idx) => {
            const isAccepted = order.sellerStatus === "ACCEPTED";
            const isDeclined = order.sellerStatus === "DECLINED";
            return (
              <div
                key={order.id}
                className={`rounded-2xl border bg-white shadow-sm ${
                  isDeclined ? "border-rose-100 opacity-60" : "border-slate-100"
                }`}
              >
                {/* Order header */}
                <div className="grid gap-3 p-4 md:grid-cols-12">
                  <div className="md:col-span-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Order #</p>
                    <p className="text-xs font-semibold text-slate-600">{idx + 1}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Order Code</p>
                    <p className="font-mono text-xs text-slate-700">{order.orderCode}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Buyer</p>
                    <p className="text-sm font-semibold text-slate-900">{order.buyerName}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Ordered Qty</p>
                    <p className="text-sm font-bold text-emerald-700">{order.qty}</p>
                    {order.freeQty > 0 && (
                      <p className="text-[11px] font-semibold text-violet-700">+ {order.freeQty} {lot.unit} free</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Price / Total</p>
                    <p className="text-xs text-slate-700">
                      ৳{order.winningBid.toLocaleString()}/{lot.unit}
                    </p>
                    <p className="text-xs font-semibold text-slate-900">৳{order.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Delivery Hub</p>
                    <p className="text-xs text-slate-700">{order.deliveryPoint || "—"}</p>
                  </div>
                  <div className="md:col-span-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Status</p>
                    <SellerStatusBadge status={order.sellerStatus} />
                  </div>
                  <div className="flex items-center md:col-span-12 md:justify-end">
                    <QuickMessageModal
                      buyerId={order.buyerId}
                      buyerName={order.buyerName}
                      orderCode={order.orderCode}
                      productName={lot.title}
                    />
                  </div>
                </div>

                {/* 10-step order progress — only for accepted orders */}
                {isAccepted && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Order Progress
                      {order.assignedTruck && (
                        <span className="ml-2 font-normal normal-case text-slate-500">
                          — Truck: <span className="font-semibold text-slate-700">{order.assignedTruck}</span>
                        </span>
                      )}
                    </p>
                    <OrderStepBar order={order} />
                    {order.pickedUpAt && (
                      <p className="mt-3 text-xs font-semibold text-emerald-600">
                        ✓ Delivered on{" "}
                        {order.pickedUpAt.toLocaleDateString("en-BD", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Declined note */}
                {isDeclined && (
                  <div className="border-t border-rose-100 px-5 py-3">
                    <p className="text-xs text-rose-500">You declined this order.</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
