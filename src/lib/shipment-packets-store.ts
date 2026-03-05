import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ShipmentPacketManifest = {
  orderCode: string;
  totalPackets: number;
  packetCodes: string[];
  scannedCodes: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "shipment-packets.json");

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, "[]", "utf8");
  }
}

export async function readShipmentPacketManifests(): Promise<ShipmentPacketManifest[]> {
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShipmentPacketManifest[]) : [];
  } catch {
    return [];
  }
}

export async function writeShipmentPacketManifests(rows: ShipmentPacketManifest[]): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function upsertShipmentPacketManifest(
  manifest: ShipmentPacketManifest,
): Promise<ShipmentPacketManifest> {
  const all = await readShipmentPacketManifests();
  const next = [manifest, ...all.filter((m) => m.orderCode !== manifest.orderCode)];
  await writeShipmentPacketManifests(next);
  return manifest;
}

export async function getShipmentPacketManifest(
  orderCode: string,
): Promise<ShipmentPacketManifest | null> {
  const all = await readShipmentPacketManifests();
  return all.find((m) => m.orderCode === orderCode.toUpperCase()) ?? null;
}
