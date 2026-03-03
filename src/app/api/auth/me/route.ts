import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { userRoles: true },
    });

    if (!user || user.status === "SUSPENDED") {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const roles = user.userRoles.map((r) => r.role.toLowerCase());
    const activeRole = (session.activeRole || "").toLowerCase();
    const normalizedActiveRole = roles.includes(activeRole) ? activeRole : roles[0];

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles,
      activeRole: normalizedActiveRole,
    });
  } catch (error) {
    console.error("[me]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
