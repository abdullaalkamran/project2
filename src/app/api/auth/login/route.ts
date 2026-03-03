import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { message: "Your account has been suspended. Contact support." },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
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

    const res = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
        activeRole,
      },
    });

    await setSessionCookie(res, {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles,
      activeRole,
    });

    return res;
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
