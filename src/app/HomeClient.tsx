"use client";

import Image from "next/image";
import Link from "next/link";
import { Apple, ArrowDown, ArrowRight, ArrowUp, Flame, Gavel, Leaf, MapPin, Package, ShieldCheck, Star, Truck, Users, Wheat, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import type { CMSContent } from "@/lib/cms";
import api from "@/lib/api";

type PriceTick = { product: string; price: number; change: number; dir: "up" | "down"; range: [number, number] };

const INITIAL_PRICES: PriceTick[] = [
  { product: "Tomato",  price: 17.50,  change: 2.3,  dir: "up",   range: [16.8, 18.1] },
  { product: "Potato",  price: 14.25,  change: 1.8,  dir: "up",   range: [13.5, 14.8] },
  { product: "Onion",   price: 26.75,  change: -0.5, dir: "down", range: [26.5, 27.2] },
];

const ACTIVITY = [
  "Fresh Tomato · LOT L2026-001 · New bid placed",
  "Miniket Rice · LOT L2026-007 · 6 active bidders",
  "Organic Ginger · LOT L2026-012 · Reserve met",
  "Golden Onion · LOT L2026-003 · Auction starts soon",
];

const STAT_TARGETS = [
  { label: "Live Auctions",  target: 12,   suffix: "",  icon: Gavel,   desc: "running right now",   color: "text-emerald-600" },
  { label: "Products",       target: 240,  suffix: "+", icon: Package,  desc: "across all hubs",     color: "text-sky-600" },
  { label: "Trading Hubs",   target: 18,   suffix: "",  icon: MapPin,   desc: "across Bangladesh",   color: "text-violet-600" },
  { label: "Active Sellers", target: 1200, suffix: "+", icon: Users,    desc: "verified & trusted",  color: "text-amber-600" },
  { label: "Active Buyers", target: 8500, suffix: "+", icon: ShieldCheck, desc: "registered buyers", color: "text-rose-600" },
];

const HERO_BG_THEMES: Record<string, string> = {
  "light-green": "bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-50",
  "white":        "bg-white",
  "sky":          "bg-gradient-to-br from-sky-50 via-blue-50 to-sky-50",
  "amber":        "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50",
  "rose":         "bg-gradient-to-br from-rose-50 via-pink-50 to-rose-50",
  "slate":        "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50",
  "dark":         "bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900",
};

type Category = { key: string; title: string; copy: string; icon: React.ElementType; color: string; bg: string; glow: string };

const categories: Category[] = [
  { key: "vegetable", title: "Vegetables", copy: "Fresh & quality verified",  icon: Leaf,   color: "text-emerald-700", bg: "bg-emerald-100", glow: "bg-emerald-200/70" },
  { key: "fruit",     title: "Fruits",     copy: "Seasonal & premium",         icon: Apple,  color: "text-rose-600",    bg: "bg-rose-100",    glow: "bg-rose-200/70" },
  { key: "grain",     title: "Grains",     copy: "Certified quality",          icon: Wheat,  color: "text-amber-700",  bg: "bg-amber-100",  glow: "bg-amber-200/70" },
  { key: "spice",     title: "Spices",     copy: "Authentic & pure",           icon: Flame,  color: "text-orange-700", bg: "bg-orange-100", glow: "bg-orange-200/70" },
];

type TrustPoint = { key: string; title: string; copy: string; detail: string; icon: React.ElementType; color: string; bg: string; stat: string; statLabel: string };

const trustPoints: TrustPoint[] = [
  {
    key: "qc",
    title: "QC Verified",
    copy: "Every product passes rigorous quality checks before auction.",
    detail: "Our certified inspectors grade each lot for freshness, weight, and purity. Only verified produce reaches the bidding floor — protecting buyers from substandard goods.",
    icon: ShieldCheck,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    stat: "99.2%",
    statLabel: "verification pass rate",
  },
  {
    key: "pricing",
    title: "Live Pricing",
    copy: "Real-time market rates with fully transparent bidding.",
    detail: "Every bid is broadcast live to all participants. No hidden premiums, no post-auction price changes. You always know exactly what you're paying and why.",
    icon: Zap,
    color: "text-sky-600",
    bg: "bg-sky-100",
    stat: "< 200ms",
    statLabel: "average bid latency",
  },
  {
    key: "logistics",
    title: "Managed Logistics",
    copy: "End-to-end delivery with real-time tracking and insurance.",
    detail: "From farm to warehouse, we coordinate pickups, cold-chain storage, and last-mile delivery across 18 hubs. Every shipment is insured and GPS-tracked.",
    icon: Truck,
    color: "text-violet-600",
    bg: "bg-violet-100",
    stat: "18 hubs",
    statLabel: "across Bangladesh",
  },
  {
    key: "payment",
    title: "Secure Payment",
    copy: "Escrow-based wallet system — funds held until delivery confirmed.",
    detail: "Buyer funds are locked in escrow at bid time and released to the seller only after delivery confirmation. Both parties are protected at every step.",
    icon: Gavel,
    color: "text-amber-600",
    bg: "bg-amber-100",
    stat: "৳0 fraud",
    statLabel: "reported in 2025",
  },
];

export default function Home({ cms }: { cms: CMSContent }) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [prices, setPrices] = useState<PriceTick[]>(INITIAL_PRICES);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [activeBidders, setActiveBidders] = useState(142);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [statVals, setStatVals] = useState(STAT_TARGETS.map(() => 0));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTrust, setActiveTrust] = useState<string>("qc");
  const [products, setProducts] = useState<Product[]>([]);

  // Fetch real products from the marketplace API
  useEffect(() => {
    api.get<Product[]>("/api/marketplace/products")
      .then((rows) => setProducts(rows))
      .catch(() => setProducts([]));
  }, []);

  const liveAuctions = useMemo(() => {
    // Show live products first, then all available products as featured
    const live = products.filter((p) => p.status === "live");
    return live.length > 0 ? live : products.slice(0, 6);
  }, [products]);

  useEffect(() => {
    const loggedIn = typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true";
    if (loggedIn) {
      const role = (localStorage.getItem("userRole") as "buyer" | "seller") || "buyer";
      router.replace(role === "seller" ? "/seller-dashboard" : "/buyer-dashboard");
    } else {
      setShowContent(true);
    }
  }, [router]);

  // Animate prices every 2.5s
  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * 3);
      const delta = +(Math.random() * 0.6 - 0.3).toFixed(2);
      setPrices((prev) =>
        prev.map((p, i) =>
          i === idx
            ? { ...p, price: +(p.price + delta).toFixed(2), change: +(p.change + delta * 0.4).toFixed(1), dir: delta >= 0 ? "up" : "down" }
            : p
        )
      );
      setActiveBidders((prev) => Math.max(100, Math.min(220, prev + Math.floor(Math.random() * 7) - 3)));
      setFlashIdx(idx);
      setTimeout(() => setFlashIdx(null), 700);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Rotate activity ticker
  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % ACTIVITY.length), 3200);
    return () => clearInterval(id);
  }, []);

  // Stat count-up on mount
  useEffect(() => {
    let step = 0;
    const steps = 40;
    const id = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setStatVals(STAT_TARGETS.map((s) => Math.round(s.target * ease)));
      if (step >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, []);

  const catsWithCms = categories.map((c) => ({
    ...c,
    title: ({ vegetable: cms.categories.vegetableTitle, fruit: cms.categories.fruitTitle, grain: cms.categories.grainTitle, spice: cms.categories.spiceTitle } as Record<string, string>)[c.key] ?? c.title,
    copy:  ({ vegetable: cms.categories.vegetableCopy,  fruit: cms.categories.fruitCopy,  grain: cms.categories.grainCopy,  spice: cms.categories.spiceCopy  } as Record<string, string>)[c.key] ?? c.copy,
  }));

  const trustWithCms = trustPoints.map((p) => ({
    ...p,
    title:     ({ qc: cms.whyPaikari.qcTitle,     pricing: cms.whyPaikari.pricingTitle,     logistics: cms.whyPaikari.logisticsTitle,     payment: cms.whyPaikari.paymentTitle     } as Record<string, string>)[p.key] ?? p.title,
    copy:      ({ qc: cms.whyPaikari.qcCopy,      pricing: cms.whyPaikari.pricingCopy,      logistics: cms.whyPaikari.logisticsCopy,      payment: cms.whyPaikari.paymentCopy      } as Record<string, string>)[p.key] ?? p.copy,
    detail:    ({ qc: cms.whyPaikari.qcDetail,    pricing: cms.whyPaikari.pricingDetail,    logistics: cms.whyPaikari.logisticsDetail,    payment: cms.whyPaikari.paymentDetail    } as Record<string, string>)[p.key] ?? p.detail,
    stat:      ({ qc: cms.whyPaikari.qcStat,      pricing: cms.whyPaikari.pricingStat,      logistics: cms.whyPaikari.logisticsStat,      payment: cms.whyPaikari.paymentStat      } as Record<string, string>)[p.key] ?? p.stat,
    statLabel: ({ qc: cms.whyPaikari.qcStatLabel, pricing: cms.whyPaikari.pricingStatLabel, logistics: cms.whyPaikari.logisticsStatLabel, payment: cms.whyPaikari.paymentStatLabel } as Record<string, string>)[p.key] ?? p.statLabel,
  }));

  if (!showContent) return null;

  return (
    <div className="flex flex-col gap-12">
      <section
        className={`relative -mt-10 left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-emerald-200/60 ${HERO_BG_THEMES[cms.hero.heroBg ?? "light-green"] ?? HERO_BG_THEMES["light-green"]} min-h-[calc(100vh-5.5rem)] px-4 py-8 shadow-xl sm:-mt-12 sm:min-h-[calc(100vh-6rem)] sm:px-8 sm:py-10 lg:px-16`}
        style={cms.hero.heroBgImage ? { backgroundImage: `url(${cms.hero.heroBgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {cms.hero.heroBgImage && <div aria-hidden className="absolute inset-0 bg-white/72" />}
        <div aria-hidden className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/4 rounded-full bg-lime-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-12 h-96 w-96 rounded-full bg-teal-300/25 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-7.5rem)] max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-6 lg:space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {cms.hero.badge}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                <Users className="h-3.5 w-3.5 text-emerald-300" />
                <span className="tabular-nums text-emerald-300">{activeBidders}</span>
                traders online
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-[43px]">
                {cms.hero.headline}
                <span className="mt-1 block bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {cms.hero.headlineAccent}
                </span>
              </h1>
              <p className="max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
                {cms.hero.subheadline}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/live"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                {cms.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {cms.hero.ctaSecondary}
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200/80 bg-white/80 p-4 backdrop-blur-sm">
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                </div>
                <p className="text-xs font-semibold text-slate-900">{cms.hero.pill1Title}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{cms.hero.pill1Desc}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200/80 bg-white/80 p-4 backdrop-blur-sm">
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Zap className="h-4 w-4 text-emerald-700" />
                </div>
                <p className="text-xs font-semibold text-slate-900">{cms.hero.pill2Title}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{cms.hero.pill2Desc}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200/80 bg-white/80 p-4 backdrop-blur-sm">
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Truck className="h-4 w-4 text-emerald-700" />
                </div>
                <p className="text-xs font-semibold text-slate-900">{cms.hero.pill3Title}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{cms.hero.pill3Desc}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/90 p-5 shadow-lg backdrop-blur-md sm:p-6">
            <div className="absolute right-0 top-0 h-28 w-28 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-300/30 blur-2xl" />
            <div className="relative flex items-start justify-between border-b border-emerald-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">{cms.hero.trackerLabel}</p>
                <p className="text-xl font-bold text-slate-900">{cms.hero.trackerTitle}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-lime-500" />
                Live
              </span>
            </div>

            <div className="relative mt-4 space-y-2.5">
              {prices.map((p, idx) => (
                <div
                  key={p.product}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-emerald-100 px-3 py-2.5 transition ${
                    flashIdx === idx ? "bg-emerald-50" : "bg-white/70"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">{p.product}</p>
                    <p className="text-[11px] text-slate-500">24h: ৳{p.range[0].toFixed(2)} - ৳{p.range[1].toFixed(2)}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-slate-900">৳{p.price.toFixed(2)}</p>
                  <p className={`flex items-center text-xs font-semibold ${p.dir === "up" ? "text-lime-600" : "text-rose-500"}`}>
                    {p.dir === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {p.dir === "up" ? "+" : ""}{p.change.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-100/70 px-3 py-2.5">
              <span className="shrink-0 rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Activity
              </span>
              <span key={tickerIdx} className="min-w-0 truncate text-xs text-slate-700">
                {ACTIVITY[tickerIdx]}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-emerald-700" />
                <span className="font-semibold tabular-nums text-slate-900">{activeBidders}</span> active bidders
              </span>
              <Link href="/marketplace" className="font-semibold text-emerald-700 hover:text-emerald-800">
                View marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
          {STAT_TARGETS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="group flex flex-col items-center gap-3 px-5 py-8 text-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`text-3xl font-bold tabular-nums ${stat.color}`}>
                    {stat.target >= 1000
                      ? `${((statVals[i] ?? 0) / 1000).toFixed(1)}K${stat.suffix}`
                      : `${statVals[i] ?? 0}${stat.suffix}`}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800">{stat.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{stat.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-bold text-slate-900">{cms.categories.heading}</h2>
            <p className="text-slate-500">{cms.categories.subheading}</p>
          </div>

          {/* Category tabs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catsWithCms.map((cat) => {
              const Icon = cat.icon;
              const items = products.filter((p) => p.category === cat.key);
              const liveCount = items.filter((p) => p.status === "live").length;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(isActive ? null : cat.key)}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-center transition-all duration-200 ${
                    isActive
                      ? "border-emerald-200 bg-emerald-50 shadow-md"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {isActive && (
                    <div aria-hidden className={`pointer-events-none absolute inset-0 ${cat.glow} blur-xl`} />
                  )}
                  <div className="relative flex flex-col items-center text-center">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${cat.bg} ${cat.color} mb-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{cat.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{cat.copy}</p>
                      </div>
                      <ArrowRight className={`mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200 ${cat.color} ${
                        isActive ? "rotate-90" : "group-hover:translate-x-0.5"
                      }`} />
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                      <span className="font-semibold text-slate-500">{items.length} lots</span>
                      {liveCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                          {liveCount} live
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview panel */}
          {activeCategory && (() => {
            const cat = catsWithCms.find((c) => c.key === activeCategory)!;
            const items = products.filter((p) => p.category === activeCategory).slice(0, 3);
            return (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-sm font-semibold ${cat.color}`}>{cat.title} — top lots</span>
                  <Link
                    href={`/marketplace?category=${activeCategory}`}
                    className={`flex items-center gap-1 text-xs font-semibold ${cat.color} hover:underline`}
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/marketplace?category=${activeCategory}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                        <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">৳{item.price}/kg</p>
                        {item.status === "live" && (
                          <span className="text-[10px] font-bold text-emerald-600">● Live</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="relative">
          {/* Header */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-bold text-slate-900">{cms.whyPaikari.heading}</h2>
            <p className="text-slate-500">{cms.whyPaikari.subheading}</p>
          </div>

          {/* Tab buttons */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustWithCms.map((point) => {
              const Icon = point.icon;
              const isActive = activeTrust === point.key;
              return (
                <button
                  key={point.key}
                  type="button"
                  onClick={() => setActiveTrust(point.key)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 ${
                    isActive
                      ? "border-emerald-200 bg-emerald-50 shadow-md"
                      : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${point.bg} ${point.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-sm font-bold ${ isActive ? "text-slate-900" : "text-slate-600"}`}>{point.title}</span>
                  {isActive && <span className={`h-1 w-8 rounded-full ${point.color.replace("text-", "bg-")}`} />}
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          {(() => {
            const point = trustWithCms.find((p) => p.key === activeTrust)!;
            const Icon = point.icon;
            return (
              <div key={point.key} className="mt-4 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 sm:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <div className={`inline-flex items-center gap-2 rounded-full ${point.bg} px-3 py-1 text-xs font-semibold ${point.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {point.title}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{point.copy}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{point.detail}</p>
                  <Link
                    href="/about"
                    className={`inline-flex items-center gap-1 text-sm font-semibold ${point.color} hover:underline`}
                  >
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className={`flex flex-col items-center justify-center rounded-2xl ${point.bg} px-8 py-6 text-center`}>
                  <span className={`text-3xl font-bold tabular-nums ${point.color}`}>{point.stat}</span>
                  <span className="mt-1 text-xs text-slate-500">{point.statLabel}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="relative flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> {cms.liveAuctions.badge}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{cms.liveAuctions.heading}</h2>
          <p className="text-slate-500">{cms.liveAuctions.subheading}</p>
        </div>
        {liveAuctions.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">No products available yet</p>
            <Link href="/marketplace" className="text-sm font-semibold text-emerald-600 hover:underline">Browse marketplace &rarr;</Link>
          </div>
        ) : (
        <div className="relative mt-6 grid gap-5 md:grid-cols-3">
          {liveAuctions.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50"
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: "inset 0 0 60px 0 rgb(52 211 153 / 0.04)" }} />

              {/* Image wrapper */}
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Top badges */}
                <div className="absolute left-3 top-3 flex gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow backdrop-blur-sm ${
                    item.status === "live" ? "bg-emerald-500/90" : "bg-sky-500/90"
                  }`}>
                    {item.status === "live" ? "● Live" : "● Available"}
                  </span>
                  <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    Grade {item.grade}
                  </span>
                </div>

                {/* Bottom-on-image: lot + hub */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                    {item.lot}
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-sm">
                    <MapPin className="h-2.5 w-2.5 text-emerald-400" /> {item.hub}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-3.5 px-5 py-4">
                {/* Name + trend */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold leading-snug text-slate-900">{item.name}</h3>
                  {item.trend === "up" ? (
                    <span className="mt-0.5 flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      <ArrowUp className="h-3 w-3" /> Up
                    </span>
                  ) : item.trend === "down" ? (
                    <span className="mt-0.5 flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                      <ArrowDown className="h-3 w-3" /> Down
                    </span>
                  ) : null}
                </div>

                {/* Price row */}
                <div className="flex items-end justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold tabular-nums text-slate-900">৳{item.price}</span>
                    <span className="text-xs text-slate-400">/kg</span>
                    {item.originalPrice > item.price && (
                      <span className="ml-1 text-xs text-slate-500 line-through">৳{item.originalPrice}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-700">{item.rating}</span>
                  </div>
                </div>

                {/* Seller + qty */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-slate-500" /> {item.seller}
                  </span>
                  <span>{item.qty.toLocaleString()} kg available</span>
                </div>

                {/* Bid activity bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Gavel className="h-3 w-3 text-emerald-400" />
                      <span className="font-semibold text-slate-700">{item.bids}</span> bids
                    </span>
                    {item.endsIn && (
                      <span className="flex items-center gap-1 font-semibold text-amber-600">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                        Ends {item.endsIn}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
                      style={{ width: `${Math.min(100, (item.bids / 200) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex gap-2.5 pt-0.5">
                  <Link
                    href={`/product-details/${item.lot}?name=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.image)}&seller=${encodeURIComponent(item.seller)}&price=${item.price}`}
                    className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
                  >
                    {cms.liveAuctions.ctaBid}
                  </Link>
                  <Link
                    href={`/product-details/${item.lot}?name=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.image)}&seller=${encodeURIComponent(item.seller)}&price=${item.price}`}
                    className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                  >
                    {cms.liveAuctions.ctaView}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white shadow-sm sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{cms.newsletter.heading}</h2>
            <p className="text-emerald-50">{cms.newsletter.subheading}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-white/30">
              <span className="text-lg font-semibold">@</span>
              <input
                type="email"
                placeholder={cms.newsletter.placeholder}
                className="w-full bg-transparent text-sm text-white placeholder:text-emerald-100 focus:outline-none"
              />
            </div>
            <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100">
              {cms.newsletter.buttonText}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
