import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { hubId } = (await req.json()) as { hubId: string | null };

  const user = await prisma.user.update({
    where: { id },
    data: { hubId: hubId ?? null },
  });

  return NextResponse.json({ id: user.id, hubId: user.hubId ?? null });
}
