import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [lots, managers, trucks] = await Promise.all([
    prisma.lot.findMany({ select: { hubId: true, status: true } }),
    prisma.user.findMany({
      where: { userRoles: { some: { role: "hub_manager" } } },
      select: { id: true, name: true, email: true, status: true },
    }),
    prisma.truck.findMany({ select: { hubId: true, hubName: true, status: true } }),
  ]);

  // Group lots by hubId
  const hubMap: Record<string, { hubId: string; lots: number; activeLots: number; trucks: number }> = {};
  for (const l of lots) {
    if (!hubMap[l.hubId]) hubMap[l.hubId] = { hubId: l.hubId, lots: 0, activeLots: 0, trucks: 0 };
    hubMap[l.hubId].lots++;
    if (["LIVE", "IN_QC", "QC_SUBMITTED", "QC_PASSED", "AT_HUB"].includes(l.status)) {
      hubMap[l.hubId].activeLots++;
    }
  }

  // Count trucks per hub
  for (const t of trucks) {
    if (t.hubId && hubMap[t.hubId]) hubMap[t.hubId].trucks++;
  }

  const hubs = Object.values(hubMap).sort((a, b) => b.lots - a.lots);

  return NextResponse.json({ hubs, managers });
}
