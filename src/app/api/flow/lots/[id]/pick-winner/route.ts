import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, getLotParties } from "@/lib/notifications";
import { emitLotEvent } from "@/lib/bid-broadcaster";

/**
 * POST /api/flow/lots/[id]/pick-winner
 *
 * Seller manually selects a bid winner while auction is still live.
 * - Order is auto-confirmed (sellerStatus = "CONFIRMED") — no seller acceptance required.
 * - Lot is immediately marked AUCTION_ENDED.
 * - Notifies the winning buyer.
 * - Broadcasts closed SSE event to all viewers.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json() as { bidId?: string };
    if (!body.bidId) return NextResponse.json({ message: "bidId is required" }, { status: 400 });

    const lot = await prisma.lot.findUnique({
      where: { lotCode: id },
      include: { bids: { where: { id: body.bidId } } },
    });
    if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });
    if (lot.sellerId !== session.userId)
      return NextResponse.json({ message: "Only the seller can pick a winner" }, { status: 403 });
    if (lot.status !== "LIVE")
      return NextResponse.json({ message: "Auction is not live" }, { status: 400 });

    const winningBid = lot.bids[0];
    if (!winningBid)
      return NextResponse.json({ message: "Bid not found on this lot" }, { status: 404 });

    const parties = await getLotParties(lot.id);

    // Create order — auto-confirmed by seller (sellerStatus = "CONFIRMED")
    const orderCode = `ORD-${String(Date.now()).slice(-6)}`;
    const productAmount   = Math.round(winningBid.amount * lot.quantity * 100) / 100;
    const platformFeeRate = 5;
    const platformFee     = Math.round(productAmount * platformFeeRate) / 100;
    const sellerPayable   = Math.round((productAmount - platformFee) * 100) / 100;

    await prisma.order.create({
      data: {
        orderCode,
        lotId: lot.id,
        buyerId: winningBid.bidderId ?? null,
        sellerId: lot.sellerId ?? null,
        buyerName: winningBid.bidderName,
        sellerName: lot.sellerName,
        product: lot.title,
        qty: `${lot.quantity} ${lot.unit}`,
        deliveryPoint: winningBid.deliveryPoint || "To be confirmed",
        winningBid: winningBid.amount,
        productAmount,
        platformFeeRate,
        platformFee,
        sellerPayable,
        totalAmount: productAmount,
        status: "CONFIRMED",
        sellerStatus: "CONFIRMED", // seller already accepted by picking
        confirmedAt: new Date(),
      },
    });

    // Charge buyer wallet for product amount
    if (winningBid.bidderId) {
      const buyerWallet = await prisma.wallet.upsert({
        where:  { userId: winningBid.bidderId },
        create: { userId: winningBid.bidderId, balance: 0 },
        update: {},
      });
      if (buyerWallet.balance >= productAmount) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: buyerWallet.id },
            data:  { balance: { decrement: productAmount } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: buyerWallet.id,
              type: "DEBIT",
              amount: productAmount,
              description: `Auction won — ${lot.title} (${lot.lotCode}), ${lot.quantity} ${lot.unit}`,
            },
          }),
        ]);
      }
    }

    // Close the lot
    await prisma.lot.update({
      where: { id: lot.id },
      data: { status: "AUCTION_ENDED" },
    });

    // Notify buyer — they won
    if (winningBid.bidderId) {
      await notify(winningBid.bidderId, {
        type: "ORDER_PLACED",
        title: "You won the auction!",
        message: `Seller selected you as the winner for "${lot.title}" (${lot.lotCode}) at ৳${winningBid.amount.toLocaleString()}/kg. Your order has been confirmed.`,
        link: "/buyer-dashboard/orders",
      });
    }

    // Notify seller confirmation
    if (parties.sellerId) {
      await notify(parties.sellerId, {
        type: "ORDER_PLACED",
        title: "Winner Selected — Order Confirmed",
        message: `You selected ${winningBid.bidderName} as the winner for "${lot.title}" at ৳${winningBid.amount.toLocaleString()}/kg. The order is now confirmed.`,
        link: "/seller-dashboard/orders",
      });
    }

    // Broadcast to all SSE listeners on this lot
    emitLotEvent(lot.lotCode, {
      type: "closed",
      result: "sold",
      winningBid: winningBid.amount,
      winner: winningBid.bidderName,
    });

    return NextResponse.json({
      result: "sold",
      winningBid: winningBid.amount,
      buyer: winningBid.bidderName,
      orderCode,
    });
  } catch (err) {
    console.error("[pick-winner]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
