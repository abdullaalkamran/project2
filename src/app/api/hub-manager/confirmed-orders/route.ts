import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hubNames = await getAssignedHubNames(session.userId, "hub_manager");
  const hubFilter = hubNames.length > 0 ? { lot: { hubId: { in: hubNames } } } : {};

  const orders = await prisma.order.findMany({
    where: {
      sellerStatus: { in: ["ACCEPTED", "CONFIRMED", "PENDING_SELLER"] },
      status: { notIn: ["CANCELLED"] },
      ...hubFilter,
    },
    include: {
      lot: { select: { qcLeaderName: true, qcCheckerName: true, hubId: true, sellerPhone: true } },
      seller: { select: { phone: true } },
    },
    orderBy: { confirmedAt: "desc" },
  });

  const result = await Promise.all(orders.map(async (o) => {
    const pd = await getPreDispatchCheck(o.orderCode);
    return {
      id: o.orderCode,
      lotId: o.lot?.hubId ? `(${o.lot.hubId})` : "",
      product: o.product,
      qty: o.qty,
      freeQty: o.freeQty ?? 0,
      seller: o.sellerName,
      sellerPhone: o.lot?.sellerPhone ?? o.seller?.phone ?? null,
      buyer: o.buyerName,
      deliveryPoint: o.deliveryPoint,
      winningBid: `৳${o.winningBid.toLocaleString()}`,
      totalAmount: `৳${o.totalAmount.toLocaleString()}`,
      confirmedAt: new Date(o.confirmedAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }),
      qcLeader: o.lot?.qcLeaderName ?? "—",
      qcChecker: o.lot?.qcCheckerName ?? "—",
      sellerStatus: o.sellerStatus,
      status: o.status,
      dispatched: o.dispatched,
      assignedTruck: o.assignedTruck ?? null,
      loadConfirmed: o.loadConfirmed,
      physicallyReceived: pd?.physicallyReceived ?? false,
      qualityChecked: pd?.qualityChecked ?? false,
      actualWeightKg: (pd?.grossWeightKg ?? 0) > 0 ? pd!.grossWeightKg : null,
    };
  }));

  return NextResponse.json(result);
}
