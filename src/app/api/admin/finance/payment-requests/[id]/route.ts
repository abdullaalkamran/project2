import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

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

  // Debit seller wallet when withdrawal is paid (Type 2: seller-requested withdrawal)
  if (status === "PAID" && existing.sellerId) {
    const wallet = await prisma.wallet.upsert({
      where:  { userId: existing.sellerId },
      update: { balance: { decrement: existing.amount } },
      create: { userId: existing.sellerId, balance: -existing.amount, currency: "BDT" },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId:    wallet.id,
        type:        "DEBIT",
        amount:      existing.amount,
        description: `Withdrawal paid: ${existing.paymentCode}`,
        reference:   existing.paymentCode,
      },
    });
  }

  // Notify seller of status change
  if (existing.sellerId) {
    if (status === "APPROVED") {
      await notify(existing.sellerId, {
        type: "PAYMENT_APPROVED",
        title: "Withdrawal Approved",
        message: `Your ৳${existing.amount.toLocaleString()} withdrawal (${existing.paymentCode}) has been approved. Payment will be processed shortly.`,
        link: "/seller-dashboard/finance",
      });
    } else if (status === "PAID") {
      await notify(existing.sellerId, {
        type: "PAYMENT_PAID",
        title: "Payment Sent",
        message: `৳${existing.amount.toLocaleString()} (${existing.paymentCode}) has been paid via ${existing.method}. Ref: ${transactionRef ?? "—"}.`,
        link: "/seller-dashboard/finance",
      });
    } else if (status === "REJECTED") {
      await notify(existing.sellerId, {
        type: "PAYMENT_REJECTED",
        title: "Withdrawal Rejected",
        message: `Your ৳${existing.amount.toLocaleString()} withdrawal (${existing.paymentCode}) was rejected. Reason: ${rejectedReason ?? "No reason provided"}.`,
        link: "/seller-dashboard/finance",
      });
    }
  }

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
