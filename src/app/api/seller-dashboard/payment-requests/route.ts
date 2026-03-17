import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// GET — list payment requests for the logged-in seller
export async function GET() {
  try {
    const session = await getSessionUser();
    const role = (session?.activeRole || "").toLowerCase();
    if (!session || role !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

  const requests = await prisma.paymentRequest.findMany({
    where: { sellerId: session.userId },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      paymentCode: r.paymentCode,
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
  } catch (err) {
    console.error("Payment requests GET error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST — seller creates a new payment request
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const role = (session?.activeRole || "").toLowerCase();
    if (!session || role !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

  const body = await req.json();
  const { amount, method, bankDetails, note } = body;

  if (!amount || Number(amount) < 500) {
    return NextResponse.json({ message: "Amount is required and must be at least ৳500" }, { status: 400 });
  }

  // Calculate available balance (only from delivered orders)
  const deliveredEarnings = await prisma.order.aggregate({
    where: {
      sellerId: session.userId,
      delivered: true,
      sellerStatus: "ACCEPTED",
    },
    _sum: { sellerPayable: true },
  });
  const totalEarned = deliveredEarnings._sum.sellerPayable ?? 0;

  const paidSum = await prisma.paymentRequest.aggregate({
    where: { sellerId: session.userId, status: "PAID" },
    _sum: { amount: true },
  });
  const pendingSum = await prisma.paymentRequest.aggregate({
    where: { sellerId: session.userId, status: { in: ["PENDING", "APPROVED"] } },
    _sum: { amount: true },
  });
  const available = Math.max(0, totalEarned - (paidSum._sum.amount ?? 0) - (pendingSum._sum.amount ?? 0));

  if (Number(amount) > available) {
    return NextResponse.json({
      message: `Insufficient balance. Available: ৳${available.toLocaleString("en-IN")}. Only delivered orders are eligible for withdrawal.`,
    }, { status: 400 });
  }

  // Generate unique payment code
  const count = await prisma.paymentRequest.count();
  const paymentCode = `PAY-${String(count + 1).padStart(4, "0")}`;

  const created = await prisma.paymentRequest.create({
    data: {
      paymentCode,
      sellerId: session.userId,
      sellerName: session.name || session.email,
      amount: Number(amount),
      method: method || "Bank Transfer",
      bankDetails: bankDetails || null,
      note: note || null,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      paymentCode: created.paymentCode,
      amount: created.amount,
      method: created.method,
      bankDetails: created.bankDetails,
      note: created.note,
      status: created.status,
      requestedAt: created.requestedAt.toISOString(),
    },
    { status: 201 }
  );
  } catch (err) {
    console.error("Payment requests POST error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
