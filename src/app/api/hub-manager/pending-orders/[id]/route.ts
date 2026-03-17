import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.activeRole !== "hub_manager") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.sellerStatus !== "PENDING_SELLER") {
    return NextResponse.json({ message: "Order is no longer pending" }, { status: 400 });
  }

  // Cancel order and refund buyer
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { sellerStatus: "DECLINED", status: "CANCELLED" },
    });

    if (order.buyerId && order.productAmount > 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId: order.buyerId } });
      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: order.productAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "DEPOSIT",
            amount: order.productAmount,
            description: `Refund — order ${order.orderCode} rejected by hub manager (${order.product})`,
          },
        });
      }
    }
  });

  // Notify buyer
  if (order.buyerId) {
    await notify(order.buyerId, {
      type: "ORDER_DECLINED",
      title: "Order Rejected by Hub",
      message: `Your order (${order.orderCode}) for "${order.product}" was rejected by the hub manager as seller did not respond. Your payment has been refunded.`,
      link: "/buyer-dashboard/orders",
    });
  }

  // Notify seller
  if (order.sellerId) {
    await notify(order.sellerId, {
      type: "ORDER_DECLINED",
      title: "Order Cancelled — No Response",
      message: `Order (${order.orderCode}) for "${order.product}" was cancelled by hub manager ${session.name} due to no seller response.`,
      link: "/seller-dashboard/orders",
    });
  }

  return NextResponse.json({ success: true });
}
