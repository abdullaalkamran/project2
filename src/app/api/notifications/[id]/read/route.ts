import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// PATCH /api/notifications/[id]/read  → mark single notification as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
