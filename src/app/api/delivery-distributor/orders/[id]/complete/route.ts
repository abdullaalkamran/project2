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
  if (order.status !== "ARRIVED")
    return NextResponse.json({ message: "Order must be ARRIVED to mark as delivered" }, { status: 400 });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PICKED_UP",
      pickedUpAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
    },
  });

  const receiptLink = `/delivery-receipt/${updated.orderCode}`;

  // Notify buyer
  if (order.buyerId) {
    await notify(order.buyerId, {
      type: "ORDER_DISPATCHED",
      title: "Order Delivered! Receipt Ready",
      message: `Your order "${order.product}" (${order.orderCode}) has been successfully delivered by your distributor. Download your delivery receipt.`,
      link: receiptLink,
    });
  }

  // Notify seller
  if (order.sellerId) {
    await notify(order.sellerId, {
      type: "ORDER_DISPATCHED",
      title: "Order Delivered to Buyer",
      message: `Order "${order.product}" (${order.orderCode}) has been delivered to ${order.buyerName}. Download the delivery receipt.`,
      link: receiptLink,
    });
  }

  return NextResponse.json({
    id: updated.orderCode,
    status: updated.status,
    pickedUpAt: updated.pickedUpAt?.toISOString(),
    receiptLink,
  });
}
