import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readLotMedia } from "@/lib/lot-media-store";

// Statuses that mean the lot is visible/active in the marketplace pipeline
const MARKETPLACE_STATUSES = ["QC_PASSED", "LIVE"];

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const lots = await prisma.lot.findMany({
    where: {
      status: { in: MARKETPLACE_STATUSES },
      sellerId: session.userId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      bids: { orderBy: { amount: "desc" }, take: 1 },
      _count: { select: { bids: true } },
      orders: { select: { qty: true, freeQty: true, status: true, sellerStatus: true } },
    },
  });

  const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };

  const media = await readLotMedia();
  const mediaMap = new Map(
    media.map((m) => [
      m.lotId,
      m.marketplacePhotoUrls?.[0] ?? m.marketplacePhotoUrl ?? m.sellerPhotoUrls?.[0] ?? null,
    ]),
  );

  const result = lots.map((l) => {
    const soldQty = l.orders
      .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "ACCEPTED")
      .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);

    const pendingQty = l.orders
      .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "PENDING_SELLER")
      .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);

    return {
      id: l.lotCode,
      title: l.title,
      category: l.category,
      quantity: l.quantity,
      unit: l.unit,
      grade: l.grade,
      hub: l.hubId,
      askingPricePerKg: l.askingPricePerKg,
      minBidRate: l.minBidRate,
      basePrice: l.basePrice,
      status: l.status,
      bidCount: l._count.bids,
      topBid: l.bids[0]?.amount ?? null,
      topBidder: l.bids[0]?.bidderName ?? null,
      soldQty,
      pendingQty,
      availableQty: Math.max(0, l.quantity - soldQty),
      imageUrl: mediaMap.get(l.lotCode) ?? null,
      createdAt: l.createdAt.toLocaleDateString("en-BD", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });

  return NextResponse.json({ lots: result });
}
