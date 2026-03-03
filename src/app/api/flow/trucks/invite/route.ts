import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { email?: string; phone?: string; note?: string };

  const token     = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.truckInvite.create({
    data: {
      token,
      email:     body.email  ?? null,
      phone:     body.phone  ?? null,
      note:      body.note   ?? null,
      createdBy: user.name ?? user.email,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const link    = `${baseUrl}/register-truck?token=${token}`;

  return NextResponse.json({ token, link, expiresAt: expiresAt.toISOString() });
}

export async function GET() {
  const invites = await prisma.truckInvite.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites);
}
