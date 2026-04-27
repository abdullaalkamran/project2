import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireApiSession } from "@/lib/api-auth";

const ALLOWED_CATEGORIES = new Set(["lots", "cms", "profiles", "misc"]);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedCategory = (formData.get("category") as string | null) ?? "misc";
    const category = ALLOWED_CATEGORIES.has(requestedCategory) ? requestedCategory : "misc";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const allowedImages = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];
    const allowedVideos = ["mp4", "mov", "webm", "avi", "mkv", "3gp"];
    const isVideo = allowedVideos.includes(ext) || file.type.startsWith("video/");
    const isImage = allowedImages.includes(ext) || file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const MAX_SIZE = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100 MB video, 5 MB image
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large (max ${isVideo ? "100" : "5"} MB)` }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", category);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.${ext}`;
    const filepath = path.join(dir, filename);
    const buffer   = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/${category}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
