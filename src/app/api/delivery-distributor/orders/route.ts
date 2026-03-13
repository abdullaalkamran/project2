import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readPreDispatchChecks } from "@/lib/pre-dispatch-store";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const statusFilter = req.nextUrl.searchParams.get("status");
  const activeOnly = statusFilter === "active";
  const historyOnly = statusFilter === "history";

  const statuses = historyOnly
    ? ["ARRIVED", "PICKED_UP"]
    : activeOnly
      ? ["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED"]
      : ["HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED", "PICKED_UP"];

  const [orders, checks] = await Promise.all([
    prisma.order.findMany({
      where: {
        distributorId: session.userId,
        distributorAssignedAt: { not: null },
        status: { in: statuses },
      },
      orderBy: { distributorAssignedAt: "desc" },
    }),
    readPreDispatchChecks(),
  ]);
  const checkByCode = new Map(checks.map((c) => [c.orderCode, c]));

  // Lookup buyer phones
  const buyerIds = [...new Set(orders.map((o) => o.buyerId).filter(Boolean) as string[])];
  const buyerPhoneMap = new Map<string, string | null>();
  if (buyerIds.length > 0) {
    const users = await prisma.user.findMany({ where: { id: { in: buyerIds } }, select: { id: true, phone: true } });
    users.forEach((u) => buyerPhoneMap.set(u.id, u.phone ?? null));
  }

  // Lookup truck driver info
  const truckCodes = [
    ...new Set(orders.map((o) => o.assignedTruck?.split(" ")[0]).filter(Boolean) as string[]),
  ];
  const driverMap = new Map<string, { name: string; phone: string }>();
  if (truckCodes.length > 0) {
    const trucks = await prisma.truck.findMany({
      where: { truckCode: { in: truckCodes } },
      include: { driver: true },
    });
    trucks.forEach((t) => {
      if (t.driver) driverMap.set(t.truckCode, { name: t.driver.name, phone: t.driver.phone });
    });
  }

  return NextResponse.json(
    orders.map((o) => {
      const check = checkByCode.get(o.orderCode) ?? null;
      const tCode = o.assignedTruck?.split(" ")[0] ?? "";
      const driver = driverMap.get(tCode) ?? null;
      return {
        id: o.orderCode,
        product: o.product,
        qty: o.qty,
        buyer: o.buyerName,
        seller: o.sellerName,
        buyerPhone: o.buyerId ? (buyerPhoneMap.get(o.buyerId) ?? null) : null,
        deliveryPoint: o.deliveryPoint,
        status: o.status,
        totalAmount: o.totalAmount,
        distributorAssignedAt: o.distributorAssignedAt?.toISOString() ?? null,
        pickedUpFromHubAt: o.pickedUpFromHubAt?.toISOString() ?? null,
        arrivedAt: o.arrivedAt?.toISOString() ?? null,
        confirmedAt: o.confirmedAt.toISOString(),
        packetQty: check?.packetQty ?? 0,
        freeQty: o.freeQty,
        truckDriverName: driver?.name ?? null,
        truckDriverPhone: driver?.phone ?? null,
      };
    })
  );
}
