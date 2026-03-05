import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const where = { distributorId: session.userId };

  const [assigned, outForDelivery, delivered] = await Promise.all([
    prisma.order.count({ where: { ...where, status: "HUB_RECEIVED", distributorAssignedAt: { not: null } } }),
    prisma.order.count({ where: { ...where, status: "OUT_FOR_DELIVERY" } }),
    prisma.order.count({ where: { ...where, status: { in: ["ARRIVED", "PICKED_UP"] } } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveredToday = await prisma.order.count({
    where: { ...where, pickedUpFromHubAt: { gte: today } },
  });

  return NextResponse.json({ assigned, outForDelivery, delivered, deliveredToday });
}
