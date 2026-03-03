import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (order.sellerStatus !== "ACCEPTED") {
    return NextResponse.json(
      { message: "Seller has not accepted this order. Delivery cannot be marked." },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "ARRIVED", arrivedAt: new Date() },
  });

  return NextResponse.json({
    id: updated.orderCode,
    status: updated.status,
    arrivedAt: updated.arrivedAt?.toISOString(),
  });
}
