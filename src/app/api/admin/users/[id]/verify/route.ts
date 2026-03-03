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
  const { isVerified } = await req.json();

  const user = await prisma.user.update({
    where: { id },
    data: { isVerified: Boolean(isVerified) },
  });

  return NextResponse.json({ id: user.id, isVerified: user.isVerified });
}
