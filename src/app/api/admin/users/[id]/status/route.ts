import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    const activeRole = (session?.activeRole || "").toLowerCase();
    if (!session || activeRole !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["ACTIVE", "SUSPENDED", "PENDING", "PENDING_APPROVAL", "REJECTED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ id: user.id, status: user.status });
  } catch (error) {
    console.error("[admin/users/status PATCH]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
