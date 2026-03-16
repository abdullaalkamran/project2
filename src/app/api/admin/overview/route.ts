import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    newUsersThisMonth,
    activeLots,
    pendingQC,
    openOrders,
    trucks,
    openDisputes,
    revenueResult,
    lastMonthRevenueResult,
    allTimeRevenueResult,
    platformFeesResult,
    suspendedUsers,
    pendingUsers,
    sellerCount,
    buyerCount,
    hubCount,
    lotStatusCounts,
    deliveredOrdersCount,
    pendingPaymentsCount,
    pendingDepositsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.lot.count({ where: { status: { in: ["LIVE", "QC_PASSED", "IN_QC", "AT_HUB"] } } }),
    prisma.lot.count({ where: { status: { in: ["IN_QC", "QC_SUBMITTED"] } } }),
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "DISPATCHED"] } } }),
    prisma.truck.count({ where: { status: "Available" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ["CONFIRMED", "DISPATCHED", "DELIVERED"] },
        confirmedAt: { gte: startOfMonth },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ["CONFIRMED", "DISPATCHED", "DELIVERED"] },
        confirmedAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["CONFIRMED", "DISPATCHED", "DELIVERED"] } },
    }),
    prisma.order.aggregate({
      _sum: { platformFee: true },
      where: { status: { in: ["CONFIRMED", "DISPATCHED", "DELIVERED"] } },
    }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.userRole.count({ where: { role: "seller" } }),
    prisma.userRole.count({ where: { role: "buyer" } }),
    prisma.hub.count({ where: { isActive: true } }),
    prisma.lot.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.count({ where: { delivered: true } }),
    prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
  ]);

  const thisMonthRevenue = revenueResult._sum.totalAmount ?? 0;
  const lastMonthRevenue = lastMonthRevenueResult._sum.totalAmount ?? 0;
  const allTimeRevenue = allTimeRevenueResult._sum.totalAmount ?? 0;
  const totalPlatformFees = platformFeesResult._sum.platformFee ?? 0;

  const revenueGrowth =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0
      ? 100
      : 0;

  // Build lot status breakdown map
  const lotBreakdown: Record<string, number> = {};
  for (const row of lotStatusCounts) {
    lotBreakdown[row.status] = row._count._all;
  }

  const recentUsers = await prisma.user.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { userRoles: true },
  });

  const recentLots = await prisma.lot.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  const recentOrders = await prisma.order.findMany({
    take: 8,
    orderBy: { confirmedAt: "desc" },
    select: {
      id: true,
      orderCode: true,
      buyerName: true,
      sellerName: true,
      product: true,
      totalAmount: true,
      status: true,
      confirmedAt: true,
    },
  });

  // Hub stats
  const hubs = await prisma.hub.findMany({
    where: { isActive: true },
    select: { id: true, name: true, location: true, type: true },
    take: 6,
  });

  const hubIds = hubs.map((h) => h.name);
  const [hubLotCounts] = await Promise.all([
    prisma.lot.groupBy({
      by: ["hubId"],
      _count: { _all: true },
      where: { hubId: { in: hubIds } },
    }),
  ]);

  const lotsByHub: Record<string, number> = {};
  for (const row of hubLotCounts) lotsByHub[row.hubId] = row._count._all;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });

  const stats = [
    { label: "Total Users",       value: String(totalUsers),   sub: `+${newUsersThisMonth} this month`,      href: "/admin/users",      color: "text-indigo-700",  bg: "bg-indigo-50" },
    { label: "Active Auctions",   value: String(activeLots),   sub: "Lots in pipeline",                      href: "/admin/auctions",   color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Open Disputes",     value: String(openDisputes), sub: "Action needed",                         href: "/admin/disputes",   color: "text-red-600",     bg: "bg-red-50" },
    { label: "Open Orders",       value: String(openOrders),   sub: `${deliveredOrdersCount} delivered`,     href: "/admin/orders",     color: "text-blue-700",    bg: "bg-blue-50" },
    { label: "QC Pending",        value: String(pendingQC),    sub: "Lots awaiting inspection",              href: "/admin/qc-reports", color: "text-teal-700",    bg: "bg-teal-50" },
    { label: "Trucks Available",  value: String(trucks),       sub: "Fleet ready for dispatch",              href: "/admin/hubs",       color: "text-amber-700",   bg: "bg-amber-50" },
  ];

  return NextResponse.json({
    stats,
    revenue: {
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
      allTime: allTimeRevenue,
      platformFees: totalPlatformFees,
      growth: revenueGrowth,
    },
    userBreakdown: {
      total: totalUsers,
      sellers: sellerCount,
      buyers: buyerCount,
      suspended: suspendedUsers,
      pending: pendingUsers,
      newThisMonth: newUsersThisMonth,
    },
    platformHealth: {
      hubCount,
      pendingPayments: pendingPaymentsCount,
      deliveredOrders: deliveredOrdersCount,
      lotBreakdown,
    },
    hubs: hubs.map((h) => ({
      id: h.id,
      name: h.name,
      location: h.location,
      type: h.type,
      lots: lotsByHub[h.name] ?? 0,
    })),
    badges: {
      disputes: openDisputes,
      pendingUsers: pendingUsers,
      pendingPayments: pendingPaymentsCount,
      pendingQC,
      pendingDeposits: pendingDepositsCount,
    },
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.userRoles[0]?.role ?? "—",
      status: u.status,
      joined: fmt(u.createdAt),
    })),
    recentLots: recentLots.map((l) => ({
      id: l.id,
      lotCode: l.lotCode,
      title: l.title,
      seller: l.sellerName,
      status: l.status,
      createdAt: fmt(l.createdAt),
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      buyer: o.buyerName,
      seller: o.sellerName,
      product: o.product,
      amount: o.totalAmount,
      status: o.status,
      date: fmt(o.confirmedAt),
    })),
  });
}
