import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session || session.activeRole?.toLowerCase() !== "admin") return null;
  return session;
}

/** GET /api/admin/hubs/[id]/managers — list users eligible for hub manager roles */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [hub, eligibleUsers] = await Promise.all([
    prisma.hub.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        userRoles: {
          some: { role: { in: ["hub_manager", "delivery_hub_manager"] } },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        userRoles: { select: { role: true } },
      },
    }),
  ]);

  if (!hub) return NextResponse.json({ message: "Hub not found" }, { status: 404 });

  return NextResponse.json({
    assignments: hub.assignments.map((a) => ({
      assignmentId: a.id,
      role: a.role,
      userId: a.user.id,
      name: a.user.name,
      email: a.user.email,
    })),
    eligibleUsers: eligibleUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.userRoles.map((r) => r.role),
    })),
  });
}
