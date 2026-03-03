import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/lib/products";
import { MARKETPLACE_VISIBLE_STATUSES } from "@/lib/lot-status";
import { readLotMedia } from "@/lib/lot-media-store";

export async function GET() {
  const [flowLots, lotMedia] = await Promise.all([
    prisma.lot.findMany({
      where: { status: { in: [...MARKETPLACE_VISIBLE_STATUSES] } },
      orderBy: { createdAt: "desc" },
      include: {
        orders: { select: { qty: true, status: true, sellerStatus: true } },
      },
    }),
    readLotMedia(),
  ]);

  const marketplacePhotoByLot = new Map(
    lotMedia.map((m) => [m.lotId, m.marketplacePhotoUrl]).filter((x): x is [string, string] => !!x[1]),
  );

  const flowProducts: Product[] = flowLots.map((l) => {
    const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };

    const soldQty = l.orders
      .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "ACCEPTED")
      .reduce((sum, o) => sum + parseQty(o.qty), 0);

    const pendingQty = l.orders
      .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "PENDING_SELLER")
      .reduce((sum, o) => sum + parseQty(o.qty), 0);

    const availableQty = Math.max(0, l.quantity - soldQty);

    // Map DB category to Product type category
    const catMap: Record<string, "vegetable" | "fruit" | "grain" | "spice"> = {
      vegetables: "vegetable", vegetable: "vegetable", fruit: "fruit", fruits: "fruit",
      grain: "grain", grains: "grain", rice: "grain", wheat: "grain",
      spice: "spice", spices: "spice", oil: "spice",
    };
    const category = catMap[l.category.toLowerCase()] ?? "grain";

    // Extract hub city name from hubId (e.g. "Mirpur Hub — Dhaka" → "Dhaka")
    const hubRaw = l.hubId ?? "";
    const hubCity = hubRaw.includes("—") ? hubRaw.split("—").pop()!.trim()
      : hubRaw.includes("-") ? hubRaw.split("-").pop()!.trim()
      : hubRaw.split(" ")[0] || "Dhaka";
    const hubMap: Record<string, "Bogura" | "Dhaka" | "Jessore" | "Rangpur"> = {
      dhaka: "Dhaka", bogura: "Bogura", jessore: "Jessore", rangpur: "Rangpur",
      rajshahi: "Rangpur", chittagong: "Dhaka", sylhet: "Dhaka",
    };
    const hub = hubMap[hubCity.toLowerCase()] ?? "Dhaka";

    // Map lot status
    const statusMap: Record<string, "live" | "upcoming" | "fixed"> = {
      LIVE: "live", QC_PASSED: "fixed", AUCTION_ENDED: "fixed",
      AUCTION_UNSOLD: "fixed", FIXED_PRICE_REVIEW: "fixed", SOLD: "fixed",
    };

    return {
      id: l.lotCode.toLowerCase(),
      name: l.title,
      category,
      hub,
      price: l.minBidRate ?? l.basePrice,
      originalPrice: l.askingPricePerKg,
      status: statusMap[l.status] ?? "fixed",
      qty: l.quantity,
      availableQty,
      soldQty,
      pendingQty,
      soldOut: availableQty <= 0,
      delivery: "normal" as const,
      trend: "stable" as const,
      rating: 4.6,
      bids: 0,
      seller: l.sellerName,
      grade: (l.grade === "C" ? "B" : l.grade) as "A" | "B",
      lot: l.lotCode,
      sellerId: l.sellerId ?? undefined,
      image:
        marketplacePhotoByLot.get(l.lotCode) ??
        "https://images.unsplash.com/photo-1603331669572-0216c5c88c7b?auto=format&fit=crop&w=640&q=80",
    };
  });

  return NextResponse.json(flowProducts);
}
