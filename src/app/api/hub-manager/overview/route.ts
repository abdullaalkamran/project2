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

  const hubFilter       = hubNames.length > 0 ? { hubId: { in: hubNames } } : {};
  const orderHubFilter  = hubNames.length > 0 ? { lot: { hubId: { in: hubNames } } } : {};

  const [lots, trucks, orders] = await Promise.all([
    prisma.lot.findMany({ where: hubFilter, orderBy: { createdAt: "desc" } }),
    prisma.truck.count({ where: { status: "Available" } }),
    prisma.order.findMany({
      where: {
        sellerStatus: { in: ["ACCEPTED", "CONFIRMED", "PENDING_SELLER"] },
        status: { notIn: ["CANCELLED", "PICKED_UP"] },
        ...orderHubFilter,
      },
      include: { lot: { select: { hubId: true, title: true } } },
      orderBy: { confirmedAt: "asc" },
    }),
  ]);

  const activeLots = lots.filter((l) => l.status !== "QC_FAILED");

  const awaitingReceipt  = lots.filter((l) => ["PENDING_DELIVERY", "AT_HUB"].includes(l.status)).length;
  const inQC             = lots.filter((l) => l.status === "IN_QC").length;
  const leaderReview     = lots.filter((l) => l.status === "QC_SUBMITTED").length;
  const approved         = lots.filter((l) => l.status === "QC_PASSED").length;
  const readyToDispatch  = lots.filter((l) => l.status === "LIVE").length;

  // ─── Required-action buckets ──────────────────────────────────────────────

  // 1. Lots pending receipt — seller dispatched but hub hasn't logged them yet
  const pendingInbound = lots.filter((l) => l.status === "PENDING_DELIVERY");

  // 2. Lots at hub needing QC checker assigned
  const needsQcAssign = lots.filter((l) => l.status === "AT_HUB");

  // 3. Orders awaiting QC leader (QC_SUBMITTED) — hub manager may need to follow up
  const pendingLeaderApproval = lots.filter((l) => l.status === "QC_SUBMITTED");

  // 4a. New orders awaiting seller accept/reject
  const pendingSellerResponse = orders.filter((o) => o.sellerStatus === "PENDING_SELLER");

  // 4. Accepted orders with no truck assigned yet
  const needsTruck = orders.filter(
    (o) => ["ACCEPTED", "CONFIRMED"].includes(o.sellerStatus) && !o.assignedTruck && !o.dispatched,
  );

  // 5. Truck assigned but load not confirmed
  const needsLoadConfirm = orders.filter(
    (o) => o.assignedTruck && !o.loadConfirmed && !o.dispatched,
  );

  // 6. Load confirmed, ready to mark dispatched
  const readyDispatch = orders.filter(
    (o) => o.loadConfirmed && !o.dispatched,
  );

  // 7. Auction-unsold lots
  const auctionUnsold = lots.filter((l) => l.status === "AUCTION_UNSOLD");

  // 8. Rescheduled lots needing QC re-assignment
  const rescheduledNeedQc = lots.filter((l) => l.status === "QC_PASSED" && l.leaderDecision === "Pending");

  // 9. Fixed-price review lots needing approval
  const fixedPriceReview = lots.filter((l) => l.status === "FIXED_PRICE_REVIEW");

  const MAX_ITEMS = 5;

  const requiredActions = [
    ...(pendingSellerResponse.length > 0 ? [{
      type: "pending_orders",
      title: "Orders Awaiting Seller Response",
      desc: "Buyers have placed orders — sellers need to accept or reject them.",
      count: pendingSellerResponse.length,
      urgency: "high" as const,
      href: "/hub-manager/pending-orders",
      items: pendingSellerResponse.slice(0, MAX_ITEMS).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.buyerName} · ${o.qty} · ৳${o.totalAmount.toLocaleString()}`,
        href: "/hub-manager/pending-orders",
      })),
    }] : []),
    ...(pendingInbound.length > 0 ? [{
      type: "inbound",
      title: "Lots Awaiting Inbound Receipt",
      desc: "Seller has dispatched these lots — log them into the hub.",
      count: pendingInbound.length,
      urgency: "high",
      href: "/hub-manager/inbound",
      items: pendingInbound.slice(0, MAX_ITEMS).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ${l.quantity} ${l.unit}`,
        href: "/hub-manager/inbound",
      })),
    }] : []),
    ...(needsQcAssign.length > 0 ? [{
      type: "qc_assign",
      title: "Lots Need QC Checker Assignment",
      desc: "These lots are at hub but no QC inspector has been assigned.",
      count: needsQcAssign.length,
      urgency: "high",
      href: "/hub-manager/qc-assign",
      items: needsQcAssign.slice(0, MAX_ITEMS).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ${l.quantity} ${l.unit}`,
        href: "/hub-manager/qc-assign",
      })),
    }] : []),
    ...(pendingLeaderApproval.length > 0 ? [{
      type: "leader_review",
      title: "QC Reports Awaiting Leader Approval",
      desc: "QC checker submitted — QC leader approval is pending.",
      count: pendingLeaderApproval.length,
      urgency: "medium",
      href: "/hub-manager/qc-waiting",
      items: pendingLeaderApproval.slice(0, MAX_ITEMS).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `Checker: ${l.qcCheckerName ?? "—"} · ${l.quantity} ${l.unit}`,
        href: "/hub-manager/qc-waiting",
      })),
    }] : []),
    ...(needsTruck.length > 0 ? [{
      type: "truck",
      title: "Orders Need Truck Assignment",
      desc: "Accepted orders that haven't been assigned a truck yet.",
      count: needsTruck.length,
      urgency: "high",
      href: "/hub-manager/dispatch",
      items: needsTruck.slice(0, MAX_ITEMS).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.buyerName} · ${o.qty} · ${o.deliveryPoint}`,
        href: "/hub-manager/dispatch",
      })),
    }] : []),
    ...(needsLoadConfirm.length > 0 ? [{
      type: "load_confirm",
      title: "Orders Need Load Confirmation",
      desc: "Truck assigned — confirm loading before dispatch.",
      count: needsLoadConfirm.length,
      urgency: "medium",
      href: "/hub-manager/dispatch",
      items: needsLoadConfirm.slice(0, MAX_ITEMS).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `Truck: ${o.assignedTruck} · ${o.qty}`,
        href: "/hub-manager/dispatch",
      })),
    }] : []),
    ...(readyDispatch.length > 0 ? [{
      type: "dispatch",
      title: "Orders Ready to Dispatch",
      desc: "Load confirmed — mark as dispatched to notify delivery hub.",
      count: readyDispatch.length,
      urgency: "high",
      href: "/hub-manager/dispatch",
      items: readyDispatch.slice(0, MAX_ITEMS).map((o) => ({
        id: o.orderCode,
        label: o.product,
        sub: `${o.buyerName} → ${o.deliveryPoint} · ${o.qty}`,
        href: "/hub-manager/dispatch",
      })),
    }] : []),
    ...(auctionUnsold.length > 0 ? [{
      type: "unsold",
      title: "Auction Unsold — Seller Action Pending",
      desc: "These auctions closed with no bids. Sellers must reschedule or convert to fixed price.",
      count: auctionUnsold.length,
      urgency: "low",
      href: "/hub-manager/inventory",
      items: auctionUnsold.slice(0, MAX_ITEMS).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ${l.quantity} ${l.unit}`,
        href: "/hub-manager/inventory",
      })),
    }] : []),
    ...(rescheduledNeedQc.length > 0 ? [{
      type: "rescheduled_qc",
      title: "Rescheduled Lots — Assign QC Team",
      desc: "Seller rescheduled these auctions. Assign QC leader & checker for re-inspection.",
      count: rescheduledNeedQc.length,
      urgency: "high",
      href: "/hub-manager/inventory?tab=auction-end-action",
      items: rescheduledNeedQc.slice(0, MAX_ITEMS).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ends ${l.auctionEndsAt ? new Date(l.auctionEndsAt).toLocaleDateString() : "—"}`,
        href: "/hub-manager/inventory?tab=auction-end-action",
      })),
    }] : []),
    ...(fixedPriceReview.length > 0 ? [{
      type: "fixed_price_review",
      title: "Fixed Price Review — Approval Needed",
      desc: "Sellers converted unsold lots to fixed price. Review and approve or reject.",
      count: fixedPriceReview.length,
      urgency: "medium",
      href: "/hub-manager/inventory?tab=auction-end-action",
      items: fixedPriceReview.slice(0, MAX_ITEMS).map((l) => ({
        id: l.lotCode,
        label: l.title,
        sub: `${l.sellerName} · ৳${l.askingPricePerKg}/kg`,
        href: "/hub-manager/inventory?tab=auction-end-action",
      })),
    }] : []),
  ];

  // ─── Stats tiles ──────────────────────────────────────────────────────────
  const stats = [
    { label: "Awaiting Receipt",  value: String(awaitingReceipt), sub: "Lot notified but not yet logged",    href: "/hub-manager/inbound",   color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "In QC",             value: String(inQC),            sub: "Checker assigned / inspecting",      href: "/hub-manager/qc-assign", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-100"   },
    { label: "Leader Review",     value: String(leaderReview),    sub: "Submitted — pending approval",       href: "/hub-manager/qc-assign", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "Approved & Ready",  value: String(approved),        sub: "QC passed, ready for auction",       href: "/hub-manager/inventory", color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-100"},
    { label: "Ready to Dispatch", value: String(readyToDispatch), sub: "Auction closed, dispatch pending",   href: "/hub-manager/dispatch",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-100"  },
    { label: "Total in Hub",      value: String(activeLots.length),sub: "All active lots",                   href: "/hub-manager/inventory", color: "text-slate-700",  bg: "bg-slate-50",  border: "border-slate-100"  },
    { label: "Trucks Available",  value: String(trucks),          sub: "Fleet ready for dispatch",           href: "/hub-manager/trucks",    color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-100"    },
  ];

  const pipeline = activeLots.map((l) => ({
    lotId: l.lotCode,
    product: l.title,
    seller: l.sellerName,
    hub: l.hubId,
    qty: `${l.quantity} ${l.unit}`,
    askingPricePerKg: `৳${l.askingPricePerKg}`,
    arrived: l.receivedAt
      ? new Date(l.receivedAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
      : "—",
    qcChecker: l.qcCheckerName,
    qcLeaderDecision:
      l.leaderDecision ??
      (l.qcSubmittedAt ? "Pending" : l.qcCheckerName ? "Not submitted" : null),
    minBidRate: l.minBidRate ? `৳${l.minBidRate}` : null,
    verdict: l.verdict as "PASSED" | "CONDITIONAL" | "FAILED" | null,
    stage: statusToStage(l.status),
  }));

  return NextResponse.json({ stats, pipeline, requiredActions });
}
