import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/hubs/delivery
 *
 * Public endpoint — returns hubs that can act as delivery points
 * (type BOTH or DELIVERY, and isActive = true).
 * Used by the live auction page so buyers can pick a delivery hub before bidding.
 */
export async function GET() {
  const hubs = await prisma.hub.findMany({
    where: {
      isActive: true,
      type: { in: ["BOTH", "DELIVERY"] },
    },
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(hubs);
}
