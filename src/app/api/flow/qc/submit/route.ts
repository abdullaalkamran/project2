import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, userIdByName } from "@/lib/notifications";
import { upsertLotQCPhotos } from "@/lib/lot-media-store";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const body = (await req.json()) as {
      lotId: string;
      verdict: "PASSED" | "FAILED" | "CONDITIONAL";
      grade: "A" | "B" | "C";
      minBidRate?: number;
      notes?: string;
      product?: string;
      category?: string;
      qty?: number;
      unit?: "kg" | "piece" | "dozen" | "crate" | "bag" | "box";
      lotGrade?: "A" | "B" | "C";
      askingPricePerKg?: number;
      description?: string;
      storageType?: string;
      baggageType?: string;
      baggageQty?: number;
      basePrice?: number;
      transportCost?: number;
      photos?: string[];
      fieldConfirmations?: Record<string, "confirmed" | "wrong" | "unset">;
      inspectionLat?: number;
      inspectionLng?: number;
      inspectionAddress?: string;
      listOnMarketplace?: boolean;
    };

    const lot = await prisma.lot.findUnique({ where: { lotCode: body.lotId } });
    if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

    // Upsert QCReport
    await prisma.qCReport.upsert({
      where: { lotId: lot.id },
      update: {
        grade: body.grade,
        verdict: body.verdict,
        minBidRate: body.minBidRate ?? null,
        transportCost: typeof body.transportCost === "number" ? body.transportCost : null,
        notes: body.notes ?? null,
        submittedAt: new Date(),
        checkerId: session?.userId ?? null,
        checkerName: session?.name ?? null,
        fieldConfirmations: body.fieldConfirmations ? JSON.stringify(body.fieldConfirmations) : null,
        inspectionLat: typeof body.inspectionLat === "number" ? body.inspectionLat : null,
        inspectionLng: typeof body.inspectionLng === "number" ? body.inspectionLng : null,
        inspectionAddress: body.inspectionAddress ?? null,
      },
      create: {
        lotId: lot.id,
        grade: body.grade,
        verdict: body.verdict,
        minBidRate: body.minBidRate ?? null,
        transportCost: typeof body.transportCost === "number" ? body.transportCost : null,
        notes: body.notes ?? null,
        checkerId: session?.userId ?? null,
        checkerName: session?.name ?? lot.qcCheckerName ?? null,
        fieldConfirmations: body.fieldConfirmations ? JSON.stringify(body.fieldConfirmations) : null,
        inspectionLat: typeof body.inspectionLat === "number" ? body.inspectionLat : null,
        inspectionLng: typeof body.inspectionLng === "number" ? body.inspectionLng : null,
        inspectionAddress: body.inspectionAddress ?? null,
      },
    });

    const updated = await prisma.lot.update({
      where: { id: lot.id },
      data: {
        title: typeof body.product === "string" && body.product.trim() ? body.product.trim() : lot.title,
        category: typeof body.category === "string" && body.category.trim() ? body.category.trim() : lot.category,
        quantity: typeof body.qty === "number" ? body.qty : lot.quantity,
        unit: body.unit ?? lot.unit,
        grade: body.lotGrade ?? body.grade,
        description: typeof body.description === "string" ? body.description : lot.description,
        storageType: typeof body.storageType === "string" ? body.storageType : lot.storageType,
        baggageType: typeof body.baggageType === "string" ? body.baggageType : lot.baggageType,
        baggageQty: typeof body.baggageQty === "number" ? body.baggageQty : lot.baggageQty,
        basePrice: typeof body.basePrice === "number" ? body.basePrice : lot.basePrice,
        verdict: body.verdict,
        minBidRate: body.minBidRate ?? null,
        qcNotes: body.notes ?? null,
        status: "QC_SUBMITTED",
        qcTaskStatus: "SUBMITTED",
        qcSubmittedAt: new Date(),
        leaderDecision: "Pending",
        listOnMarketplace: typeof body.listOnMarketplace === "boolean" ? body.listOnMarketplace : null,
      },
    });

    // Save QC photos to media store
    if (Array.isArray(body.photos) && body.photos.length > 0) {
      await upsertLotQCPhotos(lot.lotCode, body.photos);
    }

    // Notify QC Leader and Seller that report is submitted
    const [leaderId, sellerId] = await Promise.all([
      updated.qcLeaderName ? userIdByName(updated.qcLeaderName) : Promise.resolve(null),
      updated.sellerId ? Promise.resolve(updated.sellerId) : userIdByName(updated.sellerName),
    ]);

    if (leaderId) {
      await notify(leaderId, {
        type: "QC_SUBMITTED",
        title: "QC Report Ready for Review",
        message: `${session?.name ?? "QC Checker"} submitted the QC report for "${updated.title}" (${updated.lotCode}). Verdict: ${body.verdict}. Your approval is required.`,
        link: "/qc-leader/approvals",
      });
    }
    if (sellerId) {
      await notify(sellerId, {
        type: "QC_SUBMITTED",
        title: "QC Report Submitted",
        message: `The QC report for your lot "${updated.title}" (${updated.lotCode}) has been submitted with verdict: ${body.verdict}. Awaiting QC Leader approval.`,
        link: "/seller-dashboard/lots",
      });
    }

    return NextResponse.json({
      id: updated.lotCode,
      grade: updated.grade,
      verdict: updated.verdict,
      status: updated.status,
      qcTaskStatus: updated.qcTaskStatus,
      leaderDecision: updated.leaderDecision,
    });
  } catch (err) {
    console.error("[qc/submit]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
