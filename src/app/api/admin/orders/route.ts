import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    include: { lot: { select: { lotCode: true, hubId: true } } },
    orderBy: { confirmedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      product: o.product,
      qty: o.qty,
      freeQty: o.freeQty ?? 0,
      buyer: o.buyerName,
      seller: o.sellerName,
      amount: o.totalAmount,
      hub: o.lot.hubId,
      deliveryPoint: o.deliveryPoint,
      status: o.status,
      dispatched: o.dispatched,
      confirmedAt: o.confirmedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
    }))
  );
}
