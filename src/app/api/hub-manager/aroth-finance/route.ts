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

  // Always load ALL registered aroths for this hub (not just ones with orders)
  const assignments = await prisma.arothAssignment.findMany({
    where: hubIds ? { hubId: { in: hubIds } } : {},
    select: {
      id: true,
      userId: true,
      hubId: true,
      commissionRate: true,
      allowedProducts: true,
      isVerified: true,
      user: { select: { name: true, email: true } },
      hub:  { select: { name: true } },
    },
  });

  // Load all aroth-routed orders for this hub
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

  // Aggregate order stats per aroth userId
  const statsMap: Record<string, {
    orders: number;
    activeOrders: number;
    awaitingPayment: number;
    settledOrders: number;
    totalSales: number;
    totalCommission: number;
    totalNetAmount: number;
    lastActivity: string | null;
  }> = {};

  for (const o of orders) {
    const id = o.arothId!;
    if (!statsMap[id]) {
      statsMap[id] = {
        orders: 0, activeOrders: 0, awaitingPayment: 0,
        settledOrders: 0, totalSales: 0, totalCommission: 0,
        totalNetAmount: 0, lastActivity: null,
      };
    }
    const s = statsMap[id];
    s.orders += 1;
    if (o.arothStatus === "SETTLED") {
      s.settledOrders += 1;
      s.totalSales     += o.arothSaleAmount  ?? 0;
      s.totalCommission += o.arothCommission ?? 0;
      s.totalNetAmount  += o.arothNetAmount  ?? 0;
    } else {
      s.activeOrders += 1;
      if (o.arothStatus === "PAYMENT_SENT") s.awaitingPayment += 1;
    }
    const ts = (o.arothSettledAt ?? o.arothPaymentSentAt ?? o.arothPaymentConfirmedAt ?? o.confirmedAt) as Date | null;
    const iso = ts instanceof Date ? ts.toISOString() : null;
    if (iso && (!s.lastActivity || iso > s.lastActivity)) s.lastActivity = iso;
  }

  // Build aroth accounts from ALL assignments, overlay stats
  const arothAccounts = assignments.map((a) => {
    const s = statsMap[a.userId] ?? {
      orders: 0, activeOrders: 0, awaitingPayment: 0,
      settledOrders: 0, totalSales: 0, totalCommission: 0,
      totalNetAmount: 0, lastActivity: null,
    };
    return {
      arothId:       a.userId,
      arothName:     a.user.name,
      email:         a.user.email,
      hubName:       a.hub.name,
      isVerified:    a.isVerified,
      commissionRate: a.commissionRate,
      allowedProducts: a.allowedProducts,
      ...s,
    };
  });

  // Summary (only from orders)
  const totalSales       = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED"      ? (o.arothSaleAmount ?? 0) : 0), 0);
  const totalCommission  = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED"      ? (o.arothCommission ?? 0) : 0), 0);
  const totalNetReceived = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED"      ? (o.arothNetAmount  ?? 0) : 0), 0);
  const pendingAmount    = orders.reduce((s, o) => s + (o.arothStatus === "PAYMENT_SENT" ? (o.arothNetAmount  ?? 0) : 0), 0);
  const settledCount     = orders.filter((o) => o.arothStatus === "SETTLED").length;
  const awaitingCount    = orders.filter((o) => o.arothStatus === "PAYMENT_SENT").length;

  const toIso = (v: Date | string | null) =>
    v instanceof Date ? v.toISOString() : v;

  return NextResponse.json({
    summary: {
      totalOrders: orders.length,
      activeOrders: orders.length - settledCount,
      settledOrders: settledCount,
      awaitingConfirmation: awaitingCount,
      totalSales,
      totalCommission,
      totalNetReceived,
      pendingAmount,
    },
    arothAccounts,
    orders: orders.map((o) => ({
      ...o,
      confirmedAt:            toIso(o.confirmedAt),
      arothPaymentSentAt:     toIso(o.arothPaymentSentAt),
      arothPaymentConfirmedAt: toIso(o.arothPaymentConfirmedAt),
      arothSettledAt:         toIso(o.arothSettledAt),
    })),
  });
}
