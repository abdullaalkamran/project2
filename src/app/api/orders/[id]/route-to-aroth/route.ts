import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { notify } from "@/lib/notifications";

// POST /api/orders/[id]/route-to-aroth
// Body: { arothId: string }
// Buyer routes a confirmed order to an aroth for local market sale.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["buyer", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { arothId } = (await req.json()) as { arothId: string };
  if (!arothId) return NextResponse.json({ message: "arothId required" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (order.arothId) {
    return NextResponse.json({ message: "Order already routed to an aroth" }, { status: 409 });
  }

  // Fetch aroth assignment (includes commission rate)
  const assignment = await prisma.arothAssignment.findUnique({
    where: { hubId_userId: { hubId: order.deliveryPoint, userId: arothId } },
    include: { user: { select: { id: true, name: true } } },
  });

  // If not found by deliveryPoint, try by order's lot hub
  const lot = assignment ? null : await prisma.lot.findUnique({
    where: { id: order.lotId },
    select: { hubId: true },
  });

  const finalAssignment = assignment ?? (lot
    ? await prisma.arothAssignment.findUnique({
        where: { hubId_userId: { hubId: lot.hubId, userId: arothId } },
        include: { user: { select: { id: true, name: true } } },
      })
    : null);

  if (!finalAssignment) {
    return NextResponse.json({ message: "Aroth not found for this hub" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { orderCode: id },
    data: {
      arothId:           finalAssignment.userId,
      arothName:         finalAssignment.user.name,
      arothHubId:        finalAssignment.hubId,
      arothStatus:       "PENDING",
      arothCommissionRate: finalAssignment.commissionRate,
    },
  });

  // Notify aroth
  await notify(finalAssignment.userId, {
    type: "AROTH_ORDER_RECEIVED",
    title: "New Order Routed to You",
    message: `Buyer "${order.buyerName}" has routed order ${order.orderCode} (${order.product}, ${order.qty}) to you for local market sale.`,
    link: "/aroth-dashboard/orders",
  });

  return NextResponse.json({
    orderCode: updated.orderCode,
    arothId: updated.arothId,
    arothName: updated.arothName,
    arothStatus: updated.arothStatus,
    arothCommissionRate: updated.arothCommissionRate,
  });
}
