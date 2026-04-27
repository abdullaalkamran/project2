import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

// PATCH /api/hub-manager/aroths/[id]
// [id] = ArothAssignment.id
// Body: { allowedProducts?: string[]; commissionRate?: number; isVerified?: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = (await req.json()) as {
    allowedProducts?: string[];
    commissionRate?: number;
    isVerified?: boolean;
  };

  const assignment = await prisma.arothAssignment.findUnique({ where: { id } });
  if (!assignment) return NextResponse.json({ message: "Aroth assignment not found" }, { status: 404 });

  const updated = await prisma.arothAssignment.update({
    where: { id },
    data: {
      ...(body.allowedProducts !== undefined && { allowedProducts: body.allowedProducts }),
      ...(body.commissionRate  !== undefined && { commissionRate:  body.commissionRate }),
      ...(body.isVerified      !== undefined && { isVerified:      body.isVerified }),
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    assignmentId: updated.id,
    allowedProducts: updated.allowedProducts,
    commissionRate: updated.commissionRate,
    isVerified: updated.isVerified,
  });
}
