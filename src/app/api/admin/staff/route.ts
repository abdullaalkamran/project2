import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const STAFF_ROLES = ["hub_manager", "qc_leader", "qc_checker", "delivery_hub_manager", "delivery_distributor", "admin"];

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.user.findMany({
    where: { userRoles: { some: { role: { in: STAFF_ROLES } } } },
    include: { userRoles: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    staff.map((u) => {
      const staffRoles = u.userRoles.filter((r) => STAFF_ROLES.includes(r.role)).map((r) => r.role);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? "—",
        status: u.status,
        joined: u.createdAt.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }),
        roles: staffRoles,
        primaryRole: staffRoles[0] ?? "—",
      };
    })
  );
}
