import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: true,
      wallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } } },
      buyerOrders: {
        orderBy: { confirmedAt: "desc" },
        take: 10,
        select: {
          id: true, orderCode: true, product: true, qty: true,
          totalAmount: true, status: true, dispatched: true, confirmedAt: true,
        },
      },
      sellerLots: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, lotCode: true, title: true, quantity: true, unit: true,
          status: true, createdAt: true, hubId: true,
          qcLeaderName: true, qcCheckerName: true,
          qcTaskStatus: true, leaderDecision: true,
        },
      },
      sellerOrders: {
        orderBy: { confirmedAt: "desc" },
        take: 10,
        select: {
          id: true, orderCode: true, product: true, qty: true,
          totalAmount: true, status: true, dispatched: true, confirmedAt: true,
        },
      },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { lot: { select: { lotCode: true, title: true } } },
      },
      qcReports: {
        orderBy: { submittedAt: "desc" },
        take: 10,
        include: {
          lot: { select: { lotCode: true, title: true, status: true, leaderDecision: true, hubId: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const roles = user.userRoles.map((r) => r.role);

  // QC leader: lots assigned by name
  const qcLeaderLots = roles.includes("qc_leader") && user.name
    ? await prisma.lot.findMany({
        where: { qcLeaderName: user.name },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, lotCode: true, title: true, quantity: true, unit: true,
          status: true, qcTaskStatus: true, leaderDecision: true,
          qcCheckerName: true, createdAt: true, hubId: true,
        },
      })
    : [];

  // Hub manager: lots in hub pipeline
  const hubLots = roles.includes("hub_manager")
    ? await prisma.lot.findMany({
        where: {
          status: { in: ["AT_HUB", "IN_QC", "QC_SUBMITTED", "QC_PASSED", "QC_FAILED", "LIVE", "AUCTION_ENDED"] },
          ...(user.hubId ? { hubId: user.hubId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, lotCode: true, title: true, sellerName: true,
          quantity: true, unit: true, status: true, createdAt: true, hubId: true,
        },
      })
    : [];

  // Derive seller's primary hub: most common hubId across their lots
  const sellerPrimaryHub = (() => {
    if (!roles.includes("seller") || user.sellerLots.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const l of user.sellerLots) {
      counts[l.hubId] = (counts[l.hubId] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  // Derive QC checker's primary hub from their submitted reports
  const checkerPrimaryHub = (() => {
    if (!roles.includes("qc_checker") || user.qcReports.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const r of user.qcReports) {
      const h = r.lot.hubId;
      if (h) counts[h] = (counts[h] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  // Derive QC leader's primary hub from their assigned lots
  const leaderPrimaryHub = (() => {
    if (qcLeaderLots.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const l of qcLeaderLots) {
      if (l.hubId) counts[l.hubId] = (counts[l.hubId] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    photo: user.photo ?? null,
    hubId: user.hubId ?? null,
    isVerified: user.isVerified,
    status: user.status,
    roles,
    createdAt: fmt(user.createdAt),
    updatedAt: fmt(user.updatedAt),
    // derived hub context per role
    hubContext: {
      assignedHub: user.hubId ?? null,                              // explicit assignment
      sellerPrimaryHub,                                             // inferred from lots
      checkerPrimaryHub,                                            // inferred from QC reports
      leaderPrimaryHub,                                             // inferred from assigned lots
      managerHub: user.hubId ?? null,                               // explicit for hub_manager
    },
    wallet: user.wallet
      ? {
          balance: user.wallet.balance,
          transactions: user.wallet.transactions.map((t) => ({
            id: t.id, type: t.type, amount: t.amount,
            description: t.description, createdAt: fmt(t.createdAt),
          })),
        }
      : null,
    buyerOrders: user.buyerOrders.map((o) => ({
      id: o.id, orderCode: o.orderCode, product: o.product, qty: o.qty,
      amount: o.totalAmount, status: o.status, dispatched: o.dispatched,
      date: fmt(o.confirmedAt),
    })),
    sellerOrders: user.sellerOrders.map((o) => ({
      id: o.id, orderCode: o.orderCode, product: o.product, qty: o.qty,
      amount: o.totalAmount, status: o.status, dispatched: o.dispatched,
      date: fmt(o.confirmedAt),
    })),
    sellerLots: user.sellerLots.slice(0, 10).map((l) => ({
      id: l.id, lotCode: l.lotCode, title: l.title,
      qty: `${l.quantity} ${l.unit}`, status: l.status,
      hub: l.hubId,
      qcStatus: l.qcTaskStatus ?? null,
      leaderDecision: l.leaderDecision ?? null,
      createdAt: fmt(l.createdAt),
    })),
    // lot status breakdown for sellers
    sellerLotStats: (() => {
      const all = user.sellerLots;
      return {
        total: all.length,
        live: all.filter(l => l.status === "LIVE").length,
        inQc: all.filter(l => ["IN_QC", "QC_SUBMITTED"].includes(l.status)).length,
        passed: all.filter(l => l.status === "QC_PASSED").length,
        failed: all.filter(l => l.status === "QC_FAILED").length,
        ended: all.filter(l => l.status === "AUCTION_ENDED").length,
        pending: all.filter(l => l.status === "PENDING_DELIVERY").length,
        atHub: all.filter(l => l.status === "AT_HUB").length,
      };
    })(),
    bids: user.bids.map((b) => ({
      id: b.id, lotCode: b.lot.lotCode, lotTitle: b.lot.title,
      amount: b.amount, date: fmt(b.createdAt),
    })),
    qcReports: user.qcReports.map((r) => ({
      id: r.id,
      lotCode: r.lot.lotCode,
      lotTitle: r.lot.title,
      lotStatus: r.lot.status,
      hub: r.lot.hubId ?? null,
      grade: r.grade,
      verdict: r.verdict,
      minBidRate: r.minBidRate ?? null,
      notes: r.notes ?? null,
      leaderDecision: r.lot.leaderDecision ?? null,
      submittedAt: fmt(r.submittedAt),
    })),
    qcLeaderLots: qcLeaderLots.map((l) => ({
      id: l.id, lotCode: l.lotCode, title: l.title,
      qty: `${l.quantity} ${l.unit}`,
      hub: l.hubId ?? null,
      status: l.status,
      qcStatus: l.qcTaskStatus ?? null,
      checkerName: l.qcCheckerName ?? null,
      decision: l.leaderDecision ?? null,
      createdAt: fmt(l.createdAt),
    })),
    hubLots: hubLots.map((l) => ({
      id: l.id, lotCode: l.lotCode, title: l.title,
      seller: l.sellerName,
      qty: `${l.quantity} ${l.unit}`,
      hub: l.hubId,
      status: l.status,
      createdAt: fmt(l.createdAt),
    })),
  });
}
