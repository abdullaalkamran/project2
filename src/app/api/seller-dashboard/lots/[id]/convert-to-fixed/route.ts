import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, notifyMany, getLotParties, userIdByName } from "@/lib/notifications";

/**
 * POST /api/seller-dashboard/lots/[id]/convert-to-fixed
 * Body: { fixedAskingPrice: number }
 *
 * Seller converts an unsold auction lot to a fixed-price listing.
 * Triggers 2nd QC cycle: notifies QC leader, QC checker, hub managers.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { fixedAskingPrice } = (await req.json()) as { fixedAskingPrice: number };

    if (!fixedAskingPrice || fixedAskingPrice <= 0) {
      return NextResponse.json({ message: "A valid fixed asking price is required" }, { status: 400 });
    }

    const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
    if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });
    if (lot.status !== "AUCTION_UNSOLD") {
      return NextResponse.json({ message: "Lot is not in AUCTION_UNSOLD status" }, { status: 400 });
    }

    if (lot.sellerId && lot.sellerId !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.lot.update({
      where: { id: lot.id },
      data: {
        status: "FIXED_PRICE_REVIEW",
        saleType: "FIXED_PRICE",
        fixedAskingPrice,
        leaderDecision: "Pending",
        qcTaskStatus: "PENDING",
      },
    });

    // Notify all parties of the 2nd approval cycle
    const parties = await getLotParties(lot.id);

    // Seller (self-confirm)
    if (parties.sellerId) {
      await notify(parties.sellerId, {
        type: "FIXED_PRICE_SUBMITTED",
        title: "Fixed Price Submitted for Review",
        message: `Your lot "${lot.title}" (${lot.lotCode}) has been submitted as a fixed-price listing at ৳${fixedAskingPrice.toLocaleString()}/kg. The QC team and hub manager will review it.`,
        link: "/seller-dashboard/lots",
      });
    }

    // QC Leader
    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: "FIXED_PRICE_SUBMITTED",
        title: "2nd Review: Fixed Price Approval Required",
        message: `Lot "${lot.title}" (${lot.lotCode}) was converted from auction to fixed price at ৳${fixedAskingPrice.toLocaleString()}/kg. Please review and approve the price.`,
        link: "/qc-leader/approvals",
      });
    }

    // QC Checker
    if (parties.qcCheckerId) {
      await notify(parties.qcCheckerId, {
        type: "FIXED_PRICE_SUBMITTED",
        title: "2nd Review: Fixed Price Price Inspection",
        message: `Lot "${lot.title}" (${lot.lotCode}) is going through a 2nd QC cycle for fixed-price listing at ৳${fixedAskingPrice.toLocaleString()}/kg. Awaiting your inspection.`,
        link: "/qc-checker/tasks",
      });
    }

    // Hub Managers
    await notifyMany(parties.hubManagerIds, {
      type: "FIXED_PRICE_SUBMITTED",
      title: "Lot Converted to Fixed Price — Review Needed",
      message: `Lot "${lot.title}" (${lot.lotCode}) converted from auction to fixed price (৳${fixedAskingPrice.toLocaleString()}/kg). 2nd approval cycle started.`,
      link: "/hub-manager/lots",
    });

    return NextResponse.json({ status: "FIXED_PRICE_REVIEW", fixedAskingPrice });
  } catch (err) {
    console.error("[convert-to-fixed]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
