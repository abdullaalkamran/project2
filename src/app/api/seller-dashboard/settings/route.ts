import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import bcrypt from "bcryptjs";
import {
  buildPhoneAuthEmail,
  getPublicEmail,
  isValidBangladeshMobileNumber,
  isValidEmailAddress,
  normalizeBangladeshPhone,
  normalizeEmail,
} from "@/lib/auth-identifiers";

// GET — load seller profile, bank details
export async function GET() {
  try {
    const session = await getSessionUser();
    const role = (session?.activeRole || "").toLowerCase();
    if (!session || role !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      phone: true,
      businessName: true,
      ownerName: true,
      address: true,
      nid: true,
      tradeLicense: true,
      bankName: true,
      accountName: true,
      accountNumber: true,
      routingNumber: true,
      mobileBanking: true,
      mobileNumber: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      businessName: user.businessName || user.name || "",
      ownerName: user.ownerName || user.name || "",
      email: getPublicEmail(user.email) || "",
      phone: user.phone || "",
      address: user.address || "",
      nid: user.nid || "",
      tradeLicense: user.tradeLicense || "",
    },
    bank: {
      bankName: user.bankName || "",
      accountName: user.accountName || "",
      accountNumber: user.accountNumber || "",
      routingNumber: user.routingNumber || "",
      mobileBanking: user.mobileBanking || "",
      mobileNumber: user.mobileNumber || "",
    },
  });
  } catch (err) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update profile, bank, or password
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const role = (session?.activeRole || "").toLowerCase();
    if (!session || role !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

  const body = await req.json();
  const { section } = body; // "profile" | "bank" | "password"

  if (section === "profile") {
    const businessName = typeof body?.businessName === "string" ? body.businessName.trim() : "";
    const ownerName = typeof body?.ownerName === "string" ? body.ownerName.trim() : "";
    const email = normalizeEmail(body?.email);
    const phone = normalizeBangladeshPhone(body?.phone);
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const nid = typeof body?.nid === "string" ? body.nid.trim() : "";
    const tradeLicense = typeof body?.tradeLicense === "string" ? body.tradeLicense.trim() : "";

    if (!email && !phone) {
      return NextResponse.json({ message: "Use email or mobile number" }, { status: 400 });
    }

    if (email && !isValidEmailAddress(email)) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    if (phone && !isValidBangladeshMobileNumber(phone)) {
      return NextResponse.json({ message: "Enter a valid Bangladeshi mobile number" }, { status: 400 });
    }

    if (email) {
      const existingByEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: session.userId },
        },
        select: { id: true },
      });

      if (existingByEmail) {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 });
      }
    }

    if (phone) {
      const existingByPhone = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: session.userId },
        },
        select: { id: true },
      });

      if (existingByPhone) {
        return NextResponse.json({ message: "Mobile number already in use" }, { status: 409 });
      }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        businessName: businessName || null,
        ownerName: ownerName || null,
        email: email || buildPhoneAuthEmail(phone),
        phone: phone || null,
        address: address || null,
        nid: nid || null,
        tradeLicense: tradeLicense || null,
      },
    });
    return NextResponse.json({ success: true, message: "Profile updated" });
  }

  if (section === "bank") {
    const { bankName, accountName, accountNumber, routingNumber, mobileBanking, mobileNumber } = body;
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        bankName: bankName || null,
        accountName: accountName || null,
        accountNumber: accountNumber || null,
        routingNumber: routingNumber || null,
        mobileBanking: mobileBanking || null,
        mobileNumber: mobileNumber || null,
      },
    });
    return NextResponse.json({ success: true, message: "Bank details updated" });
  }

  if (section === "password") {
    const { current, password } = body;
    if (!current || !password) {
      return NextResponse.json({ message: "Current and new passwords are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(current, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: hash },
    });
    return NextResponse.json({ success: true, message: "Password updated" });
  }

  return NextResponse.json({ message: "Invalid section" }, { status: 400 });
  } catch (err) {
    console.error("Settings PATCH error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
