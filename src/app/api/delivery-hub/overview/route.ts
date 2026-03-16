import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";

function buildHubFilter(hubNames: string[]) {
  if (hubNames.length === 0) return {};
  const hubKeywords = Array.from(
    new Set(
      hubNames
        .map((name) =>
          name
            .toLowerCase()
            .replace(/[—-]/g, " ")
            .replace(/\bhub\b/g, " ")
            .replace(/\bdelivery point\b/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")[0]
        )
        .filter(Boolean)
    )
  );
  return {
    OR: [
      { lot: { hubId: { in: hubNames } } },
      { deliveryPoint: { in: hubNames } },
      ...hubKeywords.map((k) => ({ lot: { hubId: { contains: k } } })),
      ...hubKeywords.map((k) => ({ deliveryPoint: { contains: k } })),
    ],
  };
}

const MAX_ITEMS = 5;

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hubNames = await getAssignedHubNames(session.userId, "delivery_hub_manager");
  const hubFilter = buildHubFilter(hubNames);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    confirmedOrders,
    incomingOrders,
    hubReceivedOrders,
    outForDeliveryCount,
    arrived,
    deliveredCount,
    receivedToday,
    dispatchedToday,
    activeDistributors,
  ] = await Promise.all([
    prisma.order.findMany({ where: { status: "CONFIRMED",         ...hubFilter }, orderBy: { confirmedAt: "asc" }, take: MAX_ITEMS, select: { orderCode: true, product: true, buyerName: true, deliveryPoint: true } }),
    prisma.order.findMany({ where: { status: "DISPATCHED",        ...hubFilter }, orderBy: { confirmedAt: "asc" }, take: MAX_ITEMS, select: { orderCode: true, product: true, buyerName: true, deliveryPoint: true } }),
    prisma.order.findMany({ where: { status: "HUB_RECEIVED",      ...hubFilter }, orderBy: { hubReceivedAt: "asc" }, take: MAX_ITEMS, select: { orderCode: true, product: true, buyerName: true, deliveryPoint: true, distributorName: true } }),
    prisma.order.count({   where: { status: "OUT_FOR_DELIVERY",   ...hubFilter } }),
    prisma.order.findMany({ where: { status: "ARRIVED",           ...hubFilter }, orderBy: { arrivedAt: "asc"    }, take: MAX_ITEMS, select: { orderCode: true, product: true, buyerName: true, deliveryPoint: true, distributorName: true } }),
    prisma.order.count({   where: { status: { in: ["ARRIVED", "PICKED_UP"] }, hubReceivedAt: { not: null }, ...hubFilter } }),
    prisma.order.count({   where: { hubReceivedAt:       { gte: today }, ...hubFilter } }),
    prisma.order.count({   where: { pickedUpFromHubAt:   { gte: today }, ...hubFilter } }),
    prisma.order.groupBy({ by: ["distributorName"], where: { status: "OUT_FOR_DELIVERY", distributorName: { not: null }, ...hubFilter } }),
  ]);

  // Also get total counts
  const [confirmedCount, incomingCount, hubReceivedCount, arrivedCount] = await Promise.all([
    prisma.order.count({ where: { status: "CONFIRMED",   ...hubFilter } }),
    prisma.order.count({ where: { status: "DISPATCHED",   ...hubFilter } }),
    prisma.order.count({ where: { status: "HUB_RECEIVED", ...hubFilter } }),
    prisma.order.count({ where: { status: "ARRIVED",      ...hubFilter } }),
  ]);

  // Build required actions
  const needsAssignOrders = hubReceivedOrders.filter((o) => !o.distributorName);
  const needsAssignCount  = await prisma.order.count({ where: { status: "HUB_RECEIVED", distributorName: null, ...hubFilter } });

  const requiredActions = [
    ...(confirmedCount > 0 ? [{
      type: "upcoming",
      title: "Upcoming Orders",
      desc: "Orders confirmed by sellers — awaiting dispatch from main hub.",
      count: confirmedCount,
      urgency: "low" as const,
      href: "/delivery-hub/dispatch",
      items: confirmedOrders.map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.buyerName} → ${o.deliveryPoint}`,
        href: "/delivery-hub/dispatch",
      })),
    }] : []),
    ...(incomingCount > 0 ? [{
      type: "receive",
      title: "Confirm Incoming Shipments",
      desc: "Trucks have arrived — mark them as received at delivery hub.",
      count: incomingCount,
      urgency: "high" as const,
      href: "/delivery-hub/incoming",
      items: incomingOrders.map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.buyerName} → ${o.deliveryPoint}`,
        href: "/delivery-hub/incoming",
      })),
    }] : []),
    ...(needsAssignCount > 0 ? [{
      type: "assign",
      title: "Assign Delivery Men",
      desc: "Orders received at hub — assign a delivery man to each.",
      count: needsAssignCount,
      urgency: "high" as const,
      href: "/delivery-hub/distribution",
      items: needsAssignOrders.map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.buyerName} → ${o.deliveryPoint}`,
        href: "/delivery-hub/distribution",
      })),
    }] : []),
    ...(arrivedCount > 0 ? [{
      type: "deliver",
      title: "Mark Final Delivery",
      desc: "Delivery men have arrived at destination — confirm final handover.",
      count: arrivedCount,
      urgency: "medium" as const,
      href: "/delivery-hub/distribution",
      items: arrived.map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.distributorName ?? "—"} → ${o.deliveryPoint}`,
        href: "/delivery-hub/distribution",
      })),
    }] : []),
  ];

  return NextResponse.json({
    upcoming:           confirmedCount,
    incoming:           incomingCount,
    hubReceived:        hubReceivedCount,
    outForDelivery:     outForDeliveryCount,
    delivered:          deliveredCount,
    receivedToday,
    dispatchedToday,
    activeDistributors: activeDistributors.length,
    requiredActions,
  });
}
