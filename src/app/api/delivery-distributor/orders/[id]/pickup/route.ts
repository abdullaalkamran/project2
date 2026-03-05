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
  if (order.distributorId !== session.userId)
    return NextResponse.json({ message: "This order is not assigned to you" }, { status: 403 });
  if (order.status !== "HUB_RECEIVED")
    return NextResponse.json({ message: "Order must be in HUB_RECEIVED status to pick up" }, { status: 400 });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "OUT_FOR_DELIVERY", pickedUpFromHubAt: new Date() },
  });

  // Notify buyer
  if (order.buyerId) {
    await notify(order.buyerId, {
      type: "ORDER_OUT_FOR_DELIVERY",
      title: "Your Order is Out for Delivery",
      message: `${session.name} has picked up your order "${order.product}" (${order.orderCode}) and is now on the way to ${order.deliveryPoint}.`,
      link: "/buyer-dashboard/orders",
    });
  }

  return NextResponse.json({
    id: updated.orderCode,
    status: updated.status,
    pickedUpFromHubAt: updated.pickedUpFromHubAt?.toISOString(),
  });
}
