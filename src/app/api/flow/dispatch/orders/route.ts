import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPreDispatchCheck } from "@/lib/pre-dispatch-store";
import { getShipmentPacketManifest } from "@/lib/shipment-packets-store";

export async function GET() {
  // Show orders ready for dispatch: seller-accepted (ACCEPTED) or auto-confirmed (CONFIRMED)
  const orders = await prisma.order.findMany({
    where: {
      sellerStatus: { in: ["ACCEPTED", "CONFIRMED"] },
      status: { not: "CANCELLED" },
    },
    orderBy: { confirmedAt: "desc" },
  });

  const rows = await Promise.all(
    orders.map(async (o) => {
      const [check, manifest] = await Promise.all([
        getPreDispatchCheck(o.orderCode),
        getShipmentPacketManifest(o.orderCode),
      ]);
      return {
      id: o.orderCode,
      lotId: (o as { lotId: string }).lotId,
      product: o.product,
      qty: o.qty,
      seller: o.sellerName,
      buyer: o.buyerName,
      deliveryPoint: o.deliveryPoint,
      winningBid: `BDT ${o.winningBid}/${o.qty.split(" ")[1] ?? "kg"}`,
      totalAmount: `BDT ${o.totalAmount.toLocaleString()}`,
      confirmedAt: o.confirmedAt.toISOString(),
      assignedTruck: o.assignedTruck,
      loadConfirmed: o.loadConfirmed,
      dispatched: o.dispatched,
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
      pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
      status: o.status,
      sellerStatus: o.sellerStatus,
      preDispatch: {
        physicallyReceived: check?.physicallyReceived ?? false,
        hubManagerConfirmed: check?.hubManagerConfirmed ?? false,
        qcLeadConfirmed: check?.qcLeadConfirmed ?? false,
        qualityChecked: check?.qualityChecked ?? false,
        packetQty: check?.packetQty ?? 0,
        grossWeightKg: check?.grossWeightKg ?? 0,
      },
      packetQr: {
        total: manifest?.totalPackets ?? 0,
        scanned: manifest?.scannedCodes.length ?? 0,
      },
      };
    }),
  );

  return NextResponse.json(rows);
}
