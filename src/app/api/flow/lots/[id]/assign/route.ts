import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify, userIdByName } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { leader, checker } = (await req.json()) as { leader?: string; checker?: string };

  const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

  const updated = await prisma.lot.update({
    where: { id: lot.id },
    data: {
      qcLeaderName: leader ?? lot.qcLeaderName,
      qcCheckerName: checker ?? lot.qcCheckerName,
      status: leader || checker ? "IN_QC" : lot.status,
      qcTaskStatus: leader || checker ? "PENDING" : lot.qcTaskStatus,
      leaderDecision: checker || leader ? "Pending" : lot.leaderDecision,
    },
  });

  // Notify QC leader, checker, and seller when QC team is assigned
  if (leader || checker) {
    const [leaderId, checkerId, sellerId] = await Promise.all([
      updated.qcLeaderName ? userIdByName(updated.qcLeaderName) : Promise.resolve(null),
      updated.qcCheckerName ? userIdByName(updated.qcCheckerName) : Promise.resolve(null),
      updated.sellerId ? Promise.resolve(updated.sellerId) : userIdByName(updated.sellerName),
    ]);
    const notifData = {
      type: "QC_ASSIGNED" as const,
      title: "New QC Assignment",
      message: `You have been assigned to inspect lot "${updated.title}" (${updated.lotCode}) at ${updated.hubId}.`,
    };
    if (leaderId) await notify(leaderId, { ...notifData, link: "/qc-leader" });
    if (checkerId) await notify(checkerId, { ...notifData, link: "/qc-checker" });
    if (sellerId) {
      await notify(sellerId, {
        type: "QC_ASSIGNED",
        title: "QC Inspection Started",
        message: `Your lot "${updated.title}" (${updated.lotCode}) is now undergoing QC inspection by ${updated.qcCheckerName ?? "QC Checker"} at ${updated.hubId}.`,
        link: "/seller-dashboard/lots",
      });
    }
  }

  return NextResponse.json({
    id: updated.lotCode,
    qcLeader: updated.qcLeaderName,
    qcChecker: updated.qcCheckerName,
    status: updated.status,
    qcTaskStatus: updated.qcTaskStatus,
    leaderDecision: updated.leaderDecision,
  });
}
