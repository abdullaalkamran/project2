import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";

function extractUnitFromQty(qty: string) {
  const rest = qty.replace(/^\s*[\d.]+\s*/, "").trim();
  return rest || "unit";
}

function extractQtyNumber(qty: string) {
  const n = parseFloat(qty.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function roundQty(n: number) {
  return Math.round(n * 1000) / 1000;
}

function resolveTransportPaidBy(buyerShare: number | null, sellerShare: number | null, transportCost: number) {
  const b = buyerShare ?? 0;
  const s = sellerShare ?? 0;
  if (b > 0 && s > 0) return "BOTH";
  if (b > 0) return "BUYER";
  if (s > 0) return "SELLER";
  if (transportCost > 0) return "BUYER";
  return "NONE";
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { buyerId: session.userId },
        { buyerName: session.name, buyerId: null },
      ],
    },
    orderBy: { confirmedAt: "desc" },
    include: {
      lot: { select: { lotCode: true, hubId: true, unit: true } },
    },
  });

  const result = await Promise.all(orders.map(async (o) => {
    const pd = await getPreDispatchCheck(o.orderCode);
    // productAmount defaults to 0 in old orders; derive from totalAmount (set at creation = product price only)
    const productAmount = o.productAmount > 0 ? o.productAmount : o.totalAmount;
    const platformFeeRate = o.platformFeeRate ?? 5;
    const platformFee = o.platformFee > 0 ? o.platformFee : Math.round(productAmount * platformFeeRate) / 100;
    const qtyUnit = o.lot?.unit ?? extractUnitFromQty(o.qty);
    const actualQty = roundQty(extractQtyNumber(o.qty) + (o.freeQty ?? 0));
    const transportPaidBy = resolveTransportPaidBy(o.buyerTransportCost, o.sellerTransportCost, o.transportCost);
    const buyerTransportCost = o.buyerTransportCost ?? (transportPaidBy === "BUYER" ? o.transportCost : 0);
    const sellerTransportCost = o.sellerTransportCost ?? (transportPaidBy === "SELLER" ? o.transportCost : 0);
    const buyerTotalPayable = productAmount + buyerTransportCost + platformFee;

    return {
      id: o.orderCode,
      lotCode: o.lot?.lotCode ?? "—",
      product: o.product,
      qty: o.qty,
      qtyUnit,
      freeQty: o.freeQty ?? 0,
      seller: o.sellerName,
      winningBid: o.winningBid,
      totalAmount: o.totalAmount,
      hub: o.lot?.hubId ?? "—",
      deliveryPoint: o.deliveryPoint ?? o.lot?.hubId ?? "—",
      status: o.status,
      confirmedAt: o.confirmedAt.toLocaleDateString("en-BD", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      confirmedAtIso: o.confirmedAt.toISOString(),
      assignedTruck: o.assignedTruck ?? null,
      loadConfirmed: o.loadConfirmed,
      dispatched: o.dispatched,
      delivered: o.delivered ?? false,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      sellerStatus: o.sellerStatus,
      // Financial breakdown
      productAmount,
      transportCost: o.transportCost,
      buyerTransportCost,
      sellerTransportCost,
      transportPaidBy,
      platformFee,
      buyerTotalPayable,
      // Actual weight from pre-dispatch check
      actualWeightKg: pd?.grossWeightKg ?? null,
      actualQty,
      actualQtyUnit: qtyUnit,
    };
  }));

  return NextResponse.json({ orders: result });
}
