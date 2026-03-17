import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function extractUnitFromQty(qty: string) {
  const rest = qty.replace(/^\s*[\d.]+\s*/, "").trim();
  return rest || "unit";
}

function extractQtyNumber(qty: string) {
  const n = parseFloat(qty.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function roundQty(n: number) {
  return Math.round(n * 1000) / 1000;
}

function resolveTransportPaidBy(buyerShare: number | null, sellerShare: number | null, transportCost: number) {
  const b = buyerShare ?? 0;
  const s = sellerShare ?? 0;
  if (b > 0 && s > 0) return "BOTH";
  if (b > 0) return "BUYER";
  if (s > 0) return "SELLER";
  if (transportCost > 0) return "BUYER";
  return "NONE";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { orderCode: id.toUpperCase() },
    include: { lot: { select: { lotCode: true, hubId: true, unit: true } } },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const isOwner =
    order.sellerId === session.userId ||
    order.buyerId === session.userId;
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
  const qtyUnit = order.lot?.unit ?? extractUnitFromQty(order.qty);
  const actualQty = roundQty(extractQtyNumber(order.qty) + (order.freeQty ?? 0));
  const transportPaidBy = resolveTransportPaidBy(order.buyerTransportCost, order.sellerTransportCost, order.transportCost);
  const buyerTransportCost = order.buyerTransportCost ?? (transportPaidBy === "BUYER" ? order.transportCost : 0);
  const sellerTransportCost = order.sellerTransportCost ?? (transportPaidBy === "SELLER" ? order.transportCost : 0);
  const buyerTotalPayable = productAmount + buyerTransportCost + platformFee;

  return NextResponse.json({
    orderCode: order.orderCode,
    lotCode: order.lot?.lotCode ?? null,
    product: order.product,
    qty: order.qty,
    qtyUnit,
    freeQty: order.freeQty ?? 0,
    sellerName: order.sellerName,
    buyerName: order.buyerName,
    deliveryPoint: order.deliveryPoint,
    hubId: order.lot?.hubId ?? null,
    sellerStatus: order.sellerStatus,
    winningBid: order.winningBid,
    productAmount,
    transportCost: order.transportCost,
    buyerTransportCost,
    sellerTransportCost,
    transportPaidBy,
    platformFeeRate,
    platformFee,
    sellerPayable,
    totalAmount,
    buyerTotalPayable,
    actualQty,
    actualQtyUnit: qtyUnit,
    confirmedAt: order.confirmedAt.toISOString(),
  });
}
