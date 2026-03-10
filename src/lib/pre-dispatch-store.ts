import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PreDispatchCheck = {
  orderCode: string;
  // Step 1: physical arrival (hub_manager)
  physicallyReceived: boolean;
  // Step 2: weight & quality check (hub_manager / qc_leader / qc_checker)
  qualityChecked: boolean;
  packetQty: number;
  grossWeightKg: number;        // actual confirmed weight (editable, may differ from ordered)
  // Step 3: truck price (qc_leader)
  truckPriceBDT: number;
  // Step 4: QC leader confirmation (qc_leader)
  qcLeadConfirmed: boolean;
  // Step 5: manager final confirmation (hub_manager)
  hubManagerConfirmed: boolean;
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
  // Ensure backward compat: migrate old records missing truckPriceBDT
  const normalized: PreDispatchCheck = { ...row, truckPriceBDT: row.truckPriceBDT ?? 0 };
  const next = [normalized, ...all.filter((r) => r.orderCode !== normalized.orderCode)];
  await writePreDispatchChecks(next);
  return normalized;
}
