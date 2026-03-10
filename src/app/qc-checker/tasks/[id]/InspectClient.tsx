"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImageIcon,
  Loader2,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  MapPin,
  User,
  Phone,
  Calendar,
  FileText,
  Scale,
  Navigation,
  CheckCheck,
  XCircle,
  PencilLine,
  Tag,
  Gavel,
} from "lucide-react";
import api from "@/lib/api";
import type { FlowLot, LotUnit } from "@/lib/product-flow";
import SearchableSelect from "@/components/ui/SearchableSelect";

/* ─── types ─── */
type Grade = "A" | "B" | "C";
type Verdict = "PASSED" | "FAILED" | "CONDITIONAL";

/**
 * unset    → 2 buttons shown: [Confirm] [Wrong]
 * confirmed → green "✓ Confirmed" badge, field read-only
 * wrong    → red "✗ Wrong" highlighted button, field is now editable
 * modified → orange "✎ Modified" badge (auto-set when checker edits after marking wrong)
 */
type FieldStatus = "unset" | "confirmed" | "wrong" | "modified";

/* ─── shared constants (identical to seller's CreateLotClient) ─── */
const GRADES = ["A", "B", "C"] as const;
const VERDICTS = ["PASSED", "FAILED", "CONDITIONAL"] as const;

// Dropdown options are loaded dynamically from /api/cms/lot-options (managed in Admin → Lot Field Options)
const UNITS: LotUnit[] = ["kg", "piece", "dozen", "crate", "bag", "box"];

const VERDICT_LABELS: Record<Verdict, { label: string; desc: string; color: string; icon: typeof CheckCircle2 }> = {
  PASSED:      { label: "Passed",      desc: "Meets quality standards",  color: "border-emerald-500 bg-emerald-50 text-emerald-700", icon: CheckCircle2  },
  FAILED:      { label: "Failed",      desc: "Does not meet standards",  color: "border-red-500 bg-red-50 text-red-700",            icon: X             },
  CONDITIONAL: { label: "Conditional", desc: "Passed with conditions",   color: "border-amber-500 bg-amber-50 text-amber-700",      icon: AlertTriangle },
};

const GRADE_COLORS: Record<Grade, string> = {
  A: "border-emerald-500 bg-emerald-50 text-emerald-700",
  B: "border-blue-500 bg-blue-50 text-blue-700",
  C: "border-orange-500 bg-orange-50 text-orange-700",
};

const SELLER_FIELDS = [
  "productName", "category", "quantity", "unit", "description",
  "storageType", "baggageType", "baggageQty",
  "askingPricePerKg", "basePrice", "transportCost",
  "transportShare", "bonusOffer",
] as const;
type SellerField = (typeof SELLER_FIELDS)[number];

