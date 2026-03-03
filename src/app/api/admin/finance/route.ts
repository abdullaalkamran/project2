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

  const [totalResult, monthResult, recentOrders] = await Promise.all([
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.order.aggregate({
      where: { confirmedAt: { gte: startOfMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      orderBy: { confirmedAt: "desc" },
      take: 50,
      select: {
        orderCode: true,
        sellerName: true,
        buyerName: true,
        product: true,
        totalAmount: true,
        productAmount: true,
        transportCost: true,
        platformFee: true,
        sellerPayable: true,
        status: true,
        dispatched: true,
        delivered: true,
        confirmedAt: true,
        lot: { select: { lotCode: true } },
      },
    }),
  ]);

  // Group by seller for revenue breakdown
  const sellerMap: Record<string, { seller: string; revenue: number; orders: number }> = {};
  for (const o of recentOrders) {
    if (!sellerMap[o.sellerName]) {
      sellerMap[o.sellerName] = { seller: o.sellerName, revenue: 0, orders: 0 };
    }
    sellerMap[o.sellerName].revenue += o.totalAmount;
    sellerMap[o.sellerName].orders++;
  }
  const sellerRevenue = Object.values(sellerMap).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    totalRevenue: totalResult._sum.totalAmount ?? 0,
    monthRevenue: monthResult._sum.totalAmount ?? 0,
    sellerRevenue,
    recentOrders: recentOrders.map((o) => ({
      orderCode: o.orderCode,
      lotCode: o.lot.lotCode,
      seller: o.sellerName,
      buyer: o.buyerName,
      product: o.product,
      amount: o.totalAmount,
      status: o.status,
      dispatched: o.dispatched,
      date: o.confirmedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
    })),
  });
}
