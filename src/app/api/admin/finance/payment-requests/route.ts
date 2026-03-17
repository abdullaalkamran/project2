import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// POST — admin creates a direct payment record for a seller (Type 1: order payment → wallet CREDIT)
export async function POST(req: Request) {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    sellerName: string;
    sellerId?: string;
    amount: number;
    method: string;
    bankDetails?: string;
    transactionRef?: string;
    note?: string;
  };

  if (!body.sellerName || !body.amount || body.amount <= 0) {
    return NextResponse.json({ message: "Seller name and amount are required" }, { status: 400 });
  }

  const paymentCode =
    "PAY-ADM-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).toUpperCase().slice(2, 5);

  // Resolve sellerId — use direct ID from request; fall back to order table lookup by sellerName
  let sellerId = body.sellerId ?? null;
  if (!sellerId && body.sellerName) {
    const order = await prisma.order.findFirst({
      where: { sellerName: body.sellerName, sellerId: { not: null } },
      select: { sellerId: true },
    });
    sellerId = order?.sellerId ?? null;
  }

  const request = await prisma.paymentRequest.create({
    data: {
      paymentCode,
      sellerId,
      sellerName:     body.sellerName,
      amount:         body.amount,
      method:         body.method || "Bank Transfer",
      bankDetails:    body.bankDetails ?? null,
      transactionRef: body.transactionRef ?? null,
      note:           body.note ?? "Admin-initiated payment",
      status:         "PAID",
      processedAt:    new Date(),
      processedBy:    session.name || "Admin",
    },
  });

  // Credit seller wallet
  if (sellerId) {
    const wallet = await prisma.wallet.upsert({
      where:  { userId: sellerId },
      update: { balance: { increment: body.amount } },
      create: { userId: sellerId, balance: body.amount, currency: "BDT" },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId:    wallet.id,
        type:        "CREDIT",
        amount:      body.amount,
        description: `Admin payment: ${paymentCode}`,
        reference:   paymentCode,
      },
    });
  }

  return NextResponse.json(request, { status: 201 });
}

// GET — list all payment requests (admin view)
export async function GET() {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.paymentRequest.findMany({
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      paymentCode: r.paymentCode,
      sellerId: r.sellerId,
      sellerName: r.sellerName,
      amount: r.amount,
      method: r.method,
      bankDetails: r.bankDetails,
      note: r.note,
      status: r.status,
      rejectedReason: r.rejectedReason,
      transactionRef: r.transactionRef ?? null,
      processedBy: r.processedBy,
      processedAt: r.processedAt?.toISOString() ?? null,
      requestedAt: r.requestedAt.toISOString(),
    }))
  );
}
