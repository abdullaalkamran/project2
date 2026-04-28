import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// POST /api/buyer-dashboard/orders/[orderCode]/request-hub-change
// Body: { newHub: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { orderCode } = await params;
  const { newHub } = (await req.json()) as { newHub: string };

  if (!newHub?.trim()) {
    return NextResponse.json({ message: "New hub is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderCode },
    include: { lot: { select: { hubId: true } } },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.buyerId !== session.userId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  // Can only request if truck not yet confirmed (loadConfirmed = false)
  if (order.loadConfirmed) {
    return NextResponse.json({ message: "Cannot change delivery hub after truck is confirmed" }, { status: 400 });
  }
  if (order.dispatched) {
    return NextResponse.json({ message: "Cannot change delivery hub after order is dispatched" }, { status: 400 });
  }
  if (order.deliveryPoint === newHub) {
    return NextResponse.json({ message: "New hub is the same as the current delivery hub" }, { status: 400 });
  }

  await prisma.order.update({
    where: { orderCode },
    data: {
      requestedDeliveryHub: newHub,
      hubChangeStatus: "PENDING",
      hubChangeRequestedAt: new Date(),
      hubChangeRejectedReason: null,
    },
  });

  return NextResponse.json({ message: "Hub change request submitted" });
}
