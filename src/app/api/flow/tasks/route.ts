import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readLotMedia } from "@/lib/lot-media-store";

export async function GET(req: NextRequest) {
  const checker = req.nextUrl.searchParams.get("checker");

  const [lots, lotMedia] = await Promise.all([
    prisma.lot.findMany({
      where: checker
        ? { qcCheckerName: { equals: checker, mode: "insensitive" } }
        : { qcCheckerName: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    readLotMedia(),
  ]);

  const photoMap = new Map(lotMedia.map((m) => [m.lotId, m]));

  const filtered = lots;

  return NextResponse.json(
    filtered.map((l) => {
      const media = photoMap.get(l.lotCode);
      return {
        id: l.lotCode,
        title: l.title,
        category: l.category,
        quantity: l.quantity,
        unit: l.unit,
        grade: l.grade,
        hubId: l.hubId,
        description: l.description,
        storageType: l.storageType,
        baggageType: l.baggageType,
        baggageQty: l.baggageQty,
        basePrice: l.basePrice,
        askingPricePerKg: l.askingPricePerKg,
        minBidRate: l.minBidRate,
        sellerName: l.sellerName,
        sellerPhone: l.sellerPhone,
        sellerTransportCost: l.sellerTransportCost ?? undefined,
        sellerPhotoUrls: media?.sellerPhotoUrls ?? [],
        qcPhotoUrls: media?.qcPhotoUrls ?? [],
        status: l.status,
        qcLeader: l.qcLeaderName,
        qcChecker: l.qcCheckerName,
        qcTaskStatus: l.qcTaskStatus,
        verdict: l.verdict,
        receivedAt: l.receivedAt?.toISOString(),
        createdAt: l.createdAt.toISOString(),
        qcSubmittedAt: l.qcSubmittedAt?.toISOString(),
        qcNotes: l.qcNotes,
        leaderDecision: l.leaderDecision,
        saleType: (l.saleType ?? "AUCTION") as "AUCTION" | "FIXED_PRICE",
        auctionStartsAt: l.auctionStartsAt?.toISOString(),
        auctionEndsAt: l.auctionEndsAt?.toISOString(),
        fixedAskingPrice: l.fixedAskingPrice ?? undefined,
      };
    })
  );
}
