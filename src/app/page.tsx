import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import HomeClient from "./HomeClient";
import type { CMSContent } from "@/lib/cms";
import { DEFAULT_CMS } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Paikari — Agricultural Auction Platform",
  description: "Buy and sell agricultural goods through live auctions on Paikari.",
};

function loadCMS(): CMSContent {
  try {
    const filePath = path.join(process.cwd(), "data", "cms-content.json");
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as CMSContent;
  } catch {
    return DEFAULT_CMS;
  }
}

export default function Page() {
  const cms = loadCMS();
  return <HomeClient cms={cms} />;
}
