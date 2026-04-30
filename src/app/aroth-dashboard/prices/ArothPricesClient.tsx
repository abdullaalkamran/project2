"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Save, TrendingUp, CheckCircle2, ShieldCheck, AlertTriangle,
  ChevronLeft, ChevronRight, Clock, BarChart2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type TimelinePoint = { id: string; price: number; note: string | null; recordedAt: string };

type PriceEntry = {
  id: string;
  productName: string;
  category: string;
  pricePerKg: number;
  unit: string;
  note: string | null;
  recordedAt: string;
};

type HistoryPoint = { date: string; price: number; unit: string; note: string | null; recordedAt: string };

type PricesData = {
  date: string;
  today: string;
  products: string[];
  categories: string[];
  units: string[];
  entries: PriceEntry[];
  isVerified: boolean;
  commissionRate: number;
  hub: { name: string; location: string } | null;
  noProductsAssigned: boolean;
  datesWithData: string[];
  timeline: Record<string, TimelinePoint[]>;
  productHistory: HistoryPoint[];
};

// ── Category colours ──────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const bdt = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-BD", { dateStyle: "full" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtShortDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-BD", { month: "short", day: "numeric" });

function prevDay(date: string) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
}
function nextDay(date: string) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

// ── Sparkline (inline SVG for product rows) ───────────────────────────────────

function Sparkline({ points }: { points: TimelinePoint[] }) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 80; const H = 24;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * W,
    y: H - ((p.price - min) / range) * H,
  }));
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = prices[prices.length - 1];
  const first = prices[0];
  const color = last > first ? "#16a34a" : last < first ? "#dc2626" : "#64748b";
  return (
    <svg width={W} height={H} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={2.5} fill={color} />
    </svg>
  );
}

// ── Timeline strip for a single product within a day ─────────────────────────

