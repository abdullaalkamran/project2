import { NextRequest, NextResponse } from "next/server";
import { readLotOptions, writeLotOptions } from "@/lib/lot-options";
import type { LotOptions } from "@/lib/lot-options";

/** GET /api/cms/lot-options — returns all dropdown option lists */
export async function GET() {
  return NextResponse.json(readLotOptions());
}

/** POST /api/cms/lot-options — full replace (from admin "Save all") */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LotOptions;
    writeLotOptions({
      productNames: Array.isArray(body.productNames) ? body.productNames : [],
      categories:   Array.isArray(body.categories)   ? body.categories   : [],
      storageTypes:  Array.isArray(body.storageTypes)  ? body.storageTypes  : [],
      baggageTypes:  Array.isArray(body.baggageTypes)  ? body.baggageTypes  : [],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * PATCH /api/cms/lot-options
 * Body: { field: keyof LotOptions, action: "add" | "delete", value: string | string[] }
 * Allows granular add/delete without sending the whole list.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      field: keyof LotOptions;
      action: "add" | "delete";
      value: string | string[];
    };
    const options = readLotOptions();
    const list = options[body.field];

    if (body.action === "add") {
      const incoming = Array.isArray(body.value) ? body.value : [body.value];
      const trimmed = incoming.map((v) => v.trim()).filter(Boolean);
      const merged = Array.from(new Set([...list, ...trimmed]));
      options[body.field] = merged;
    } else if (body.action === "delete") {
      const toRemove = Array.isArray(body.value) ? body.value : [body.value];
      options[body.field] = list.filter((v) => !toRemove.includes(v));
    }

    writeLotOptions(options);
    return NextResponse.json({ ok: true, data: options[body.field] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
