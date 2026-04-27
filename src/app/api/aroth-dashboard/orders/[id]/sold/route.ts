import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { notify } from "@/lib/notifications";

// PATCH — aroth reports the sale amount after selling in local market
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { saleAmount } = (await req.json()) as { saleAmount: number };
  if (!saleAmount || saleAmount <= 0) {
    return NextResponse.json({ message: "Valid saleAmount required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.arothId !== auth.session!.userId && auth.session!.activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (order.arothStatus !== "RECEIVED") {
    return NextResponse.json({ message: "Must mark as RECEIVED first" }, { status: 409 });
  }

  const rate = order.arothCommissionRate ?? 5;
  const commission = Math.round((saleAmount * rate) / 100 * 100) / 100;
  const netAmount = Math.round((saleAmount - commission) * 100) / 100;

  const updated = await prisma.order.update({
    where: { orderCode: id },
    data: {
      arothStatus: "SOLD",
      arothSaleAmount: saleAmount,
      arothCommission: commission,
      arothNetAmount: netAmount,
    },
  });

  // Notify buyer that their goods were sold
  if (order.buyerId) {
    await notify(order.buyerId, {
      type: "AROTH_SOLD",
      title: "Your Goods Were Sold",
      message: `Aroth "${order.arothName}" sold your order ${order.orderCode} for ৳${saleAmount.toLocaleString()}. Net receivable after ${rate}% commission: ৳${netAmount.toLocaleString()}.`,
      link: "/buyer-dashboard/orders",
    });
  }

  return NextResponse.json({
    arothStatus: updated.arothStatus,
    arothSaleAmount: updated.arothSaleAmount,
    arothCommission: updated.arothCommission,
    arothNetAmount: updated.arothNetAmount,
  });
}
