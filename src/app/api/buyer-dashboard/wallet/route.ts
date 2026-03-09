import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // Upsert wallet so every buyer always has one
  const wallet = await prisma.wallet.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, balance: 0, currency: "BDT" },
    update: {},
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  // Also pull order payments for this buyer (complement wallet transactions)
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: session.userId }, { buyerName: session.name, buyerId: null }] },
    select: { orderCode: true, product: true, totalAmount: true, confirmedAt: true, status: true },
    orderBy: { confirmedAt: "desc" },
    take: 50,
  });

  const totalDeposited = wallet.transactions
    .filter(t => t.type === "DEPOSIT")
    .reduce((s, t) => s + t.amount, 0);

  const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);

  return NextResponse.json({
    balance: wallet.balance,
    totalDeposited,
    totalSpent,
    transactions: wallet.transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      reference: t.reference ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
    orderPayments: orders.map(o => ({
      id: o.orderCode,
      type: "Payment",
      amount: o.totalAmount,
      description: o.product,
      status: "Completed",
      createdAt: o.confirmedAt.toISOString(),
    })),
  });
}
