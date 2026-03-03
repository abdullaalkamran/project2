import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({
    where: { status: "PICKED_UP" },
    orderBy: { pickedUpAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.orderCode,
      product: o.product,
      qty: o.qty,
      buyer: o.buyerName,
      pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
      status: o.status,
    }))
  );
}
