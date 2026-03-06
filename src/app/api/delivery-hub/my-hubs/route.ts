import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAllAssignedHubs } from "@/lib/hub-assignments";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hubsWithRoles = await getAllAssignedHubs(session.userId);

  const hubs = hubsWithRoles.map(({ hub, roles }) => ({
    id: hub.id,
    name: hub.name,
    location: hub.location,
    type: hub.type,
    roles,
  }));

  return NextResponse.json({ hubs });
}
