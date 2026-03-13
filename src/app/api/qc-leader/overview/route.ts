import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const leaderName = session?.name ?? null;

  // Filter to only this leader's assigned lots (if name available)
  const leaderFilter = leaderName ? { qcLeaderName: leaderName } : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const select = {
    lotCode: true,
    title: true,
    sellerName: true,
    hubId: true,
    grade: true,
    verdict: true,
    minBidRate: true,
    qcNotes: true,
    qcCheckerName: true,
    qcLeaderName: true,
    qcSubmittedAt: true,
    qcTaskStatus: true,
    leaderDecision: true,
    quantity: true,
    unit: true,
    status: true,
    saleType: true,
    createdAt: true,
    receivedAt: true,
  } as const;

  const [lots, unassignedLots] = await Promise.all([
    prisma.lot.findMany({
      where: {
        status: {
          in: [
            "AT_HUB",
            "IN_QC",
            "QC_SUBMITTED",
            "QC_PASSED",
            "QC_FAILED",
            "AUCTION_UNSOLD",
            "FIXED_PRICE_REVIEW",
          ],
        },
        ...leaderFilter,
      },
      orderBy: { qcSubmittedAt: "desc" },
      select,
    }),
    // Matches assign page logic exactly: any status except PENDING_DELIVERY, leader set, no checker
    prisma.lot.findMany({
      where: {
        status: { not: "PENDING_DELIVERY" },
        qcLeaderName: leaderName ?? undefined,
        qcCheckerName: null,
      },
      orderBy: { receivedAt: "desc" },
      select,
    }),
  ]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const pendingApprovals = lots.filter((l) => l.status === "QC_SUBMITTED").length;
  const inQC             = lots.filter((l) => l.status === "IN_QC").length;
  const atHub            = lots.filter((l) => l.status === "AT_HUB").length;
  const needsChecker     = unassignedLots.length;
  const passedToday      = lots.filter(
    (l) => l.leaderDecision === "Approved" && l.qcSubmittedAt && new Date(l.qcSubmittedAt) >= today,
  ).length;
  const rejectedToday = lots.filter(
    (l) => l.leaderDecision === "Rejected" && l.qcSubmittedAt && new Date(l.qcSubmittedAt) >= today,
  ).length;
  const fixedPriceReview = lots.filter((l) => l.status === "FIXED_PRICE_REVIEW").length;

  const stats = [
    { label: "Pending Approvals", value: String(pendingApprovals), sub: "Reports awaiting your review", href: "/qc-leader/approvals", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "In QC Inspection",  value: String(inQC),             sub: "Checker actively inspecting",  href: "/qc-leader/tasks",     color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-100"   },
    { label: "Awaiting Checker",  value: String(needsChecker),     sub: "At hub, no checker assigned",  href: "/qc-leader/tasks",    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "Passed Today",      value: String(passedToday),      sub: "Approved by you today",        href: "/qc-leader/history",   color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-100"},
    { label: "Rejected Today",    value: String(rejectedToday),    sub: "Rejected by you today",        href: "/qc-leader/rejected",  color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-100"   },
    { label: "Total at Hub",      value: String(atHub + inQC),     sub: "All lots under QC scope",      href: "/qc-leader/tasks",     color: "text-slate-700",  bg: "bg-slate-50",  border: "border-slate-100"  },
    ...(fixedPriceReview > 0 ? [{ label: "Fixed Price Review", value: String(fixedPriceReview), sub: "2nd cycle approvals", href: "/qc-leader/approvals", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" }] : []),
  ];

  // ── Pending approval items ────────────────────────────────────────────────
  const MAX = 5;
  const pendingList = lots
    .filter((l) => l.status === "QC_SUBMITTED" && (!l.leaderDecision || l.leaderDecision === "Pending"))
    .slice(0, MAX)
    .map((l) => ({
      lotCode: l.lotCode,
      title: l.title,
      seller: l.sellerName,
      checker: l.qcCheckerName ?? "—",
      grade: l.grade,
      verdict: l.verdict,
      qty: `${l.quantity} ${l.unit}`,
      submitted: l.qcSubmittedAt
        ? new Date(l.qcSubmittedAt).toLocaleDateString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—",
      hub: l.hubId,
    }));

  // ── Required actions ─────────────────────────────────────────────────────
  // Use unassignedLots — same filter as the assign page (all statuses except PENDING_DELIVERY)
  const needsCheckerLots = unassignedLots;
  const pendingTaskLots  = lots.filter((l) => l.status === "IN_QC");
  const submittedNotDecided = lots.filter(
    (l) => l.status === "QC_SUBMITTED" && (!l.leaderDecision || l.leaderDecision === "Pending"),
  );
  const fixedReviewLots = lots.filter((l) => l.status === "FIXED_PRICE_REVIEW");

  const requiredActions = [
    ...(submittedNotDecided.length > 0 ? [{
      type: "approve",
      title: "QC Reports Need Your Decision",
      desc: "QC checkers have submitted reports — approve, reject, or request re-inspection.",
      count: submittedNotDecided.length,
      urgency: "high",
      href: "/qc-leader/approvals",
      items: submittedNotDecided.slice(0, MAX).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.qcCheckerName ?? "Checker"} · ${l.quantity} ${l.unit} · Grade ${l.grade ?? "—"}`,
        href: "/qc-leader/approvals",
      })),
    }] : []),
    ...(pendingTaskLots.length > 0 ? [{
      type: "tasks",
      title: "Active Inspections In Progress",
      desc: "Checkers are currently inspecting these lots — monitor progress on the tasks page.",
      count: pendingTaskLots.length,
      urgency: "medium",
      href: "/qc-leader/tasks",
      items: pendingTaskLots.slice(0, MAX).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.qcCheckerName ?? "Checker"} · ${l.quantity} ${l.unit} · ${l.hubId}`,
        href: "/qc-leader/tasks",
      })),
    }] : []),
    ...(needsCheckerLots.length > 0 ? [{
      type: "assign",
      title: "Lots Need QC Checker Assignment",
      desc: "These lots arrived at hub but no inspector has been assigned.",
      count: needsCheckerLots.length,
      urgency: "high",
      href: "/qc-leader/tasks",
      items: needsCheckerLots.slice(0, MAX).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ${l.quantity} ${l.unit} · ${l.hubId}`,
        href: "/qc-leader/tasks",
      })),
    }] : []),
    ...(fixedReviewLots.length > 0 ? [{
      type: "fixed_review",
      title: "Fixed Price Lots Need 2nd Approval",
      desc: "Seller converted unsold auction to fixed price — requires QC re-approval.",
      count: fixedReviewLots.length,
      urgency: "medium",
      href: "/qc-leader/approvals",
      items: fixedReviewLots.slice(0, MAX).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ${l.quantity} ${l.unit}`,
        href: "/qc-leader/approvals",
      })),
    }] : []),
  ];

  // ── Pipeline summary (30 most recent, all statuses) ───────────────────────
  const pipeline = lots.slice(0, 30).map((l) => ({
    lotCode: l.lotCode,
    title: l.title,
    seller: l.sellerName,
    checker: l.qcCheckerName ?? "—",
    grade: l.grade,
    verdict: l.verdict,
    qty: `${l.quantity} ${l.unit}`,
    status: l.status,
    leaderDecision: l.leaderDecision,
    submitted: l.qcSubmittedAt
      ? new Date(l.qcSubmittedAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
      : "—",
  }));

  return NextResponse.json({ stats, pendingList, pendingTotal: submittedNotDecided.length, requiredActions, pipeline });
}
