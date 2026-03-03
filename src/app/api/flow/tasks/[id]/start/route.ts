import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lot = await prisma.lot.findUnique({ where: { lotCode: id } });
  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

  const updated = await prisma.lot.update({
    where: { id: lot.id },
    data: { status: "IN_QC", qcTaskStatus: "IN_PROGRESS" },
  });

  return NextResponse.json({ id: updated.lotCode, status: updated.status, qcTaskStatus: updated.qcTaskStatus });
}
