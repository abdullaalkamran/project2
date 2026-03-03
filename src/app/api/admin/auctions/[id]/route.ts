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
  const { status } = await req.json();

  const allowed = ["AUCTION_ENDED", "LIVE", "QC_PASSED", "QC_FAILED"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const lot = await prisma.lot.update({ where: { id }, data: { status } });
  return NextResponse.json({ id: lot.id, status: lot.status });
}
