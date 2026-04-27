import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "hub_manager", "qc_leader", "delivery_hub_manager"]);
  if (auth.response) return auth.response;

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
