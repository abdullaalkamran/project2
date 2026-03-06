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
  if (order.status !== "OUT_FOR_DELIVERY")
    return NextResponse.json({ message: "Order must be OUT_FOR_DELIVERY to mark as arrived" }, { status: 400 });

  try {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "ARRIVED", arrivedAt: new Date() },
    });

    if (order.buyerId) {
      await notify(order.buyerId, {
        type: "ORDER_ARRIVED",
        title: "Order Arrived at Delivery Point",
        message: `Your order "${order.product}" (${order.orderCode}) has arrived at ${order.deliveryPoint} and is ready for pickup.`,
        link: "/buyer-dashboard/orders",
      });
    }

    return NextResponse.json({
      id: updated.orderCode,
      status: updated.status,
      arrivedAt: updated.arrivedAt?.toISOString(),
    });
  } catch (err) {
    console.error("[delivery-hub/arrived]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
