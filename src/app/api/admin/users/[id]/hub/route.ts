import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const HUB_ROLES = ["hub_manager", "qc_leader", "qc_checker", "delivery_hub_manager", "delivery_distributor", "seller"];

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || (session.activeRole || "").toLowerCase() !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as { hubIds?: string[]; hubId?: string | null };

  // Support both single hubId (legacy) and hubIds array
  const hubIds: string[] = body.hubIds ?? (body.hubId ? [body.hubId] : []);

  // Get user's hub-relevant roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId: id, role: { in: HUB_ROLES } },
    select: { role: true },
  });
  const roles = userRoles.map(r => r.role);
  const effectiveRoles = roles.length > 0 ? roles : ["member"];

  // Replace all HubManagerAssignment entries for this user's hub roles
  await prisma.hubManagerAssignment.deleteMany({
    where: { userId: id, role: { in: effectiveRoles } },
  });

  if (hubIds.length > 0) {
    await prisma.hubManagerAssignment.createMany({
      data: hubIds.flatMap(hubId => effectiveRoles.map(role => ({ hubId, userId: id, role }))),
      skipDuplicates: true,
    });
  }

  // Keep user.hubId as the primary hub (first selection) for backward compat
  const user = await prisma.user.update({
    where: { id },
    data: { hubId: hubIds[0] ?? null },
  });

  return NextResponse.json({ id: user.id, hubId: user.hubId ?? null, hubIds });
}
