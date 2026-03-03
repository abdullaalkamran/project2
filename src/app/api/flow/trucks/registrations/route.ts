import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/flow/trucks/registrations?status=PENDING   → pending only (default)
// GET /api/flow/trucks/registrations?status=REJECTED  → rejected only
// GET /api/flow/trucks/registrations?status=ALL       → both PENDING and REJECTED
export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status") ?? "PENDING";

  let statusFilter: string[] = ["PENDING"];
  if (statusParam === "REJECTED") statusFilter = ["REJECTED"];
  if (statusParam === "ALL")      statusFilter = ["PENDING", "REJECTED"];

  const trucks = await prisma.truck.findMany({
    where: { registrationStatus: { in: statusFilter } },
    include: { driver: true },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(
    trucks.map((t) => ({
      id:                 t.truckCode,
      reg:                t.reg,
      type:               t.type,
      capacityKg:         t.capacityKg,
      photoUrl:           t.photoUrl ?? null,
      registrationStatus: t.registrationStatus,
      registrationNote:   t.registrationNote ?? null,
      submittedAt:        t.submittedAt.toISOString(),
      submittedBy:        t.submittedBy     ?? null,
      submittedByName:    t.submittedByName ?? null,
      hubId:              t.hubId   ?? null,
      hubName:            t.hubName ?? null,
      driver: t.driver ? {
        driverCode:                  t.driver.driverCode,
        name:                        t.driver.name,
        phone:                       t.driver.phone,
        address:                     t.driver.address ?? null,
        nid:                         t.driver.nid,
        nidPhotoUrl:                 t.driver.nidPhotoUrl ?? null,
        photoUrl:                    t.driver.photoUrl ?? null,
        license:                     t.driver.license,
        licenseExpiry:               t.driver.licenseExpiry,
        licensePhotoUrl:             t.driver.licensePhotoUrl ?? null,
        emergencyContactName:        t.driver.emergencyContactName ?? null,
        emergencyContactRelation:    t.driver.emergencyContactRelation ?? null,
        emergencyContactPhone:       t.driver.emergencyContactPhone ?? null,
        emergencyContactAddress:     t.driver.emergencyContactAddress ?? null,
        emergencyContactPhotoUrl:    t.driver.emergencyContactPhotoUrl ?? null,
        emergencyContactNidPhotoUrl: t.driver.emergencyContactNidPhotoUrl ?? null,
      } : null,
    }))
  );
}
