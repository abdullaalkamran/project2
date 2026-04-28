import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

// PATCH /api/hub-manager/hub-change-requests/[orderCode]
// Body: { action: "APPROVE" | "REJECT"; reason?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const { orderCode } = await params;
  const { action, reason } = (await req.json()) as { action: "APPROVE" | "REJECT"; reason?: string };

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.hubChangeStatus !== "PENDING") {
    return NextResponse.json({ message: "No pending hub change request" }, { status: 400 });
  }

  if (action === "APPROVE") {
    await prisma.order.update({
      where: { orderCode },
      data: {
        deliveryPoint:           order.requestedDeliveryHub!,
        hubChangeStatus:         "APPROVED",
        hubChangeRejectedReason: null,
      },
    });
  } else {
    await prisma.order.update({
      where: { orderCode },
      data: {
        hubChangeStatus:         "REJECTED",
        hubChangeRejectedReason: reason ?? null,
      },
    });
  }

  return NextResponse.json({ message: action === "APPROVE" ? "Hub change approved" : "Hub change rejected" });
}
