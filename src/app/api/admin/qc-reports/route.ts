import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.qCReport.findMany({
    include: {
      lot: {
        select: {
          lotCode: true,
          title: true,
          quantity: true,
          unit: true,
          sellerName: true,
          hubId: true,
          qcLeaderName: true,
          leaderDecision: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      lotCode: r.lot.lotCode,
      lot: `${r.lot.title} — ${r.lot.quantity} ${r.lot.unit}`,
      title: r.lot.title,
      qty: `${r.lot.quantity} ${r.lot.unit}`,
      seller: r.lot.sellerName,
      hub: r.lot.hubId,
      checker: r.checkerName ?? "—",
      leader: r.lot.qcLeaderName ?? "—",
      leaderDecision: r.lot.leaderDecision ?? "—",
      grade: r.grade,
      verdict: r.verdict,
      minBidRate: r.minBidRate,
      notes: r.notes ?? "",
      submittedAt: r.submittedAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
    }))
  );
}
