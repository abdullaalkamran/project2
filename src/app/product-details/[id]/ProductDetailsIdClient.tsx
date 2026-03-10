"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Box,
  Check,
  ClipboardList,
  Copy,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Star,
  Thermometer,
  User,
  X,
  ZoomIn,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";


const MIN_ORDER_BY_UNIT = (unit: string) =>
  unit === "kg" ? 10 : 1;
const STEP_BY_UNIT = (unit: string) =>
  unit === "kg" ? 10 : 1;

type Tab = "overview" | "qc" | "packaging";

type QCReport = {
  verdict: string;
  grade: string;
  minBidRate: number | null;
  notes: string | null;
  checkerName: string | null;
  submittedAt: string;
};

type LotDetail = {
  lotCode: string;
  sellerId: string | null;
  title: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  grade: string;
  storageType: string;
  baggageType: string;
  baggageQty: number;
  basePrice: number;
  askingPricePerKg: number;
  minBidRate: number | null;
  hub: string;
  sellerName: string;
  status: string;
  saleType: string;
  qcReport: QCReport | null;
  image: string;
  images?: string[];
  soldQty: number;
  pendingQty: number;
  availableQty: number;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : text}
    </button>
  );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, role } = useAuth();

  const lotCode = useMemo(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
    return id.toUpperCase();
  }, [params]);

  const [lot, setLot] = useState<LotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [lightbox, setLightbox] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [deliveryHub, setDeliveryHub] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hubs, setHubs] = useState<{ id: string; name: string; location: string }[]>([]);
  const [activeImage, setActiveImage] = useState("");

  const fallback = useMemo(
    () => ({
      name: searchParams.get("name") || "",
      image: searchParams.get("image") || "",
      seller: searchParams.get("seller") || "",
      price: Number(searchParams.get("price")) || 0,
    }),
    [searchParams],
  );

  useEffect(() => {
    fetch("/api/marketplace/hubs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string; location: string }[]) => setHubs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lotCode) return;
    setLoading(true);
    fetch(`/api/marketplace/products/${lotCode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LotDetail | null) => {
        if (data) {
          setLot(data);
          setActiveImage((data.images && data.images.length > 0 ? data.images[0] : data.image) || "");
          setQty(MIN_ORDER_BY_UNIT(data.unit));
          if (!data.description && !data.qcReport) setActiveTab("packaging");
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [lotCode]);

  const displayName = lot?.title ?? fallback.name;
  const imageGallery = useMemo(() => {
    const arr = lot?.images?.length
      ? lot.images
      : [lot?.image ?? fallback.image];
    return Array.from(new Set(arr.filter(Boolean)));
  }, [lot?.images, lot?.image, fallback.image]);
  const displayImage = activeImage || imageGallery[0] || "";
  // QC checker sets minBidRate — prefer qcReport then lot-level, fallback to basePrice
  const qcPrice = lot?.qcReport?.minBidRate ?? lot?.minBidRate ?? null;
  const displayPrice = qcPrice ?? lot?.basePrice ?? fallback.price;
  const isQcPrice = qcPrice != null;
  // Use basePrice as the "original" seller price for discount comparison
  const sellerBasePrice = lot?.basePrice ?? fallback.price;
  // QC checker sets grade — prefer qcReport grade
  const displayGrade = lot?.qcReport?.grade ?? lot?.grade ?? "A";
  const totalQty = lot?.quantity ?? 500;
  const displaySeller = lot?.sellerName ?? fallback.seller;
  // QC checker sets the unit (kg / piece / dozen / etc.)
  const displayUnit = lot?.unit ?? "kg";
  const minOrder = MIN_ORDER_BY_UNIT(displayUnit);
  const qtyStep = STEP_BY_UNIT(displayUnit);

  const soldQty = lot?.soldQty ?? 0;
  const pendingQty = lot?.pendingQty ?? 0;
  const availableQty = lot?.availableQty ?? totalQty;
  const isSoldOut = availableQty <= 0;
  const soldPct = totalQty > 0 ? Math.min(100, (soldQty / totalQty) * 100) : 0;
  const pendingPct = totalQty > 0 ? Math.min(100 - soldPct, (pendingQty / totalQty) * 100) : 0;

  const discount =
    sellerBasePrice > displayPrice
      ? Math.round(((sellerBasePrice - displayPrice) / sellerBasePrice) * 100)
      : 0;
  const totalPrice = Math.round(displayPrice * qty);

  const isSeller = role === "seller";
  const isOwnProduct =
    !!user &&
    ((!!lot?.sellerId && user.id === lot.sellerId) ||
      (!lot?.sellerId && user.name === displaySeller));

  const handleQtyChange = (val: number) => {
    const clamped = Math.max(minOrder, Math.min(availableQty, val));
    setQty(clamped);
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error("Please sign in to message the seller.");
      return;
    }
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setMsgSent(true);
      setMsgText("");
      toast.success("Message sent to seller!");
    } finally {
      setSendingMsg(false);
    }
  };

  const openConfirm = () => {
    if (!user) {
      toast.error("Please sign in to place an order.");
      return;
    }
    if (!deliveryHub) {
      toast.error("Please select a delivery hub first.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleOrder = async () => {
    if (!lot) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotCode: lot.lotCode,
          qty,
          pricePerUnit: displayPrice,
          deliveryPoint: deliveryHub,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { message?: string }).message ?? "Failed to place order.");
        return;
      }
      const data = (await res.json()) as { orderCode: string; totalAmount: number };
      setConfirmOpen(false);
      toast.success(`Order ${data.orderCode} placed! Tk ${data.totalAmount.toLocaleString()} — awaiting seller confirmation.`);
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const tabs: Tab[] = ["overview"];
  if (lot?.qcReport) tabs.push("qc");
  if (lot?.storageType || lot?.baggageType || (lot?.baggageQty ?? 0) > 0)
    tabs.push("packaging");

  const tabLabel: Record<Tab, string> = {
    overview: "Overview",
    qc: "QC Report",
    packaging: "Packaging",
  };

  return (
    <div className="space-y-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
      >
        Back to marketplace
      </Link>

      {loading && !lot && (
        <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" />
      )}

      {!loading && !lot && (
        <p className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-600">
          Product not found or no longer available.
        </p>
      )}

      {(lot || fallback.name) && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* Hero image card */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-100 shadow-sm">
              <div className="relative h-72 sm:h-96">
                {displayImage ? (
                  displayImage.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={displayImage}
                      alt={displayName}
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      className="object-cover"
                      priority
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300 text-8xl">
                    🌾
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute bottom-4 left-4 right-16">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-0.5">
                    {lot?.saleType === "AUCTION" ? "Live Auction" : "Fixed Price"}{" "}
                    · {lot?.category}
                  </p>
                  <h1 className="text-2xl font-bold text-white leading-tight">
                    {displayName}
                  </h1>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      Grade {displayGrade}
                    </span>
                    {discount > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {discount}% OFF
                      </span>
                    )}
                    {isSoldOut && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        SOLD OUT
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/40"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              {imageGallery.length > 1 && (
                <div className="border-t border-slate-100 bg-white px-5 py-3">
                  <div className="flex gap-2 overflow-x-auto">
                    {imageGallery.map((img, idx) => {
                      const selected = img === displayImage;
                      return (
                        <button
                          key={`${img}-${idx}`}
                          type="button"
                          onClick={() => setActiveImage(img)}
                          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${selected ? "border-emerald-500" : "border-slate-200"}`}
                        >
                          {img.startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={`Product photo ${idx + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <Image src={img} alt={`Product photo ${idx + 1}`} fill sizes="64px" className="object-cover" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock bar */}
              {lot && (
                <div className="border-t border-slate-100 bg-white px-5 py-3 space-y-2">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-700 ${isSoldOut ? "bg-red-400" : "bg-emerald-500"}`}
                      style={{ width: `${soldPct}%` }}
                    />
                    {pendingPct > 0 && (
                      <div
                        className="h-full bg-amber-400 transition-all duration-700"
                        style={{ width: `${pendingPct}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <div className="flex items-center gap-3">
                      <span className={isSoldOut ? "text-red-500" : "text-slate-600"}>
                        {isSoldOut ? "Sold out" : `${availableQty.toLocaleString()} ${displayUnit} left`}
                      </span>
                      {soldQty > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {soldQty} sold
                        </span>
                      )}
                      {pendingQty > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {pendingQty} awaiting seller
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400">
                      of {totalQty.toLocaleString()} {displayUnit}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tab strip */}
            {lot && tabs.length > 1 && (
              <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                      activeTab === t
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t === "overview" && <ClipboardList className="h-3.5 w-3.5" />}
                    {t === "qc" && <BadgeCheck className="h-3.5 w-3.5" />}
                    {t === "packaging" && <Package className="h-3.5 w-3.5" />}
                    {tabLabel[t]}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content */}
            {lot && (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">

                {/* OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-semibold text-emerald-700">QC Verified</span>
                      </div>
                      <span className="text-slate-300">·</span>
                      <span>
                        Seller:{" "}
                        <span className="font-semibold text-slate-700">
                          {displaySeller}
                        </span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <CopyButton text={lotCode} />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < 4 ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">4.6</span>
                      <span className="text-xs text-slate-400">Verified seller</span>
                    </div>

                    {lot.description && lot.description.trim() !== "" ? (
                      <p className="text-sm leading-relaxed text-slate-600">
                        {lot.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        No description provided.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: "Category", value: lot.category },
                        { label: "Grade", value: `Grade ${displayGrade}` },
                        { label: "Unit", value: displayUnit },
                        { label: "Min. order", value: `${minOrder} ${displayUnit}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            {label}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Product location */}
                    {lot.hub && (
                      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            Product Location
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {lot.hub}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* QC REPORT */}
                {activeTab === "qc" && lot.qcReport && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                        <BadgeCheck className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          QC Inspection Report
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(lot.qcReport.submittedAt).toLocaleDateString(
                            "en-BD",
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </p>
                      </div>
                      <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        {lot.qcReport.verdict}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          Grade
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-slate-900">
                          Grade {lot.qcReport.grade}
                        </p>
                      </div>
                      {lot.qcReport.minBidRate != null && (
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            Approved rate
                          </p>
                          <p className="mt-0.5 text-lg font-bold text-slate-900">
                            Tk {lot.qcReport.minBidRate} / {lot.unit}
                          </p>
                        </div>
                      )}
                      {lot.qcReport.checkerName && (
                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                          <User className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">
                              Inspector
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-slate-900">
                              {lot.qcReport.checkerName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {lot.qcReport.notes && lot.qcReport.notes.trim() !== "" && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Inspector notes
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {lot.qcReport.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* PACKAGING */}
                {activeTab === "packaging" && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-800">
                      Packaging &amp; Storage
                    </p>
                    {!(lot.storageType || lot.baggageType || lot.baggageQty > 0) ? (
                      <p className="text-sm text-slate-400 italic">
                        No packaging details recorded.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {lot.storageType && lot.storageType !== "" && (
                          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                            <Thermometer className="h-5 w-5 text-blue-400 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                                Storage
                              </p>
                              <p className="text-sm font-semibold text-slate-800">
                                {lot.storageType}
                              </p>
                            </div>
                          </div>
                        )}
                        {lot.baggageType && lot.baggageType !== "" && (
                          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                            <Package className="h-5 w-5 text-amber-400 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                                Packaging
                              </p>
                              <p className="text-sm font-semibold text-slate-800">
                                {lot.baggageType}
                              </p>
                            </div>
                          </div>
                        )}
                        {lot.baggageQty > 0 && (
                          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                            <Box className="h-5 w-5 text-slate-400 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                                No. of bags
                              </p>
                              <p className="text-sm font-semibold text-slate-800">
                                {lot.baggageQty}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden lg:sticky lg:top-6">

              {/* Product identity header */}
              <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
                {displayImage && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {displayImage.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={displayImage}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {displayName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Grade {displayGrade}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lot?.category}
                    </span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {lotCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">

                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-slate-900">
                      Tk {displayPrice}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      per {displayUnit}
                    </span>
                    {isQcPrice && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        QC Approved Rate
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="ml-auto text-sm font-medium text-slate-400 line-through">
                        Tk {sellerBasePrice}
                      </span>
                    )}
                  </div>
                  {discount > 0 && (
                    <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                      Save {discount}% vs seller asking price
                    </p>
                  )}
                </div>

                {/* Qty selector */}
                {!isSoldOut && !isOwnProduct && !isSeller && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-800">
                        How many{" "}
                        <span className="text-emerald-600">{displayUnit}</span>?
                      </label>
                      <span className="text-xs text-slate-400">
                        {availableQty.toLocaleString()} available
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(qty - qtyStep)}
                        disabled={qty <= minOrder}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 active:scale-95 disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={minOrder}
                          max={availableQty}
                          step={qtyStep}
                          value={qty}
                          onChange={(e) =>
                            handleQtyChange(Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-slate-200 py-2 pl-3 pr-10 text-center text-sm font-bold outline-none ring-emerald-100 focus:border-emerald-300 focus:ring-2"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          {displayUnit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(qty + qtyStep)}
                        disabled={qty >= availableQty}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 active:scale-95 disabled:opacity-30"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Minimum order: {minOrder} {displayUnit}
                    </p>
                  </div>
                )}

                {/* Delivery hub selector */}
                {!isSoldOut && !isOwnProduct && !isSeller && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      Delivery Hub
                    </label>
                    <select
                      value={deliveryHub}
                      onChange={(e) => setDeliveryHub(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-100 focus:border-emerald-300 focus:ring-2"
                    >
                      <option value="">— Select your delivery hub —</option>
                      {hubs.map((h) => (
                        <option key={h.id} value={h.name}>{h.name} · {h.location}</option>
                      ))}
                    </select>
                    {!deliveryHub && (
                      <p className="text-[11px] text-slate-400">
                        Choose the hub nearest to you for pickup.
                      </p>
                    )}
                  </div>
                )}

                {/* Order summary */}
                {!isSoldOut && !isOwnProduct && !isSeller && (
                  <div className="overflow-hidden rounded-2xl bg-slate-50 divide-y divide-slate-100 text-sm">
                    <div className="px-4 py-2.5 text-slate-500">
                      <span>
                        {qty.toLocaleString()} {displayUnit} of{" "}
                        <span className="font-semibold text-slate-700">
                          {displayName}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 text-slate-500">
                      <span>
                        Tk {displayPrice} x {qty.toLocaleString()} {displayUnit}
                      </span>
                      <span className="font-bold text-slate-900">
                        Tk {totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 text-xs text-slate-400">
                      <span>50% advance due now</span>
                      <span className="font-semibold text-slate-600">
                        Tk {Math.round(totalPrice / 2).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* CTA */}
                {isOwnProduct ? (
                  <p className="rounded-xl bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-600">
                    You cannot order your own product.
                  </p>
                ) : isSeller ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">
                    Switch to buyer role to place orders.
                  </p>
                ) : isSoldOut ? (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-500">
                    Sold Out — No stock remaining
                  </p>
                ) : (
                  <div className="space-y-2">
                    {!deliveryHub && (
                      <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
                        Select a delivery hub above to continue
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={openConfirm}
                      disabled={!deliveryHub}
                      className="w-full rounded-full bg-emerald-500 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Review &amp; Place Order — Tk {totalPrice.toLocaleString()}
                    </button>
                  </div>
                )}

                {/* Seller strip */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">
                      {displaySeller.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {displaySeller}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <ShieldCheck className="h-3 w-3" /> Verified seller
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMsgOpen((v) => !v);
                        setMsgSent(false);
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        msgOpen
                          ? "border-slate-300 bg-slate-100 text-slate-600"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {msgOpen ? "Close" : "Message"}
                    </button>
                  </div>

                  {msgOpen && (
                    <div className="space-y-2">
                      {msgSent ? (
                        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                          Message sent! Seller will reply shortly.
                        </p>
                      ) : (
                        <>
                          <textarea
                            rows={3}
                            placeholder={`Hi, I am interested in ${displayName}. Is ${qty} ${displayUnit} available?`}
                            value={msgText}
                            onChange={(e) => setMsgText(e.target.value)}
                            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 focus:border-emerald-300 focus:ring-2 placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={sendingMsg || !msgText.trim()}
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            {sendingMsg ? "Sending…" : "Send message"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Order Confirmation Modal ── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => !placing && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <p className="text-base font-bold text-slate-900">Confirm Your Order</p>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={placing}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Product row */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              {displayImage && (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {displayImage.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Image src={displayImage} alt="" fill sizes="56px" className="object-cover" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{displayName}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Grade {displayGrade}
                  </span>
                  <span className="text-[10px] text-slate-400">{lot?.category}</span>
                  <span className="font-mono text-[10px] text-slate-300">{lotCode}</span>
                </div>
              </div>
            </div>

            {/* Order details */}
            <div className="divide-y divide-slate-50 px-6 py-2">
              {[
                { label: "Quantity", value: `${qty.toLocaleString()} ${displayUnit}` },
                {
                  label: "Rate",
                  value: `Tk ${displayPrice.toLocaleString()} / ${displayUnit}`,
                  sub: isQcPrice ? "QC Approved Rate" : undefined,
                  subColor: "text-emerald-600",
                },
                {
                  label: "Total Amount",
                  value: `Tk ${totalPrice.toLocaleString()}`,
                  bold: true,
                },
                {
                  label: "50% Advance Due",
                  value: `Tk ${Math.round(totalPrice / 2).toLocaleString()}`,
                  sub: "Payable now",
                  subColor: "text-amber-600",
                },
                {
                  label: "Delivery Hub",
                  value: deliveryHub,
                  icon: true,
                },
                { label: "Seller", value: displaySeller },
              ].map(({ label, value, bold, sub, subColor, icon }) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <div className="text-right">
                    <span className={`${bold ? "font-bold text-slate-900" : "font-semibold text-slate-700"} flex items-center gap-1 justify-end`}>
                      {icon && <MapPin className="h-3 w-3 text-emerald-500" />}
                      {value}
                    </span>
                    {sub && <p className={`text-[11px] ${subColor ?? "text-slate-400"}`}>{sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Notice */}
            <div className="mx-6 mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              Your order will be sent to the seller for approval. You will be notified once confirmed.
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={placing}
                className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOrder}
                disabled={placing}
                className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60"
              >
                {placing ? "Placing…" : "Confirm Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && displayImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-[80vh] w-[90vw] max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {displayImage.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImage}
                alt={displayName}
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src={displayImage}
                alt={displayName}
                fill
                sizes="90vw"
                className="object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
