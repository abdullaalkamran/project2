"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gavel,
  LayoutGrid,
  Minus,
  Search,
  SlidersHorizontal,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/Pagination";
import { type Product } from "@/lib/products";
import api from "@/lib/api";
import type { CMSContent } from "@/lib/cms";
import { DEFAULT_CMS } from "@/lib/cms";

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

/* ─── banner carousel ───────────────────────────────────────────────────────── */

type BannerSlot = { image: string; title: string; subtitle: string; link: string; label: string };

function buildBanners(mb: CMSContent["marketplaceBanner"]): BannerSlot[] {
  return ([
    { enabled: mb.b1Enabled === "true", image: mb.b1Image, title: mb.b1Title, subtitle: mb.b1Subtitle, link: mb.b1Link, label: mb.b1Label },
    { enabled: mb.b2Enabled === "true", image: mb.b2Image, title: mb.b2Title, subtitle: mb.b2Subtitle, link: mb.b2Link, label: mb.b2Label },
    { enabled: mb.b3Enabled === "true", image: mb.b3Image, title: mb.b3Title, subtitle: mb.b3Subtitle, link: mb.b3Link, label: mb.b3Label },
  ] as (BannerSlot & { enabled: boolean })[]).filter((b) => b.enabled && b.image);
}

function BannerCarousel({ banners }: { banners: BannerSlot[] }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = (idx: number) => {
    setActive(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive((p) => (p + 1) % banners.length), 5000);
  };

  useEffect(() => {
    if (banners.length < 2) return;
    timerRef.current = setTimeout(() => setActive((p) => (p + 1) % banners.length), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [banners.length]);

  if (banners.length === 0) return null;

  const b = banners[active];

  const slideContent = (
    <>
      <img
        src={b.image}
        alt={b.title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
      {(b.title || b.subtitle || (b.link && b.label)) && (
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8">
          {b.title && (
            <p className="text-xl font-bold text-white drop-shadow sm:text-2xl">{b.title}</p>
          )}
          {b.subtitle && (
            <p className="mt-1 max-w-sm text-sm text-white/85 drop-shadow">{b.subtitle}</p>
          )}
          {b.link && b.label && (
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900 shadow transition group-hover:bg-emerald-50">
              {b.label} <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
      {b.link ? (
        <Link href={b.link} className="relative block h-48 w-full group sm:h-60">{slideContent}</Link>
      ) : (
        <div className="relative h-48 w-full group sm:h-60">{slideContent}</div>
      )}

      {/* nav arrows (only if multiple banners) */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => reset((active - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => reset((active + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
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
  const [banners,  setBanners]  = useState<BannerSlot[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [search,   setSearch]   = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState("all");
  const [hub,      setHub]      = useState("all");
  const [status,   setStatus]   = useState("all");
  const [quantity, setQuantity] = useState("all");
  const [sort,     setSort]     = useState("newest");
  const [page,     setPage]     = useState(1);

  /* load products + CMS banners */
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

    fetch("/api/cms")
      .then((r) => r.json())
      .then((data: CMSContent) => setBanners(buildBanners(data.marketplaceBanner ?? DEFAULT_CMS.marketplaceBanner)))
      .catch(() => {/* banners stay empty */});
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

  const [filtersOpen, setFiltersOpen] = useState(false);

  const resetAll = () => {
    setSearch(""); setCategory("all"); setHub("all");
    setStatus("all"); setQuantity("all"); setSort("newest");
    setFiltersOpen(false);
  };

  const activeFilterCount = [hub !== "all", status !== "all", quantity !== "all", sort !== "newest"].filter(Boolean).length;

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

        {/* Promo banner carousel */}
        {banners.length > 0 && (
          <div className="mt-5">
            <BannerCarousel banners={banners} />
          </div>
        )}

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

      {/* Filter bar — sticky. Collapses to icon-only pill when scrolled. */}
      <section className={`sticky top-16 z-10 overflow-hidden transition-all duration-200 border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm ${
        scrolled && !filtersOpen ? "w-fit ml-auto rounded-full shadow-md" : "rounded-2xl"
      }`}>

        {/* ── Collapsed row (icon pill) when scrolled ── */}
        {scrolled && (
          <button
            type="button"
            onClick={() => setFiltersOpen((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition ${
              filtersOpen || activeFilterCount > 0 ? "text-emerald-700" : "text-slate-600"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            {search && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
          </button>
        )}

        {/* ── Full filter row when NOT scrolled ── */}
        {!scrolled && (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-100"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORY_TABS.map((tab) => (
                <button key={tab.value} type="button" onClick={() => setCategory(tab.value)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    category === tab.value ? "bg-emerald-500 text-white shadow-sm" : "border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setFiltersOpen((p) => !p)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                filtersOpen || activeFilterCount > 0 ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{activeFilterCount}</span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}

        {/* ── Expandable panel — shown in BOTH states when filtersOpen ── */}
        {filtersOpen && (
          <div className="border-t border-slate-100 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select value={hub} onChange={(e) => setHub(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400">
                  <option value="all">All Hubs</option>
                  {HUB_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400">
                  <option value="all">All Modes</option>
                  <option value="live">Live Auction</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="fixed">Fixed Price</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400">
                  <option value="all">Any Qty</option>
                  <option value="small">≤ 500 kg</option>
                  <option value="medium">500–2000 kg</option>
                  <option value="bulk">2000+ kg</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400">
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price ↑</option>
                  <option value="price_desc">Price ↓</option>
                  <option value="bids">Most Bids</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
              {chips.map((chip) => (
                <button key={chip.key} type="button" onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                  {chip.label} <X className="h-3 w-3" />
                </button>
              ))}
              {activeFilterCount > 0 && (
                <button type="button" onClick={resetAll} className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-600">
                  Clear all
                </button>
              )}
            </div>
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
