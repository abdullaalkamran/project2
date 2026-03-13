"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655";

// ── Types ─────────────────────────────────────────────────────────────────────

type Bid = {
  id?: string;
  bidderId?: string | null;
  name: string;
  price: number;
  time: string;
  leading: boolean;
};

type DeliveryHub = { id: string; name: string; location: string };

interface LotState {
  lotCode: string;
  title: string;
  category: string;
  status: string;
  saleType: string;
  auctionStartsAt: string | null;
  auctionEndsAt: string | null;
  minBidRate: number | null;
  basePrice: number;
  quantity: number;
  unit: string;
  grade: string;
  hubId: string;
  sellerName: string;
  sellerId: string | null;
  qcVerdict: string | null;
  freeQtyEnabled: boolean;
  freeQtyPer: number;
  freeQtyAmount: number;
  freeQtyUnit: string;
}

const MAX_BIDS = 20;

export function LiveClient() {
  const searchParams = useSearchParams();
  const lotCode = (searchParams.get("lot") || "").toUpperCase();

  // ── API-driven state ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lotData, setLotData] = useState<LotState | null>(null);
  const [apiImage, setApiImage] = useState<string | null>(null);
  const [auctionClosed, setAuctionClosed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryHubs, setDeliveryHubs] = useState<DeliveryHub[]>([]);
  const [selectedDeliveryHub, setSelectedDeliveryHub] = useState("");
  const auctionDurationRef = useRef<number>(180);
  const closeCalledRef = useRef(false);

  // Declare early so load effect and SSE effect can use the setters
  const [bids, setBids] = useState<Bid[]>([]);
  const [countdown, setCountdown] = useState(0);

  // Load delivery hubs once
  useEffect(() => {
    fetch("/api/hubs/delivery")
      .then((r) => r.json())
      .then((data: DeliveryHub[]) => setDeliveryHubs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Load initial lot state from API
  useEffect(() => {
    if (!lotCode) { setError("No lot code provided."); setLoading(false); return; }
    fetch(`/api/live/${lotCode}/state`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message && !data.lot) { setError(data.message); setLoading(false); return; }
        setLotData(data.lot);
        setApiImage(data.image || null);
        if (Array.isArray(data.bids)) {
          setBids(
            (data.bids as { id: string; bidderId?: string | null; bidderName: string; amount: number; createdAt: string }[])
              .map((b, i) => ({
                id: b.id,
                bidderId: b.bidderId ?? null,
                name: b.bidderName,
                price: b.amount,
                time: new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                leading: i === 0,
              }))
          );
        }
        if (data.lot.auctionEndsAt) {
          const remaining = Math.max(0, Math.floor((new Date(data.lot.auctionEndsAt).getTime() - Date.now()) / 1000));
          const total = data.lot.auctionStartsAt
            ? Math.max(1, Math.floor((new Date(data.lot.auctionEndsAt).getTime() - new Date(data.lot.auctionStartsAt).getTime()) / 1000))
            : 180;
          auctionDurationRef.current = total;
          setCountdown(remaining);
        }
        if (data.lot.status === "AUCTION_ENDED" || data.lot.status === "AUCTION_UNSOLD") {
          setAuctionClosed(true);
          setCountdown(0);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load auction data. Please refresh."); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotCode]);

  // SSE subscription for real-time updates
  useEffect(() => {
    if (!lotData?.lotCode || auctionClosed) return;
    const es = new EventSource(`/api/live/${lotData.lotCode}/stream`);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as { type: string; id?: string; bidderName?: string; amount?: number; timestamp?: string; result?: string; winner?: string; winningBid?: number };
        if (evt.type === "bid") {
          setBids((prev) => [
            {
              id: evt.id,
              name: evt.bidderName ?? "Unknown",
              price: evt.amount ?? 0,
              time: evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now",
              leading: true,
            },
            ...prev.map((b) => ({ ...b, leading: false })),
          ].slice(0, MAX_BIDS));
        } else if (evt.type === "closed") {
          setAuctionClosed(true);
          setCountdown(0);
          if (evt.result === "sold" && evt.winner) {
            toast.success(`Auction closed! Winner: ${evt.winner} at ৳${Number(evt.winningBid).toFixed(2)}/kg`);
          } else {
            toast(`Auction ended with no winner.`);
          }
        }
      } catch { /* ignore parse errors */ }
    };
    return () => es.close();
  }, [lotData?.lotCode, auctionClosed]);

  // Build gallery from API image or URL param fallback
  const productGallery = useMemo(() => {
    const raw = apiImage || searchParams.get("image") || FALLBACK_IMAGE;
    const base = raw.split("?")[0];
    const isLocal = base.startsWith("/");
    const q = isLocal ? "" : "?auto=format&fit=crop&w=800&q=80";
    const qTop = isLocal ? "" : "?auto=format&fit=crop&w=800&q=80&crop=top";
    const qBot = isLocal ? "" : "?auto=format&fit=crop&w=800&q=80&crop=bottom";
    return [
      { type: "image" as const, src: `${base}${q}`, alt: "Product view 1" },
      { type: "image" as const, src: `${base}${qTop}`, alt: "Product view 2" },
      { type: "image" as const, src: `${base}${qBot}`, alt: "Product view 3" },
      { type: "video" as const, src: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", alt: "Product video" },
    ];
  }, [apiImage, searchParams]);

  const [selectedMedia, setSelectedMedia] = useState(() => productGallery[0]);

  // Reset to first image whenever the gallery changes
  useEffect(() => {
    setSelectedMedia(productGallery[0]);
  }, [productGallery]);

  const [watching, setWatching] = useState(false);
  const [autoBid, setAutoBid] = useState(false);
  const [snipe, setSnipe] = useState(false);
  const [shrinkCard, setShrinkCard] = useState(false);

  const { user } = useAuth();

  // Derive lotMeta from API data with URL param fallbacks
  const lotMeta = useMemo(() => ({
    title: lotData?.title ?? searchParams.get("product") ?? "Potatoes | আলু",
    hub: searchParams.get("hub") ?? "Dhaka North",
    qty: (lotData?.quantity ?? Number(searchParams.get("qty"))) || 1500,
    lot: lotData?.lotCode ?? searchParams.get("lot") ?? "A2026-001",
    grade: lotData?.grade ?? searchParams.get("grade") ?? "A",
    seller: lotData?.sellerName ?? searchParams.get("seller") ?? "Rahim Traders",
    rating: searchParams.get("rating") ?? "4.8",
    sellerId: lotData?.sellerId ?? searchParams.get("sellerId") ?? "",
    freeQtyEnabled: lotData?.freeQtyEnabled ?? false,
    freeQtyPer: lotData?.freeQtyPer ?? 0,
    freeQtyAmount: lotData?.freeQtyAmount ?? 0,
    freeQtyUnit: lotData?.freeQtyUnit ?? "kg",
  }), [lotData, searchParams]);

  // A seller cannot bid on their own product
  const isOwnProduct = !!user && (
    (!!lotMeta.sellerId && user.id === lotMeta.sellerId) ||
    (!lotMeta.sellerId && user.name === lotMeta.seller)
  );

  const [bidInput, setBidInput] = useState(0);
  const [step, setStep] = useState(0.25);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const currentBid = bids[0]?.price || (lotData?.minBidRate ?? lotData?.basePrice ?? 0);
  const totalPrice = useMemo(() => Math.round(currentBid * lotMeta.qty), [currentBid, lotMeta.qty]);
  const [pickingWinner, setPickingWinner] = useState<string | null>(null);
  const [pendingWinner, setPendingWinner] = useState<Bid | null>(null);
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

  // Real countdown tick — decrements every second until 0 or auction closed
  useEffect(() => {
    if (auctionClosed || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, auctionClosed]);

  // Auto-close auction when the timer reaches 0
  useEffect(() => {
    if (countdown === 0 && lotData?.status === "LIVE" && !auctionClosed && !closeCalledRef.current) {
      closeCalledRef.current = true;
      fetch(`/api/flow/lots/${lotCode}/close-auction`, { method: "POST" }).catch(() => { /* another client may have already triggered close */ });
    }
  }, [countdown, lotData?.status, auctionClosed, lotCode]);

  useEffect(() => {
    const onScroll = () => {
      setShrinkCard(window.scrollY > 120);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const placeBid = useCallback(
    async (price?: number) => {
      const amount = price ?? bidInput;
      const minNext = currentBid + step;
      if (!amount || amount < minNext) return;
      if (auctionClosed) { toast.error("This auction has already ended."); return; }
      if (!user) { toast.error("You must be signed in to bid."); return; }
      if (!selectedDeliveryHub) { toast.error("Please select a delivery hub before placing a bid."); return; }

      setSubmitting(true);
      try {
        const res = await fetch(`/api/buyer-dashboard/bids/${lotCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, deliveryPoint: selectedDeliveryHub }),
        });
        const data = await res.json() as { message?: string; bidId?: string };
        if (!res.ok) {
          toast.error(data.message || "Failed to place bid.");
        } else {
          toast.success(`Bid of ৳${amount.toFixed(2)}/kg placed!`);
          // Optimistic local update; SSE stream will confirm and deduplicate
          setBids((prev) => [
            { id: data.bidId, name: user.name ?? "You", price: amount, time: "just now", leading: true },
            ...prev.map((b) => ({ ...b, leading: false })),
          ].slice(0, MAX_BIDS));
        }
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [bidInput, currentBid, step, auctionClosed, user, lotCode, selectedDeliveryHub]
  );

  const pickWinner = async (bidId: string) => {
    closeCalledRef.current = true; // prevent timer auto-close from racing
    setPickingWinner(bidId);
    try {
      const res = await fetch(`/api/flow/lots/${lotCode}/pick-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      const data = await res.json() as { message?: string; buyer?: string; winningBid?: number };
      if (!res.ok) {
        toast.error(data.message || "Failed to pick winner.");
      } else {
        toast.success(`${data.buyer} selected as winner at ৳${Number(data.winningBid).toFixed(2)}/kg. Order confirmed!`);
        setAuctionClosed(true);
        setCountdown(0);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPickingWinner(null);
    }
  };

  const formattedCountdown = useMemo(() => {
    if (auctionClosed) return "Closed";
    const m = Math.floor(countdown / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(countdown % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }, [countdown, auctionClosed]);

  const stepOptions = [0.1, 0.25, 0.5, 1];
  const countdownPercent = Math.max(0, Math.min(100, Math.round((countdown / auctionDurationRef.current) * 100)));

  // ── Loading / error gates ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-2xl bg-slate-200" />
          <div className="h-96 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-700">{error}</p>
        <Link href="/marketplace" className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline">
          Back to marketplace
        </Link>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700">Live auctions</p>
        <h1 className="text-2xl font-bold text-slate-900">Join bidding in real time</h1>
        <p className="text-slate-600">Track active lots, place bids, and get notified when you are outbid.</p>
        <div className="flex flex-wrap items-center gap-2">
          {auctionClosed ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Auction ended
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" /> Live auction
            </span>
          )}
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
                  {productGallery.map((item, i) => (
                    <button
                      key={`${item.alt}-${i}`}
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
            {lotMeta.freeQtyEnabled && lotMeta.freeQtyAmount > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <span className="text-lg">🎁</span>
                <p className="text-sm font-semibold text-emerald-800">
                  Free {lotMeta.freeQtyAmount} {lotMeta.freeQtyUnit} for every {lotMeta.freeQtyPer} {lotMeta.freeQtyUnit} purchased
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-[width] duration-300"
                  style={{ width: `${countdownPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{countdownPercent}%</span>
              {auctionClosed ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> Closed
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {isOwnProduct ? (
                auctionClosed ? (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    Auction ended.{" "}
                    <Link href="/seller-dashboard/orders" className="text-emerald-700 underline">View orders</Link>
                  </div>
                ) : bids.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-semibold">No bids yet</p>
                    <p className="mt-0.5 text-xs font-normal text-amber-600">Waiting for buyers to place bids. You can pick any bidder as the winner.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                      Pick a Winner — Select any bidder to confirm the order instantly
                    </p>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      {bids.slice(0, MAX_BIDS).map((bid, idx) => (
                        <div key={bid.id ?? idx} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{bid.name}</p>
                            <p className="text-xs text-slate-500">৳ {bid.price.toFixed(2)}/kg · total ৳{Math.round(bid.price * lotMeta.qty).toLocaleString()}</p>
                          </div>
                          {idx === 0 && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Highest</span>
                          )}
                          <button
                            onClick={() => bid.id && setPendingWinner(bid)}
                            disabled={!bid.id || pickingWinner !== null}
                            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            {pickingWinner === bid.id ? "Confirming…" : "Select Winner"}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      If you don&apos;t pick, the highest bidder wins automatically when the timer ends and will require your order acceptance.
                    </p>
                  </div>
                )
              ) : auctionClosed ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  This auction has ended.{" "}
                  <Link href="/marketplace" className="text-emerald-700 underline">Browse marketplace</Link>
                </div>
              ) : (
              <>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Delivery Hub <span className="text-rose-500">*</span>
                </p>
                {deliveryHubs.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading hubs…</p>
                ) : (
                  <select
                    value={selectedDeliveryHub}
                    onChange={(e) => setSelectedDeliveryHub(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">— Select delivery hub —</option>
                    {deliveryHubs.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} · {h.location}
                      </option>
                    ))}
                  </select>
                )}
                {!selectedDeliveryHub && (
                  <p className="text-[11px] text-amber-600">Select where you want the goods delivered if you win.</p>
                )}
                {selectedDeliveryHub && (
                  <p className="text-[11px] text-emerald-700">
                    ✓ Delivery to <span className="font-semibold">{selectedDeliveryHub}</span>
                  </p>
                )}
              </div>

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
                    disabled={submitting}
                    className="min-w-0 w-full flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-2 disabled:opacity-60"
                  />
                  <select
                    value={step}
                    onChange={(e) => setStep(Number(e.target.value))}
                    disabled={submitting}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    {stepOptions.map((s) => (
                      <option key={s} value={s}>
                        +{s.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {submitting ? "Placing…" : "Bid"}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <p className="min-w-0 text-ellipsis">
                    Min next bid: ৳ {(currentBid + step).toFixed(2)}/kg (total: ৳
                    {Math.round((currentBid + step) * lotMeta.qty).toLocaleString()})
                  </p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => placeBid(currentBid + step)}
                    className="text-emerald-700 underline underline-offset-2 disabled:opacity-60"
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
              </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-6 py-5 text-sm text-emerald-900">
        Want your inventory listed? <Link href="/seller-dashboard" className="font-semibold underline">Open seller dashboard</Link> to create a live auction.
      </div>

      {/* Winner confirmation modal */}
      {pendingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-emerald-600 px-6 py-4">
              <p className="text-lg font-bold text-white">Confirm Winner Selection</p>
              <p className="text-xs text-emerald-100 mt-0.5">This will close the auction and auto-confirm the order.</p>
            </div>

            {/* Details */}
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bidder</span>
                  <span className="text-sm font-bold text-slate-900">{pendingWinner.name}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bid Price</span>
                  <span className="text-sm font-bold text-emerald-700">৳ {pendingWinner.price.toFixed(2)} / kg</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Value</span>
                  <span className="text-sm font-bold text-slate-900">৳ {Math.round(pendingWinner.price * lotMeta.qty).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</span>
                  <span className="text-sm font-semibold text-slate-700">{lotMeta.qty.toLocaleString()} kg</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</span>
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[160px]">{lotMeta.title}</span>
                </div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Once confirmed, the auction will close immediately and the order will be auto-confirmed without requiring further acceptance.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setPendingWinner(null)}
                disabled={pickingWinner !== null}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingWinner.id) {
                    setPendingWinner(null);
                    void pickWinner(pendingWinner.id);
                  }
                }}
                disabled={!pendingWinner.id || pickingWinner !== null}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {pickingWinner ? "Confirming…" : "Confirm Winner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
