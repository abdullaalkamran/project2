import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CMSContent } from "@/lib/cms";
import { DEFAULT_CMS } from "@/lib/cms";

const DATA_PATH = path.join(process.cwd(), "data", "cms-content.json");

function readCMS(): CMSContent {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as CMSContent;
  } catch {
    return DEFAULT_CMS;
  }
}

export async function GET() {
  return NextResponse.json(readCMS());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CMSContent;
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
