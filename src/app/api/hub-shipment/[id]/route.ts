import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { buildShipmentScanCode } from "@/lib/shipment-scan";
import { getShipmentPacketManifest } from "@/lib/shipment-packets-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { orderCode: id.toUpperCase() },
    include: { lot: { select: { lotCode: true, hubId: true } } },
  });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (!["ACCEPTED", "CONFIRMED"].includes(order.sellerStatus)) {
    return NextResponse.json({ message: "Shipment document is available after seller confirmation" }, { status: 400 });
  }

  const isOwner =
    order.sellerId === session.userId ||
    order.buyerId === session.userId ||
    order.sellerName === session.name ||
    order.buyerName === session.name;
  const canViewByRole = ["hub_manager", "delivery_hub_manager", "admin", "delivery_distributor"].includes(session.activeRole);
  if (!isOwner && !canViewByRole) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const origin = req.headers.get("origin") ?? "";
  const scanCode = buildShipmentScanCode(order.orderCode);
  const scanUrl = origin ? `${origin}/delivery-distributor/pickup?scan=${encodeURIComponent(scanCode)}` : null;
  const qrData = scanUrl ?? scanCode;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;
  const packetManifest = await getShipmentPacketManifest(order.orderCode);

  return NextResponse.json({
    orderCode: order.orderCode,
    lotCode: order.lot?.lotCode ?? null,
    product: order.product,
    qty: order.qty,
    sellerName: order.sellerName,
    buyerName: order.buyerName,
    deliveryPoint: order.deliveryPoint,
    hubId: order.lot?.hubId ?? null,
    assignedTruck: order.assignedTruck ?? null,
    confirmedAt: order.confirmedAt.toISOString(),
    sellerStatus: order.sellerStatus,
    status: order.status,
    scanCode,
    scanUrl,
    qrImageUrl,
    packetSummary: packetManifest
      ? {
          totalPackets: packetManifest.totalPackets,
          scannedCount: packetManifest.scannedCodes.length,
        }
      : null,
  });
}
