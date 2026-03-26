import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readLotMedia } from "@/lib/lot-media-store";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // Filter by the authenticated checker's ID; allow admin/leader to pass ?checkerId= for viewing
  const paramCheckerId = req.nextUrl.searchParams.get("checkerId");
  const checkerId = paramCheckerId ?? (session.activeRole === "qc_checker" ? session.userId : null);

  const [lots, lotMedia] = await Promise.all([
    prisma.lot.findMany({
      where: checkerId
        ? { qcCheckerId: checkerId }
        : { qcCheckerId: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { seller: { select: { name: true, phone: true } } },
    }),
    readLotMedia(),
  ]);

  const photoMap = new Map(lotMedia.map((m) => [m.lotId, m]));

  return NextResponse.json(
    lots.map((l) => {
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
        minOrderQty: l.minOrderQty,
        sellerName: l.sellerName !== "Seller" ? l.sellerName : (l.seller?.name ?? l.sellerName),
        sellerPhone: l.sellerPhone ?? l.seller?.phone ?? null,
        sellerTransportCost: l.sellerTransportCost ?? undefined,
        sellerTransportShare: l.sellerTransportShare ?? "YES",
        freeQtyEnabled: l.freeQtyEnabled,
        freeQtyPer: l.freeQtyPer,
        freeQtyAmount: l.freeQtyAmount,
        freeQtyUnit: l.freeQtyUnit,
        sellerPhotoUrls: media?.sellerPhotoUrls ?? [],
        qcPhotoUrls: media?.qcPhotoUrls ?? [],
        status: l.status,
        qcLeader: l.qcLeaderName,
        qcChecker: l.qcCheckerName,
        qcLeaderId: l.qcLeaderId,
        qcCheckerId: l.qcCheckerId,
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
