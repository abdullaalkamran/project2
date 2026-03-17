import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, notifyMany, getLotParties } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { decision } = (await req.json()) as { decision: "Approved" | "Rejected" | "Re-inspect" };
    await getSessionUser();

    const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
    if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

    let newStatus = lot.status;
    let leaderDecision: string = decision;
    const isFixedPriceReview = lot.status === "FIXED_PRICE_REVIEW";

    if (isFixedPriceReview) {
      // ── 2nd approval cycle: seller converted unsold auction → fixed price ──
      if (decision === "Approved") {
        newStatus = "QC_PASSED"; // now visible in marketplace as fixed-price
      } else if (decision === "Rejected") {
        newStatus = "AUCTION_UNSOLD"; // back to seller to decide again
      } else {
        // Re-inspect: stay in FIXED_PRICE_REVIEW
        leaderDecision = "Pending";
      }
    } else {
      // ── Normal 1st QC cycle ───────────────────────────────────────────────
      if (decision === "Approved") {
        if (lot.saleType === "FIXED_PRICE") {
          newStatus = "QC_PASSED";
          // Do not auto-create an order here.
          // Fixed-price lots become purchasable, and orders are created only when buyers place them.
        } else {
          newStatus = "LIVE";
        }
      } else if (decision === "Rejected") {
        newStatus = "QC_FAILED";
      } else {
        newStatus = "IN_QC";
        leaderDecision = "Pending";
      }
    }

    const updated = await prisma.lot.update({
      where: { id: lot.id },
      data: {
        status: newStatus,
        leaderDecision,
        ...(decision === "Re-inspect" ? { qcTaskStatus: "PENDING" } : {}),
        ...(decision === "Approved" ? { listOnMarketplace: true } : {}),
      },
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    const sellerId = lot.sellerId;
    const parties = await getLotParties(lot.id);

    if (isFixedPriceReview) {
      if (decision === "Approved") {
        // Notify seller + hub managers + QC checker
        if (sellerId) {
          await notify(sellerId, {
            type: "FIXED_PRICE_APPROVED",
            title: "Fixed Price Approved — Now Live for Sale",
            message: `Your lot "${lot.title}" (${lot.lotCode}) fixed price has been approved and is now listed on the marketplace.`,
            link: "/seller-dashboard/lots",
          });
        }
        await notifyMany([...parties.hubManagerIds, parties.qcCheckerId], {
          type: "FIXED_PRICE_APPROVED",
          title: "Fixed Price Approved",
          message: `Lot "${lot.title}" (${lot.lotCode}) fixed price approved by QC Leader. Now live on marketplace.`,
          link: "/hub-manager/lots",
        });
      } else if (decision === "Rejected") {
        if (sellerId) {
          await notify(sellerId, {
            type: "QC_REJECTED",
            title: "Fixed Price Rejected — Action Required",
            message: `Your fixed price for lot "${lot.title}" (${lot.lotCode}) was rejected by the QC Leader. You may reschedule the auction or set a new price.`,
            link: "/seller-dashboard/lots",
          });
        }
      }
    } else {
      // Normal 1st cycle notifications
      if (sellerId && decision !== "Re-inspect") {
        if (decision === "Approved") {
          const isFixed = lot.saleType === "FIXED_PRICE";
          await notify(sellerId, {
            type: "QC_APPROVED",
            title: isFixed ? "Lot Approved — Now Live for Sale" : "Lot Approved — Auction Going Live",
            message: isFixed
              ? `Your lot "${lot.title}" (${lot.lotCode}) passed QC and is now listed for buyers to purchase.`
              : `Your lot "${lot.title}" (${lot.lotCode}) passed QC and has gone LIVE for auction.`,
            link: "/seller-dashboard/lots",
          });
        } else if (decision === "Rejected") {
          await notify(sellerId, {
            type: "QC_REJECTED",
            title: "Lot Failed QC Inspection",
            message: `Your lot "${lot.title}" (${lot.lotCode}) did not pass QC inspection. Please review the report and contact the hub.`,
            link: "/seller-dashboard/lots",
          });
        }
      }
    }

    return NextResponse.json({
      id: updated.lotCode,
      status: updated.status,
      leaderDecision: updated.leaderDecision,
      saleType: updated.saleType,
    });
  } catch (err) {
    console.error("[leader-decision]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
