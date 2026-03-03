import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function mapStatus(status: string): string {
  switch (status) {
    case "CONFIRMED": return "Confirmed";
    case "DISPATCHED": return "Dispatched";
    case "ARRIVED": return "Arrived";
    case "PICKED_UP": return "Delivered";
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
      OR: [
        { sellerId: session.userId },
        { sellerName: session.name },
      ],
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
            select: { qty: true },
          },
        },
      },
      buyer: { select: { phone: true } },
    },
  });

  const result = orders.map((o) => {
    const acceptedQty = o.lot?.orders.reduce((sum, ao) => sum + parseQty(ao.qty), 0) ?? 0;
    const lotQty = o.lot?.quantity ?? 0;
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
      qtyNum: parseQty(o.qty),
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
      productAmount: o.productAmount,
      transportCost: o.transportCost,
      platformFeeRate: o.platformFeeRate,
      platformFee: o.platformFee,
      sellerPayable: o.sellerPayable,
    };
  });

  return NextResponse.json({ orders: result });
}
