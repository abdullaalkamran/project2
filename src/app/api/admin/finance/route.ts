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

  // Last 6 month start dates
  const monthStarts = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
  );
  const sixMonthsAgo = monthStarts[0];

  const [totalResult, monthResult, feeResult, payableResult, allOrders, paidRequests] = await Promise.all([
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.order.aggregate({
      where: { confirmedAt: { gte: startOfMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({ _sum: { platformFee: true } }),
    prisma.order.aggregate({ _sum: { sellerPayable: true } }),
    prisma.order.findMany({
      orderBy: { confirmedAt: "desc" },
      take: 300,
      select: {
        orderCode: true, sellerName: true, buyerName: true, product: true,
        totalAmount: true, productAmount: true, transportCost: true,
        platformFee: true, sellerPayable: true,
        status: true, dispatched: true, delivered: true, confirmedAt: true,
        lot: { select: { lotCode: true } },
      },
    }),
    prisma.paymentRequest.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  // Monthly trend — last 6 months
  const recentOrders = allOrders.filter(o => o.confirmedAt >= sixMonthsAgo);
  const monthlyTrend = monthStarts.map((start, i) => {
    const end = i < 5 ? monthStarts[i + 1] : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const label = start.toLocaleDateString("en-BD", { month: "short", year: "2-digit" });
    const bucket = recentOrders.filter(o => o.confirmedAt >= start && o.confirmedAt < end);
    return {
      month: label,
      revenue: Math.round(bucket.reduce((s, o) => s + o.totalAmount, 0)),
      platformFees: Math.round(bucket.reduce((s, o) => s + o.platformFee, 0)),
      sellerPayable: Math.round(bucket.reduce((s, o) => s + o.sellerPayable, 0)),
      orders: bucket.length,
    };
  });

  // Group by seller
  const sellerMap: Record<string, { seller: string; revenue: number; sellerPayable: number; platformFees: number; orders: number }> = {};
  for (const o of allOrders) {
    if (!sellerMap[o.sellerName]) {
      sellerMap[o.sellerName] = { seller: o.sellerName, revenue: 0, sellerPayable: 0, platformFees: 0, orders: 0 };
    }
    sellerMap[o.sellerName].revenue       += o.totalAmount;
    sellerMap[o.sellerName].sellerPayable += o.sellerPayable;
    sellerMap[o.sellerName].platformFees  += o.platformFee;
    sellerMap[o.sellerName].orders++;
  }
  const sellerRevenue = Object.values(sellerMap).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    totalRevenue:       totalResult._sum.totalAmount    ?? 0,
    monthRevenue:       monthResult._sum.totalAmount    ?? 0,
    totalPlatformFees:  feeResult._sum.platformFee      ?? 0,
    totalSellerPayable: payableResult._sum.sellerPayable ?? 0,
    totalPaidOut:       paidRequests._sum.amount         ?? 0,
    monthlyTrend,
    sellerRevenue,
    recentOrders: allOrders.slice(0, 50).map((o) => ({
      orderCode: o.orderCode,
      lotCode: o.lot.lotCode,
      seller: o.sellerName,
      buyer: o.buyerName,
      product: o.product,
      amount: o.totalAmount,
      platformFee: o.platformFee,
      sellerPayable: o.sellerPayable,
      status: o.status,
      dispatched: o.dispatched,
      delivered: o.delivered,
      date: o.confirmedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
    })),
  });
}
