import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  isValidBangladeshMobileNumber,
  normalizeBangladeshPhone,
  normalizeEmail,
} from "@/lib/auth-identifiers";

async function requireAdmin() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: { userRoles: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        photo: u.photo ?? null,
        status: u.status,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        roles: u.userRoles.map((r) => r.role),
      }))
    );
  } catch (error) {
    console.error("[admin/users GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, email, password, phone, roles } = await req.json() as {
      name?: string; email?: string; password?: string;
      phone?: string; roles?: string[];
    };
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizeBangladeshPhone(phone);

    if (!name?.trim() || !normalizedEmail || !password) {
      return NextResponse.json({ message: "Name, email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (normalizedPhone && !isValidBangladeshMobileNumber(normalizedPhone)) {
      return NextResponse.json({ message: "Enter a valid Bangladeshi mobile number" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 });
    }

    if (normalizedPhone) {
      const existingByPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
      if (existingByPhone) {
        return NextResponse.json({ message: "Mobile number already in use" }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone || null,
        status: "ACTIVE",
        userRoles: roles?.length
          ? { create: roles.map((role) => ({ role })) }
          : undefined,
      },
      include: { userRoles: true },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: null,
      status: user.status,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      roles: user.userRoles.map((r) => r.role),
    }, { status: 201 });
  } catch (error) {
    console.error("[admin/users POST]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
