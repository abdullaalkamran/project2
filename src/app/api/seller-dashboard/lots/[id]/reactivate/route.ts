import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lot = await prisma.lot.findFirst({
    where: {
      lotCode: id.toUpperCase(),
      OR: [{ sellerId: session.userId }, { sellerName: session.name }],
    },
  });

  if (!lot) return NextResponse.json({ message: "Lot not found" }, { status: 404 });

  if (lot.status !== "DEACTIVATED") {
    return NextResponse.json(
      { message: "Only deactivated lots can be reactivated." },
      { status: 400 }
    );
  }

  // Restore to QC_PASSED — lot is re-listed on marketplace as fixed-price listing
  await prisma.lot.update({
    where: { id: lot.id },
    data: { status: "QC_PASSED" },
  });

  return NextResponse.json({ message: "Lot reactivated and listed on marketplace." });
}
