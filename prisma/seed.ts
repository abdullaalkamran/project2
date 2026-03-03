import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function seedUser(
  email: string,
  name: string,
  password: string,
  roles: string[],
  isVerified = true
) {
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash: hash, isVerified, status: "ACTIVE" },
    create: { name, email, passwordHash: hash, isVerified, status: "ACTIVE" },
    include: { userRoles: true },
  });
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }
  return user;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Users ──────────────────────────────────────────────────────────────────
  await seedUser("admin@paikari.com", "Platform Admin", "admin123", ["admin"]);
  console.log("✅ admin@paikari.com    / admin123   (admin)");

  const sellerUser = await seedUser("seller@paikari.com", "Rahman Traders", "seller123", ["seller"]);
  console.log("✅ seller@paikari.com   / seller123  (seller)");

  const buyerUser = await seedUser("buyer@paikari.com", "Dhaka Wholesale Ltd", "buyer123", ["buyer"]);
  console.log("✅ buyer@paikari.com    / buyer123   (buyer)");

  await seedUser("hub@paikari.com", "Mirpur Hub Manager", "hub12345", ["hub_manager"]);
  console.log("✅ hub@paikari.com      / hub12345   (hub_manager)");

  await seedUser("qcleader@paikari.com", "Rina Begum", "qclead12", ["qc_leader"]);
  console.log("✅ qcleader@paikari.com / qclead12   (qc_leader)");

  await seedUser("qcchecker@paikari.com", "Mamun Hossain", "qccheck1", ["qc_checker"]);
  console.log("✅ qcchecker@paikari.com / qccheck1  (qc_checker)");

  // ── Trucks & Drivers ───────────────────────────────────────────────────────
  console.log("\n🚛 Seeding trucks and drivers...");

  const truckData = [
    { code: "TRK-01", reg: "DHA-1234", type: "Mini Truck (1.5T)", cap: 1500, status: "On Route", lat: 23.8041, lng: 90.3746, dest: "Mirpur-10 Delivery Point" },
    { code: "TRK-02", reg: "DHA-5678", type: "Pickup (800 kg)", cap: 800, status: "Available", lat: 23.8103, lng: 90.4125, dest: null },
    { code: "TRK-03", reg: "CTG-4321", type: "Mini Truck (1.5T)", cap: 1500, status: "Available", lat: 23.7925, lng: 90.4078, dest: null },
    { code: "TRK-04", reg: "DHA-9999", type: "Covered Van (3T)", cap: 3000, status: "On Route", lat: 23.8694, lng: 90.3985, dest: "Uttara Delivery Point" },
    { code: "TRK-05", reg: "RJH-2020", type: "Pickup (800 kg)", cap: 800, status: "Maintenance", lat: null, lng: null, dest: null },
    { code: "TRK-06", reg: "DHA-3030", type: "Covered Van (3T)", cap: 3000, status: "Available", lat: 23.7961, lng: 90.4043, dest: null },
  ];

  const driverData = [
    { code: "DRV-01", name: "Kalu Mia", phone: "01711-445566", license: "DL-2019-04527", expiry: "2026-03-15", nid: "1234567890", join: "2020-02-10", truckCode: "TRK-01" },
    { code: "DRV-02", name: "Hasan Ali", phone: "01611-334455", license: "DL-2021-07831", expiry: "2025-11-20", nid: "9876543210", join: "2021-06-05", truckCode: "TRK-02" },
    { code: "DRV-03", name: "Jabbar Sheikh", phone: "01511-667788", license: "DL-2018-01122", expiry: "2027-01-30", nid: "1122334455", join: "2019-09-14", truckCode: "TRK-03" },
    { code: "DRV-04", name: "Salam Sarkar", phone: "01511-223344", license: "DL-2020-09944", expiry: "2026-07-08", nid: "5566778899", join: "2020-11-22", truckCode: "TRK-04" },
    { code: "DRV-05", name: "Rafiq Islam", phone: "01711-998877", license: "DL-2022-03315", expiry: "2025-09-12", nid: "2233445566", join: "2022-03-01", truckCode: "TRK-05" },
    { code: "DRV-06", name: "Rahim Driver", phone: "01811-556677", license: "DL-2017-88234", expiry: "2028-05-25", nid: "6677889900", join: "2018-07-19", truckCode: "TRK-06" },
  ];

  // First create trucks without drivers
  const truckIds: Record<string, string> = {};
  for (const t of truckData) {
    const truck = await prisma.truck.upsert({
      where: { truckCode: t.code },
      update: { reg: t.reg, type: t.type, capacityKg: t.cap, status: t.status, currentDestination: t.dest, liveCoordLat: t.lat, liveCoordLng: t.lng, liveCoordsUpdatedAt: t.lat ? new Date() : null },
      create: { truckCode: t.code, reg: t.reg, type: t.type, capacityKg: t.cap, status: t.status, currentDestination: t.dest, liveCoordLat: t.lat, liveCoordLng: t.lng, liveCoordsUpdatedAt: t.lat ? new Date() : null },
    });
    truckIds[t.code] = truck.id;
  }

  // Then create drivers linked to trucks
  for (const d of driverData) {
    await prisma.driver.upsert({
      where: { driverCode: d.code },
      update: { name: d.name, phone: d.phone, licenseExpiry: d.expiry, truckId: truckIds[d.truckCode] },
      create: { driverCode: d.code, name: d.name, phone: d.phone, license: d.license, licenseExpiry: d.expiry, nid: d.nid, joinDate: d.join, truckId: truckIds[d.truckCode] },
    });
  }
  console.log(`✅ ${truckData.length} trucks and ${driverData.length} drivers seeded`);

  // ── Import existing product-flow.json lots ────────────────────────────────
  console.log("\n📦 Importing existing lots from product-flow.json...");
  const flowPath = path.join(process.cwd(), "data", "product-flow.json");

  if (fs.existsSync(flowPath)) {
    const flow = JSON.parse(fs.readFileSync(flowPath, "utf8"));
    let lotCount = 0;
    let orderCount = 0;

    for (const lot of flow.lots ?? []) {
      const existing = await prisma.lot.findUnique({ where: { lotCode: lot.id } });
      if (!existing) {
        await prisma.lot.create({
          data: {
            lotCode: lot.id,
            title: lot.title,
            category: lot.category,
            quantity: Number(lot.quantity),
            unit: lot.unit ?? "kg",
            grade: lot.grade ?? "A",
            hubId: lot.hubId,
            description: lot.description ?? "",
            storageType: lot.storageType ?? "",
            baggageType: lot.baggageType ?? "",
            baggageQty: Number(lot.baggageQty ?? 0),
            basePrice: Number(lot.basePrice),
            askingPricePerKg: Number(lot.askingPricePerKg ?? lot.basePrice),
            minBidRate: lot.minBidRate ? Number(lot.minBidRate) : null,
            sellerId: sellerUser.id,
            sellerName: lot.sellerName ?? "Unknown Seller",
            sellerPhone: lot.sellerPhone,
            status: lot.status,
            createdAt: lot.createdAt ? new Date(lot.createdAt) : new Date(),
            receivedAt: lot.receivedAt ? new Date(lot.receivedAt) : null,
            qcLeaderName: lot.qcLeader,
            qcCheckerName: lot.qcChecker,
            qcTaskStatus: lot.qcTaskStatus,
            verdict: lot.verdict,
            qcNotes: lot.qcNotes,
            qcSubmittedAt: lot.qcSubmittedAt ? new Date(lot.qcSubmittedAt) : null,
            leaderDecision: lot.leaderDecision,
          },
        });
        lotCount++;
      }
    }

    for (const order of flow.orders ?? []) {
      const lot = await prisma.lot.findUnique({ where: { lotCode: order.lotId } });
      if (lot) {
        const existing = await prisma.order.findUnique({ where: { orderCode: order.id } });
        if (!existing) {
          const winBid = parseFloat(String(order.winningBid).replace(/[^0-9.]/g, "")) || 0;
          const total = parseFloat(String(order.totalAmount).replace(/[^0-9.]/g, "")) || 0;
          await prisma.order.create({
            data: {
              orderCode: order.id,
              lotId: lot.id,
              buyerId: buyerUser.id,
              sellerId: sellerUser.id,
              buyerName: order.buyer ?? "Unknown Buyer",
              sellerName: order.seller ?? "Unknown Seller",
              product: order.product,
              qty: order.qty,
              deliveryPoint: order.deliveryPoint,
              winningBid: winBid,
              totalAmount: total,
              status: order.status,
              assignedTruck: order.assignedTruck,
              loadConfirmed: Boolean(order.loadConfirmed),
              dispatched: Boolean(order.dispatched),
              confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : new Date(),
              arrivedAt: order.arrivedAt ? new Date(order.arrivedAt) : null,
              pickedUpAt: order.pickedUpAt ? new Date(order.pickedUpAt) : null,
            },
          });
          orderCount++;
        }
      }
    }

    console.log(`✅ Imported ${lotCount} lots and ${orderCount} orders from product-flow.json`);
  } else {
    console.log("⚠️  data/product-flow.json not found, skipping lot import");
  }

  console.log("\n✅ Seeding complete!");
  console.log("   Login at http://localhost:3000/auth/signin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
