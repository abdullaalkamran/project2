import { NextRequest, NextResponse } from "next/server";
import { readLotOptions, writeLotOptions } from "@/lib/lot-options";
import type { LotOptions } from "@/lib/lot-options";
import { requireApiRole } from "@/lib/api-auth";

const LOT_FIELDS: (keyof LotOptions)[] = [
  "productNames",
  "categories",
  "storageTypes",
  "baggageTypes",
];

function normalizeList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

/** GET /api/cms/lot-options — returns all dropdown option lists */
export async function GET() {
  return NextResponse.json(readLotOptions());
}

/** POST /api/cms/lot-options — full replace (from admin "Save all") */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiRole(["admin"]);
    if (auth.response) return auth.response;

    const body = (await req.json()) as Partial<LotOptions>;
    writeLotOptions({
      productNames: normalizeList(body.productNames),
      categories: normalizeList(body.categories),
      storageTypes: normalizeList(body.storageTypes),
      baggageTypes: normalizeList(body.baggageTypes),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

/**
 * PATCH /api/cms/lot-options
 * Body: { field: keyof LotOptions, action: "add" | "delete", value: string | string[] }
 * Allows granular add/delete without sending the whole list.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireApiRole(["admin"]);
    if (auth.response) return auth.response;

    const body = (await req.json()) as {
      field?: keyof LotOptions;
      action?: "add" | "delete";
      value?: string | string[];
    };
    if (!body.field || !LOT_FIELDS.includes(body.field)) {
      return NextResponse.json({ ok: false, message: "Invalid field" }, { status: 400 });
    }
    if (!body.action || (body.action !== "add" && body.action !== "delete")) {
      return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
    }
    if (typeof body.value !== "string" && !Array.isArray(body.value)) {
      return NextResponse.json({ ok: false, message: "Invalid value" }, { status: 400 });
    }

    const options = readLotOptions();
    const list = options[body.field] ?? [];

    if (body.action === "add") {
      const incoming = Array.isArray(body.value) ? body.value : [body.value];
      const trimmed = incoming
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      const merged = Array.from(new Set([...list, ...trimmed]));
      options[body.field] = merged;
    } else if (body.action === "delete") {
      const toRemove = Array.isArray(body.value) ? body.value : [body.value];
      const cleanRemove = toRemove.filter((v): v is string => typeof v === "string");
      options[body.field] = list.filter((v) => !cleanRemove.includes(v));
    }

    writeLotOptions(options);
    return NextResponse.json({ ok: true, data: options[body.field] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
