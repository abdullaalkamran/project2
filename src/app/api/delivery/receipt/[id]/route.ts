import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { orderCode: id },
    include: { lot: { select: { lotCode: true, hubId: true } } },
  });

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.status !== "PICKED_UP")
    return NextResponse.json({ message: "Receipt is only available for delivered orders" }, { status: 400 });

  return NextResponse.json({
    orderCode:       order.orderCode,
    product:         order.product,
    qty:             order.qty,
    buyerName:       order.buyerName,
    sellerName:      order.sellerName,
    deliveryPoint:   order.deliveryPoint,
    assignedTruck:   order.assignedTruck ?? null,
    distributorName: order.distributorName ?? null,
    distributorPhone:order.distributorPhone ?? null,
    lotCode:         order.lot?.lotCode ?? null,
    hubId:           order.lot?.hubId ?? null,
    // financials — derive on-the-fly for older orders where productAmount was never set
    winningBid:      order.winningBid,
    qty_raw:         order.qty,
    ...(() => {
      const productAmount   = order.productAmount > 0 ? order.productAmount : order.totalAmount;
      const platformFeeRate = order.platformFeeRate ?? 5;
      const platformFee     = order.platformFee > 0 ? order.platformFee : Math.round(productAmount * platformFeeRate) / 100;
      const sellerPayable   = order.sellerPayable > 0 ? order.sellerPayable : productAmount - platformFee;
      const totalAmount     = productAmount + order.transportCost + platformFee;
      return { productAmount, transportCost: order.transportCost, platformFeeRate, platformFee, sellerPayable, totalAmount };
    })(),
    // dates
    confirmedAt:     order.confirmedAt.toISOString(),
    arrivedAt:       order.arrivedAt?.toISOString() ?? null,
    pickedUpAt:      order.pickedUpAt?.toISOString() ?? null,
    deliveredAt:     order.deliveredAt?.toISOString() ?? null,
  });
}
