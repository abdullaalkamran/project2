import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_VISIBLE_STATUSES } from "@/lib/lot-status";

export async function GET() {
  const lots = await prisma.lot.findMany({
    where: { status: { in: [...MARKETPLACE_VISIBLE_STATUSES] } },
    select: { hubId: true },
    distinct: ["hubId"],
    orderBy: { hubId: "asc" },
  });

  const hubs = lots
    .map((l) => l.hubId.trim())
    .filter((h) => h.length > 0)
    // deduplicate after trim (handles "Mirpur Hub - Dhaka" vs "Mirpur Hub — Dhaka")
    .filter((h, i, arr) => arr.indexOf(h) === i);

  return NextResponse.json(hubs);
}
