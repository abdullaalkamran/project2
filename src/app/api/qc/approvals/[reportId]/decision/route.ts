import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readApprovals, writeApprovals } from "@/lib/qc-approvals-store";
import { setLotMarketplacePhotos } from "@/lib/lot-media-store";
import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireApiRole(["admin", "qc_leader"]);
    if (auth.response) return auth.response;

    const { reportId } = await params;
    const { decision, selectedPhotoUrl, selectedPhotoUrls } = (await req.json()) as {
      decision: "approved" | "rejected" | "pending" | "reinspect";
      selectedPhotoUrl?: string;
      selectedPhotoUrls?: string[];
    };
    if (!decision) {
      return NextResponse.json({ message: "decision is required" }, { status: 400 });
    }
    const selectedUrls = Array.from(
      new Set((selectedPhotoUrls?.length ? selectedPhotoUrls : (selectedPhotoUrl ? [selectedPhotoUrl] : [])).filter(Boolean)),
    ) as string[];
    const selectedPrimary = selectedUrls[0];

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

    // Do not auto-create orders during QC approval.
    // Orders must only be created from buyer action (/api/marketplace/orders).

    // Persist decision in approvals store (if record exists there)
    const approvals = await readApprovals();
    const updatedApprovals = approvals.map((r) =>
      r.reportId === reportId
        ? {
            ...r,
            decision,
            selectedMarketplacePhotoUrls: selectedUrls.length ? selectedUrls : r.selectedMarketplacePhotoUrls,
            selectedMarketplacePhotoUrl: selectedPrimary ?? r.selectedMarketplacePhotoUrl,
          }
        : r
    );
    await writeApprovals(updatedApprovals);

    if (decision === "approved" && selectedUrls.length > 0) {
      await setLotMarketplacePhotos(updated.lotCode, selectedUrls);
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
