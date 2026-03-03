"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, Search, UploadCloud, X } from "lucide-react";
import { createLotSchema, CreateLotFormData } from "@/lib/schemas";
import { DEFAULT_HUB, HUB_OPTIONS } from "@/lib/hubs";
import api from "@/lib/api";

const PRODUCT_NAMES = [
  "Miniket Rice", "BRRI Dhan 28", "BRRI Dhan 29", "Najirshail Rice", "Chinigura Rice",
  "Tomato", "Potato", "Onion", "Garlic", "Ginger",
  "Brinjal / Eggplant", "Cauliflower", "Cabbage", "Bitter Gourd", "Bottle Gourd",
  "Mango", "Banana", "Papaya", "Jackfruit", "Pineapple", "Lychee", "Guava",
  "Hilsa Fish", "Rohu Fish", "Catla Fish", "Prawn / Shrimp",
  "Mustard Oil", "Soybean Oil", "Coconut",
  "Red Lentil (Masoor Dal)", "Chickpea (Chola)", "Black Gram (Mashkalai)",
  "Coriander / Dhania", "Turmeric", "Chili (Dry)", "Black Pepper", "Cumin",
  "Jute", "Cotton", "Wheat", "Maize / Corn",
  "Milk (Cow)", "Egg (Poultry)", "Honey",
  "Other",
];
const CATEGORIES = ["Rice", "Vegetables", "Fruits", "Garments", "Electronics", "Dry goods", "Spices", "Oil", "Pulses", "Other"];
const UNITS = ["kg", "piece", "dozen", "crate", "bag", "box"] as const;
const GRADES = ["A", "B", "C"] as const;
const STORAGE_TYPES = ["Ambient / Room Temperature", "Cool & Dry Warehouse", "Cold Storage (0–4 °C)", "Frozen Storage (≤ −18 °C)", "Ventilated Shed", "Humidity-Controlled Room", "Silo / Bulk Grain Store"];
const BAGGAGE_TYPES = ["Jute Bag (50 kg)", "Polypropylene (PP) Bag", "HDPE Woven Sack", "Cardboard Box", "Wooden Crate", "Plastic Crate", "Gunny Bag", "Vacuum Pack", "Net Bag", "Loose / Bulk (no packaging)"];

type LotsResponse = {
  preferredHub?: string;
};

