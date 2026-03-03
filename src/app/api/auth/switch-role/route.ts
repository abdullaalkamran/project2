import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const role = typeof body?.role === "string" ? body.role.toLowerCase() : "";

    if (!role) {
      return NextResponse.json({ message: "Role is required" }, { status: 400 });
    }

    const sessionRoles = (session.roles || []).map((r) => r.toLowerCase());

    if (!sessionRoles.includes(role)) {
      return NextResponse.json(
        { message: "You do not have this role assigned" },
        { status: 403 }
      );
    }

    const newPayload = { ...session, roles: sessionRoles, activeRole: role };
    const res = NextResponse.json({ activeRole: role, message: "Role switched" });
    await setSessionCookie(res, newPayload);

    return res;
  } catch (error) {
    console.error("[switch-role]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
