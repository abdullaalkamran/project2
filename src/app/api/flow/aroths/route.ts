import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// GET /api/flow/aroths?hub=<name or id>&product=<product name>
// Returns active, verified aroths assigned to the given hub that allow the given product.
export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  const hubParam = req.nextUrl.searchParams.get("hub") ?? req.nextUrl.searchParams.get("hubId");
  const product  = req.nextUrl.searchParams.get("product");

  if (!hubParam) return NextResponse.json({ message: "hub is required" }, { status: 400 });

  // Resolve hub — the deliveryPoint field stores the hub name, but ArothAssignment.hubId
  // references Hub.id (cuid). Look up by name first, then fall back to id match.
  const hub = await prisma.hub.findFirst({
    where: {
      isActive: true,
      OR: [{ name: hubParam }, { id: hubParam }],
    },
    select: { id: true },
  });

  if (!hub) return NextResponse.json([], { status: 200 });

  const assignments = await prisma.arothAssignment.findMany({
    where: {
      hubId:      hub.id,
      isActive:   true,
      isVerified: true,
      // If a product is specified, only return aroths allowed to sell it.
      // An empty allowedProducts array means unrestricted (allow all).
      ...(product
        ? {
            OR: [
              { allowedProducts: { has: product } },
              { allowedProducts: { isEmpty: true } },
            ],
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(
    assignments.map((a) => ({
      id:             a.userId,
      name:           a.user.name,
      phone:          a.user.phone,
      commissionRate: a.commissionRate,
      hubId:          a.hubId,
    }))
  );
}
