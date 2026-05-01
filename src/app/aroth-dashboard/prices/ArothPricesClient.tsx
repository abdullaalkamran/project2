"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Save, TrendingUp, TrendingDown, CheckCircle2, ShieldCheck, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronDown, Clock, BarChart2, SlidersHorizontal, X,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

function fmtRelativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

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

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ points, width = 80 }: { points: TimelinePoint[]; width?: number }) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = width; const H = 28;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * W,
    y: H - ((p.price - min) / range) * (H - 6) - 3,
  }));
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = prices[prices.length - 1];
  const first = prices[0];
  const color = last > first ? "#16a34a" : last < first ? "#ef4444" : "#94a3b8";
  return (
    <svg width={W} height={H} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={2.5} fill={color} />
    </svg>
  );
}

// ── Day Timeline ──────────────────────────────────────────────────────────────

function DayTimeline({ points, unit }: { points: TimelinePoint[]; unit: string }) {
  if (points.length === 0) return null;
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-7 bottom-7 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
      <div className="space-y-3">
        {points.map((p, i) => {
          const prev = i > 0 ? points[i - 1].price : null;
          const diff = prev != null ? p.price - prev : 0;
          const pct  = prev != null && prev > 0 ? ((p.price - prev) / prev) * 100 : 0;
          const isFirst = i === 0;
          const isLast  = i === points.length - 1;
          const isUp    = diff > 0;

          return (
            <div key={p.id} className="relative flex items-start gap-3 pl-12">
              {/* Node */}
              <div className={`absolute left-2 top-2.5 h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center
                ${isFirst ? "bg-slate-300" : isUp ? "bg-emerald-500" : "bg-red-400"}`}>
                {isFirst
                  ? <Clock size={10} className="text-white" />
                  : isUp
                    ? <TrendingUp size={10} className="text-white" />
                    : <TrendingDown size={10} className="text-white" />
                }
              </div>

              {/* Card */}
              <div className={`flex-1 rounded-xl border px-4 py-3 shadow-sm
                ${isLast ? "border-2" : ""}
                ${isFirst
                  ? `border-slate-100 bg-white ${isLast ? "border-slate-200" : ""}`
                  : isUp
                    ? `border-emerald-100 bg-emerald-50/40 ${isLast ? "border-emerald-300" : ""}`
                    : `border-red-100 bg-red-50/40 ${isLast ? "border-red-300" : ""}`
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-900">{bdt(p.price)}</span>
                      <span className="text-xs text-slate-400">/ {unit}</span>
                      {isFirst && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Opening
                        </span>
                      )}
                      {isLast && !isFirst && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                          Latest
                        </span>
                      )}
                      {!isFirst && diff !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold
                          ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {isUp ? "↑" : "↓"} {bdt(Math.abs(diff))} ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <p className="mt-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs italic text-slate-500">
                        &ldquo;{p.note}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-700">{fmtTime(p.recordedAt)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{fmtRelativeTime(p.recordedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Product History Chart ─────────────────────────────────────────────────────

function ProductHistoryChart({ history, unit }: { history: HistoryPoint[]; unit: string }) {
  const [view, setView] = useState<"daily" | "hourly">("daily");

  const chartData = useMemo(() => {
    const byDate: Record<string, HistoryPoint> = {};
    for (const h of history) byDate[h.date] = h;
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({ label: fmtShortDate(h.date), price: h.price }));
  }, [history]);

  const hourlyData = useMemo(() =>
    history.map((h) => ({
      label: new Date(h.recordedAt).toLocaleString("en-BD", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
      }),
      price: h.price,
    })), [history]);

  const displayData: { label: string; price: number }[] = view === "daily" ? chartData : hourlyData;

  const prices  = displayData.map((d) => d.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
  const trend    = prices.length >= 2 ? prices[prices.length - 1] - prices[0] : 0;

  if (history.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <BarChart2 size={28} className="text-slate-200" />
      <p className="text-sm text-slate-400">No historical data yet.</p>
      <p className="text-xs text-slate-300">Price history builds up as you record prices over multiple days.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Min</p>
          <p className="text-sm font-bold text-blue-600">{bdt(minPrice)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Avg</p>
          <p className="text-sm font-bold text-slate-700">{bdt(avgPrice)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Max</p>
          <p className="text-sm font-bold text-red-500">{bdt(maxPrice)}</p>
        </div>
        <div className={`rounded-xl border px-3 py-2.5 text-center
          ${trend > 0 ? "border-emerald-100 bg-emerald-50" : trend < 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Trend</p>
          <p className={`text-sm font-bold ${trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-slate-400"}`}>
            {trend === 0 ? "Flat" : `${trend > 0 ? "↑" : "↓"} ${bdt(Math.abs(trend))}`}
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {displayData.length} data point{displayData.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-0.5 rounded-lg border border-slate-100 bg-slate-100 p-0.5">
          {(["daily", "hourly"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition
                ${view === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              {v === "daily" ? "Daily" : "All updates"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={displayData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false} axisLine={false}
            tickFormatter={(v) => `৳${v}`}
          />
          <Tooltip
            formatter={(v) => typeof v === "number" ? [`${bdt(v)} / ${unit}`, "Price"] : [String(v), "Price"]}
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)" }}
          />
          <Area
            type="monotone" dataKey="price"
            stroke="#16a34a" strokeWidth={2.5}
            fill="url(#priceGradient)"
            dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Timeline Summary Stats ────────────────────────────────────────────────────

function TimelineSummary({ data, products }: { data: PricesData; products: string[] }) {
  const productsWithData = products.filter((p) => (data.timeline[p]?.length ?? 0) > 0);
  const totalUpdates = productsWithData.reduce((sum, p) => sum + (data.timeline[p]?.length ?? 0), 0);

  let biggestMover: { name: string; change: number } | null = null;
  for (const p of productsWithData) {
    const pts = data.timeline[p];
    if (!pts || pts.length < 2) continue;
    const change = Math.abs(pts[pts.length - 1].price - pts[0].price);
    if (!biggestMover || change > Math.abs(biggestMover.change)) {
      biggestMover = { name: p, change: pts[pts.length - 1].price - pts[0].price };
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tracked</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{productsWithData.length}</p>
        <p className="text-[11px] text-slate-400">of {products.length} products</p>
      </div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Updates Today</p>
        <p className="mt-0.5 text-2xl font-bold text-emerald-700">{totalUpdates}</p>
        <p className="text-[11px] text-emerald-600">price recordings</p>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm overflow-hidden">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Biggest Move</p>
        {biggestMover ? (
          <>
            <p className={`mt-0.5 text-base font-bold ${biggestMover.change > 0 ? "text-emerald-600" : "text-red-500"}`}>
              {biggestMover.change > 0 ? "↑" : "↓"} {bdt(Math.abs(biggestMover.change))}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{biggestMover.name}</p>
          </>
        ) : (
          <>
            <p className="mt-0.5 text-base font-bold text-slate-300">—</p>
            <p className="text-[11px] text-slate-400">no multi-update yet</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Grade helpers ─────────────────────────────────────────────────────────────

type GradeEntry = { price: string; unit: string; note: string };
type GradeDraft = { A: GradeEntry; B: GradeEntry; C: GradeEntry };
type Draft = Record<string, GradeDraft>;

const GRADES = ["A", "B", "C"] as const;
type Grade = typeof GRADES[number];

const GRADE_STYLE: Record<Grade, { badge: string; row: string }> = {
  A: { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", row: "bg-emerald-50/20" },
  B: { badge: "border-amber-200 bg-amber-50 text-amber-700",       row: "bg-amber-50/10"   },
  C: { badge: "border-red-200 bg-red-50 text-red-600",             row: "bg-red-50/10"     },
};

const GRADE_SECTION: Record<Grade, { card: string; header: string; dot: string }> = {
  A: { card: "border-emerald-200", header: "bg-emerald-50/70 border-b border-emerald-100", dot: "bg-emerald-500" },
  B: { card: "border-amber-200",   header: "bg-amber-50/70   border-b border-amber-100",   dot: "bg-amber-500"   },
  C: { card: "border-red-200",     header: "bg-red-50/70     border-b border-red-100",     dot: "bg-red-400"     },
};

function emptyGradeDraft(unit = "kg"): GradeDraft {
  return { A: { price: "", unit, note: "" }, B: { price: "", unit, note: "" }, C: { price: "", unit, note: "" } };
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
  const [selectedProduct,  setSelectedProduct]  = useState<string | null>(null);
  const [historyLoading,   setHistoryLoading]   = useState(false);

  const [filterGrades,    setFilterGrades]    = useState<Set<Grade>>(new Set(GRADES));
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd,   setFilterDateEnd]   = useState("");
  const [enterSearch,       setEnterSearch]       = useState("");
  const [enterCategory,     setEnterCategory]     = useState("All");
  const [activeEnterProduct, setActiveEnterProduct] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>({});

  const today   = new Date().toLocaleDateString("en-CA");
  const isToday = date === today;

  // Full page load — only called on date change or after saving
  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get<PricesData>(`/api/aroth-dashboard/prices?date=${d}`);
      setData(res);
      const initial: Draft = {};
      for (const e of res.entries) {
        const grade = (GRADES as readonly string[]).includes(e.category) ? (e.category as Grade) : "A";
        if (!initial[e.productName]) initial[e.productName] = emptyGradeDraft(e.unit);
        initial[e.productName][grade] = { price: String(e.pricePerKg), unit: e.unit, note: e.note ?? "" };
      }
      setDraft(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  // History-only load — updates just productHistory, no page flicker
  const loadHistory = useCallback(async (d: string, product: string) => {
    setHistoryLoading(true);
    try {
      const res = await api.get<PricesData>(
        `/api/aroth-dashboard/prices?date=${d}&product=${encodeURIComponent(product)}`
      );
      setData((prev) => prev ? { ...prev, productHistory: res.productHistory } : res);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void load(date); }, [load, date]);

  const categories = data ? ["All", ...data.categories] : ["All"];

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) => {
      const matchProduct = search === "" || p === search;
      const cat = PRODUCT_CATEGORY[p] ?? "Other";
      return matchProduct && (selectedCategory === "All" || cat === selectedCategory);
    });
  }, [data, search, selectedCategory]);

  // Enter tab: always shows ALL permitted products, filtered only by its own search + category
  const enterProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) => {
      const cat = PRODUCT_CATEGORY[p] ?? "Other";
      const matchCat  = enterCategory === "All" || cat === enterCategory;
      const matchName = enterSearch === "" || p.toLowerCase().includes(enterSearch.toLowerCase());
      return matchCat && matchName;
    });
  }, [data, enterCategory, enterSearch]);

  const enterGrouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of enterProducts) {
      const cat = PRODUCT_CATEGORY[p] ?? "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [enterProducts]);

  const activeIdx      = activeEnterProduct ? enterProducts.indexOf(activeEnterProduct) : -1;
  const prevEnterProd  = activeIdx > 0 ? enterProducts[activeIdx - 1] : null;
  const nextEnterProd  = activeIdx < enterProducts.length - 1 ? enterProducts[activeIdx + 1] : null;
  const unfilledProds  = enterProducts.filter((p) =>
    !GRADES.some((g) => { const v = draft[p]?.[g]; return v?.price && parseFloat(v.price) > 0; })
  );
  const nextUnfilled   = unfilledProds.find((p) => p !== activeEnterProduct) ?? null;

  // Auto-select product from filter dropdown when in timeline tab
  useEffect(() => {
    if (tab !== "timeline") return;
    const target = search || filteredProducts[0] || null;
    if (target && target !== selectedProduct) {
      setSelectedProduct(target);
      void loadHistory(date, target);
    } else if (!target) {
      setSelectedProduct(null);
    }
  }, [tab, search, filteredProducts, date, loadHistory, selectedProduct]);

const selectedDayPoints   = selectedProduct ? data?.timeline[selectedProduct] ?? [] : [];
  const selectedLatestEntry = selectedProduct ? data?.entries.find((e) => e.productName === selectedProduct) : undefined;
  const selectedUnit        = selectedLatestEntry?.unit ?? "kg";
  const selectedHistory = useMemo(() => {
    const raw = selectedProduct ? data?.productHistory ?? [] : [];
    return raw.filter((h) => {
      if (filterDateStart && h.date < filterDateStart) return false;
      if (filterDateEnd   && h.date > filterDateEnd)   return false;
      return true;
    });
  }, [selectedProduct, data?.productHistory, filterDateStart, filterDateEnd]);

  const filledCount = Object.values(draft).filter((d) =>
    GRADES.some((g) => d[g].price && parseFloat(d[g].price) > 0)
  ).length;

  async function saveAll() {
    if (!data || !isToday) return;
    setSaving(true); setSaved(false);
    const entries: { productName: string; category: string; pricePerKg: number; unit: string; note?: string }[] = [];
    for (const [productName, grades] of Object.entries(draft)) {
      for (const grade of GRADES) {
        const v = grades[grade];
        if (v.price && parseFloat(v.price) > 0) {
          entries.push({ productName, category: grade, pricePerKg: parseFloat(v.price), unit: v.unit || "kg", note: v.note || undefined });
        }
      }
    }
    try {
      await api.post("/api/aroth-dashboard/prices", { entries });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      void load(date);
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(product: string, grade: Grade, field: keyof GradeEntry, value: string) {
    setDraft((prev) => {
      const existing = prev[product] ?? emptyGradeDraft();
      return { ...prev, [product]: { ...existing, [grade]: { ...existing[grade], [field]: value } } };
    });
  }

  function changeDate(newDate: string) {
    if (newDate > today) return;
    setDate(newDate);
    setSelectedProduct(null);
  }

  function toggleGrade(g: Grade) {
    setFilterGrades((prev) => {
      const next = new Set(prev);
      if (next.has(g) && next.size > 1) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory("All");
    setFilterGrades(new Set(GRADES));
    setFilterDateStart("");
    setFilterDateEnd("");
  }

  const hasActiveFilters =
    search !== "" ||
    selectedCategory !== "All" ||
    filterGrades.size < GRADES.length ||
    filterDateStart !== "" ||
    filterDateEnd !== "";

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
      ))}
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
              type="date" value={date} max={today}
              onChange={(e) => changeDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400"
            />
            <button
              onClick={() => changeDate(nextDay(date))} disabled={isToday}
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

          {/* Days-with-data dots */}
          {data?.datesWithData && data.datesWithData.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400">Data:</span>
              {data.datesWithData.slice(0, 14).map((d) => (
                <button
                  key={d} onClick={() => changeDate(d)} title={fmtDate(d)}
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
              onClick={saveAll} disabled={saving || filledCount === 0}
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
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition
              ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {key === "timeline" ? <BarChart2 size={14} /> : <TrendingUp size={14} />}
            {label}
          </button>
        ))}
      </div>

      {/* ── Advanced filters ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:border-red-200 hover:text-red-500 transition"
            >
              <X size={10} /> Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Product */}
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Product</p>
            <select
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
            >
              <option value="">All products</option>
              {(data?.products ?? []).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Category</p>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
            >
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Grade */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Grade</p>
            <div className="flex gap-1">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGrade(g)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition
                    ${filterGrades.has(g) ? GRADE_STYLE[g].badge : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Date from */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</p>
            <input
              type="date" value={filterDateStart} max={filterDateEnd || today}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
            />
          </div>

          {/* Date to */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</p>
            <input
              type="date" value={filterDateEnd} min={filterDateStart} max={today}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
            />
          </div>
        </div>
      </div>

      {/* ══════════ TAB: Enter Prices ══════════ */}
      {tab === "enter" && (
        <div className="space-y-4">

          {/* ── Overall progress ── */}
          {data && data.products.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <span className="text-sm font-bold text-slate-800">{filledCount}</span>
                  <span className="text-sm text-slate-400"> of {data.products.length} products filled</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${filledCount === data.products.length ? "text-emerald-600" : "text-slate-400"}`}>
                  {Math.round((filledCount / data.products.length) * 100)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${(filledCount / data.products.length) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-5">
                {GRADES.map((g) => {
                  const n = data.products.filter((p) => { const v = draft[p]?.[g]; return v?.price && parseFloat(v.price) > 0; }).length;
                  return (
                    <div key={g} className="flex items-center gap-1.5">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${GRADE_STYLE[g].badge}`}>Grade {g}</span>
                      <span className="text-xs font-semibold text-slate-500">{n}</span>
                      <span className="text-xs text-slate-300">/ {data.products.length}</span>
                    </div>
                  );
                })}
                {unfilledProds.length > 0 && (
                  <span className="ml-auto text-xs text-slate-400">{unfilledProds.length} remaining</span>
                )}
              </div>
            </div>
          )}

          {/* ── Split panel ── */}
          <div className="grid gap-4 lg:grid-cols-[288px_1fr] items-start">

            {/* ── Left: scrollable product list ── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:sticky lg:top-4">

              {/* List search + filters */}
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    type="text" placeholder="Search products…" value={enterSearch}
                    onChange={(e) => setEnterSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-400 focus:bg-white transition placeholder:text-slate-300"
                  />
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={enterCategory} onChange={(e) => setEnterCategory(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
                  >
                    <option value="All">All categories</option>
                    {(data?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                    {GRADES.map((g) => (
                      <button key={g} onClick={() => toggleGrade(g)}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition
                          ${filterGrades.has(g) ? GRADE_STYLE[g].badge : "text-slate-400 hover:bg-slate-50"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product rows */}
              <div className="max-h-[560px] overflow-y-auto overscroll-contain">
                {Object.keys(enterGrouped).length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">No products found.</p>
                ) : (
                  Object.entries(enterGrouped).map(([cat, prods]) => {
                    const cc = CAT_COLORS[cat] ?? DEFAULT_COLOR;
                    return (
                      <div key={cat}>
                        {/* Sticky category label */}
                        <div className={`sticky top-0 z-10 flex items-center gap-2 border-b border-t border-slate-100 px-3 py-1.5 ${cc.bg}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${cc.text}`}>{cat}</span>
                          <span className="text-[10px] text-slate-400">
                            {prods.filter((p) => GRADES.some((g) => { const v = draft[p]?.[g]; return v?.price && parseFloat(v.price) > 0; })).length}/{prods.length}
                          </span>
                        </div>
                        {prods.map((product) => {
                          const d  = draft[product] ?? emptyGradeDraft();
                          const isActive   = activeEnterProduct === product;
                          const hasAny     = GRADES.some((g) => d[g].price && parseFloat(d[g].price) > 0);
                          const filledGs   = GRADES.filter((g) => d[g].price && parseFloat(d[g].price) > 0);
                          return (
                            <button key={product} onClick={() => setActiveEnterProduct(product)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition border-b border-slate-50 last:border-0
                                ${isActive
                                  ? "bg-emerald-50 border-l-[3px] border-l-emerald-500 pl-[9px]"
                                  : "hover:bg-slate-50 border-l-[3px] border-l-transparent"}`}>
                              <span className={`h-2 w-2 shrink-0 rounded-full transition ${hasAny ? "bg-emerald-500" : "bg-slate-200"}`} />
                              <span className={`flex-1 min-w-0 text-sm truncate ${isActive ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                                {product}
                              </span>
                              {filledGs.length > 0 && (
                                <div className="flex gap-0.5 shrink-0">
                                  {filledGs.map((g) => (
                                    <span key={g} className={`rounded-full border px-1.5 py-px text-[8px] font-bold ${GRADE_STYLE[g].badge}`}>{g}</span>
                                  ))}
                                </div>
                              )}
                              {isActive && <ChevronRight size={13} className="shrink-0 text-emerald-500" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
                <span className="text-[11px] text-slate-400">{enterProducts.length} products</span>
                {nextUnfilled && (
                  <button onClick={() => setActiveEnterProduct(nextUnfilled)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline">
                    Next unfilled <ChevronRight size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Right: entry form ── */}
            {!activeEnterProduct ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <TrendingUp size={24} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Select a product to enter prices</p>
                  <p className="mt-1 text-xs text-slate-400">Pick any product from the list on the left</p>
                </div>
                {unfilledProds.length > 0 && (
                  <button onClick={() => setActiveEnterProduct(unfilledProds[0])}
                    className="mt-1 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                    Start with first unfilled <ChevronRight size={15} />
                  </button>
                )}
              </div>
            ) : (() => {
              const ap     = activeEnterProduct;
              const d      = draft[ap] ?? emptyGradeDraft();
              const pts    = data?.timeline[ap] ?? [];
              const hasAny = GRADES.some((g) => d[g].price && parseFloat(d[g].price) > 0);
              const catName = PRODUCT_CATEGORY[ap] ?? "Other";
              const catClr  = CAT_COLORS[catName] ?? DEFAULT_COLOR;
              return (
                <div className="space-y-3">

                  {/* Product header card */}
                  <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-lg border px-2.5 py-0.5 text-[10px] font-bold ${catClr.border} ${catClr.bg} ${catClr.text}`}>
                          {catName}
                        </span>
                        <h2 className="mt-1.5 text-xl font-bold text-slate-900 leading-tight">{ap}</h2>
                        <div className="mt-1 flex items-center gap-3">
                          {pts.length > 0 && (
                            <span className="text-xs text-slate-400">
                              {pts.length} update{pts.length !== 1 ? "s" : ""} today
                            </span>
                          )}
                          {hasAny && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={11} /> Prices entered
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {pts.length >= 2 && <Sparkline points={pts} width={80} />}
                        {nextUnfilled && nextUnfilled !== ap && (
                          <button onClick={() => setActiveEnterProduct(nextUnfilled)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
                            Skip to unfilled <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grade sections */}
                  {GRADES.filter((g) => filterGrades.has(g)).map((grade) => {
                    const gv       = d[grade];
                    const hasGrade = gv.price && parseFloat(gv.price) > 0;
                    const saved    = data?.entries.find((e) => e.productName === ap && e.category === grade);
                    const gs       = GRADE_SECTION[grade];
                    return (
                      <div key={grade}
                        className={`rounded-2xl border shadow-sm overflow-hidden transition-all
                          ${hasGrade ? gs.card : "border-slate-200"}`}>
                        {/* Section header */}
                        <div className={`flex items-center justify-between px-5 py-3 ${hasGrade ? gs.header : "border-b border-slate-100 bg-slate-50"}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${hasGrade ? gs.dot : "bg-slate-300"}`} />
                            <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${GRADE_STYLE[grade].badge}`}>
                              Grade {grade}
                            </span>
                            {hasGrade && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                {bdt(parseFloat(gv.price))} / {gv.unit}
                              </span>
                            )}
                          </div>
                          {saved?.recordedAt && (
                            <span className="text-[11px] text-slate-400">Saved {fmtTime(saved.recordedAt)}</span>
                          )}
                        </div>
                        {/* Inputs */}
                        <div className="bg-white px-5 py-4 space-y-3">
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-semibold text-slate-400 pointer-events-none">৳</span>
                              <input
                                type="number" min="0" step="0.5" placeholder="0.00"
                                value={gv.price} readOnly={!isToday}
                                onChange={(e) => updateDraft(ap, grade, "price", e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-lg font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition placeholder:text-slate-200 disabled:bg-slate-50"
                              />
                            </div>
                            <select
                              value={gv.unit} disabled={!isToday}
                              onChange={(e) => updateDraft(ap, grade, "unit", e.target.value)}
                              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-emerald-400 transition"
                            >
                              {(data?.units ?? ["kg", "piece"]).map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <input
                            type="text" placeholder="Add a note (optional)…" value={gv.note} readOnly={!isToday}
                            onChange={(e) => updateDraft(ap, grade, "note", e.target.value)}
                            className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-slate-300 focus:bg-white placeholder:text-slate-300 transition"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Prev / position / Next */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <button onClick={() => prevEnterProd && setActiveEnterProduct(prevEnterProd)}
                      disabled={!prevEnterProd}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition">
                      <ChevronLeft size={15} /> Prev
                    </button>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {activeIdx + 1} / {enterProducts.length}
                    </span>
                    <button onClick={() => nextEnterProd && setActiveEnterProduct(nextEnterProd)}
                      disabled={!nextEnterProd}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition">
                      Next <ChevronRight size={15} />
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* ══════════ TAB: Timeline & History ══════════ */}
      {tab === "timeline" && (
        <div className="space-y-5">

          {/* Summary stats bar */}
          {data && filteredProducts.length > 0 && (
            <TimelineSummary data={data} products={filteredProducts} />
          )}

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
              <p className="text-slate-500">No products match your search.</p>
            </div>
          ) : (
            <div>

              {/* Detail panel */}
              <div>
                {!selectedProduct ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
                    Select a product to view its timeline and history.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 items-start">
                    {/* Price timeline */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2">
                        <Clock size={13} className="text-slate-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Price timeline</h3>
                        <span className="ml-auto text-[10px] text-slate-400">{selectedDayPoints.length} update{selectedDayPoints.length !== 1 ? "s" : ""}</span>
                      </div>
                      {selectedDayPoints.length > 0 ? (
                        <DayTimeline points={selectedDayPoints} unit={selectedUnit} />
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                          <p className="text-sm text-slate-400">No updates for this day.</p>
                        </div>
                      )}
                    </div>

                    {/* Price history */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2">
                        <BarChart2 size={13} className="text-slate-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Price history</h3>
                        <span className="ml-auto text-[10px] text-slate-400">
                          {historyLoading ? <span className="animate-pulse">Loading…</span> : `${selectedHistory.length} records`}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <ProductHistoryChart history={selectedHistory} unit={selectedUnit} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
