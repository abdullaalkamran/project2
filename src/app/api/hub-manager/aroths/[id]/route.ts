import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { readLotOptions } from "@/lib/lot-options";

// GET /api/hub-manager/aroths/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["hub_manager", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;

  const assignment = await prisma.arothAssignment.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true, createdAt: true } },
      hub:  { select: { name: true, location: true } },
    },
  });
  if (!assignment) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { arothId: assignment.userId },
    orderBy: { confirmedAt: "desc" },
    select: {
      orderCode: true,
      product: true,
      qty: true,
      totalAmount: true,
      buyerName: true,
      arothStatus: true,
      arothSaleAmount: true,
      arothCommissionRate: true,
      arothCommission: true,
      arothNetAmount: true,
      arothPaymentSentAt: true,
      arothSettledAt: true,
      confirmedAt: true,
    },
  });

  const toIso = (v: Date | null) => (v ? v.toISOString() : null);

  const totalSales      = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED" ? (o.arothSaleAmount ?? 0) : 0), 0);
  const totalCommission = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED" ? (o.arothCommission ?? 0) : 0), 0);
  const totalNet        = orders.reduce((s, o) => s + (o.arothStatus === "SETTLED" ? (o.arothNetAmount  ?? 0) : 0), 0);

  return NextResponse.json({
    assignmentId:    assignment.id,
    userId:          assignment.userId,
    name:            assignment.user.name,
    email:           assignment.user.email,
    phone:           assignment.user.phone,
    joinedAt:        toIso(assignment.user.createdAt),
    hubName:         assignment.hub.name,
    hubLocation:     assignment.hub.location,
    commissionRate:  assignment.commissionRate,
    allowedProducts: assignment.allowedProducts,
    isVerified:      assignment.isVerified,
    isActive:        assignment.isActive,
    createdAt:       toIso(assignment.createdAt),
    allProducts:     readLotOptions().productNames ?? [],
    summary: {
      totalOrders:    orders.length,
      activeOrders:   orders.filter((o) => o.arothStatus !== "SETTLED").length,
      settledOrders:  orders.filter((o) => o.arothStatus === "SETTLED").length,
      awaitingPayment: orders.filter((o) => o.arothStatus === "PAYMENT_SENT").length,
      totalSales,
      totalCommission,
      totalNet,
    },
    orders: orders.map((o) => ({
      ...o,
      confirmedAt:        toIso(o.confirmedAt),
      arothPaymentSentAt: toIso(o.arothPaymentSentAt),
      arothSettledAt:     toIso(o.arothSettledAt),
    })),
  });
}

// PATCH /api/hub-manager/aroths/[id]
// [id] = ArothAssignment.id
// Body: { allowedProducts?: string[]; commissionRate?: number; isVerified?: boolean; isActive?: boolean }
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
    isActive?: boolean;
  };

  const assignment = await prisma.arothAssignment.findUnique({ where: { id } });
  if (!assignment) return NextResponse.json({ message: "Aroth assignment not found" }, { status: 404 });

  const updated = await prisma.arothAssignment.update({
    where: { id },
    data: {
      ...(body.allowedProducts !== undefined && { allowedProducts: body.allowedProducts }),
      ...(body.commissionRate  !== undefined && { commissionRate:  body.commissionRate }),
      ...(body.isVerified      !== undefined && { isVerified:      body.isVerified }),
      ...(body.isActive        !== undefined && { isActive:        body.isActive }),
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    assignmentId:    updated.id,
    allowedProducts: updated.allowedProducts,
    commissionRate:  updated.commissionRate,
    isVerified:      updated.isVerified,
    isActive:        updated.isActive,
  });
}
