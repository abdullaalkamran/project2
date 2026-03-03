import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lotCode: string }> },
) {
  const { lotCode } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });

  const body = (await req.json()) as { amount: number };
  if (!body.amount || isNaN(body.amount) || body.amount <= 0) {
    return NextResponse.json({ message: "Invalid bid amount" }, { status: 400 });
  }

  const lot = await prisma.lot.findUnique({
    where: { lotCode: lotCode.toUpperCase() },
    include: { bids: { orderBy: { amount: "desc" }, take: 1 } },
  });

  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });
  if (lot.status !== "LIVE") return NextResponse.json({ message: "Auction is not live" }, { status: 400 });
  if (lot.sellerId === session.userId) return NextResponse.json({ message: "Sellers cannot bid on their own lots" }, { status: 403 });

  const topBid = lot.bids[0]?.amount ?? (lot.minBidRate ?? lot.basePrice);
  if (body.amount <= topBid) {
    return NextResponse.json({ message: `Bid must exceed current top bid of ৳${topBid.toLocaleString()}` }, { status: 400 });
  }

  const bid = await prisma.bid.create({
    data: {
      lotId: lot.id,
      bidderId: session.userId,
      bidderName: session.name ?? "Buyer",
      amount: body.amount,
    },
  });

  return NextResponse.json({ bidId: bid.id, amount: bid.amount, lotCode }, { status: 201 });
}
