import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const hubs = await prisma.hub.findMany({
    where: { isActive: true, type: { in: ["DELIVERY", "BOTH"] } },
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(hubs);
}
