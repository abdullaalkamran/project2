import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;

  const orders = await prisma.order.findMany({
    where: { arothId: userId },
    orderBy: { confirmedAt: "desc" },
    select: {
      orderCode: true,
      product: true,
      qty: true,
      buyerName: true,
      sellerName: true,
      winningBid: true,
      totalAmount: true,
      confirmedAt: true,
      arothStatus: true,
      arothSaleAmount: true,
      arothCommissionRate: true,
      arothCommission: true,
      arothNetAmount: true,
      arothPaymentSentAt: true,
      arothPaymentConfirmedAt: true,
      arothSettledAt: true,
      arothHubId: true,
    },
  });

  return NextResponse.json(orders);
}
