"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1518977676601-b53f82aba655";

type Bid = {
  name: string;
  price: number;
  time: string;
  leading: boolean;
};

const MAX_BIDS = 10;

export function LiveClient() {
  const searchParams = useSearchParams();

  // Build gallery from the product image passed via URL param
  const productGallery = useMemo(() => {
    const raw = searchParams.get("image") || FALLBACK_IMAGE;
    const base = raw.split("?")[0];
    return [
      { type: "image" as const, src: `${base}?auto=format&fit=crop&w=800&q=80`, alt: "Product view 1" },
      { type: "image" as const, src: `${base}?auto=format&fit=crop&w=800&q=80&crop=top`, alt: "Product view 2" },
      { type: "image" as const, src: `${base}?auto=format&fit=crop&w=800&q=80&crop=bottom`, alt: "Product view 3" },
      { type: "video" as const, src: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", alt: "Product video" },
    ];
  }, [searchParams]);

  const [selectedMedia, setSelectedMedia] = useState(() => productGallery[0]);

  // Reset to first image whenever the gallery changes (new product navigated to)
  useEffect(() => {
    setSelectedMedia(productGallery[0]);
  }, [productGallery]);

  const [watching, setWatching] = useState(false);
  const [autoBid, setAutoBid] = useState(false);
  const [snipe, setSnipe] = useState(false);
  const [countdown, setCountdown] = useState(180); // seconds
  const [shrinkCard, setShrinkCard] = useState(false);

  const { user } = useAuth();

  const [lotMeta] = useState(() => {
    const title = searchParams.get("product") || "Potatoes | আলু";
    const hub = searchParams.get("hub") || "Dhaka North";
    const qty = Number(searchParams.get("qty")) || 1500;
    const lot = searchParams.get("lot") || "A2026-001";
    const grade = searchParams.get("grade") || "A";
    const seller = searchParams.get("seller") || "Rahim Traders";
    const rating = searchParams.get("rating") || "4.8";
    const sellerId = searchParams.get("sellerId") || "";
    return { title, hub, qty, lot, grade, seller, rating, sellerId };
  });

  // A seller cannot bid on their own product — check by DB user id (reliable) or name fallback
  const isOwnProduct = !!user && (
    (!!lotMeta.sellerId && user.id === lotMeta.sellerId) ||
    (!lotMeta.sellerId && user.name === lotMeta.seller)
  );

  const [bidInput, setBidInput] = useState(0);
  const [step, setStep] = useState(0.25);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [bids, setBids] = useState<Bid[]>(() => {
    const currentPrice = Number(searchParams.get("price")) || 15.67;
    const seed: Bid[] = Array.from({ length: MAX_BIDS }, (_, idx) => {
      const price = Number((currentPrice - idx * 0.12).toFixed(2));
      const time = idx === 0 ? "now" : `${idx * 6}s ago`;
      const name = idx === 0 ? "Rahim Traders" : idx % 2 === 0 ? "Aminur Rahman" : "Sumon Traders";
      return { name, price, time, leading: idx === 0 };
    });
    return seed;
  });

  const currentBid = bids[0]?.price || 0;
  const totalPrice = useMemo(() => Math.round(currentBid * lotMeta.qty), [currentBid, lotMeta.qty]);
  const maxBidPrice = useMemo(() => {
    const max = bids.length ? Math.max(...bids.map((b) => b.price)) : 0;
    return max > 0 ? max : 1;
  }, [bids]);
  const chartPoints = useMemo(() => {
    if (bids.length === 0) return [] as { x: number; y: number; price: number; diff: number; color: string; gradientFrom: string; gradientTo: string; heightPercent: number }[];
    const displayBids = bids.slice(0, MAX_BIDS);

    // Use latest bid as baseline (first item)
    const latestPrice = displayBids[0].price;

    // Single hue; intensity increases with price
    const getColorForPrice = (heightPercent: number) => {
      const normalized = Math.max(0, Math.min(1, heightPercent / 100));
      const intensity = 0.35 + normalized * 0.5; // 0.35 to 0.85 alpha
      const from = `rgba(16, 185, 129, ${Math.max(0.25, intensity - 0.1)})`;
      const to = `rgba(16, 185, 129, ${Math.min(0.95, intensity + 0.05)})`;
      return { color: "#10b981", from, to };
    };

    return displayBids.map((bid, idx) => {
      const delta = bid.price - latestPrice; // positive if higher than latest, negative if lower

      // Base height 80% for latest; each 0.25 diff = 5% change
      const incrementsOf025 = delta / 0.25;
      const rawHeight = 80 + incrementsOf025 * 5;
      const heightPercent = Math.max(10, Math.min(95, rawHeight));

      const prevPrice = displayBids[idx + 1]?.price ?? bid.price;
      const colorPair = getColorForPrice(heightPercent);

      // Position so latest (index 0) sits on the right; older to the left
      const x = ((displayBids.length - idx - 0.5) / displayBids.length) * 100;

      return {
        x,
        y: 100 - heightPercent,
        price: bid.price,
        diff: bid.price - prevPrice,
        color: colorPair.color,
        gradientFrom: colorPair.from,
        gradientTo: colorPair.to,
        heightPercent,
      };
    });
  }, [bids]);

  const chartPaths = useMemo(() => {
    if (chartPoints.length === 0) return { linePath: "", areaPath: "" };
    const linePath = chartPoints
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    const areaPath = `${linePath} L ${lastX} 100 L ${firstX} 100 Z`;
    return { linePath, areaPath };
  }, [chartPoints]);

  const priceMarkers = useMemo(() => {
    if (chartPoints.length === 0) return null;
    const maxPoint = chartPoints.reduce((acc, p) => (p.price > acc.price ? p : acc), chartPoints[0]);
    const minPoint = chartPoints.reduce((acc, p) => (p.price < acc.price ? p : acc), chartPoints[0]);
    return { maxPoint, minPoint };
  }, [chartPoints]);

  const lot = useMemo(
    () => ({
      title: lotMeta.title,
      grade: lotMeta.grade,
      qty: `${lotMeta.qty.toLocaleString()} kg`,
      hub: lotMeta.hub,
      lot: lotMeta.lot,
      badges: [lotMeta.hub, "Cold Storage", "50kg Bags", "Min 500kg", "12-14% Moisture"],
    }),
    [lotMeta]
  );

  useEffect(() => {
    setBidInput(Number((currentBid + step).toFixed(2)));
  }, [currentBid, step]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShrinkCard(window.scrollY > 120);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const names = ["Rahim Traders", "Aminur Rahman", "Sumon Traders", "Demo Buyer"];
    const steps = [0.1, 0.25, 0.5];
    const interval = setInterval(() => {
      setBids((prev) => {
        if (prev.length === 0) return prev;
        const stepUp = steps[Math.floor(Math.random() * steps.length)];
        const newPrice = Number((prev[0].price + stepUp).toFixed(2));
        const name = names[Math.floor(Math.random() * names.length)];
        const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return [
          { name, price: newPrice, time: timeLabel, leading: true },
          ...prev.map((b) => ({ ...b, leading: false })),
        ].slice(0, MAX_BIDS);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const placeBid = useCallback(
    (price?: number) => {
      const amount = price ?? bidInput;
      const minNext = currentBid + step;
      if (!amount || amount < minNext) return;

      const name = (typeof window !== "undefined" && localStorage.getItem("userName")) || "You";
      const timeLabel = "just now";

      setBids((prev) => [{ name, price: amount, time: timeLabel, leading: true }, ...prev.map((b) => ({ ...b, leading: false }))]);
    },
    [bidInput, currentBid, step]
  );

  const formattedCountdown = useMemo(() => {
    const m = Math.floor(countdown / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(countdown % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }, [countdown]);

  const stepOptions = [0.1, 0.25, 0.5, 1];
  const countdownPercent = Math.max(0, Math.min(100, Math.round((countdown / 180) * 100)));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Live auctions</p>
        <h1 className="text-2xl font-bold text-slate-900">Join bidding in real time</h1>
        <p className="text-slate-600">Track active lots, place bids, and get notified when you are outbid.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" /> Live auction
          </span>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Lot {lotMeta.lot}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{lotMeta.hub}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left column */}
        <div className="min-w-0 space-y-4">
          <div
            className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ${
              shrinkCard ? "scale-[0.99]" : ""
            }`}
          >
            <div className="min-w-0 space-y-5">
              <div className="min-w-0 space-y-3">
                <div className="relative aspect-[4/3] w-full min-h-[240px] overflow-hidden rounded-xl bg-slate-100 sm:min-h-[280px]">
                  {selectedMedia.type === "image" ? (
                    <Image
                      src={selectedMedia.src}
                      alt={selectedMedia.alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <video
                      controls
                      className="h-full w-full rounded-xl object-cover"
                      poster="https://images.unsplash.com/photo-1518977676601-b53f82aba655"
                    >
                      <source src={selectedMedia.src} type="video/mp4" />
                    </video>
                  )}
                  {/* Overlay badges matching marketplace card style */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">Grade {lot.grade}</span>
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-white">QC Verified</span>
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                    <span className="text-emerald-600">● Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {productGallery.map((item) => (
                    <button
                      key={item.src}
                      type="button"
                      onClick={() => setSelectedMedia(item)}
                      className={`overflow-hidden rounded-lg border text-left transition ${
                        selectedMedia.src === item.src ? "border-emerald-500" : "border-slate-200"
                      }`}
                    >
                      {item.type === "image" ? (
                        <Image
                          src={item.src}
                          alt={item.alt}
                          width={200}
                          height={140}
                          className="h-16 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 items-center justify-center bg-slate-100 text-xs font-semibold text-slate-700">
                          ▶ Video
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`min-w-0 border-t border-slate-200 bg-white transition-all duration-300 ${
                  shrinkCard ? "space-y-2 p-3 text-[11px] sm:text-xs" : "space-y-3 p-4 text-xs sm:text-sm sm:p-6"
                }`}
              >
                <div className="space-y-0.5">
                  <h2
                    className={`font-bold text-slate-900 break-words ${
                      shrinkCard ? "text-base" : "text-lg"
                    }`}
                  >
                    {lot.title}
                  </h2>
                  <p className={`text-slate-600 ${shrinkCard ? "text-[11px]" : "text-sm"}`}>
                    {lot.qty} · {lot.hub}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-2 overflow-x-auto whitespace-nowrap font-semibold text-slate-700 ${
                    shrinkCard ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs"
                  }`}
                >
                  <span
                    className={`inline-flex items-center gap-2 rounded-md bg-slate-50 ring-1 ring-slate-200 ${
                      shrinkCard ? "px-2.5 py-[6px]" : "px-3 py-1"
                    }`}
                  >
                    <span
                      className={`${shrinkCard ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs"} font-bold uppercase text-slate-600`}
                    >
                      Qty
                    </span>
                    {lot.qty}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-md bg-slate-50 ring-1 ring-slate-200 ${
                      shrinkCard ? "px-2.5 py-[6px]" : "px-3 py-1"
                    }`}
                  >
                    <span
                      className={`${shrinkCard ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs"} font-bold uppercase text-slate-600`}
                    >
                      Hub
                    </span>
                    {lot.hub}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-md bg-slate-50 ring-1 ring-slate-200 ${
                      shrinkCard ? "px-2.5 py-[6px]" : "px-3 py-1"
                    }`}
                  >
                    <span
                      className={`${shrinkCard ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs"} font-bold uppercase text-slate-600`}
                    >
                      Lot
                    </span>
                    {lot.lot}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    className={`flex items-center gap-2 font-semibold text-emerald-700 ${
                      shrinkCard ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"
                    }`}
                    aria-expanded="true"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> More details
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {lot.badges.map((badge) => (
                      <span
                        key={badge}
                        className={`inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 ${
                          shrinkCard ? "px-2.5 py-[6px] text-[10px] sm:text-[11px]" : "px-3 py-1 text-[11px] sm:text-xs"
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seller information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-sm font-bold text-slate-900">Seller information</h4>
            <div className="mt-3 flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white">
                {lotMeta.seller.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">{lotMeta.seller}</p>
                <p className="flex items-center gap-2 text-emerald-700">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> Verified seller
                </p>
                <p className="text-slate-600">{lotMeta.rating} rating · 500+ sales</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-50 px-3 py-2">Response time: within 2 hours</div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">Location: Dhaka, BD</div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">Member since: Jan 2024</div>
            </div>
            <div className="mt-4 flex gap-3 text-sm font-semibold">
              <button className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-800 transition hover:border-emerald-200 hover:text-emerald-700">
                Hide details
              </button>
              <button className="flex-1 rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-emerald-700 transition hover:bg-emerald-100">
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Live</h3>
              <p className="text-xs font-semibold text-slate-500">Last 10 bids</p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="relative min-h-[200px] h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50/50 to-white px-5 py-5 shadow-lg ring-1 ring-slate-200/50">
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:100%_40px]" aria-hidden="true" />
                <div className="relative h-full w-full">
                  {chartPoints.length === 0 ? (
                    <div className="relative flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">No bids yet</div>
                  ) : (
                    <svg
                      ref={svgRef}
                      className="absolute inset-0"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      onMouseMove={(e) => {
                        if (!svgRef.current || chartPoints.length === 0) return;
                        const rect = svgRef.current.getBoundingClientRect();
                        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
                        let nearest = 0;
                        let best = Math.abs(chartPoints[0].x - xPct);
                        for (let i = 1; i < chartPoints.length; i++) {
                          const d = Math.abs(chartPoints[i].x - xPct);
                          if (d < best) {
                            best = d;
                            nearest = i;
                          }
                        }
                        setHoverIndex(nearest);
                      }}
                      onMouseLeave={() => setHoverIndex(null)}
                    >
                      <defs>
                        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
                        </linearGradient>
                        <filter id="lineGlow" x="-10%" y="-10%" width="120%" height="120%">
                          <feGaussianBlur stdDeviation="0.7" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <path d={chartPaths.areaPath} fill="url(#lineFill)" opacity={chartPoints.length ? 1 : 0} />
                      <path
                        d={chartPaths.linePath}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="0.65"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        filter="url(#lineGlow)"
                      />
                      {priceMarkers && (
                        <g>
                          <line x1="0" y1={priceMarkers.maxPoint.y} x2="100" y2={priceMarkers.maxPoint.y} stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="2 2" />
                          <text x="4" y={priceMarkers.maxPoint.y - 1.5} fontSize={2.6} fontWeight={700} fill="#0f172a">Peak ৳ {priceMarkers.maxPoint.price.toFixed(2)}</text>
                          <line x1="0" y1={priceMarkers.minPoint.y} x2="100" y2={priceMarkers.minPoint.y} stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="2 2" />
                          <text x="4" y={priceMarkers.minPoint.y - 1.5} fontSize={2.4} fontWeight={600} fill="#475569">Low ৳ {priceMarkers.minPoint.price.toFixed(2)}</text>
                        </g>
                      )}
                      {chartPoints.map((p, idx) => (
                        <g key={`pt-${idx}`} aria-hidden="true">
                          <circle cx={p.x} cy={p.y} r={1} fill="#34d399" stroke="#0f766e" strokeWidth={0.3} />
                        </g>
                      ))}
                      {hoverIndex !== null && chartPoints[hoverIndex] && bids[hoverIndex] && (
                        <g>
                          {(() => {
                            const p = chartPoints[hoverIndex];
                            const b = bids[hoverIndex];
                            const tooltipY = Math.min(90, Math.max(12, p.y - 10));
                            const tooltipX = Math.min(94, Math.max(6, p.x));
                            return (
                              <>
                                <line x1={p.x} y1={0} x2={p.x} y2={100} stroke="#e2e8f0" strokeWidth={0.35} strokeDasharray="2 2" />
                                <circle cx={p.x} cy={p.y} r={1.6} fill="#10b981" stroke="#065f46" strokeWidth={0.35} />
                                <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                                  <rect x={-26} y={-15} width={52} height={19} rx={5} fill="rgba(255,255,255,0.96)" stroke="#cbd5e1" strokeWidth={0.4} />
                                  <text x={0} y={-3} fontSize={3.2} fontWeight={700} textAnchor="middle" fill="#0f172a">
                                    ৳ {p.price.toFixed(2)}
                                  </text>
                                  <text x={0} y={4} fontSize={2.6} fontWeight={500} textAnchor="middle" fill="#475569">
                                    {b.name}
                                  </text>
                                </g>
                              </>
                            );
                          })()}
                        </g>
                      )}
                    </svg>
                  )}
                </div>
              </div>
              <div className="max-h-56 overflow-auto rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm">
                <div className="divide-y divide-slate-100 text-[10px] sm:text-[11px]">
                  {bids.slice(0, MAX_BIDS).map((bid, idx) => (
                    <div
                      key={`${bid.name}-${bid.time}-${bid.price}-row-${idx}`}
                      className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50/80 cursor-pointer"
                    >
                      <div className="flex w-full items-center gap-2 sm:gap-3 text-slate-700">
                        <span className="min-w-0 truncate font-semibold text-slate-900 group-hover:text-slate-900">{bid.name}</span>
                        <span className="shrink-0 text-[11px] sm:text-xs text-slate-400 group-hover:text-slate-500">{bid.time}</span>
                        <span className={`ml-auto shrink-0 font-bold ${bid.leading ? "text-emerald-600" : "text-slate-500 group-hover:text-slate-700"}`}>
                          ৳ {bid.price.toFixed(2)}/kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ul className="sr-only">
              {bids.slice(0, MAX_BIDS).map((bid, idx) => (
                <li key={`${bid.name}-${bid.time}-${bid.price}-sr-${idx}`}>
                  {bid.name} bid ৳ {bid.price.toFixed(2)} per kg {bid.leading ? "(leading)" : ""} at {bid.time}
                </li>
              ))}
            </ul>
          </div>

          {/* Bidding section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-br from-rose-50 via-amber-50 to-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Ends in</p>
                <p className="text-lg font-bold text-rose-600">{formattedCountdown}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 via-emerald-100 to-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current bid</p>
                <p className="text-lg font-bold text-emerald-700" aria-live="polite">
                  ৳ {currentBid.toFixed(2)}/kg
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-sky-50 via-indigo-50 to-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total price</p>
                <p className="text-lg font-bold text-emerald-700">৳ {totalPrice.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-[width] duration-300"
                  style={{ width: `${countdownPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{countdownPercent}%</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {isOwnProduct ? (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  You cannot bid on your own product.
                </p>
              ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  placeBid();
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Place bid</p>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <input
                    type="number"
                    placeholder="Enter price/kg"
                    value={bidInput}
                    onChange={(e) => setBidInput(Number(e.target.value))}
                    min={currentBid + step}
                    step={0.01}
                    className="min-w-0 w-full flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-2"
                  />
                  <select
                    value={step}
                    onChange={(e) => setStep(Number(e.target.value))}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    {stepOptions.map((s) => (
                      <option key={s} value={s}>
                        +{s.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Bid
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <p className="min-w-0 text-ellipsis">
                    Min next bid: ৳ {(currentBid + step).toFixed(2)}/kg (total: ৳
                    {Math.round((currentBid + step) * lotMeta.qty).toLocaleString()})
                  </p>
                  <button
                    type="button"
                    onClick={() => placeBid(currentBid + step)}
                    className="text-emerald-700 underline underline-offset-2"
                  >
                    Quick +{step.toFixed(2)}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoBid}
                      onChange={(e) => setAutoBid(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Auto-bid
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={snipe}
                      onChange={(e) => setSnipe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Snipe (last 30s)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWatching((v) => !v)}
                    className={`ml-auto rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      watching
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {watching ? "Watching" : "Watch"}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-6 py-5 text-sm text-emerald-900">
        Want your inventory listed? <Link href="/seller-dashboard" className="font-semibold underline">Open seller dashboard</Link> to create a live auction.
      </div>
    </div>
  );
}
