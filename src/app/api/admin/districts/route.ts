import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { normalizeDistrictName, parseBulkDistrictNames } from "@/lib/bangladesh";

async function requireAdmin() {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const districts = await prisma.district.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({
      districts: districts.map((district) => ({
        id: district.id,
        name: district.name,
        userCount: district._count.users,
        createdAt: district.createdAt.toISOString(),
        updatedAt: district.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin/districts GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const singleName = normalizeDistrictName(body?.name);
    const bulkNames = parseBulkDistrictNames(body?.namesText ?? body?.names ?? "");
    const requestedNames = parseBulkDistrictNames(singleName ? [singleName, ...bulkNames] : bulkNames);

    if (requestedNames.length === 0) {
      return NextResponse.json({ message: "Provide at least one district name" }, { status: 400 });
    }

    const existing = await prisma.district.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));
    const namesToCreate = requestedNames.filter((name) => !existingNames.has(name.toLowerCase()));

    if (namesToCreate.length > 0) {
      await prisma.district.createMany({
        data: namesToCreate.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message:
        namesToCreate.length > 0
          ? `${namesToCreate.length} district${namesToCreate.length > 1 ? "s" : ""} added`
          : "No new districts were added",
      createdCount: namesToCreate.length,
      skippedCount: requestedNames.length - namesToCreate.length,
    });
  } catch (error) {
    console.error("[admin/districts POST]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
