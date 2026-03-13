import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  if (order.distributorId !== session.userId)
    return NextResponse.json({ message: "This order is not assigned to you" }, { status: 403 });

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

  await prisma.order.update({
    where: { id: order.id },
    data: {
      deliveryWeightKg: typeof weightKg === "number" ? weightKg : undefined,
      hasDamage: condition !== "GOOD" || (lostPacketCount as number ?? 0) > 0,
      damageNotes: combinedDamageNotes,
    },
  });

  return NextResponse.json({
    id,
    inspected: true,
    scannedCount: Array.isArray(scannedPackets) ? (scannedPackets as string[]).length : 0,
  });
}
