import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { readLotOptions } from "@/lib/lot-options";

// GET /api/hub-manager/aroths — list all aroths in the hub manager's hub(s)
export async function GET() {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;
  const isAdmin = auth.session!.activeRole === "admin";

  const hubIds = isAdmin
    ? undefined
    : (await prisma.hubManagerAssignment.findMany({
        where: { userId, role: "hub_manager" },
        select: { hubId: true },
      })).map((h) => h.hubId);

  const assignments = await prisma.arothAssignment.findMany({
    where: hubIds ? { hubId: { in: hubIds } } : {},
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      hub:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const { productNames } = readLotOptions();

  return NextResponse.json({
    aroths: assignments.map((a) => ({
      assignmentId: a.id,
      userId: a.userId,
      name: a.user.name,
      email: a.user.email,
      phone: a.user.phone,
      hubId: a.hubId,
      hubName: a.hub.name,
      commissionRate: a.commissionRate,
      allowedProducts: a.allowedProducts,
      isVerified: a.isVerified,
    })),
    allProducts: productNames,
  });
}
