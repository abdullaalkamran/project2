import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    distributorId: string;
    distributorName: string;
    distributorPhone?: string;
  };

  if (!body.distributorId || !body.distributorName)
    return NextResponse.json({ message: "distributorId and distributorName are required" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.status !== "HUB_RECEIVED")
    return NextResponse.json({ message: "Order must be received at hub before assigning a distributor" }, { status: 400 });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      distributorId: body.distributorId,
      distributorName: body.distributorName,
      distributorPhone: body.distributorPhone ?? null,
      distributorAssignedAt: new Date(),
    },
  });

  // Notify the distributor
  await notify(body.distributorId, {
    type: "ORDER_DISTRIBUTOR_ASSIGNED",
    title: "New Delivery Assignment",
    message: `You have been assigned to deliver order "${order.product}" (${order.orderCode}) to ${order.deliveryPoint}. Please pick up from the delivery hub.`,
    link: "/delivery-distributor/orders",
  });

  // Notify buyer
  if (order.buyerId) {
    await notify(order.buyerId, {
      type: "ORDER_DISTRIBUTOR_ASSIGNED",
      title: "Distributor Assigned to Your Order",
      message: `A distributor (${body.distributorName}) has been assigned to deliver your order "${order.product}" (${order.orderCode}) to ${order.deliveryPoint}.`,
      link: "/buyer-dashboard/orders",
    });
  }

  return NextResponse.json({
    id: updated.orderCode,
    status: updated.status,
    distributorName: updated.distributorName,
    distributorPhone: updated.distributorPhone,
    distributorAssignedAt: updated.distributorAssignedAt?.toISOString(),
  });
}
