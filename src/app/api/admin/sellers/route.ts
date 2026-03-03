import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const sellers = await prisma.user.findMany({
    where: { userRoles: { some: { role: "seller" } } },
    include: {
      sellerLots: { select: { id: true } },
      sellerOrders: { select: { totalAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    sellers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? "—",
      isVerified: u.isVerified,
      status: u.status,
      joined: u.createdAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
      lots: u.sellerLots.length,
      revenue: u.sellerOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    }))
  );
}
