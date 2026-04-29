import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

// PATCH — aroth declines the routed order
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["aroth", "admin"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { orderCode: id } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.arothId !== auth.session!.userId && auth.session!.activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (order.arothStatus !== "PENDING") {
    return NextResponse.json({ message: "Order not in PENDING state" }, { status: 409 });
  }

  const updated = await prisma.order.update({
    where: { orderCode: id },
    data: {
      arothStatus: "CANCELLED",
      // Clear the aroth routing so the buyer can re-route to someone else
      arothId:   null,
      arothName: null,
    },
  });

  return NextResponse.json({ arothStatus: updated.arothStatus });
}
