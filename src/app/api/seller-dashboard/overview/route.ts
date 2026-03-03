import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SELLER_ACTIVE_STATUSES, toSellerStatusLabel } from "@/lib/lot-status";

export async function GET() {
  const session = await getSessionUser();

  const [lots, orders] = await Promise.all([
    prisma.lot.findMany({
      where: session?.userId
        ? { OR: [{ sellerId: session.userId }, { sellerName: session.name }] }
        : {},
      orderBy: { createdAt: "desc" },
      include: { bids: true },
    }),
    prisma.order.findMany({
      where: session?.userId
        ? { OR: [{ sellerId: session.userId }, { sellerName: session.name }] }
        : {},
      orderBy: { confirmedAt: "desc" },
    }),
  ]);

  const activeLots = lots.filter((l) =>
    SELLER_ACTIVE_STATUSES.includes(l.status as (typeof SELLER_ACTIVE_STATUSES)[number])
  );
  const pendingOrders = orders.filter((o) => o.status === "CONFIRMED");
  const thisMonthEarnings = orders
    .filter((o) => ["DISPATCHED", "ARRIVED", "PICKED_UP"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // ── Stats cards ────────────────────────────────────────────────────────────
  const stats = [
    {
      label: "Active lots",
      value: String(activeLots.length),
      sub: `${lots.filter((l) => l.status === "LIVE").length} live now`,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      href: "/seller-dashboard/lots",
    },
    {
      label: "Pending orders",
      value: String(orders.filter((o) => o.sellerStatus === "PENDING_SELLER").length),
      sub: "Need your decision",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-100",
      href: "/seller-dashboard/orders",
    },
    {
      label: "This month earnings",
      value: `৳ ${thisMonthEarnings.toLocaleString()}`,
      sub: "From completed orders",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-100",
      href: "/seller-dashboard/finance",
    },
    {
      label: "Pending payout",
      value: `৳ ${pendingOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}`,
      sub: "Awaiting dispatch",
      color: "text-violet-700",
      bg: "bg-violet-50",
      border: "border-violet-100",
      href: "/seller-dashboard/finance",
    },
  ];

  // ── Active lot detail cards ────────────────────────────────────────────────
  const activeLotDetails = activeLots.slice(0, 6).map((l) => ({
    lotCode: l.lotCode,
    title: l.title,
    quantity: `${l.quantity} ${l.unit}`,
    status: toSellerStatusLabel(l.status),
    rawStatus: l.status,
    bids: l.bids.length,
    topBid: l.bids.length
      ? `৳ ${Math.max(...l.bids.map((b) => b.amount)).toLocaleString()}`
      : null,
    auctionEndsAt: l.auctionEndsAt ? l.auctionEndsAt.toISOString() : null,
    needsAction: l.status === "AUCTION_UNSOLD",
  }));

  // ── Pending seller decisions ──────────────────────────────────────────────
  const pendingDecisions = orders
    .filter((o) => o.sellerStatus === "PENDING_SELLER")
    .slice(0, 5)
    .map((o) => ({
      id: o.orderCode,
      product: o.product,
      buyer: o.buyerName,
      qty: o.qty,
      amount: `৳ ${o.totalAmount.toLocaleString()}`,
      confirmedAt: o.confirmedAt.toLocaleDateString("en-BD", {
        month: "short", day: "numeric",
      }),
    }));

  // ── Recent orders ─────────────────────────────────────────────────────────
  const recentOrders = orders.slice(0, 6).map((o) => ({
    id: o.orderCode,
    product: o.product,
    buyer: o.buyerName,
    amount: `৳ ${o.totalAmount.toLocaleString()}`,
    status: o.status,
    sellerStatus: o.sellerStatus,
    confirmedAt: o.confirmedAt.toLocaleDateString("en-BD", {
      month: "short", day: "numeric", year: "numeric",
    }),
  }));

  // ── Lot status breakdown ──────────────────────────────────────────────────
  const statusBreakdown: Record<string, number> = {};
  for (const l of lots) {
    const label = toSellerStatusLabel(l.status);
    statusBreakdown[label] = (statusBreakdown[label] ?? 0) + 1;
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  const totalBids = lots.reduce((s, l) => s + l.bids.length, 0);
  const avgBidsPerLot = lots.length ? (totalBids / lots.length).toFixed(1) : "0";

  const lotsWithBoth = lots.filter((l) => l.minBidRate && l.basePrice > 0);
  const avgVsReserve =
    lotsWithBoth.length > 0
      ? `+${(
          lotsWithBoth.reduce(
            (s, l) => s + ((l.minBidRate! - l.basePrice) / l.basePrice) * 100, 0
          ) / lotsWithBoth.length
        ).toFixed(1)}%`
      : "N/A";

  const buyerOrderCounts = new Map<string, number>();
  orders.forEach((o) => {
    const key = o.buyerId ?? o.buyerName;
    buyerOrderCounts.set(key, (buyerOrderCounts.get(key) ?? 0) + 1);
  });
  const uniqueBuyers = buyerOrderCounts.size;
  const repeatBuyers = Array.from(buyerOrderCounts.values()).filter((c) => c > 1).length;
  const repeatBuyerRate = uniqueBuyers ? `${Math.round((repeatBuyers / uniqueBuyers) * 100)}%` : "0%";

  const analyticsStats = [
    { label: "Total lots run",          value: String(lots.length),                                                         color: "text-slate-900" },
    { label: "Sell-through rate",       value: lots.length ? `${Math.round((orders.length / lots.length) * 100)}%` : "0%", color: "text-emerald-700" },
    { label: "Avg closing vs reserve",  value: avgVsReserve,                                                                 color: "text-blue-700" },
    { label: "Repeat buyer rate",       value: repeatBuyerRate,                                                              color: "text-violet-700" },
    { label: "Avg bids per lot",        value: avgBidsPerLot,                                                                color: "text-orange-600" },
    { label: "Total orders",            value: String(orders.length),                                                        color: "text-slate-700" },
  ];

  // ── Lot performance table ─────────────────────────────────────────────────
  const lotPerformance = lots.slice(0, 5).map((l) => {
    const bidCount = l.bids.length;
    const uniqueBidders = new Set(l.bids.map((b) => b.bidderId ?? b.bidderName)).size;
    const vsReserve =
      l.minBidRate && l.basePrice
        ? `+${(((l.minBidRate - l.basePrice) / l.basePrice) * 100).toFixed(1)}%`
        : "—";
    return {
      lotCode: l.lotCode,
      lot: `${l.title} — ${l.quantity} ${l.unit}`,
      bids: bidCount,
      bidders: uniqueBidders,
      reserve: `৳ ${l.basePrice}/${l.unit}`,
      closing: l.minBidRate ? `৳ ${l.minBidRate}/${l.unit}` : "Not yet",
      vs: vsReserve,
      status: toSellerStatusLabel(l.status),
    };
  });

  return NextResponse.json({
    stats,
    analyticsStats,
    lotPerformance,
    activeLotDetails,
    pendingDecisions,
    recentOrders,
    statusBreakdown,
    totalLots: lots.length,
  });
}
