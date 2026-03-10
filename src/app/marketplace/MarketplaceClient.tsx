"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Gavel,
  LayoutGrid,
  Minus,
  SlidersHorizontal,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import { type Product } from "@/lib/products";
import api from "@/lib/api";

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function storageType(category: Product["category"]) {
  if (category === "vegetable" || category === "fruit") return "Cold Storage";
  if (category === "grain") return "Dry Warehouse";
  return "Dry Storage";
}

function qtyMatches(qty: number, filter: string) {
  if (filter === "small")  return qty <= 500;
  if (filter === "medium") return qty > 500 && qty <= 2000;
  if (filter === "bulk")   return qty > 2000;
  return true;
}

function TrendIcon({ trend }: { trend: Product["trend"] }) {
  if (trend === "up")   return <TrendingUp   className="h-3 w-3" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

/** Returns "mm:ss" remaining or null if time has passed / no date */
function useCountdown(isoDate: string | null | undefined) {
  const [remaining, setRemaining] = useState<string | null>(null);
  useEffect(() => {
    if (!isoDate) return;
    const tick = () => {
      const diff = new Date(isoDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ended"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [isoDate]);
  return remaining;
}

const CATEGORY_TABS = [
  { value: "all",       label: "All" },
  { value: "vegetable", label: "Vegetables" },
  { value: "fruit",     label: "Fruits" },
  { value: "grain",     label: "Grains" },
  { value: "spice",     label: "Spices" },
];

const HUB_OPTIONS = ["Bogura", "Dhaka", "Jessore", "Rangpur"];

const PRODUCTS_PER_PAGE = 8;

/* ─── card ──────────────────────────────────────────────────────────────────── */

function ProductCard({ item, onClickCard, onClickAuction }: {
  item: Product;
  onClickCard: (p: Product) => void;
  onClickAuction: (p: Product) => void;
}) {
  const countdown = useCountdown(item.status === "live" ? item.auctionEndsAt : null);
  const discount   = Math.max(0, Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100));
  const isSoldOut  = item.soldOut === true;

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        isSoldOut
          ? "cursor-default border-slate-100 opacity-70"
          : "cursor-pointer border-slate-200 hover:-translate-y-1 hover:shadow-md"
      }`}
      onClick={() => {
        if (isSoldOut) return;
        if (item.status === "live") onClickAuction(item);
        else onClickCard(item);
      }}
    >
      {/* Image */}
      <div className="relative h-44 w-full">
        {item.image.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            className={`h-full w-full object-cover ${isSoldOut ? "grayscale" : ""}`}
          />
        ) : (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={`object-cover ${isSoldOut ? "grayscale" : ""}`}
          />
        )}

        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <span className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold text-white shadow">Sold Out</span>
          </div>
        )}

        {/* Grade + QC */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
            Grade {item.grade}
          </span>
          <span className="rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white">QC ✓</span>
        </div>

        {/* Status badge */}
        {!isSoldOut && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
            {item.status === "live" && (
              <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                ● Live
              </span>
            )}
            {item.status === "upcoming" && (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                Upcoming
              </span>
            )}
            {item.status === "fixed" && (
              <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                Fixed Price
              </span>
            )}
            {/* Countdown for live auctions */}
            {item.status === "live" && countdown && (
              <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                {countdown}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2">
        {/* Name + price */}
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-sm font-bold text-slate-900">{item.name}</h2>
          <div className="flex shrink-0 items-baseline gap-1">
            <span className="text-sm font-bold text-slate-900">৳{item.price}</span>
            <span className="text-[10px] text-slate-400">/kg</span>
          </div>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 line-through">৳{item.originalPrice}/kg</span>
            <span className="text-[10px] font-bold text-rose-500">−{discount}%</span>
          </div>
        )}

        {/* Free qty offer badge */}
        {item.freeQtyEnabled && (item.freeQtyPer ?? 0) > 0 && (item.freeQtyAmount ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span>Free {item.freeQtyAmount} {item.freeQtyUnit} per {item.freeQtyPer} {item.freeQtyUnit} ordered</span>
          </div>
        )}

        {/* Stock bar + info */}
        {item.qty > 0 && ((item.soldQty ?? 0) > 0 || (item.pendingQty ?? 0) > 0) && (
          <div className="space-y-1">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${Math.min(100, ((item.soldQty ?? 0) / item.qty) * 100)}%` }}
              />
              <div
                className="h-full bg-amber-400"
                style={{
                  width: `${Math.min(
                    100 - ((item.soldQty ?? 0) / item.qty) * 100,
                    ((item.pendingQty ?? 0) / item.qty) * 100,
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                {(item.soldQty ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {item.soldQty} sold
                  </span>
                )}
                {(item.pendingQty ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {item.pendingQty} pending
                  </span>
                )}
              </div>
              <span className="text-slate-400">{item.availableQty ?? item.qty - (item.soldQty ?? 0)} left</span>
            </div>
          </div>
        )}

        {/* Storage + location */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
            {item.storageType || storageType(item.category)}
          </span>
          <span className="text-slate-300">·</span>
          <span>{item.hub} Hub</span>
        </div>

        {/* Trend tag — only if non-stable */}
        {item.trend !== "stable" && (
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              item.trend === "up" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            <TrendIcon trend={item.trend} />
            {item.trend === "up" ? "Rising" : "Falling"}
          </span>
        )}

        {/* CTA */}
        <div className="mt-auto flex items-center gap-2 pt-0.5">
          {isSoldOut ? (
            <button
              type="button"
              disabled
              className="flex-1 cursor-not-allowed rounded-full bg-slate-100 py-2 text-xs font-semibold text-slate-400"
              onClick={(e) => e.stopPropagation()}
            >
              Sold Out
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (item.status === "live") onClickAuction(item);
                else onClickCard(item);
              }}
              className="flex-1 rounded-full bg-emerald-500 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              {item.status === "live" ? "Join auction" : "View"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600"
            title="Set price alert"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────────── */

export default function MarketplacePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [search,   setSearch]   = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState("all");
  const [hub,      setHub]      = useState("all");
  const [status,   setStatus]   = useState("all");
  const [quantity, setQuantity] = useState("all");
  const [sort,     setSort]     = useState("newest");
  const [page,     setPage]     = useState(1);

  /* load products */
  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.get<Product[]>("/api/marketplace/products");
        setProducts(rows);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  /* filter + sort */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let items = products.filter((p) => {
      const matchesTerm  = !term || p.name.toLowerCase().includes(term) || p.hub.toLowerCase().includes(term) || (p.seller ?? "").toLowerCase().includes(term);
      const matchesCat   = category === "all" || p.category === category;
      const matchesHub   = hub === "all" || p.hub === hub;
      const matchesStatus= status === "all" || p.status === status;
      const matchesQty   = qtyMatches(p.qty, quantity);
      return matchesTerm && matchesCat && matchesHub && matchesStatus && matchesQty;
    });

    if (sort === "price_asc")  items = [...items].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") items = [...items].sort((a, b) => b.price - a.price);
    if (sort === "bids")       items = [...items].sort((a, b) => b.bids - a.bids);
    // "newest" keeps API order (already ordered by createdAt desc)

    return items;
  }, [search, category, hub, status, quantity, sort, products]);

  useEffect(() => { setPage(1); }, [filtered]);

  const totalPages     = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  const visibleProducts = filtered.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  /* stats */
  const totalCount = products.length;
  const liveCount  = products.filter((p) => p.status === "live").length;
  const availCount = products.filter((p) => !p.soldOut).length;

  /* active filter chips */
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (search)       chips.push({ key: "search",   label: `"${search}"`,           clear: () => setSearch("") });
  if (hub !== "all")chips.push({ key: "hub",      label: `Hub: ${hub}`,            clear: () => setHub("all") });
  if (status !== "all") {
    const sLabel = status === "live" ? "Live Auction" : status === "upcoming" ? "Upcoming" : "Fixed Price";
    chips.push({ key: "status", label: sLabel, clear: () => setStatus("all") });
  }
  if (quantity !== "all") {
    const qLabel = quantity === "small" ? "≤500 kg" : quantity === "medium" ? "500–2000 kg" : "2000+ kg";
    chips.push({ key: "qty", label: qLabel, clear: () => setQuantity("all") });
  }

  const resetAll = () => {
    setSearch(""); setCategory("all"); setHub("all");
    setStatus("all"); setQuantity("all"); setSort("newest");
  };

  /* navigation helpers */
  const handleCardClick = (product: Product) => {
    const params = new URLSearchParams({
      name: product.name,
      price: product.price.toString(),
      originalPrice: product.originalPrice.toString(),
      hub: product.hub,
      qty: product.qty.toString(),
      seller: product.seller,
      grade: product.grade,
      lot: product.lot,
      status: product.status,
    });
    if (product.image && !product.image.startsWith("data:") && product.image.length < 500) {
      params.set("image", product.image);
    }
    if (product.sellerId) params.set("sellerId", product.sellerId);
    router.push(`/product-details/${product.id ?? encodeURIComponent(product.name)}?${params.toString()}`);
  };

  const handleJoinAuction = (product: Product) => {
    const params = new URLSearchParams({
      product: product.name,
      price: product.price.toString(),
      hub: product.hub,
      qty: product.qty.toString(),
      bids: product.bids.toString(),
      seller: product.seller,
      grade: product.grade,
      lot: product.lot,
    });
    if (product.image && !product.image.startsWith("data:") && product.image.length < 500) {
      params.set("image", product.image);
    }
    if (product.sellerId) params.set("sellerId", product.sellerId);
    router.push(`/live?${params.toString()}`);
  };

  /* ─── render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6 shadow-sm ring-1 ring-emerald-100 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Marketplace</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-900 text-balance sm:text-4xl">
          QC-verified wholesale lots
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse and purchase QC-verified products directly from trusted sellers.
        </p>

        {/* Stats strip */}
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <LayoutGrid className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Listings</p>
              <p className="text-xl font-bold text-slate-900">{totalCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <Gavel className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Live Auctions</p>
              <p className="text-xl font-bold text-emerald-600">{liveCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <Tag className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Available Now</p>
              <p className="text-xl font-bold text-blue-600">{availCount}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section className="sticky top-20 z-10 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        {/* Row 1: search + sort */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, hubs, sellers…"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-2"
          />

          {/* Sort */}
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-emerald-500"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="bids">Most Bids</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Hub */}
          <div className="relative">
            <select
              value={hub}
              onChange={(e) => setHub(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 px-3 py-2.5 pr-8 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All Hubs</option>
              {HUB_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 px-3 py-2.5 pr-8 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All Modes</option>
              <option value="live">Live Auction</option>
              <option value="upcoming">Upcoming</option>
              <option value="fixed">Fixed Price</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Quantity */}
          <div className="relative">
            <select
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 px-3 py-2.5 pr-8 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">Any Quantity</option>
              <option value="small">≤ 500 kg</option>
              <option value="medium">500–2000 kg</option>
              <option value="bulk">2000+ kg</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Row 2: category tab pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setCategory(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                category === tab.value
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 3: active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Active:</span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-semibold text-slate-400 underline hover:text-slate-600"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            {filtered.length} {filtered.length === 1 ? "product" : "products"} found
          </p>
          <p className="text-xs font-semibold text-slate-500">
            Showing {visibleProducts.length} of {filtered.length}
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white">
                <div className="h-44 bg-slate-100" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 rounded bg-slate-100" />
                  <div className="h-6 w-1/2 rounded bg-slate-100" />
                  <div className="h-3 w-full rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((item) => (
              <ProductCard
                key={item.lot}
                item={item}
                onClickCard={handleCardClick}
                onClickAuction={handleJoinAuction}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No products found.</p>
            <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or search term.</p>
            {chips.length > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="mt-3 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="pt-4"
        />
      </section>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-5 text-sm text-slate-700">
        Need custom sourcing?{" "}
        <Link href="/contact" className="font-semibold text-emerald-700 underline">
          Contact us
        </Link>{" "}
        with your spec sheet.
      </div>
    </div>
  );
}
