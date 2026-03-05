import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAssignedHubs } from "@/lib/hub-assignments";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hubs = await getAssignedHubs(session.userId, "delivery_hub_manager");
  return NextResponse.json({ hubs });
}
