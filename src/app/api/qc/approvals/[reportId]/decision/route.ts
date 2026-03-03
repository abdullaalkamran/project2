import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readApprovals, writeApprovals } from "@/lib/qc-approvals-store";
import { setLotMarketplacePhoto } from "@/lib/lot-media-store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const { decision, selectedPhotoUrl } = (await req.json()) as {
      decision: "approved" | "rejected" | "pending";
      selectedPhotoUrl?: string;
    };
    if (!decision) {
      return NextResponse.json({ message: "decision is required" }, { status: 400 });
    }

    // reportId format: QCR-{lotCode}
    const lotCode = reportId.replace(/^QCR-/, "");
    const lot = await prisma.lot.findUnique({ where: { lotCode } });
    if (!lot) {
      return NextResponse.json({ message: "Lot not found for this report" }, { status: 404 });
    }

    const leaderDecision =
      decision === "approved" ? "Approved"
      : decision === "rejected" ? "Rejected"
      : "Pending";

    const newStatus =
      decision === "approved" ? "QC_PASSED"
      : decision === "rejected" ? "QC_FAILED"
      : "IN_QC";

    const updated = await prisma.lot.update({
      where: { id: lot.id },
      data: {
        leaderDecision,
        status: newStatus,
        ...(decision !== "approved" && decision !== "rejected"
          ? { qcTaskStatus: "PENDING" }
          : {}),
      },
    });

    // Auto-create order on approval
    if (decision === "approved") {
      const existingOrder = await prisma.order.findFirst({ where: { lotId: lot.id } });
      if (!existingOrder) {
        const winningBid = updated.minBidRate ?? updated.basePrice;
        const orderCode = `ORD-${String(Date.now()).slice(-6)}`;
        const buyerUser = await prisma.user.findFirst({
          where: { userRoles: { some: { role: "buyer" } }, status: "ACTIVE" },
        });

        // Fetch QC report for transport cost
        const qcReport = await prisma.qCReport.findUnique({ where: { lotId: lot.id } });
        const transportCost = qcReport?.transportCost ?? 0;
        const productAmount = winningBid * lot.quantity;
        const platformFeeRate = 5; // 5% platform fee
        const platformFee = Math.round(productAmount * platformFeeRate / 100);
        const sellerPayable = productAmount - platformFee;
        const totalAmount = productAmount + transportCost;

        await prisma.order.create({
          data: {
            orderCode,
            lotId: lot.id,
            buyerId: buyerUser?.id ?? null,
            sellerId: lot.sellerId ?? null,
            buyerName: buyerUser?.name ?? "Agro Wholesale BD",
            sellerName: lot.sellerName,
            product: lot.title,
            qty: `${lot.quantity} ${lot.unit}`,
            deliveryPoint: "Mirpur Delivery Point",
            winningBid,
            productAmount,
            transportCost,
            sellerTransportCost: lot.sellerTransportCost,
            platformFeeRate,
            platformFee,
            sellerPayable,
            totalAmount,
            status: "CONFIRMED",
          },
        });
      }
    }

    // Persist decision in approvals store (if record exists there)
    const approvals = await readApprovals();
    const updatedApprovals = approvals.map((r) =>
      r.reportId === reportId
        ? { ...r, decision, selectedMarketplacePhotoUrl: selectedPhotoUrl ?? r.selectedMarketplacePhotoUrl }
        : r
    );
    await writeApprovals(updatedApprovals);

    if (decision === "approved" && selectedPhotoUrl) {
      await setLotMarketplacePhoto(updated.lotCode, selectedPhotoUrl);
    }

    return NextResponse.json({
      reportId,
      lotId: updated.lotCode,
      decision,
      leaderDecision: updated.leaderDecision,
      status: updated.status,
    });
  } catch (err) {
    console.error("[qc/approvals/decision]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
