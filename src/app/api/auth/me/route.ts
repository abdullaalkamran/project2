import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getPublicEmail } from "@/lib/auth-identifiers";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        userRoles: true,
        district: { select: { id: true, name: true } },
      },
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
      email: getPublicEmail(user.email),
      phone: user.phone,
      districtId: user.district?.id ?? null,
      districtName: user.district?.name ?? null,
      hubId: user.hubId ?? null,
      status: user.status,
      roles,
      activeRole: normalizedActiveRole,
    });
  } catch (error) {
    console.error("[me]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
