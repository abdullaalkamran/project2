import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { notify } from "@/lib/notifications";

// PATCH — hub manager confirms that the aroth's bank payment was received
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.arothStatus !== "PAYMENT_SENT") {
    return NextResponse.json({ message: "Payment not yet marked as sent by aroth" }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.order.update({
    where: { orderCode: id },
    data: {
      arothStatus: "SETTLED",
      arothPaymentConfirmedAt: now,
      arothSettledAt: now,
    },
  });

  // Notify aroth + buyer of settlement
  if (order.arothId) {
    await notify(order.arothId, {
      type: "AROTH_SETTLED",
      title: "Payment Confirmed & Settled",
      message: `Hub has confirmed receipt of ৳${(order.arothNetAmount ?? 0).toLocaleString()} for order ${order.orderCode}. Order is now settled.`,
      link: "/aroth-dashboard/orders",
    });
  }
  if (order.buyerId) {
    await notify(order.buyerId, {
      type: "AROTH_SETTLED",
      title: "Aroth Order Settled",
      message: `Your order ${order.orderCode} routed to aroth "${order.arothName}" has been fully settled. Sale: ৳${(order.arothSaleAmount ?? 0).toLocaleString()}.`,
      link: "/buyer-dashboard/orders",
    });
  }

  return NextResponse.json({ arothStatus: updated.arothStatus, arothSettledAt: updated.arothSettledAt });
}
