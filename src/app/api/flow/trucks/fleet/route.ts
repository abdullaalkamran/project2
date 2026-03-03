import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trucks = await prisma.truck.findMany({
    where: { registrationStatus: "APPROVED" },
    include: { driver: true },
    orderBy: { truckCode: "asc" },
  });

  return NextResponse.json(
    trucks.map((t) => ({
      id:                 t.truckCode,
      reg:                t.reg,
      type:               t.type,
      capacityKg:         t.capacityKg,
      status:             t.status,
      photoUrl:           t.photoUrl ?? null,
      currentDestination: t.currentDestination ?? null,
      liveCoordLat:       t.liveCoordLat ?? null,
      liveCoordLng:       t.liveCoordLng ?? null,
      driver: t.driver ? {
        id:                          t.driver.driverCode,
        name:                        t.driver.name,
        phone:                       t.driver.phone,
        address:                     t.driver.address ?? null,
        nid:                         t.driver.nid,
        nidPhotoUrl:                 t.driver.nidPhotoUrl ?? null,
        photoUrl:                    t.driver.photoUrl ?? null,
        license:                     t.driver.license,
        licenseExpiry:               t.driver.licenseExpiry,
        licensePhotoUrl:             t.driver.licensePhotoUrl ?? null,
        joinDate:                    t.driver.joinDate,
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
