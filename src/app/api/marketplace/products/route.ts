import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/lib/products";
import { readLotMedia } from "@/lib/lot-media-store";

export async function GET() {
  const [flowLots, lotMedia] = await Promise.all([
    prisma.lot.findMany({
      where: {
        // Only show lots that should be publicly visible:
        // • LIVE auctions (any saleType)
        // • AUCTION_ENDED (auction concluded — top bidder selected)
        // • SOLD
        // • QC_PASSED with FIXED_PRICE saleType only (approved fixed-price listings)
        // Excluded: AUCTION lots at QC_PASSED (waiting to start — not yet live)
        //           AUCTION_UNSOLD (seller must act — hidden from buyers)
        //           FIXED_PRICE_REVIEW (under 2nd approval cycle)
        OR: [
          { status: "LIVE" },
          { status: "AUCTION_ENDED" },
          { status: "SOLD" },
          { status: "QC_PASSED", saleType: "FIXED_PRICE" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        orders: { select: { qty: true, freeQty: true, status: true, sellerStatus: true } },
        bids:   { orderBy: { amount: "desc" }, take: 1, select: { amount: true } },
        _count: { select: { bids: true } },
      },
    }),
    readLotMedia(),
  ]);

  const marketplacePhotoByLot = new Map(
    lotMedia
      .map((m) => [m.lotId, m.marketplacePhotoUrls?.[0] ?? m.marketplacePhotoUrl])
      .filter((x): x is [string, string] => !!x[1]),
  );

  const flowProducts: Product[] = flowLots.map((l) => {
    const parseQty = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };

    const soldQty = l.orders
      .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "ACCEPTED")
      .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);

    const pendingQty = l.orders
      .filter((o) => o.status !== "CANCELLED" && o.sellerStatus === "PENDING_SELLER")
      .reduce((sum, o) => sum + parseQty(o.qty) + (o.freeQty ?? 0), 0);

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
      auctionEndsAt: l.auctionEndsAt?.toISOString() ?? null,
      trend: (() => {
        const topBid = l.bids[0]?.amount ?? 0;
        const base   = l.minBidRate ?? l.basePrice;
        if (topBid > 0 && topBid > base)  return "up"   as const;
        if (topBid > 0 && topBid < base)  return "down" as const;
        return "stable" as const;
      })(),
      bids: l._count.bids,
      seller: l.sellerName,
      grade: (l.grade === "C" ? "B" : l.grade) as "A" | "B",
      lot: l.lotCode,
      sellerId: l.sellerId ?? undefined,
      storageType: l.storageType || undefined,
      freeQtyEnabled: l.freeQtyEnabled,
      freeQtyPer: l.freeQtyPer,
      freeQtyAmount: l.freeQtyAmount,
      freeQtyUnit: l.freeQtyUnit,
      image:
        marketplacePhotoByLot.get(l.lotCode) ??
        "https://images.unsplash.com/photo-1603331669572-0216c5c88c7b?auto=format&fit=crop&w=640&q=80",
    };
  });

  return NextResponse.json(flowProducts);
}
