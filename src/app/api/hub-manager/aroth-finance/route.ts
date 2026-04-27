import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;

  const hubIds =
    auth.session!.activeRole === "admin"
      ? undefined
      : (
          await prisma.hubManagerAssignment.findMany({
            where: { userId, role: "hub_manager" },
            select: { hubId: true },
          })
        ).map((h) => h.hubId);

  const orders = await prisma.order.findMany({
    where: {
      arothId: { not: null },
      ...(hubIds ? { arothHubId: { in: hubIds } } : {}),
    },
    orderBy: { confirmedAt: "desc" },
    select: {
      id: true,
      orderCode: true,
      product: true,
      qty: true,
      totalAmount: true,
      buyerName: true,
      arothId: true,
      arothName: true,
      arothHubId: true,
      arothStatus: true,
      arothSaleAmount: true,
      arothCommissionRate: true,
      arothCommission: true,
      arothNetAmount: true,
      arothPaymentSentAt: true,
      arothPaymentConfirmedAt: true,
      arothSettledAt: true,
      confirmedAt: true,
    },
  });

  // Per-aroth accounts aggregation
  const arothMap: Record<
    string,
    {
      arothId: string;
      arothName: string;
      orders: number;
      activeOrders: number;
      awaitingPayment: number;
      totalSales: number;
      totalCommission: number;
      totalNetAmount: number;
      settledOrders: number;
      lastActivity: string | null;
    }
  > = {};

  for (const o of orders) {
    const id = o.arothId!;
    if (!arothMap[id]) {
      arothMap[id] = {
        arothId: id,
        arothName: o.arothName ?? "Unknown",
        orders: 0,
        activeOrders: 0,
        awaitingPayment: 0,
        totalSales: 0,
        totalCommission: 0,
        totalNetAmount: 0,
        settledOrders: 0,
        lastActivity: null,
      };
    }
    const a = arothMap[id];
    a.orders += 1;
    if (o.arothStatus === "SETTLED") {
      a.settledOrders += 1;
      a.totalSales += o.arothSaleAmount ?? 0;
      a.totalCommission += o.arothCommission ?? 0;
      a.totalNetAmount += o.arothNetAmount ?? 0;
    } else {
      a.activeOrders += 1;
      if (o.arothStatus === "PAYMENT_SENT") a.awaitingPayment += 1;
    }
    const latest = o.arothSettledAt ?? o.arothPaymentSentAt ?? o.arothPaymentConfirmedAt ?? o.confirmedAt?.toISOString?.() ?? null;
    if (!a.lastActivity || (latest && latest > a.lastActivity)) {
      a.lastActivity = typeof latest === "string" ? latest : (latest as Date | null)?.toISOString?.() ?? null;
    }
  }

  // Enrich with isVerified + commissionRate from ArothAssignment
  const assignments = await prisma.arothAssignment.findMany({
    where: { userId: { in: Object.keys(arothMap) } },
    select: { userId: true, isVerified: true, commissionRate: true },
  });
  const assignMap = Object.fromEntries(assignments.map((a) => [a.userId, a]));

  const arothAccounts = Object.values(arothMap).map((a) => ({
    ...a,
    isVerified: assignMap[a.arothId]?.isVerified ?? false,
    commissionRate: assignMap[a.arothId]?.commissionRate ?? 0,
  }));

  // Summary
  const totalSales = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED" ? (o.arothSaleAmount ?? 0) : 0), 0);
  const totalCommission = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED" ? (o.arothCommission ?? 0) : 0), 0);
  const totalNetReceived = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED" ? (o.arothNetAmount ?? 0) : 0), 0);
  const pendingAmount = orders.reduce((s, o) => s + (o.arothStatus === "PAYMENT_SENT" ? (o.arothNetAmount ?? 0) : 0), 0);
  const settledOrders = orders.filter((o) => o.arothStatus === "SETTLED").length;
  const awaitingConfirmation = orders.filter((o) => o.arothStatus === "PAYMENT_SENT").length;

  return NextResponse.json({
    summary: {
      totalOrders: orders.length,
      activeOrders: orders.length - settledOrders,
      settledOrders,
      awaitingConfirmation,
      totalSales,
      totalCommission,
      totalNetReceived,
      pendingAmount,
    },
    arothAccounts,
    orders: orders.map((o) => ({
      ...o,
      confirmedAt: o.confirmedAt instanceof Date ? o.confirmedAt.toISOString() : o.confirmedAt,
      arothPaymentSentAt: o.arothPaymentSentAt instanceof Date ? o.arothPaymentSentAt.toISOString() : o.arothPaymentSentAt,
      arothPaymentConfirmedAt: o.arothPaymentConfirmedAt instanceof Date ? o.arothPaymentConfirmedAt.toISOString() : o.arothPaymentConfirmedAt,
      arothSettledAt: o.arothSettledAt instanceof Date ? o.arothSettledAt.toISOString() : o.arothSettledAt,
    })),
  });
}