function ProductCombobox({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? PRODUCT_NAMES.filter((p) => p.toLowerCase().includes(query.toLowerCase()))
    : PRODUCT_NAMES;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
        }`}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>{value || "Search and select product…"}</span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); }}
              className="rounded p-0.5 hover:bg-slate-100"
            >
              <X size={13} className="text-slate-400" />
            </span>
          )}
          <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No products found</li>
            ) : (
              filtered.map((p) => (
                <li
                  key={p}
                  onClick={() => { onChange(p); setOpen(false); setQuery(""); }}
                  className={`cursor-pointer px-3 py-2 text-sm transition hover:bg-emerald-50 hover:text-emerald-700 ${value === p ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-700"}`}
                >
                  {p}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function CreateLotPage() {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CreateLotFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createLotSchema) as any,
    defaultValues: { grade: "A", unit: "kg", hubId: DEFAULT_HUB, saleType: "AUCTION" },
  });

  const title = watch("title");
  const hubId = watch("hubId");
  const saleType = watch("saleType");

  useEffect(() => {
    const loadPreferredHub = async () => {
      try {
        const data = await api.get<LotsResponse>("/api/seller-dashboard/lots");
        const preferred = data.preferredHub;
        if (preferred && HUB_OPTIONS.includes(preferred as (typeof HUB_OPTIONS)[number])) {
          setValue("hubId", preferred, { shouldDirty: false, shouldValidate: true });
          return;
        }
      } catch {
        // keep fallback
      }
      setValue("hubId", DEFAULT_HUB, { shouldDirty: false, shouldValidate: true });
    };
    void loadPreferredHub();
  }, [setValue]);

  const uploadPhotos = async (files: File[]) => {
    if (files.length === 0) return;

    const allowed = files.filter((file) => file.size <= 5 * 1024 * 1024);
    if (allowed.length !== files.length) {
      toast.error("Some files were skipped because they are larger than 5MB");
    }

    if (allowed.length === 0) return;

    const formData = new FormData();
    for (const file of allowed.slice(0, 8)) {
      formData.append("photos", file);
    }

    setIsUploadingPhotos(true);
    try {
      const res = await fetch("/api/uploads/lots", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body?.message === "string" ? body.message : "Photo upload failed");
      }

      const uploaded = Array.isArray(body?.urls) ? (body.urls as string[]) : [];
      setPhotoUrls((prev) => [...prev, ...uploaded].slice(0, 8));
      toast.success(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Photo upload failed";
      toast.error(message);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const onSubmit = async (data: CreateLotFormData) => {
    try {
      const sellerName = (typeof window !== "undefined" && localStorage.getItem("userName")) || "Seller";
      await api.post("/api/flow/lots", {
        title: data.title,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        grade: data.grade,
        hubId: data.hubId,
        description: data.description,
        storageType: data.storageType,
        baggageType: data.baggageType,
        baggageQty: data.baggageQty,
        basePrice: data.basePrice,
        askingPricePerKg: data.askingPricePerKg,
        transportCost: data.transportCost ?? null,
        saleType: data.saleType,
        auctionStartsAt: data.saleType === "AUCTION" ? data.auctionStartsAt : null,
        auctionEndsAt: data.saleType === "AUCTION" ? data.auctionEndsAt : null,
        sellerName,
        photoUrls,
      });
      toast.success(`Lot "${data.title}" published successfully`);
    } catch {
      toast.error("Could not create lot. Please try again.");
      return;
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
        <h2 className="text-2xl font-bold text-slate-900">Lot Published!</h2>
        <p className="max-w-sm text-slate-500">
          <span className="font-semibold text-slate-800">{title}</span> has been submitted.
          Drop the goods at <span className="font-semibold text-slate-800">{hubId}</span> — the hub team will process inbound and assign QC.
        </p>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => router.push("/seller-dashboard/lots")} className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
            View My Lots
          </button>
          <button type="button" onClick={() => { reset({ grade: "A", unit: "kg", hubId }); setPhotoUrls([]); }} className="rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Add Product / Create Lot</h1>
        <p className="text-slate-500">Use this single form to add product details and publish a lot.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Lot Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Product name *</label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <ProductCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    error={errors.title?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
              <select {...register("category")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Quantity *</label>
                <input type="number" {...register("quantity")} placeholder="5000" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
              </div>
              <div className="w-28">
                <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                <select {...register("unit")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <Controller
              name="grade"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Declared Grade *</label>
                  <div className="flex gap-2">
                    {GRADES.map((g) => (
                      <button key={g} type="button" onClick={() => field.onChange(g)}
                        className={`flex-1 rounded-lg border py-2 text-sm font-bold transition ${field.value === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        Grade {g}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">A = Premium · B = Standard · C = Economy. QC team will verify.</p>
                  {errors.grade && <p className="mt-1 text-xs text-red-500">{errors.grade.message}</p>}
                </div>
              )}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Drop-off Hub *</label>
              <input type="hidden" {...register("hubId")} />
              <input
                value={hubId || DEFAULT_HUB}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">Hub is auto-selected based on your registered seller hub.</p>
              {errors.hubId && <p className="mt-1 text-xs text-red-500">{errors.hubId.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description *</label>
              <textarea rows={3} {...register("description")} placeholder="Product origin, packaging, condition, certifications… (min 20 characters)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Product Photos</label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  void uploadPhotos(files);
                  e.currentTarget.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhotos}
                className="flex h-28 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <UploadCloud size={16} />
                {isUploadingPhotos ? "Uploading photos..." : "Click to upload product photos (JPG, PNG, WEBP — max 5MB each)"}
              </button>

              {photoUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {photoUrls.map((url) => (
                    <div key={url} className="group relative overflow-hidden rounded-lg border border-slate-200">
                      <img src={url} alt="Uploaded product" className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                        className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-1 text-xs text-slate-400">QC team will also take photos during inspection. Your photos are uploaded and attached to this lot submission.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Packaging &amp; Storage</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Storage type *</label>
              <select {...register("storageType")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">Select storage type</option>
                {STORAGE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.storageType && <p className="mt-1 text-xs text-red-500">{errors.storageType.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Baggage / Packaging type *</label>
              <select {...register("baggageType")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">Select packaging type</option>
                {BAGGAGE_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.baggageType && <p className="mt-1 text-xs text-red-500">{errors.baggageType.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Number of bags / packages *</label>
              <input
                type="number"
                min={1}
                {...register("baggageQty")}
                placeholder="e.g. 100"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-xs text-slate-400">Total number of individual bags/crates/boxes in this lot.</p>
              {errors.baggageQty && <p className="mt-1 text-xs text-red-500">{errors.baggageQty.message}</p>}
            </div>
          </div>
        </section>

        {/* Sale Type */}
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Sale Type *</h2>
          <p className="text-xs text-slate-400">Choose how buyers will purchase this lot after it passes QC.</p>
          <Controller
            name="saleType"
            control={control}
            render={({ field }) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => field.onChange("AUCTION")}
                  className={`flex flex-col gap-1.5 rounded-xl border-2 p-5 text-left transition ${
                    field.value === "AUCTION"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl">🔨</span>
                  <p className="font-semibold text-slate-900">Live Auction</p>
                  <p className="text-xs text-slate-500">
                    Buyers bid competitively. Highest bid wins. You set a base price and QC sets the minimum bid rate.
                  </p>
                  {field.value === "AUCTION" && (
                    <span className="mt-1 inline-block rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("FIXED_PRICE")}
                  className={`flex flex-col gap-1.5 rounded-xl border-2 p-5 text-left transition ${
                    field.value === "FIXED_PRICE"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl">🏷️</span>
                  <p className="font-semibold text-slate-900">Fixed Price</p>
                  <p className="text-xs text-slate-500">
                    Sell at your asking price. After QC approval an order is created immediately at the set price.
                  </p>
                  {field.value === "FIXED_PRICE" && (
                    <span className="mt-1 inline-block rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                  )}
                </button>
              </div>
            )}
          />
        </section>

        {/* Pricing */}
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {saleType === "FIXED_PRICE" ? "Fixed sale price per unit (৳) *" : "Asking price per unit (৳) *"}
              </label>
              <input type="number" step="0.01" {...register("askingPricePerKg")} placeholder="65.00" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-xs text-slate-400">
                {saleType === "FIXED_PRICE"
                  ? "Buyers will purchase at exactly this price per unit."
                  : "Your expected selling price. Visible to buyers as a reference."}
              </p>
              {errors.askingPricePerKg && <p className="mt-1 text-xs text-red-500">{errors.askingPricePerKg.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Base / Reserve price (৳) *</label>
              <input type="number" step="0.01" {...register("basePrice")} placeholder="12.00" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <p className="mt-1 text-xs text-slate-400">
                {saleType === "FIXED_PRICE"
                  ? "Minimum acceptable price. Sale won't proceed below this."
                  : "Minimum auction start price. QC checker sets the minimum bid rate after inspection."}
              </p>
              {errors.basePrice && <p className="mt-1 text-xs text-red-500">{errors.basePrice.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Estimated transportation cost (৳)</label>
              <input type="number" step="0.01" {...register("transportCost")} placeholder="0.00" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-xs text-slate-400">Your estimated cost for transporting this lot. QC inspector will verify and set the final cost.</p>
              {errors.transportCost && <p className="mt-1 text-xs text-red-500">{errors.transportCost.message}</p>}
            </div>
          </div>
        </section>

        {/* Auction Schedule — only for AUCTION type */}
        {saleType === "AUCTION" && (
          <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Auction Schedule</h2>
            <p className="text-xs text-slate-400">Auction goes live only after QC passes. If QC is delayed, the schedule will shift accordingly.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Auction starts at *</label>
                <input type="datetime-local" {...register("auctionStartsAt")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                {errors.auctionStartsAt && <p className="mt-1 text-xs text-red-500">{errors.auctionStartsAt.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Auction ends at *</label>
                <input type="datetime-local" {...register("auctionEndsAt")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                {errors.auctionEndsAt && <p className="mt-1 text-xs text-red-500">{errors.auctionEndsAt.message}</p>}
              </div>
            </div>
          </section>
        )}

        <div className="space-y-1 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">What happens after you publish?</p>
          <ol className="list-inside list-decimal space-y-0.5 text-xs text-emerald-700">
            <li>Drop your goods at the selected hub.</li>
            <li>Hub Manager logs the inbound lot.</li>
            <li>QC Leader assigns a checker to inspect.</li>
            <li>QC Checker grades and submits a report.</li>
            {saleType === "AUCTION" ? (
              <>
                <li>On QC pass → lot goes live for bidding at your scheduled time.</li>
                <li>Auction ends → winning buyer pays → hub dispatches → buyer collects.</li>
              </>
            ) : (
              <>
                <li>On QC pass → order is created at your fixed price.</li>
                <li>Hub dispatches to delivery point → buyer collects.</li>
              </>
            )}
          </ol>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={isSubmitting || isUploadingPhotos} className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60">
            {isSubmitting ? "Publishing…" : "Publish lot"}
          </button>
          <button type="button" onClick={() => router.push("/seller-dashboard/lots")} className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
            Save as draft
          </button>
        </div>
      </form>
    </div>
  );
}
