import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hubNames = await getAssignedHubNames(session.userId, "hub_manager");
  const hubFilter = hubNames.length > 0 ? { lot: { hubId: { in: hubNames } } } : {};

  // Show all orders that are confirmed/accepted (ready or in-progress for dispatch)
  // Exclude cancelled/declined
  const orders = await prisma.order.findMany({
    where: {
      sellerStatus: { in: ["ACCEPTED", "CONFIRMED", "PENDING_SELLER"] },
      status: { notIn: ["CANCELLED"] },
      ...hubFilter,
    },
    include: {
      lot: { select: { qcLeaderName: true, qcCheckerName: true, hubId: true } },
    },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.orderCode,
      lotId: o.lot?.hubId ? `(${o.lot.hubId})` : "",
      product: o.product,
      qty: o.qty,
      freeQty: o.freeQty ?? 0,
      seller: o.sellerName,
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
    }))
  );
}
