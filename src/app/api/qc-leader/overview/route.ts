import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { readPreDispatchChecks } from "@/lib/pre-dispatch-store";

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

  const [lots, unassignedLots, confirmedOrders, preDispatchChecks] = await Promise.all([
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
    // Confirmed orders for transport action cards
    prisma.order.findMany({
      where: {
        sellerStatus: { in: ["ACCEPTED", "CONFIRMED"] },
        status: { notIn: ["CANCELLED", "DISPATCHED", "HUB_RECEIVED", "OUT_FOR_DELIVERY", "ARRIVED", "PICKED_UP"] },
        dispatched: false,
      },
      select: { orderCode: true, product: true, qty: true, sellerName: true, buyerName: true, assignedTruck: true, loadConfirmed: true },
      orderBy: { confirmedAt: "desc" },
    }),
    readPreDispatchChecks(),
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

  // ── Transport action counts ───────────────────────────────────────────────
  const checkMap = new Map(preDispatchChecks.map((c) => [c.orderCode.toUpperCase(), c]));

  const ordersNeedQualityCheck = confirmedOrders.filter((o) => {
    const c = checkMap.get(o.orderCode.toUpperCase());
    return c?.physicallyReceived === true && c?.qualityChecked === false;
  });

  const ordersNeedTruckPrice = confirmedOrders.filter((o) => {
    const c = checkMap.get(o.orderCode.toUpperCase());
    return c?.qualityChecked === true && (!c?.truckPriceBDT || c.truckPriceBDT === 0);
  });

  const ordersEditUnlocked = confirmedOrders.filter((o) => {
    const c = checkMap.get(o.orderCode.toUpperCase());
    return c?.step2Unlocked === true;
  });

  const ordersNeedTruck = confirmedOrders.filter((o) => {
    const c = checkMap.get(o.orderCode.toUpperCase());
    return c?.hubManagerConfirmed === true && !o.assignedTruck;
  });

  const ordersNeedLoad = confirmedOrders.filter((o) => {
    return !!o.assignedTruck && o.loadConfirmed !== true;
  });

  const ordersReadyToDispatch = confirmedOrders.filter((o) => {
    return !!o.assignedTruck && o.loadConfirmed === true;
  });

  const stats = [
    { label: "Pending Approvals", value: String(pendingApprovals), sub: "Reports awaiting your review", href: "/qc-leader/approvals", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "In QC Inspection",  value: String(inQC),             sub: "Checker actively inspecting",  href: "/qc-leader/tasks",     color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-100"   },
    { label: "Awaiting Checker",  value: String(needsChecker),     sub: "At hub, no checker assigned",  href: "/qc-leader/tasks",    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "Passed Today",      value: String(passedToday),      sub: "Approved by you today",        href: "/qc-leader/history",   color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-100"},
    { label: "Rejected Today",    value: String(rejectedToday),    sub: "Rejected by you today",        href: "/qc-leader/rejected",  color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-100"   },
    { label: "Total at Hub",      value: String(atHub + inQC),     sub: "All lots under QC scope",      href: "/qc-leader/tasks",     color: "text-slate-700",  bg: "bg-slate-50",  border: "border-slate-100"  },
    ...(fixedPriceReview > 0 ? [{ label: "Fixed Price Review", value: String(fixedPriceReview), sub: "2nd cycle approvals", href: "/qc-leader/approvals", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" }] : []),
    ...(ordersNeedQualityCheck.length > 0 ? [{ label: "Needs Weight Check", value: String(ordersNeedQualityCheck.length), sub: "Physical arrival confirmed, awaiting QC", href: "/qc-leader/confirmed-orders", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-100" }] : []),
    ...(ordersNeedTruckPrice.length > 0 ? [{ label: "Needs Truck Price", value: String(ordersNeedTruckPrice.length), sub: "Quality checked, transport cost pending", href: "/qc-leader/confirmed-orders", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-100" }] : []),
    ...(ordersNeedTruck.length > 0 ? [{ label: "Needs Truck Assigned", value: String(ordersNeedTruck.length), sub: "Hub confirmed, no truck assigned yet", href: "/qc-leader/confirmed-orders", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" }] : []),
    ...(ordersNeedLoad.length > 0 ? [{ label: "Awaiting Load Confirm", value: String(ordersNeedLoad.length), sub: "Truck assigned, load not yet confirmed", href: "/qc-leader/confirmed-orders", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-100" }] : []),
    ...(ordersReadyToDispatch.length > 0 ? [{ label: "Ready to Dispatch", value: String(ordersReadyToDispatch.length), sub: "Load confirmed — awaiting dispatch", href: "/qc-leader/confirmed-orders", color: "text-green-700", bg: "bg-green-50", border: "border-green-100" }] : []),
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
    ...(ordersEditUnlocked.length > 0 ? [{
      type: "transport_edit",
      title: "Weight Edit Permission Granted",
      desc: "Hub manager has unlocked weight & quality re-entry — update the details now.",
      count: ordersEditUnlocked.length,
      urgency: "high",
      href: "/qc-leader/confirmed-orders",
      items: ordersEditUnlocked.slice(0, MAX).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.sellerName} → ${o.buyerName} · ${o.qty}`,
        href: "/qc-leader/confirmed-orders",
      })),
    }] : []),
    ...(ordersNeedQualityCheck.length > 0 ? [{
      type: "transport_weight",
      title: "Orders Need Weight & Quality Check",
      desc: "Products have physically arrived at hub — enter actual weight and quality verification.",
      count: ordersNeedQualityCheck.length,
      urgency: "high",
      href: "/qc-leader/confirmed-orders",
      items: ordersNeedQualityCheck.slice(0, MAX).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.sellerName} → ${o.buyerName} · ${o.qty}`,
        href: "/qc-leader/confirmed-orders",
      })),
    }] : []),
    ...(ordersNeedTruckPrice.length > 0 ? [{
      type: "transport_price",
      title: "Truck Price Not Set",
      desc: "Quality check complete — set the transport cost to proceed with dispatch.",
      count: ordersNeedTruckPrice.length,
      urgency: "medium",
      href: "/qc-leader/confirmed-orders",
      items: ordersNeedTruckPrice.slice(0, MAX).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.sellerName} → ${o.buyerName} · ${o.qty}`,
        href: "/qc-leader/confirmed-orders",
      })),
    }] : []),
    ...(ordersNeedTruck.length > 0 ? [{
      type: "transport_truck",
      title: "Truck Not Yet Assigned",
      desc: "Hub has confirmed these orders — assign a truck to proceed with dispatch.",
      count: ordersNeedTruck.length,
      urgency: "high",
      href: "/qc-leader/confirmed-orders",
      items: ordersNeedTruck.slice(0, MAX).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.sellerName} → ${o.buyerName} · ${o.qty}`,
        href: "/qc-leader/confirmed-orders",
      })),
    }] : []),
    ...(ordersNeedLoad.length > 0 ? [{
      type: "transport_load",
      title: "Load Not Yet Confirmed",
      desc: "Truck is assigned but load confirmation is still pending before dispatch.",
      count: ordersNeedLoad.length,
      urgency: "high",
      href: "/qc-leader/confirmed-orders",
      items: ordersNeedLoad.slice(0, MAX).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.sellerName} → ${o.buyerName} · ${o.qty}`,
        href: "/qc-leader/confirmed-orders",
      })),
    }] : []),
    ...(ordersReadyToDispatch.length > 0 ? [{
      type: "transport_dispatch",
      title: "Orders Ready to Dispatch",
      desc: "Truck assigned and load confirmed — proceed to dispatch from the dispatch page.",
      count: ordersReadyToDispatch.length,
      urgency: "high",
      href: "/qc-leader/confirmed-orders",
      items: ordersReadyToDispatch.slice(0, MAX).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.sellerName} → ${o.buyerName} · ${o.assignedTruck ?? "—"}`,
        href: "/qc-leader/confirmed-orders",
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
