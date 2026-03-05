import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, notifyMany, getLotParties } from "@/lib/notifications";
import { emitLotEvent } from "@/lib/bid-broadcaster";

/**
 * POST /api/flow/lots/[id]/close-auction
 *
 * Called when the auction timer expires on the live page.
 * - If bids exist → top bidder wins: create order, status = AUCTION_ENDED
 * - If no bids → status = AUCTION_UNSOLD, notify seller + hub managers
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { lotCode: id },
      include: {
        bids: { orderBy: { amount: "desc" }, take: 1 },
      },
    });
    if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });
    if (lot.status !== "LIVE") {
      return NextResponse.json({ message: "Lot is not LIVE" }, { status: 400 });
    }

    // Idempotency guard: if pick-winner already created an order, skip
    const existingOrder = await prisma.order.findFirst({ where: { lotId: lot.id } });
    if (existingOrder) {
      return NextResponse.json({ result: "already_closed" });
    }

    const topBid = lot.bids[0] ?? null;
    const parties = await getLotParties(lot.id);

    if (topBid) {
      // ── Auction won: create order for top bidder ──────────────────────────
      const orderCode = `ORD-${String(Date.now()).slice(-6)}`;
      const winnerUser = topBid.bidderId
        ? await prisma.user.findUnique({ where: { id: topBid.bidderId }, select: { id: true, name: true } })
        : null;

      await prisma.order.create({
        data: {
          orderCode,
          lotId: lot.id,
          buyerId: topBid.bidderId ?? null,
          sellerId: lot.sellerId ?? null,
          buyerName: topBid.bidderName,
          sellerName: lot.sellerName,
          product: lot.title,
          qty: `${lot.quantity} ${lot.unit}`,
          deliveryPoint: topBid.deliveryPoint || "To be confirmed",
          winningBid: topBid.amount,
          totalAmount: topBid.amount * lot.quantity,
          status: "CONFIRMED",
          sellerStatus: "PENDING_SELLER",
        },
      });

      await prisma.lot.update({
        where: { id: lot.id },
        data: { status: "AUCTION_ENDED" },
      });

      // Notify seller of auction result
      if (parties.sellerId) {
        await notify(parties.sellerId, {
          type: "ORDER_PLACED",
          title: "Auction Ended — Buyer Offer Received",
          message: `Your lot "${lot.title}" (${lot.lotCode}) auction ended. Winning bid ৳${topBid.amount.toLocaleString()} by ${topBid.bidderName}. Please review and accept/decline the order.`,
          link: "/seller-dashboard/orders",
        });
      }

      // Broadcast auction-closed event to all SSE subscribers
      emitLotEvent(lot.lotCode, {
        type: "closed",
        result: "sold",
        winningBid: topBid.amount,
        winner: winnerUser?.name ?? topBid.bidderName,
      });

      return NextResponse.json({ result: "sold", winningBid: topBid.amount, buyer: winnerUser?.name ?? topBid.bidderName });
    } else {
      // ── No bids: lot unsold ───────────────────────────────────────────────
      await prisma.lot.update({
        where: { id: lot.id },
        data: { status: "AUCTION_UNSOLD" },
      });

      // Notify seller
      if (parties.sellerId) {
        await notify(parties.sellerId, {
          type: "AUCTION_UNSOLD",
          title: "Action Required: Auction Ended with No Bids",
          message: `Your lot "${lot.title}" (${lot.lotCode}) received no bids. You can reschedule the auction or convert it to a fixed-price listing.`,
          link: "/seller-dashboard/lots",
        });
      }

      // Notify hub managers
      await notifyMany(parties.hubManagerIds, {
        type: "AUCTION_UNSOLD",
        title: "Lot Unsold — Seller Action Pending",
        message: `Lot "${lot.title}" (${lot.lotCode}) auction ended with no bids. Waiting for seller to reschedule or convert to fixed price.`,
        link: "/hub-manager/lots",
      });

      // Broadcast auction-closed event to all SSE subscribers
      emitLotEvent(lot.lotCode, { type: "closed", result: "unsold" });

      return NextResponse.json({ result: "unsold" });
    }
  } catch (err) {
    console.error("[close-auction]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
