"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  ListChecks,
  Tag,
  Box,
  Thermometer,
  Package,
} from "lucide-react";
import type { LotOptions } from "@/lib/lot-options";

/* ─── types ─── */
type FieldKey = keyof LotOptions;
type Status = "idle" | "saving" | "saved" | "error";

/* ─── config ─── */
const FIELD_CONFIG: {
  key: FieldKey;
  label: string;
  icon: React.ElementType;
  hint: string;
  color: string;
}[] = [
  {
    key: "productNames",
    label: "Product Names",
    icon: Tag,
    hint: "Names shown in the product dropdown when creating a lot.",
    color: "emerald",
  },
  {
    key: "categories",
    label: "Product Categories",
    icon: ListChecks,
    hint: "Category filter used on lots, QC forms, and marketplace.",
    color: "blue",
  },
  {
    key: "storageTypes",
    label: "Storage Types",
    icon: Thermometer,
    hint: "Describes how the product is stored at the seller's facility.",
    color: "violet",
  },
  {
    key: "baggageTypes",
    label: "Baggage / Packaging Types",
    icon: Package,
    hint: "Packaging format used for this lot.",
    color: "orange",
  },
];

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  blue:    "bg-blue-50 border-blue-200 text-blue-700",
  violet:  "bg-violet-50 border-violet-200 text-violet-700",
  orange:  "bg-orange-50 border-orange-200 text-orange-700",
};
const ICON_BG: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-600",
  blue:    "bg-blue-100 text-blue-600",
  violet:  "bg-violet-100 text-violet-600",
  orange:  "bg-orange-100 text-orange-600",
};

/* ─── FieldSection ─── */
function FieldSection({
  fieldKey,
  label,
  icon: Icon,
  hint,
  color,
  items,
  onAdd,
  onBulkAdd,
  onDelete,
  saving,
}: {
  fieldKey: FieldKey;
  label: string;
  icon: React.ElementType;
  hint: string;
  color: string;
  items: string[];
  onAdd: (key: FieldKey, value: string) => void;
  onBulkAdd: (key: FieldKey, raw: string) => void;
  onDelete: (key: FieldKey, value: string) => void;
  saving: boolean;
}) {
  const [single, setSingle]     = useState("");
  const [bulk, setBulk]         = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [filter, setFilter]     = useState("");

  const filtered = filter
    ? items.filter((i) => i.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100`}>
        <div className={`rounded-xl p-2.5 ${ICON_BG[color]}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-800">{label}</h2>
          <p className="text-xs text-slate-400 truncate">{hint}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${COLOR_MAP[color]}`}>
          {items.length} items
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Search / filter */}
        {items.length > 8 && (
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        )}

        {/* Item chips */}
        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              {filter ? "No matches found." : "No items yet. Add some below."}
            </p>
          ) : (
            filtered.map((item) => (
              <span
                key={item}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${COLOR_MAP[color]}`}
              >
                {item}
                <button
                  type="button"
                  onClick={() => onDelete(fieldKey, item)}
                  disabled={saving}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 hover:text-red-600 transition disabled:opacity-40"
                  title={`Remove "${item}"`}
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Single add */}
        <div className="flex gap-2">
          <input
            type="text"
            value={single}
            onChange={(e) => setSingle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && single.trim()) {
                onAdd(fieldKey, single.trim());
                setSingle("");
              }
            }}
            placeholder={`Add a new ${label.toLowerCase().replace(/s$/, "")}…`}
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            disabled={saving}
          />
          <button
            type="button"
            onClick={() => {
              if (single.trim()) { onAdd(fieldKey, single.trim()); setSingle(""); }
            }}
            disabled={saving || !single.trim()}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Bulk add toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowBulk((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <Upload size={12} />
            Bulk add
            {showBulk ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showBulk && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-slate-400">
                Enter one item per line, or separate with commas. Duplicates are automatically ignored.
              </p>
              <textarea
                rows={5}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={`e.g.\nTomato\nBroccoli\nCarrot`}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setBulk(""); setShowBulk(false); }}
                  className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (bulk.trim()) {
                      onBulkAdd(fieldKey, bulk);
                      setBulk("");
                      setShowBulk(false);
                    }
                  }}
                  disabled={saving || !bulk.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-40"
                >
                  <Check size={12} /> Add all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── main page ─── */
export default function LotOptionsPage() {
  const [options, setOptions] = useState<LotOptions>({
    productNames: [],
    categories: [],
    storageTypes: [],
    baggageTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState<Status>("idle");

  /* fetch */
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cms/lot-options");
      const data = (await res.json()) as LotOptions;
      setOptions(data);
    } catch {
      toast.error("Failed to load lot options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchOptions(); }, [fetchOptions]);

  /* granular patch helper */
  const patch = useCallback(
    async (field: FieldKey, action: "add" | "delete", value: string | string[]) => {
      setStatus("saving");
      try {
        const res = await fetch("/api/cms/lot-options", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, action, value }),
        });
        const data = (await res.json()) as { ok: boolean; data?: string[] };
        if (data.ok && data.data) {
          setOptions((prev) => ({ ...prev, [field]: data.data! }));
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
        toast.error("Save failed");
      }
    },
    []
  );

  const handleAdd = useCallback(
    (key: FieldKey, value: string) => {
      if (options[key].includes(value)) {
        toast.info(`"${value}" is already in the list`);
        return;
      }
      void patch(key, "add", value);
    },
    [options, patch]
  );

  const handleBulkAdd = useCallback(
    (key: FieldKey, raw: string) => {
      const values = raw
        .split(/[\n,]+/)
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length === 0) return;
      const newItems = values.filter((v) => !options[key].includes(v));
      if (newItems.length === 0) {
        toast.info("All items already exist in the list.");
        return;
      }
      void patch(key, "add", values);
      toast.success(`${newItems.length} item(s) added`);
    },
    [options, patch]
  );

  const handleDelete = useCallback(
    (key: FieldKey, value: string) => {
      void patch(key, "delete", value);
    },
    [patch]
  );

  /* ── render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading lot options…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lot Field Options</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the dropdown choices shown to sellers and QC checkers when creating or inspecting a lot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "saving" && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <Check size={12} /> Saved
            </span>
          )}
          {status === "error" && (
            <span className="text-xs font-semibold text-red-600">Save failed</span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELD_CONFIG.map((f) => (
          <div key={f.key} className={`rounded-xl border p-4 ${COLOR_MAP[f.color]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{f.label}</p>
            <p className="mt-1 text-2xl font-bold">{options[f.key].length}</p>
            <p className="text-[11px] opacity-60">options</p>
          </div>
        ))}
      </div>

      {/* Field sections */}
      <div className="space-y-6">
        {FIELD_CONFIG.map((f) => (
          <FieldSection
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            icon={f.icon}
            hint={f.hint}
            color={f.color}
            items={options[f.key]}
            onAdd={handleAdd}
            onBulkAdd={handleBulkAdd}
            onDelete={handleDelete}
            saving={status === "saving"}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">How changes take effect</p>
        <p>Changes are saved <strong>immediately</strong> — each add/delete is applied in real time without needing a save button.</p>
        <p>Sellers and QC checkers will see the new options the next time they load their forms.</p>
        <p>Removing an option only affects future form submissions. Existing lots that already used that value are not affected.</p>
      </div>
    </div>
  );
}
