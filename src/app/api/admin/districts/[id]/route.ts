import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { normalizeDistrictName } from "@/lib/bangladesh";

async function requireAdmin() {
  const session = await getSessionUser();
  const role = (session?.activeRole || "").toLowerCase();
  if (!session || role !== "admin") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const name = normalizeDistrictName(body?.name);

    if (!name) {
      return NextResponse.json({ message: "District name is required" }, { status: 400 });
    }

    const existing = await prisma.district.findFirst({
      where: {
        name,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: "District name already exists" }, { status: 409 });
    }

    const district = await prisma.district.update({
      where: { id },
      data: { name },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({
      district: {
        id: district.id,
        name: district.name,
        userCount: district._count.users,
        createdAt: district.createdAt.toISOString(),
        updatedAt: district.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/districts PATCH]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!district) {
      return NextResponse.json({ message: "District not found" }, { status: 404 });
    }

    if (district._count.users > 0) {
      return NextResponse.json(
        { message: "This district is already assigned to users and cannot be deleted" },
        { status: 409 }
      );
    }

    await prisma.district.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/districts DELETE]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
