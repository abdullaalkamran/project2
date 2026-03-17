import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readLotMedia } from "@/lib/lot-media-store";
import { MARKETPLACE_VISIBLE_STATUSES } from "@/lib/lot-status";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lotCode: string }> },
) {
  const { lotCode } = await params;

  const [lot, lotMedia] = await Promise.all([
    prisma.lot.findUnique({
      where: { lotCode: lotCode.toUpperCase() },
      include: { qcReport: true, orders: { select: { qty: true, freeQty: true, status: true, sellerStatus: true } } },
    }),
    readLotMedia(),
  ]);

  if (!lot || !MARKETPLACE_VISIBLE_STATUSES.includes(lot.status as never)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };

  const soldQty = lot.orders
    .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "ACCEPTED")
    .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);

  const pendingQty = lot.orders
    .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "PENDING_SELLER")
    .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);

  const availableQty = Math.max(0, lot.quantity - soldQty);

  const mediaRecord = lotMedia.find((m) => m.lotId === lot.lotCode);
  const fallbackImage = "https://images.unsplash.com/photo-1603331669572-0216c5c88c7b?auto=format&fit=crop&w=800&q=80";
  const images = mediaRecord?.marketplacePhotoUrls?.length
    ? mediaRecord.marketplacePhotoUrls
    : mediaRecord?.marketplacePhotoUrl
      ? [mediaRecord.marketplacePhotoUrl]
      : [fallbackImage];
  const image = images[0];

  return NextResponse.json({
    // Core identifiers
    lotCode: lot.lotCode,
    sellerId: lot.sellerId ?? null,

    // Product info (may include QC corrections)
    title: lot.title,
    category: lot.category,
    description: lot.description,
    quantity: lot.quantity,
    unit: lot.unit,
    grade: lot.grade,

    // Packaging & storage (filled in by QC checker)
    storageType: lot.storageType,
    baggageType: lot.baggageType,
    baggageQty: lot.baggageQty,

    // Pricing
    basePrice: lot.basePrice,
    askingPricePerKg: lot.askingPricePerKg,
    minBidRate: lot.minBidRate,

    // Location
    hub: lot.hubId,

    // Seller
    sellerName: lot.sellerName,

    // Status
    status: lot.status,
    saleType: lot.saleType,

    // Free qty offer
    freeQtyEnabled: lot.freeQtyEnabled,
    freeQtyPer: lot.freeQtyPer,
    freeQtyAmount: lot.freeQtyAmount,
    freeQtyUnit: lot.freeQtyUnit,

    // Sales progress
    soldQty,
    pendingQty,
    availableQty,

    // QC report (from QC checker)
    qcReport: lot.qcReport
      ? {
          verdict: lot.qcReport.verdict,
          grade: lot.qcReport.grade,
          minBidRate: lot.qcReport.minBidRate,
          notes: lot.qcReport.notes,
          checkerName: lot.qcReport.checkerName,
          submittedAt: lot.qcReport.submittedAt,
        }
      : null,

    // Image
    image,
    images,
  });
}
