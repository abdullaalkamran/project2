import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { status?: string; currentDestination?: string | null };

  const truck = await prisma.truck.findUnique({ where: { truckCode: id } });
  if (!truck) return NextResponse.json({ message: "Truck not found" }, { status: 404 });

  const updated = await prisma.truck.update({
    where: { id: truck.id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.currentDestination !== undefined && { currentDestination: body.currentDestination }),
    },
    include: { driver: true },
  });

  return NextResponse.json({
    id:                 updated.truckCode,
    status:             updated.status,
    currentDestination: updated.currentDestination ?? null,
    driverName:         updated.driver?.name ?? null,
    driverPhone:        updated.driver?.phone ?? null,
  });
}
