import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.status !== "DISPATCHED")
    return NextResponse.json({ message: "Order must be in DISPATCHED status to receive at hub" }, { status: 400 });

  try {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "HUB_RECEIVED", hubReceivedAt: new Date() },
    });

    // Notify buyer
    if (order.buyerId) {
      await notify(order.buyerId, {
        type: "ORDER_HUB_RECEIVED",
        title: "Order Arrived at Delivery Hub",
        message: `Your order "${order.product}" (${order.orderCode}) has arrived at the delivery hub and is being processed for dispatch to ${order.deliveryPoint}.`,
        link: "/buyer-dashboard/orders",
      });
    }

    return NextResponse.json({
      id: updated.orderCode,
      status: updated.status,
      hubReceivedAt: updated.hubReceivedAt?.toISOString(),
    });
  } catch (err) {
    console.error("[delivery-hub/receive]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
