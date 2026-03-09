import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { amount, method, accountDetails } = (await req.json()) as {
    amount: number;
    method: string;
    accountDetails?: string;
  };

  if (!amount || amount < 100) {
    return NextResponse.json({ message: "Minimum deposit is ৳ 100" }, { status: 400 });
  }
  if (amount > 1_000_000) {
    return NextResponse.json({ message: "Maximum deposit is ৳ 10,00,000" }, { status: 400 });
  }

  // Upsert wallet
  const wallet = await prisma.wallet.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, balance: 0, currency: "BDT" },
    update: {},
  });

  // Create transaction + update balance
  const [transaction] = await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount,
        description: `${method}${accountDetails ? ` — ${accountDetails}` : ""}`,
      },
    }),
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
  ]);

  return NextResponse.json({ ok: true, transactionId: transaction.id, newBalance: wallet.balance + amount }, { status: 201 });
}
