import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signToken, JWTPayload } from "./jwt";

export const COOKIE_NAME = "paikari_session";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// For use in Route Handlers
export async function getSessionUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// For use in middleware (Edge runtime) - reads from NextRequest
export async function getSessionFromRequest(
  req: NextRequest
): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Sets session cookie on a NextResponse
export async function setSessionCookie(
  res: NextResponse,
  payload: JWTPayload
): Promise<void> {
  const token = await signToken(payload);
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
