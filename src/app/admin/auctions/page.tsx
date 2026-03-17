"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronDown, ChevronUp, RefreshCw, Search,
  Gavel, Clock, TrendingUp, CheckCircle2,
  Package, Building2, Phone, Tag, Zap, Ban,
} from "lucide-react";
import Pagination from "@/components/Pagination";
import LotLifecycleTracker from "@/components/LotLifecycleTracker";

const PAGE_SIZE = 12;

type Lot = {
  id: string;
  lotCode: string;
  title: string;
  quantity: string;
  unit: string;
  category: string;
  seller: string;
  sellerPhone: string | null;
  hubId: string;
  basePrice: number;
  minBidRate: number | null;
  status: string;
  bids: number;
  auctionStartsAt: string | null;
  auctionEndsAt: string | null;
  createdAt: string;
  verdict: string | null;
  saleType: string;
  photoUrl: string | null;
};

const STATUS_MAP: Record<string, { label: string; dot: string; badge: string }> = {
  LIVE:             { label: "Live",             dot: "bg-emerald-500",  badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  QC_PASSED:        { label: "Upcoming",         dot: "bg-blue-500",     badge: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_QC:            { label: "In QC",            dot: "bg-orange-400",   badge: "bg-orange-50 text-orange-600 border-orange-200" },
  QC_SUBMITTED:     { label: "QC Review",        dot: "bg-amber-400",    badge: "bg-amber-50 text-amber-700 border-amber-200" },
  QC_FAILED:        { label: "QC Failed",        dot: "bg-red-500",      badge: "bg-red-50 text-red-600 border-red-200" },
  AUCTION_ENDED:    { label: "Ended",            dot: "bg-slate-400",    badge: "bg-slate-100 text-slate-500 border-slate-200" },
  PENDING_DELIVERY: { label: "Pending Delivery", dot: "bg-slate-400",    badge: "bg-slate-50 text-slate-600 border-slate-200" },
  AT_HUB:           { label: "At Hub",           dot: "bg-sky-400",      badge: "bg-sky-50 text-sky-700 border-sky-200" },
};

const FILTERS = [
  { key: "All",         match: () => true },
  { key: "Live",        match: (s: string) => s === "LIVE" },
  { key: "QC Pending",  match: (s: string) => ["IN_QC", "QC_SUBMITTED"].includes(s) },
  { key: "Upcoming",    match: (s: string) => s === "QC_PASSED" },
  { key: "Ended",       match: (s: string) => s === "AUCTION_ENDED" },
  { key: "Failed",      match: (s: string) => s === "QC_FAILED" },
];

function fmtBDT(n: number) {
  if (n >= 100000) return "৳ " + (n / 100000).toFixed(1) + "L";
  return "৳ " + n.toLocaleString("en-IN");
}

function fmtCountdown(endsAt: string | null, status: string): { text: string; urgent: boolean } {
  if (!endsAt) return { text: "—", urgent: false };
  const d = new Date(endsAt);
  const now = new Date();
  if (status !== "LIVE") return { text: d.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }), urgent: false };
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return { text: "Ended", urgent: false };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const text = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return { text, urgent: h < 2 };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminAuctionsPage() {
  const [lots, setLots]       = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]   = useState("All");
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [acting, setActing]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    fetch("/api/admin/auctions")
      .then((r) => r.json())
      .then((data) => setLots(data))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  async function forceEnd(lot: Lot) {
    if (!confirm(`Force-end auction for ${lot.lotCode}?`)) return;
    setActing(lot.id);
    await fetch(`/api/admin/auctions/${lot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AUCTION_ENDED" }),
    });
    setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, status: "AUCTION_ENDED" } : l));
    setActing(null);
  }

  async function makeLive(lot: Lot) {
    if (!confirm(`Make ${lot.lotCode} live now?`)) return;
    setActing(lot.id);
    await fetch(`/api/admin/auctions/${lot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "LIVE" }),
    });
    setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, status: "LIVE" } : l));
    setActing(null);
  }

  // Counts for filter tabs
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of FILTERS) c[f.key] = lots.filter((l) => f.match(l.status)).length;
    return c;
  }, [lots]);

  const filtered = useMemo(() =>
    lots.filter((l) => {
      const f = FILTERS.find((f) => f.key === filter);
      if (f && !f.match(l.status)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.lotCode.toLowerCase().includes(q) ||
        l.seller.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.hubId.toLowerCase().includes(q)
      );
    }),
    [lots, filter, search]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const liveCount    = counts["Live"] ?? 0;
  const qcCount      = counts["QC Pending"] ?? 0;
  const upcomingCount = counts["Upcoming"] ?? 0;
  const endedCount   = counts["Ended"] ?? 0;
  const totalBids    = lots.reduce((s, l) => s + l.bids, 0);

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-900">Auction Control</h1>
          <p className="text-slate-500 text-sm">
            {loading ? "Loading…" : `${lots.length} lots · ${totalBids} total bids`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Live Now",     value: liveCount,    Icon: Gavel,        bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
          { label: "QC Pending",   value: qcCount,      Icon: Clock,        bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-100" },
          { label: "Upcoming",     value: upcomingCount, Icon: TrendingUp,   bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
          { label: "Ended",        value: endedCount,   Icon: CheckCircle2, bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200" },
          { label: "Total Bids",   value: totalBids,    Icon: TrendingUp,   bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-100" },
        ].map(({ label, value, Icon, bg, text, border }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} className={text} />
              <span className={`text-xs font-semibold ${text}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold ${text}`}>
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-current opacity-20" /> : value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Search + filter ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search lot, seller, category, hub…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none ring-indigo-100 focus:ring-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                filter === f.key
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.key}
              {!loading && counts[f.key] > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === f.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lot cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-14 text-center text-slate-400 shadow-sm">
          <Gavel size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No lots found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((l) => {
            const st = STATUS_MAP[l.status] ?? { label: l.status, dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border-slate-200" };
            const { text: countdown, urgent } = fmtCountdown(l.auctionEndsAt, l.status);
            const isOpen = expanded === l.id;

            return (
              <div
                key={l.id}
                className={`rounded-2xl border bg-white shadow-sm transition-all ${
                  isOpen ? "border-indigo-200 ring-1 ring-indigo-100" : "border-slate-100 hover:border-slate-200"
                }`}
              >
                {/* Card row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : l.id)}
                  className="w-full text-left px-5 py-4"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

                    {/* Photo thumbnail */}
                    <div className="flex-shrink-0 h-11 w-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      {l.photoUrl ? (
                        <img src={l.photoUrl} alt={l.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package size={18} className="text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Status dot + lot code */}
                    <div className="flex items-center gap-2 min-w-[110px]">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${st.dot} ${l.status === "LIVE" ? "animate-pulse" : ""}`} />
                      <span className="font-mono text-xs font-semibold text-slate-400">{l.lotCode}</span>
                    </div>

                    {/* Title + category */}
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-semibold text-slate-900 truncate max-w-[280px]">{l.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{l.quantity} {l.unit} · {l.category}</p>
                    </div>

                    {/* Seller */}
                    <div className="hidden sm:flex flex-col min-w-[120px]">
                      <span className="text-xs text-slate-400">Seller</span>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{l.seller}</span>
                    </div>

                    {/* Hub */}
                    <div className="hidden lg:flex flex-col min-w-[110px]">
                      <span className="text-xs text-slate-400">Hub</span>
                      <span className="text-sm text-slate-600 truncate max-w-[120px]">{l.hubId || "—"}</span>
                    </div>

                    {/* Base price */}
                    <div className="flex flex-col min-w-[80px]">
                      <span className="text-xs text-slate-400">Base</span>
                      <span className="text-sm font-bold text-slate-900">{fmtBDT(l.basePrice)}</span>
                    </div>

                    {/* Bids */}
                    <div className="flex flex-col items-center min-w-[50px]">
                      <span className="text-xs text-slate-400">Bids</span>
                      <span className={`text-sm font-bold ${l.bids > 0 ? "text-indigo-600" : "text-slate-400"}`}>{l.bids}</span>
                    </div>

                    {/* Time / countdown */}
                    <div className="flex flex-col min-w-[90px]">
                      <span className="text-xs text-slate-400">{l.status === "LIVE" ? "Ends In" : "Date"}</span>
                      <span className={`text-sm font-semibold ${urgent ? "text-red-500 animate-pulse" : "text-slate-700"}`}>
                        {countdown}
                      </span>
                    </div>

                    {/* Status badge */}
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.badge}`}>
                      {st.label}
                    </span>

                    {/* Chevron */}
                    <span className="ml-auto text-slate-400">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-5">

                    {/* Photo strip */}
                    {l.photoUrl && (
                      <div className="flex gap-2">
                        <img
                          src={l.photoUrl}
                          alt={l.title}
                          className="h-28 w-28 rounded-2xl object-cover border border-slate-100 shadow-sm"
                        />
                      </div>
                    )}

                    {/* Lifecycle tracker */}
                    <LotLifecycleTracker lotStatus={l.status} />

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {[
                        { Icon: Tag,        label: "Category",    val: l.category },
                        { Icon: Package,    label: "Quantity",    val: `${l.quantity} ${l.unit}` },
                        { Icon: Building2,  label: "Hub",         val: l.hubId || "—" },
                        { Icon: Phone,      label: "Seller Phone",val: l.sellerPhone || "—" },
                        { Icon: TrendingUp, label: "Base Price",  val: fmtBDT(l.basePrice) },
                        { Icon: TrendingUp, label: "Min Bid Rate",val: l.minBidRate ? fmtBDT(l.minBidRate) + "/kg" : "—" },
                        { Icon: Clock,      label: "Auction Ends",val: l.auctionEndsAt ? fmtDate(l.auctionEndsAt) : "—" },
                        { Icon: Gavel,      label: "Sale Type",   val: l.saleType === "FIXED_PRICE" ? "Fixed Price" : "Auction" },
                      ].map(({ Icon, label, val }) => (
                        <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={12} className="text-slate-400" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Admin actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Admin Actions</span>

                      {l.status === "LIVE" && (
                        <button
                          type="button"
                          disabled={acting === l.id}
                          onClick={() => forceEnd(l)}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <Ban size={13} />
                          {acting === l.id ? "Working…" : "Force End"}
                        </button>
                      )}

                      {l.status === "QC_PASSED" && (
                        <button
                          type="button"
                          disabled={acting === l.id}
                          onClick={() => makeLive(l)}
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Zap size={13} />
                          {acting === l.id ? "Working…" : "Make Live"}
                        </button>
                      )}

                      {l.status === "AUCTION_ENDED" && l.bids === 0 && (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-400">
                          No bids — Unsold
                        </span>
                      )}

                      {l.status === "AUCTION_ENDED" && l.bids > 0 && (
                        <span className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700">
                          {l.bids} bid{l.bids !== 1 ? "s" : ""} placed
                        </span>
                      )}

                      {["IN_QC", "QC_SUBMITTED"].includes(l.status) && (
                        <span className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600">
                          Awaiting QC decision
                        </span>
                      )}

                      {l.verdict && (
                        <span className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                          l.verdict === "PASS"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-600"
                        }`}>
                          QC Verdict: {l.verdict}
                        </span>
                      )}

                      <span className="ml-auto text-xs text-slate-400">Added {fmtDate(l.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-2" />
    </div>
  );
}
