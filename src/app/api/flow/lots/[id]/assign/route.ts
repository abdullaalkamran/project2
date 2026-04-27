import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "hub_manager", "qc_leader"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { leaderId, checkerId } = (await req.json()) as { leaderId?: string; checkerId?: string };

  const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

  // Resolve names for display from User table
  const [leaderUser, checkerUser] = await Promise.all([
    leaderId ? prisma.user.findUnique({ where: { id: leaderId }, select: { id: true, name: true } }) : null,
    checkerId ? prisma.user.findUnique({ where: { id: checkerId }, select: { id: true, name: true } }) : null,
  ]);

  const updated = await prisma.lot.update({
    where: { id: lot.id },
    data: {
      qcLeaderId:   leaderUser?.id   ?? lot.qcLeaderId,
      qcLeaderName: leaderUser?.name ?? lot.qcLeaderName,
      qcCheckerId:  checkerUser?.id   ?? lot.qcCheckerId,
      qcCheckerName: checkerUser?.name ?? lot.qcCheckerName,
      status: leaderUser || checkerUser ? "IN_QC" : lot.status,
      qcTaskStatus: leaderUser || checkerUser ? "PENDING" : lot.qcTaskStatus,
      leaderDecision: leaderUser || checkerUser ? "Pending" : lot.leaderDecision,
    },
  });

  // Notify QC leader, checker, and seller when QC team is assigned
  if (leaderUser || checkerUser) {
    const notifData = {
      type: "QC_ASSIGNED" as const,
      title: "New QC Assignment",
      message: `You have been assigned to inspect lot "${updated.title}" (${updated.lotCode}) at ${updated.hubId}.`,
    };
    if (updated.qcLeaderId) await notify(updated.qcLeaderId, { ...notifData, link: "/qc-leader" });
    if (updated.qcCheckerId) await notify(updated.qcCheckerId, { ...notifData, link: "/qc-checker" });
    if (updated.sellerId) {
      await notify(updated.sellerId, {
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
