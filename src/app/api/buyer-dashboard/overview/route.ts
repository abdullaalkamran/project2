import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();

  const orders = await prisma.order.findMany({
    where: session?.userId ? { buyerId: session.userId } : {},
    orderBy: { confirmedAt: "desc" },
  });

  const bids = await prisma.bid.findMany({
    where: session?.userId ? { bidderId: session.userId } : {},
    include: { lot: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const wallet = session?.userId
    ? await prisma.wallet.findUnique({ where: { userId: session.userId } })
    : null;

  const activeBids = bids
    .filter((b) => b.lot.status === "LIVE")
    .map((b) => ({
      lot: b.lot.title,
      currentBid: `BDT ${b.amount.toLocaleString()}`,
      yourBid: `BDT ${b.amount.toLocaleString()}`,
      status: "Winning",
      ends: "2h 30m",
    }));

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.orderCode,
    lot: o.product,
    amount: `BDT ${o.totalAmount.toLocaleString()}`,
    status: o.status === "ARRIVED" ? "Delivered" : o.status === "DISPATCHED" ? "In Transit" : o.status === "CONFIRMED" ? "Pending Payment" : o.status,
    date: o.confirmedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
  }));

  const stats = [
    { label: "Active Bids", value: String(activeBids.length), sub: `${activeBids.length} active`, href: "/buyer-dashboard/my-bids", color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Auctions Won", value: String(orders.length), sub: "All time", href: "/buyer-dashboard/my-bids/won", color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Pending Payments", value: String(orders.filter((o) => o.status === "CONFIRMED").length), sub: "Action needed", href: "/buyer-dashboard/payments", color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Wallet Balance", value: `BDT ${(wallet?.balance ?? 0).toLocaleString()}`, sub: "Available", href: "/buyer-dashboard/payments", color: "text-slate-700", bg: "bg-slate-50" },
  ];

  return NextResponse.json({ stats, activeBids, recentOrders });
}
