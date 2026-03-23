import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notifyMany, notify, getLotParties } from "@/lib/notifications";

/**
 * POST /api/seller-dashboard/lots/[id]/reschedule
 * Body: { auctionEndsAt: string }  — ISO datetime for new auction end
 *
 * Seller reschedules an unsold auction lot.
 * Status goes back to QC_PASSED so hub manager + QC leader can re-approve
 * before the lot goes LIVE again (same approval cycle as the first time).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { auctionEndsAt } = (await req.json()) as { auctionEndsAt: string };

    if (!auctionEndsAt) {
      return NextResponse.json({ message: "auctionEndsAt is required" }, { status: 400 });
    }

    const newEndDate = new Date(auctionEndsAt);
    if (isNaN(newEndDate.getTime()) || newEndDate <= new Date()) {
      return NextResponse.json({ message: "New auction end time must be in the future" }, { status: 400 });
    }

    const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
    if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });
    if (lot.status !== "AUCTION_UNSOLD") {
      return NextResponse.json({ message: "Lot is not in AUCTION_UNSOLD status" }, { status: 400 });
    }

    // Only the seller can reschedule their own lot
    if (lot.sellerId && lot.sellerId !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.lot.update({
      where: { id: lot.id },
      data: {
        status: "QC_PASSED",          // back to approval queue — not directly LIVE
        auctionEndsAt: newEndDate,
        auctionStartsAt: null,         // will be set when leader approves
        leaderDecision: "Pending",     // reset approval decision
      },
    });

    // Notify hub managers AND QC leaders so they can re-approve → LIVE
    const parties = await getLotParties(lot.id);
    await notifyMany(parties.hubManagerIds, {
      type: "LOT_RECEIVED",
      title: "Auction Rescheduled — Approval Required",
      message: `Seller rescheduled lot "${lot.title}" (${lot.lotCode}) with new auction end time ${newEndDate.toLocaleString("en-BD")}. Please review and forward for QC leader approval.`,
      link: "/hub-manager/inventory",
    });

    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: "QC_SUBMITTED",
        title: "Lot Rescheduled — Re-Approval Required",
        message: `Lot "${lot.title}" (${lot.lotCode}) was rescheduled for a new auction (ends ${newEndDate.toLocaleString("en-BD")}). Please approve to make it LIVE again.`,
        link: "/qc-leader/approvals",
      });
    }

    return NextResponse.json({ status: "QC_PASSED", auctionEndsAt: newEndDate.toISOString() });
  } catch (err) {
    console.error("[reschedule]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
