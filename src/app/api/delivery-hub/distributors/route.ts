import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const roles = await prisma.userRole.findMany({
    where: { role: "delivery_distributor" },
    include: { user: { select: { id: true, name: true, phone: true, hubId: true } } },
  });

  return NextResponse.json(
    roles.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      phone: r.user.phone ?? "N/A",
      hubId: r.user.hubId ?? null,
    }))
  );
}