function DayTimeline({ points, unit }: { points: TimelinePoint[]; unit: string }) {
  if (points.length === 0) return null;
  return (
    <div className="relative mt-2 pl-4">
      <div className="absolute left-1.5 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-2">
        {points.map((p, i) => {
          const prev = i > 0 ? points[i - 1].price : null;
          const diff = prev != null ? p.price - prev : 0;
          return (
            <div key={p.id} className="relative flex items-start gap-3">
              <div className="absolute -left-[11px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 shadow-sm" />
              <div className="flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{bdt(p.price)} <span className="font-normal text-slate-400">/ {unit}</span></span>
                  <div className="flex items-center gap-2">
                    {diff !== 0 && (
                      <span className={`font-semibold ${diff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {diff > 0 ? "+" : ""}{bdt(diff)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={10} />{fmtTime(p.recordedAt)}
                    </span>
                  </div>
                </div>
                {p.note && <p className="mt-0.5 text-slate-500">{p.note}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Multi-day chart for a single product ─────────────────────────────────────

function ProductHistoryChart({ history, unit }: { history: HistoryPoint[]; unit: string }) {
  const chartData = useMemo(() => {
    // Group by date, take last price per date
    const byDate: Record<string, HistoryPoint> = {};
    for (const h of history) byDate[h.date] = h;
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({ label: fmtShortDate(h.date), price: h.price }));
  }, [history]);

  // Hourly view (all individual entries)
  const hourlyData = useMemo(() =>
    history.map((h) => ({
      label: new Date(h.recordedAt).toLocaleString("en-BD", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
      }),
      price: h.price,
    }))
  , [history]);

  const [view, setView] = useState<"daily" | "hourly">("daily");
  const displayData: { label: string; price: number }[] = view === "daily" ? chartData : hourlyData;

  if (history.length === 0) return (
    <p className="text-center text-xs text-slate-400 py-6">No history data yet.</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        {(["daily", "hourly"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${view === v ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {v === "daily" ? "Daily" : "All updates"}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={displayData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
          <Tooltip
            formatter={(v) => typeof v === "number" ? [`${bdt(v)} / ${unit}`, "Price"] : [String(v), "Price"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <ReferenceLine y={displayData[displayData.length - 1]?.price} stroke="#e2e8f0" strokeDasharray="4 4" />
          <Line
            type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2}
            dot={{ r: 3, fill: "#16a34a" }} activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ArothPricesClient() {
  const [data,    setData]    = useState<PricesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [date,    setDate]    = useState(() => new Date().toLocaleDateString("en-CA"));
  const [tab,     setTab]     = useState<"enter" | "timeline">("enter");
  const [search,  setSearch]  = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedProduct, setExpandedProduct]   = useState<string | null>(null);
  const [historyProduct,  setHistoryProduct]    = useState<string | null>(null);

  const [draft, setDraft] = useState<Record<string, { price: string; unit: string; note: string }>>({});

  const today = new Date().toLocaleDateString("en-CA");
  const isToday = date === today;

  const load = useCallback((d: string, product?: string) => {
    setLoading(true);
    const url = `/api/aroth-dashboard/prices?date=${d}${product ? `&product=${encodeURIComponent(product)}` : ""}`;
    return api.get<PricesData>(url)
      .then((res) => {
        setData(res);
        const initial: Record<string, { price: string; unit: string; note: string }> = {};
        for (const e of res.entries) {
          initial[e.productName] = { price: String(e.pricePerKg), unit: e.unit, note: e.note ?? "" };
        }
        setDraft(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { void load(date); }, [load, date]);

  // Reload history when a product is selected for cross-day chart
  useEffect(() => {
    if (historyProduct) void load(date, historyProduct);
  }, [historyProduct, load, date]);

  const categories = data ? ["All", ...data.categories] : ["All"];

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) => {
      const matchSearch = p.toLowerCase().includes(search.toLowerCase());
      const cat = PRODUCT_CATEGORY[p] ?? "Other";
      return matchSearch && (selectedCategory === "All" || cat === selectedCategory);
    });
  }, [data, search, selectedCategory]);

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
    if (!data || !isToday) return;
    setSaving(true); setSaved(false);
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
      void load(date, historyProduct ?? undefined);
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

  function changeDate(newDate: string) {
    if (newDate > today) return;
    setDate(newDate);
    setExpandedProduct(null);
    setHistoryProduct(null);
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />)}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Price Chart</h1>
            {data?.isVerified
              ? <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700"><ShieldCheck size={12} /> Verified</span>
              : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Unverified</span>
            }
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => changeDate(prevDay(date))} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => changeDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400"
            />
            <button
              onClick={() => changeDate(nextDay(date))}
              disabled={isToday}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button onClick={() => changeDate(today)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                Today
              </button>
            )}
            <span className="text-xs text-slate-400">{fmtDate(date)}</span>
          </div>

          {/* Days with data dots */}
          {data?.datesWithData && data.datesWithData.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400">Data:</span>
              {data.datesWithData.slice(0, 14).map((d) => (
                <button
                  key={d}
                  onClick={() => changeDate(d)}
                  title={fmtDate(d)}
                  className={`h-2 w-2 rounded-full transition ${d === date ? "bg-emerald-500 scale-125" : "bg-slate-300 hover:bg-emerald-400"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            <TrendingUp size={11} className="inline mr-1" />
            {filledCount} / {data?.products.length ?? 0} filled
          </span>
          {isToday && (
            <button
              onClick={saveAll}
              disabled={saving || filledCount === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition"
            >
              {saved ? <><CheckCircle2 size={15} /> Saved!</> : saving ? "Saving…" : <><Save size={15} /> Save Prices</>}
            </button>
          )}
        </div>
      </div>

      {data?.noProductsAssigned && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 text-amber-500" />
          <p className="text-sm font-medium text-amber-800">
            Your hub manager hasn&apos;t assigned any products yet. Contact your hub manager to get product permissions.
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {([["enter", "Enter Prices"], ["timeline", "Timeline & History"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {key === "timeline" ? <BarChart2 size={14} /> : <TrendingUp size={14} />}
            {label}
          </button>
        ))}
      </div>

      {/* ── Filters (both tabs) ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none transition" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${selectedCategory === cat ? "border-emerald-400 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ TAB: Enter Prices ══════════ */}
      {tab === "enter" && (
        Object.keys(grouped).length === 0
          ? <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm"><p className="text-slate-500">No products match your search.</p></div>
          : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left w-36">Price (৳)</th>
                    <th className="px-4 py-3 text-left w-28">Unit</th>
                    <th className="px-4 py-3 text-left">Note</th>
                    <th className="px-4 py-3 text-left w-24">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([category, products]) => {
                    const color = CAT_COLORS[category] ?? DEFAULT_COLOR;
                    return (
                      <React.Fragment key={category}>
                        <tr className={color.bg}>
                          <td colSpan={5} className="px-4 py-2">
                            <span className={`text-xs font-bold ${color.text}`}>{category}</span>
                            <span className="ml-2 text-[10px] text-slate-400">{products.length} products</span>
                          </td>
                        </tr>
                        {products.map((product, idx) => {
                          const d = draft[product];
                          const hasPrice = d?.price && parseFloat(d.price) > 0;
                          const entry = data?.entries.find((e) => e.productName === product);
                          const dayPoints = data?.timeline[product] ?? [];
                          return (
                            <tr key={product} className={`border-b transition hover:bg-slate-50 ${idx === products.length - 1 ? "border-slate-100" : "border-slate-50"} ${hasPrice ? "bg-emerald-50/30" : ""}`}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {hasPrice && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                                  <span className={`font-medium ${hasPrice ? "text-slate-900" : "text-slate-600"}`}>{product}</span>
                                  {dayPoints.length > 1 && <Sparkline points={dayPoints} />}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">৳</span>
                                  <input type="number" min="0" step="0.5" placeholder="0"
                                    value={d?.price ?? ""} readOnly={!isToday}
                                    onChange={(e) => updateDraft(product, "price", e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white pl-5 pr-2 py-1.5 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-50 transition" />
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <select value={d?.unit ?? "kg"} disabled={!isToday}
                                  onChange={(e) => updateDraft(product, "unit", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition">
                                  {(data?.units ?? ["kg", "piece"]).map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input type="text" placeholder="Note…" value={d?.note ?? ""} readOnly={!isToday}
                                  onChange={(e) => updateDraft(product, "note", e.target.value)}
                                  className="w-full rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-300 placeholder:text-slate-300 transition" />
                              </td>
                              <td className="px-4 py-2 text-[11px] text-slate-400">
                                {entry?.recordedAt ? fmtTime(entry.recordedAt) : "—"}
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
          )
      )}

      {/* ══════════ TAB: Timeline & History ══════════ */}
      {tab === "timeline" && (
        <div className="space-y-4">
          {filteredProducts.length === 0
            ? <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm"><p className="text-slate-500">No products match.</p></div>
            : filteredProducts.map((product) => {
                const dayPoints  = data?.timeline[product] ?? [];
                const latestEntry = data?.entries.find((e) => e.productName === product);
                const isExpanded = expandedProduct === product;
                const isHistoryOpen = historyProduct === product;
                const unit = latestEntry?.unit ?? "kg";
                const cat = PRODUCT_CATEGORY[product] ?? "Other";
                const color = CAT_COLORS[cat] ?? DEFAULT_COLOR;

                if (dayPoints.length === 0 && !latestEntry) return null;

                const firstPrice = dayPoints[0]?.price;
                const lastPrice  = dayPoints[dayPoints.length - 1]?.price ?? latestEntry?.pricePerKg;
                const dayChange  = firstPrice != null && lastPrice != null ? lastPrice - firstPrice : null;

                return (
                  <div key={product} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    {/* Product header */}
                    <button
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition"
                      onClick={() => setExpandedProduct(isExpanded ? null : product)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${color.bg} ${color.text}`}>{cat}</span>
                        <span className="font-semibold text-slate-800 truncate">{product}</span>
                        {dayPoints.length > 1 && <Sparkline points={dayPoints} />}
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-right">
                        {lastPrice != null && (
                          <div>
                            <p className="text-base font-bold text-slate-900">{bdt(lastPrice)}<span className="text-xs font-normal text-slate-400"> / {unit}</span></p>
                            {dayChange != null && dayChange !== 0 && (
                              <p className={`text-xs font-semibold ${dayChange > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                {dayChange > 0 ? "+" : ""}{bdt(dayChange)} today
                              </p>
                            )}
                          </div>
                        )}
                        <span className="text-xs text-slate-400">{dayPoints.length} update{dayPoints.length !== 1 ? "s" : ""}</span>
                        <ChevronRight size={16} className={`text-slate-300 transition ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded: day timeline + history chart */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                        {/* Day timeline */}
                        {dayPoints.length > 0
                          ? <DayTimeline points={dayPoints} unit={unit} />
                          : <p className="text-xs text-slate-400">No price updates recorded for this day.</p>
                        }

                        {/* History chart toggle */}
                        <div>
                          <button
                            onClick={() => setHistoryProduct(isHistoryOpen ? null : product)}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            <BarChart2 size={13} />
                            {isHistoryOpen ? "Hide" : "View"} price history
                          </button>

                          {isHistoryOpen && data?.productHistory && data.productHistory.length > 0 && (
                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                {product} — Price History
                              </p>
                              <ProductHistoryChart history={data.productHistory} unit={unit} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }).filter(Boolean)
          }
        </div>
      )}

      {/* Sticky save bar */}
      {tab === "enter" && isToday && filledCount > 0 && (
        <div className="sticky bottom-4 rounded-2xl border border-emerald-200 bg-emerald-600 px-6 py-3 shadow-lg flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">
            {filledCount} price{filledCount !== 1 ? "s" : ""} ready to save
          </p>
          <button onClick={saveAll} disabled={saving}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition">
            {saving ? "Saving…" : saved ? "Saved!" : "Save All"}
          </button>
        </div>
      )}
    </div>
  );
}
