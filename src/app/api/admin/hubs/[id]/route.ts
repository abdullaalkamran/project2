import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session || session.activeRole?.toLowerCase() !== "admin") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, location, type, isActive } = await req.json() as {
    name?: string; location?: string; type?: string; isActive?: boolean;
  };

  const hub = await prisma.hub.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(location !== undefined && { location: location.trim() }),
      ...(type !== undefined && { type }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ hub });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.hub.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
