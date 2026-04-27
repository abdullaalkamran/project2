import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;

  const orders = await prisma.order.findMany({
    where: { arothId: userId },
    select: {
      arothStatus: true,
      arothSaleAmount: true,
      arothCommission: true,
      arothNetAmount: true,
      arothPaymentConfirmedAt: true,
    },
  });

  const pending   = orders.filter((o) => o.arothStatus === "PENDING").length;
  const received  = orders.filter((o) => o.arothStatus === "RECEIVED").length;
  const sold      = orders.filter((o) => o.arothStatus === "SOLD").length;
  const awaiting  = orders.filter((o) => o.arothStatus === "PAYMENT_SENT").length;
  const settled   = orders.filter((o) => o.arothStatus === "SETTLED").length;
  const totalSold = orders.reduce((s, o) => s + (o.arothSaleAmount ?? 0), 0);
  const totalCommission = orders.reduce((s, o) => s + (o.arothCommission ?? 0), 0);

  // My hub + verification status
  const assignment = await prisma.arothAssignment.findFirst({
    where: { userId },
    include: { hub: { select: { name: true, location: true } } },
  });

  return NextResponse.json({
    stats: { pending, received, sold, awaiting, settled, totalSold, totalCommission },
    hub: assignment
      ? {
          name: assignment.hub.name,
          location: assignment.hub.location,
          commissionRate: assignment.commissionRate,
          isVerified: assignment.isVerified,
          allowedProductCount: assignment.allowedProducts.length,
        }
      : null,
  });
}
