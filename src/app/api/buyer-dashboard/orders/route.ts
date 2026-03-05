import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const STATUS_RANK: Record<string, number> = {
  CONFIRMED: 1,
  DISPATCHED: 2,
  HUB_RECEIVED: 3,
  OUT_FOR_DELIVERY: 4,
  ARRIVED: 5,
  PICKED_UP: 6,
};

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { buyerId: session.userId },
        { buyerId: null, buyerName: session.name },
      ],
    },
    orderBy: { confirmedAt: "desc" },
    include: {
      lot: { select: { lotCode: true, hubId: true } },
    },
  });

  const filtered = orders.filter(
    (o) => !(o.status === "CANCELLED" || o.sellerStatus === "DECLINED"),
  );

  const dedupedByLotAndBuyer = new Map<string, (typeof filtered)[number]>();
  for (const order of filtered) {
    const buyerKey = (order.buyerId ?? order.buyerName).toLowerCase();
    const key = `${order.lotId}:${buyerKey}`;
    const prev = dedupedByLotAndBuyer.get(key);
    if (!prev) {
      dedupedByLotAndBuyer.set(key, order);
      continue;
    }

    const prevRank = STATUS_RANK[prev.status] ?? 0;
    const nextRank = STATUS_RANK[order.status] ?? 0;

    // Prefer the more advanced order status; if tied, keep the latest.
    if (nextRank > prevRank || (nextRank === prevRank && order.confirmedAt > prev.confirmedAt)) {
      dedupedByLotAndBuyer.set(key, order);
    }
  }

  const result = Array.from(dedupedByLotAndBuyer.values()).map((o) => ({
    id: o.orderCode,
    lotCode: o.lot?.lotCode ?? "—",
    product: o.product,
    qty: o.qty,
    seller: o.sellerName,
    winningBid: o.winningBid,
    totalAmount: o.totalAmount,
    hub: o.lot?.hubId ?? "—",
    deliveryPoint: o.deliveryPoint ?? o.lot?.hubId ?? "—",
    status: o.status,
    confirmedAt: o.confirmedAt.toLocaleDateString("en-BD", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    confirmedAtIso: o.confirmedAt.toISOString(),
    assignedTruck: o.assignedTruck ?? null,
    loadConfirmed: o.loadConfirmed,
    dispatched: o.dispatched,
    delivered: o.delivered ?? false,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    sellerStatus: o.sellerStatus,
    // Financial breakdown
    productAmount: o.productAmount,
    transportCost: o.transportCost,
    platformFee: o.platformFee,
  }));

  return NextResponse.json({ orders: result });
}
