import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    const activeRole = (session?.activeRole || "").toLowerCase();
    if (!session || activeRole !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: { userRoles: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        photo: u.photo ?? null,
        status: u.status,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        roles: u.userRoles.map((r) => r.role),
      }))
    );
  } catch (error) {
    console.error("[admin/users GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
