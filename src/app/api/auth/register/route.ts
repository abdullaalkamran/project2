import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        userRoles: {
          create: { role: "buyer" },
        },
      },
      include: { userRoles: true },
    });

    const roles = user.userRoles.map((r) => r.role);
    const activeRole = roles[0];

    const res = NextResponse.json(
      {
        message: "Account created successfully",
        user: { id: user.id, name: user.name, email: user.email, roles, activeRole },
      },
      { status: 201 }
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
    console.error("[register]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
