import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { parseShipmentScanCode } from "@/lib/shipment-scan";
import { notify } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.status !== "HUB_RECEIVED")
    return NextResponse.json({ message: "Order must be in HUB_RECEIVED status to confirm handover" }, { status: 400 });

  const body = await req.json();
  const { scannedCode, deliveryWeightKg, hasDamage, damageNotes } = body as {
    scannedCode: string;
    deliveryWeightKg: number;
    hasDamage: boolean;
    damageNotes?: string;
  };

  // Validate QR scan code matches order
  const parsedOrderCode = parseShipmentScanCode(scannedCode);
  if (!parsedOrderCode || parsedOrderCode !== order.orderCode) {
    return NextResponse.json({ message: "Invalid QR code — does not match this order" }, { status: 400 });
  }

  if (!deliveryWeightKg || deliveryWeightKg <= 0) {
    return NextResponse.json({ message: "Valid delivery weight is required" }, { status: 400 });
  }

  try {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "OUT_FOR_DELIVERY",
        handoverScannedAt: new Date(),
        pickedUpFromHubAt: new Date(),
        deliveryWeightKg,
        hasDamage: hasDamage ?? false,
        damageNotes: hasDamage ? (damageNotes ?? null) : null,
      },
    });

    if (order.buyerId) {
      await notify(order.buyerId, {
        type: "ORDER_OUT_FOR_DELIVERY",
        title: "Order Out for Delivery",
        message: `Your order "${order.product}" (${order.orderCode}) has been handed to the delivery man and is on its way to ${order.deliveryPoint}.${hasDamage ? " Note: Some damage was recorded at handover." : ""}`,
        link: "/buyer-dashboard/orders",
      });
    }

    return NextResponse.json({
      id: updated.orderCode,
      status: updated.status,
      handoverScannedAt: updated.handoverScannedAt?.toISOString(),
      pickedUpFromHubAt: updated.pickedUpFromHubAt?.toISOString(),
      deliveryWeightKg: updated.deliveryWeightKg,
      hasDamage: updated.hasDamage,
      damageNotes: updated.damageNotes,
    });
  } catch (err) {
    console.error("[delivery-hub/handover]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
