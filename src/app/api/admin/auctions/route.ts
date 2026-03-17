import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readLotMedia } from "@/lib/lot-media-store";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [lots, lotMedia] = await Promise.all([
    prisma.lot.findMany({
      include: { _count: { select: { bids: true } } },
      orderBy: { createdAt: "desc" },
    }),
    readLotMedia(),
  ]);

  const photoMap = new Map(lotMedia.map((m) => [m.lotId, m]));

  return NextResponse.json(
    lots.map((l) => {
      const media = photoMap.get(l.lotCode);
      const photoUrl =
        media?.marketplacePhotoUrl ??
        media?.marketplacePhotoUrls?.[0] ??
        media?.sellerPhotoUrls?.[0] ??
        null;
      return {
        id: l.id,
        lotCode: l.lotCode,
        title: l.title,
        quantity: l.quantity,
        unit: l.unit,
        category: l.category,
        seller: l.sellerName,
        sellerPhone: l.sellerPhone ?? null,
        hubId: l.hubId,
        basePrice: l.basePrice,
        minBidRate: l.minBidRate ?? null,
        status: l.status,
        bids: l._count.bids,
        auctionStartsAt: l.auctionStartsAt ?? null,
        auctionEndsAt: l.auctionEndsAt ?? null,
        createdAt: l.createdAt,
        verdict: l.verdict ?? null,
        saleType: l.saleType ?? "AUCTION",
        photoUrl,
      };
    })
  );
}
