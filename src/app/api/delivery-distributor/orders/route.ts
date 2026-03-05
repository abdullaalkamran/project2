import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const statusFilter = req.nextUrl.searchParams.get("status");
  const activeOnly = statusFilter === "active";
  const historyOnly = statusFilter === "history";

  const statuses = historyOnly
    ? ["ARRIVED", "PICKED_UP"]
    : activeOnly
      ? ["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED"]
      : ["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED", "PICKED_UP"];

  const orders = await prisma.order.findMany({
    where: {
      distributorId: session.userId,
      distributorAssignedAt: { not: null },
      status: { in: statuses },
    },
    orderBy: { distributorAssignedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.orderCode,
      product: o.product,
      qty: o.qty,
      buyer: o.buyerName,
      seller: o.sellerName,
      deliveryPoint: o.deliveryPoint,
      status: o.status,
      totalAmount: o.totalAmount,
      distributorAssignedAt: o.distributorAssignedAt?.toISOString() ?? null,
      pickedUpFromHubAt: o.pickedUpFromHubAt?.toISOString() ?? null,
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
      confirmedAt: o.confirmedAt.toISOString(),
    }))
  );
}
