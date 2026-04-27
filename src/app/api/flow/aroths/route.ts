import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// GET /api/flow/aroths?hubId=xxx  — list aroths assigned to a hub
export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  const hubId = req.nextUrl.searchParams.get("hubId");
  if (!hubId) return NextResponse.json({ message: "hubId required" }, { status: 400 });

  const assignments = await prisma.arothAssignment.findMany({
    where: { hubId },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(
    assignments.map((a) => ({
      id: a.userId,
      name: a.user.name,
      phone: a.user.phone,
      commissionRate: a.commissionRate,
      hubId: a.hubId,
    }))
  );
}
