import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/** Returns QC leaders and checkers for the hub manager to assign. */
export async function GET() {
  const session = await getSessionUser();
  if (!session || session.activeRole !== "hub_manager") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [leaders, checkers] = await Promise.all([
    prisma.userRole.findMany({
      where: { role: "qc_leader" },
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.userRole.findMany({
      where: { role: "qc_checker" },
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  return NextResponse.json({
    leaders: leaders.map((r) => ({ id: r.user.id, name: r.user.name })),
    checkers: checkers.map((r) => ({ id: r.user.id, name: r.user.name })),
  });
}
