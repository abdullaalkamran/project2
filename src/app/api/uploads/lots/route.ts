import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "@/lib/session";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extFromFile(file: File): string {
  const byName = path.extname(file.name).toLowerCase();
  if (byName === ".jpg" || byName === ".jpeg" || byName === ".png" || byName === ".webp") {
    return byName;
  }

  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const photos = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (photos.length === 0) {
      return NextResponse.json({ message: "No photos uploaded" }, { status: 400 });
    }

    if (photos.length > 8) {
      return NextResponse.json({ message: "You can upload up to 8 photos" }, { status: 400 });
    }

    for (const photo of photos) {
      if (!ALLOWED_TYPES.has(photo.type)) {
        return NextResponse.json({ message: "Only JPG, PNG, and WEBP images are allowed" }, { status: 400 });
      }
      if (photo.size > MAX_PHOTO_SIZE) {
        return NextResponse.json({ message: "Each photo must be 5MB or smaller" }, { status: 400 });
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "lots");
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const photo of photos) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const fileExt = extFromFile(photo);
      const safeStem = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const fileName = `${safeStem}${fileExt}`;
      const absolutePath = path.join(uploadDir, fileName);
      await writeFile(absolutePath, buffer);
      urls.push(`/uploads/lots/${fileName}`);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    console.error("[uploads/lots POST]", error);
    return NextResponse.json({ message: "Upload failed" }, { status: 500 });
  }
}
