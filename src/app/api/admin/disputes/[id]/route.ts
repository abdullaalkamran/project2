import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { status, resolution } = await req.json();

  const allowed = ["OPEN", "IN_REVIEW", "RESOLVED", "ESCALATED"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const data: Record<string, unknown> = { status };
  if (resolution !== undefined) data.resolution = resolution;
  if (status === "RESOLVED") data.resolvedAt = new Date();

  const dispute = await prisma.dispute.update({ where: { id }, data });
  return NextResponse.json({ id: dispute.id, status: dispute.status });
}
