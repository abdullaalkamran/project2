import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  buildPhoneAuthEmail,
  isValidBangladeshMobileNumber,
  isValidEmailAddress,
  normalizeBangladeshPhone,
  normalizeEmail,
} from "@/lib/auth-identifiers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = normalizeEmail(body?.email);
    const phone = normalizeBangladeshPhone(body?.phone);
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const districtId = typeof body?.districtId === "string" ? body.districtId.trim() : "";
    const hubId = typeof body?.hubId === "string" ? body.hubId.trim() : "";
    const ownerName = typeof body?.ownerName === "string" ? body.ownerName.trim() : "";
    const tradeLicense = typeof body?.tradeLicense === "string" ? body.tradeLicense.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";

    if (!name || !password || !role || !districtId || (!email && !phone)) {
      return NextResponse.json(
        { message: "Name, district, password, account type, and email or mobile number are required" },
        { status: 400 }
      );
    }

    if (!["buyer", "seller"].includes(role)) {
      return NextResponse.json(
        { message: "Only buyer and seller accounts can be created here" },
        { status: 400 }
      );
    }

    if (email && !isValidEmailAddress(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address" },
        { status: 400 }
      );
    }

    if (phone && !isValidBangladeshMobileNumber(phone)) {
      return NextResponse.json(
        { message: "Enter a valid Bangladeshi mobile number" },
        { status: 400 }
      );
    }

    if (address && address.length < 3) {
      return NextResponse.json(
        { message: "Address must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (role === "seller") {
      if (!ownerName || ownerName.length < 2) {
        return NextResponse.json(
          { message: "Owner or contact name is required for seller accounts" },
          { status: 400 }
        );
      }

      if (!tradeLicense || tradeLicense.length < 3) {
        return NextResponse.json(
          { message: "Trade license is required for seller accounts" },
          { status: 400 }
        );
      }
    }

    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true },
    });

    if (!district) {
      return NextResponse.json(
        { message: "Selected district was not found" },
        { status: 400 }
      );
    }

    let hub = null as { id: string } | null;
    if (role === "seller") {
      if (!hubId) {
        return NextResponse.json(
          { message: "Hub is required for seller accounts" },
          { status: 400 }
        );
      }

      hub = await prisma.hub.findUnique({
        where: { id: hubId },
        select: { id: true },
      });

      if (!hub) {
        return NextResponse.json(
          { message: "Selected hub was not found" },
          { status: 400 }
        );
      }
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (email) {
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        return NextResponse.json(
          { message: "An account with this email already exists" },
          { status: 409 }
        );
      }
    }

    if (phone) {
      const existingByPhone = await prisma.user.findFirst({ where: { phone } });
      if (existingByPhone) {
        return NextResponse.json(
          { message: "An account with this mobile number already exists" },
          { status: 409 }
        );
      }
    }

    const storedEmail = email || buildPhoneAuthEmail(phone);
    if (!storedEmail) {
      return NextResponse.json(
        { message: "Unable to create account without a valid email or mobile number" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email: storedEmail,
        phone: phone || null,
        districtId: district.id,
        hubId: hub?.id ?? null,
        passwordHash,
        status: "PENDING_APPROVAL",
        businessName: name,
        ownerName: role === "seller" ? ownerName : null,
        tradeLicense: role === "seller" ? tradeLicense : null,
        address: address || null,
        userRoles: {
          create: { role },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Registration submitted. Your account is pending admin approval. You will be notified once approved.",
        pending: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
