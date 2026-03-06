import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";

const HUB_STATUSES = ["DISPATCHED", "HUB_RECEIVED", "OUT_FOR_DELIVERY"];
const HISTORY_STATUSES = ["ARRIVED", "PICKED_UP"];
const TRACKING_STATUSES = ["DISPATCHED", "HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED", "PICKED_UP"];

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const statusFilter = req.nextUrl.searchParams.get("status");
  const statuses =
    statusFilter === "tracking" ? TRACKING_STATUSES :
    statusFilter === "history" ? HISTORY_STATUSES :
    statusFilter ? [statusFilter] : HUB_STATUSES;

  const hubNames = await getAssignedHubNames(session.userId, "delivery_hub_manager");
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
  const hubFilter = hubNames.length > 0
    ? {
        OR: [
          // Source hub match (legacy behavior)
          { lot: { hubId: { in: hubNames } } },
          // Delivery hub / delivery point match (required for delivery-hub workflow)
          { deliveryPoint: { in: hubNames } },
          // Flexible matching: "Mirpur Hub - Dhaka" should match "Mirpur Delivery Point"
          ...hubKeywords.map((k) => ({ lot: { hubId: { contains: k } } })),
          ...hubKeywords.map((k) => ({ deliveryPoint: { contains: k } })),
        ],
      }
    : {};

  const orders = await prisma.order.findMany({
    where: { status: { in: statuses }, ...hubFilter },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.orderCode,
      product: o.product,
      qty: o.qty,
      buyer: o.buyerName,
      seller: o.sellerName,
      deliveryPoint: o.deliveryPoint,
      assignedTruck: o.assignedTruck,
      loadConfirmed: o.loadConfirmed,
      dispatched: o.dispatched,
      status: o.status,
      confirmedAt: o.confirmedAt.toISOString(),
      hubReceivedAt: o.hubReceivedAt?.toISOString() ?? null,
      distributorName: o.distributorName ?? null,
      distributorPhone: o.distributorPhone ?? null,
      distributorAssignedAt: o.distributorAssignedAt?.toISOString() ?? null,
      pickedUpFromHubAt: o.pickedUpFromHubAt?.toISOString() ?? null,
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
      handoverScannedAt: o.handoverScannedAt?.toISOString() ?? null,
      deliveryWeightKg: o.deliveryWeightKg ?? null,
      hasDamage: o.hasDamage,
      damageNotes: o.damageNotes ?? null,
      totalAmount: o.totalAmount,
      winningBid: o.winningBid,
    }))
  );
}
