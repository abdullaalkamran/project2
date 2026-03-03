import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notifyMany, userIdsByRole } from "@/lib/notifications";

export async function GET() {
  // Only return APPROVED trucks for dispatch/fleet operations
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
      driverName:         t.driver?.name ?? null,
      driverPhone:        t.driver?.phone ?? null,
      driverPhotoUrl:     t.driver?.photoUrl ?? null,
      currentDestination: t.currentDestination ?? null,
    }))
  );
}

// Auto-generate next truck code: TRK-001, TRK-002, …
async function nextTruckCode(): Promise<string> {
  const count = await prisma.truck.count();
  return `TRK-${String(count + 1).padStart(3, "0")}`;
}

// Coerce empty string → null for optional fields
function nullIfEmpty(v: string | undefined | null): string | null {
  if (v === undefined || v === null || v.trim() === "") return null;
  return v.trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();

    const body = await req.json() as {
      reg:         string;
      type:        string;
      capacityKg:  number | string;
      photoUrl?:   string;
      hubId?:      string;
      hubName?:    string;
      driverName:          string;
      driverPhone:         string;
      driverAddress?:      string;
      driverNid:           string;
      driverNidPhotoUrl?:  string;
      driverPhotoUrl?:     string;
      licenseNumber:       string;
      licenseExpiry:       string;
      licensePhotoUrl?:    string;
      emergencyContactName?:        string;
      emergencyContactRelation?:    string;
      emergencyContactPhone?:       string;
      emergencyContactAddress?:     string;
      emergencyContactPhotoUrl?:    string;
      emergencyContactNidPhotoUrl?: string;
    };

    const reg           = body.reg?.trim();
    const type          = body.type?.trim();
    const capacityKg    = Number(body.capacityKg);
    const driverName    = body.driverName?.trim();
    const driverPhone   = body.driverPhone?.trim();
    const driverNid     = body.driverNid?.trim();
    const licenseNumber = body.licenseNumber?.trim();
    const licenseExpiry = body.licenseExpiry?.trim();

    // Required field validation
    if (!reg || !type || !capacityKg || isNaN(capacityKg)) {
      return NextResponse.json({ message: "Please fill in all required truck fields (plate, type, capacity)." }, { status: 400 });
    }
    if (!driverName || !driverPhone || !driverNid || !licenseNumber || !licenseExpiry) {
      return NextResponse.json({ message: "Please fill in all required driver fields (name, phone, NID, license, expiry)." }, { status: 400 });
    }
    if (!nullIfEmpty(body.photoUrl)) {
      return NextResponse.json({ message: "Truck photo is required." }, { status: 400 });
    }
    if (!nullIfEmpty(body.driverPhotoUrl)) {
      return NextResponse.json({ message: "Driver photo is required." }, { status: 400 });
    }
    if (!nullIfEmpty(body.driverNidPhotoUrl)) {
      return NextResponse.json({ message: "Driver NID photo is required." }, { status: 400 });
    }
    if (!nullIfEmpty(body.licensePhotoUrl)) {
      return NextResponse.json({ message: "Driving license photo is required." }, { status: 400 });
    }

    // Duplicate checks
    const [existingReg, existingLicense, existingNid] = await Promise.all([
      prisma.truck.findUnique({ where: { reg } }),
      prisma.driver.findUnique({ where: { license: licenseNumber } }),
      prisma.driver.findUnique({ where: { nid: driverNid } }),
    ]);
    if (existingReg)     return NextResponse.json({ message: `Registration plate "${reg}" is already registered in the system.` },    { status: 409 });
    if (existingLicense) return NextResponse.json({ message: `Driving license "${licenseNumber}" is already registered in the system.` }, { status: 409 });
    if (existingNid)     return NextResponse.json({ message: `NID "${driverNid}" is already registered in the system.` },             { status: 409 });

    // Auto-generate codes
    const truckCode   = await nextTruckCode();
    const driverCount = await prisma.driver.count();
    const driverCode  = `DRV-${String(driverCount + 1).padStart(4, "0")}`;

    await prisma.truck.create({
      data: {
        truckCode,
        reg,
        type,
        capacityKg,
        status:             "AVAILABLE",
        photoUrl:           nullIfEmpty(body.photoUrl),
        registrationStatus: "PENDING",
        submittedBy:        session?.userId   ?? null,
        submittedByName:    session?.name     ?? null,
        hubId:              nullIfEmpty(body.hubId),
        hubName:            nullIfEmpty(body.hubName),
        driver: {
          create: {
            driverCode,
            name:            driverName,
            phone:           driverPhone,
            address:         nullIfEmpty(body.driverAddress),
            license:         licenseNumber,
            licenseExpiry,
            licensePhotoUrl: nullIfEmpty(body.licensePhotoUrl),
            nid:             driverNid,
            nidPhotoUrl:     nullIfEmpty(body.driverNidPhotoUrl),
            photoUrl:        nullIfEmpty(body.driverPhotoUrl),
            joinDate:        new Date().toISOString().slice(0, 10),
            emergencyContactName:        nullIfEmpty(body.emergencyContactName),
            emergencyContactRelation:    nullIfEmpty(body.emergencyContactRelation),
            emergencyContactPhone:       nullIfEmpty(body.emergencyContactPhone),
            emergencyContactAddress:     nullIfEmpty(body.emergencyContactAddress),
            emergencyContactPhotoUrl:    nullIfEmpty(body.emergencyContactPhotoUrl),
            emergencyContactNidPhotoUrl: nullIfEmpty(body.emergencyContactNidPhotoUrl),
          },
        },
      },
    });

    // Notify all hub managers
    const hubManagerIds = await userIdsByRole("hub_manager");
    await notifyMany(hubManagerIds, {
      type:    "TRUCK_SUBMITTED",
      title:   "New Truck Registration",
      message: `${session?.name ?? "QC Leader"} submitted a new truck (${reg} · ${type}) pending your approval.`,
      link:    "/hub-manager/trucks",
    });

    return NextResponse.json({
      id:      truckCode,
      message: "Registration submitted. Awaiting hub manager approval.",
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/flow/trucks]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: `Server error: ${detail}` },
      { status: 500 }
    );
  }
}
