import fs from "fs";
import path from "path";
import type { ProductFlowData } from "@/lib/product-flow";

const DATA_PATH = path.join(process.cwd(), "data", "product-flow.json");

const EMPTY_DATA: ProductFlowData = { lots: [], orders: [] };

export function readProductFlow(): ProductFlowData {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProductFlowData;
    return {
      lots: Array.isArray(parsed.lots) ? parsed.lots : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return EMPTY_DATA;
  }
}

export function writeProductFlow(data: ProductFlowData) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

