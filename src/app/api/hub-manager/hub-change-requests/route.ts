import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { getAssignedHubNames } from "@/lib/hub-assignments";

// GET /api/hub-manager/hub-change-requests
export async function GET() {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const userId  = auth.session!.userId;
  const isAdmin = auth.session!.activeRole === "admin";

  const hubNames = isAdmin
    ? null
    : await getAssignedHubNames(userId, "hub_manager");

  const orders = await prisma.order.findMany({
    where: {
      hubChangeStatus: { not: null },
      ...(hubNames ? { lot: { hubId: { in: hubNames } } } : {}),
    },
    include: {
      lot: { select: { hubId: true } },
    },
    orderBy: { hubChangeRequestedAt: "desc" },
  });

  return NextResponse.json({
    requests: orders.map((o) => ({
      orderCode:           o.orderCode,
      product:             o.product,
      qty:                 o.qty,
      buyerName:           o.buyerName,
      currentHub:          o.deliveryPoint,
      requestedHub:        o.requestedDeliveryHub,
      status:              o.hubChangeStatus,
      requestedAt:         o.hubChangeRequestedAt?.toISOString() ?? null,
      rejectedReason:      o.hubChangeRejectedReason ?? null,
      sourceHub:           o.lot?.hubId ?? null,
      loadConfirmed:       o.loadConfirmed,
      dispatched:          o.dispatched,
    })),
  });
}
