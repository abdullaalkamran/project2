import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session || session.activeRole !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { action, rejectedReason } = (await req.json()) as {
    action: "approve" | "reject";
    rejectedReason?: string;
  };

  const request = await prisma.depositRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ message: "Request already processed" }, { status: 400 });
  }

  if (action === "approve") {
    // Upsert wallet and credit balance
    const wallet = await prisma.wallet.upsert({
      where: { userId: request.userId },
      create: { userId: request.userId, balance: 0, currency: "BDT" },
      update: {},
    });

    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: request.amount,
          description: `${request.method}${request.accountDetails ? ` — ${request.accountDetails}` : ""}`,
          reference: request.depositCode,
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: request.amount } },
      }),
      prisma.depositRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          processedBy: session.name,
          processedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  if (action === "reject") {
    await prisma.depositRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedReason: rejectedReason ?? "Rejected by admin",
        processedBy: session.name,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  return NextResponse.json({ message: "Invalid action" }, { status: 400 });
}
