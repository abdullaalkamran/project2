import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

// GET — hub manager sees all aroth orders for their hub(s)
export async function GET() {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;

  // Find hubs managed by this user
  const hubIds = auth.session!.activeRole === "admin"
    ? undefined
    : (await prisma.hubManagerAssignment.findMany({
        where: { userId, role: "hub_manager" },
        select: { hubId: true },
      })).map((h) => h.hubId);

  const orders = await prisma.order.findMany({
    where: {
      arothId: { not: null },
      ...(hubIds ? { arothHubId: { in: hubIds } } : {}),
    },
    orderBy: { confirmedAt: "desc" },
    select: {
      orderCode: true,
      product: true,
      qty: true,
      buyerName: true,
      arothName: true,
      arothHubId: true,
      arothStatus: true,
      arothSaleAmount: true,
      arothCommissionRate: true,
      arothCommission: true,
      arothNetAmount: true,
      arothPaymentSentAt: true,
      arothPaymentConfirmedAt: true,
      arothSettledAt: true,
      confirmedAt: true,
    },
  });

  return NextResponse.json(orders);
}
