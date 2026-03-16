import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session || session.activeRole !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDING | APPROVED | REJECTED | ALL

  const requests = await prisma.depositRequest.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
    orderBy: { requestedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(requests);
}
