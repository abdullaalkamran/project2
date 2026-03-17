import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const order = await prisma.order.update({
    where: { id },
    data: { dispatched: true, status: "DISPATCHED" },
  });

  return NextResponse.json({ id: order.id, dispatched: order.dispatched });
}
