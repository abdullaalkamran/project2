import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// PATCH — update payment request status (approve/reject/mark paid)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, rejectedReason, transactionRef } = body;

  if (!status || !["APPROVED", "PAID", "REJECTED"].includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: {
      status,
      rejectedReason: status === "REJECTED" ? (rejectedReason || "No reason provided") : existing.rejectedReason,
      transactionRef: status === "PAID" ? (transactionRef || null) : existing.transactionRef,
      processedAt: new Date(),
      processedBy: session.name || "Admin",
    },
  });

  return NextResponse.json(updated);
}

// DELETE — delete a payment request
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.paymentRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
