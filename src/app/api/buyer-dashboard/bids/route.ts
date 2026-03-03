import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();

  // Fetch all bids placed by this buyer, with lot info and lot's top bid
  const bids = await prisma.bid.findMany({
    where: session?.userId ? { bidderId: session.userId } : { bidderName: "Demo Buyer" },
    include: {
      lot: {
        include: {
          bids: { orderBy: { amount: "desc" }, take: 1 },
          orders: {
            where: session?.userId ? { buyerId: session.userId } : undefined,
            select: { orderCode: true, status: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // De-duplicate by lotId — keep buyer's highest bid per lot
  const byLot = new Map<string, (typeof bids)[0]>();
  for (const b of bids) {
    const existing = byLot.get(b.lotId);
    if (!existing || b.amount > existing.amount) byLot.set(b.lotId, b);
  }

  const now = new Date();

  const active: object[] = [];
  const won: object[] = [];
  const lost: object[] = [];

  for (const b of byLot.values()) {
    const { lot } = b;
    const topBidAmount = lot.bids[0]?.amount ?? 0;
    const isWinning = b.amount >= topBidAmount;
    const auctionEnded =
      lot.status === "AUCTION_ENDED" ||
      (lot.auctionEndsAt != null && new Date(lot.auctionEndsAt) <= now);
    const isLive = lot.status === "LIVE" && !auctionEnded;

    const base = {
      lotId: lot.lotCode,
      lot: lot.title,
      seller: lot.sellerName,
      yourBid: b.amount,
      topBid: topBidAmount,
      qty: lot.quantity,
      unit: lot.unit,
      minBidRate: lot.minBidRate ?? lot.basePrice,
      auctionEndsAt: lot.auctionEndsAt?.toISOString() ?? null,
      bidId: b.id,
    };

    if (isLive) {
      active.push({ ...base, status: isWinning ? "Winning" : "Outbid" });
    } else if (auctionEnded) {
      if (isWinning) {
        const order = lot.orders[0];
        won.push({
          ...base,
          finalBid: b.amount,
          orderCode: order?.orderCode ?? null,
          orderStatus: order?.status ?? "Pending",
          date: b.createdAt.toISOString(),
        });
      } else {
        lost.push({
          ...base,
          winningBid: topBidAmount,
          date: b.createdAt.toISOString(),
        });
      }
    }
    // Bids on lots not yet live are ignored (still in QC etc.)
  }

  return NextResponse.json({ active, won, lost });
}
