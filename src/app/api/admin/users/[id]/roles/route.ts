import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const ALL_ROLES = [
  "buyer", "seller", "admin", "hub_manager",
  "qc_leader", "qc_checker", "delivery_hub_manager", "delivery_distributor",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    const activeRole = (session?.activeRole || "").toLowerCase();
    if (!session || activeRole !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const role = typeof body?.role === "string" ? body.role.toLowerCase() : "";

    if (!role || !ALL_ROLES.includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await prisma.userRole.upsert({
      where: { userId_role: { userId: id, role } },
      update: {},
      create: { userId: id, role, assignedBy: session.userId },
    });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: true },
    });

    return NextResponse.json({
      id: updated!.id,
      roles: updated!.userRoles.map((r) => r.role),
    });
  } catch (error) {
    console.error("[admin/users/roles POST]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    const activeRole = (session?.activeRole || "").toLowerCase();
    if (!session || activeRole !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const role = typeof body?.role === "string" ? body.role.toLowerCase() : "";

    if (!role) {
      return NextResponse.json({ message: "Role is required" }, { status: 400 });
    }

    await prisma.userRole.deleteMany({
      where: { userId: id, role },
    });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: true },
    });

    return NextResponse.json({
      id: updated!.id,
      roles: updated!.userRoles.map((r) => r.role),
    });
  } catch (error) {
    console.error("[admin/users/roles DELETE]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
