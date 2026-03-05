import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

async function requireAdmin() {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const hubs = await prisma.hub.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const [lots, trucks] = await Promise.all([
    prisma.lot.findMany({ select: { hubId: true, status: true } }),
    prisma.truck.findMany({ select: { hubId: true, status: true } }),
  ]);

  const lotMap: Record<string, { total: number; active: number }> = {};
  for (const l of lots) {
    if (!lotMap[l.hubId]) lotMap[l.hubId] = { total: 0, active: 0 };
    lotMap[l.hubId].total++;
    if (["LIVE", "IN_QC", "QC_SUBMITTED", "QC_PASSED", "AT_HUB"].includes(l.status)) {
      lotMap[l.hubId].active++;
    }
  }

  const truckMap: Record<string, number> = {};
  for (const t of trucks) {
    if (t.hubId) truckMap[t.hubId] = (truckMap[t.hubId] ?? 0) + 1;
  }

  const result = hubs.map((h) => ({
    id: h.id,
    name: h.name,
    location: h.location,
    type: h.type,
    isActive: h.isActive,
    createdAt: h.createdAt.toISOString(),
    lots: lotMap[h.name]?.total ?? 0,
    activeLots: lotMap[h.name]?.active ?? 0,
    trucks: truckMap[h.name] ?? 0,
    managers: h.assignments.map((a) => ({
      assignmentId: a.id,
      role: a.role,
      userId: a.user.id,
      name: a.user.name,
      email: a.user.email,
    })),
  }));

  return NextResponse.json({ hubs: result });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, location, type } = await req.json() as {
    name?: string; location?: string; type?: string;
  };

  if (!name?.trim() || !location?.trim()) {
    return NextResponse.json({ message: "name and location are required" }, { status: 400 });
  }

  const hub = await prisma.hub.create({
    data: { name: name.trim(), location: location.trim(), type: type ?? "BOTH" },
  });

  return NextResponse.json({ hub }, { status: 201 });
}
