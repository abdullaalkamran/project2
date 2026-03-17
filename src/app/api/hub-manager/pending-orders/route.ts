import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.activeRole !== "hub_manager") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const hubNames = await getAssignedHubNames(session.userId, "hub_manager");
  const hubFilter = hubNames.length > 0 ? { lot: { hubId: { in: hubNames } } } : {};

  const orders = await prisma.order.findMany({
    where: {
      ...hubFilter,
      sellerStatus: "PENDING_SELLER",
      status: { not: "CANCELLED" },
    },
    include: {
      lot: { select: { lotCode: true, hubId: true, sellerPhone: true } },
    },
    orderBy: { confirmedAt: "asc" }, // oldest first — most urgent
  });

  // Enrich with seller phone from User table if lot.sellerPhone missing
  const enriched = await Promise.all(orders.map(async (o) => {
    let sellerPhone = o.lot?.sellerPhone ?? null;
    if (!sellerPhone && o.sellerId) {
      const user = await prisma.user.findUnique({ where: { id: o.sellerId }, select: { phone: true } });
      sellerPhone = user?.phone ?? null;
    }
    return {
      id: o.id,
      orderCode: o.orderCode,
      lotCode: o.lot?.lotCode ?? "—",
      product: o.product,
      qty: o.qty,
      freeQty: o.freeQty ?? 0,
      buyer: o.buyerName,
      seller: o.sellerName,
      sellerId: o.sellerId ?? null,
      sellerPhone,
      hub: o.lot?.hubId ?? "—",
      totalAmount: o.totalAmount,
      confirmedAt: o.confirmedAt.toISOString(),
    };
  }));

  return NextResponse.json(enriched);
}
