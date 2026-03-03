import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type LotMediaRecord = {
  lotId: string;
  sellerPhotoUrls: string[];
  qcPhotoUrls?: string[];
  marketplacePhotoUrl?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "lot-media.json");

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, "[]", "utf8");
  }
}

export async function readLotMedia(): Promise<LotMediaRecord[]> {
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LotMediaRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeLotMedia(rows: LotMediaRecord[]): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function upsertLotSellerPhotos(lotId: string, sellerPhotoUrls: string[]): Promise<void> {
  const rows = await readLotMedia();
  const existing = rows.find((r) => r.lotId === lotId);
  const next = [
    { lotId, sellerPhotoUrls, marketplacePhotoUrl: existing?.marketplacePhotoUrl },
    ...rows.filter((r) => r.lotId !== lotId),
  ];
  await writeLotMedia(next);
}

export async function getLotSellerPhotos(lotId: string): Promise<string[]> {
  const rows = await readLotMedia();
  return rows.find((r) => r.lotId === lotId)?.sellerPhotoUrls ?? [];
}

export async function upsertLotQCPhotos(lotId: string, qcPhotoUrls: string[]): Promise<void> {
  const rows = await readLotMedia();
  const existing = rows.find((r) => r.lotId === lotId);
  const next = [
    {
      lotId,
      sellerPhotoUrls: existing?.sellerPhotoUrls ?? [],
      qcPhotoUrls,
      marketplacePhotoUrl: existing?.marketplacePhotoUrl,
    },
    ...rows.filter((r) => r.lotId !== lotId),
  ];
  await writeLotMedia(next);
}

export async function setLotMarketplacePhoto(lotId: string, marketplacePhotoUrl: string): Promise<void> {
  const rows = await readLotMedia();
  const existing = rows.find((r) => r.lotId === lotId);
  const next = [
    {
      lotId,
      sellerPhotoUrls: existing?.sellerPhotoUrls ?? [],
      marketplacePhotoUrl,
    },
    ...rows.filter((r) => r.lotId !== lotId),
  ];
  await writeLotMedia(next);
}

export async function getLotMarketplacePhoto(lotId: string): Promise<string | null> {
  const rows = await readLotMedia();
  return rows.find((r) => r.lotId === lotId)?.marketplacePhotoUrl ?? null;
}
