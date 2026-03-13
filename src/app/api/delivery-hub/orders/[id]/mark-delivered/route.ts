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
  if (order.status !== "ARRIVED")
    return NextResponse.json({ message: "Order must be in ARRIVED status to mark as delivered" }, { status: 400 });

  try {
    const now = new Date();
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PICKED_UP",
        delivered: true,
        deliveredAt: now,
        pickedUpAt: now,
      },
    });

    const receiptLink = `/delivery-receipt/${updated.orderCode}`;

    if (order.buyerId) {
      await notify(order.buyerId, {
        type: "ORDER_DELIVERED",
        title: "Order Delivered",
        message: `Your order "${order.product}" (${order.orderCode}) has been successfully delivered at ${order.deliveryPoint}.`,
        link: receiptLink,
      });
    }

    if (order.sellerId) {
      await notify(order.sellerId, {
        type: "ORDER_DELIVERED",
        title: "Order Delivered to Buyer",
        message: `Your order "${order.product}" (${order.orderCode}) has been delivered to ${order.buyerName} at ${order.deliveryPoint}.`,
        link: receiptLink,
      });
    }

    return NextResponse.json({
      id: updated.orderCode,
      status: updated.status,
      deliveredAt: updated.deliveredAt?.toISOString(),
    });
  } catch (err) {
    console.error("[delivery-hub/mark-delivered]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
