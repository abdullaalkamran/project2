import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { buyerId: session.userId },
        { buyerName: session.name, buyerId: null },
      ],
    },
    orderBy: { confirmedAt: "desc" },
    include: {
      lot: { select: { lotCode: true, hubId: true } },
    },
  });

  const result = await Promise.all(orders.map(async (o) => {
    const pd = await getPreDispatchCheck(o.orderCode);
    // productAmount defaults to 0 in old orders; derive from totalAmount (set at creation = product price only)
    const productAmount = o.productAmount > 0 ? o.productAmount : o.totalAmount;
    const platformFeeRate = o.platformFeeRate ?? 5;
    const platformFee = o.platformFee > 0 ? o.platformFee : Math.round(productAmount * platformFeeRate) / 100;
    return {
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
      productAmount,
      transportCost: o.transportCost,
      platformFee,
      // Actual weight from pre-dispatch check
      actualWeightKg: pd?.grossWeightKg ?? null,
    };
  }));

  return NextResponse.json({ orders: result });
}
