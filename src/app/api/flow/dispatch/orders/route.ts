import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Show orders ready for dispatch: seller-accepted (ACCEPTED) or auto-confirmed (CONFIRMED)
  const orders = await prisma.order.findMany({
    where: {
      sellerStatus: { in: ["ACCEPTED", "CONFIRMED"] },
      status: { not: "CANCELLED" },
    },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.orderCode,
      lotId: (o as { lotId: string }).lotId,
      product: o.product,
      qty: o.qty,
      seller: o.sellerName,
      buyer: o.buyerName,
      deliveryPoint: o.deliveryPoint,
      winningBid: `BDT ${o.winningBid}/${o.qty.split(" ")[1] ?? "kg"}`,
      totalAmount: `BDT ${o.totalAmount.toLocaleString()}`,
      confirmedAt: o.confirmedAt.toISOString(),
      assignedTruck: o.assignedTruck,
      loadConfirmed: o.loadConfirmed,
      dispatched: o.dispatched,
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
      pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
      status: o.status,
      sellerStatus: o.sellerStatus,
    }))
  );
}
