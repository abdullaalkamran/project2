import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubNames } from "@/lib/hub-assignments";

function statusToStage(status: string): string {
  switch (status) {
    case "PENDING_DELIVERY":
    case "AT_HUB":
      return "Awaiting Receipt";
    case "IN_QC":
      return "In QC";
    case "QC_SUBMITTED":
      return "Leader Review";
    case "QC_PASSED":
      return "Approved";
    case "QC_FAILED":
      return "Rejected";
    case "LIVE":
      return "Dispatch";
    default:
      return "Awaiting Receipt";
  }
}

export async function GET() {
  const session = await getSessionUser();
  const hubNames = session
    ? await getAssignedHubNames(session.userId, "hub_manager")
    : [];

  const hubFilter = hubNames.length > 0 ? { hubId: { in: hubNames } } : {};

  const [lots, trucks] = await Promise.all([
    prisma.lot.findMany({ where: hubFilter, orderBy: { createdAt: "desc" } }),
    prisma.truck.count({ where: { status: "Available" } }),
  ]);

  const activeLots = lots.filter((l) => l.status !== "QC_FAILED");

  const awaitingReceipt = lots.filter((l) =>
    ["PENDING_DELIVERY", "AT_HUB"].includes(l.status)
  ).length;
  const inQC = lots.filter((l) => l.status === "IN_QC").length;
  const leaderReview = lots.filter((l) => l.status === "QC_SUBMITTED").length;
  const approved = lots.filter((l) => l.status === "QC_PASSED").length;
  const readyToDispatch = lots.filter((l) => l.status === "LIVE").length;

  const stats = [
    { label: "Awaiting Receipt", value: String(awaitingReceipt), sub: "Lot notified but not yet logged", href: "/hub-manager/inbound", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "In QC", value: String(inQC), sub: "Checker assigned / inspecting", href: "/hub-manager/qc-assign", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Leader Review", value: String(leaderReview), sub: "Submitted — pending approval", href: "/hub-manager/qc-assign", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "Approved & Ready", value: String(approved), sub: "QC passed, ready for auction", href: "/hub-manager/inventory", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Ready to Dispatch", value: String(readyToDispatch), sub: "Auction closed, dispatch pending", href: "/hub-manager/dispatch", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Total in Hub", value: String(activeLots.length), sub: "All active lots", href: "/hub-manager/inventory", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-100" },
    { label: "Trucks Available", value: String(trucks), sub: "Fleet ready for dispatch", href: "/hub-manager/trucks", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100" },
  ];

  const pipeline = activeLots.map((l) => ({
    lotId: l.lotCode,
    product: l.title,
    seller: l.sellerName,
    hub: l.hubId,
    qty: `${l.quantity} ${l.unit}`,
    askingPricePerKg: `৳${l.askingPricePerKg}`,
    arrived: l.receivedAt
      ? new Date(l.receivedAt).toLocaleDateString("en-BD", {
          month: "short",
          day: "numeric",
        })
      : "—",
    qcChecker: l.qcCheckerName,
    qcLeaderDecision:
      l.leaderDecision ??
      (l.qcSubmittedAt ? "Pending" : l.qcCheckerName ? "Not submitted" : null),
    minBidRate: l.minBidRate ? `৳${l.minBidRate}` : null,
    verdict: l.verdict as "PASSED" | "CONDITIONAL" | "FAILED" | null,
    stage: statusToStage(l.status),
  }));

  return NextResponse.json({ stats, pipeline });
}
