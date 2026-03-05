import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hubNames = await getAssignedHubNames(session.userId, "delivery_hub_manager");
  const hubFilter = hubNames.length > 0
    ? { lot: { hubId: { in: hubNames } } }
    : {};

  const [incoming, hubReceived, outForDelivery, delivered] = await Promise.all([
    prisma.order.count({ where: { status: "DISPATCHED", ...hubFilter } }),
    prisma.order.count({ where: { status: "HUB_RECEIVED", ...hubFilter } }),
    prisma.order.count({ where: { status: "OUT_FOR_DELIVERY", ...hubFilter } }),
    prisma.order.count({ where: { status: { in: ["ARRIVED", "PICKED_UP"] }, hubReceivedAt: { not: null }, ...hubFilter } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [receivedToday, dispatchedToday] = await Promise.all([
    prisma.order.count({ where: { hubReceivedAt: { gte: today }, ...hubFilter } }),
    prisma.order.count({ where: { pickedUpFromHubAt: { gte: today }, ...hubFilter } }),
  ]);

  const activeDistributors = await prisma.order.groupBy({
    by: ["distributorName"],
    where: { status: "OUT_FOR_DELIVERY", distributorName: { not: null }, ...hubFilter },
  });

  return NextResponse.json({
    incoming,
    hubReceived,
    outForDelivery,
    delivered,
    receivedToday,
    dispatchedToday,
    activeDistributors: activeDistributors.length,
  });
}
