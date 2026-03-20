import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const districts = await prisma.district.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({ districts });
  } catch (error) {
    console.error("[districts GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
