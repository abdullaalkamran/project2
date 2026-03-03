import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    disputes.map((d) => ({
      id: d.id,
      code: d.code,
      orderCode: d.orderCode,
      buyer: d.buyer,
      seller: d.seller,
      product: d.product,
      reason: d.reason,
      description: d.description,
      status: d.status,
      priority: d.priority,
      resolution: d.resolution,
      createdAt: d.createdAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
      resolvedAt: d.resolvedAt
        ? d.resolvedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" })
        : null,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orderCode, buyer, seller, product, reason, description, priority } = body;

  if (!orderCode || !buyer || !seller || !product || !reason) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const count = await prisma.dispute.count();
  const code = `DISP-${String(count + 1).padStart(4, "0")}`;

  const dispute = await prisma.dispute.create({
    data: {
      code,
      orderCode,
      buyer,
      seller,
      product,
      reason,
      description: description ?? "",
      priority: priority ?? "MEDIUM",
      createdBy: session.userId,
    },
  });

  return NextResponse.json({ id: dispute.id, code: dispute.code }, { status: 201 });
}
