import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readLotMedia } from "@/lib/lot-media-store";

const LIVE_STATUSES = ["LIVE", "AUCTION_ENDED", "AUCTION_UNSOLD"];

/**
 * GET /api/live/[lotCode]/state
 *
 * Returns the current state of a live (or just-ended) auction lot, including
 * the 20 most recent bids.  Used by the Live page on initial load.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lotCode: string }> },
) {
  const { lotCode } = await params;

  const lot = await prisma.lot.findUnique({
    where: { lotCode: lotCode.toUpperCase() },
    include: {
      bids: { orderBy: { amount: "desc" }, take: 20 },
      qcReport: { select: { verdict: true, grade: true } },
    },
  });

  if (!lot || !LIVE_STATUSES.includes(lot.status)) {
    return NextResponse.json(
      { message: "Lot not found or not available for bidding" },
      { status: 404 },
    );
  }

  // Resolve photo
  const lotMedia = await readLotMedia();
  const mediaEntry = lotMedia.find((m) => m.lotId === lot.lotCode);
  const image =
    mediaEntry?.marketplacePhotoUrl ??
    mediaEntry?.qcPhotoUrls?.[0] ??
    null;

  const topBid = lot.bids[0]?.amount ?? lot.minBidRate ?? lot.basePrice;

  return NextResponse.json({
    lot: {
      lotCode: lot.lotCode,
      title: lot.title,
      category: lot.category,
      status: lot.status,
      saleType: lot.saleType,
      auctionStartsAt: lot.auctionStartsAt?.toISOString() ?? null,
      auctionEndsAt: lot.auctionEndsAt?.toISOString() ?? null,
      minBidRate: lot.minBidRate,
      basePrice: lot.basePrice,
      quantity: lot.quantity,
      unit: lot.unit,
      grade: lot.grade,
      hubId: lot.hubId,
      sellerName: lot.sellerName,
      sellerId: lot.sellerId ?? null,
      qcVerdict: lot.qcReport?.verdict ?? null,
    },
    topBid,
    totalBids: lot.bids.length,
    bids: lot.bids.map((b) => ({
      id: b.id,
      bidderId: b.bidderId ?? null,
      bidderName: b.bidderName,
      amount: b.amount,
      createdAt: b.createdAt.toISOString(),
    })),
    image,
  });
}
