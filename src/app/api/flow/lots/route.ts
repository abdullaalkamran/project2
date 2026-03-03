import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { DEFAULT_HUB } from "@/lib/hubs";
import { upsertLotSellerPhotos, readLotMedia } from "@/lib/lot-media-store";
import { notifyMany, userIdsByRole } from "@/lib/notifications";

// Serialize a DB lot into the FlowLot shape the UI expects
function serializeLot(lot: {
  id: string; lotCode: string; title: string; category: string; quantity: number;
  unit: string; grade: string; hubId: string; description: string; storageType: string;
  baggageType: string; baggageQty: number; basePrice: number; askingPricePerKg: number;
  minBidRate: number | null; sellerId: string | null; sellerName: string; sellerPhone: string | null;
  saleType: string; auctionStartsAt: Date | null; auctionEndsAt: Date | null;
  sellerTransportCost: number | null;
  status: string; createdAt: Date; receivedAt: Date | null; qcLeaderName: string | null;
  qcCheckerName: string | null; qcTaskStatus: string | null; verdict: string | null;
  qcNotes: string | null; qcSubmittedAt: Date | null; leaderDecision: string | null;
}) {
  return {
    id: lot.lotCode,
    dbId: lot.id,
    title: lot.title,
    category: lot.category,
    quantity: lot.quantity,
    unit: lot.unit,
    grade: lot.grade,
    hubId: lot.hubId,
    description: lot.description,
    storageType: lot.storageType,
    baggageType: lot.baggageType,
    baggageQty: lot.baggageQty,
    basePrice: lot.basePrice,
    askingPricePerKg: lot.askingPricePerKg,
    minBidRate: lot.minBidRate,
    sellerName: lot.sellerName,
    sellerPhone: lot.sellerPhone,
    saleType: lot.saleType,
    sellerTransportCost: lot.sellerTransportCost,
    auctionStartsAt: lot.auctionStartsAt?.toISOString() ?? null,
    auctionEndsAt: lot.auctionEndsAt?.toISOString() ?? null,
    status: lot.status,
    createdAt: lot.createdAt.toISOString(),
    receivedAt: lot.receivedAt?.toISOString() ?? null,
    qcLeader: lot.qcLeaderName,
    qcChecker: lot.qcCheckerName,
    qcTaskStatus: lot.qcTaskStatus,
    verdict: lot.verdict,
    qcNotes: lot.qcNotes,
    qcSubmittedAt: lot.qcSubmittedAt?.toISOString() ?? null,
    leaderDecision: lot.leaderDecision,
  };
}

export { serializeLot };

export async function GET() {
  const [lots, media] = await Promise.all([
    prisma.lot.findMany({ orderBy: { createdAt: "desc" } }),
    readLotMedia(),
  ]);
  const mediaMap = new Map(media.map((m) => [m.lotId, m.sellerPhotoUrls ?? []]));
  return NextResponse.json(
    lots.map((l) => ({ ...serializeLot(l), sellerPhotoUrls: mediaMap.get(l.lotCode) ?? [] }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const body = await req.json();
    const lotCode = `LOT-${String(Date.now()).slice(-6)}`;

    const lot = await prisma.lot.create({
      data: {
        lotCode,
        title: body.title ?? "Untitled Lot",
        category: body.category ?? "Other",
        quantity: Number(body.quantity ?? 0),
        unit: body.unit ?? "kg",
        grade: body.grade ?? "A",
        hubId: body.hubId ?? DEFAULT_HUB,
        description: body.description ?? "",
        storageType: body.storageType ?? "",
        baggageType: body.baggageType ?? "",
        baggageQty: Number(body.baggageQty ?? 0),
        basePrice: Number(body.basePrice ?? 0),
        askingPricePerKg: Number(body.askingPricePerKg ?? body.basePrice ?? 0),
        sellerTransportCost: typeof body.transportCost === "number" || body.transportCost ? Number(body.transportCost) : null,
        sellerId: session?.userId ?? null,
        sellerName: body.sellerName ?? session?.name ?? "Seller",
        sellerPhone: body.sellerPhone ?? null,
        saleType: body.saleType ?? "AUCTION",
        auctionStartsAt: body.auctionStartsAt ? new Date(body.auctionStartsAt) : null,
        auctionEndsAt: body.auctionEndsAt ? new Date(body.auctionEndsAt) : null,
        status: "PENDING_DELIVERY",
      },
    });

    // Notify all hub managers about the new incoming lot
    const hubManagerIds = await userIdsByRole("hub_manager");
    await notifyMany(hubManagerIds, {
      type: "LOT_RECEIVED",
      title: "New Lot Incoming",
      message: `Seller "${lot.sellerName}" created lot "${lot.title}" (${lot.lotCode}) heading to ${lot.hubId}. Awaiting delivery.`,
      link: "/hub-manager",
    });

    const sellerPhotoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
      : [];
    if (sellerPhotoUrls.length > 0) {
      await upsertLotSellerPhotos(lotCode, sellerPhotoUrls.slice(0, 8));
    }

    return NextResponse.json(serializeLot(lot), { status: 201 });
  } catch (err) {
    console.error("[flow/lots POST]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
