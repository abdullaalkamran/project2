import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  getShipmentPacketManifest,
  upsertShipmentPacketManifest,
} from "@/lib/shipment-packets-store";
import { buildPacketScanCode } from "@/lib/shipment-scan";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";

function canManage(activeRole: string): boolean {
  return ["hub_manager", "qc_leader", "delivery_hub_manager", "admin"].includes(activeRole);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderCode = id.toUpperCase();
  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const manifest = await getShipmentPacketManifest(orderCode);

  if (!manifest) {
    return NextResponse.json({
      orderCode,
      totalPackets: 0,
      scannedCount: 0,
      packetCodes: [],
    });
  }

  return NextResponse.json({
    orderCode: manifest.orderCode,
    totalPackets: manifest.totalPackets,
    scannedCount: manifest.scannedCodes.length,
    packetCodes: manifest.packetCodes,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!canManage(session.activeRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orderCode = id.toUpperCase();

  const body = (await req.json()) as { packetCount?: number };
  const packetCount = Number(body.packetCount ?? 0);
  if (!Number.isFinite(packetCount) || packetCount < 1 || packetCount > 500) {
    return NextResponse.json({ message: "Packet count must be between 1 and 500" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const check = await getPreDispatchCheck(orderCode);
  // Gate must match gateReadyForDispatch: physicallyReceived + qualityChecked + packetQty + grossWeightKg + truckPriceBDT + hubManagerConfirmed
  const gatePassed = !!(
    check?.physicallyReceived &&
    check?.hubManagerConfirmed &&
    check?.qualityChecked &&
    check?.packetQty > 0 &&
    check?.grossWeightKg > 0
  );
  if (!gatePassed) {
    return NextResponse.json(
      { message: "Complete all gate steps (physical receive, QC check, hub manager confirmation) before QR generation." },
      { status: 400 },
    );
  }

  const packetCodes = Array.from({ length: packetCount }, (_, i) =>
    buildPacketScanCode(orderCode, i + 1),
  );

  const nowIso = new Date().toISOString();
  const existing = await getShipmentPacketManifest(orderCode);
  const manifest = await upsertShipmentPacketManifest({
    orderCode,
    totalPackets: packetCount,
    packetCodes,
    scannedCodes: existing?.scannedCodes.filter((c) => packetCodes.includes(c)) ?? [],
    createdBy: session.userId,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  });

  return NextResponse.json({
    orderCode: manifest.orderCode,
    totalPackets: manifest.totalPackets,
    scannedCount: manifest.scannedCodes.length,
    packetCodes: manifest.packetCodes,
  });
}
