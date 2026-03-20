import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { verifyGoogleCredential } from "@/lib/google-auth";
import {
  getPublicEmail,
  isValidBangladeshMobileNumber,
  normalizeBangladeshPhone,
} from "@/lib/auth-identifiers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const credential = typeof body?.credential === "string" ? body.credential : "";
    const mode = typeof body?.mode === "string" ? body.mode.toLowerCase() : "";
    const role = typeof body?.role === "string" ? body.role.toLowerCase() : "";
    const company = typeof body?.company === "string" ? body.company.trim() : "";
    const phone = normalizeBangladeshPhone(body?.phone);
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const districtId = typeof body?.districtId === "string" ? body.districtId.trim() : "";
    const hubId = typeof body?.hubId === "string" ? body.hubId.trim() : "";
    const ownerName = typeof body?.ownerName === "string" ? body.ownerName.trim() : "";
    const tradeLicense = typeof body?.tradeLicense === "string" ? body.tradeLicense.trim() : "";

    if (!credential || !["login", "register"].includes(mode)) {
      return NextResponse.json({ message: "Invalid Google authentication request" }, { status: 400 });
    }

    const identity = await verifyGoogleCredential(credential);
    if (!identity.emailVerified) {
      return NextResponse.json({ message: "Your Google email is not verified" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: identity.email },
      include: { userRoles: true },
    });

    let user = existing;

    if (mode === "register") {
      if (!["buyer", "seller"].includes(role)) {
        return NextResponse.json({ message: "Only buyer and seller accounts can be created here" }, { status: 400 });
      }

      if (phone && !isValidBangladeshMobileNumber(phone)) {
        return NextResponse.json({ message: "Enter a valid Bangladeshi mobile number" }, { status: 400 });
      }

      if (!districtId) {
        return NextResponse.json({ message: "District is required" }, { status: 400 });
      }

      if (address && address.length < 3) {
        return NextResponse.json({ message: "Address must be at least 3 characters" }, { status: 400 });
      }

      if (role === "seller") {
        if (!hubId) {
          return NextResponse.json(
            { message: "Hub is required for seller accounts" },
            { status: 400 }
          );
        }

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

      if (existing) {
        return NextResponse.json(
          { message: "An account with this Google email already exists. Please sign in instead." },
          { status: 409 }
        );
      }

      const district = await prisma.district.findUnique({
        where: { id: districtId },
        select: { id: true },
      });

      if (!district) {
        return NextResponse.json({ message: "Selected district was not found" }, { status: 400 });
      }

      let hub = null as { id: string } | null;
      if (role === "seller") {
        hub = await prisma.hub.findUnique({
          where: { id: hubId },
          select: { id: true },
        });
        if (!hub) {
          return NextResponse.json({ message: "Selected hub was not found" }, { status: 400 });
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

      const passwordHash = await bcrypt.hash(randomUUID(), 12);

      user = await prisma.user.create({
        data: {
          name: company || identity.name,
          email: identity.email,
          passwordHash,
          phone: phone || null,
          districtId: district.id,
          hubId: hub?.id ?? null,
          photo: identity.picture,
          businessName: company || identity.name,
          ownerName: role === "seller" ? ownerName : null,
          tradeLicense: role === "seller" ? tradeLicense : null,
          address: address || null,
          userRoles: {
            create: { role },
          },
        },
        include: { userRoles: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { message: "No account found for this Google email. Create an account first." },
        { status: 404 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { message: "Your account has been suspended. Contact support." },
        { status: 403 }
      );
    }

    const roles = user.userRoles.map((r) => r.role.toLowerCase());
    if (roles.length === 0) {
      return NextResponse.json(
        { message: "No roles assigned to your account yet. Please contact an admin." },
        { status: 403 }
      );
    }

    const activeRole = roles.includes("admin") ? "admin" : roles[0];

    const res = NextResponse.json(
      {
        message: mode === "register" ? "Account created successfully" : "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: getPublicEmail(user.email),
          phone: user.phone ?? null,
          districtId: user.districtId ?? null,
          roles,
          activeRole,
        },
      },
      { status: mode === "register" ? 201 : 200 }
    );

    await setSessionCookie(res, {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles,
      activeRole,
    });

    return res;
  } catch (error) {
    console.error("[google auth]", error);
    return NextResponse.json({ message: "Google authentication failed" }, { status: 500 });
  }
}
