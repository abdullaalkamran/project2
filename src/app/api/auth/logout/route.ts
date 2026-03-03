import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out successfully" });
  clearSessionCookie(res);
  return res;
}
