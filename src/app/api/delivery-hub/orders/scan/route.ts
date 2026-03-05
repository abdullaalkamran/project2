import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";
import { parsePacketScanCode, parseShipmentScanCode } from "@/lib/shipment-scan";
import {
  getShipmentPacketManifest,
  upsertShipmentPacketManifest,
} from "@/lib/shipment-packets-store";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { scanCode?: string };
    const rawScan = body.scanCode ?? "";
    const packetScan = parsePacketScanCode(rawScan);
    const orderCode = packetScan?.orderCode ?? parseShipmentScanCode(rawScan);
    if (!orderCode) {
      return NextResponse.json({ message: "Invalid shipment scan code" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { orderCode } });
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const manifest = await getShipmentPacketManifest(order.orderCode);
    if (manifest) {
      if (!packetScan) {
        return NextResponse.json(
          { message: "This order uses packet QR tracking. Scan each packet code." },
          { status: 400 },
        );
      }
      if (!manifest.packetCodes.includes(packetScan.packetCode)) {
        return NextResponse.json({ message: "Packet code does not belong to this order" }, { status: 400 });
      }

      const alreadyScanned = manifest.scannedCodes.includes(packetScan.packetCode);
      const scannedCodes = alreadyScanned
        ? manifest.scannedCodes
        : [...manifest.scannedCodes, packetScan.packetCode];

      const nextManifest = await upsertShipmentPacketManifest({
        ...manifest,
        scannedCodes,
        updatedAt: new Date().toISOString(),
      });

      const scannedCount = nextManifest.scannedCodes.length;
      const completed = scannedCount >= nextManifest.totalPackets;

      if (completed && order.status === "DISPATCHED") {
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { status: "HUB_RECEIVED", hubReceivedAt: new Date() },
        });

        if (updated.buyerId) {
          await notify(updated.buyerId, {
            type: "ORDER_HUB_RECEIVED",
            title: "Order Reached Delivery Hub",
            message: `Your order "${updated.product}" (${updated.orderCode}) has reached ${updated.deliveryPoint}.`,
            link: "/buyer-dashboard/orders",
          });
        }

        return NextResponse.json({
          id: updated.orderCode,
          status: updated.status,
          hubReceivedAt: updated.hubReceivedAt?.toISOString() ?? null,
          scannedCount,
          totalPackets: nextManifest.totalPackets,
          completed: true,
          message: "All packets scanned. Order marked as HUB_RECEIVED.",
        });
      }

      return NextResponse.json({
        id: order.orderCode,
        status: order.status,
        hubReceivedAt: order.hubReceivedAt?.toISOString() ?? null,
        scannedCount,
        totalPackets: nextManifest.totalPackets,
        completed: order.status === "HUB_RECEIVED",
        alreadyScanned,
        message: alreadyScanned
          ? `Packet already scanned (${scannedCount}/${nextManifest.totalPackets}).`
          : `Packet scanned (${scannedCount}/${nextManifest.totalPackets}).`,
      });
    }

    if (order.status === "HUB_RECEIVED") {
      return NextResponse.json({
        id: order.orderCode,
        status: order.status,
        hubReceivedAt: order.hubReceivedAt?.toISOString() ?? null,
        completed: true,
      });
    }

    if (order.status !== "DISPATCHED") {
      return NextResponse.json(
        { message: `Order is in ${order.status} status. Only DISPATCHED orders can be received.` },
        { status: 400 },
      );
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "HUB_RECEIVED", hubReceivedAt: new Date() },
    });

    if (updated.buyerId) {
      await notify(updated.buyerId, {
        type: "ORDER_HUB_RECEIVED",
        title: "Order Reached Delivery Hub",
        message: `Your order "${updated.product}" (${updated.orderCode}) has reached ${updated.deliveryPoint}.`,
        link: "/buyer-dashboard/orders",
      });
    }

    return NextResponse.json({
      id: updated.orderCode,
      status: updated.status,
      hubReceivedAt: updated.hubReceivedAt?.toISOString() ?? null,
      completed: true,
    });
  } catch (err) {
    console.error("[delivery-hub/orders/scan]", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
