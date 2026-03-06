import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session || session.activeRole?.toLowerCase() !== "admin") return null;
  return session;
}

/** POST /api/admin/hubs/[id]/assign — assign a user to this hub for a role */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: hubId } = await params;
  const { userId, role } = await req.json() as { userId?: string; role?: string };

  if (!userId || !role) {
    return NextResponse.json({ message: "userId and role are required" }, { status: 400 });
  }
  if (!["hub_manager", "delivery_hub_manager"].includes(role)) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  // Ensure user has the role
  const hasRole = await prisma.userRole.findUnique({
    where: { userId_role: { userId, role } },
  });
  if (!hasRole) {
    return NextResponse.json(
      { message: `User does not have the ${role} role` },
      { status: 400 }
    );
  }

  const assignment = await prisma.hubManagerAssignment.upsert({
    where: { hubId_userId_role: { hubId, userId, role } },
    update: {},
    create: { hubId, userId, role },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}

/** PATCH /api/admin/hubs/[id]/assign — transfer a manager to a different hub */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: fromHubId } = await params;
  const { userId, role, toHubId } = await req.json() as {
    userId?: string; role?: string; toHubId?: string;
  };

  if (!userId || !role || !toHubId) {
    return NextResponse.json({ message: "userId, role and toHubId are required" }, { status: 400 });
  }

  const toHub = await prisma.hub.findUnique({ where: { id: toHubId } });
  if (!toHub) return NextResponse.json({ message: "Destination hub not found" }, { status: 404 });

  // Remove from source hub, add to destination hub
  await prisma.$transaction([
    prisma.hubManagerAssignment.deleteMany({ where: { hubId: fromHubId, userId, role } }),
    prisma.hubManagerAssignment.upsert({
      where: { hubId_userId_role: { hubId: toHubId, userId, role } },
      update: {},
      create: { hubId: toHubId, userId, role },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/hubs/[id]/assign — remove a manager assignment */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: hubId } = await params;
  const { userId, role } = await req.json() as { userId?: string; role?: string };

  if (!userId || !role) {
    return NextResponse.json({ message: "userId and role are required" }, { status: 400 });
  }

  await prisma.hubManagerAssignment.deleteMany({
    where: { hubId, userId, role },
  });

  return NextResponse.json({ ok: true });
}
