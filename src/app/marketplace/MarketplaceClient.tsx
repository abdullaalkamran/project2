"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Minus, Package, Star, TrendingDown, TrendingUp, Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/Pagination";
import { type Product } from "@/lib/products";
import api from "@/lib/api";


const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "vegetable", label: "Vegetables" },
  { value: "fruit", label: "Fruits" },
  { value: "grain", label: "Grains" },
  { value: "spice", label: "Spices" },
];

const statusOptions: Product["status"][] = ["live", "upcoming", "fixed"];
const deliveryOptions: Product["delivery"][] = ["same", "fast", "normal"];

function qtyMatches(qty: number, filter: string) {
  if (filter === "small") return qty <= 500;
  if (filter === "medium") return qty > 500 && qty <= 2000;
  if (filter === "bulk") return qty > 2000;
  return true;
}

function trendLabel(trend: Product["trend"]) {
  if (trend === "up") return "Price Rising";
  if (trend === "down") return "Price Falling";
  return "Price Stable";
}

function TrendIcon({ trend }: { trend: Product["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

const PRODUCTS_PER_PAGE = 8;

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState("all");
  const [hub, setHub] = useState("all");
  const [status, setStatus] = useState("all");
  const [quantity, setQuantity] = useState("all");
  const [delivery, setDelivery] = useState("all");
  const [page, setPage] = useState(1);
  const [hubOptions, setHubOptions] = useState<{ id: string; name: string; location: string }[]>([]);

  // Hero trend controls
  const [heroCategory, setHeroCategory] = useState<Product["category"]>("vegetable");
  const [heroHub, setHeroHub] = useState<string>("all");
  const [heroProduct, setHeroProduct] = useState<string>("all");
  const [trendTimeframe, setTrendTimeframe] = useState("days");
  const [trendMetric, setTrendMetric] = useState("avg");
  const [trendSmooth, setTrendSmooth] = useState(false);
  const [trendCompare, setTrendCompare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.get<Product[]>("/api/marketplace/products");
        setProducts(rows);
      } catch {
        setProducts([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    fetch("/api/marketplace/hubs")
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; name: string; location: string }[]) => setHubOptions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const hubsForCategory = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category === heroCategory) set.add(p.hub);
    });
    return ["all", ...Array.from(set)];
  }, [heroCategory, products]);

  const productsForCategory = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category === heroCategory) set.add(p.name);
    });
    return ["all", ...Array.from(set)];
  }, [heroCategory, products]);

  useEffect(() => {
    if (!hubsForCategory.includes(heroHub)) setHeroHub("all");
    if (!productsForCategory.includes(heroProduct)) setHeroProduct("all");
  }, [hubsForCategory, productsForCategory, heroHub, heroProduct]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = products.filter((p) => {
      const matchesTerm = !term || p.name.toLowerCase().includes(term) || p.hub.toLowerCase().includes(term) || (p.seller ?? "").toLowerCase().includes(term);
      const matchesCat = category === "all" || p.category === category;
      const matchesHub = hub === "all" || p.hub === hub;
      const matchesStatus = status === "all" || p.status === status;
      const matchesDelivery = delivery === "all" || p.delivery === delivery;
      const matchesQty = qtyMatches(p.qty, quantity);
      return matchesTerm && matchesCat && matchesHub && matchesStatus && matchesDelivery && matchesQty;
    });
    return items;
  }, [search, category, hub, status, delivery, quantity, products]);

  useEffect(() => {
    setPage(1);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  const visibleProducts = filtered.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  const readyCount = products.filter((p) => p.status === "live" || p.status === "fixed").length;
  const upcomingCount = products.filter((p) => p.status === "upcoming").length;

  // Hero trend chart drawing (simple canvas line like previous site)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (products.length === 0) return;

    const baseCandidates = products.filter((p) => {
      const matchCat = p.category === heroCategory;
      const matchHub = heroHub === "all" || p.hub === heroHub;
      const matchProduct = heroProduct === "all" || p.name === heroProduct;
      return matchCat && matchHub && matchProduct;
    });
    const baseProduct = baseCandidates[0] || products.find((p) => p.category === heroCategory) || products[0];
    let basePrice = baseProduct?.price || 30;

    const labels: string[] = [];
    const values: number[] = [];

    if (trendTimeframe === "days") {
      for (let i = 6; i >= 0; i -= 1) labels.push(i === 0 ? "Today" : `${i}d ago`);
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const now = new Date();
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(monthNames[d.getMonth()]);
      }
    }

    for (let i = 0; i < labels.length; i += 1) {
      const volatility = Math.max(1, Math.round(basePrice * 0.06));
      const change = Math.round((Math.random() - 0.45) * volatility);
      basePrice = Math.max(5, basePrice + change);
      values.push(basePrice + Math.round(Math.random() * 2 - 1));
    }

    const smoothedValues = trendSmooth
      ? values.map((v, idx, arr) => {
          const start = Math.max(0, idx - 1);
          const end = Math.min(arr.length - 1, idx + 1);
          const slice = arr.slice(start, end + 1);
          return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
        })
      : values;

    const compareValues = trendCompare
      ? smoothedValues.map((v) => Math.max(1, Math.round(v * (0.95 + Math.random() * 0.1))))
      : null;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    const padding = 20;
    const max = Math.max(...smoothedValues, ...(compareValues || smoothedValues));
    const min = Math.min(...smoothedValues, ...(compareValues || smoothedValues));
    const range = max - min || 1;

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i += 1) {
      const y = padding + ((height - padding * 2) * i) / 3;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    const drawSeries = (series: number[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      series.forEach((v, idx) => {
        const x = padding + ((width - padding * 2) * idx) / (series.length - 1 || 1);
        const y = height - padding - ((height - padding * 2) * (v - min)) / range;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = color;
      series.forEach((v, idx) => {
        const x = padding + ((width - padding * 2) * idx) / (series.length - 1 || 1);
        const y = height - padding - ((height - padding * 2) * (v - min)) / range;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawSeries(smoothedValues, "#10b981");
    if (compareValues) drawSeries(compareValues, "rgba(59,130,246,0.6)");

    const points = smoothedValues.map((v, idx) => {
      const x = padding + ((width - padding * 2) * idx) / (smoothedValues.length - 1 || 1);
      const y = height - padding - ((height - padding * 2) * (v - min)) / range;
      return { x, y, v, label: labels[idx] };
    });

    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    tooltip.style.display = "none";
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let nearest: { x: number; y: number; v: number; label: string } | null = null;
      let minDist = Infinity;
      points.forEach((pt) => {
        const dx = pt.x - mx;
        const dy = pt.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          nearest = pt;
        }
      });
      const n = nearest as { x: number; y: number; v: number; label: string } | null;
      if (n && minDist < 28) {
        tooltip.style.display = "block";
        tooltip.style.left = `${n.x + rect.left}px`;
        tooltip.style.top = `${n.y + rect.top}px`;
        tooltip.innerText = `${n.label} — ৳ ${n.v.toLocaleString()}`;
      } else {
        tooltip.style.display = "none";
      }
    };
    canvas.onmouseleave = () => {
      tooltip.style.display = "none";
    };
  }, [heroCategory, heroHub, heroProduct, trendTimeframe, trendMetric, trendSmooth, trendCompare, products]);

  const handleCardClick = (product: Product) => {
    const params = new URLSearchParams({
      name: product.name,
      price: product.price.toString(),
      originalPrice: product.originalPrice.toString(),
      hub: product.hub,
      qty: product.qty.toString(),
      rating: product.rating.toString(),
      seller: product.seller,
      grade: product.grade,
      lot: product.lot,
      delivery: product.delivery,
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
      rating: product.rating.toString(),
      bids: product.bids.toString(),
      seller: product.seller,
      grade: product.grade,
      lot: product.lot,
    });
    // Only pass image if it's a normal external URL — data: URLs are too large for query params (causes 431)
    if (product.image && !product.image.startsWith("data:") && product.image.length < 500) {
      params.set("image", product.image);
    }
    if (product.sellerId) {
      params.set("sellerId", product.sellerId);
    }
    router.push(`/live?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6 shadow-sm ring-1 ring-emerald-100 sm:p-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Marketplace</p>
            <h1 className="text-3xl font-bold leading-tight text-slate-900 text-balance sm:text-4xl lg:text-[38px]">QC-verified wholesale lots</h1>
            <p className="max-w-3xl text-slate-700">
              Browse and purchase QC-verified products directly from trusted sellers. Filters, trend chart, and cards mirror the previous marketplace experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Ready / Fixed</p>
              <p className="text-xl font-bold text-slate-900">{readyCount} lots</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Upcoming</p>
              <p className="text-xl font-bold text-slate-900">{upcomingCount} lots</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                <span>Category</span>
                <select
                  value={heroCategory}
                  onChange={(e) => setHeroCategory(e.target.value as Product["category"])}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {categoryOptions.slice(1).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                <span>Hub</span>
                <select
                  value={heroHub}
                  onChange={(e) => setHeroHub(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {hubsForCategory.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "all" ? "All hubs" : opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                <span>Product</span>
                <select
                  value={heroProduct}
                  onChange={(e) => setHeroProduct(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {productsForCategory.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "all" ? "All products" : opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                <span>View</span>
                <select
                  value={trendTimeframe}
                  onChange={(e) => setTrendTimeframe(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="days">Last 7 days</option>
                  <option value="months">Last 6 months</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                <span>Metric</span>
                <select
                  value={trendMetric}
                  onChange={(e) => setTrendMetric(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="avg">Average Price</option>
                  <option value="median">Median Price</option>
                  <option value="volume">Volume</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={trendSmooth} onChange={(e) => setTrendSmooth(e.target.checked)} /> Smooth
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={trendCompare} onChange={(e) => setTrendCompare(e.target.checked)} /> Compare prev period
              </label>
            </div>
            <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
              <canvas ref={canvasRef} className="h-40 w-full" />
              <div ref={tooltipRef} className="pointer-events-none absolute hidden rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white shadow" />
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-20 z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-2"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={hub}
            onChange={(e) => setHub(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">All Hubs</option>
            {hubOptions.map((h) => (
              <option key={h.id} value={h.name}>{h.name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">All Modes</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "live" ? "Live Auction" : opt === "upcoming" ? "Upcoming" : "Fixed Price"}
              </option>
            ))}
          </select>

          <select
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">Any Quantity</option>
            <option value="small">≤ 500 kg</option>
            <option value="medium">500–2000 kg</option>
            <option value="bulk">2000+ kg</option>
          </select>

          <select
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">Any Delivery</option>
            <option value="same">Same Day</option>
            <option value="fast">24–48 hrs</option>
            <option value="normal">3–5 days</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setHub("all");
              setStatus("all");
              setQuantity("all");
              setDelivery("all");
            }}
            className="rounded-xl border border-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} products match your filters</p>
          <p className="text-xs font-semibold text-slate-500">Showing {visibleProducts.length} of {filtered.length}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((item) => {
            const discount = Math.max(0, Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100));
            const isSoldOut = item.soldOut === true;
            return (
              <div
                key={item.lot}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                  isSoldOut
                    ? "cursor-default border-slate-100 opacity-70"
                    : "cursor-pointer border-slate-200 hover:-translate-y-1 hover:shadow-md"
                }`}
                onClick={() => {
                  if (isSoldOut) return;
                  if (item.status === "live") handleJoinAuction(item);
                  else handleCardClick(item);
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
                  {/* Sold out overlay */}
                  {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
                      <span className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold text-white shadow">
                        Sold Out
                      </span>
                    </div>
                  )}
                  {/* Top-left: grade + QC */}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                      Grade {item.grade}
                    </span>
                    <span className="rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                      QC ✓
                    </span>
                  </div>
                  {/* Top-right: status */}
                  {!isSoldOut && (
                  <div className="absolute right-3 top-3">
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
                  </div>
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  {/* Name + lot number */}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-snug text-slate-900">{item.name}</h2>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">{item.lot}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-slate-900">৳{item.price}</span>
                      <span className="text-sm text-slate-500">/kg</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 line-through">৳{item.originalPrice}/kg</p>
                      {discount > 0 && (
                        <p className="text-xs font-bold text-rose-500">−{discount}%</p>
                      )}
                    </div>
                  </div>

                  {/* Meta: qty + hub */}
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-slate-400" />
                      {item.qty.toLocaleString()} kg
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {item.hub}
                    </span>
                  </div>

                  {/* Stock bar: sold (green) + pending (amber) */}
                  {item.qty > 0 && ((item.soldQty ?? 0) > 0 || (item.pendingQty ?? 0) > 0) && (
                    <div className="space-y-1">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.min(100, ((item.soldQty ?? 0) / item.qty) * 100)}%` }}
                        />
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${Math.min(100 - ((item.soldQty ?? 0) / item.qty) * 100, ((item.pendingQty ?? 0) / item.qty) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {(item.soldQty ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {item.soldQty} sold
                          </span>
                        )}
                        {(item.pendingQty ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                            {item.pendingQty} awaiting seller
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Seller + rating */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-slate-700">{item.seller}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-800">{item.rating}</span>
                      <span className="text-slate-400">({item.bids} bids)</span>
                    </span>
                  </div>

                  {/* Trend + delivery tags */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                        item.trend === "up"
                          ? "bg-rose-50 text-rose-600"
                          : item.trend === "down"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <TrendIcon trend={item.trend} />
                      {trendLabel(item.trend)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      <Truck className="h-3 w-3" />
                      {item.delivery === "same"
                        ? "Same Day"
                        : item.delivery === "fast"
                        ? "24–48 hrs"
                        : "3–5 days"}
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto flex gap-2 pt-1 text-sm font-semibold">
                    {isSoldOut ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 rounded-full bg-slate-100 py-2.5 text-slate-400 cursor-not-allowed"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Sold Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.status === "live") {
                            handleJoinAuction(item);
                          } else {
                            handleCardClick(item);
                          }
                        }}
                        className="flex-1 rounded-full bg-emerald-500 py-2.5 text-white transition hover:bg-emerald-600"
                      >
                        {item.status === "live" ? "Join auction" : "View"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded-full border border-slate-200 py-2.5 text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                    >
                      Alert
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-700">
            No products found. Try adjusting your filters.
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
        Need custom sourcing? <Link href="/contact" className="font-semibold text-emerald-700 underline">Contact us</Link> with your spec sheet.
      </div>
    </div>
  );
}
