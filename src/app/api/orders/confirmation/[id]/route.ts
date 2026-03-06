import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { orderCode: id.toUpperCase() },
    include: { lot: { select: { lotCode: true, hubId: true } } },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const isOwner =
    order.sellerId === session.userId ||
    order.buyerId === session.userId ||
    order.sellerName === session.name ||
    order.buyerName === session.name;
  const canViewByRole = ["hub_manager", "delivery_hub_manager", "admin"].includes(session.activeRole);
  if (!isOwner && !canViewByRole) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!["ACCEPTED", "CONFIRMED"].includes(order.sellerStatus)) {
    return NextResponse.json({ message: "Seller confirmation receipt is not available yet" }, { status: 400 });
  }

  const productAmount = order.productAmount > 0 ? order.productAmount : order.totalAmount;
  const platformFeeRate = order.platformFeeRate ?? 5;
  const platformFee = order.platformFee > 0 ? order.platformFee : Math.round(productAmount * platformFeeRate) / 100;
  const sellerPayable = order.sellerPayable > 0 ? order.sellerPayable : productAmount - platformFee;
  const totalAmount = productAmount + order.transportCost + platformFee;

  return NextResponse.json({
    orderCode: order.orderCode,
    lotCode: order.lot?.lotCode ?? null,
    product: order.product,
    qty: order.qty,
    sellerName: order.sellerName,
    buyerName: order.buyerName,
    deliveryPoint: order.deliveryPoint,
    hubId: order.lot?.hubId ?? null,
    sellerStatus: order.sellerStatus,
    winningBid: order.winningBid,
    productAmount,
    transportCost: order.transportCost,
    platformFeeRate,
    platformFee,
    sellerPayable,
    totalAmount,
    confirmedAt: order.confirmedAt.toISOString(),
  });
}
