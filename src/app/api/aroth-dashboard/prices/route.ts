import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { readLotOptions } from "@/lib/lot-options";

function todayBD() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

// GET /api/aroth-dashboard/prices?date=YYYY-MM-DD&product=xxx
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;
  const date   = req.nextUrl.searchParams.get("date") ?? todayBD();
  const productFilter = req.nextUrl.searchParams.get("product");

  const [allForDate, assignment, options, historyRaw, datesWithData] = await Promise.all([
    // All timestamped entries for this day
    prisma.arothPriceEntry.findMany({
      where: { arothId: userId, date },
      orderBy: { recordedAt: "asc" },
    }),

    prisma.arothAssignment.findFirst({
      where: { userId },
      select: {
        allowedProducts: true,
        isVerified: true,
        commissionRate: true,
        hub: { select: { name: true, location: true } },
      },
    }),

    Promise.resolve(readLotOptions()),

    // Last 30 days of price history for a specific product (for sparkline)
    productFilter
      ? prisma.arothPriceEntry.findMany({
          where: { arothId: userId, productName: productFilter },
          orderBy: { recordedAt: "asc" },
          take: 200,
        })
      : Promise.resolve([]),

    // Which dates have any data (last 30 days)
    prisma.arothPriceEntry.findMany({
      where: {
        arothId: userId,
        date: { in: Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
        })},
      },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
    }),
  ]);

  const allowed = assignment?.allowedProducts ?? [];
  const products = allowed.length > 0
    ? options.productNames.filter((p) => allowed.includes(p))
    : [];

  // Latest price per product for this date (for the editor grid)
  const latestByProduct: Record<string, typeof allForDate[0]> = {};
  for (const e of allForDate) {
    latestByProduct[e.productName] = e; // last one wins (ordered asc)
  }

  // Timeline: group all entries for this date by product
  const timelineByProduct: Record<string, { id: string; price: number; note: string | null; recordedAt: string }[]> = {};
  for (const e of allForDate) {
    if (!timelineByProduct[e.productName]) timelineByProduct[e.productName] = [];
    timelineByProduct[e.productName].push({
      id: e.id,
      price: e.pricePerKg,
      note: e.note,
      recordedAt: e.recordedAt.toISOString(),
    });
  }

  return NextResponse.json({
    date,
    today: todayBD(),
    products,
    categories: options.categories,
    units: options.units,
    isVerified: assignment?.isVerified ?? false,
    commissionRate: assignment?.commissionRate ?? 5,
    hub: assignment?.hub ?? null,
    noProductsAssigned: allowed.length === 0,
    datesWithData: datesWithData.map((d) => d.date),
    // Latest price per product (for grid editor)
    entries: Object.values(latestByProduct).map((e) => ({
      id: e.id,
      productName: e.productName,
      category: e.category,
      pricePerKg: e.pricePerKg,
      unit: e.unit,
      note: e.note,
      recordedAt: e.recordedAt.toISOString(),
    })),
    // Full day timeline per product
    timeline: timelineByProduct,
    // Cross-day history for a selected product
    productHistory: historyRaw.map((e) => ({
      date: e.date,
      price: e.pricePerKg,
      unit: e.unit,
      note: e.note,
      recordedAt: e.recordedAt.toISOString(),
    })),
  });
}

// POST /api/aroth-dashboard/prices
// Creates new timestamped price entries (one per product — overwrites by creating a new record)
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;
  const date = todayBD();
  const now = new Date();

  type EntryInput = {
    productName: string;
    category?: string;
    pricePerKg: number;
    unit?: string;
    note?: string;
  };
  const { entries } = (await req.json()) as { entries: EntryInput[] };

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ message: "entries array required" }, { status: 400 });
  }

  const results = await Promise.all(
    entries.map((e) =>
      prisma.arothPriceEntry.create({
        data: {
          arothId: userId,
          productName: e.productName,
          category: e.category ?? "",
          pricePerKg: e.pricePerKg,
          unit: e.unit ?? "kg",
          note: e.note ?? null,
          date,
          recordedAt: now,
        },
      })
    )
  );

  return NextResponse.json({ saved: results.length, date, recordedAt: now.toISOString() });
}
