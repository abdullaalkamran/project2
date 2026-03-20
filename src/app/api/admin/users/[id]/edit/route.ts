import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  isValidBangladeshMobileNumber,
  normalizeBangladeshPhone,
} from "@/lib/auth-identifiers";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { name, phone } = body as { name?: string; phone?: string | null };
  const normalizedPhone = normalizeBangladeshPhone(phone);

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ message: "Name must be at least 2 characters" }, { status: 400 });
  }

  if (normalizedPhone && !isValidBangladeshMobileNumber(normalizedPhone)) {
    return NextResponse.json({ message: "Enter a valid Bangladeshi mobile number" }, { status: 400 });
  }

  if (normalizedPhone) {
    const existing = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: "Mobile number already in use" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: name.trim(),
      phone: normalizedPhone || null,
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone ?? null,
  });
}
