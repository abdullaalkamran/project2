import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "delivery_hub_manager", "delivery_distributor"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (order.sellerStatus !== "ACCEPTED") {
    return NextResponse.json(
      { message: "Seller has not accepted this order. Delivery cannot be marked." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { weightKg, condition, damageNotes, scannedPackets, lostPacketCount, lostReason } = body;

  const missedNote =
    (lostPacketCount as number ?? 0) > 0
      ? `Missing packets: ${lostPacketCount as number}. Reason: ${String(lostReason ?? "").trim()}`
      : null;
  const combinedDamageNotes = [
    condition !== "GOOD" ? String(damageNotes ?? "").trim() : null,
    missedNote,
  ].filter(Boolean).join("\n") || null;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "ARRIVED",
      arrivedAt: new Date(),
      deliveryWeightKg: typeof weightKg === "number" ? weightKg : undefined,
      hasDamage: condition !== "GOOD" || (lostPacketCount as number ?? 0) > 0,
      damageNotes: combinedDamageNotes,
    },
  });

  return NextResponse.json({
    id: updated.orderCode,
    status: updated.status,
    arrivedAt: updated.arrivedAt?.toISOString(),
    scannedCount: Array.isArray(scannedPackets) ? (scannedPackets as string[]).length : 0,
  });
}
