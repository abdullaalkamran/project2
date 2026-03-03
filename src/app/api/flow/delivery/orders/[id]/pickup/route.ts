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
      { message: "Seller has not accepted this order. Pickup cannot be confirmed." },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "PICKED_UP", pickedUpAt: new Date(), delivered: true, deliveredAt: new Date() },
  });

  return NextResponse.json({
    id: updated.orderCode,
    status: updated.status,
    pickedUpAt: updated.pickedUpAt?.toISOString(),
  });
}
