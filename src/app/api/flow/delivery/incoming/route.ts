import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readPreDispatchChecks } from "@/lib/pre-dispatch-store";

export async function GET() {
  const [orders, checks] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["DISPATCHED", "HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED"] } },
      orderBy: { confirmedAt: "desc" },
    }),
    readPreDispatchChecks(),
  ]);
  const checkByCode = new Map(checks.map((c) => [c.orderCode, c]));

  return NextResponse.json(
    orders.map((o) => {
      const check = checkByCode.get(o.orderCode) ?? null;
      return {
        id: o.orderCode,
        product: o.product,
        qty: o.qty,
        buyer: o.buyerName,
        seller: o.sellerName,
        deliveryPoint: o.deliveryPoint,
        assignedTruck: o.assignedTruck,
        status: o.status,
        arrivedAt: o.arrivedAt?.toISOString() ?? null,
        packetQty: check?.packetQty ?? 0,
        freeQty: o.freeQty,
      };
    })
  );
}
