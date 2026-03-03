import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { toSellerStatusLabel } from "@/lib/lot-status";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const lots = await prisma.lot.findMany({
    where: {
      OR: [{ sellerId: session.userId }, { sellerName: session.name }],
    },
    orderBy: { createdAt: "desc" },
  });

  const lotIds = lots.map((l) => l.id);
  const [orders, bids] = await Promise.all([
    prisma.order.findMany({
      where: { lotId: { in: lotIds } },
      orderBy: { confirmedAt: "desc" },
    }),
    prisma.bid.findMany({
      where: { lotId: { in: lotIds } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ordersByLot = new Map<string, (typeof orders)[number]>();
  orders.forEach((o) => {
    if (!ordersByLot.has(o.lotId)) ordersByLot.set(o.lotId, o);
  });

  const bidsByLot = new Map<string, (typeof bids)>();
  bids.forEach((b) => {
    const arr = bidsByLot.get(b.lotId) ?? [];
    arr.push(b);
    bidsByLot.set(b.lotId, arr);
  });

  const totalLots = lots.length;
  const soldLots = lots.filter((l) => l.status === "SOLD" || l.status === "DELIVERED" || l.status === "AUCTION_ENDED" || !!ordersByLot.get(l.id)).length;
  const sellThrough = totalLots ? `${Math.round((soldLots / totalLots) * 100)}%` : "0%";

  const diffs = lots
    .map((l) => {
      const order = ordersByLot.get(l.id);
      if (!order || l.basePrice <= 0) return null;
      return ((order.winningBid - l.basePrice) / l.basePrice) * 100;
    })
    .filter((v): v is number => v !== null);
  const avgClosingVsReserve = diffs.length
    ? `${diffs.reduce((s, v) => s + v, 0) / diffs.length >= 0 ? "+" : ""}${(diffs.reduce((s, v) => s + v, 0) / diffs.length).toFixed(1)}%`
    : "0%";

  const uniqueBuyers = new Set(orders.map((o) => o.buyerName.toLowerCase()));
  const repeatBuyers = new Set(
    Array.from(
      orders.reduce((acc, o) => {
        const k = o.buyerName.toLowerCase();
        acc.set(k, (acc.get(k) ?? 0) + 1);
        return acc;
      }, new Map<string, number>()),
    )
      .filter(([, count]) => count > 1)
      .map(([k]) => k),
  );
  const repeatBuyerRate = uniqueBuyers.size
    ? `${Math.round((repeatBuyers.size / uniqueBuyers.size) * 100)}%`
    : "0%";

  const avgBidsPerLot = totalLots
    ? (bids.length / totalLots).toFixed(1)
    : "0.0";

  const analyticsStats = [
    { label: "Total lots run", value: String(totalLots), color: "text-slate-900" },
    { label: "Sell-through rate", value: sellThrough, color: "text-emerald-700" },
    { label: "Avg closing vs reserve", value: avgClosingVsReserve, color: "text-blue-700" },
    { label: "Repeat buyer rate", value: repeatBuyerRate, color: "text-violet-700" },
    { label: "Avg bids per lot", value: avgBidsPerLot, color: "text-orange-600" },
    { label: "Total bids", value: String(bids.length), color: "text-slate-700" },
  ];

  const lotPerformance = lots.slice(0, 20).map((l) => {
    const lotBids = bidsByLot.get(l.id) ?? [];
    const order = ordersByLot.get(l.id);
    const uniqueBidders = new Set(lotBids.map((b) => (b.bidderId ?? b.bidderName).toLowerCase())).size;
    const reserve = l.basePrice;
    const closingBid = order?.winningBid ?? l.minBidRate ?? null;
    const vs =
      closingBid && reserve > 0
        ? `${closingBid >= reserve ? "+" : ""}${(((closingBid - reserve) / reserve) * 100).toFixed(1)}%`
        : "—";
    return {
      lot: `${l.title} — ${l.quantity} ${l.unit}`,
      views: lotBids.length,
      bids: lotBids.length,
      reserve: `৳ ${reserve.toLocaleString()}/${l.unit}`,
      closing: closingBid ? `৳ ${closingBid.toLocaleString()}/${l.unit}` : "Not closed",
      vs,
      bidders: uniqueBidders,
      status: toSellerStatusLabel(l.status),
    };
  });

  const upcomingLots = lots
    .filter((l) => ["PENDING_DELIVERY", "AT_HUB", "IN_QC", "QC_SUBMITTED"].includes(l.status))
    .slice(0, 10)
    .map((l) => ({
      title: `${l.title} — ${l.quantity} ${l.unit}`,
      date: l.createdAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
      time: l.createdAt.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" }),
    }));

  return NextResponse.json({
    analyticsStats,
    lotPerformance,
    upcomingLots,
  });
}
