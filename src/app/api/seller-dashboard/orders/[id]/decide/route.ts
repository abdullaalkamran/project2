import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify, notifyMany, userIdByName, getLotParties } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { decision } = (await req.json()) as { decision: "ACCEPTED" | "DECLINED" };

    // Find the order by orderCode and verify it belongs to this seller
    const order = await prisma.order.findFirst({
      where: {
        orderCode: id,
        OR: [{ sellerId: session.userId }, { sellerName: session.name }],
      },
    });

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
    if (order.sellerStatus !== "PENDING_SELLER") {
      return NextResponse.json({ message: "Decision already made" }, { status: 400 });
    }

    // When accepting, block if it would exceed the lot's total quantity
    if (decision === "ACCEPTED") {
      const lot = await prisma.lot.findUnique({ where: { id: order.lotId } });
      if (lot) {
        const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };
        const acceptedOrders = await prisma.order.findMany({
          where: { lotId: lot.id, sellerStatus: "ACCEPTED", status: { not: "CANCELLED" } },
          select: { qty: true, freeQty: true },
        });
        const alreadyAccepted = acceptedOrders.reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);
        const thisQty = parseQty(order.qty) + (order.freeQty ?? 0);
        if (alreadyAccepted + thisQty > lot.quantity) {
          return NextResponse.json(
            { message: `Cannot accept: ${alreadyAccepted + thisQty} ${lot.unit} would exceed lot total of ${lot.quantity} ${lot.unit}.` },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        sellerStatus: decision,
        ...(decision === "DECLINED" ? { status: "CANCELLED" } : {}),
      },
    });

    // Refund product amount to buyer wallet when seller declines
    if (decision === "DECLINED" && order.buyerId && order.productAmount > 0) {
      const buyerWallet = await prisma.wallet.findUnique({ where: { userId: order.buyerId } });
      if (buyerWallet) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: buyerWallet.id },
            data:  { balance: { increment: order.productAmount } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: buyerWallet.id,
              type: "DEPOSIT",
              amount: order.productAmount,
              description: `Refund — order ${order.orderCode} declined by seller (${order.product})`,
            },
          }),
        ]);
      }
    }

    // Resolve all parties for this lot
    const [buyerId, parties] = await Promise.all([
      order.buyerId ? Promise.resolve(order.buyerId) : userIdByName(order.buyerName),
      getLotParties(order.lotId),
    ]);

    const isAccepted = decision === "ACCEPTED";
    const notifType = isAccepted ? "ORDER_ACCEPTED" as const : "ORDER_DECLINED" as const;

    // Buyer notification
    if (buyerId) {
      await notify(buyerId, {
        type: notifType,
        title: isAccepted ? "Order Accepted by Seller" : "Order Declined by Seller",
        message: isAccepted
          ? `Great news! Your order for "${order.product}" (${order.orderCode}) has been accepted by the seller. It will be dispatched soon.`
          : `Unfortunately, your order for "${order.product}" (${order.orderCode}) was declined by the seller. You may browse other listings.`,
        link: "/buyer-dashboard/orders",
      });
    }

    // Seller self-confirmation
    await notify(session.userId, {
      type: notifType,
      title: isAccepted ? "You Accepted the Order" : "You Declined the Order",
      message: isAccepted
        ? `You accepted the order from ${order.buyerName} for "${order.product}" (${order.orderCode}). Please prepare for dispatch.`
        : `You declined the order from ${order.buyerName} for "${order.product}" (${order.orderCode}).`,
      link: "/seller-dashboard/orders",
    });

    // Hub managers
    await notifyMany(parties.hubManagerIds, {
      type: notifType,
      title: isAccepted ? "Order Accepted – Dispatch Required" : "Order Declined",
      message: isAccepted
        ? `Seller ${session.name} accepted order (${order.orderCode}) for "${order.product}". Assign a truck for dispatch.`
        : `Order (${order.orderCode}) for "${order.product}" was declined by the seller.`,
      link: "/hub-manager",
    });

    // QC Leader
    if (parties.qcLeaderId) {
      await notify(parties.qcLeaderId, {
        type: notifType,
        title: isAccepted ? "Order Accepted on Your Approved Lot" : "Order Declined on Lot",
        message: isAccepted
          ? `Seller accepted an order from ${order.buyerName} for "${order.product}" (${order.orderCode}).`
          : `An order from ${order.buyerName} for "${order.product}" (${order.orderCode}) was declined.`,
        link: "/qc-leader/approvals",
      });
    }

    return NextResponse.json({ orderCode: updated.orderCode, sellerStatus: updated.sellerStatus });
  } catch (err) {
    console.error("[seller-orders decide]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
