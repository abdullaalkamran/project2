import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";

function mapStatus(status: string): string {
  switch (status) {
    case "CONFIRMED":        return "Confirmed";
    case "DISPATCHED":       return "Dispatched";
    case "HUB_RECEIVED":     return "At Hub";
    case "OUT_FOR_DELIVERY": return "Out for Delivery";
    case "ARRIVED":          return "Arrived";
    case "PICKED_UP":        return "Delivered";
    default: return status;
  }
}

const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      sellerId: session.userId,
    },
    orderBy: { confirmedAt: "desc" },
    include: {
      lot: {
        select: {
          lotCode: true,
          hubId: true,
          title: true,
          quantity: true,
          unit: true,
          orders: {
            where: { sellerStatus: "ACCEPTED", status: { not: "CANCELLED" } },
            select: { qty: true, freeQty: true },
          },
        },
      },
      buyer: { select: { phone: true } },
    },
  });

  const result = await Promise.all(orders.map(async (o) => {
    const acceptedQty = o.lot?.orders.reduce((sum, ao) => sum + parseQty(ao.qty) + (ao.freeQty ?? 0), 0) ?? 0;
    const lotQty = o.lot?.quantity ?? 0;
    const pd = await getPreDispatchCheck(o.orderCode);
    // productAmount defaults to 0 in old orders; derive from totalAmount (set at creation = product price only)
    const productAmount = o.productAmount > 0 ? o.productAmount : o.totalAmount;
    const platformFeeRate = o.platformFeeRate ?? 5;
    const platformFee = o.platformFee > 0 ? o.platformFee : Math.round(productAmount * platformFeeRate) / 100;
    const sellerPayable = o.sellerPayable > 0 ? o.sellerPayable : productAmount - platformFee;
    return {
      id: o.orderCode,
      lotId: o.lot?.lotCode ?? "—",
      lotTitle: o.lot?.title ?? o.product,
      lotQuantity: lotQty,
      lotUnit: o.lot?.unit ?? "",
      lotAcceptedQty: acceptedQty,
      lotAvailableQty: Math.max(0, lotQty - acceptedQty),
      product: o.product,
      qty: o.qty,
      freeQty: o.freeQty ?? 0,
      qtyNum: parseQty(o.qty) + (o.freeQty ?? 0),
      buyer: o.buyerName,
      buyerPhone: o.buyer?.phone ?? "—",
      winningBid: `৳ ${o.winningBid.toLocaleString()}/${o.lot?.unit ?? "unit"}`,
      totalAmount: `৳ ${o.totalAmount.toLocaleString()}`,
      confirmedAt: o.confirmedAt.toLocaleDateString("en-BD", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      hub: o.lot?.hubId ?? "—",
      status: mapStatus(o.status),
      sellerStatus: o.sellerStatus,
      assignedTruck: o.assignedTruck ?? null,
      loadConfirmed: o.loadConfirmed ?? false,
      dispatched: o.dispatched ?? false,
      delivered: o.delivered ?? false,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      // Financial breakdown
      productAmount,
      transportCost: o.transportCost,
      platformFeeRate,
      platformFee,
      sellerPayable,
      // Actual weight + pre-dispatch flags
      actualWeightKg: (pd?.grossWeightKg ?? 0) > 0 ? pd!.grossWeightKg : null,
      physicallyReceived: pd?.physicallyReceived ?? false,
      qualityChecked: pd?.qualityChecked ?? false,
    };
  }));

  return NextResponse.json({ orders: result });
}
