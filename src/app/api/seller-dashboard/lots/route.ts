import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { DEFAULT_HUB } from "@/lib/hubs";
import {
  SELLER_ACTIVE_STATUSES,
  SELLER_PAST_STATUSES,
  toSellerStatusLabel,
} from "@/lib/lot-status";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const lots = await prisma.lot.findMany({
    where: {
      OR: [
        { sellerId: session.userId },
        { sellerName: session.name },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const active = lots
    .filter((l) => SELLER_ACTIVE_STATUSES.includes(l.status as (typeof SELLER_ACTIVE_STATUSES)[number]))
    .map((l) => ({
      id: l.lotCode,
      title: `${l.title} — ${l.quantity} ${l.unit}`,
      status: toSellerStatusLabel(l.status),
      rawStatus: l.status,
      hub: l.hubId,
      askingPricePerKg: l.askingPricePerKg,
      createdAt: l.createdAt.toLocaleDateString("en-BD", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

  const past = lots
    .filter((l) => SELLER_PAST_STATUSES.includes(l.status as (typeof SELLER_PAST_STATUSES)[number]))
    .map((l) => ({
      id: l.lotCode,
      title: `${l.title} — ${l.quantity} ${l.unit}`,
      status: toSellerStatusLabel(l.status),
      rawStatus: l.status,
      hub: l.hubId,
      createdAt: l.createdAt.toLocaleDateString("en-BD", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

  const preferredHub = lots[0]?.hubId ?? DEFAULT_HUB;

  return NextResponse.json({ active, past, preferredHub });
}
