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

  // Generate a unique deposit code
  const depositCode = "DEP-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 5);

  const request = await prisma.depositRequest.create({
    data: {
      depositCode,
      userId: session.userId,
      userName: session.name,
      amount,
      method,
      accountDetails: accountDetails ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json(
    { ok: true, depositCode: request.depositCode, status: "PENDING" },
    { status: 201 }
  );
}
