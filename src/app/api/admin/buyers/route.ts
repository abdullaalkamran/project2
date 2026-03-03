import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const buyers = await prisma.user.findMany({
    where: { userRoles: { some: { role: "buyer" } } },
    include: {
      buyerOrders: { select: { totalAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    buyers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? "—",
      isVerified: u.isVerified,
      status: u.status,
      joined: u.createdAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
      orders: u.buyerOrders.length,
      spent: u.buyerOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    }))
  );
}
