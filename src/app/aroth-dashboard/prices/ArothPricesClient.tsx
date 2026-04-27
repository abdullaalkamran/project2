"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Save, TrendingUp, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

type PriceEntry = {
  id: string;
  productName: string;
  category: string;
  pricePerKg: number;
  unit: string;
  note: string | null;
};

type PricesData = {
  date: string;
  today: string;
  products: string[];
  categories: string[];
  entries: PriceEntry[];
  isVerified: boolean;
  commissionRate: number;
  hub: { name: string; location: string } | null;
  noProductsAssigned: boolean;
};

// Category → color
const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Rice":             { bg: "bg-yellow-50",   text: "text-yellow-700",   border: "border-yellow-200" },
  "Vegetables":       { bg: "bg-green-50",    text: "text-green-700",    border: "border-green-200"  },
  "Fruits":           { bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200" },
  "Fish & Seafood":   { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200"   },
  "Spices":           { bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200"    },
  "Oil":              { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200"  },
  "Pulses":           { bg: "bg-lime-50",     text: "text-lime-700",     border: "border-lime-200"   },
  "Dairy & Eggs":     { bg: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-200"    },
  "Grains & Cereals": { bg: "bg-stone-50",    text: "text-stone-700",    border: "border-stone-200"  },
  "Dry goods":        { bg: "bg-slate-50",    text: "text-slate-700",    border: "border-slate-200"  },
  "Garments":         { bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200" },
  "Electronics":      { bg: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200" },
  "Other":            { bg: "bg-slate-50",    text: "text-slate-600",    border: "border-slate-200"  },
};

const DEFAULT_COLOR = { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };

// Map product names to their most likely category
const PRODUCT_CATEGORY: Record<string, string> = {
  "Miniket Rice": "Rice", "BRRI Dhan 28": "Rice", "BRRI Dhan 29": "Rice",
  "Najirshail Rice": "Rice", "Chinigura Rice": "Rice",
  "Tomato": "Vegetables", "Potato": "Vegetables", "Onion": "Vegetables",
  "Garlic": "Vegetables", "Ginger": "Vegetables", "Brinjal / Eggplant": "Vegetables",
  "Cauliflower": "Vegetables", "Cabbage": "Vegetables", "Bitter Gourd": "Vegetables",
  "Bottle Gourd": "Vegetables",
  "Mango": "Fruits", "Banana": "Fruits", "Papaya": "Fruits", "Jackfruit": "Fruits",
  "Pineapple": "Fruits", "Lychee": "Fruits", "Guava": "Fruits",
  "Hilsa Fish": "Fish & Seafood", "Rohu Fish": "Fish & Seafood",
  "Catla Fish": "Fish & Seafood", "Prawn / Shrimp": "Fish & Seafood",
  "Mustard Oil": "Oil", "Soybean Oil": "Oil", "Coconut": "Oil",
  "Red Lentil (Masoor Dal)": "Pulses", "Chickpea (Chola)": "Pulses",
  "Black Gram (Mashkalai)": "Pulses",
  "Coriander / Dhania": "Spices", "Turmeric": "Spices", "Chili (Dry)": "Spices",
  "Black Pepper": "Spices", "Cumin": "Spices",
  "Jute": "Garments", "Cotton": "Garments",
  "Wheat": "Grains & Cereals", "Maize / Corn": "Grains & Cereals",
  "Milk (Cow)": "Dairy & Eggs", "Egg (Poultry)": "Dairy & Eggs", "Honey": "Other",
};

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-BD", { dateStyle: "full" });

export default function ArothPricesClient() {
  const [data, setData] = useState<PricesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Draft prices: productName → { price, unit, note }
  const [draft, setDraft] = useState<Record<string, { price: string; unit: string; note: string }>>({});

  const load = useCallback(() => {
    setLoading(true);
    return api.get<PricesData>("/api/aroth-dashboard/prices")
      .then((d) => {
        setData(d);
        // Seed draft from saved entries
        const initial: Record<string, { price: string; unit: string; note: string }> = {};
        for (const e of d.entries) {
          initial[e.productName] = {
            price: String(e.pricePerKg),
            unit: e.unit,
            note: e.note ?? "",
          };
        }
        setDraft(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const categories = data ? ["All", ...data.categories] : ["All"];

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) => {
      const matchSearch = p.toLowerCase().includes(search.toLowerCase());
      const cat = PRODUCT_CATEGORY[p] ?? "Other";
      const matchCat = selectedCategory === "All" || cat === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [data, search, selectedCategory]);

  // Group filtered products by category for display
  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of filteredProducts) {
      const cat = PRODUCT_CATEGORY[p] ?? "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [filteredProducts]);

  const filledCount = Object.values(draft).filter((d) => d.price && parseFloat(d.price) > 0).length;

  async function saveAll() {
    if (!data) return;
    setSaving(true);
    setSaved(false);
    const entries = Object.entries(draft)
      .filter(([, v]) => v.price && parseFloat(v.price) > 0)
      .map(([productName, v]) => ({
        productName,
        category: PRODUCT_CATEGORY[productName] ?? "Other",
        pricePerKg: parseFloat(v.price),
        unit: v.unit || "kg",
        note: v.note || undefined,
      }));

    try {
      await api.post("/api/aroth-dashboard/prices", { entries });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(product: string, field: "price" | "unit" | "note", value: string) {
    setDraft((prev) => {
      const existing = prev[product] ?? { price: "", unit: "kg", note: "" };
      return { ...prev, [product]: { ...existing, [field]: value } };
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Today&apos;s Price Chart</h1>
            {data?.isVerified ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <ShieldCheck size={12} /> Verified
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                Unverified
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{data ? fmtDate(data.today) : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            <TrendingUp size={11} className="inline mr-1" />
            {filledCount} / {data?.products.length ?? 0} filled
          </span>
          <button
            onClick={saveAll}
            disabled={saving || filledCount === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
          >
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : saving ? "Saving…" : <><Save size={15} /> Save Prices</>}
          </button>
        </div>
      </div>

      {/* No products assigned notice */}
      {data?.noProductsAssigned && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 text-amber-500" />
          <p className="text-sm font-medium text-amber-800">
            Your hub manager hasn&apos;t assigned any products to you yet. Contact your hub manager to get product permissions.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none transition"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "border-emerald-400 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products list grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">No products match your search.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left w-36">Price (৳)</th>
                <th className="px-4 py-3 text-left w-28">Unit</th>
                <th className="px-4 py-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, products]) => {
                const color = CAT_COLORS[category] ?? DEFAULT_COLOR;
                return (
                  <React.Fragment key={category}>
                    {/* Category separator row */}
                    <tr className={`${color.bg}`}>
                      <td colSpan={4} className="px-4 py-2">
                        <span className={`text-xs font-bold ${color.text}`}>{category}</span>
                        <span className="ml-2 text-[10px] text-slate-400">{products.length} products</span>
                      </td>
                    </tr>
                    {products.map((product, idx) => {
                      const d = draft[product];
                      const hasPrice = d?.price && parseFloat(d.price) > 0;
                      const isLast = idx === products.length - 1;
                      return (
                        <tr
                          key={product}
                          className={`border-b transition hover:bg-slate-50 ${
                            isLast ? "border-slate-100" : "border-slate-50"
                          } ${hasPrice ? "bg-emerald-50/30" : ""}`}
                        >
                          {/* Product name */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {hasPrice && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              )}
                              <span className={`font-medium ${hasPrice ? "text-slate-900" : "text-slate-600"}`}>
                                {product}
                              </span>
                            </div>
                          </td>

                          {/* Price input */}
                          <td className="px-4 py-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">৳</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="0"
                                value={d?.price ?? ""}
                                onChange={(e) => updateDraft(product, "price", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white pl-5 pr-2 py-1.5 text-sm outline-none focus:border-emerald-400 transition"
                              />
                            </div>
                          </td>

                          {/* Unit select */}
                          <td className="px-4 py-2">
                            <select
                              value={d?.unit ?? "kg"}
                              onChange={(e) => updateDraft(product, "unit", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
                            >
                              {["kg", "ton", "quintal", "piece", "dozen", "liter", "sack"].map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>

                          {/* Note */}
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="Note…"
                              value={d?.note ?? ""}
                              onChange={(e) => updateDraft(product, "note", e.target.value)}
                              className="w-full rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-300 transition placeholder:text-slate-300"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary bar — only show if some prices filled */}
      {filledCount > 0 && (
        <div className="sticky bottom-4 rounded-2xl border border-emerald-200 bg-emerald-600 px-6 py-3 shadow-lg flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">
            {filledCount} price{filledCount !== 1 ? "s" : ""} ready to save
          </p>
          <button
            onClick={saveAll}
            disabled={saving}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : saved ? "Saved!" : "Save All"}
          </button>
        </div>
      )}
    </div>
  );
}
