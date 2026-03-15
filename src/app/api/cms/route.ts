import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CMSContent } from "@/lib/cms";
import { DEFAULT_CMS } from "@/lib/cms";

const DATA_PATH = path.join(process.cwd(), "data", "cms-content.json");

function readCMS(): CMSContent {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Partial<CMSContent>;
    // Deep-merge so newly added CMS sections always have defaults
    return {
      hero:               { ...DEFAULT_CMS.hero,               ...(saved.hero ?? {}) },
      liveAuctions:       { ...DEFAULT_CMS.liveAuctions,       ...(saved.liveAuctions ?? {}) },
      categories:         { ...DEFAULT_CMS.categories,         ...(saved.categories ?? {}) },
      whyPaikari:         { ...DEFAULT_CMS.whyPaikari,         ...(saved.whyPaikari ?? {}) },
      newsletter:         { ...DEFAULT_CMS.newsletter,         ...(saved.newsletter ?? {}) },
      marketplaceBanner:  { ...DEFAULT_CMS.marketplaceBanner,  ...(saved.marketplaceBanner ?? {}) },
    };
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
