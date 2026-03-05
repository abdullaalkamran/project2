import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PreDispatchCheck = {
  orderCode: string;
  physicallyReceived: boolean;
  hubManagerConfirmed: boolean;
  qcLeadConfirmed: boolean;
  qualityChecked: boolean;
  packetQty: number;
  grossWeightKg: number;
  updatedAt: string;
  updatedBy: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "pre-dispatch-checks.json");

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, "[]", "utf8");
  }
}

export async function readPreDispatchChecks(): Promise<PreDispatchCheck[]> {
  await ensureFile();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PreDispatchCheck[]) : [];
  } catch {
    return [];
  }
}

export async function writePreDispatchChecks(rows: PreDispatchCheck[]): Promise<void> {
  await ensureFile();
  await writeFile(STORE_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function getPreDispatchCheck(orderCode: string): Promise<PreDispatchCheck | null> {
  const all = await readPreDispatchChecks();
  return all.find((r) => r.orderCode === orderCode.toUpperCase()) ?? null;
}

export async function upsertPreDispatchCheck(row: PreDispatchCheck): Promise<PreDispatchCheck> {
  const all = await readPreDispatchChecks();
  const next = [row, ...all.filter((r) => r.orderCode !== row.orderCode)];
  await writePreDispatchChecks(next);
  return row;
}
