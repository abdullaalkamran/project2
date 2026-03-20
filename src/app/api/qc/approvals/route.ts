import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { QCPendingApprovalRecord } from "@/lib/qc-approvals";
import { readApprovals, writeApprovals } from "@/lib/qc-approvals-store";
import { readLotMedia } from "@/lib/lot-media-store";

function fallbackFromLots(lots: Array<{
  lotCode: string;
  title: string;
  sellerName: string;
  hubId: string;
  grade: string;
  verdict: string | null;
  minBidRate: number | null;
  qcNotes: string | null;
  qcCheckerName: string | null;
  qcSubmittedAt: Date | null;
  leaderDecision: string | null;
  quantity: number;
  unit: string;
  askingPricePerKg: number;
  basePrice: number;
  sellerTransportCost: number | null;
  sellerTransportShare: string | null;
  freeQtyEnabled: boolean;
  freeQtyPer: number | null;
  freeQtyAmount: number | null;
  freeQtyUnit: string | null;
}>, qcReports: Map<string, { transportCost: number | null }>): QCPendingApprovalRecord[] {
  return lots.map((l) => ({
    reportId: `QCR-${l.lotCode}`,
    lotId: l.lotCode,
    product: l.title,
    qty: l.quantity,
    unit: l.unit,
    seller: l.sellerName,
    checker: l.qcCheckerName ?? "QC Checker",
    hub: l.hubId,
    submitted: l.qcSubmittedAt?.toISOString() ?? new Date().toISOString(),
    grade: (l.grade as "A" | "B" | "C") ?? "A",
    verdict: (l.verdict as "PASSED" | "CONDITIONAL" | "FAILED") ?? "CONDITIONAL",
    minBidRate: l.minBidRate ?? l.askingPricePerKg ?? l.basePrice,
    transportCost: qcReports.get(l.lotCode)?.transportCost ?? undefined,
    sellerTransportCost: l.sellerTransportCost ?? undefined,
    sellerTransportShare: l.sellerTransportShare ?? "YES",
    freeQtyEnabled: l.freeQtyEnabled,
    freeQtyPer: l.freeQtyPer ?? undefined,
    freeQtyAmount: l.freeQtyAmount ?? undefined,
    freeQtyUnit: l.freeQtyUnit ?? undefined,
    notes: l.qcNotes ?? "",
    qcNote: "",
    askingPricePerKg: l.askingPricePerKg,
    basePrice: l.basePrice,
    photosCount: 0,
    videosCount: 0,
    photoPreviews: [],
    changes: [],
    sellerSnapshot: {},
    qcSnapshot: {},
    decision:
      l.leaderDecision === "Approved"
        ? "approved"
        : l.leaderDecision === "Rejected"
          ? "rejected"
          : "pending",
  }));
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const store = await readApprovals();

  let rows = store;
  if (rows.length === 0) {
    const lots = await prisma.lot.findMany({
      where: {
        status: "QC_SUBMITTED",
        ...(status ? { leaderDecision: status } : {}),
      },
      orderBy: { qcSubmittedAt: "desc" },
      select: {
        id: true,
        lotCode: true,
        title: true,
        sellerName: true,
        hubId: true,
        grade: true,
        verdict: true,
        minBidRate: true,
        qcNotes: true,
        qcCheckerName: true,
        qcSubmittedAt: true,
        leaderDecision: true,
        quantity: true,
        unit: true,
        askingPricePerKg: true,
        basePrice: true,
        sellerTransportCost: true,
        sellerTransportShare: true,
        freeQtyEnabled: true,
        freeQtyPer: true,
        freeQtyAmount: true,
        freeQtyUnit: true,
      },
    });
    // Fetch QC reports for transport costs
    const qcReportRows = await prisma.qCReport.findMany({
      where: { lotId: { in: lots.map((l) => l.id) } },
      select: { lotId: true, transportCost: true },
    });
    const lotIdToCode = new Map(lots.map((l) => [l.id, l.lotCode]));
    const qcReportsMap = new Map(
      qcReportRows.map((r) => [lotIdToCode.get(r.lotId) ?? "", { transportCost: r.transportCost }]),
    );
    rows = fallbackFromLots(lots, qcReportsMap);
  }

  if (status) {
    const normalized =
      status === "Approved"
        ? "approved"
        : status === "Rejected"
          ? "rejected"
          : "pending";
    rows = rows.filter((r) => r.decision === normalized);
  }

  const lotMediaRows = await readLotMedia();
  const sellerPhotosByLot = new Map(lotMediaRows.map((m) => [m.lotId, m.sellerPhotoUrls]));
  const marketplacePhotosByLot = new Map(
    lotMediaRows.map((m) => [
      m.lotId,
      m.marketplacePhotoUrls?.length
        ? m.marketplacePhotoUrls
        : (m.marketplacePhotoUrl ? [m.marketplacePhotoUrl] : []),
    ]),
  );

  const enriched = rows.map((r) => ({
    ...r,
    sellerPhotoUrls: r.sellerPhotoUrls ?? sellerPhotosByLot.get(r.lotId) ?? [],
    qcPhotoPreviews: r.qcPhotoPreviews ?? r.photoPreviews ?? [],
    selectedMarketplacePhotoUrls:
      r.selectedMarketplacePhotoUrls?.length
        ? r.selectedMarketplacePhotoUrls
        : r.selectedMarketplacePhotoUrl
          ? [r.selectedMarketplacePhotoUrl]
          : marketplacePhotosByLot.get(r.lotId) ?? [],
    selectedMarketplacePhotoUrl:
      r.selectedMarketplacePhotoUrl ??
      r.selectedMarketplacePhotoUrls?.[0] ??
      marketplacePhotosByLot.get(r.lotId)?.[0] ??
      undefined,
  }));

  return NextResponse.json(enriched.sort((a, b) => b.submitted.localeCompare(a.submitted)));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<QCPendingApprovalRecord, "reportId"> & { reportId?: string };
    const reportId = body.reportId ?? `QCR-${body.lotId}`;

    const row: QCPendingApprovalRecord = {
      ...body,
      reportId,
      decision: body.decision ?? "pending",
      changes: body.changes ?? [],
      photoPreviews: body.photoPreviews ?? [],
      qcPhotoPreviews: body.qcPhotoPreviews ?? body.photoPreviews ?? [],
      sellerPhotoUrls: body.sellerPhotoUrls ?? [],
      selectedMarketplacePhotoUrls:
        body.selectedMarketplacePhotoUrls?.length
          ? Array.from(new Set(body.selectedMarketplacePhotoUrls.filter(Boolean)))
          : body.selectedMarketplacePhotoUrl
            ? [body.selectedMarketplacePhotoUrl]
            : [],
      selectedMarketplacePhotoUrl:
        body.selectedMarketplacePhotoUrl ??
        body.selectedMarketplacePhotoUrls?.[0],
      sellerSnapshot: body.sellerSnapshot ?? {},
      qcSnapshot: body.qcSnapshot ?? {},
      qcNote: body.qcNote ?? "",
    };

    const store = await readApprovals();
    const next = [row, ...store.filter((r) => r.reportId !== reportId)];
    await writeApprovals(next);

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
