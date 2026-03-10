import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const DEACTIVATABLE_STATUSES = ["QC_PASSED", "LIVE"];

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lot = await prisma.lot.findFirst({
    where: {
      lotCode: id.toUpperCase(),
      OR: [{ sellerId: session.userId }, { sellerName: session.name }],
    },
  });

  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

  if (!DEACTIVATABLE_STATUSES.includes(lot.status)) {
    return NextResponse.json(
      { message: `Lot cannot be deactivated from status "${lot.status}". Only active marketplace listings can be deactivated.` },
      { status: 400 }
    );
  }

  // Block if any orders are awaiting seller decision
  const pendingOrders = await prisma.order.findMany({
    where: {
      lotId: lot.id,
      sellerStatus: "PENDING_SELLER",
      status: { not: "CANCELLED" },
    },
    select: { orderCode: true, buyerName: true },
  });

  if (pendingOrders.length > 0) {
    const list = pendingOrders.map((o) => `${o.orderCode} (${o.buyerName})`).join(", ");
    return NextResponse.json(
      {
        message: `Cannot deactivate. You have ${pendingOrders.length} pending order${pendingOrders.length > 1 ? "s" : ""} awaiting your decision: ${list}. Please accept or decline them first.`,
        pendingOrders,
      },
      { status: 409 }
    );
  }

  await prisma.lot.update({
    where: { id: lot.id },
    data: { status: "DEACTIVATED" },
  });

  return NextResponse.json({ message: "Lot deactivated successfully." });
}
