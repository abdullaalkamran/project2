import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const lots = await prisma.lot.findMany({
    include: { _count: { select: { bids: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    lots.map((l) => ({
      id: l.id,
      lotCode: l.lotCode,
      title: `${l.title} — ${l.quantity} ${l.unit}`,
      seller: l.sellerName,
      basePrice: l.basePrice,
      status: l.status,
      bids: l._count.bids,
      auctionEndsAt: l.auctionEndsAt,
      createdAt: l.createdAt,
    }))
  );
}
