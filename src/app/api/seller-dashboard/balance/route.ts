import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// GET — seller's available balance for withdrawal
// Available = sum of sellerPayable for DELIVERED orders - (PAID + PENDING payment requests)
export async function GET() {
  try {
    const session = await getSessionUser();
    const role = (session?.activeRole || "").toLowerCase();
    if (!session || role !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

  // Sum sellerPayable for delivered orders
  const deliveredOrders = await prisma.order.findMany({
    where: {
      OR: [
        { sellerId: session.userId },
        { sellerName: session.name },
      ],
      delivered: true,
      sellerStatus: "ACCEPTED",
    },
    select: {
      orderCode: true,
      product: true,
      sellerPayable: true,
      totalAmount: true,
      productAmount: true,
      transportCost: true,
      platformFee: true,
      deliveredAt: true,
    },
  });

  const totalEarned = deliveredOrders.reduce((s, o) => s + o.sellerPayable, 0);

  // Sum of PAID payment requests
  const paidRequests = await prisma.paymentRequest.aggregate({
    where: { sellerId: session.userId, status: "PAID" },
    _sum: { amount: true },
  });
  const totalPaid = paidRequests._sum.amount ?? 0;

  // Sum of PENDING + APPROVED (in-progress) payment requests
  const pendingRequests = await prisma.paymentRequest.aggregate({
    where: { sellerId: session.userId, status: { in: ["PENDING", "APPROVED"] } },
    _sum: { amount: true },
  });
  const totalPending = pendingRequests._sum.amount ?? 0;

  const available = Math.max(0, totalEarned - totalPaid - totalPending);

  // All orders (for summary)
  const allOrders = await prisma.order.findMany({
    where: {
      OR: [
        { sellerId: session.userId },
        { sellerName: session.name },
      ],
      sellerStatus: "ACCEPTED",
    },
    select: {
      sellerPayable: true,
      totalAmount: true,
      delivered: true,
      status: true,
    },
  });

  const totalOrders = allOrders.length;
  const deliveredCount = allOrders.filter((o) => o.delivered).length;
  const pendingDelivery = allOrders.filter((o) => !o.delivered).length;
  const totalLifetimeEarnings = allOrders.reduce((s, o) => s + o.sellerPayable, 0);
  const pendingEarnings = allOrders.filter((o) => !o.delivered).reduce((s, o) => s + o.sellerPayable, 0);

  return NextResponse.json({
    available,
    totalEarned,
    totalPaid,
    totalPending,
    totalLifetimeEarnings,
    pendingEarnings,
    totalOrders,
    deliveredCount,
    pendingDelivery,
    deliveredOrders: deliveredOrders.map((o) => ({
      orderCode: o.orderCode,
      product: o.product,
      sellerPayable: o.sellerPayable,
      totalAmount: o.totalAmount,
      productAmount: o.productAmount,
      transportCost: o.transportCost,
      platformFee: o.platformFee,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
    })),
  });
  } catch (err) {
    console.error("Balance API error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
