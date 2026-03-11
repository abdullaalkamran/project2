import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["DISPATCHED", "HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED", "PICKED_UP"] },
    },
    orderBy: { confirmedAt: "desc" },
    select: {
      id: true,
      orderCode: true,
      buyerName: true,
      product: true,
      qty: true,
      status: true,
      deliveryPoint: true,
      confirmedAt: true,
    },
  });

  const stats = {
    incoming: orders.filter((o) => ["DISPATCHED", "HUB_RECEIVED"].includes(o.status)).length,
    atPoint: orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length,
    pendingPickup: orders.filter((o) => o.status === "ARRIVED").length,
    pickupCompleted: orders.filter((o) => o.status === "PICKED_UP").length,
  };

  const statusLabel: Record<string, string> = {
    DISPATCHED: "En Route",
    HUB_RECEIVED: "At Hub",
    OUT_FOR_DELIVERY: "Out for Delivery",
    ARRIVED: "Pending Pickup",
    PICKED_UP: "Picked Up",
  };

  const recentOrders = orders.slice(0, 20).map((o) => ({
    orderId: o.orderCode,
    buyer: o.buyerName,
    lot: `${o.product} — ${o.qty}`.trim(),
    status: statusLabel[o.status] ?? o.status,
    deliveryPoint: o.deliveryPoint,
    eta: ["DISPATCHED", "HUB_RECEIVED", "OUT_FOR_DELIVERY"].includes(o.status)
      ? "In transit"
      : o.status === "ARRIVED"
        ? `Arrived ${o.confirmedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric" })}`
        : `Collected ${o.confirmedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric" })}`,
  }));

  return NextResponse.json({ stats, orders: recentOrders });
}