/* ─── FieldConfirm widget ─── */
function FieldConfirm({
  field,
  status,
  onChange,
}: {
  field: string;
  status: FieldStatus;
  onChange: (f: string, s: FieldStatus) => void;
}) {
  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          <CheckCheck size={11} /> Confirmed
        </span>
        <button
          type="button"
          onClick={() => onChange(field, "unset")}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline transition"
        >
          Undo
        </button>
      </div>
    );
  }

  if (status === "modified") {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
          <PencilLine size={11} /> Modified
        </span>
        <button
          type="button"
          onClick={() => onChange(field, "unset")}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline transition"
        >
          Reset
        </button>
      </div>
    );
  }

  /* unset or wrong — show 2 buttons */
  return (
    <div className="flex gap-1.5 mt-1.5">
      <button
        type="button"
        onClick={() => onChange(field, "confirmed")}
        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600"
      >
        <CheckCheck size={11} /> Confirm
      </button>
      <button
        type="button"
        onClick={() => onChange(field, "wrong")}
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
          status === "wrong"
            ? "border-red-500 bg-red-50 text-red-700"
            : "border-slate-200 bg-white text-slate-500 hover:border-red-400 hover:text-red-600"
        }`}
      >
        <XCircle size={11} /> Wrong
      </button>
    </div>
  );
}

/* ─── main component ─── */
export default function InspectClient() {
  const params = useParams();
  const router = useRouter();
  const lotId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lot, setLot]           = useState<FlowLot | null>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkerName, setCheckerName] = useState("");

  /* ── dynamic dropdown options ── */
  const [dropProductNames, setDropProductNames] = useState<string[]>([]);
  const [dropCategories, setDropCategories]     = useState<string[]>([]);
  const [dropStorageTypes, setDropStorageTypes] = useState<string[]>([]);
  const [dropBaggageTypes, setDropBaggageTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/cms/lot-options")
      .then((r) => r.json())
      .then((d: { productNames: string[]; categories: string[]; storageTypes: string[]; baggageTypes: string[] }) => {
        setDropProductNames(d.productNames ?? []);
        setDropCategories(d.categories ?? []);
        setDropStorageTypes(d.storageTypes ?? []);
        setDropBaggageTypes(d.baggageTypes ?? []);
      })
      .catch(() => {});
  }, []);

  /* ── seller fields (pre-filled from DB) ── */
  const [productName, setProductName]           = useState("");
  const [category, setCategory]                 = useState("");
  const [quantity, setQuantity]                 = useState("");
  const [unit, setUnit]                         = useState<LotUnit>("kg");
  const [description, setDescription]           = useState("");
  const [storageType, setStorageType]           = useState("");
  const [baggageType, setBaggageType]           = useState("");
  const [baggageQty, setBaggageQty]             = useState("");
  const [basePrice, setBasePrice]               = useState("");
  const [askingPricePerKg, setAskingPricePerKg] = useState("");
  const [transportCost, setTransportCost]       = useState("");
  const [transportShare, setTransportShare]     = useState<"YES" | "NO" | "HALF">("YES");
  const [freeQtyEnabled, setFreeQtyEnabled]     = useState(false);
  const [freeQtyPer, setFreeQtyPer]             = useState("");
  const [freeQtyAmount, setFreeQtyAmount]       = useState("");

  /* ── field confirmation statuses ── */
  const [fieldStatuses, setFieldStatuses] = useState<Record<SellerField, FieldStatus>>(
    () => Object.fromEntries(SELLER_FIELDS.map((f) => [f, "unset"])) as Record<SellerField, FieldStatus>
  );

  const setFieldStatus = useCallback((field: string, status: FieldStatus) => {
    setFieldStatuses((prev) => ({ ...prev, [field]: status }));
  }, []);

  /**
   * Wraps a field setter so that:
   *  - if status is "wrong" → auto-advance to "modified"
   *  - otherwise no status change (unset/confirmed fields shouldn't be editable)
   */
  const makeEditHandler = useCallback(
    (field: SellerField, setter: (v: string) => void) =>
      (v: string) => {
        setter(v);
        setFieldStatuses((prev) =>
          prev[field] === "wrong" ? { ...prev, [field]: "modified" } : prev
        );
      },
    []
  );

  /* ── Sale type & schedule fields ── */
  const [saleType, setSaleType]               = useState<"AUCTION" | "FIXED_PRICE">("AUCTION");
  const [auctionStartsAt, setAuctionStartsAt] = useState("");
  const [auctionEndsAt, setAuctionEndsAt]     = useState("");
  const [fixedAskingPrice, setFixedAskingPrice] = useState("");
  const [saleTypeStatus, setSaleTypeStatus]   = useState<FieldStatus>("unset");

  /* ── QC-only fields ── */
  const [grade, setGrade]         = useState<Grade>("B");
  const [verdict, setVerdict]     = useState<Verdict | "">("");
  const [notes, setNotes]         = useState("");
  const [minBidRate, setMinBidRate] = useState("");

  /* ── photos ── */
  const [photos, setPhotos]       = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ── GPS & location ── */
  const [gpsCoords, setGpsCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [manualLocation, setManualLocation] = useState("");

  /* ── fetch lot ── */
  const fetchLot = useCallback(async () => {
    try {
      const me = await api.get<{ name: string }>("/api/auth/me");
      if (me?.name) setCheckerName(me.name);
      const query = me?.name ? `?checker=${encodeURIComponent(me.name)}` : "";
      const rows = await api.get<FlowLot[]>(`/api/flow/tasks${query}`);
      const found = rows.find((l) => l.id === lotId);
      if (!found) {
        toast.error("Lot not found in your tasks");
        router.push("/qc-checker/tasks");
        return;
      }
      setLot(found);
      setProductName(found.title || "");
      setCategory(found.category || "");
      setQuantity(String(found.quantity || ""));
      setUnit(found.unit || "kg");
      setDescription(found.description || "");
      setStorageType(found.storageType || "");
      setBaggageType(found.baggageType || "");
      setBaggageQty(String(found.baggageQty ?? ""));
      setBasePrice(String(found.basePrice ?? ""));
      setAskingPricePerKg(String(found.askingPricePerKg ?? ""));
      setMinBidRate(String(found.minBidRate ?? ""));
      setTransportCost(String(found.sellerTransportCost ?? ""));
      setTransportShare((found.sellerTransportShare as "YES" | "NO" | "HALF") ?? "YES");
      setFreeQtyEnabled(found.freeQtyEnabled ?? false);
      setFreeQtyPer(String(found.freeQtyPer && found.freeQtyPer > 0 ? found.freeQtyPer : ""));
      setFreeQtyAmount(String(found.freeQtyAmount && found.freeQtyAmount > 0 ? found.freeQtyAmount : ""));
      setSaleType((found.saleType as "AUCTION" | "FIXED_PRICE") || "AUCTION");
      if (found.auctionStartsAt) setAuctionStartsAt(found.auctionStartsAt.slice(0, 16));
      if (found.auctionEndsAt) setAuctionEndsAt(found.auctionEndsAt.slice(0, 16));
      if (found.fixedAskingPrice != null) setFixedAskingPrice(String(found.fixedAskingPrice));
      setGrade((found.grade as Grade) || "B");
      if (found.verdict) setVerdict(found.verdict as Verdict);
      if (found.qcNotes) setNotes(found.qcNotes);
      if (found.qcPhotoUrls?.length) setPhotos(found.qcPhotoUrls);
      else if (found.sellerPhotoUrls?.length) setPhotos(found.sellerPhotoUrls);
      if (found.qcTaskStatus === "SUBMITTED") setSubmitted(true);
    } catch {
      toast.error("Failed to load task data");
    } finally {
      setLoading(false);
    }
  }, [lotId, router]);

  useEffect(() => { void fetchLot(); }, [fetchLot]);

  /* ── GPS ── */
  const handleGetGPS = () => {
    if (!navigator.geolocation) { toast.error("GPS not supported on this device"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        toast.success("GPS location captured");
      },
      () => { setGpsLoading(false); toast.error("Could not get GPS. Enter location manually."); },
      { timeout: 10000 }
    );
  };

  /* ── photo upload ── */
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", "lots");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (data.url) newPhotos.push(data.url);
        else toast.error(`Upload failed: ${data.error ?? "Unknown error"}`);
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
    setUploading(false);
    if (newPhotos.length > 0) toast.success(`${newPhotos.length} photo(s) uploaded`);
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!verdict) { toast.error("Please select a verdict"); return; }
    setShowConfirm(false);
    setSubmitting(true);
    try {
      await api.post("/api/flow/qc/submit", {
        lotId,
        verdict,
        grade,
        minBidRate: minBidRate ? parseFloat(minBidRate) : undefined,
        notes: notes || undefined,
        product: productName || undefined,
        category: category || undefined,
        qty: quantity ? parseFloat(quantity) : undefined,
        unit,
        lotGrade: grade,
        askingPricePerKg: askingPricePerKg ? parseFloat(askingPricePerKg) : undefined,
        description: description || undefined,
        storageType: storageType || undefined,
        baggageType: baggageType || undefined,
        baggageQty: baggageQty ? parseInt(baggageQty) : undefined,
        basePrice: basePrice ? parseFloat(basePrice) : undefined,
        transportCost: transportCost ? parseFloat(transportCost) : undefined,
        photos: photos.length > 0 ? photos : undefined,
        fieldConfirmations: fieldStatuses,
        inspectionLat: gpsCoords?.lat,
        inspectionLng: gpsCoords?.lng,
        inspectionAddress: manualLocation || undefined,
        saleType,
        auctionStartsAt: saleType === "AUCTION" && auctionStartsAt ? auctionStartsAt : undefined,
        auctionEndsAt: saleType === "AUCTION" && auctionEndsAt ? auctionEndsAt : undefined,
        fixedAskingPrice: saleType === "FIXED_PRICE" && fixedAskingPrice ? parseFloat(fixedAskingPrice) : undefined,
      });

      // ── Save seller vs QC diff to the approvals store so the Leader can see it ──
      if (lot) {
        const sellerSnap: Record<string, string> = {
          "Product name":    lot.title                        ?? "",
          "Category":        lot.category                     ?? "",
          "Quantity":        `${lot.quantity ?? ""} ${lot.unit ?? ""}`.trim(),
          "Unit":            lot.unit                         ?? "",
          "Declared grade":  lot.grade                        ?? "",
          "Storage type":    lot.storageType                  ?? "",
          "Packaging":       lot.baggageType                  ?? "",
          "No. of bags":     String(lot.baggageQty            ?? ""),
          "Description":     lot.description                  ?? "",
          "Asking price/kg": String(lot.askingPricePerKg      ?? ""),
          "Base price":      String(lot.basePrice             ?? ""),
          "Transport cost":  String(lot.sellerTransportCost   ?? ""),
          "Transport share": lot.sellerTransportShare === "NO" ? "Buyer pays" : lot.sellerTransportShare === "HALF" ? "50% split" : "Seller pays",
          "Bonus offer":     lot.freeQtyEnabled && (lot.freeQtyPer ?? 0) > 0 ? `${lot.freeQtyAmount} ${lot.freeQtyUnit} per ${lot.freeQtyPer} ${lot.freeQtyUnit}` : "None",
          "Sale type":       lot.saleType === "FIXED_PRICE" ? "Fixed Price" : "Live Auction",
          "Auction starts":  lot.saleType !== "FIXED_PRICE" ? (lot.auctionStartsAt ? new Date(lot.auctionStartsAt).toLocaleString() : "") : "",
          "Auction ends":    lot.saleType !== "FIXED_PRICE" ? (lot.auctionEndsAt   ? new Date(lot.auctionEndsAt).toLocaleString()   : "") : "",
          "Fixed ask price": lot.saleType === "FIXED_PRICE" ? String(lot.fixedAskingPrice ?? "") : "",
        };
        const qcSnap: Record<string, string> = {
          "Product name":    productName   || lot.title        || "",
          "Category":        category      || lot.category     || "",
          "Quantity":        `${quantity || lot.quantity} ${unit || lot.unit}`.trim(),
          "Unit":            unit          || lot.unit         || "",
          "Declared grade":  grade         || lot.grade        || "",
          "Storage type":    storageType   || lot.storageType  || "",
          "Packaging":       baggageType   || lot.baggageType  || "",
          "No. of bags":     baggageQty    || String(lot.baggageQty ?? ""),
          "Description":     description   || lot.description  || "",
          "Asking price/kg": askingPricePerKg || String(lot.askingPricePerKg ?? ""),
          "Base price":      basePrice     || String(lot.basePrice ?? ""),
          "Transport cost":  transportCost || String(lot.sellerTransportCost ?? ""),
          "Transport share": transportShare === "NO" ? "Buyer pays" : transportShare === "HALF" ? "50% split" : "Seller pays",
          "Bonus offer":     freeQtyEnabled && freeQtyPer ? `${freeQtyAmount} ${unit || lot.unit} per ${freeQtyPer} ${unit || lot.unit}` : "None",
          "Sale type":       saleType === "FIXED_PRICE" ? "Fixed Price" : "Live Auction",
          "Auction starts":  saleType !== "FIXED_PRICE" ? (auctionStartsAt ? new Date(auctionStartsAt).toLocaleString() : (lot.auctionStartsAt ? new Date(lot.auctionStartsAt).toLocaleString() : "")) : "",
          "Auction ends":    saleType !== "FIXED_PRICE" ? (auctionEndsAt   ? new Date(auctionEndsAt).toLocaleString()   : (lot.auctionEndsAt   ? new Date(lot.auctionEndsAt).toLocaleString()   : "")) : "",
          "Fixed ask price": saleType === "FIXED_PRICE" ? (fixedAskingPrice || String(lot.fixedAskingPrice ?? "")) : "",
        };
        const changes = Object.keys(sellerSnap)
          .filter((key) => sellerSnap[key] !== qcSnap[key])
          .map((key) => ({ label: key, before: sellerSnap[key], after: qcSnap[key] }));

        await api.post("/api/qc/approvals", {
          reportId: `QCR-${lotId}`,
          lotId,
          product: productName || lot.title,
          qty: quantity ? parseFloat(quantity) : lot.quantity,
          unit: unit || lot.unit,
          seller: lot.sellerName,
          checker: checkerName || lot.qcChecker || "",
          hub: lot.hubId,
          submitted: new Date().toISOString(),
          grade,
          verdict,
          minBidRate: minBidRate ? parseFloat(minBidRate) : (lot.minBidRate ?? lot.basePrice),
          transportCost: transportCost ? parseFloat(transportCost) : undefined,
          sellerTransportCost: lot.sellerTransportCost,
          sellerTransportShare: transportShare,
          freeQtyEnabled,
          freeQtyPer: freeQtyPer ? parseFloat(freeQtyPer) : 0,
          freeQtyAmount: freeQtyAmount ? parseFloat(freeQtyAmount) : 0,
          freeQtyUnit: unit || lot.unit,
          notes: notes || "",
          qcNote: notes || "",
          askingPricePerKg: askingPricePerKg ? parseFloat(askingPricePerKg) : lot.askingPricePerKg,
          basePrice: basePrice ? parseFloat(basePrice) : lot.basePrice,
          weight: quantity ? parseFloat(quantity) : lot.quantity,
          photosCount: photos.length,
          videosCount: 0,
          qcPhotoPreviews: photos,
          sellerPhotoUrls: lot.sellerPhotoUrls ?? [],
          changes,
          sellerSnapshot: sellerSnap,
          qcSnapshot: qcSnap,
          decision: "pending",
        });
      }

      setSubmitted(true);
      toast.success("QC Report submitted!", { description: "QC Leader has been notified." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to submit QC report", { description: msg });
      console.error("[submit]", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── loading / not found ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        <p className="text-sm text-slate-400">Loading inspection data…</p>
      </div>
    );
  }
  if (!lot) return null;

  const isEditable    = !submitted && lot.qcTaskStatus !== "SUBMITTED";
  const isReinspection = lot.leaderDecision === "Pending" && !!lot.qcSubmittedAt;
  const canEdit = (f: SellerField) => isEditable && (fieldStatuses[f] === "wrong" || fieldStatuses[f] === "modified");

  const inputCls = (editable: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
      editable
        ? "border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        : "border-slate-200 bg-slate-50 text-slate-500 cursor-default"
    }`;

  return (
    <div className="space-y-8 pb-12">

      {/* ── Page header ── */}
      <div className="space-y-1">
        <Link
          href="/qc-checker/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition mb-2"
        >
          <ArrowLeft size={14} /> Back to Tasks
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">QC Inspection Form</h1>
              {isReinspection && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                  <RotateCcw size={12} /> Re-inspection
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Lot <span className="font-mono font-semibold text-slate-700">{lot.id}</span> · {lot.title}
            </p>
          </div>
          {submitted && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-700">Report Submitted</p>
                <p className="text-[10px] text-emerald-600">Awaiting QC Leader approval</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Seller info bar ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        {/* Sale type badge row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {lot.saleType === "FIXED_PRICE" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Tag size={11} /> Fixed Price Sale
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              <Gavel size={11} /> Live Auction
            </span>
          )}
          {lot.saleType !== "FIXED_PRICE" && lot.auctionStartsAt && (
            <span className="text-xs text-slate-500">
              {new Date(lot.auctionStartsAt).toLocaleString()} – {lot.auctionEndsAt ? new Date(lot.auctionEndsAt).toLocaleString() : "TBD"}
            </span>
          )}
          {lot.saleType === "FIXED_PRICE" && lot.fixedAskingPrice != null && (
            <span className="text-xs text-slate-500">
              Asking price: <span className="font-semibold text-slate-700">৳{lot.fixedAskingPrice.toLocaleString()}</span>
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { icon: User,     label: "Seller",   value: lot.sellerName },
            { icon: Phone,    label: "Phone",    value: lot.sellerPhone || "N/A" },
            { icon: MapPin,   label: "Hub",      value: lot.hubId },
            { icon: Calendar, label: "Received", value: lot.receivedAt ? new Date(lot.receivedAt).toLocaleDateString() : new Date(lot.createdAt).toLocaleDateString() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className="rounded-lg bg-slate-50 p-2">
                <Icon size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transport & Bonus (editable by QC) ── */}
      <section className="space-y-5 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Transport &amp; Bonus</h2>
          <p className="mt-0.5 text-xs text-slate-400">Seller declared these. You can override them if needed.</p>
        </div>

        {/* Transport share */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Transport Cost Responsibility</label>
          <div className="flex gap-2">
            {(["YES", "NO", "HALF"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={!canEdit("transportShare")}
                onClick={() => {
                  setTransportShare(opt);
                  setFieldStatus("transportShare", "modified");
                }}
                className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                  transportShare === opt
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                } disabled:cursor-default disabled:opacity-80`}
              >
                {opt === "YES" ? "Seller pays" : opt === "NO" ? "Buyer pays" : "50% Split"}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {transportShare === "YES" && "Seller covers the full transport cost."}
            {transportShare === "NO" && "Buyer is responsible for transport cost."}
            {transportShare === "HALF" && "Transport cost split 50/50 between seller and buyer."}
          </p>
          {isEditable && <FieldConfirm field="transportShare" status={fieldStatuses.transportShare} onChange={setFieldStatus} />}
        </div>

        {/* Bonus offer */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Bonus Offer</label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canEdit("bonusOffer")}
              onClick={() => {
                setFreeQtyEnabled(true);
                setFieldStatus("bonusOffer", "modified");
              }}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                freeQtyEnabled ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              } disabled:cursor-default disabled:opacity-80`}
            >
              Yes, offer bonus
            </button>
            <button
              type="button"
              disabled={!canEdit("bonusOffer")}
              onClick={() => {
                setFreeQtyEnabled(false);
                setFieldStatus("bonusOffer", "modified");
              }}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                !freeQtyEnabled ? "border-rose-400 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              } disabled:cursor-default disabled:opacity-80`}
            >
              No bonus
            </button>
          </div>
          {freeQtyEnabled && (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Per (threshold)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={freeQtyPer}
                  onChange={(e) => {
                    setFreeQtyPer(e.target.value);
                    if (fieldStatuses.bonusOffer === "wrong") setFieldStatus("bonusOffer", "modified");
                  }}
                  disabled={!canEdit("bonusOffer")}
                  placeholder="40"
                  className={inputCls(canEdit("bonusOffer"))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Free amount</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={freeQtyAmount}
                  onChange={(e) => {
                    setFreeQtyAmount(e.target.value);
                    if (fieldStatuses.bonusOffer === "wrong") setFieldStatus("bonusOffer", "modified");
                  }}
                  disabled={!canEdit("bonusOffer")}
                  placeholder="2"
                  className={inputCls(canEdit("bonusOffer"))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Unit</label>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {unit || "kg"}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">Matches product unit</p>
              </div>
            </div>
          )}
          {isEditable && <FieldConfirm field="bonusOffer" status={fieldStatuses.bonusOffer} onChange={setFieldStatus} />}
        </div>
      </section>

      {/* ── How-to legend ── */}
      {isEditable && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold text-slate-700">For each seller field:</span>
          <span className="flex items-center gap-1 text-emerald-700"><CheckCheck size={11} /><strong>Confirm</strong> — information is correct</span>
          <span className="flex items-center gap-1 text-red-600"><XCircle size={11} /><strong>Wrong</strong> — unlocks the field so you can edit it</span>
          <span className="flex items-center gap-1 text-yellow-600"><PencilLine size={11} /><strong>Modified</strong> — auto-shown after you edit</span>
        </div>
      )}

      {/* ── Seller Photos (read-only reference) ── */}
      {lot.sellerPhotoUrls && lot.sellerPhotoUrls.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <ImageIcon size={14} /> Seller Photos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {lot.sellerPhotoUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                <img src={url} alt={`Seller photo ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════ SECTION 1 — Lot Details ════════ */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Lot Details</h2>
        <p className="text-xs text-slate-400 -mt-2">Confirm or correct the seller's submission. Mark "Wrong" to unlock and edit.</p>

        <div className="grid gap-4 sm:grid-cols-2">

          {/* Product name */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Product Name *</label>
            <SearchableSelect
              value={productName}
              onChange={(v) => makeEditHandler("productName", setProductName)(v)}
              options={productName && !dropProductNames.includes(productName) ? [productName, ...dropProductNames] : dropProductNames}
              placeholder="Select product name…"
              disabled={!canEdit("productName")}
            />
            {isEditable && <FieldConfirm field="productName" status={fieldStatuses.productName} onChange={setFieldStatus} />}
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
            <SearchableSelect
              value={category}
              onChange={(v) => makeEditHandler("category", setCategory)(v)}
              options={dropCategories}
              placeholder="Select category…"
              disabled={!canEdit("category")}
            />
            {isEditable && <FieldConfirm field="category" status={fieldStatuses.category} onChange={setFieldStatus} />}
          </div>

          {/* Quantity + Unit */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantity *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => makeEditHandler("quantity", setQuantity)(e.target.value)}
                disabled={!canEdit("quantity")}
                placeholder="e.g. 500"
                min="0"
                step="0.01"
                className={inputCls(canEdit("quantity"))}
              />
              {isEditable && <FieldConfirm field="quantity" status={fieldStatuses.quantity} onChange={setFieldStatus} />}
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
              <select
                value={unit}
                onChange={(e) => makeEditHandler("unit", (v) => setUnit(v as LotUnit))(e.target.value)}
                disabled={!canEdit("unit")}
                className={inputCls(canEdit("unit"))}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {isEditable && <FieldConfirm field="unit" status={fieldStatuses.unit} onChange={setFieldStatus} />}
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => makeEditHandler("description", setDescription)(e.target.value)}
              disabled={!canEdit("description")}
              rows={3}
              placeholder="Product origin, packaging, condition, certifications…"
              className={`${inputCls(canEdit("description"))} resize-none`}
            />
            {isEditable && <FieldConfirm field="description" status={fieldStatuses.description} onChange={setFieldStatus} />}
          </div>
        </div>
      </section>

      {/* ════════ SECTION 2 — Packaging & Storage ════════ */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Packaging &amp; Storage</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Storage Type *</label>
            <SearchableSelect
              value={storageType}
              onChange={(v) => makeEditHandler("storageType", setStorageType)(v)}
              options={dropStorageTypes}
              placeholder="Select storage type…"
              disabled={!canEdit("storageType")}
            />
            {isEditable && <FieldConfirm field="storageType" status={fieldStatuses.storageType} onChange={setFieldStatus} />}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Baggage / Packaging Type *</label>
            <SearchableSelect
              value={baggageType}
              onChange={(v) => makeEditHandler("baggageType", setBaggageType)(v)}
              options={dropBaggageTypes}
              placeholder="Select packaging type…"
              disabled={!canEdit("baggageType")}
            />
            {isEditable && <FieldConfirm field="baggageType" status={fieldStatuses.baggageType} onChange={setFieldStatus} />}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Number of Bags / Packages *</label>
            <input
              type="number"
              value={baggageQty}
              onChange={(e) => makeEditHandler("baggageQty", setBaggageQty)(e.target.value)}
              disabled={!canEdit("baggageQty")}
              min="1"
              placeholder="e.g. 100"
              className={inputCls(canEdit("baggageQty"))}
            />
            <p className="mt-1 text-xs text-slate-400">Total individual bags/crates/boxes in this lot.</p>
            {isEditable && <FieldConfirm field="baggageQty" status={fieldStatuses.baggageQty} onChange={setFieldStatus} />}
          </div>
        </div>
      </section>

      {/* ════════ SECTION 3 — Pricing ════════ */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Asking Price / Unit (৳) *</label>
            <input
              type="number"
              step="0.01"
              value={askingPricePerKg}
              onChange={(e) => makeEditHandler("askingPricePerKg", setAskingPricePerKg)(e.target.value)}
              disabled={!canEdit("askingPricePerKg")}
              placeholder="65.00"
              className={inputCls(canEdit("askingPricePerKg"))}
            />
            {isEditable && <FieldConfirm field="askingPricePerKg" status={fieldStatuses.askingPricePerKg} onChange={setFieldStatus} />}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Base / Reserve Price (৳) *</label>
            <input
              type="number"
              step="0.01"
              value={basePrice}
              onChange={(e) => makeEditHandler("basePrice", setBasePrice)(e.target.value)}
              disabled={!canEdit("basePrice")}
              placeholder="12.00"
              className={inputCls(canEdit("basePrice"))}
            />
            {isEditable && <FieldConfirm field="basePrice" status={fieldStatuses.basePrice} onChange={setFieldStatus} />}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Min Bid Rate (৳) — QC Set</label>
            <input
              type="number"
              step="0.01"
              value={minBidRate}
              onChange={(e) => setMinBidRate(e.target.value)}
              disabled={!isEditable}
              placeholder="QC minimum bid"
              className={inputCls(isEditable)}
            />
            <p className="mt-1 text-xs text-slate-400">Minimum price buyers can bid. Set by QC checker after inspection.</p>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 3b — Sale Type ════════ */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Sale Type</h2>
            <p className="text-xs text-slate-400 mt-0.5">How the seller chose to list this lot. Confirm or mark wrong to change.</p>
          </div>
          {/* status badge */}
          {saleTypeStatus === "confirmed" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <CheckCheck size={11} /> Confirmed
            </span>
          )}
          {saleTypeStatus === "modified" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
              <PencilLine size={11} /> Modified
            </span>
          )}
        </div>

        {/* Sale type cards */}
        {(() => {
          const canEditSaleType = isEditable && (saleTypeStatus === "wrong" || saleTypeStatus === "modified");
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!canEditSaleType) return;
                    setSaleType("AUCTION");
                    setSaleTypeStatus("modified");
                  }}
                  className={`flex flex-col gap-1.5 rounded-xl border-2 p-5 text-left transition ${
                    saleType === "AUCTION"
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50 opacity-50"
                  } ${canEditSaleType ? "cursor-pointer hover:border-violet-400" : "cursor-default"}`}
                >
                  <span className="text-xl">🔨</span>
                  <p className="font-semibold text-slate-900">Live Auction</p>
                  <p className="text-xs text-slate-500">Buyers bid competitively. Highest bid wins.</p>
                  {saleType === "AUCTION" && (
                    <span className="mt-1 inline-block rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canEditSaleType) return;
                    setSaleType("FIXED_PRICE");
                    setSaleTypeStatus("modified");
                  }}
                  className={`flex flex-col gap-1.5 rounded-xl border-2 p-5 text-left transition ${
                    saleType === "FIXED_PRICE"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-slate-50 opacity-50"
                  } ${canEditSaleType ? "cursor-pointer hover:border-blue-400" : "cursor-default"}`}
                >
                  <span className="text-xl">🏷️</span>
                  <p className="font-semibold text-slate-900">Fixed Price</p>
                  <p className="text-xs text-slate-500">Single asking price; order created at that price after QC approval.</p>
                  {saleType === "FIXED_PRICE" && (
                    <span className="mt-1 inline-block rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                  )}
                </button>
              </div>

              {/* Auction schedule (editable when wrong/modified) */}
              {saleType === "AUCTION" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Auction starts at</label>
                    <input
                      type="datetime-local"
                      value={auctionStartsAt}
                      onChange={(e) => { setAuctionStartsAt(e.target.value); setSaleTypeStatus((s) => s === "wrong" ? "modified" : s); }}
                      disabled={!canEditSaleType}
                      className={inputCls(canEditSaleType)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Auction ends at</label>
                    <input
                      type="datetime-local"
                      value={auctionEndsAt}
                      onChange={(e) => { setAuctionEndsAt(e.target.value); setSaleTypeStatus((s) => s === "wrong" ? "modified" : s); }}
                      disabled={!canEditSaleType}
                      className={inputCls(canEditSaleType)}
                    />
                  </div>
                </div>
              )}

              {/* Fixed asking price (editable when wrong/modified) */}
              {saleType === "FIXED_PRICE" && (
                <div className="max-w-xs">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fixed asking price / unit (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fixedAskingPrice}
                    onChange={(e) => { setFixedAskingPrice(e.target.value); setSaleTypeStatus((s) => s === "wrong" ? "modified" : s); }}
                    disabled={!canEditSaleType}
                    placeholder="65.00"
                    className={inputCls(canEditSaleType)}
                  />
                </div>
              )}

              {/* Confirm / Wrong buttons (same pattern as other fields) */}
              {isEditable && (
                <div>
                  {saleTypeStatus === "confirmed" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCheck size={11} /> Confirmed
                      </span>
                      <button type="button" onClick={() => setSaleTypeStatus("unset")} className="text-[11px] text-slate-400 hover:text-slate-600 underline transition">Undo</button>
                    </div>
                  ) : saleTypeStatus === "modified" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                        <PencilLine size={11} /> Modified
                      </span>
                      <button type="button" onClick={() => setSaleTypeStatus("unset")} className="text-[11px] text-slate-400 hover:text-slate-600 underline transition">Reset</button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setSaleTypeStatus("confirmed")}
                        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600"
                      >
                        <CheckCheck size={11} /> Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaleTypeStatus("wrong")}
                        className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                          saleTypeStatus === "wrong"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-red-400 hover:text-red-600"
                        }`}
                      >
                        <XCircle size={11} /> Wrong
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* ════════ SECTION 4 — Product Location ════════ */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Product Location</h2>
        <p className="text-xs text-slate-400 -mt-2">Confirm where the product is physically stored at the hub — GPS and/or manual.</p>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={handleGetGPS}
            disabled={gpsLoading || !isEditable}
            className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            {gpsLoading ? "Getting GPS…" : "Get GPS Location"}
          </button>
          {gpsCoords && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={14} />
              <span className="font-mono text-xs">{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Manual Location / Address</label>
          <input
            type="text"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            disabled={!isEditable}
            placeholder="e.g. Dhaka Hub, Bay 3, Row B"
            className={inputCls(isEditable)}
          />
          <p className="mt-1 text-xs text-slate-400">Hub bay, section, or any description of where the product is stored.</p>
        </div>
      </section>

      {/* ════════ SECTION 5 — QC Assessment ════════ */}
      <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <ClipboardCheck size={14} /> QC Assessment
        </h2>

        {/* Verdict */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Verdict *</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {VERDICTS.map((v) => {
              const cfg = VERDICT_LABELS[v];
              const Icon = cfg.icon;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setVerdict(v)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                    verdict === v
                      ? `${cfg.color} border-current ring-2 shadow-sm`
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  } disabled:cursor-not-allowed`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-bold">{cfg.label}</span>
                  <span className="text-[10px] opacity-70 text-center">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade — seller declared vs QC final */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Grade</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Seller's declared grade (read-only reference) */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Seller declared</p>
              <div className="flex gap-2">
                {GRADES.map((g) => (
                  <div
                    key={g}
                    className={`flex-1 rounded-lg border-2 py-2 text-center text-sm font-bold ${
                      lot.grade === g ? GRADE_COLORS[g] : "border-slate-200 bg-white text-slate-300"
                    }`}
                  >
                    Grade {g}
                  </div>
                ))}
              </div>
            </div>
            {/* QC final grade (editable) */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">QC final grade <span className="text-slate-400">(set by you)</span></p>
              <div className="flex gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    disabled={!isEditable}
                    onClick={() => setGrade(g)}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border-2 py-2 text-sm font-bold transition ${
                      grade === g ? GRADE_COLORS[g] : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    } disabled:cursor-not-allowed`}
                  >
                    <Scale size={13} /> {g}
                  </button>
                ))}
              </div>
              {lot.grade !== grade && (
                <p className="mt-1.5 text-[11px] text-amber-600 font-medium">
                  ⚠ Changed from seller&apos;s declared grade ({lot.grade})
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">A = Premium · B = Standard · C = Below standard</p>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes / Remarks</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isEditable}
            rows={4}
            placeholder="Quality observations, defects, conditions, or special remarks…"
            className={`${inputCls(isEditable)} resize-none`}
          />
        </div>
      </section>

      {/* ════════ SECTION 6 — QC Photos ════════ */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Camera size={14} /> QC Photos
        </h2>
        <p className="text-xs text-slate-400 -mt-2">Upload inspection photos to support your QC report. Your photos are uploaded and attached to this lot submission.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((url, i) => (
            <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200">
              <img src={url} alt={`QC photo ${i + 1}`} className="h-full w-full object-cover" />
              {isEditable && (
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1.5 right-1.5 rounded-full bg-red-500/80 p-1 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {isEditable && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition disabled:opacity-60"
            >
              {uploading
                ? <Loader2 size={20} className="animate-spin" />
                : <><Upload size={20} /><span className="mt-1.5 text-[10px] font-semibold">Add Photo</span></>
              }
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handlePhotoUpload(e.target.files)}
        />
      </section>

      {/* ── Marketplace note ── */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
        <span className="font-semibold">Marketplace listing:</span> This product will automatically appear on the marketplace once the QC Leader approves your report.
      </div>

      {/* ── Submit bar ── */}
      {isEditable && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-bold text-slate-800">Ready to Submit?</p>
            <p className="text-xs text-slate-400 mt-0.5">QC Leader will be notified. You cannot edit after submission.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/qc-checker/tasks"
              className="rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Save &amp; Back
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!verdict) { toast.error("Please select a verdict"); return; }
                setShowConfirm(true);
              }}
              className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition"
            >
              Submit QC Report
            </button>
          </div>
        </div>
      )}

      {/* ── Submitted state ── */}
      {submitted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center space-y-4">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
          <div>
            <h3 className="text-lg font-bold text-emerald-800">Report Submitted Successfully</h3>
            <p className="text-sm text-emerald-600 mt-1">
              QC report for <span className="font-semibold">{lot.title}</span> ({lot.id}) has been submitted.
              The QC Leader will review and approve.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-1">
            <Link href="/qc-checker/tasks"   className="rounded-full border border-emerald-200 bg-white px-5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition">Back to Tasks</Link>
            <Link href="/qc-checker/history" className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition">View History</Link>
          </div>
        </div>
      )}

      {/* ── Confirmation modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2.5">
                <FileText size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Submission</h3>
                <p className="text-xs text-slate-500">Please review before submitting</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between"><span className="text-slate-500">Lot</span><span className="font-mono font-semibold">{lot.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Product</span><span className="font-semibold">{productName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Grade</span><span className="font-bold">Grade {grade}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Verdict</span><span className="font-bold">{verdict ? VERDICT_LABELS[verdict].label : "—"}</span></div>
              {minBidRate && <div className="flex justify-between"><span className="text-slate-500">Min Bid Rate</span><span className="font-semibold">৳{minBidRate}</span></div>}
              {gpsCoords  && <div className="flex justify-between"><span className="text-slate-500">GPS</span><span className="font-mono text-xs">{gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</span></div>}
              {photos.length > 0 && <div className="flex justify-between"><span className="text-slate-500">Photos</span><span className="font-semibold">{photos.length} uploaded</span></div>}
              <div className="flex justify-between">
                <span className="text-slate-500">Fields confirmed</span>
                <span className="font-semibold text-emerald-600">{Object.values(fieldStatuses).filter((s) => s === "confirmed").length} of {SELLER_FIELDS.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fields corrected</span>
                <span className="font-semibold text-orange-600">{Object.values(fieldStatuses).filter((s) => s === "modified").length}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 transition disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
