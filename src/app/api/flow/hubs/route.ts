import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns all users with the hub_manager role so the form can pick a hub
export async function GET() {
  const roles = await prisma.userRole.findMany({
    where: { role: "hub_manager" },
    include: { user: { select: { id: true, name: true } } },
  });

  const hubs = roles.map((r) => ({
    id:   r.user.id,
    name: r.user.name,
  }));

  return NextResponse.json(hubs);
}
