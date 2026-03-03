import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { QCPendingApprovalRecord } from "@/lib/qc-approvals";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "qc-approvals.json");

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, "[]", "utf8");
  }
}

export async function readApprovals(): Promise<QCPendingApprovalRecord[]> {
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QCPendingApprovalRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeApprovals(rows: QCPendingApprovalRecord[]): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(rows, null, 2), "utf8");
}

