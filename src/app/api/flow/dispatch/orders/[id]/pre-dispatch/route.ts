import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getPreDispatchCheck, upsertPreDispatchCheck } from "@/lib/pre-dispatch-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderCode = id.toUpperCase();
  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const existing = await getPreDispatchCheck(id);
  return NextResponse.json(
    existing ?? {
      orderCode,
      physicallyReceived: false,
      hubManagerConfirmed: false,
      qcLeadConfirmed: false,
      qualityChecked: false,
      packetQty: 0,
      grossWeightKg: 0,
      updatedAt: null,
      updatedBy: null,
    },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderCode = id.toUpperCase();
  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const body = (await req.json()) as {
    physicallyReceived?: boolean;
    hubManagerConfirmed?: boolean;
    qcLeadConfirmed?: boolean;
    qualityChecked?: boolean;
    packetQty?: number;
    grossWeightKg?: number;
  };

  const previous = await getPreDispatchCheck(id);
  const next = await upsertPreDispatchCheck({
    orderCode,
    physicallyReceived: body.physicallyReceived ?? previous?.physicallyReceived ?? false,
    hubManagerConfirmed: body.hubManagerConfirmed ?? previous?.hubManagerConfirmed ?? false,
    qcLeadConfirmed: body.qcLeadConfirmed ?? previous?.qcLeadConfirmed ?? false,
    qualityChecked: body.qualityChecked ?? previous?.qualityChecked ?? false,
    packetQty: Number(body.packetQty ?? previous?.packetQty ?? 0),
    grossWeightKg: Number(body.grossWeightKg ?? previous?.grossWeightKg ?? 0),
    updatedAt: new Date().toISOString(),
    updatedBy: session.userId,
  });

  if (next.packetQty < 0 || next.grossWeightKg < 0) {
    return NextResponse.json({ message: "Packet qty and weight must be positive" }, { status: 400 });
  }

  return NextResponse.json(next);
}
