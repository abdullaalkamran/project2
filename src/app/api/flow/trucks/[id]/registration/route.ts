import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params;
  const session = await getSessionUser();
  const body    = await req.json() as { action: "approve" | "reject"; note?: string };

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ message: "action must be approve or reject" }, { status: 400 });
  }

  const truck = await prisma.truck.findUnique({ where: { truckCode: id } });
  if (!truck) return NextResponse.json({ message: "Truck not found" }, { status: 404 });

  const newStatus = body.action === "approve" ? "APPROVED" : "REJECTED";
  const reviewer  = session?.name ?? "Hub Manager";

  const updated = await prisma.truck.update({
    where: { id: truck.id },
    data: {
      registrationStatus: newStatus,
      registrationNote:   body.note ?? null,
      ...(body.action === "approve" && { status: "AVAILABLE" }),
    },
  });

  // Notify the person who submitted the registration
  if (truck.submittedBy) {
    if (body.action === "approve") {
      await notify(truck.submittedBy, {
        type:    "TRUCK_APPROVED",
        title:   "Truck Registration Approved",
        message: `${reviewer} approved the registration for truck ${truck.reg}. It is now active in the fleet.`,
        link:    "/qc-leader/dispatch",
      });
    } else {
      await notify(truck.submittedBy, {
        type:    "TRUCK_REJECTED",
        title:   "Truck Registration Rejected",
        message: body.note
          ? `${reviewer} rejected the registration for ${truck.reg}. Reason: ${body.note}`
          : `${reviewer} rejected the registration for truck ${truck.reg}.`,
        link:    "/qc-leader/dispatch",
      });
    }
  }

  return NextResponse.json({
    id:                 updated.truckCode,
    registrationStatus: updated.registrationStatus,
    registrationNote:   updated.registrationNote,
  });
}
