import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import type { JWTPayload } from "@/lib/jwt";

type ApiAuthResult =
  | { session: JWTPayload; response: null }
  | { session: null; response: NextResponse };

export async function requireApiSession(): Promise<ApiAuthResult> {
  const session = await getSessionUser();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, response: null };
}

export async function requireApiRole(allowedRoles: string[]): Promise<ApiAuthResult> {
  const auth = await requireApiSession();
  if (!auth.session) return auth;

  const activeRole = auth.session.activeRole.toLowerCase();
  const normalizedRoles = allowedRoles.map((role) => role.toLowerCase());

  if (!normalizedRoles.includes(activeRole)) {
    return {
      session: null,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}
