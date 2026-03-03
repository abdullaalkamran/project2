import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getSessionUser } from "@/lib/session";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

const DEFAULT_SETTINGS = {
  buyerFee: 2.5,
  sellerFee: 5,
  minIncrement: 100,
  payoutDays: 7,
  manualPayout: false,
  kyc: true,
  emailNotif: true,
  smsNotif: true,
  maintenanceMode: false,
};

async function loadSettings() {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function GET() {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await loadSettings());
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  const activeRole = (session?.activeRole || "").toLowerCase();
  if (!session || activeRole !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const merged = { ...(await loadSettings()), ...body };
  await writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2));
  return NextResponse.json({ ok: true });
}
