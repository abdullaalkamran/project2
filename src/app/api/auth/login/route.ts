import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { getPublicEmail, parseAuthIdentifier } from "@/lib/auth-identifiers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier =
      typeof body?.identifier === "string"
        ? body.identifier
        : typeof body?.email === "string"
          ? body.email
          : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const identifier = parseAuthIdentifier(rawIdentifier);

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Email or mobile number and password are required" },
        { status: 400 }
      );
    }

    const user =
      identifier.type === "email"
        ? await prisma.user.findUnique({
            where: { email: identifier.email },
            include: { userRoles: true },
          })
        : null;

    const phoneMatches =
      identifier.type === "phone"
        ? await prisma.user.findMany({
            where: { phone: identifier.phone },
            include: { userRoles: true },
            take: 2,
          })
        : [];

    if (phoneMatches.length > 1) {
      return NextResponse.json(
        { message: "This mobile number is linked to multiple accounts. Please contact support." },
        { status: 409 }
      );
    }

    const resolvedUser = user ?? phoneMatches[0];

    if (!resolvedUser) {
      return NextResponse.json(
        { message: "Invalid email/mobile number or password" },
        { status: 401 }
      );
    }

    if (resolvedUser.status === "PENDING_APPROVAL") {
      return NextResponse.json(
        { message: "Your account is pending admin approval. Please wait for activation." },
        { status: 403 }
      );
    }

    if (resolvedUser.status === "SUSPENDED") {
      return NextResponse.json(
        { message: "Your account has been suspended. Contact support." },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, resolvedUser.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid email/mobile number or password" },
        { status: 401 }
      );
    }

    const roles = resolvedUser.userRoles.map((r) => r.role.toLowerCase());

    if (roles.length === 0) {
      return NextResponse.json(
        { message: "No roles assigned to your account yet. Please contact an admin." },
        { status: 403 }
      );
    }

    const activeRole = roles.includes("admin") ? "admin" : roles[0];

    const res = NextResponse.json({
      message: "Login successful",
      user: {
        id: resolvedUser.id,
        name: resolvedUser.name,
        email: getPublicEmail(resolvedUser.email),
        phone: resolvedUser.phone ?? null,
        roles,
        activeRole,
      },
    });

    await setSessionCookie(res, {
      userId: resolvedUser.id,
      email: resolvedUser.email,
      name: resolvedUser.name,
      roles,
      activeRole,
    });

    return res;
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
