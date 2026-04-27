import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { notify } from "@/lib/notifications";

// PATCH — aroth reports they have sent payment (net amount) to platform bank account
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.arothId !== auth.session!.userId && auth.session!.activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (order.arothStatus !== "SOLD") {
    return NextResponse.json({ message: "Must report sale first" }, { status: 409 });
  }

  const updated = await prisma.order.update({
    where: { orderCode: id },
    data: {
      arothStatus: "PAYMENT_SENT",
      arothPaymentSentAt: new Date(),
    },
  });

  // Notify hub managers of this hub to confirm the payment
  const hubId = order.arothHubId;
  if (hubId) {
    const hubManagers = await prisma.hubManagerAssignment.findMany({
      where: { hubId, role: "hub_manager" },
      select: { userId: true },
    });
    await Promise.all(
      hubManagers.map((hm) =>
        notify(hm.userId, {
          type: "AROTH_PAYMENT_SENT",
          title: "Aroth Payment Sent — Confirm Receipt",
          message: `Aroth "${order.arothName}" has sent ৳${(order.arothNetAmount ?? 0).toLocaleString()} for order ${order.orderCode}. Please confirm receipt.`,
          link: "/hub-manager/aroth-orders",
        })
      )
    );
  }

  return NextResponse.json({ arothStatus: updated.arothStatus, arothPaymentSentAt: updated.arothPaymentSentAt });
}
