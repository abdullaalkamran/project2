import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

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
