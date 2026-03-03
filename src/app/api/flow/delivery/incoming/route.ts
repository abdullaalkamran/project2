import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["DISPATCHED", "ARRIVED"] } },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.orderCode,
      product: o.product,
      qty: o.qty,
      buyer: o.buyerName,
      seller: o.sellerName,
      deliveryPoint: o.deliveryPoint,
      assignedTruck: o.assignedTruck,
      status: o.status,
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
    }))
  );
}
