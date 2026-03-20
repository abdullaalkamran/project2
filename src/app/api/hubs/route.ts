import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hubs = await prisma.hub.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        type: true,
      },
    });

    return NextResponse.json({ hubs });
  } catch (error) {
    console.error("[hubs GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
