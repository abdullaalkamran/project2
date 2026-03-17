import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    include: { lot: { select: { lotCode: true, hubId: true } } },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      lotCode: o.lot.lotCode,
      product: o.product,
      qty: o.qty,
      freeQty: o.freeQty ?? 0,
      buyer: o.buyerName,
      buyerId: o.buyerId ?? null,
      seller: o.sellerName,
      sellerId: o.sellerId ?? null,
      totalAmount: o.totalAmount,
      productAmount: o.productAmount,
      transportCost: o.transportCost,
      platformFee: o.platformFee,
      sellerPayable: o.sellerPayable,
      hub: o.lot.hubId,
      deliveryPoint: o.deliveryPoint,
      status: o.sellerStatus === "PENDING_SELLER" ? "AWAITING_SELLER" : o.status,
      sellerStatus: o.sellerStatus,
      dispatched: o.dispatched,
      delivered: o.delivered,
      assignedTruck: o.assignedTruck ?? null,
      confirmedAt: o.confirmedAt.toISOString(),
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
    }))
  );
}
