import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { readLotOptions } from "@/lib/lot-options";

function todayBD() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }); // "YYYY-MM-DD"
}

// GET /api/aroth-dashboard/prices?date=YYYY-MM-DD
// Returns today's prices for this aroth + the full product list from CMS
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;
  const date = req.nextUrl.searchParams.get("date") ?? todayBD();

  const [entries, assignment, options] = await Promise.all([
    prisma.arothPriceEntry.findMany({
      where: { arothId: userId, date },
      orderBy: { productName: "asc" },
    }),
    prisma.arothAssignment.findFirst({
      where: { userId },
      select: { allowedProducts: true, isVerified: true, commissionRate: true, hub: { select: { name: true, location: true } } },
    }),
    Promise.resolve(readLotOptions()),
  ]);

  // Only show products the aroth is permitted to sell; fall back to all if none assigned yet
  const allowed = assignment?.allowedProducts ?? [];
  const products = allowed.length > 0
    ? options.productNames.filter((p) => allowed.includes(p))
    : [];

  return NextResponse.json({
    date,
    today: todayBD(),
    products,
    categories: options.categories,
    isVerified: assignment?.isVerified ?? false,
    commissionRate: assignment?.commissionRate ?? 5,
    hub: assignment?.hub ?? null,
    noProductsAssigned: allowed.length === 0,
    entries: entries.map((e) => ({
      id: e.id,
      productName: e.productName,
      category: e.category,
      pricePerKg: e.pricePerKg,
      unit: e.unit,
      note: e.note,
    })),
  });
}

// POST /api/aroth-dashboard/prices
// Body: { entries: { productName, category, pricePerKg, unit, note }[] }
// Upserts all provided price entries for today.
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const userId = auth.session!.userId;
  const date = todayBD();

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
      prisma.arothPriceEntry.upsert({
        where: { arothId_productName_date: { arothId: userId, productName: e.productName, date } },
        update: {
          pricePerKg: e.pricePerKg,
          category: e.category ?? "",
          unit: e.unit ?? "kg",
          note: e.note ?? null,
        },
        create: {
          arothId: userId,
          productName: e.productName,
          category: e.category ?? "",
          pricePerKg: e.pricePerKg,
          unit: e.unit ?? "kg",
          note: e.note ?? null,
          date,
        },
      })
    )
  );

  return NextResponse.json({ saved: results.length, date });
}
