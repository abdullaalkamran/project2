import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "hub_manager"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

  const updated = await prisma.lot.update({
    where: { id: lot.id },
    data: { status: "AT_HUB", receivedAt: new Date() },
  });

  // Notify seller that lot has arrived at the hub
  // Resolve seller ID: prefer direct FK, fall back to name lookup for seeded/older lots
  const sellerId = lot.sellerId;
  if (sellerId) {
    await notify(sellerId, {
      type: "LOT_RECEIVED",
      title: "Lot Arrived at Hub",
      message: `Your lot "${lot.title}" (${lot.lotCode}) has been received at ${lot.hubId} and will soon undergo QC inspection.`,
      link: "/seller-dashboard/lots",
    });
  }

  return NextResponse.json({
    id: updated.lotCode,
    status: updated.status,
    receivedAt: updated.receivedAt?.toISOString(),
  });
}
