import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session || session.activeRole?.toLowerCase() !== "admin") return null;
  return session;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const hub = await prisma.hub.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } } },
      },
    },
  });
  if (!hub) return NextResponse.json({ message: "Hub not found" }, { status: 404 });

  const [lots, trucks, staffByHubId, orders, qcReports] = await Promise.all([
    prisma.lot.findMany({
      where: { hubId: hub.name },
      select: {
        id: true, lotCode: true, title: true, category: true, quantity: true, unit: true,
        status: true, sellerName: true, sellerId: true, grade: true, saleType: true,
        leaderDecision: true, verdict: true, createdAt: true, receivedAt: true,
        qcLeaderName: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.truck.findMany({
      where: { OR: [{ hubName: hub.name }, { hubId: hub.name }, { hubId: hub.id }] },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        OR: [{ hubId: hub.id }, { hubId: hub.name }],
        // Only hub management staff — QC/delivery roles are shown separately under people.*
        userRoles: { some: { role: { in: ["hub_manager", "delivery_hub_manager"] } } },
      },
      select: { id: true, name: true, email: true, phone: true, status: true, hubId: true },
    }),
    prisma.order.findMany({
      where: { lot: { hubId: hub.name } },
      select: {
        id: true, orderCode: true, product: true, qty: true, buyerName: true,
        sellerName: true, status: true, totalAmount: true, confirmedAt: true,
        dispatched: true, delivered: true,
        distributorId: true, distributorName: true, distributorPhone: true,
        deliveryPoint: true, assignedTruck: true,
        hubReceivedAt: true, arrivedAt: true, pickedUpAt: true, deliveredAt: true,
      },
      orderBy: { confirmedAt: "desc" },
      take: 100,
    }),
    prisma.qCReport.findMany({
      where: { lot: { hubId: hub.name }, checkerId: { not: null } },
      select: { checkerId: true, checkerName: true },
    }),
  ]);

  const allAssignedIds = hub.assignments.map(a => a.user.id);
  const staffIds = staffByHubId.map(u => u.id);
  const allStaffIds = [...new Set([...staffIds, ...allAssignedIds])];

  // Only show people who are explicitly registered to this hub via user.hubId
  const hubFilter = { OR: [{ hubId: hub.id }, { hubId: hub.name }] };
  const userSelect = { id: true, name: true, email: true, phone: true, status: true };

  const [staffRoles, registeredSellers, registeredQcLeaders, registeredQcCheckers, registeredDeliveryMen] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId: { in: allStaffIds } },
      select: { userId: true, role: true },
    }),
    prisma.user.findMany({
      where: { ...hubFilter, userRoles: { some: { role: "seller" } } },
      select: userSelect,
    }),
    prisma.user.findMany({
      where: { ...hubFilter, userRoles: { some: { role: "qc_leader" } } },
      select: userSelect,
    }),
    prisma.user.findMany({
      where: { ...hubFilter, userRoles: { some: { role: "qc_checker" } } },
      select: userSelect,
    }),
    prisma.user.findMany({
      where: { ...hubFilter, userRoles: { some: { role: "delivery_distributor" } } },
      select: userSelect,
    }),
  ]);

  const rolesByUser: Record<string, string[]> = {};
  for (const r of staffRoles) {
    if (!rolesByUser[r.userId]) rolesByUser[r.userId] = [];
    rolesByUser[r.userId].push(r.role);
  }

  const statusCounts: Record<string, number> = {};
  for (const l of lots) statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;

  return NextResponse.json({
    hub: {
      id: hub.id, name: hub.name, location: hub.location,
      type: hub.type, isActive: hub.isActive,
      createdAt: hub.createdAt.toISOString(),
    },
    stats: {
      totalLots: lots.length,
      activeLots: lots.filter(l => ["AT_HUB","IN_QC","QC_SUBMITTED","QC_PASSED","LIVE"].includes(l.status)).length,
      totalOrders: orders.length,
      deliveredOrders: orders.filter(o => o.delivered).length,
      totalTrucks: trucks.length,
      totalStaff: allStaffIds.length,
      lotStatusCounts: statusCounts,
    },
    lots: lots.map(l => ({
      id: l.id, lotCode: l.lotCode, title: l.title, category: l.category,
      quantity: l.quantity, unit: l.unit, status: l.status, sellerName: l.sellerName,
      grade: l.grade, saleType: l.saleType, leaderDecision: l.leaderDecision,
      verdict: l.verdict, createdAt: l.createdAt.toISOString(),
      receivedAt: l.receivedAt?.toISOString() ?? null,
    })),
    orders: orders.map(o => ({
      id: o.id, orderCode: o.orderCode, product: o.product, qty: o.qty,
      buyerName: o.buyerName, sellerName: o.sellerName, status: o.status,
      totalAmount: o.totalAmount, dispatched: o.dispatched, delivered: o.delivered,
      confirmedAt: o.confirmedAt.toISOString(),
      distributorName: o.distributorName ?? null, distributorPhone: o.distributorPhone ?? null,
      deliveryPoint: o.deliveryPoint ?? null, assignedTruck: o.assignedTruck ?? null,
      hubReceivedAt: o.hubReceivedAt?.toISOString() ?? null,
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
      pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
    })),
    staff: allStaffIds.map(uid => {
      const fromUser = staffByHubId.find(u => u.id === uid);
      const fromAssignment = hub.assignments.find(a => a.user.id === uid);
      const u = fromUser ?? fromAssignment?.user;
      if (!u) return null;
      return {
        id: uid, name: u.name, email: u.email,
        phone: (u as { phone?: string | null }).phone ?? null,
        status: (u as { status?: string }).status ?? "ACTIVE",
        roles: rolesByUser[uid] ?? [],
        assignmentRoles: hub.assignments.filter(a => a.user.id === uid).map(a => a.role),
      };
    }).filter(Boolean),
    trucks: trucks.map(t => ({
      id: t.id, truckCode: t.truckCode, reg: t.reg, type: t.type,
      capacityKg: t.capacityKg, status: t.status,
      driverName: null, driverPhone: null,
    })),
    managers: hub.assignments.map(a => ({
      assignmentId: a.id, role: a.role,
      userId: a.user.id, name: a.user.name, email: a.user.email,
    })),
    people: {
      sellers: registeredSellers.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, status: u.status,
        lotsCount: lots.filter(l => l.sellerId === u.id || l.sellerName === u.name).length,
      })),
      qcCheckers: registeredQcCheckers.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, status: u.status,
        reportsCount: qcReports.filter(r => r.checkerId === u.id).length,
      })),
      qcLeaders: registeredQcLeaders.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, status: u.status,
      })),
      deliveryMen: registeredDeliveryMen.map(u => {
        const order = orders.find(o => o.distributorId === u.id);
        return {
          id: u.id, name: u.name, email: u.email,
          phone: order?.distributorPhone ?? u.phone ?? null,
          status: u.status,
          deliveriesCount: orders.filter(o => o.distributorId === u.id).length,
        };
      }),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, location, type, isActive } = await req.json() as {
    name?: string; location?: string; type?: string; isActive?: boolean;
  };

  const hub = await prisma.hub.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(location !== undefined && { location: location.trim() }),
      ...(type !== undefined && { type }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ hub });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.hub.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
